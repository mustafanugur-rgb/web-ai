"""
FastAPI entrypoint: REST API for the POS sales chatbot.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any, Literal

import requests
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from openai import AuthenticationError
from pydantic import BaseModel, Field

from app.ai_agent import SalesAgent, detect_lead_info, get_sales_agent
from app.config import get_settings
from app.leads_storage import append_lead, append_lead_if_phone_new
from app.notifications import send_notification, send_telegram_notification
from app.openai_errors import map_openai_exception
from app.rag import load_vector_store

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# `frontend/` — tek origin ile sunulur; tarayıcıda Failed to fetch (CORS) riski azalır
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: build FAISS index from knowledge/company.txt (OpenAI embeddings)."""
    logger.info("Sales Agent API starting")
    try:
        load_vector_store()
        logger.info("RAG vector store ready")
    except AuthenticationError:
        logger.error(
            "RAG yüklenemedi: OPENAI_API_KEY geçersiz veya eksik (.env). "
            "Sunucu yine çalışır (/ui, /docs); /chat düzelttikten sonra çalışır. "
            "https://platform.openai.com/api-keys"
        )
    except Exception:
        logger.exception(
            "RAG indeksi oluşturulamadı; API anahtarı veya ağ hatası olabilir. Sunucu açık kalıyor."
        )
    yield
    logger.info("Sales Agent API shutting down")


settings = get_settings()
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    lifespan=lifespan,
)

# CORS: allow_credentials=True ile allow_origins=["*"] birlikte kullanılamaz (tarayıcı isteği reddeder).
# Çerez göndermiyorsanız credentials kapalı kalmalı → fetch "Failed to fetch" olmaz.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatHistoryTurn(BaseModel):
    """Prior turn in the same session (client-maintained)."""

    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=12000)


class ChatRequest(BaseModel):
    """Chat payload: current message plus optional history for context-aware replies."""

    message: str = Field(..., min_length=1, description="Latest user message")
    history: list[ChatHistoryTurn] = Field(
        default_factory=list,
        max_length=40,
        description="Previous user/assistant turns (oldest first).",
    )


class ChatResponse(BaseModel):
    """Assistant reply and whether to offer the contact form (AI-estimated intent)."""

    reply: str = Field(..., description="AI sales assistant response")
    show_contact_form: bool = Field(
        False,
        description="True when the user shows serious follow-up intent (widget may show lead form).",
    )


def _strip_optional(v: str | None) -> str | None:
    if v is None:
        return None
    t = v.strip()
    return t if t else None


def _user_transcript_for_lead(
    history: list[ChatHistoryTurn],
    current_message: str,
    *,
    max_len: int = 5000,
) -> str:
    """
    All user lines in session order + latest message (deduped if client repeats last turn).

    Stored on auto-lead so Telegram / summaries see the whole story, not only the
    phone-sharing line.
    """
    lines: list[str] = []
    for turn in history:
        if turn.role == "user":
            s = turn.content.strip()
            if s:
                lines.append(s)
    cur = current_message.strip()
    if cur and (not lines or lines[-1] != cur):
        lines.append(cur)
    out = "\n".join(lines)
    if len(out) > max_len:
        out = "…\n" + out[-(max_len - 2) :]
    return out if out else cur


def _message_chat_and_text_from_update(
    update: dict[str, Any],
) -> tuple[Any, Any] | None:
    """Pick (chat_id, text/caption) from one update object, or None."""
    msg = update.get("message") or update.get("channel_post") or update.get("edited_message")
    if not isinstance(msg, dict):
        cq = update.get("callback_query")
        if isinstance(cq, dict):
            msg = cq.get("message")
    if not isinstance(msg, dict):
        return None
    chat = msg.get("chat")
    if not isinstance(chat, dict):
        return None
    cid = chat.get("id")
    text = msg.get("text")
    if text is None:
        text = msg.get("caption")
    return cid, text


def _latest_message_chat_and_text(
    updates_body: dict[str, Any],
) -> tuple[Any, Any]:
    """
    From Telegram ``getUpdates`` JSON, return (chat_id, text) for the newest
    update that carries a message (skips e.g. last item if it is only a poll).
    """
    if not updates_body.get("ok"):
        return None, None
    results = updates_body.get("result")
    if not isinstance(results, list) or not results:
        return None, None
    for update in reversed(results):
        if not isinstance(update, dict):
            continue
        pair = _message_chat_and_text_from_update(update)
        if pair is not None:
            return pair[0], pair[1]
    return None, None


class LeadRequest(BaseModel):
    """Optional contact fields for lead capture (all optional)."""

    name: str | None = Field(None, max_length=500)
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=320)
    message: str | None = Field(None, max_length=5000)


class LeadResponse(BaseModel):
    """Successful lead save acknowledgement."""

    status: str = Field(..., description='Always "success" when saved')
    lead_id: str = Field(..., description="UUID4 for the stored lead")
    message: str = Field(..., description="Human-readable confirmation")
    telegram_sent: bool = Field(
        ...,
        description="Whether Telegram notify succeeded after save.",
    )


@app.get("/")
async def root() -> RedirectResponse:
    """DinamikPOS vitrin + global satış asistanı: http://127.0.0.1:8000/ui/site/"""
    return RedirectResponse(url="/ui/site/")


@app.get("/ui", include_in_schema=False)
async def ui_no_trailing_slash() -> RedirectResponse:
    return RedirectResponse(url="/ui/")


@app.get("/ui/", include_in_schema=False)
async def ui_index() -> FileResponse:
    """index.html — StaticFiles yerine doğrudan dosya (Windows/taşıma sorunlarında daha güvenilir)."""
    path = FRONTEND_DIR / "index.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"frontend/index.html bulunamadı: {path}")
    return FileResponse(path, media_type="text/html; charset=utf-8")


@app.get("/ui/dinamik", include_in_schema=False)
async def ui_dinamik_no_slash() -> RedirectResponse:
    return RedirectResponse(url="/ui/dinamik/")


@app.get("/ui/dinamik/", include_in_schema=False)
async def ui_dinamik_chat() -> FileResponse:
    """Siyah-beyaz DinamikPOS sohbet sayfası (dinamik-chat.html)."""
    path = FRONTEND_DIR / "dinamik-chat.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"frontend/dinamik-chat.html bulunamadı: {path}")
    return FileResponse(path, media_type="text/html; charset=utf-8")


@app.get("/ui/site", include_in_schema=False)
async def ui_site_no_trailing_slash() -> RedirectResponse:
    return RedirectResponse(url="/ui/site/")


@app.get("/ui/site/", include_in_schema=False)
async def ui_dinamik_site() -> FileResponse:
    """DinamikPOS vitrin + global floating satış asistanı (dinamik-site.html)."""
    path = FRONTEND_DIR / "dinamik-site.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"frontend/dinamik-site.html bulunamadı: {path}")
    return FileResponse(path, media_type="text/html; charset=utf-8")


# CSS/JS — widget modülleri (/ui/static/...)
_static_dir = FRONTEND_DIR / "static"
_static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/ui/static", StaticFiles(directory=str(_static_dir)), name="ui_static")


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness/readiness for orchestrators and load balancers."""
    return {"status": "ok"}


@app.get("/env-check", include_in_schema=False)
async def env_check_debug() -> dict[str, Any]:
    """
    Temporary debug: which env vars are set (no secret values).
    Remove or protect in production.
    """
    s = get_settings()
    oa = getattr(s, "openai_api_key", None)
    has_openai = bool(oa is not None and str(oa).strip())
    has_tg_tok = bool((s.telegram_bot_token or "").strip())
    cid: str | int | None = s.telegram_chat_id
    if isinstance(cid, str) and not cid.strip():
        cid = None
    return {
        "has_openai_key": has_openai,
        "has_telegram_token": has_tg_tok,
        "telegram_chat_id": cid,
    }


@app.get("/telegram-test", include_in_schema=False)
async def telegram_test() -> dict[str, Any]:
    """
    Temporary debug: send a fixed test string via ``sendMessage`` (full response in JSON).
    """
    print("[/telegram-test] starting")
    settings = get_settings()
    token = (settings.telegram_bot_token or "").strip()
    chat_id = settings.telegram_chat_id
    if not token or chat_id is None:
        detail = "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set"
        print(f"[/telegram-test] not sent: {detail}")
        logger.warning("telegram-test: %s", detail)
        return {
            "sent": False,
            "status_code": None,
            "response_text": detail,
        }

    url = f"https://api.telegram.org/bot{token}/sendMessage"

    def _send() -> Any:
        return requests.post(
            url,
            json={"chat_id": chat_id, "text": "Telegram test basarili"},
            timeout=20,
        )

    try:
        resp = await asyncio.to_thread(_send)
    except requests.RequestException as e:
        err = str(e)
        print(f"[/telegram-test] request failed: {err}")
        logger.exception("telegram-test: sendMessage request failed")
        return {
            "sent": False,
            "status_code": None,
            "response_text": err,
        }

    raw = resp.text
    print(f"[/telegram-test] status_code={resp.status_code}")
    print(f"[/telegram-test] response_text={raw}")

    sent = False
    if resp.status_code == 200:
        try:
            sent = bool(resp.json().get("ok"))
        except ValueError as e:
            print(f"[/telegram-test] JSON parse error: {e!s}")

    if not sent:
        logger.warning(
            "telegram-test: sent=%s status=%s body=%s", sent, resp.status_code, raw[:500]
        )

    return {
        "sent": sent,
        "status_code": resp.status_code,
        "response_text": raw,
    }


@app.get("/telegram-updates", include_in_schema=False)
async def telegram_updates_debug() -> JSONResponse:
    """
    Temporary debug: proxy Telegram ``getUpdates`` (find ``chat_id`` / test bot).
    Remove or protect in production.
    """
    settings = get_settings()
    token = (settings.telegram_bot_token or "").strip()
    if not token:
        raise HTTPException(
            status_code=503,
            detail="TELEGRAM_BOT_TOKEN is not set.",
        )

    url = f"https://api.telegram.org/bot{token}/getUpdates"

    try:
        resp = await asyncio.to_thread(
            requests.get,
            url,
            timeout=25,
        )
    except requests.RequestException:
        logger.exception("Telegram getUpdates request failed")
        raise HTTPException(
            status_code=502,
            detail="Could not reach Telegram API.",
        ) from None

    try:
        data = resp.json()
    except ValueError:
        logger.warning(
            "Telegram getUpdates returned non-JSON (status=%s)", resp.status_code
        )
        raise HTTPException(
            status_code=502,
            detail="Telegram returned a non-JSON body.",
        ) from None

    return JSONResponse(content=data)


@app.get("/telegram-test-self", include_in_schema=False)
async def telegram_test_self_debug(
    drop_webhook: bool = False,
) -> dict[str, Any]:
    """
    Temporary debug: ``getUpdates`` then latest ``message.chat.id`` and text.

    If both are null: (1) bot webhook may be set — try ``?drop_webhook=true`` once;
    (2) send the bot a new message in Telegram, then call again; (3) pending updates
    may have been consumed by an earlier ``getUpdates`` call.
    """
    settings = get_settings()
    token = (settings.telegram_bot_token or "").strip()
    if not token:
        raise HTTPException(
            status_code=503,
            detail="TELEGRAM_BOT_TOKEN is not set.",
        )

    base = f"https://api.telegram.org/bot{token}"

    if drop_webhook:
        try:
            await asyncio.to_thread(
                requests.post,
                f"{base}/deleteWebhook",
                timeout=15,
            )
        except requests.RequestException:
            logger.exception("Telegram deleteWebhook (telegram-test-self) failed")

    def _fetch_updates() -> Any:
        return requests.get(
            f"{base}/getUpdates",
            params={"limit": 100, "timeout": 0},
            timeout=25,
        )

    try:
        resp = await asyncio.to_thread(_fetch_updates)
    except requests.RequestException:
        logger.exception("Telegram getUpdates (telegram-test-self) failed")
        raise HTTPException(
            status_code=502,
            detail="Could not reach Telegram API.",
        ) from None

    try:
        data = resp.json()
    except ValueError:
        logger.warning(
            "Telegram getUpdates returned non-JSON (status=%s)", resp.status_code
        )
        raise HTTPException(
            status_code=502,
            detail="Telegram returned a non-JSON body.",
        ) from None

    latest_chat_id, latest_text = _latest_message_chat_and_text(data)
    return {
        "latest_chat_id": latest_chat_id,
        "latest_text": latest_text,
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    agent: Annotated[SalesAgent, Depends(get_sales_agent)],
) -> ChatResponse:
    """
    Main endpoint: send a user message, receive the sales assistant reply.

    Answers use FAISS retrieval from `knowledge/company.txt` before the LLM call.
    """
    user_text = body.message.strip()
    extracted = detect_lead_info(user_text)
    if extracted.get("phone") or extracted.get("email"):
        transcript = _user_transcript_for_lead(body.history, user_text)
        ctx_extract = detect_lead_info(transcript)
        lead_name = _strip_optional(extracted.get("name")) or _strip_optional(
            ctx_extract.get("name")
        )
        try:
            lead_id = await asyncio.to_thread(
                append_lead_if_phone_new,
                name=lead_name,
                phone=_strip_optional(extracted.get("phone")),
                email=_strip_optional(extracted.get("email"))
                or _strip_optional(ctx_extract.get("email")),
                message=_strip_optional(transcript),
            )
            if lead_id:
                logger.info("Lead auto-saved")
        except Exception:
            logger.exception("Auto lead save failed")

    try:
        hist = [(t.role, t.content) for t in body.history]
        reply, show_form = await agent.achat(user_text, history=hist)
    except Exception as e:
        logger.exception("Chat completion failed")
        status_code, detail = map_openai_exception(e)
        raise HTTPException(status_code=status_code, detail=detail) from e
    return ChatResponse(reply=reply, show_contact_form=show_form)


@app.post("/lead", response_model=LeadResponse, status_code=201)
async def create_lead(body: LeadRequest) -> LeadResponse:
    """
    Store a lead in ``leads.json``. Then :func:`send_telegram_notification` (non-blocking thread)
    and console notification; failures do not roll back the save.
    """
    try:
        entry = await asyncio.to_thread(
            append_lead,
            name=_strip_optional(body.name),
            phone=_strip_optional(body.phone),
            email=_strip_optional(body.email),
            message=_strip_optional(body.message),
        )
    except OSError:
        logger.exception("Could not write leads.json")
        raise HTTPException(
            status_code=500, detail="Could not save lead to disk."
        ) from None

    lead_id = str(entry["id"])

    # Persisted row (id, created_at, name, phone, email, message) for Telegram + console
    new_lead = entry

    print("Lead saved")
    print("Sending Telegram...")
    try:
        telegram_sent = await asyncio.to_thread(send_telegram_notification, new_lead)
    except Exception as e:
        print(f"Telegram failed: {e!s}")
        logger.exception("send_telegram_notification raised after /lead id=%s", lead_id)
        telegram_sent = False

    try:
        send_notification(new_lead)
    except Exception:
        logger.exception("send_notification failed after /lead id=%s", lead_id)

    return LeadResponse(
        status="success",
        lead_id=lead_id,
        message="Lead saved successfully",
        telegram_sent=telegram_sent,
    )

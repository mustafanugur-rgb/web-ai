"""
Sales agent: OpenAI chat via LangChain with FAISS RAG over knowledge/company.txt.

Returns structured reply + a legacy flag for the widget (kept false — leads are captured in chat).
"""

from __future__ import annotations

import asyncio
import logging
import re
from typing import TYPE_CHECKING, Literal

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.lead_telegram_summary import _is_business_like_line, _is_request_like_line
from app.rag import get_context

if TYPE_CHECKING:
    from langchain_core.language_models import BaseChatModel

logger = logging.getLogger(__name__)

# --- Lead detection (regex + light heuristics; used by /chat auto-save) ---

_EMAIL_RE = re.compile(
    r"\b[a-zA-Z0-9][a-zA-Z0-9._+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}\b",
    re.IGNORECASE,
)

# Turkish GSM 5xx; also common international shapes with enough digits
_PHONE_RE_TR = re.compile(
    r"(?:\+90|0090|90|0)?\s*5\d{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2}\b"
)
_PHONE_RE_LOOSE = re.compile(
    r"(?:\+\d{1,3}[\s\-.]?)?(?:\(?\d{2,4}\)?[\s\-.]?)?\d{3}[\s\-.]?\d{3}[\s\-.]?\d{2,4}\b"
)


def _digits_count(s: str) -> int:
    return sum(1 for c in s if c.isdigit())


def _normalize_phone_span(raw: str) -> str:
    return " ".join(raw.split())


def _extract_phone(text: str) -> str | None:
    m = _PHONE_RE_TR.search(text)
    if m and _digits_count(m.group(0)) >= 10:
        return _normalize_phone_span(m.group(0))
    m = _PHONE_RE_LOOSE.search(text)
    if m and _digits_count(m.group(0)) >= 10:
        return _normalize_phone_span(m.group(0))
    for m in re.finditer(r"\+?\d[\d\s\-\(\)\.]{8,}\d", text):
        span = m.group(0)
        if _digits_count(span) >= 10:
            return _normalize_phone_span(span)
    return None


_NAME_LABEL_RE = re.compile(
    r"(?:^|[\n;])"
    r"(?:ad(?:ım|ı|im)?|isim|ad\s*soyad|my\s+name\s+is|i\s*am|i'?m)\s*[:=\-]?\s*"
    r"([^\n,;]+)",
    re.IGNORECASE | re.MULTILINE,
)
# Line-start only so "ad" inside "Merhaba" / "anakasa" is not treated as a label
_NAME_KV_RE = re.compile(
    r"(?:^|[\n;])\s*(?:name|ad|isim)\s*[:=\-]\s*([^\n,;]+)",
    re.IGNORECASE | re.MULTILINE,
)


def _looks_like_person_name(s: str) -> bool:
    s = s.strip()
    if len(s) < 2 or len(s) > 120:
        return False
    if re.search(r"\d{5,}", s):
        return False
    return bool(re.match(r"^[\w\s\-\.'’`]+$", s, re.UNICODE))


_GREETING_FIRST_WORDS = frozenset(
    {
        "merhaba",
        "selam",
        "hey",
        "günaydın",
        "gunaydin",
        "iyi",
        "slm",
        "sa",
    }
)


def _extract_name(text: str, phone: str | None, email: str | None) -> str | None:
    m = _NAME_LABEL_RE.search(text)
    if not m:
        m = _NAME_KV_RE.search(text)
    if m:
        chunk = m.group(1).strip()
        chunk = re.split(r"[\n;]|(?=\d{3}\s*\d)", chunk)[0].strip()
        if (
            _looks_like_person_name(chunk)
            and len(chunk) <= 80
            and not _is_business_like_line(chunk)
            and not _is_request_like_line(chunk)
        ):
            ws = chunk.split()
            if len(ws) == 1 and ws[0].lower() in _GREETING_FIRST_WORDS:
                pass
            else:
                return chunk[:500]
    line0 = text.strip().split("\n")[0]
    if "," in line0 and (phone or email):
        before = line0.split(",")[0].strip()
        if before.lower() in _GREETING_FIRST_WORDS:
            return None
        if (
            _looks_like_person_name(before)
            and len(before.split()) <= 6
            and not _is_business_like_line(before)
            and not _is_request_like_line(before)
        ):
            return before[:500]
    # Son satırda tek başına kısa isim (ör. "Cem") — sık pattern
    lines = [ln.strip() for ln in text.strip().splitlines() if ln.strip()]
    for line in reversed(lines[-4:]):
        if len(line) > 50 or len(line.split()) > 4:
            continue
        if _extract_phone(line):
            continue
        if _EMAIL_RE.search(line):
            continue
        if (
            _looks_like_person_name(line)
            and line.lower() not in _GREETING_FIRST_WORDS
            and not _is_business_like_line(line)
            and not _is_request_like_line(line)
        ):
            return line[:500]
    return None


def detect_lead_info(message: str) -> dict[str, str | None]:
    """
    Extract possible contact fields from a single user message.

    Returns keys: name, phone, email, message (original text).
    """
    raw = message if isinstance(message, str) else ""
    email_m = _EMAIL_RE.search(raw)
    email = email_m.group(0).strip() if email_m else None
    phone = _extract_phone(raw)
    name = _extract_name(raw, phone, email)
    return {
        "name": name,
        "phone": phone,
        "email": email,
        "message": raw,
    }


SYSTEM_PROMPT = """You are a senior sales specialist for DinamikPOS (restaurant POS). Be friendly, clear, and sales-focused.

Facts and tone:
1) Answer using ONLY the COMPANY KNOWLEDGE in this conversation for products, plans, pricing, hardware, and policies. Do not invent features, prices, or guarantees.
2) Ask good discovery questions (segment, branches, needs, volume) when relevant.
3) Keep replies concise and professional. If the knowledge does not contain the answer, say so and offer follow-up instead of guessing.

Lead capture in chat (critical):
- When the visitor shows buying intent OR shares meaningful details about their business (locations, pain points, budget, timeline, wanting a quote/demo/callback, etc.), you MUST naturally ask for their **name** and **phone number** in the chat so the team can follow up — unless they already gave both in this conversation (then thank them and continue; do not repeat the same ask every turn).
- Never tell them to use a contact form, widget, or “fill out a form.” Do not redirect to forms. Capture the lead in the conversation.
- Ask in a warm, natural way, e.g. Turkish: "Size özel teklif hazırlayabilmem için adınızı ve telefon numaranızı paylaşabilir misiniz?" — match the user’s language (Turkish, English, etc.).
- Email is optional; name + phone are the priority when intent is clear."""


class SalesAssistantOutput(BaseModel):
    """Model response for /chat (structured)."""

    reply: str = Field(..., description="Assistant reply to the user (includes natural name/phone asks when appropriate).")


class SalesAgent:
    """Conversational sales agent with FAISS-backed company knowledge retrieval."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._llm: BaseChatModel = ChatOpenAI(
            api_key=self._settings.openai_api_key,
            model=self._settings.openai_model,
            temperature=self._settings.openai_temperature,
            max_tokens=self._settings.openai_max_tokens,
        )

    def _kb_message(self, context: str) -> HumanMessage:
        block = (
            "=== COMPANY KNOWLEDGE (authoritative for product/plan/policy facts) ===\n"
            + (
                context.strip()
                if context.strip()
                else "(No passages retrieved—do not invent specifics; offer sales follow-up.)"
            )
        )
        return HumanMessage(content=block)

    def _build_messages(
        self,
        user_message: str,
        *,
        context: str,
        history: list[tuple[Literal["user", "assistant"], str]],
    ) -> list[SystemMessage | HumanMessage | AIMessage]:
        msgs: list[SystemMessage | HumanMessage | AIMessage] = [
            SystemMessage(content=SYSTEM_PROMPT),
            self._kb_message(context),
        ]
        for role, content in history:
            if role == "user":
                msgs.append(HumanMessage(content=content))
            else:
                msgs.append(AIMessage(content=content))
        msgs.append(HumanMessage(content=user_message))
        return msgs

    async def achat(
        self,
        user_message: str,
        *,
        history: list[tuple[Literal["user", "assistant"], str]] | None = None,
    ) -> tuple[str, bool]:
        """Returns (reply_text, show_contact_form)."""
        hist = history or []
        context = await asyncio.to_thread(get_context, user_message)
        messages = self._build_messages(user_message, context=context, history=hist)

        structured = self._llm.with_structured_output(SalesAssistantOutput)
        try:
            out: SalesAssistantOutput = await structured.ainvoke(messages)
            return out.reply.strip(), False
        except Exception:
            logger.exception("Structured chat failed; falling back to plain text (no form flag).")
            result = await self._llm.ainvoke(messages)
            if isinstance(result, AIMessage):
                text = result.content
                if isinstance(text, str):
                    return text.strip(), False
                return str(text), False
            return str(result), False

    def chat(
        self,
        user_message: str,
        *,
        history: list[tuple[Literal["user", "assistant"], str]] | None = None,
    ) -> tuple[str, bool]:
        """Sync chat; prefer achat in the API layer."""
        hist = history or []
        context = get_context(user_message)
        messages = self._build_messages(user_message, context=context, history=hist)
        structured = self._llm.with_structured_output(SalesAssistantOutput)
        try:
            out: SalesAssistantOutput = structured.invoke(messages)
            return out.reply.strip(), False
        except Exception:
            logger.exception("Structured chat failed; falling back to plain text.")
            result = self._llm.invoke(messages)
            if isinstance(result, AIMessage):
                text = result.content
                if isinstance(text, str):
                    return text.strip(), False
                return str(text), False
            return str(result), False


def get_sales_agent() -> SalesAgent:
    """Factory for dependency injection."""
    return SalesAgent()

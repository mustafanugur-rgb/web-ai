"""
Lead notifications: console, Telegram (optional), Twilio WhatsApp (optional), email stub.

Call :func:`send_notification` only after a lead row has been persisted (e.g. in ``leads_storage``).
"""

from __future__ import annotations

import logging
from typing import Any

import requests

from app.config import get_settings
from app.lead_telegram_summary import format_telegram_lead_body

logger = logging.getLogger(__name__)

TELEGRAM_SEND_MESSAGE_PUBLIC = (
    "https://api.telegram.org/bot<REDACTED>/sendMessage"
)

# https://core.telegram.org/bots/api#sendmessage — max 4096 for text
TELEGRAM_MAX_MESSAGE_LENGTH = 4096


def _truncate_telegram_text(text: str) -> str:
    if len(text) <= TELEGRAM_MAX_MESSAGE_LENGTH:
        return text
    suffix = "\n… [Kısaltıldı — Telegram 4096 karakter sınırı]"
    room = TELEGRAM_MAX_MESSAGE_LENGTH - len(suffix)
    return text[: max(0, room)] + suffix


def send_whatsapp_notification(message: str) -> bool:
    """
    Twilio REST API ile WhatsApp mesajı gönderir (Telegram ile aynı gövde).

    POST ``https://api.twilio.com/2010-04-01/Accounts/{AccountSID}/Messages.json``
    Kimlik: HTTP Basic (Account SID + Auth Token).

    Eksik env veya API hatasında ``False`` döner; exception fırlatmaz.
    """
    try:
        settings = get_settings()
        sid = (settings.twilio_account_sid or "").strip()
        token = (settings.twilio_auth_token or "").strip()
        from_wa = (settings.twilio_whatsapp_from or "").strip()
        to_wa = (settings.twilio_whatsapp_to or "").strip()
        if not sid or not token or not from_wa or not to_wa:
            logger.info("WhatsApp skipped: Twilio env not fully configured")
            print("WhatsApp skipped: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_WHATSAPP_TO")
            return False

        body = _truncate_telegram_text(message)
        url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
        try:
            resp = requests.post(
                url,
                auth=(sid, token),
                data={"From": from_wa, "To": to_wa, "Body": body},
                timeout=30,
            )
        except requests.RequestException as e:
            logger.warning("WhatsApp failed (network): %s", e)
            print("WhatsApp failed")
            return False

        try:
            payload: Any = resp.json()
        except ValueError:
            payload = {"_raw": (resp.text or "")[:800]}

        # Başarı: 200/201 ve JSON'da sid (Twilio Messages resource)
        has_msg_sid = isinstance(payload, dict) and payload.get("sid") is not None
        ok = resp.status_code in (200, 201) and has_msg_sid
        if ok:
            logger.info("WhatsApp sent")
            print("WhatsApp sent")
            return True

        err_parts: list[str] = []
        if isinstance(payload, dict):
            for key in ("code", "message", "more_info", "status"):
                if payload.get(key) is not None:
                    err_parts.append(f"{key}={payload.get(key)}")
            if not err_parts and payload.get("message"):
                err_parts.append(str(payload.get("message")))
        err = " | ".join(err_parts) if err_parts else (resp.text or "")[:800]
        logger.warning(
            "WhatsApp failed: HTTP %s — %s",
            resp.status_code,
            err,
        )
        print(f"WhatsApp failed: HTTP {resp.status_code} — {err[:500]}")
        return False
    except Exception as e:
        logger.exception("WhatsApp failed: %s", e)
        print("WhatsApp failed")
        return False


def send_notification(lead: dict[str, Any]) -> None:
    """
    Notify channels that a new lead exists (console + future channels).

    Telegram is invoked separately via :func:`send_telegram_notification` so HTTP routes
    can log each step explicitly.
    """
    _notify_console(lead)
    _notify_email(lead)


def send_telegram_duplicate_lead_notice(
    *,
    phone: str | None,
    message: str | None,
) -> bool:
    """
    Aynı telefon zaten kayıtlı olduğu için yeni lead oluşturulmadığında kısa uyarı gönderir.
    """
    snip = (message or "").strip()
    if len(snip) > 1200:
        snip = snip[:1197] + "…"
    text = (
        "🔁 Aynı numara — yeni lead kaydı atlandı (önceki kayıtla çakışma)\n\n"
        f"📞 {phone or '-'}\n\n"
        "Son mesaj özeti:\n"
        f"{snip if snip else '-'}"
    )
    send_whatsapp_notification(text)
    return _telegram_send_plain_text(text)


def _telegram_send_plain_text(text: str) -> bool:
    """Low-level send; ``text`` already final (caller truncates)."""
    settings = get_settings()
    token = (settings.telegram_bot_token or "").strip()
    chat_id = settings.telegram_chat_id
    if not token or chat_id is None:
        logger.warning("Telegram skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set")
        print("Telegram failed: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set")
        return False

    text = _truncate_telegram_text(text)
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        resp = requests.post(
            url,
            json={"chat_id": chat_id, "text": text},
            timeout=20,
        )
    except requests.RequestException as e:
        logger.exception("Telegram sendMessage request failed: %s", e)
        print(f"Telegram failed: {e!s}")
        return False

    try:
        body: Any = resp.json()
    except ValueError:
        logger.warning("Telegram non-JSON response status=%s", resp.status_code)
        return False

    if resp.status_code != 200 or not body.get("ok"):
        err = body.get("description") if isinstance(body, dict) else str(body)
        logger.warning("Telegram send failed: %s", err)
        print(f"Telegram failed: {err}")
        return False

    logger.info("Telegram message sent ok")
    print("Telegram sent")
    return True


def send_telegram_notification(lead: dict[str, Any]) -> bool:
    """
    POST lead summary to Telegram ``sendMessage``.

    Reads ``TELEGRAM_BOT_TOKEN`` and ``TELEGRAM_CHAT_ID`` from settings.
    Prints target URL without token, HTTP status, and body on failure.
    Does not raise. Returns True if Telegram accepted the message.
    """
    print(f"Telegram API target: {TELEGRAM_SEND_MESSAGE_PUBLIC}")

    settings = get_settings()
    token = (settings.telegram_bot_token or "").strip()
    chat_id = settings.telegram_chat_id
    try:
        text = format_telegram_lead_body(lead)
    except Exception:
        logger.exception("format_telegram_lead_body failed; sending fallback body")
        text = (
            "🚀 Yeni lead (özet üretilemedi)\n\n"
            f"id: {lead.get('id')}\n"
            f"Ad: {lead.get('name')}\n"
            f"📞 {lead.get('phone')}\n"
            f"✉️ {lead.get('email')}\n\n"
            f"{str(lead.get('message') or '')[:3500]}"
        )

    send_whatsapp_notification(text)

    if not token or chat_id is None:
        print("Telegram failed: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set")
        logger.warning("Telegram not configured (token or chat_id missing)")
        return False

    return _telegram_send_plain_text(text)


def _notify_console(lead: dict[str, Any]) -> None:
    print("NEW LEAD RECEIVED")
    print(f"  name: {lead.get('name')}")
    print(f"  phone: {lead.get('phone')}")
    print(f"  message: {lead.get('message')}")


def _notify_email(lead: dict[str, Any]) -> None:
    """Send lead summary via email (SMTP, SendGrid, etc.). Not implemented."""
    _ = lead  # use when wiring templates and recipients

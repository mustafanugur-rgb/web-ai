"""
Map OpenAI (and LangChain-wrapped) failures to HTTP errors and readable messages.
"""

from __future__ import annotations

from typing import Any

from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
)


def unwrap_exception(exc: BaseException) -> BaseException:
    """Follow __cause__ / __context__ to find the root error."""
    seen: set[int] = set()
    current: BaseException | None = exc
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(
            current,
            (
                AuthenticationError,
                RateLimitError,
                BadRequestError,
                APIConnectionError,
                APITimeoutError,
                NotFoundError,
                PermissionDeniedError,
                APIError,
            ),
        ):
            return current
        nxt = getattr(current, "__cause__", None) or getattr(current, "__context__", None)
        current = nxt
    return exc


def openai_message(err: BaseException) -> str:
    """Best-effort user-facing string from an OpenAI error."""
    msg = getattr(err, "message", None)
    if isinstance(msg, str) and msg.strip():
        return msg.strip()
    body: Any = getattr(err, "body", None)
    if isinstance(body, dict) and "message" in body:
        m = body.get("message")
        if isinstance(m, str):
            return m
    return str(err) or type(err).__name__


def map_openai_exception(exc: BaseException) -> tuple[int, str]:
    """
    Returns (http_status, detail_string) for JSON `detail` field.
    """
    root = unwrap_exception(exc)

    if isinstance(root, AuthenticationError):
        return (
            401,
            "OpenAI API anahtarı geçersiz veya eksik. .env dosyasında OPENAI_API_KEY değerini kontrol edin.",
        )
    if isinstance(root, PermissionDeniedError):
        return 403, "OpenAI bu işlem için izin vermedi (Permission denied)."
    if isinstance(root, NotFoundError):
        return 502, (
            "OpenAI kaynağı bulunamadı (ör. model adı). "
            f"Ayrıntı: {openai_message(root)}"
        )
    if isinstance(root, RateLimitError):
        return 429, "OpenAI kota sınırı; kısa süre sonra tekrar deneyin veya planınızı kontrol edin."
    if isinstance(root, BadRequestError):
        return 502, f"OpenAI isteği reddedildi: {openai_message(root)}"
    if isinstance(root, APIConnectionError):
        return 503, "OpenAI sunucusuna bağlanılamadı; internet veya proxy ayarlarını kontrol edin."
    if isinstance(root, APITimeoutError):
        return 504, "OpenAI yanıt vermedi (zaman aşımı). Tekrar deneyin."

    if isinstance(root, APIError):
        return 502, f"OpenAI hatası: {openai_message(root)}"

    return 502, "Upstream AI service error"

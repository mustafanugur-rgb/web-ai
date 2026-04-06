"""
Persist leads to ``leads.json`` at the project root (JSON array of objects).

- If the file is missing or empty, it is treated as ``[]`` and created on first write.
- Reads/writes are serialized with a lock so concurrent ``POST /lead`` calls do not corrupt JSON.
"""

from __future__ import annotations

import json
import logging
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.notifications import (
    send_notification,
    send_telegram_duplicate_lead_notice,
    send_telegram_notification,
)

logger = logging.getLogger(__name__)

_lock = threading.Lock()


def canonical_phone_key(phone: str | None) -> str | None:
    """
    Normalize phone to digit-only form for duplicate checks (TR mobiles: 5xxxxxxxxx).
    Returns None if too few digits to treat as a phone.
    """
    if not phone or not isinstance(phone, str):
        return None
    d = "".join(c for c in phone if c.isdigit())
    if len(d) < 7:
        return None
    if d.startswith("90") and len(d) >= 12:
        d = d[2:]
    elif d.startswith("0090") and len(d) >= 14:
        d = d[4:]
    if len(d) == 11 and d.startswith("0"):
        d = d[1:]
    if len(d) > 10:
        d = d[-10:]
    return d if len(d) >= 7 else None

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LEADS_FILE = PROJECT_ROOT / "leads.json"


def _load_leads() -> list[dict[str, Any]]:
    """Load the JSON array from disk; return [] if file missing, empty, or invalid."""
    if not LEADS_FILE.is_file():
        return []
    try:
        raw = LEADS_FILE.read_text(encoding="utf-8").strip()
        if not raw:
            return []
        data = json.loads(raw)
        if isinstance(data, list):
            return data
        logger.warning("leads.json is not a JSON array; starting fresh.")
        return []
    except json.JSONDecodeError:
        logger.exception("leads.json is corrupt; starting with an empty list.")
        return []


def append_lead(
    *,
    name: str | None,
    phone: str | None,
    email: str | None,
    message: str | None,
) -> dict[str, Any]:
    """
    Append one lead record. Creates ``leads.json`` with ``[]`` on first save if needed.

    Returns the persisted lead row (``id``, ``created_at``, fields). Callers run
    :func:`send_notification` / :func:`send_telegram_notification` as needed.
    """
    lead_id = str(uuid.uuid4())
    entry: dict[str, Any] = {
        "id": lead_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "name": name,
        "phone": phone,
        "email": email,
        "message": message,
    }

    with _lock:
        leads = _load_leads()
        leads.append(entry)
        payload = json.dumps(leads, ensure_ascii=False, indent=2) + "\n"
        try:
            LEADS_FILE.write_text(payload, encoding="utf-8")
        except OSError:
            logger.exception("Failed to write %s", LEADS_FILE)
            raise

    logger.info("Lead saved id=%s", lead_id)
    return entry


def append_lead_if_phone_new(
    *,
    name: str | None,
    phone: str | None,
    email: str | None,
    message: str | None,
) -> str | None:
    """
    Append a lead only if this canonical phone is not already stored.

    Email-only leads (no phone) are always appended. Duplicate detection applies
    only when ``phone`` is present and maps to a non-empty canonical key.

    Returns new lead id, or ``None`` if skipped (duplicate phone).
    """
    lead_id = str(uuid.uuid4())
    entry: dict[str, Any] = {
        "id": lead_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "name": name,
        "phone": phone,
        "email": email,
        "message": message,
    }

    key = canonical_phone_key(phone)

    with _lock:
        leads = _load_leads()
        if key:
            for existing in leads:
                ex_phone = existing.get("phone")
                if not isinstance(ex_phone, str):
                    continue
                if canonical_phone_key(ex_phone) == key:
                    logger.info(
                        "Lead skipped duplicate phone key=%s; duplicate Telegram ping",
                        key,
                    )
                    try:
                        send_telegram_duplicate_lead_notice(phone=phone, message=message)
                    except Exception:
                        logger.exception(
                            "send_telegram_duplicate_lead_notice failed (duplicate phone)"
                        )
                    return None
        leads.append(entry)
        payload = json.dumps(leads, ensure_ascii=False, indent=2) + "\n"
        try:
            LEADS_FILE.write_text(payload, encoding="utf-8")
        except OSError:
            logger.exception("Failed to write %s", LEADS_FILE)
            raise

    try:
        send_notification(entry)
    except Exception:
        logger.exception("send_notification failed after lead persisted id=%s", lead_id)
    try:
        send_telegram_notification(entry)
    except Exception:
        logger.exception("send_telegram_notification failed after lead persisted id=%s", lead_id)
    return lead_id

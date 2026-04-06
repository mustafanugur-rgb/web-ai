from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TableCreate(BaseModel):
    table_number: str = Field(min_length=1, max_length=50)
    label: str | None = None


class TableOut(BaseModel):
    id: str
    restaurant_id: str
    table_number: str
    label: str | None
    qr_token: str
    expires_at: datetime | None = None
    created_at: datetime | None = None


class QRScanPayload(BaseModel):
    restaurant_id: str
    table_id: str
    token: str


def table_doc_to_out(doc: dict[str, Any]) -> TableOut:
    return TableOut(
        id=str(doc["_id"]),
        restaurant_id=doc["restaurant_id"],
        table_number=doc["table_number"],
        label=doc.get("label"),
        qr_token=doc["qr_token"],
        expires_at=doc.get("expires_at"),
        created_at=doc.get("created_at"),
    )

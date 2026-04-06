from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import BillStatus, PaymentStatus


class BillItem(BaseModel):
    name: str
    price: float = Field(ge=0)
    quantity: int = Field(ge=1)
    added_by_user_id: str


class BillItemAdd(BaseModel):
    name: str
    price: float = Field(ge=0)
    quantity: int = Field(ge=1)


class BillItemUpdate(BaseModel):
    item_index: int = Field(ge=0)
    quantity: int = Field(ge=0)


class SplitMode(BaseModel):
    mode: str = Field(pattern="^(equal|by_item)$")


class BillOut(BaseModel):
    id: str
    restaurant_id: str
    table_id: str
    user_ids: list[str]
    items: list[dict[str, Any]]
    total_amount: float
    commission_amount: float
    status: str
    payment_status: str
    created_at: datetime | None = None
    paid_at: datetime | None = None


def bill_doc_to_out(doc: dict[str, Any]) -> BillOut:
    return BillOut(
        id=str(doc["_id"]),
        restaurant_id=doc["restaurant_id"],
        table_id=doc["table_id"],
        user_ids=doc.get("user_ids") or [],
        items=doc.get("items") or [],
        total_amount=float(doc.get("total_amount", 0)),
        commission_amount=float(doc.get("commission_amount", 0)),
        status=doc["status"],
        payment_status=doc.get("payment_status", PaymentStatus.PENDING.value),
        created_at=doc.get("created_at"),
        paid_at=doc.get("paid_at"),
    )

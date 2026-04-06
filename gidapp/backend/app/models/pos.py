from typing import Any

from pydantic import BaseModel, Field


class POSBillItem(BaseModel):
    name: str
    price: float = Field(ge=0)
    quantity: int = Field(ge=1)
    external_line_id: str | None = None


class POSSyncBillRequest(BaseModel):
    """External POS pushes order lines; merges into open bill for table."""

    restaurant_id: str
    table_id: str
    api_key: str
    external_bill_id: str | None = None
    items: list[POSBillItem]
    replace_items: bool = False


class POSSyncBillResponse(BaseModel):
    bill_id: str
    status: str
    total_amount: float
    message: str = "synced"

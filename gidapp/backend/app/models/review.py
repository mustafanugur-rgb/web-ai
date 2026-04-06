from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    restaurant_id: str
    rating: int = Field(ge=1, le=5)
    comment: str = ""
    linked_bill_id: str


class ReviewOut(BaseModel):
    id: str
    user_id: str
    restaurant_id: str
    rating: int
    comment: str
    linked_bill_id: str
    created_at: datetime | None = None


def review_doc_to_out(doc: dict[str, Any]) -> ReviewOut:
    return ReviewOut(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        restaurant_id=doc["restaurant_id"],
        rating=doc["rating"],
        comment=doc.get("comment", ""),
        linked_bill_id=doc["linked_bill_id"],
        created_at=doc.get("created_at"),
    )

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RestaurantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    category: str = ""
    images: list[str] = []
    latitude: float
    longitude: float
    commission_rate: float = Field(ge=0, le=1, description="0–1 fraction e.g. 0.05 for 5%")


class RestaurantUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    images: list[str] | None = None
    latitude: float | None = None
    longitude: float | None = None
    commission_rate: float | None = Field(default=None, ge=0, le=1)


class RestaurantOut(BaseModel):
    id: str
    owner_id: str
    name: str
    description: str
    category: str
    images: list[str]
    latitude: float
    longitude: float
    commission_rate: float
    menu: dict[str, Any] | list[Any] | None = None
    created_at: datetime | None = None


class MenuUpdate(BaseModel):
    menu: dict[str, Any] | list[Any]


def restaurant_doc_to_out(doc: dict[str, Any]) -> RestaurantOut:
    return RestaurantOut(
        id=str(doc["_id"]),
        owner_id=doc["owner_id"],
        name=doc["name"],
        description=doc.get("description", ""),
        category=doc.get("category", ""),
        images=doc.get("images") or [],
        latitude=doc["latitude"],
        longitude=doc["longitude"],
        commission_rate=doc["commission_rate"],
        menu=doc.get("menu"),
        created_at=doc.get("created_at"),
    )

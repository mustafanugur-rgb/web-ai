from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import get_db
from app.deps import get_current_role, get_current_user_id, oid
from app.models.enums import UserRole
from app.models.restaurant import MenuUpdate, RestaurantCreate, RestaurantOut, RestaurantUpdate, restaurant_doc_to_out

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


@router.get("/public", response_model=list[RestaurantOut])
async def list_public(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: str | None = None,
):
    db = get_db()
    q: dict = {}
    if category:
        q["category"] = category
    cursor = db.restaurants.find(q).skip(skip).limit(limit)
    out = []
    async for doc in cursor:
        doc = dict(doc)
        doc.pop("menu", None)
        out.append(restaurant_doc_to_out(doc))
    return out


@router.get("/public/{rest_id}", response_model=RestaurantOut)
async def get_public(rest_id: str):
    db = get_db()
    doc = await db.restaurants.find_one({"_id": oid(rest_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return restaurant_doc_to_out(doc)


@router.post("", response_model=RestaurantOut)
async def create_restaurant(
    data: RestaurantCreate,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    if role != UserRole.RESTAURANT.value:
        raise HTTPException(status_code=403, detail="Restaurant role required")
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "owner_id": user_id,
        "name": data.name,
        "description": data.description,
        "category": data.category,
        "images": data.images,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "commission_rate": data.commission_rate,
        "menu": {},
        "created_at": now,
    }
    r = await db.restaurants.insert_one(doc)
    doc["_id"] = r.inserted_id
    return restaurant_doc_to_out(doc)


@router.patch("/mine/{rest_id}", response_model=RestaurantOut)
async def update_mine(
    rest_id: str,
    data: RestaurantUpdate,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    if role != UserRole.RESTAURANT.value:
        raise HTTPException(status_code=403, detail="Restaurant role required")
    db = get_db()
    doc = await db.restaurants.find_one({"_id": oid(rest_id)})
    if not doc or doc["owner_id"] != user_id:
        raise HTTPException(status_code=404, detail="Not found")
    patch = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if patch:
        patch["updated_at"] = datetime.now(timezone.utc)
        await db.restaurants.update_one({"_id": ObjectId(rest_id)}, {"$set": patch})
    doc = await db.restaurants.find_one({"_id": ObjectId(rest_id)})
    return restaurant_doc_to_out(doc)


@router.put("/mine/{rest_id}/menu", response_model=RestaurantOut)
async def update_menu(
    rest_id: str,
    body: MenuUpdate,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    if role != UserRole.RESTAURANT.value:
        raise HTTPException(status_code=403, detail="Restaurant role required")
    db = get_db()
    doc = await db.restaurants.find_one({"_id": oid(rest_id)})
    if not doc or doc["owner_id"] != user_id:
        raise HTTPException(status_code=404, detail="Not found")
    await db.restaurants.update_one(
        {"_id": ObjectId(rest_id)},
        {"$set": {"menu": body.menu, "updated_at": datetime.now(timezone.utc)}},
    )
    doc = await db.restaurants.find_one({"_id": ObjectId(rest_id)})
    return restaurant_doc_to_out(doc)


@router.get("/mine", response_model=list[RestaurantOut])
async def my_restaurants(
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    if role != UserRole.RESTAURANT.value:
        raise HTTPException(status_code=403, detail="Restaurant role required")
    db = get_db()
    cursor = db.restaurants.find({"owner_id": user_id})
    return [restaurant_doc_to_out(doc) async for doc in cursor]

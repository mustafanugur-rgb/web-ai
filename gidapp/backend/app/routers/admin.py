from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import get_db
from app.deps import oid, require_admin
from app.models.user import user_doc_to_out
from app.models.restaurant import restaurant_doc_to_out
from app.models.bill import bill_doc_to_out

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
async def list_users(
    _: str = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    db = get_db()
    cursor = db.users.find({}, {"hashed_password": 0}).skip(skip).limit(limit)
    return [user_doc_to_out(doc).model_dump() async for doc in cursor]


@router.get("/restaurants")
async def list_restaurants_admin(
    _: str = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
):
    db = get_db()
    cursor = db.restaurants.find({}).skip(skip).limit(limit)
    return [restaurant_doc_to_out(doc).model_dump() async for doc in cursor]


@router.get("/bills")
async def list_bills_admin(
    _: str = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
):
    db = get_db()
    cursor = db.bills.find({}).sort("created_at", -1).skip(skip).limit(limit)
    return [bill_doc_to_out(doc).model_dump() async for doc in cursor]


@router.get("/earnings")
async def platform_earnings(_: str = Depends(require_admin)):
    db = get_db()
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    cur = db.platform_ledger.aggregate(pipeline)
    rows = await cur.to_list(1)
    total = rows[0]["total"] if rows else 0.0
    count = await db.platform_ledger.count_documents({})
    return {"total_commission_earned": round(float(total), 2), "ledger_entries": count}


@router.patch("/restaurants/{rest_id}/commission")
async def set_commission(
    rest_id: str,
    commission_rate: float,
    _: str = Depends(require_admin),
):
    if commission_rate < 0 or commission_rate > 1:
        raise HTTPException(status_code=400, detail="commission_rate must be 0–1")
    db = get_db()
    from datetime import datetime, timezone

    r = await db.restaurants.update_one(
        {"_id": oid(rest_id)},
        {"$set": {"commission_rate": commission_rate, "updated_at": datetime.now(timezone.utc)}},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    doc = await db.restaurants.find_one({"_id": oid(rest_id)})
    return restaurant_doc_to_out(doc).model_dump()

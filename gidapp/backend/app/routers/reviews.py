from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import get_db
from app.deps import get_current_user_id, oid
from app.models.enums import BillStatus
from app.models.review import ReviewCreate, ReviewOut, review_doc_to_out

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut)
async def create_review(data: ReviewCreate, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    bill = await db.bills.find_one({"_id": oid(data.linked_bill_id)})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if bill["restaurant_id"] != data.restaurant_id:
        raise HTTPException(status_code=400, detail="Bill does not belong to restaurant")
    if bill["status"] != BillStatus.PAID.value:
        raise HTTPException(status_code=400, detail="Only completed bills allow verified reviews")
    if user_id not in (bill.get("user_ids") or []):
        raise HTTPException(status_code=403, detail="You did not participate in this bill")
    existing = await db.reviews.find_one(
        {"user_id": user_id, "restaurant_id": data.restaurant_id, "linked_bill_id": data.linked_bill_id}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Review already exists for this bill")
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user_id,
        "restaurant_id": data.restaurant_id,
        "rating": data.rating,
        "comment": data.comment,
        "linked_bill_id": data.linked_bill_id,
        "created_at": now,
    }
    r = await db.reviews.insert_one(doc)
    doc["_id"] = r.inserted_id
    return review_doc_to_out(doc)


@router.get("/restaurant/{rest_id}", response_model=list[ReviewOut])
async def list_for_restaurant(
    rest_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    db = get_db()
    cursor = (
        db.reviews.find({"restaurant_id": rest_id}).sort("created_at", -1).skip(skip).limit(limit)
    )
    return [review_doc_to_out(doc) async for doc in cursor]

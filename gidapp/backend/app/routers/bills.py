from typing import Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import get_db
from app.deps import get_current_role, get_current_user_id, oid
from app.models.bill import BillItemAdd, BillOut, bill_doc_to_out
from app.models.enums import BillStatus, UserRole
from app.services import bill_service

router = APIRouter(prefix="/bills", tags=["bills"])


async def _can_view_bill(db, b: dict, user_id: str, role: str) -> bool:
    if user_id in (b.get("user_ids") or []):
        return True
    if role == UserRole.ADMIN.value:
        return True
    if role == UserRole.RESTAURANT.value:
        rest = await db.restaurants.find_one({"_id": ObjectId(b["restaurant_id"])})
        return bool(rest and rest.get("owner_id") == user_id)
    return False


@router.get("/me/open", response_model=list[BillOut])
async def my_open_bills(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    cursor = db.bills.find({"user_ids": user_id, "status": BillStatus.OPEN.value})
    return [bill_doc_to_out(doc) async for doc in cursor]


@router.get("/{bill_id}", response_model=BillOut)
async def get_bill(
    bill_id: str,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    db = get_db()
    b = await db.bills.find_one({"_id": oid(bill_id)})
    if not b:
        raise HTTPException(status_code=404, detail="Bill not found")
    if not await _can_view_bill(db, b, user_id, role):
        raise HTTPException(status_code=403, detail="Forbidden")
    return bill_doc_to_out(b)


@router.get("/{bill_id}/split", response_model=dict)
async def split_bill(
    bill_id: str,
    mode: Literal["equal", "by_item"] = Query("equal"),
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    db = get_db()
    b = await db.bills.find_one({"_id": oid(bill_id)})
    if not b:
        raise HTTPException(status_code=404, detail="Bill not found")
    if not await _can_view_bill(db, b, user_id, role):
        raise HTTPException(status_code=403, detail="Forbidden")
    uids = b.get("user_ids") or []
    items = b.get("items") or []
    return bill_service.split_preview(items, uids, mode)


@router.post("/{bill_id}/items", response_model=BillOut)
async def add_item(
    bill_id: str,
    body: BillItemAdd,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    db = get_db()
    b = await db.bills.find_one({"_id": oid(bill_id)})
    if not b:
        raise HTTPException(status_code=404, detail="Bill not found")
    if user_id not in (b.get("user_ids") or []):
        raise HTTPException(status_code=403, detail="Must join bill first")
    doc = await bill_service.add_items_to_bill(db, bill_id, user_id, body)
    return bill_doc_to_out(doc)


@router.delete("/{bill_id}/items/{item_index}", response_model=BillOut)
async def remove_item(
    bill_id: str,
    item_index: int,
    user_id: str = Depends(get_current_user_id),
):
    db = get_db()
    doc = await bill_service.remove_item(db, bill_id, user_id, item_index)
    return bill_doc_to_out(doc)


@router.post("/{bill_id}/mark-paid", response_model=BillOut)
async def mark_paid(
    bill_id: str,
    user_id: str = Depends(get_current_user_id),
):
    db = get_db()
    doc = await bill_service.mark_paid_user(db, bill_id, user_id)
    return bill_doc_to_out(doc)


@router.post("/{bill_id}/confirm-payment", response_model=BillOut)
async def confirm_payment(
    bill_id: str,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    if role != UserRole.RESTAURANT.value:
        raise HTTPException(status_code=403, detail="Restaurant only")
    db = get_db()
    doc = await bill_service.confirm_paid_restaurant(db, bill_id, user_id)
    return bill_doc_to_out(doc)

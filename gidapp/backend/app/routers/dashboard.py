from fastapi import APIRouter, Depends, HTTPException

from app.db import get_db
from app.deps import get_current_role, get_current_user_id, oid
from app.models.bill import BillOut, bill_doc_to_out
from app.models.enums import BillStatus, UserRole
from app.models.table import TableOut, table_doc_to_out

router = APIRouter(prefix="/restaurant-dashboard", tags=["restaurant-dashboard"])


async def _assert_owner(db, rest_id: str, user_id: str):
    rest = await db.restaurants.find_one({"_id": oid(rest_id)})
    if not rest or rest["owner_id"] != user_id:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return rest


@router.get("/{rest_id}/tables", response_model=list[TableOut])
async def active_tables(
    rest_id: str,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    if role != UserRole.RESTAURANT.value:
        raise HTTPException(status_code=403, detail="Restaurant only")
    db = get_db()
    await _assert_owner(db, rest_id, user_id)
    cursor = db.tables.find({"restaurant_id": rest_id})
    return [table_doc_to_out(doc) async for doc in cursor]


@router.get("/{rest_id}/bills/active", response_model=list[BillOut])
async def active_bills(
    rest_id: str,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    if role != UserRole.RESTAURANT.value:
        raise HTTPException(status_code=403, detail="Restaurant only")
    db = get_db()
    await _assert_owner(db, rest_id, user_id)
    cursor = db.bills.find({"restaurant_id": rest_id, "status": BillStatus.OPEN.value})
    return [bill_doc_to_out(doc) async for doc in cursor]


@router.get("/{rest_id}/bills/past", response_model=list[BillOut])
async def past_bills(
    rest_id: str,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    if role != UserRole.RESTAURANT.value:
        raise HTTPException(status_code=403, detail="Restaurant only")
    db = get_db()
    await _assert_owner(db, rest_id, user_id)
    cursor = db.bills.find({"restaurant_id": rest_id, "status": BillStatus.PAID.value}).sort(
        "paid_at", -1
    )
    return [bill_doc_to_out(doc) async for doc in cursor]


@router.get("/{rest_id}/summary")
async def summary(
    rest_id: str,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    if role != UserRole.RESTAURANT.value:
        raise HTTPException(status_code=403, detail="Restaurant only")
    db = get_db()
    await _assert_owner(db, rest_id, user_id)
    paid = await db.bills.find(
        {"restaurant_id": rest_id, "status": BillStatus.PAID.value}
    ).to_list(None)
    total_earnings = sum(float(b.get("total_amount", 0)) for b in paid)
    total_commission = sum(float(b.get("commission_amount", 0)) for b in paid)
    n = len(paid)
    avg = (total_earnings / n) if n else 0.0
    return {
        "restaurant_id": rest_id,
        "total_earnings": round(total_earnings, 2),
        "commission_to_platform": round(total_commission, 2),
        "completed_bills": n,
        "average_bill_amount": round(avg, 2),
    }

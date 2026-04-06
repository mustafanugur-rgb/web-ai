from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.db import get_db
from app.deps import get_current_role, get_current_user_id, oid
from app.models.enums import BillStatus, UserRole

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/platform")
async def platform_analytics(
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    if role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    cur = db.platform_ledger.aggregate(pipeline)
    rows = await cur.to_list(1)
    commission_total = float(rows[0]["total"]) if rows else 0.0
    paid_bills = await db.bills.count_documents({"status": BillStatus.PAID.value})
    open_bills = await db.bills.count_documents({"status": BillStatus.OPEN.value})
    return {
        "total_commission": round(commission_total, 2),
        "paid_bills_count": paid_bills,
        "open_bills_count": open_bills,
    }


@router.get("/restaurant/{rest_id}")
async def restaurant_analytics(
    rest_id: str,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    db = get_db()
    rest = await db.restaurants.find_one({"_id": oid(rest_id)})
    if not rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    if role != UserRole.ADMIN.value and (
        role != UserRole.RESTAURANT.value or rest["owner_id"] != user_id
    ):
        raise HTTPException(status_code=403, detail="Forbidden")
    rid = rest_id
    now = datetime.now(timezone.utc)
    start_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    pipeline_day = [
        {
            "$match": {
                "restaurant_id": rid,
                "status": BillStatus.PAID.value,
                "paid_at": {"$gte": start_day},
            }
        },
        {
            "$group": {
                "_id": None,
                "revenue": {"$sum": "$total_amount"},
                "count": {"$sum": 1},
                "avg": {"$avg": "$total_amount"},
            }
        },
    ]
    cur = db.bills.aggregate(pipeline_day)
    rows = await cur.to_list(1)
    day = rows[0] if rows else {}
    all_paid = await db.bills.find(
        {"restaurant_id": rid, "status": BillStatus.PAID.value}
    ).to_list(None)
    total_rev = sum(float(b.get("total_amount", 0)) for b in all_paid)
    total_comm = sum(float(b.get("commission_amount", 0)) for b in all_paid)
    n_customers = sum(len(set(b.get("user_ids") or [])) for b in all_paid)
    return {
        "restaurant_id": rid,
        "daily_revenue": round(float(day.get("revenue", 0)), 2),
        "daily_bills": int(day.get("count", 0)),
        "daily_avg_bill": round(float(day.get("avg", 0)), 2) if day.get("avg") else 0.0,
        "total_revenue": round(total_rev, 2),
        "total_commission_paid": round(total_comm, 2),
        "estimated_customer_visits": n_customers,
        "completed_bills_count": len(all_paid),
    }

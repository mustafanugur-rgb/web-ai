from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.bill import BillItemAdd
from app.models.enums import BillStatus, PaymentStatus


def calc_total(items: list[dict[str, Any]]) -> float:
    t = 0.0
    for it in items:
        t += float(it["price"]) * int(it["quantity"])
    return round(t, 2)


async def add_items_to_bill(
    db: AsyncIOMotorDatabase,
    bill_id: str,
    user_id: str,
    body: BillItemAdd,
) -> dict:
    b = await db.bills.find_one({"_id": ObjectId(bill_id)})
    if not b:
        raise HTTPException(status_code=404, detail="Bill not found")
    if b["status"] != BillStatus.OPEN.value:
        raise HTTPException(status_code=400, detail="Bill is not open")
    items = list(b.get("items") or [])
    items.append(
        {
            "name": body.name,
            "price": body.price,
            "quantity": body.quantity,
            "added_by_user_id": user_id,
        }
    )
    total = calc_total(items)
    await db.bills.update_one(
        {"_id": ObjectId(bill_id)},
        {"$set": {"items": items, "total_amount": total, "updated_at": datetime.now(timezone.utc)}},
    )
    return await db.bills.find_one({"_id": ObjectId(bill_id)})


async def remove_item(
    db: AsyncIOMotorDatabase,
    bill_id: str,
    user_id: str,
    item_index: int,
) -> dict:
    b = await db.bills.find_one({"_id": ObjectId(bill_id)})
    if not b:
        raise HTTPException(status_code=404, detail="Bill not found")
    if b["status"] != BillStatus.OPEN.value:
        raise HTTPException(status_code=400, detail="Bill is not open")
    items = list(b.get("items") or [])
    if item_index < 0 or item_index >= len(items):
        raise HTTPException(status_code=400, detail="Invalid item index")
    if items[item_index].get("added_by_user_id") != user_id:
        raise HTTPException(status_code=403, detail="Can only remove your own items")
    items.pop(item_index)
    total = calc_total(items)
    await db.bills.update_one(
        {"_id": ObjectId(bill_id)},
        {"$set": {"items": items, "total_amount": total, "updated_at": datetime.now(timezone.utc)}},
    )
    return await db.bills.find_one({"_id": ObjectId(bill_id)})


async def mark_paid_user(
    db: AsyncIOMotorDatabase,
    bill_id: str,
    user_id: str,
) -> dict:
    b = await db.bills.find_one({"_id": ObjectId(bill_id)})
    if not b:
        raise HTTPException(status_code=404, detail="Bill not found")
    if user_id not in (b.get("user_ids") or []):
        raise HTTPException(status_code=403, detail="Not on this bill")
    if b["status"] != BillStatus.OPEN.value:
        raise HTTPException(status_code=400, detail="Bill already closed")
    await db.bills.update_one(
        {"_id": ObjectId(bill_id)},
        {"$set": {"payment_status": PaymentStatus.USER_MARKED.value, "updated_at": datetime.now(timezone.utc)}},
    )
    return await db.bills.find_one({"_id": ObjectId(bill_id)})


async def confirm_paid_restaurant(
    db: AsyncIOMotorDatabase,
    bill_id: str,
    owner_id: str,
) -> dict:
    b = await db.bills.find_one({"_id": ObjectId(bill_id)})
    if not b:
        raise HTTPException(status_code=404, detail="Bill not found")
    rest = await db.restaurants.find_one({"_id": ObjectId(b["restaurant_id"])})
    if not rest or rest["owner_id"] != owner_id:
        raise HTTPException(status_code=403, detail="Not your restaurant")
    if b["status"] != BillStatus.OPEN.value:
        raise HTTPException(status_code=400, detail="Bill already closed")
    total = float(b.get("total_amount", 0))
    rate = float(rest.get("commission_rate", 0))
    commission = round(total * rate, 2)
    now = datetime.now(timezone.utc)
    await db.bills.update_one(
        {"_id": ObjectId(bill_id)},
        {
            "$set": {
                "status": BillStatus.PAID.value,
                "payment_status": PaymentStatus.CONFIRMED.value,
                "commission_amount": commission,
                "paid_at": now,
                "updated_at": now,
            }
        },
    )
    await db.platform_ledger.insert_one(
        {
            "type": "commission",
            "bill_id": str(b["_id"]),
            "restaurant_id": b["restaurant_id"],
            "amount": commission,
            "bill_total": total,
            "created_at": now,
        }
    )
    return await db.bills.find_one({"_id": ObjectId(bill_id)})


def split_preview(items: list[dict[str, Any]], user_ids: list[str], mode: str) -> dict[str, Any]:
    total = calc_total(items)
    if mode == "equal":
        n = max(len(user_ids), 1)
        share = round(total / n, 2)
        return {"mode": "equal", "total": total, "per_user": {uid: share for uid in user_ids}}
    by_user: dict[str, float] = {uid: 0.0 for uid in user_ids}
    for it in items:
        uid = it.get("added_by_user_id")
        if uid not in by_user:
            by_user[uid] = 0.0
        line = float(it["price"]) * int(it["quantity"])
        by_user[uid] = round(by_user.get(uid, 0) + line, 2)
    return {"mode": "by_item", "total": total, "per_user": by_user}

"""
Future-ready POS integration. Protected by API key (MVP: env POS_API_KEY).
"""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.db import get_db
from app.models.enums import BillStatus
from app.models.pos import POSSyncBillRequest, POSSyncBillResponse
from app.services import bill_service

router = APIRouter(prefix="/pos", tags=["pos"])


def _check_api_key(key: str) -> None:
    if settings.pos_api_key and key != settings.pos_api_key:
        raise HTTPException(status_code=401, detail="Invalid POS API key")


@router.post("/sync-bill", response_model=POSSyncBillResponse)
async def sync_bill(body: POSSyncBillRequest):
    _check_api_key(body.api_key)
    db = get_db()
    table = await db.tables.find_one({"_id": ObjectId(body.table_id)})
    if not table or table["restaurant_id"] != body.restaurant_id:
        raise HTTPException(status_code=404, detail="Table not found")

    open_bill = await db.bills.find_one(
        {"table_id": body.table_id, "status": BillStatus.OPEN.value}
    )
    now = datetime.now(timezone.utc)
    pos_user = "pos:external"

    if not open_bill:
        doc = {
            "restaurant_id": body.restaurant_id,
            "table_id": body.table_id,
            "user_ids": [pos_user],
            "items": [],
            "total_amount": 0.0,
            "commission_amount": 0.0,
            "status": BillStatus.OPEN.value,
            "payment_status": "PENDING",
            "external_bill_id": body.external_bill_id,
            "source": "POS",
            "created_at": now,
        }
        r = await db.bills.insert_one(doc)
        open_bill = await db.bills.find_one({"_id": r.inserted_id})

    items = [] if body.replace_items else list(open_bill.get("items") or [])
    for line in body.items:
        items.append(
            {
                "name": line.name,
                "price": line.price,
                "quantity": line.quantity,
                "added_by_user_id": pos_user,
                "external_line_id": line.external_line_id,
            }
        )
    total = bill_service.calc_total(items)
    await db.bills.update_one(
        {"_id": open_bill["_id"]},
        {
            "$set": {
                "items": items,
                "total_amount": total,
                "external_bill_id": body.external_bill_id or open_bill.get("external_bill_id"),
                "updated_at": now,
            }
        },
    )
    b = await db.bills.find_one({"_id": open_bill["_id"]})
    return POSSyncBillResponse(
        bill_id=str(b["_id"]),
        status=b["status"],
        total_amount=float(b.get("total_amount", 0)),
    )

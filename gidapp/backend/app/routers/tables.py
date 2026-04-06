import secrets
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.db import get_db
from app.deps import get_current_role, get_current_user_id, oid
from app.models.enums import BillStatus, UserRole
from app.models.table import QRScanPayload, TableCreate, TableOut, table_doc_to_out
from app.models.bill import bill_doc_to_out

router = APIRouter(prefix="/tables", tags=["tables"])

QR_TOKEN_TTL_DAYS = 365


@router.post("/restaurant/{rest_id}", response_model=TableOut)
async def create_table(
    rest_id: str,
    data: TableCreate,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    if role != UserRole.RESTAURANT.value:
        raise HTTPException(status_code=403, detail="Restaurant role required")
    db = get_db()
    rest = await db.restaurants.find_one({"_id": oid(rest_id)})
    if not rest or rest["owner_id"] != user_id:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=QR_TOKEN_TTL_DAYS)
    doc = {
        "restaurant_id": rest_id,
        "table_number": data.table_number,
        "label": data.label,
        "qr_token": token,
        "expires_at": expires,
        "created_at": now,
    }
    try:
        r = await db.tables.insert_one(doc)
    except Exception:
        raise HTTPException(status_code=400, detail="Table number may already exist for this restaurant")
    doc["_id"] = r.inserted_id
    return table_doc_to_out(doc)


@router.get("/restaurant/{rest_id}", response_model=list[TableOut])
async def list_tables(
    rest_id: str,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_role),
):
    if role != UserRole.RESTAURANT.value:
        raise HTTPException(status_code=403, detail="Restaurant role required")
    db = get_db()
    rest = await db.restaurants.find_one({"_id": oid(rest_id)})
    if not rest or rest["owner_id"] != user_id:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    cursor = db.tables.find({"restaurant_id": rest_id})
    return [table_doc_to_out(doc) async for doc in cursor]


@router.post("/scan", response_model=dict)
async def scan_qr(
    payload: QRScanPayload,
    user_id: str = Depends(get_current_user_id),
):
    """Validate QR and join or create active bill session."""
    db = get_db()
    table = await db.tables.find_one({"_id": oid(payload.table_id)})
    if not table:
        raise HTTPException(status_code=404, detail="Invalid table")
    if table["restaurant_id"] != payload.restaurant_id:
        raise HTTPException(status_code=400, detail="QR mismatch")
    if table["qr_token"] != payload.token:
        raise HTTPException(status_code=401, detail="Invalid QR token")
    exp = table.get("expires_at")
    if exp and exp.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="QR session expired")

    open_bill = await db.bills.find_one(
        {"table_id": payload.table_id, "status": BillStatus.OPEN.value}
    )
    now = datetime.now(timezone.utc)
    if open_bill:
        uids = list(open_bill.get("user_ids") or [])
        if user_id not in uids:
            uids.append(user_id)
            await db.bills.update_one(
                {"_id": open_bill["_id"]},
                {"$set": {"user_ids": uids, "updated_at": now}},
            )
            open_bill = await db.bills.find_one({"_id": open_bill["_id"]})
    else:
        doc = {
            "restaurant_id": payload.restaurant_id,
            "table_id": payload.table_id,
            "user_ids": [user_id],
            "items": [],
            "total_amount": 0.0,
            "commission_amount": 0.0,
            "status": BillStatus.OPEN.value,
            "payment_status": "PENDING",
            "created_at": now,
        }
        r = await db.bills.insert_one(doc)
        open_bill = await db.bills.find_one({"_id": r.inserted_id})

    return {
        "table": table_doc_to_out(table),
        "bill": bill_doc_to_out(open_bill),
        "qr_payload": {
            "restaurant_id": payload.restaurant_id,
            "table_id": payload.table_id,
            "token": payload.token,
        },
    }

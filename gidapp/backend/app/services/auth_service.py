from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.enums import UserRole
from app.models.user import UserCreate, UserInDB, user_doc_to_out
from app.security import create_access_token, hash_password, verify_password


async def register_user(db: AsyncIOMotorDatabase, data: UserCreate) -> dict:
    if data.role not in (UserRole.CUSTOMER.value, UserRole.RESTAURANT.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CUSTOMER or RESTAURANT can self-register",
        )
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    now = datetime.now(timezone.utc)
    doc = {
        "email": data.email.lower(),
        "hashed_password": hash_password(data.password),
        "role": data.role,
        "created_at": now,
    }
    r = await db.users.insert_one(doc)
    doc["_id"] = r.inserted_id
    token = create_access_token(str(r.inserted_id), data.role)
    return {"user": user_doc_to_out(doc).model_dump(), "access_token": token, "token_type": "bearer"}


async def login_user(db: AsyncIOMotorDatabase, email: str, password: str) -> dict:
    doc = await db.users.find_one({"email": email.lower()})
    if not doc or not verify_password(password, doc["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(str(doc["_id"]), doc["role"])
    return {"user": user_doc_to_out(doc).model_dump(), "access_token": token, "token_type": "bearer"}


async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: str) -> dict | None:
    try:
        oid = ObjectId(user_id)
    except Exception:
        return None
    return await db.users.find_one({"_id": oid})

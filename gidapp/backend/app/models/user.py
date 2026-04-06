from datetime import datetime
from typing import Any

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["CUSTOMER", "RESTAURANT"] = "CUSTOMER"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    created_at: datetime | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserInDB(BaseModel):
    id: str
    email: str
    hashed_password: str
    role: str
    created_at: datetime | None = None


def user_doc_to_out(doc: dict[str, Any]) -> UserOut:
    return UserOut(
        id=str(doc["_id"]),
        email=doc["email"],
        role=doc["role"],
        created_at=doc.get("created_at"),
    )

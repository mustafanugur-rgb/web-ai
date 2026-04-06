from fastapi import APIRouter, Depends

from app.db import get_db
from app.deps import get_current_user_id
from app.models.user import UserCreate, UserLogin, UserOut
from app.services.auth_service import get_user_by_id, login_user, register_user
from app.models.user import user_doc_to_out

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=dict)
async def register(data: UserCreate):
    db = get_db()
    return await register_user(db, data)


@router.post("/login", response_model=dict)
async def login(data: UserLogin):
    db = get_db()
    return await login_user(db, data.email, data.password)


@router.get("/me", response_model=UserOut)
async def me(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    doc = await get_user_by_id(db, user_id)
    if not doc:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="User not found")
    return user_doc_to_out(doc)

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.user import User
from services.auth_service import (
    create_access_token,
    verify_password,
    get_current_user,
    hash_password,
)

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: str | None
    department: str
    role: str
    knowledge_access: list[str]
    is_active: bool


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user with email and password."""
    result = await db.execute(
        select(User).where(User.email == request.email, User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")

    token = create_access_token(str(user.id), user.role)

    return LoginResponse(
        access_token=token,
        user={
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "department": user.department,
            "role": user.role,
            "knowledge_access": user.knowledge_access or [],
        },
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Get current user profile from JWT token."""
    return UserProfileResponse(
        id=str(current_user.id),
        name=current_user.name,
        email=current_user.email,
        department=current_user.department,
        role=current_user.role,
        knowledge_access=current_user.knowledge_access or [],
        is_active=current_user.is_active,
    )


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change current user's password."""
    if not current_user.password_hash or not verify_password(
        request.current_password, current_user.password_hash
    ):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")

    current_user.password_hash = hash_password(request.new_password)
    await db.commit()
    return {"status": "ok", "message": "Đã đổi mật khẩu thành công"}

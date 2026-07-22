from datetime import datetime

from pydantic import BaseModel, EmailStr


class TaskCreate(BaseModel):
    title: str
    priority: str = "medium"
    description: str | None = None


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    class Config:
        orm_mode = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
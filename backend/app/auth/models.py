"""
User Models for Authentication
"""
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class UserRole(str, Enum):
    CUSTOMER = "customer"
    PHARMACY = "pharmacy"
    DISTRIBUTOR = "distributor"
    ADMIN = "admin"


class AllergyInfo(BaseModel):
    allergen: str
    severity: str = "moderate" 
    reaction: str | None = None


class MedicalInfo(BaseModel):
    allergies: list[AllergyInfo] = []
    chronic_conditions: list[str] = []
    current_medications: list[str] = []


# Request Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=10)
    role: UserRole = UserRole.CUSTOMER
    address: str | None = None
    medical_info: Optional[MedicalInfo]  = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# Database Model
class UserInDB(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    email: str
    password_hash: str
    name: str
    phone: str
    role: UserRole
    
    # Customer fields
    address: str | None = None
    medical_info: MedicalInfo | None = None
    
    # Status
    is_active: bool = True
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Config:
        populate_by_name = True


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: str
    role: UserRole
    address: str | None = None
    medical_info: MedicalInfo | None = None
    is_active: bool
    created_at: datetime
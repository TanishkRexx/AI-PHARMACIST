"""
Medicine Model
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MedicineCategory(str, Enum):
    PAINKILLER = "painkiller"
    ANTIBIOTIC = "antibiotic"
    ANTIDIABETIC = "antidiabetic"
    CARDIOVASCULAR = "cardiovascular"
    RESPIRATORY = "respiratory"
    GASTROINTESTINAL = "gastrointestinal"
    VITAMIN = "vitamin"
    DERMATOLOGICAL = "dermatological"
    OTHER = "other"


class Medicine(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    generic_name: str
    brand: str
    category: MedicineCategory
    dosage: str
    unit_price: float
    stock_quantity: int
    reorder_level: int = 50
    prescription_required: bool = False
    
    # Safety info
    description: Optional[str] = None
    contraindications: List[str] = []
    drug_interactions: List[str] = []
    side_effects: List[str] = []
    max_daily_dosage: Optional[str] = None
    
    # Additional
    manufacturer: str
    image_url: Optional[str] = None
    expiry_date: Optional[datetime] = None
    
    # Status
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True


class MedicineCreate(BaseModel):
    name: str
    generic_name: str
    brand: str
    category: MedicineCategory
    dosage: str
    unit_price: float
    stock_quantity: int
    reorder_level: int = 50
    prescription_required: bool = False
    description: Optional[str] = None
    contraindications: List[str] = []
    drug_interactions: List[str] = []
    side_effects: List[str] = []
    manufacturer: str


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    unit_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    reorder_level: Optional[int] = None
    is_active: Optional[bool] = None


class MedicineResponse(BaseModel):
    id: str
    name: str
    generic_name: str
    brand: str
    category: str
    dosage: str
    unit_price: float
    stock_quantity: int
    in_stock: bool
    prescription_required: bool
    description: Optional[str] = None
    image_url: Optional[str] = None
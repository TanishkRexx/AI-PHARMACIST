"""
Procurement Order Model - Pharmacy to Distributor
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ProcurementStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class ProcurementItem(BaseModel):
    medicine_id: str
    medicine_name: str
    current_stock: int
    reorder_level: int
    quantity_ordered: int
    unit_cost: float
    subtotal: float


class ProcurementOrder(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    po_number: str
    
    # Items
    items: List[ProcurementItem]
    
    # Pricing
    subtotal: float
    tax_amount: float = 0.0
    shipping_cost: float = 0.0
    total_amount: float
    
    # Status
    status: ProcurementStatus = ProcurementStatus.PENDING
    
    # Tracking
    tracking_number: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    
    # Notes
    notes: Optional[str] = None
    
    class Config:
        populate_by_name = True


class ProcurementCreate(BaseModel):
    items: List[dict]  # [{medicine_id, quantity_ordered}]
    notes: Optional[str] = None
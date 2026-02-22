"""
Order Model - Customer Orders
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class OrderItem(BaseModel):
    medicine_id: str
    medicine_name: str
    quantity: int
    unit_price: float
    subtotal: float
    dosage: str
    prescription_required: bool = False


class Order(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    order_number: str
    
    # Customer info
    customer_id: str
    customer_name: str
    customer_phone: str
    customer_email: str
    
    # Items
    items: List[OrderItem]
    
    # Pricing
    subtotal: float
    tax_amount: float = 0.0
    delivery_charge: float = 0.0
    discount_amount: float = 0.0
    total_amount: float
    
    # Status
    status: OrderStatus = OrderStatus.PENDING
    payment_status: PaymentStatus = PaymentStatus.PENDING
    
    # Delivery
    delivery_address: str
    delivery_notes: Optional[str] = None
    
    # Prescription
    requires_prescription: bool = False
    prescription_verified: bool = False
    prescription_image: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    confirmed_at: Optional[datetime] = None
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True


class OrderCreate(BaseModel):
    delivery_address: str
    delivery_notes: Optional[str] = None
    prescription_image: Optional[str] = None  # Base64 encoded


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    notes: Optional[str] = None
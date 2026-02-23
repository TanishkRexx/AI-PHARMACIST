"""
Cart Model
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CartItem(BaseModel):
    medicine_id: str
    medicine_name: str
    quantity: int
    unit_price: float
    dosage: str
    prescription_required: bool = False
    image_url: Optional[str] = None
    
    @property
    def subtotal(self) -> float:
        return self.quantity * self.unit_price


class Cart(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    items: List[CartItem] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @property
    def total_items(self) -> int:
        return sum(item.quantity for item in self.items)
    
    @property
    def total_amount(self) -> float:
        return sum(item.quantity * item.unit_price for item in self.items)
    
    class Config:
        populate_by_name = True


class AddToCartRequest(BaseModel):
    medicine_id: str
    quantity: int = 1


class UpdateCartRequest(BaseModel):
    quantity: int
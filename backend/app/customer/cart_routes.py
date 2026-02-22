"""
Customer Cart Routes - Shopping Cart Management
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from app.database.mongodb import get_database
from app.auth.dependencies import get_current_active_user

router = APIRouter()


class AddToCartRequest(BaseModel):
    medicine_id: str
    quantity: int = 1


class UpdateCartItemRequest(BaseModel):
    quantity: int


@router.get("/cart")
async def get_cart(current_user: dict = Depends(get_current_active_user)):
    """
    Get current user's cart.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    # Find cart
    cart = await db["carts"].find_one({"user_id": user_id})
    
    if not cart:
        return {
            "success": True,
            "data": {
                "items": [],
                "total_items": 0,
                "total_amount": 0
            }
        }
    
    # Enrich cart items with current medicine data
    items = []
    total_amount = 0
    
    for item in cart.get("items", []):
        medicine = await db["medicines"].find_one({"_id": ObjectId(item["medicine_id"])})
        
        if medicine:
            item_data = {
                "id": item["medicine_id"],
                "medicine_id": item["medicine_id"],
                "name": medicine["name"],
                "brand": medicine.get("brand", ""),
                "dosage": medicine.get("dosage", ""),
                "quantity": item["quantity"],
                "unit_price": medicine.get("unit_price", 0),
                "subtotal": item["quantity"] * medicine.get("unit_price", 0),
                "in_stock": medicine.get("stock_quantity", 0) >= item["quantity"],
                "available_stock": medicine.get("stock_quantity", 0),
                "prescription_required": medicine.get("prescription_required", False),
                "image_url": medicine.get("image_url")
            }
            items.append(item_data)
            total_amount += item_data["subtotal"]
    
    return {
        "success": True,
        "data": {
            "items": items,
            "total_items": sum(item["quantity"] for item in items),
            "total_amount": round(total_amount, 2),
            "requires_prescription": any(item["prescription_required"] for item in items)
        }
    }


@router.post("/cart/add")
async def add_to_cart(
    request: AddToCartRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Add item to cart.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    # Validate medicine
    try:
        medicine = await db["medicines"].find_one({
            "_id": ObjectId(request.medicine_id),
            "is_active": True
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid medicine ID")
    
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    # Check stock
    if medicine.get("stock_quantity", 0) < request.quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient stock. Available: {medicine.get('stock_quantity', 0)}"
        )
    
    # Find or create cart
    cart = await db["carts"].find_one({"user_id": user_id})
    
    if not cart:
        # Create new cart
        cart = {
            "user_id": user_id,
            "items": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db["carts"].insert_one(cart)
    
    # Check if item already in cart
    existing_item_index = None
    for i, item in enumerate(cart.get("items", [])):
        if item["medicine_id"] == request.medicine_id:
            existing_item_index = i
            break
    
    if existing_item_index is not None:
        # Update quantity
        new_quantity = cart["items"][existing_item_index]["quantity"] + request.quantity
        
        if medicine.get("stock_quantity", 0) < new_quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot add more. Stock available: {medicine.get('stock_quantity', 0)}"
            )
        
        await db["carts"].update_one(
            {"user_id": user_id},
            {
                "$set": {
                    f"items.{existing_item_index}.quantity": new_quantity,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    else:
        # Add new item
        new_item = {
            "medicine_id": request.medicine_id,
            "quantity": request.quantity,
            "added_at": datetime.utcnow()
        }
        
        await db["carts"].update_one(
            {"user_id": user_id},
            {
                "$push": {"items": new_item},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    
    return {
        "success": True,
        "message": f"Added {medicine['name']} to cart",
        "data": {
            "medicine_id": request.medicine_id,
            "medicine_name": medicine["name"],
            "quantity": request.quantity
        }
    }


@router.put("/cart/update/{medicine_id}")
async def update_cart_item(
    medicine_id: str,
    request: UpdateCartItemRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update cart item quantity.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    if request.quantity < 1:
        # Remove item if quantity is 0 or less
        await db["carts"].update_one(
            {"user_id": user_id},
            {
                "$pull": {"items": {"medicine_id": medicine_id}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        return {"success": True, "message": "Item removed from cart"}
    
    # Check stock
    try:
        medicine = await db["medicines"].find_one({"_id": ObjectId(medicine_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid medicine ID")
    
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    if medicine.get("stock_quantity", 0) < request.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {medicine.get('stock_quantity', 0)}"
        )
    
    # Update quantity
    result = await db["carts"].update_one(
        {"user_id": user_id, "items.medicine_id": medicine_id},
        {
            "$set": {
                "items.$.quantity": request.quantity,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    
    return {
        "success": True,
        "message": "Cart updated",
        "data": {"medicine_id": medicine_id, "quantity": request.quantity}
    }


@router.delete("/cart/remove/{medicine_id}")
async def remove_from_cart(
    medicine_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Remove item from cart.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    result = await db["carts"].update_one(
        {"user_id": user_id},
        {
            "$pull": {"items": {"medicine_id": medicine_id}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"success": True, "message": "Item removed from cart"}


@router.delete("/cart/clear")
async def clear_cart(current_user: dict = Depends(get_current_active_user)):
    """
    Clear all items from cart.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    await db["carts"].update_one(
        {"user_id": user_id},
        {
            "$set": {
                "items": [],
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"success": True, "message": "Cart cleared"}
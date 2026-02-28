"""
Customer Cart Routes - Shopping Cart Management with Price Optimization
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from app.database.mongodb import get_database
from app.auth.dependencies import get_current_active_user
from app.agents.price_optimization_agent import get_price_optimization_agent

router = APIRouter()


class AddToCartRequest(BaseModel):
    medicine_id: str
    quantity: int = 1
    
    @validator('quantity')
    def quantity_must_be_valid(cls, v):
        if v < 1:
            raise ValueError('Quantity must be at least 1')
        if v > 100:
            raise ValueError('Quantity cannot exceed 100 per order')
        return v


class UpdateCartItemRequest(BaseModel):
    quantity: int

    @validator('quantity')
    def quantity_must_be_valid(cls, v):
        if v < 0:
            raise ValueError('Quantity cannot be negative')
        if v > 100:
            raise ValueError('Quantity cannot exceed 100')
        return v


class SwapMedicineRequest(BaseModel):
    """Request to swap a medicine with an alternative"""
    original_medicine_id: str
    alternative_medicine_id: str


# ==================== GET CART ====================

@router.get("/cart")
async def get_cart(
    include_alternatives: bool = Query(False, description="Include cheaper alternatives for each item"),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get current user's cart.
    
    Set include_alternatives=true to get price optimization suggestions inline.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    # Find cart
    cart = await db["carts"].find_one({"user_id": user_id})
    
    if not cart or not cart.get("items"):
        return {
            "success": True,
            "data": {
                "items": [],
                "total_items": 0,
                "total_amount": 0,
                "has_savings_available": False,
                "potential_savings": 0
            }
        }
    
    # Enrich cart items with current medicine data
    items = []
    total_amount = 0
    
    # Get user's medical info for safety checks (if including alternatives)
    medical_info = current_user.get("medical_info", {})
    allergies = [a.get("allergen", "") for a in medical_info.get("allergies", []) if a.get("allergen")]
    current_medications = medical_info.get("current_medications", [])
    
    # Get price optimization agent if needed
    price_agent = get_price_optimization_agent() if include_alternatives else None
    
    for item in cart.get("items", []):
        try:
            medicine = await db["medicines"].find_one({"_id": ObjectId(item["medicine_id"])})
        except:
            continue
        
        if medicine:
            item_subtotal = item["quantity"] * medicine.get("unit_price", 0)
            
            item_data = {
                "id": item["medicine_id"],
                "medicine_id": item["medicine_id"],
                "name": medicine["name"],
                "generic_name": medicine.get("generic_name", ""),
                "brand": medicine.get("brand", ""),
                "category": medicine.get("category", ""),
                "dosage": medicine.get("dosage", ""),
                "quantity": item["quantity"],
                "unit_price": medicine.get("unit_price", 0),
                "subtotal": round(item_subtotal, 2),
                "in_stock": medicine.get("stock_quantity", 0) >= item["quantity"],
                "available_stock": medicine.get("stock_quantity", 0),
                "prescription_required": medicine.get("prescription_required", False),
                "image_url": medicine.get("image_url"),
                "swapped_from": item.get("swapped_from"),  # Track if this was swapped
                "added_at": item.get("added_at")
            }
            
            # Include alternatives if requested
            if include_alternatives and price_agent:
                alternatives = price_agent._find_cheaper_alternatives(
                    medicine=medicine,
                    quantity=item["quantity"],
                    user_allergies=allergies,
                    current_medications=current_medications,
                    max_alternatives=2  # Limit for performance
                )
                
                item_data["alternatives"] = alternatives
                item_data["has_alternatives"] = len(alternatives) > 0
                item_data["best_alternative"] = alternatives[0] if alternatives else None
                item_data["potential_savings"] = (
                    (medicine.get("unit_price", 0) - alternatives[0]["unit_price"]) * item["quantity"]
                    if alternatives else 0
                )
            
            items.append(item_data)
            total_amount += item_subtotal
    
    # Calculate savings summary
    total_potential_savings = sum(item.get("potential_savings", 0) for item in items) if include_alternatives else 0
    items_with_alternatives = sum(1 for item in items if item.get("has_alternatives", False)) if include_alternatives else 0
    
    return {
        "success": True,
        "data": {
            "items": items,
            "total_items": sum(item["quantity"] for item in items),
            "total_amount": round(total_amount, 2),
            "requires_prescription": any(item["prescription_required"] for item in items),
            # Price optimization summary
            "has_savings_available": total_potential_savings > 0,
            "potential_savings": round(total_potential_savings, 2),
            "items_with_alternatives": items_with_alternatives,
            "savings_percentage": round((total_potential_savings / total_amount) * 100, 1) if total_amount > 0 else 0
        }
    }


# ==================== ADD TO CART ====================

@router.post("/cart/add")
async def add_to_cart(
    request: AddToCartRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Add item to cart.
    Also returns quick alternative suggestion if available.
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
        final_quantity = new_quantity
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
        final_quantity = request.quantity
    
    # Check for cheaper alternative (quick suggestion)
    medical_info = current_user.get("medical_info", {})
    allergies = [a.get("allergen", "") for a in medical_info.get("allergies", []) if a.get("allergen")]
    current_medications = medical_info.get("current_medications", [])
    
    price_agent = get_price_optimization_agent()
    quick_alt = price_agent.get_quick_alternative(
        medicine_id=request.medicine_id,
        quantity=final_quantity,
        user_allergies=allergies,
        current_medications=current_medications
    )
    
    response_data = {
        "medicine_id": request.medicine_id,
        "medicine_name": medicine["name"],
        "quantity": final_quantity,
        "unit_price": medicine.get("unit_price", 0),
        "subtotal": medicine.get("unit_price", 0) * final_quantity
    }
    
    # Add alternative suggestion if available
    if quick_alt and quick_alt.get("has_alternative"):
        response_data["cheaper_alternative"] = {
            "available": True,
            "medicine_id": quick_alt["alternative"]["id"],
            "medicine_name": quick_alt["alternative"]["name"],
            "unit_price": quick_alt["alternative"]["unit_price"],
            "savings_per_unit": quick_alt["savings_per_unit"],
            "total_savings": quick_alt["savings_per_unit"] * final_quantity,
            "savings_percentage": quick_alt["alternative"]["savings_percentage"],
            "match_type": quick_alt["alternative"]["match_type"],
            "message": quick_alt["message"]
        }
    else:
        response_data["cheaper_alternative"] = {
            "available": False,
            "message": "This is the best price available"
        }
    
    return {
        "success": True,
        "message": f"Added {medicine['name']} to cart",
        "data": response_data
    }


# ==================== UPDATE CART ITEM ====================

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
        "data": {
            "medicine_id": medicine_id,
            "quantity": request.quantity,
            "subtotal": medicine.get("unit_price", 0) * request.quantity
        }
    }


# ==================== SWAP MEDICINE ====================

@router.post("/cart/swap")
async def swap_cart_medicine(
    request: SwapMedicineRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    🔄 Swap a medicine in cart with a cheaper alternative.
    
    Replaces the original medicine with the selected alternative,
    keeping the same quantity. Tracks the swap for undo functionality.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    # Validate alternative exists and has stock
    try:
        alternative = await db["medicines"].find_one({
            "_id": ObjectId(request.alternative_medicine_id),
            "is_active": True
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid alternative medicine ID")
    
    if not alternative:
        raise HTTPException(status_code=404, detail="Alternative medicine not found")
    
    # Get cart
    cart = await db["carts"].find_one({"user_id": user_id})
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    # Find original item in cart
    original_item = None
    original_index = None
    
    for i, item in enumerate(cart.get("items", [])):
        if item.get("medicine_id") == request.original_medicine_id:
            original_item = item
            original_index = i
            break
    
    if original_item is None:
        raise HTTPException(status_code=404, detail="Original medicine not found in cart")
    
    quantity = original_item.get("quantity", 1)
    
    # Check stock
    if alternative.get("stock_quantity", 0) < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Alternative has insufficient stock. Available: {alternative.get('stock_quantity', 0)}"
        )
    
    # Get original medicine for savings calculation
    try:
        original = await db["medicines"].find_one({"_id": ObjectId(request.original_medicine_id)})
    except:
        original = None
    
    savings = 0
    if original:
        savings = (original.get("unit_price", 0) - alternative.get("unit_price", 0)) * quantity
    
    # Verify safety of alternative
    medical_info = current_user.get("medical_info", {})
    allergies = [a.get("allergen", "") for a in medical_info.get("allergies", []) if a.get("allergen")]
    current_medications = medical_info.get("current_medications", [])
    
    price_agent = get_price_optimization_agent()
    if not price_agent._is_safe_alternative(alternative, allergies, current_medications):
        raise HTTPException(
            status_code=400,
            detail="This alternative may not be safe due to your allergies or current medications"
        )
    
    # Update cart - replace the medicine
    await db["carts"].update_one(
        {"user_id": user_id},
        {
            "$set": {
                f"items.{original_index}.medicine_id": request.alternative_medicine_id,
                f"items.{original_index}.swapped_from": request.original_medicine_id,
                f"items.{original_index}.swapped_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Swapped to {alternative['name']} - Saved ₹{savings:.2f}!",
        "data": {
            "original_medicine": {
                "id": request.original_medicine_id,
                "name": original["name"] if original else "Unknown",
                "price": original.get("unit_price", 0) if original else 0
            },
            "new_medicine": {
                "id": request.alternative_medicine_id,
                "name": alternative["name"],
                "price": alternative.get("unit_price", 0),
                "generic_name": alternative.get("generic_name", ""),
                "brand": alternative.get("brand", "")
            },
            "quantity": quantity,
            "savings": round(savings, 2),
            "new_subtotal": round(alternative.get("unit_price", 0) * quantity, 2)
        }
    }


# ==================== UNDO SWAP ====================

@router.post("/cart/undo-swap/{medicine_id}")
async def undo_swap(
    medicine_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    ↩️ Undo a medicine swap - restore original medicine.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    cart = await db["carts"].find_one({"user_id": user_id})
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    # Find the swapped item
    for i, item in enumerate(cart.get("items", [])):
        if item.get("medicine_id") == medicine_id and item.get("swapped_from"):
            original_id = item["swapped_from"]
            
            # Verify original still exists
            try:
                original = await db["medicines"].find_one({
                    "_id": ObjectId(original_id),
                    "is_active": True
                })
            except:
                raise HTTPException(status_code=400, detail="Original medicine no longer available")
            
            if not original:
                raise HTTPException(status_code=404, detail="Original medicine not found")
            
            # Check stock
            if original.get("stock_quantity", 0) < item.get("quantity", 1):
                raise HTTPException(
                    status_code=400,
                    detail=f"Original medicine has insufficient stock. Available: {original.get('stock_quantity', 0)}"
                )
            
            # Restore original
            await db["carts"].update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        f"items.{i}.medicine_id": original_id,
                        "updated_at": datetime.utcnow()
                    },
                    "$unset": {
                        f"items.{i}.swapped_from": "",
                        f"items.{i}.swapped_at": ""
                    }
                }
            )
            
            return {
                "success": True,
                "message": f"Restored {original['name']}",
                "data": {
                    "restored_medicine_id": original_id,
                    "restored_medicine_name": original["name"],
                    "unit_price": original.get("unit_price", 0)
                }
            }
    
    raise HTTPException(status_code=404, detail="No swap found for this medicine")


# ==================== APPLY ALL ALTERNATIVES ====================

@router.post("/cart/apply-all-alternatives")
async def apply_all_alternatives(
    generic_only: bool = Query(False, description="Only apply generic equivalents"),
    current_user: dict = Depends(get_current_active_user)
):
    """
    🚀 Apply all best alternatives to cart at once.
    
    Automatically swaps all items with their best cheaper alternatives.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    # Get cart
    cart = await db["carts"].find_one({"user_id": user_id})
    
    if not cart or not cart.get("items"):
        return {
            "success": True,
            "message": "Cart is empty",
            "data": {"swaps_applied": 0, "total_savings": 0}
        }
    
    # Get optimization
    medical_info = current_user.get("medical_info", {})
    allergies = [a.get("allergen", "") for a in medical_info.get("allergies", []) if a.get("allergen")]
    current_medications = medical_info.get("current_medications", [])
    
    agent = get_price_optimization_agent()
    
    optimization = agent.optimize_cart(
        cart_items=cart.get("items", []),
        user_allergies=allergies,
        current_medications=current_medications,
        include_generic_only=generic_only
    )
    
    # Re-fetch cart to get fresh indices
    cart = await db["carts"].find_one({"user_id": user_id})
    
    # Apply all best alternatives
    swaps_applied = 0
    total_savings = 0
    swap_details = []
    
    for item_result in optimization.get("items", []):
        if item_result.get("best_alternative"):
            best_alt = item_result["best_alternative"]
            original_id = item_result["medicine_id"]
            
            # Skip if already swapped
            # Find item in cart
            for i, cart_item in enumerate(cart.get("items", [])):
                if cart_item.get("medicine_id") == original_id:
                    # Update cart item
                    await db["carts"].update_one(
                        {"user_id": user_id, f"items.{i}.medicine_id": original_id},
                        {
                            "$set": {
                                f"items.{i}.medicine_id": best_alt["id"],
                                f"items.{i}.swapped_from": original_id,
                                f"items.{i}.swapped_at": datetime.utcnow()
                            }
                        }
                    )
                    
                    swaps_applied += 1
                    total_savings += item_result["potential_savings"]
                    swap_details.append({
                        "from_id": original_id,
                        "from_name": item_result["medicine_name"],
                        "to_id": best_alt["id"],
                        "to_name": best_alt["name"],
                        "savings": round(item_result["potential_savings"], 2)
                    })
                    break
    
    # Update timestamp
    if swaps_applied > 0:
        await db["carts"].update_one(
            {"user_id": user_id},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
    
    return {
        "success": True,
        "message": f"Applied {swaps_applied} alternative(s), saved ₹{total_savings:.2f}",
        "data": {
            "swaps_applied": swaps_applied,
            "total_savings": round(total_savings, 2),
            "details": swap_details
        }
    }


# ==================== UNDO ALL SWAPS ====================

@router.post("/cart/undo-all-swaps")
async def undo_all_swaps(
    current_user: dict = Depends(get_current_active_user)
):
    """
    ↩️ Undo all medicine swaps - restore all original medicines.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    cart = await db["carts"].find_one({"user_id": user_id})
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    restored_count = 0
    restored_items = []
    errors = []
    
    for i, item in enumerate(cart.get("items", [])):
        if item.get("swapped_from"):
            original_id = item["swapped_from"]
            
            try:
                original = await db["medicines"].find_one({
                    "_id": ObjectId(original_id),
                    "is_active": True
                })
                
                if original and original.get("stock_quantity", 0) >= item.get("quantity", 1):
                    await db["carts"].update_one(
                        {"user_id": user_id},
                        {
                            "$set": {
                                f"items.{i}.medicine_id": original_id,
                            },
                            "$unset": {
                                f"items.{i}.swapped_from": "",
                                f"items.{i}.swapped_at": ""
                            }
                        }
                    )
                    restored_count += 1
                    restored_items.append({
                        "medicine_id": original_id,
                        "name": original["name"]
                    })
                else:
                    errors.append({
                        "medicine_id": original_id,
                        "reason": "Out of stock or not available"
                    })
            except Exception as e:
                errors.append({
                    "medicine_id": original_id,
                    "reason": str(e)
                })
    
    if restored_count > 0:
        await db["carts"].update_one(
            {"user_id": user_id},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
    
    return {
        "success": True,
        "message": f"Restored {restored_count} item(s)",
        "data": {
            "restored_count": restored_count,
            "restored_items": restored_items,
            "errors": errors
        }
    }


# ==================== REMOVE FROM CART ====================

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


# ==================== CLEAR CART ====================

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


# ==================== CART SUMMARY ====================

@router.get("/cart/summary")
async def get_cart_summary(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get quick cart summary with savings info.
    Lightweight endpoint for navbar cart icon.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    cart = await db["carts"].find_one({"user_id": user_id})
    
    if not cart or not cart.get("items"):
        return {
            "success": True,
            "data": {
                "item_count": 0,
                "total_amount": 0,
                "has_swapped_items": False,
                "swapped_count": 0
            }
        }
    
    total_amount = 0
    item_count = 0
    swapped_count = 0
    
    for item in cart.get("items", []):
        try:
            medicine = await db["medicines"].find_one({"_id": ObjectId(item["medicine_id"])})
            if medicine:
                total_amount += item["quantity"] * medicine.get("unit_price", 0)
                item_count += item["quantity"]
                if item.get("swapped_from"):
                    swapped_count += 1
        except:
            continue
    
    return {
        "success": True,
        "data": {
            "item_count": item_count,
            "unique_items": len(cart.get("items", [])),
            "total_amount": round(total_amount, 2),
            "has_swapped_items": swapped_count > 0,
            "swapped_count": swapped_count
        }
    }


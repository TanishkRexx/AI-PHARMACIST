"""
Customer Price Optimization Routes - Smart price suggestions for cart
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from bson import ObjectId

from app.database.mongodb import get_database
from app.auth.dependencies import get_current_active_user
from app.agents.price_optimization_agent import get_price_optimization_agent

router = APIRouter()


class OptimizeCartRequest(BaseModel):
    """Request model for cart optimization"""
    budget_limit: Optional[float] = Field(None, description="Maximum budget for the cart")
    include_generic_only: bool = Field(False, description="Only show generic equivalents")
    max_alternatives: int = Field(3, ge=1, le=10, description="Max alternatives per item")


class SwapMedicineRequest(BaseModel):
    """Request to swap a medicine with an alternative"""
    original_medicine_id: str
    alternative_medicine_id: str


class BulkSwapRequest(BaseModel):
    """Request to swap multiple medicines"""
    replacements: Dict[str, str]  # original_id -> alternative_id


class CompareMedicinesRequest(BaseModel):
    """Request to compare two medicines"""
    medicine_id_1: str
    medicine_id_2: str


# ==================== MAIN OPTIMIZATION ENDPOINTS ====================

@router.get("/cart/optimize")
async def optimize_cart(
    budget_limit: Optional[float] = Query(None, description="Maximum budget"),
    generic_only: bool = Query(False, description="Show only generic alternatives"),
    max_alternatives: int = Query(3, ge=1, le=10, description="Max alternatives per item"),
    current_user: dict = Depends(get_current_active_user)
):
    """
    🎯 Get AI-powered price optimization for current cart.
    
    Analyzes cart items and suggests cheaper alternatives:
    - Generic equivalents (same active ingredient)
    - Same category alternatives
    - AI-matched similar medicines
    
    All suggestions are safety-checked against user's allergies and medications.
    
    Returns:
    - Potential savings per item and total
    - Multiple alternatives per item with confidence scores
    - Smart recommendations
    - Budget analysis (if budget_limit provided)
    """
    db = get_database()
    user_id = current_user["_id"]
    
    # Get cart
    cart = await db["carts"].find_one({"user_id": user_id})
    
    if not cart or not cart.get("items"):
        return {
            "success": True,
            "message": "Cart is empty",
            "data": {
                "cart_analysis": {
                    "total_items": 0,
                    "current_total": 0,
                    "optimized_total": 0,
                    "total_potential_savings": 0
                },
                "items": [],
                "recommendations": []
            }
        }
    
    # Get user's medical info for safety checks
    medical_info = current_user.get("medical_info", {})
    allergies = [a.get("allergen", "") for a in medical_info.get("allergies", []) if a.get("allergen")]
    current_medications = medical_info.get("current_medications", [])
    
    # Run optimization
    agent = get_price_optimization_agent()
    
    result = agent.optimize_cart(
        cart_items=cart.get("items", []),
        user_allergies=allergies,
        current_medications=current_medications,
        budget_limit=budget_limit,
        max_alternatives_per_item=max_alternatives,
        include_generic_only=generic_only
    )
    
    return {
        "success": True,
        "data": result
    }


@router.post("/cart/optimize")
async def optimize_cart_with_options(
    request: OptimizeCartRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    🎯 Get AI-powered price optimization with custom options.
    
    Same as GET but allows more control via request body.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    cart = await db["carts"].find_one({"user_id": user_id})
    
    if not cart or not cart.get("items"):
        return {
            "success": True,
            "message": "Cart is empty",
            "data": {
                "cart_analysis": {"total_items": 0, "current_total": 0},
                "items": [],
                "recommendations": []
            }
        }
    
    medical_info = current_user.get("medical_info", {})
    allergies = [a.get("allergen", "") for a in medical_info.get("allergies", []) if a.get("allergen")]
    current_medications = medical_info.get("current_medications", [])
    
    agent = get_price_optimization_agent()
    
    result = agent.optimize_cart(
        cart_items=cart.get("items", []),
        user_allergies=allergies,
        current_medications=current_medications,
        budget_limit=request.budget_limit,
        max_alternatives_per_item=request.max_alternatives,
        include_generic_only=request.include_generic_only
    )
    
    return {"success": True, "data": result}


# ==================== SINGLE ITEM OPTIMIZATION ====================

@router.get("/medicines/{medicine_id}/alternatives")
async def get_medicine_alternatives(
    medicine_id: str,
    quantity: int = Query(1, ge=1, le=100),
    max_alternatives: int = Query(5, ge=1, le=10),
    current_user: dict = Depends(get_current_active_user)
):
    """
    💊 Get cheaper alternatives for a specific medicine.
    
    Useful when:
    - User is viewing a medicine detail page
    - User is about to add item to cart
    - User wants to compare options
    """
    db = get_database()
    
    # Validate medicine exists
    try:
        medicine = await db["medicines"].find_one({
            "_id": ObjectId(medicine_id),
            "is_active": True
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid medicine ID")
    
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    # Get user's medical info
    medical_info = current_user.get("medical_info", {})
    allergies = [a.get("allergen", "") for a in medical_info.get("allergies", []) if a.get("allergen")]
    current_medications = medical_info.get("current_medications", [])
    
    agent = get_price_optimization_agent()
    
    # Use the internal method to find alternatives
    alternatives = agent._find_cheaper_alternatives(
        medicine=medicine,
        quantity=quantity,
        user_allergies=allergies,
        current_medications=current_medications,
        max_alternatives=max_alternatives
    )
    
    current_price = medicine.get("unit_price", 0)
    
    return {
        "success": True,
        "data": {
            "medicine": {
                "id": medicine_id,
                "name": medicine["name"],
                "generic_name": medicine.get("generic_name", ""),
                "brand": medicine.get("brand", ""),
                "unit_price": current_price,
                "quantity": quantity,
                "total_price": current_price * quantity
            },
            "alternatives_count": len(alternatives),
            "has_generic_alternative": any(a["match_type"] == "generic_equivalent" for a in alternatives),
            "alternatives": alternatives,
            "best_savings": alternatives[0]["savings_per_unit"] * quantity if alternatives else 0
        }
    }


@router.get("/medicines/{medicine_id}/quick-alternative")
async def get_quick_alternative(
    medicine_id: str,
    quantity: int = Query(1, ge=1),
    current_user: dict = Depends(get_current_active_user)
):
    """
    ⚡ Quick check for cheaper alternative (single best option).
    
    Fast endpoint for showing "Cheaper option available!" badges in UI.
    """
    medical_info = current_user.get("medical_info", {})
    allergies = [a.get("allergen", "") for a in medical_info.get("allergies", []) if a.get("allergen")]
    current_medications = medical_info.get("current_medications", [])
    
    agent = get_price_optimization_agent()
    
    result = agent.get_quick_alternative(
        medicine_id=medicine_id,
        quantity=quantity,
        user_allergies=allergies,
        current_medications=current_medications
    )
    
    if result is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    return {"success": True, "data": result}


# ==================== SWAP/APPLY ALTERNATIVES ====================

@router.post("/cart/swap")
async def swap_cart_medicine(
    request: SwapMedicineRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    🔄 Swap a medicine in cart with an alternative.
    
    Replaces the original medicine with the selected alternative,
    keeping the same quantity.
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
    
    # Update cart - replace the medicine
    await db["carts"].update_one(
        {"user_id": user_id},
        {
            "$set": {
                f"items.{original_index}.medicine_id": request.alternative_medicine_id,
                f"items.{original_index}.swapped_from": request.original_medicine_id,
                "updated_at": __import__("datetime").datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Swapped to {alternative['name']}",
        "data": {
            "original_medicine": {
                "id": request.original_medicine_id,
                "name": original["name"] if original else "Unknown",
                "price": original.get("unit_price", 0) if original else 0
            },
            "new_medicine": {
                "id": request.alternative_medicine_id,
                "name": alternative["name"],
                "price": alternative.get("unit_price", 0)
            },
            "quantity": quantity,
            "savings": round(savings, 2)
        }
    }


@router.post("/cart/apply-all-alternatives")
async def apply_all_alternatives(
    generic_only: bool = Query(False, description="Only apply generic equivalents"),
    current_user: dict = Depends(get_current_active_user)
):
    """
    🚀 Apply all best alternatives to cart at once.
    
    Automatically swaps all items with their best cheaper alternatives.
    Use with caution - this modifies the entire cart.
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
    
    # Apply all best alternatives
    swaps_applied = 0
    total_savings = 0
    swap_details = []
    
    for item_result in optimization.get("items", []):
        if item_result.get("best_alternative"):
            best_alt = item_result["best_alternative"]
            original_id = item_result["medicine_id"]
            
            # Find item in cart
            for i, cart_item in enumerate(cart.get("items", [])):
                if cart_item.get("medicine_id") == original_id:
                    # Update cart item
                    await db["carts"].update_one(
                        {"user_id": user_id},
                        {
                            "$set": {
                                f"items.{i}.medicine_id": best_alt["id"],
                                f"items.{i}.swapped_from": original_id,
                            }
                        }
                    )
                    
                    swaps_applied += 1
                    total_savings += item_result["potential_savings"]
                    swap_details.append({
                        "from": item_result["medicine_name"],
                        "to": best_alt["name"],
                        "savings": item_result["potential_savings"]
                    })
                    break
    
    # Update timestamp
    await db["carts"].update_one(
        {"user_id": user_id},
        {"$set": {"updated_at": __import__("datetime").datetime.utcnow()}}
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
                    detail="Original medicine is out of stock"
                )
            
            # Restore original
            await db["carts"].update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        f"items.{i}.medicine_id": original_id,
                        "updated_at": __import__("datetime").datetime.utcnow()
                    },
                    "$unset": {f"items.{i}.swapped_from": ""}
                }
            )
            
            return {
                "success": True,
                "message": f"Restored {original['name']}",
                "data": {
                    "restored_medicine_id": original_id,
                    "restored_medicine_name": original["name"]
                }
            }
    
    raise HTTPException(status_code=404, detail="No swap found for this medicine")


# ==================== COMPARISON ====================

@router.post("/medicines/compare")
async def compare_medicines(
    request: CompareMedicinesRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    ⚖️ Compare two medicines side by side.
    
    Returns detailed comparison including:
    - Price difference
    - Equivalence level (bioequivalent, same category, etc.)
    - Recommendation
    """
    agent = get_price_optimization_agent()
    
    result = agent.compare_medicines(
        medicine_id_1=request.medicine_id_1,
        medicine_id_2=request.medicine_id_2
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Comparison failed"))
    
    return {"success": True, "data": result}


@router.get("/medicines/{medicine_id}/compare/{other_medicine_id}")
async def compare_medicines_get(
    medicine_id: str,
    other_medicine_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    ⚖️ Compare two medicines (GET version).
    """
    agent = get_price_optimization_agent()
    
    result = agent.compare_medicines(
        medicine_id_1=medicine_id,
        medicine_id_2=other_medicine_id
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Comparison failed"))
    
    return {"success": True, "data": result}


# ==================== SAVINGS SUMMARY ====================

@router.get("/cart/savings-summary")
async def get_savings_summary(
    current_user: dict = Depends(get_current_active_user)
):
    """
    📊 Get a quick summary of potential savings on cart.
    
    Lightweight endpoint for showing savings badges in UI.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    cart = await db["carts"].find_one({"user_id": user_id})
    
    if not cart or not cart.get("items"):
        return {
            "success": True,
            "data": {
                "has_savings": False,
                "potential_savings": 0,
                "items_with_alternatives": 0,
                "message": "Cart is empty"
            }
        }
    
    medical_info = current_user.get("medical_info", {})
    allergies = [a.get("allergen", "") for a in medical_info.get("allergies", []) if a.get("allergen")]
    current_medications = medical_info.get("current_medications", [])
    
    agent = get_price_optimization_agent()
    
    optimization = agent.optimize_cart(
        cart_items=cart.get("items", []),
        user_allergies=allergies,
        current_medications=current_medications,
        max_alternatives_per_item=1  # Just need to check if alternatives exist
    )
    
    cart_analysis = optimization.get("cart_analysis", {})
    total_savings = cart_analysis.get("total_potential_savings", 0)
    items_with_alts = cart_analysis.get("items_with_alternatives", 0)
    
    message = ""
    if total_savings > 100:
        message = f"🎉 Save ₹{total_savings:.0f} with alternatives!"
    elif total_savings > 50:
        message = f"💡 ₹{total_savings:.0f} savings available"
    elif total_savings > 0:
        message = f"Small savings available"
    else:
        message = "Best prices already!"
    
    return {
        "success": True,
        "data": {
            "has_savings": total_savings > 0,
            "potential_savings": round(total_savings, 2),
            "savings_percentage": cart_analysis.get("savings_percentage", 0),
            "items_with_alternatives": items_with_alts,
            "items_with_generics": cart_analysis.get("items_with_generic_alternatives", 0),
            "message": message
        }
    }
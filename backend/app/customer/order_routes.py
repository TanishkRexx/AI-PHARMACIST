"""
Customer Order Routes - Order Placement & Tracking
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from app.database.mongodb import get_database
from app.auth.dependencies import get_current_active_user
from app.utils.helpers import generate_order_number
from app.agents.safety_agent import SafetyAgent

router = APIRouter()

safety_agent = SafetyAgent()


class PlaceOrderRequest(BaseModel):
    delivery_address: str
    delivery_notes: Optional[str] = None
    prescription_image: Optional[str] = None  # Base64


@router.post("/orders")
async def place_order(
    request: PlaceOrderRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Place order from cart.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    # Get cart
    cart = await db["carts"].find_one({"user_id": user_id})
    
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Build order items and validate
    order_items = []
    subtotal = 0
    requires_prescription = False
    prescription_medicines = []
    
    for cart_item in cart["items"]:
        medicine = await db["medicines"].find_one({
            "_id": ObjectId(cart_item["medicine_id"])
        })
        
        if not medicine:
            raise HTTPException(
                status_code=400, 
                detail=f"Medicine not found: {cart_item['medicine_id']}"
            )
        
        if medicine.get("stock_quantity", 0) < cart_item["quantity"]:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {medicine['name']}"
            )
        
        if medicine.get("prescription_required"):
            requires_prescription = True
            prescription_medicines.append(medicine["name"])
        
        item_subtotal = cart_item["quantity"] * medicine.get("unit_price", 0)
        subtotal += item_subtotal
        
        order_items.append({
            "medicine_id": cart_item["medicine_id"],
            "medicine_name": medicine["name"],
            "quantity": cart_item["quantity"],
            "unit_price": medicine.get("unit_price", 0),
            "subtotal": item_subtotal,
            "dosage": medicine.get("dosage", ""),
            "prescription_required": medicine.get("prescription_required", False)
        })
    
    # Handle prescription verification
    prescription_verified = False
    if requires_prescription:
        if request.prescription_image:
            # AI verification
            verification = await safety_agent.verify_prescription_ai(
                request.prescription_image,
                prescription_medicines
            )
            prescription_verified = verification.get("verified", False)
            
            if not prescription_verified:
                raise HTTPException(
                    status_code=400,
                    detail="Prescription verification failed. Please upload a valid prescription."
                )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Prescription required for: {', '.join(prescription_medicines)}"
            )
    
    # Calculate totals
    tax_amount = round(subtotal * 0.05, 2)  # 5% tax
    delivery_charge = 0 if subtotal >= 500 else 40  # Free delivery above 500
    total_amount = subtotal + tax_amount + delivery_charge
    
    # Create order
    order = {
        "order_number": generate_order_number(),
        "customer_id": user_id,
        "customer_name": current_user["name"],
        "customer_phone": current_user["phone"],
        "customer_email": current_user["email"],
        "items": order_items,
        "subtotal": round(subtotal, 2),
        "tax_amount": tax_amount,
        "delivery_charge": delivery_charge,
        "discount_amount": 0,
        "total_amount": round(total_amount, 2),
        "status": "pending",
        "payment_status": "pending",
        "delivery_address": request.delivery_address,
        "delivery_notes": request.delivery_notes,
        "requires_prescription": requires_prescription,
        "prescription_verified": prescription_verified,
        "prescription_image": request.prescription_image,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db["orders"].insert_one(order)
    
    # Update stock
    for item in order_items:
        await db["medicines"].update_one(
            {"_id": ObjectId(item["medicine_id"])},
            {"$inc": {"stock_quantity": -item["quantity"]}}
        )
    
    # Clear cart
    await db["carts"].update_one(
        {"user_id": user_id},
        {"$set": {"items": [], "updated_at": datetime.utcnow()}}
    )
    
    return {
        "success": True,
        "message": "Order placed successfully",
        "data": {
            "order_id": str(result.inserted_id),
            "order_number": order["order_number"],
            "total_amount": order["total_amount"],
            "status": order["status"],
            "items_count": len(order_items)
        }
    }


@router.post("/orders/mock-payment/{order_id}")
async def mock_payment(
    order_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Mock payment endpoint for demo.
    In production, integrate with real payment gateway.
    """
    db = get_database()
    
    try:
        order = await db["orders"].find_one({
            "_id": ObjectId(order_id),
            "customer_id": current_user["_id"]
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["payment_status"] == "paid":
        raise HTTPException(status_code=400, detail="Order already paid")
    
    # Update payment status
    await db["orders"].update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "payment_status": "paid",
                "status": "confirmed",
                "confirmed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Payment successful",
        "data": {
            "order_number": order["order_number"],
            "amount_paid": order["total_amount"],
            "status": "confirmed"
        }
    }


@router.get("/orders")
async def get_orders(
    page: int = 1,
    limit: int = 10,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get customer's order history.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    skip = (page - 1) * limit
    
    total = await db["orders"].count_documents({"customer_id": user_id})
    
    cursor = db["orders"].find(
        {"customer_id": user_id}
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    orders = await cursor.to_list(limit)
    
    result = []
    for order in orders:
        result.append({
            "id": str(order["_id"]),
            "order_number": order["order_number"],
            "items_count": len(order.get("items", [])),
            "total_amount": order.get("total_amount", 0),
            "status": order.get("status", "pending"),
            "payment_status": order.get("payment_status", "pending"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        })
    
    return {
        "success": True,
        "data": {
            "orders": result,
            "pagination": {
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit
            }
        }
    }


@router.get("/orders/{order_id}")
async def get_order_details(
    order_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get order details.
    """
    db = get_database()
    
    try:
        order = await db["orders"].find_one({
            "_id": ObjectId(order_id),
            "customer_id": current_user["_id"]
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "success": True,
        "data": {
            "id": str(order["_id"]),
            "order_number": order["order_number"],
            "items": order.get("items", []),
            "subtotal": order.get("subtotal", 0),
            "tax_amount": order.get("tax_amount", 0),
            "delivery_charge": order.get("delivery_charge", 0),
            "total_amount": order.get("total_amount", 0),
            "status": order.get("status", "pending"),
            "payment_status": order.get("payment_status", "pending"),
            "delivery_address": order.get("delivery_address", ""),
            "delivery_notes": order.get("delivery_notes", ""),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None,
            "confirmed_at": order.get("confirmed_at").isoformat() if order.get("confirmed_at") else None,
            "dispatched_at": order.get("dispatched_at").isoformat() if order.get("dispatched_at") else None,
            "delivered_at": order.get("delivered_at").isoformat() if order.get("delivered_at") else None
        }
    }


@router.get("/orders/{order_id}/track")
async def track_order(
    order_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Track order status with timeline.
    """
    db = get_database()
    
    try:
        order = await db["orders"].find_one({
            "_id": ObjectId(order_id),
            "customer_id": current_user["_id"]
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Build timeline
    timeline = [
        {
            "status": "pending",
            "label": "Order Placed",
            "completed": True,
            "timestamp": order.get("created_at").isoformat() if order.get("created_at") else None
        },
        {
            "status": "confirmed",
            "label": "Order Confirmed",
            "completed": order.get("status") in ["confirmed", "processing", "dispatched", "delivered"],
            "timestamp": order.get("confirmed_at").isoformat() if order.get("confirmed_at") else None
        },
        {
            "status": "processing",
            "label": "Processing",
            "completed": order.get("status") in ["processing", "dispatched", "delivered"],
            "timestamp": None
        },
        {
            "status": "dispatched",
            "label": "Dispatched",
            "completed": order.get("status") in ["dispatched", "delivered"],
            "timestamp": order.get("dispatched_at").isoformat() if order.get("dispatched_at") else None
        },
        {
            "status": "delivered",
            "label": "Delivered",
            "completed": order.get("status") == "delivered",
            "timestamp": order.get("delivered_at").isoformat() if order.get("delivered_at") else None
        }
    ]
    
    return {
        "success": True,
        "data": {
            "order_number": order["order_number"],
            "current_status": order.get("status", "pending"),
            "timeline": timeline
        }
    }


@router.get("/refill-suggestions")
async def get_refill_suggestions(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get AI-powered refill suggestions based on order history.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    # Get past orders
    cursor = db["orders"].find({
        "customer_id": user_id,
        "status": {"$in": ["delivered", "confirmed"]}
    }).sort("created_at", -1).limit(10)
    
    orders = await cursor.to_list(10)
    
    if not orders:
        return {
            "success": True,
            "data": {
                "suggestions": [],
                "message": "No order history found"
            }
        }
    
    # Analyze medicines
    medicine_freq = {}
    
    for order in orders:
        for item in order.get("items", []):
            med_id = item.get("medicine_id")
            if med_id in medicine_freq:
                medicine_freq[med_id]["count"] += 1
                medicine_freq[med_id]["last_ordered"] = order.get("created_at")
            else:
                medicine_freq[med_id] = {
                    "medicine_id": med_id,
                    "medicine_name": item.get("medicine_name"),
                    "count": 1,
                    "last_ordered": order.get("created_at"),
                    "last_quantity": item.get("quantity")
                }
    
    # Sort by frequency
    suggestions = sorted(
        medicine_freq.values(),
        key=lambda x: x["count"],
        reverse=True
    )[:5]
    
    # Format suggestions
    result = []
    for sug in suggestions:
        result.append({
            "medicine_id": sug["medicine_id"],
            "medicine_name": sug["medicine_name"],
            "times_ordered": sug["count"],
            "last_ordered": sug["last_ordered"].strftime("%Y-%m-%d") if sug["last_ordered"] else None,
            "suggested_quantity": sug["last_quantity"]
        })
    
    return {
        "success": True,
        "data": {"suggestions": result}
    }
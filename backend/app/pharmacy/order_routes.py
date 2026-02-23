"""
Pharmacy Customer Orders Management Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from bson import ObjectId

from app.database.mongodb import get_database
from app.auth.dependencies import require_role
from app.auth.models import UserRole
from app.models.order import OrderStatus

router = APIRouter()


class UpdateOrderStatusRequest(BaseModel):
    status: str
    notes: Optional[str] = None


@router.get("/orders")
async def get_customer_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get all customer orders.
    """
    db = get_database()
    
    filter_query = {}
    if status:
        filter_query["status"] = status
    
    skip = (page - 1) * limit
    total = await db["orders"].count_documents(filter_query)
    
    cursor = db["orders"].find(filter_query).sort("created_at", -1).skip(skip).limit(limit)
    orders = await cursor.to_list(limit)
    
    result = []
    for order in orders:
        result.append({
            "id": str(order["_id"]),
            "order_number": order["order_number"],
            "customer_name": order.get("customer_name", "Unknown"),
            "customer_phone": order.get("customer_phone", ""),
            "items_count": len(order.get("items", [])),
            "total_amount": order.get("total_amount", 0),
            "status": order.get("status", "pending"),
            "payment_status": order.get("payment_status", "pending"),
            "requires_prescription": order.get("requires_prescription", False),
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


@router.get("/orders/stats")
async def get_order_stats(
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get order statistics.
    """
    db = get_database()
    
    # Status counts
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db["orders"].aggregate(pipeline).to_list(10)
    
    status_dict = {item["_id"]: item["count"] for item in status_counts}
    
    return {
        "success": True,
        "data": {
            "pending": status_dict.get("pending", 0),
            "confirmed": status_dict.get("confirmed", 0),
            "processing": status_dict.get("processing", 0),
            "dispatched": status_dict.get("dispatched", 0),
            "delivered": status_dict.get("delivered", 0),
            "cancelled": status_dict.get("cancelled", 0)
        }
    }


@router.get("/orders/{order_id}")
async def get_order_details(
    order_id: str,
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get order details.
    """
    db = get_database()
    
    try:
        order = await db["orders"].find_one({"_id": ObjectId(order_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order["_id"] = str(order["_id"])
    order["id"] = order["_id"]
    
    # Format dates
    if order.get("created_at"):
        order["created_at"] = order["created_at"].isoformat()
    if order.get("confirmed_at"):
        order["confirmed_at"] = order["confirmed_at"].isoformat()
    if order.get("dispatched_at"):
        order["dispatched_at"] = order["dispatched_at"].isoformat()
    if order.get("delivered_at"):
        order["delivered_at"] = order["delivered_at"].isoformat()
    
    return {"success": True, "data": order}


@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    request: UpdateOrderStatusRequest,
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Update order status.
    """
    db = get_database()
    
    valid_statuses = ["pending", "confirmed", "processing", "dispatched", "delivered", "cancelled"]
    
    if request.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid_statuses}")
    
    try:
        order = await db["orders"].find_one({"_id": ObjectId(order_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        "status": request.status,
        "updated_at": datetime.utcnow()
    }
    
    # Set timestamps based on status
    if request.status == "confirmed":
        update_data["confirmed_at"] = datetime.utcnow()
    elif request.status == "dispatched":
        update_data["dispatched_at"] = datetime.utcnow()
    elif request.status == "delivered":
        update_data["delivered_at"] = datetime.utcnow()
    
    if request.notes:
        update_data["status_notes"] = request.notes
    
    await db["orders"].update_one(
        {"_id": ObjectId(order_id)},
        {"$set": update_data}
    )
    
    # If cancelled, restore stock
    if request.status == "cancelled" and order.get("status") != "cancelled":
        for item in order.get("items", []):
            await db["medicines"].update_one(
                {"_id": ObjectId(item["medicine_id"])},
                {"$inc": {"stock_quantity": item["quantity"]}}
            )
    
    return {
        "success": True,
        "message": f"Order status updated to {request.status}",
        "data": {
            "order_number": order["order_number"],
            "new_status": request.status
        }
    }
"""
Distributor Routes - Light Implementation
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId

from app.database.mongodb import get_database
from app.auth.dependencies import require_role
from app.auth.models import UserRole
from app.utils.helpers import generate_tracking_number

router = APIRouter()


class ShipOrderRequest(BaseModel):
    notes: Optional[str] = None


class UpdateStatusRequest(BaseModel):
    status: str
    notes: Optional[str] = None


@router.get("/dashboard")
async def get_distributor_dashboard(
    current_user: dict = Depends(require_role([UserRole.DISTRIBUTOR]))
):
    """
    Get distributor dashboard.
    """
    db = get_database()
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Order counts
    total_orders = await db["procurement_orders"].count_documents({})
    pending_orders = await db["procurement_orders"].count_documents({"status": "pending"})
    shipped_orders = await db["procurement_orders"].count_documents({"status": "shipped"})
    delivered_orders = await db["procurement_orders"].count_documents({"status": "delivered"})
    
    # Today's orders
    orders_today = await db["procurement_orders"].count_documents({
        "created_at": {"$gte": today}
    })
    
    # Total revenue
    pipeline = [
        {"$match": {"status": {"$in": ["shipped", "delivered"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db["procurement_orders"].aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Recent orders
    recent = await db["procurement_orders"].find({}).sort("created_at", -1).limit(5).to_list(5)
    
    recent_orders = []
    for order in recent:
        recent_orders.append({
            "id": str(order["_id"]),
            "po_number": order["po_number"],
            "items_count": len(order.get("items", [])),
            "total_amount": order.get("total_amount", 0),
            "status": order.get("status", "pending"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        })
    
    return {
        "success": True,
        "data": {
            "orders": {
                "total": total_orders,
                "today": orders_today,
                "pending": pending_orders,
                "shipped": shipped_orders,
                "delivered": delivered_orders
            },
            "revenue": round(total_revenue, 2),
            "recent_orders": recent_orders
        }
    }


@router.get("/orders")
async def get_pharmacy_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.DISTRIBUTOR]))
):
    """
    Get orders from pharmacies.
    """
    db = get_database()
    
    filter_query = {}
    if status:
        filter_query["status"] = status
    
    skip = (page - 1) * limit
    total = await db["procurement_orders"].count_documents(filter_query)
    
    cursor = db["procurement_orders"].find(filter_query).sort("created_at", -1).skip(skip).limit(limit)
    orders = await cursor.to_list(limit)
    
    result = []
    for order in orders:
        result.append({
            "id": str(order["_id"]),
            "po_number": order["po_number"],
            "items_count": len(order.get("items", [])),
            "total_amount": order.get("total_amount", 0),
            "status": order.get("status", "pending"),
            "tracking_number": order.get("tracking_number"),
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
    current_user: dict = Depends(require_role([UserRole.DISTRIBUTOR]))
):
    """
    Get order details.
    """
    db = get_database()
    
    try:
        order = await db["procurement_orders"].find_one({"_id": ObjectId(order_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order["_id"] = str(order["_id"])
    order["id"] = order["_id"]
    
    if order.get("created_at"):
        order["created_at"] = order["created_at"].isoformat()
    if order.get("shipped_at"):
        order["shipped_at"] = order["shipped_at"].isoformat()
    if order.get("delivered_at"):
        order["delivered_at"] = order["delivered_at"].isoformat()
    
    return {"success": True, "data": order}


@router.post("/orders/{order_id}/ship")
async def ship_order(
    order_id: str,
    request: ShipOrderRequest,
    current_user: dict = Depends(require_role([UserRole.DISTRIBUTOR]))
):
    """
    Mark order as shipped.
    """
    db = get_database()
    
    try:
        order = await db["procurement_orders"].find_one({"_id": ObjectId(order_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("status") == "shipped":
        raise HTTPException(status_code=400, detail="Order already shipped")
    
    if order.get("status") == "delivered":
        raise HTTPException(status_code=400, detail="Order already delivered")
    
    tracking_number = generate_tracking_number()
    
    await db["procurement_orders"].update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "status": "shipped",
                "tracking_number": tracking_number,
                "shipped_at": datetime.utcnow(),
                "shipping_notes": request.notes,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Order shipped",
        "data": {
            "po_number": order["po_number"],
            "tracking_number": tracking_number
        }
    }


@router.post("/orders/{order_id}/deliver")
async def mark_delivered(
    order_id: str,
    current_user: dict = Depends(require_role([UserRole.DISTRIBUTOR]))
):
    """
    Mark order as delivered.
    """
    db = get_database()
    
    try:
        order = await db["procurement_orders"].find_one({"_id": ObjectId(order_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("status") == "delivered":
        raise HTTPException(status_code=400, detail="Order already delivered")
    
    await db["procurement_orders"].update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "status": "delivered",
                "delivered_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Order marked as delivered",
        "data": {"po_number": order["po_number"]}
    }


@router.get("/analytics")
async def get_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_role([UserRole.DISTRIBUTOR]))
):
    """
    Get basic distributor analytics.
    """
    db = get_database()
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Orders in period
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_value": {"$sum": "$total_amount"}
        }}
    ]
    
    status_data = await db["procurement_orders"].aggregate(pipeline).to_list(10)
    
    status_breakdown = {}
    total_value = 0
    total_count = 0
    
    for item in status_data:
        status_breakdown[item["_id"]] = {
            "count": item["count"],
            "value": round(item["total_value"], 2)
        }
        total_value += item["total_value"]
        total_count += item["count"]
    
    return {
        "success": True,
        "data": {
            "period_days": days,
            "total_orders": total_count,
            "total_value": round(total_value, 2),
            "status_breakdown": status_breakdown
        }
    }
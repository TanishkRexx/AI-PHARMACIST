"""
Admin Routes - System Management
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId

from app.database.mongodb import get_database
from app.auth.dependencies import require_role
from app.auth.models import UserRole

router = APIRouter()


# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_admin_dashboard(
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get admin dashboard with system-wide stats.
    """
    db = get_database()
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    
    # User counts by role
    customers = await db["users"].count_documents({"role": "customer"})
    pharmacies = await db["users"].count_documents({"role": "pharmacy"})
    distributors = await db["users"].count_documents({"role": "distributor"})
    total_users = customers + pharmacies + distributors
    
    # Order stats
    total_orders = await db["orders"].count_documents({})
    orders_today = await db["orders"].count_documents({"created_at": {"$gte": today}})
    pending_orders = await db["orders"].count_documents({"status": "pending"})
    
    # Revenue
    revenue_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db["orders"].aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Inventory stats
    total_medicines = await db["medicines"].count_documents({"is_active": True})
    low_stock = await db["medicines"].count_documents({
        "is_active": True,
        "$expr": {"$lte": ["$stock_quantity", "$reorder_level"]}
    })
    out_of_stock = await db["medicines"].count_documents({
        "is_active": True,
        "stock_quantity": 0
    })
    
    # Procurement stats
    total_procurement = await db["procurement_orders"].count_documents({})
    pending_procurement = await db["procurement_orders"].count_documents({"status": "pending"})
    
    # Recent activity
    recent_orders = await db["orders"].find({}).sort("created_at", -1).limit(5).to_list(5)
    recent_users = await db["users"].find({}).sort("created_at", -1).limit(5).to_list(5)
    
    recent_orders_list = []
    for order in recent_orders:
        recent_orders_list.append({
            "id": str(order["_id"]),
            "order_number": order["order_number"],
            "customer_name": order.get("customer_name", "Unknown"),
            "total_amount": order.get("total_amount", 0),
            "status": order.get("status", "pending"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        })
    
    recent_users_list = []
    for user in recent_users:
        recent_users_list.append({
            "id": str(user["_id"]),
            "name": user.get("name", "Unknown"),
            "email": user.get("email", ""),
            "role": user.get("role", ""),
            "created_at": user.get("created_at").isoformat() if user.get("created_at") else None
        })
    
    return {
        "success": True,
        "data": {
            "users": {
                "total": total_users,
                "customers": customers,
                "pharmacies": pharmacies,
                "distributors": distributors
            },
            "orders": {
                "total": total_orders,
                "today": orders_today,
                "pending": pending_orders
            },
            "revenue": {
                "total": round(total_revenue, 2)
            },
            "inventory": {
                "total_medicines": total_medicines,
                "low_stock": low_stock,
                "out_of_stock": out_of_stock
            },
            "procurement": {
                "total": total_procurement,
                "pending": pending_procurement
            },
            "recent_orders": recent_orders_list,
            "recent_users": recent_users_list
        }
    }


# ==================== USER MANAGEMENT ====================

@router.get("/users")
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get all users with filters.
    """
    db = get_database()
    
    filter_query = {}
    
    if role:
        filter_query["role"] = role
    
    if search:
        filter_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    if is_active is not None:
        filter_query["is_active"] = is_active
    
    skip = (page - 1) * limit
    total = await db["users"].count_documents(filter_query)
    
    cursor = db["users"].find(filter_query).sort("created_at", -1).skip(skip).limit(limit)
    users = await cursor.to_list(limit)
    
    result = []
    for user in users:
        result.append({
            "id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "phone": user.get("phone", ""),
            "role": user.get("role", ""),
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at").isoformat() if user.get("created_at") else None
        })
    
    return {
        "success": True,
        "data": {
            "users": result,
            "pagination": {
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit
            }
        }
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get user details.
    """
    db = get_database()
    
    try:
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid user ID format")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's orders if customer
    orders_count = 0
    if user.get("role") == "customer":
        orders_count = await db["orders"].count_documents({"customer_id": user_id})
    
    return {
        "success": True,
        "data": {
            "id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "phone": user.get("phone", ""),
            "role": user.get("role", ""),
            "address": user.get("address", ""),
            "medical_info": user.get("medical_info", {}),
            "is_active": user.get("is_active", True),
            "orders_count": orders_count,
            "created_at": user.get("created_at").isoformat() if user.get("created_at") else None,
            "updated_at": user.get("updated_at").isoformat() if user.get("updated_at") else None
        }
    }


class UpdateUserStatus(BaseModel):
    is_active: bool


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    request: UpdateUserStatus,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Activate or deactivate a user.
    """
    db = get_database()
    
    try:
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow deactivating admin
    if user.get("role") == "admin" and not request.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate admin user")
    
    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "is_active": request.is_active,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    status = "activated" if request.is_active else "deactivated"
    return {
        "success": True,
        "message": f"User {status} successfully"
    }


# ==================== ALL ORDERS VIEW ====================

@router.get("/orders")
async def get_all_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get all orders across the system.
    """
    db = get_database()
    
    filter_query = {}
    
    if status:
        filter_query["status"] = status
    
    if payment_status:
        filter_query["payment_status"] = payment_status
    
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


# ==================== ALL INVENTORY VIEW ====================

@router.get("/inventory")
async def get_all_inventory(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[str] = None,
    stock_status: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get all inventory.
    """
    db = get_database()
    
    filter_query = {"is_active": True}
    
    if category:
        filter_query["category"] = category
    
    if stock_status == "low":
        filter_query["$expr"] = {"$and": [
            {"$gt": ["$stock_quantity", 0]},
            {"$lte": ["$stock_quantity", "$reorder_level"]}
        ]}
    elif stock_status == "out":
        filter_query["stock_quantity"] = 0
    
    skip = (page - 1) * limit
    total = await db["medicines"].count_documents(filter_query)
    
    cursor = db["medicines"].find(filter_query).sort("name", 1).skip(skip).limit(limit)
    medicines = await cursor.to_list(limit)
    
    result = []
    for med in medicines:
        stock = med.get("stock_quantity", 0)
        reorder = med.get("reorder_level", 50)
        
        if stock == 0:
            stock_label = "out_of_stock"
        elif stock <= reorder:
            stock_label = "low_stock"
        else:
            stock_label = "in_stock"
        
        result.append({
            "id": str(med["_id"]),
            "name": med["name"],
            "generic_name": med.get("generic_name", ""),
            "category": med.get("category", ""),
            "unit_price": med.get("unit_price", 0),
            "stock_quantity": stock,
            "reorder_level": reorder,
            "stock_status": stock_label,
            "prescription_required": med.get("prescription_required", False)
        })
    
    return {
        "success": True,
        "data": {
            "medicines": result,
            "pagination": {
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit
            }
        }
    }


# ==================== PROCUREMENT ORDERS VIEW ====================

@router.get("/procurement")
async def get_all_procurement(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get all procurement orders.
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


# ==================== SYSTEM ANALYTICS ====================

@router.get("/analytics/overview")
async def get_system_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get system-wide analytics.
    """
    db = get_database()
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Orders analytics
    orders_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "orders": {"$sum": 1},
            "revenue": {"$sum": "$total_amount"}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    daily_data = await db["orders"].aggregate(orders_pipeline).to_list(days)
    
    # Top categories
    category_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$unwind": "$items"},
        {"$lookup": {
            "from": "medicines",
            "let": {"med_id": {"$toObjectId": "$items.medicine_id"}},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$_id", "$$med_id"]}}}
            ],
            "as": "medicine"
        }},
        {"$unwind": {"path": "$medicine", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": "$medicine.category",
            "quantity": {"$sum": "$items.quantity"},
            "revenue": {"$sum": "$items.subtotal"}
        }},
        {"$sort": {"revenue": -1}},
        {"$limit": 5}
    ]
    
    top_categories = await db["orders"].aggregate(category_pipeline).to_list(5)
    
    # User growth
    user_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {
                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "role": "$role"
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.date": 1}}
    ]
    
    user_growth = await db["users"].aggregate(user_pipeline).to_list(days * 4)
    
    return {
        "success": True,
        "data": {
            "period_days": days,
            "daily_orders": [
                {"date": d["_id"], "orders": d["orders"], "revenue": round(d["revenue"], 2)}
                for d in daily_data
            ],
            "top_categories": [
                {"category": c["_id"] or "other", "quantity": c["quantity"], "revenue": round(c["revenue"], 2)}
                for c in top_categories
            ],
            "user_growth": user_growth
        }
    }
"""
Pharmacy Dashboard Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from bson import ObjectId

from app.database.mongodb import get_database
from app.auth.dependencies import get_current_active_user, require_role
from app.auth.models import UserRole

router = APIRouter()


@router.get("/dashboard")
async def get_pharmacy_dashboard(
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get pharmacy dashboard with key metrics.
    """
    db = get_database()
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    
    # Orders stats
    total_orders = await db["orders"].count_documents({})
    orders_today = await db["orders"].count_documents({"created_at": {"$gte": today}})
    pending_orders = await db["orders"].count_documents({"status": "pending"})
    confirmed_orders = await db["orders"].count_documents({"status": "confirmed"})
    
    # Revenue
    revenue_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db["orders"].aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Inventory stats
    total_medicines = await db["medicines"].count_documents({"is_active": True})
    low_stock_count = await db["medicines"].count_documents({
        "is_active": True,
        "$expr": {"$lte": ["$stock_quantity", "$reorder_level"]}
    })
    out_of_stock = await db["medicines"].count_documents({
        "is_active": True,
        "stock_quantity": 0
    })
    
    # Recent orders
    recent_orders = await db["orders"].find({}).sort(
        "created_at", -1
    ).limit(5).to_list(5)
    
    recent_list = []
    for order in recent_orders:
        recent_list.append({
            "id": str(order["_id"]),
            "order_number": order["order_number"],
            "customer_name": order.get("customer_name", "Unknown"),
            "total_amount": order.get("total_amount", 0),
            "status": order.get("status", "pending"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        })
    
    # Low stock items
    low_stock_items = await db["medicines"].find({
        "is_active": True,
        "$expr": {"$lte": ["$stock_quantity", "$reorder_level"]},
        "stock_quantity": {"$gt": 0}
    }).limit(5).to_list(5)
    
    low_stock_list = []
    for item in low_stock_items:
        low_stock_list.append({
            "id": str(item["_id"]),
            "name": item["name"],
            "stock": item.get("stock_quantity", 0),
            "reorder_level": item.get("reorder_level", 50)
        })
    
    return {
        "success": True,
        "data": {
            "orders": {
                "total": total_orders,
                "today": orders_today,
                "pending": pending_orders,
                "confirmed": confirmed_orders
            },
            "revenue": {
                "total": round(total_revenue, 2)
            },
            "inventory": {
                "total_medicines": total_medicines,
                "low_stock": low_stock_count,
                "out_of_stock": out_of_stock
            },
            "recent_orders": recent_list,
            "low_stock_items": low_stock_list
        }
    }

@router.get("/notifications")
async def get_notifications(
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get all notifications for pharmacy dashboard.
    Combines stock alerts, new orders, and procurement updates.
    """
    db = get_database()
    
    notifications = []
    
    # 1. Out of Stock Items
    out_of_stock = await db["medicines"].find({
        "is_active": True,
        "stock_quantity": 0
    }).limit(10).to_list(10)
    
    for med in out_of_stock:
        notifications.append({
            "id": f"oos-{str(med['_id'])}",
            "type": "out_of_stock",
            "priority": "critical",
            "title": med["name"],
            "message": f"Out of stock! Reorder level: {med.get('reorder_level', 50)}",
            "medicine_id": str(med["_id"]),
            "created_at": datetime.utcnow().isoformat()
        })
    
    # 2. Low Stock Items
    low_stock = await db["medicines"].find({
        "is_active": True,
        "stock_quantity": {"$gt": 0},
        "$expr": {"$lte": ["$stock_quantity", "$reorder_level"]}
    }).limit(10).to_list(10)
    
    for med in low_stock:
        notifications.append({
            "id": f"low-{str(med['_id'])}",
            "type": "low_stock",
            "priority": "warning",
            "title": med["name"],
            "message": f"Only {med.get('stock_quantity', 0)} left (Reorder at {med.get('reorder_level', 50)})",
            "medicine_id": str(med["_id"]),
            "created_at": datetime.utcnow().isoformat()
        })
    
    # 3. New/Pending Orders (last 24 hours)
    yesterday = datetime.utcnow() - timedelta(hours=24)
    new_orders = await db["orders"].find({
        "status": "pending",
        "created_at": {"$gte": yesterday}
    }).sort("created_at", -1).limit(10).to_list(10)
    
    for order in new_orders:
        notifications.append({
            "id": f"order-{str(order['_id'])}",
            "type": "new_order",
            "priority": "info",
            "title": f"Order {order['order_number']}",
            "message": f"{order.get('customer_name', 'Customer')} - {len(order.get('items', []))} items - ₹{order.get('total_amount', 0)}",
            "order_id": str(order["_id"]),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else datetime.utcnow().isoformat()
        })
    
    # 4. Procurement Updates (shipped/approved)
    procurement = await db["procurement_orders"].find({
        "status": {"$in": ["shipped", "approved"]}
    }).sort("updated_at", -1).limit(5).to_list(5)
    
    for po in procurement:
        notifications.append({
            "id": f"po-{str(po['_id'])}",
            "type": "procurement",
            "priority": "success" if po["status"] == "shipped" else "info",
            "title": po["po_number"],
            "message": f"Order {'is on the way' if po['status'] == 'shipped' else 'approved by distributor'}",
            "procurement_id": str(po["_id"]),
            "tracking_number": po.get("tracking_number"),
            "created_at": po.get("updated_at", po.get("created_at")).isoformat() if po.get("updated_at") or po.get("created_at") else datetime.utcnow().isoformat()
        })
    
    # Sort by priority and time
    priority_order = {"critical": 0, "warning": 1, "success": 2, "info": 3}
    notifications.sort(key=lambda x: (priority_order.get(x["priority"], 4), x.get("created_at", "")), reverse=False)
    
    return {
        "success": True,
        "data": {
            "notifications": notifications,
            "counts": {
                "total": len(notifications),
                "critical": len([n for n in notifications if n["priority"] == "critical"]),
                "warning": len([n for n in notifications if n["priority"] == "warning"]),
                "info": len([n for n in notifications if n["priority"] in ["info", "success"]])
            }
        }
    }
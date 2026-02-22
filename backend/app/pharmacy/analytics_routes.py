"""
Pharmacy Analytics Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
from bson import ObjectId

from app.database.mongodb import get_database
from app.auth.dependencies import require_role
from app.auth.models import UserRole

router = APIRouter()


@router.get("/analytics/sales")
async def get_sales_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get sales analytics.
    """
    db = get_database()
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Total sales
    pipeline = [
        {"$match": {
            "created_at": {"$gte": start_date},
            "payment_status": "paid"
        }},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$total_amount"},
            "total_orders": {"$sum": 1},
            "avg_order_value": {"$avg": "$total_amount"}
        }}
    ]
    
    result = await db["orders"].aggregate(pipeline).to_list(1)
    
    if result:
        stats = result[0]
    else:
        stats = {"total_revenue": 0, "total_orders": 0, "avg_order_value": 0}
    
    # Daily sales for chart
    daily_pipeline = [
        {"$match": {
            "created_at": {"$gte": start_date},
            "payment_status": "paid"
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "revenue": {"$sum": "$total_amount"},
            "orders": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    daily_data = await db["orders"].aggregate(daily_pipeline).to_list(days)
    
    return {
        "success": True,
        "data": {
            "period_days": days,
            "summary": {
                "total_revenue": round(stats.get("total_revenue", 0), 2),
                "total_orders": stats.get("total_orders", 0),
                "average_order_value": round(stats.get("avg_order_value", 0), 2)
            },
            "daily_data": [
                {"date": d["_id"], "revenue": round(d["revenue"], 2), "orders": d["orders"]}
                for d in daily_data
            ]
        }
    }


@router.get("/analytics/top-products")
async def get_top_products(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get top selling products.
    """
    db = get_database()
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    pipeline = [
        {"$match": {
            "created_at": {"$gte": start_date},
            "status": {"$in": ["confirmed", "dispatched", "delivered"]}
        }},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.medicine_id",
            "medicine_name": {"$first": "$items.medicine_name"},
            "total_quantity": {"$sum": "$items.quantity"},
            "total_revenue": {"$sum": "$items.subtotal"}
        }},
        {"$sort": {"total_quantity": -1}},
        {"$limit": limit}
    ]
    
    top_products = await db["orders"].aggregate(pipeline).to_list(limit)
    
    result = []
    for i, product in enumerate(top_products, 1):
        result.append({
            "rank": i,
            "medicine_id": product["_id"],
            "medicine_name": product["medicine_name"],
            "total_quantity": product["total_quantity"],
            "total_revenue": round(product["total_revenue"], 2)
        })
    
    return {
        "success": True,
        "data": {
            "period_days": days,
            "top_products": result
        }
    }


@router.get("/analytics/demand-forecast")
async def get_demand_forecast(
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    AI-powered demand forecast.
    """
    db = get_database()
    
    # Get sales data for last 30 days
    start_date = datetime.utcnow() - timedelta(days=30)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.medicine_id",
            "medicine_name": {"$first": "$items.medicine_name"},
            "total_sold": {"$sum": "$items.quantity"},
            "order_count": {"$sum": 1}
        }},
        {"$sort": {"total_sold": -1}},
        {"$limit": 20}
    ]
    
    sales_data = await db["orders"].aggregate(pipeline).to_list(20)
    
    forecasts = []
    for item in sales_data:
        daily_avg = item["total_sold"] / 30
        
        # Simple forecast: predict next 30 days
        predicted_demand = round(daily_avg * 30 * 1.1)  # 10% growth assumption
        
        # Check current stock
        medicine = await db["medicines"].find_one({"_id": ObjectId(item["_id"])})
        current_stock = medicine.get("stock_quantity", 0) if medicine else 0
        
        # Will stock last?
        days_of_stock = round(current_stock / daily_avg) if daily_avg > 0 else 999
        
        recommendation = ""
        if days_of_stock <= 7:
            recommendation = "Order immediately"
        elif days_of_stock <= 14:
            recommendation = "Order soon"
        elif days_of_stock <= 30:
            recommendation = "Monitor stock"
        else:
            recommendation = "Stock adequate"
        
        forecasts.append({
            "medicine_id": item["_id"],
            "medicine_name": item["medicine_name"],
            "last_30_days_sold": item["total_sold"],
            "daily_average": round(daily_avg, 1),
            "predicted_next_30_days": predicted_demand,
            "current_stock": current_stock,
            "days_of_stock_remaining": days_of_stock,
            "recommendation": recommendation
        })
    
    return {
        "success": True,
        "data": {
            "forecast_period": "30 days",
            "forecasts": forecasts
        }
    }


@router.get("/analytics/inventory-health")
async def get_inventory_health(
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get inventory health score and analysis.
    """
    db = get_database()
    
    # Get counts
    total = await db["medicines"].count_documents({"is_active": True})
    out_of_stock = await db["medicines"].count_documents({"is_active": True, "stock_quantity": 0})
    low_stock = await db["medicines"].count_documents({
        "is_active": True,
        "stock_quantity": {"$gt": 0},
        "$expr": {"$lte": ["$stock_quantity", "$reorder_level"]}
    })
    healthy = total - out_of_stock - low_stock
    
    # Calculate score
    if total > 0:
        health_score = round((healthy / total) * 100, 1)
    else:
        health_score = 100
    
    # Stock value
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {
            "_id": None,
            "total_value": {"$sum": {"$multiply": ["$stock_quantity", "$unit_price"]}}
        }}
    ]
    
    value_result = await db["medicines"].aggregate(pipeline).to_list(1)
    total_stock_value = value_result[0]["total_value"] if value_result else 0
    
    # Get status
    if health_score >= 80:
        status = "excellent"
    elif health_score >= 60:
        status = "good"
    elif health_score >= 40:
        status = "fair"
    else:
        status = "poor"
    
    return {
        "success": True,
        "data": {
            "health_score": health_score,
            "status": status,
            "breakdown": {
                "total_products": total,
                "healthy_stock": healthy,
                "low_stock": low_stock,
                "out_of_stock": out_of_stock
            },
            "stock_value": round(total_stock_value, 2)
        }
    }
# app/customer/notification_routes.py
"""
Customer Notification Routes - Refill Reminders & Health Alerts
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId

from app.database.mongodb import get_database
from app.auth.dependencies import get_current_active_user
from app.agents.recommendation_agent import get_recommendation_agent
from app.agents.health_profile_agent import get_health_profile_agent

router = APIRouter()


class MarkNotificationRequest(BaseModel):
    notification_ids: List[str]


class DismissNotificationRequest(BaseModel):
    notification_id: str


# ==================== GET ALL NOTIFICATIONS ====================

@router.get("/notifications")
async def get_notifications(
    include_read: bool = Query(False, description="Include already read notifications"),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_active_user)
):
    """
    🔔 Get all notifications for the customer.
    
    Aggregates:
    - Refill reminders (medicines due for reorder)
    - Overdue medications (missed refills)
    - Low stock alerts (medicines running low)
    - Health insights (from AI analysis)
    
    Returns notifications sorted by priority (high → low).
    """
    db = get_database()
    user_id = current_user["_id"]
    
    notifications = []
    
    try:
        # ==================== 1. REFILL REMINDERS ====================
        recommendation_agent = get_recommendation_agent()
        refill_data = recommendation_agent.get_refill_reminders(user_id=user_id)
        
        for reminder in refill_data.get("reminders", []):
            days_until = reminder.get("days_until_refill", 0)
            
            # Determine priority based on urgency
            if days_until <= 0:
                priority = "high"
                title = "⚠️ Refill Overdue"
                icon = "🚨"
            elif days_until <= 3:
                priority = "high"
                title = "🔴 Urgent Refill Needed"
                icon = "⏰"
            elif days_until <= 7:
                priority = "medium"
                title = "🟡 Refill Soon"
                icon = "📅"
            else:
                priority = "low"
                title = "💊 Refill Reminder"
                icon = "💊"
            
            notifications.append({
                "id": f"refill-{reminder.get('medicine_id')}",
                "type": "refill",
                "priority": priority,
                "title": title,
                "message": f"Time to refill {reminder.get('medicine_name', 'your medicine')}",
                "icon": icon,
                "medicine": {
                    "medicine_id": reminder.get("medicine_id"),
                    "medicine_name": reminder.get("medicine_name"),
                    "days_until_refill": days_until,
                    "suggested_quantity": reminder.get("suggested_quantity", 1),
                    "last_ordered": reminder.get("last_ordered"),
                    "confidence_score": reminder.get("confidence_score", 0.8)
                },
                "action_type": "reorder",
                "action_label": "Reorder Now",
                "timestamp": datetime.utcnow().isoformat(),
                "read": False,
                "dismissible": True
            })
        
        # ==================== 2. MEDICATION ADHERENCE ALERTS ====================
        try:
            health_agent = get_health_profile_agent()
            adherence_data = health_agent.get_medication_adherence(str(user_id))
            
            for med in adherence_data.get("medications", []):
                if med.get("is_overdue"):
                    days_overdue = med.get("days_since_last_refill", 0) - med.get("avg_refill_interval_days", 30)
                    
                    notifications.append({
                        "id": f"overdue-{med.get('medicine_id')}",
                        "type": "overdue",
                        "priority": "high",
                        "title": "⚠️ Medication Overdue",
                        "message": f"{med.get('medicine', 'Medicine')} refill is overdue by {days_overdue} days",
                        "icon": "⚠️",
                        "medicine": {
                            "medicine_id": med.get("medicine_id"),
                            "medicine_name": med.get("medicine"),
                            "days_overdue": days_overdue,
                            "last_refill_days_ago": med.get("days_since_last_refill"),
                            "avg_interval": med.get("avg_refill_interval_days")
                        },
                        "action_type": "reorder",
                        "action_label": "Reorder Now",
                        "timestamp": datetime.utcnow().isoformat(),
                        "read": False,
                        "dismissible": True
                    })
        except Exception as e:
            print(f"Adherence check error: {e}")
        
        # ==================== 3. HEALTH INSIGHTS (Optional) ====================
        try:
            health_profile = health_agent.get_health_profile(str(user_id))
            
            for insight in health_profile.get("health_insights", [])[:3]:  # Limit to top 3
                if insight.get("priority") == "high":
                    notifications.append({
                        "id": f"insight-{hash(insight.get('title', ''))}",
                        "type": "health_insight",
                        "priority": insight.get("priority", "low"),
                        "title": insight.get("title", "Health Insight"),
                        "message": insight.get("message", ""),
                        "icon": insight.get("icon", "💡"),
                        "category": insight.get("category", "general"),
                        "action_type": "view",
                        "action_label": "View Details",
                        "timestamp": datetime.utcnow().isoformat(),
                        "read": False,
                        "dismissible": True
                    })
        except Exception as e:
            print(f"Health insights error: {e}")
        
        # ==================== 4. CHECK FOR LOW STOCK ON FREQUENT PURCHASES ====================
        # Get frequently purchased medicines that are low stock
        try:
            pipeline = [
                {"$match": {"customer_id": user_id, "status": "delivered"}},
                {"$unwind": "$items"},
                {"$group": {
                    "_id": "$items.medicine_id",
                    "medicine_name": {"$first": "$items.medicine_name"},
                    "purchase_count": {"$sum": 1}
                }},
                {"$match": {"purchase_count": {"$gte": 2}}},
                {"$sort": {"purchase_count": -1}},
                {"$limit": 10}
            ]
            
            frequent_meds = await db["orders"].aggregate(pipeline).to_list(10)
            
            for freq_med in frequent_meds:
                try:
                    medicine = await db["medicines"].find_one({
                        "_id": ObjectId(freq_med["_id"])
                    })
                    
                    if medicine and medicine.get("stock_quantity", 0) < 10:
                        notifications.append({
                            "id": f"low-stock-{freq_med['_id']}",
                            "type": "low_stock",
                            "priority": "medium",
                            "title": "📦 Low Stock Alert",
                            "message": f"{freq_med['medicine_name']} is running low in stock. Order soon!",
                            "icon": "📦",
                            "medicine": {
                                "medicine_id": freq_med["_id"],
                                "medicine_name": freq_med["medicine_name"],
                                "current_stock": medicine.get("stock_quantity", 0)
                            },
                            "action_type": "reorder",
                            "action_label": "Order Now",
                            "timestamp": datetime.utcnow().isoformat(),
                            "read": False,
                            "dismissible": True
                        })
                except:
                    continue
        except Exception as e:
            print(f"Low stock check error: {e}")
        
        # ==================== SORT BY PRIORITY ====================
        priority_order = {"high": 0, "medium": 1, "low": 2}
        notifications.sort(key=lambda x: (
            priority_order.get(x.get("priority"), 2),
            x.get("timestamp", "")
        ))
        
        # ==================== FILTER READ NOTIFICATIONS ====================
        # Get user's read notifications from database
        user_notifications = await db["user_notifications"].find_one({"user_id": user_id})
        read_ids = set(user_notifications.get("read_ids", [])) if user_notifications else set()
        dismissed_ids = set(user_notifications.get("dismissed_ids", [])) if user_notifications else set()
        
        # Filter out dismissed and optionally read
        filtered_notifications = []
        for notif in notifications:
            if notif["id"] in dismissed_ids:
                continue
            if notif["id"] in read_ids:
                notif["read"] = True
                if not include_read:
                    continue
            filtered_notifications.append(notif)
        
        # Limit results
        filtered_notifications = filtered_notifications[:limit]
        
        # Calculate counts
        unread_count = sum(1 for n in filtered_notifications if not n.get("read", False))
        high_priority_count = sum(1 for n in filtered_notifications if n.get("priority") == "high" and not n.get("read", False))
        
        return {
            "success": True,
            "data": {
                "notifications": filtered_notifications,
                "total_count": len(filtered_notifications),
                "unread_count": unread_count,
                "high_priority_count": high_priority_count,
                "has_urgent": high_priority_count > 0
            }
        }
    
    except Exception as e:
        print(f"Notifications error: {e}")
        return {
            "success": True,
            "data": {
                "notifications": [],
                "total_count": 0,
                "unread_count": 0,
                "high_priority_count": 0,
                "has_urgent": False,
                "error": str(e)
            }
        }


# ==================== GET NOTIFICATION COUNT ====================

@router.get("/notifications/count")
async def get_notification_count(
    current_user: dict = Depends(get_current_active_user)
):
    """
    🔢 Get notification count only (lightweight endpoint for badges).
    """
    db = get_database()
    user_id = current_user["_id"]
    
    try:
        # Get full notifications and count
        result = await get_notifications(
            include_read=False,
            limit=50,
            current_user=current_user
        )
        
        data = result.get("data", {})
        
        return {
            "success": True,
            "data": {
                "unread_count": data.get("unread_count", 0),
                "high_priority_count": data.get("high_priority_count", 0),
                "has_urgent": data.get("has_urgent", False)
            }
        }
    
    except Exception as e:
        return {
            "success": True,
            "data": {
                "unread_count": 0,
                "high_priority_count": 0,
                "has_urgent": False
            }
        }


# ==================== MARK NOTIFICATIONS AS READ ====================

@router.post("/notifications/mark-read")
async def mark_notifications_read(
    request: MarkNotificationRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    ✅ Mark notifications as read.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    try:
        # Upsert user notifications document
        await db["user_notifications"].update_one(
            {"user_id": user_id},
            {
                "$addToSet": {"read_ids": {"$each": request.notification_ids}},
                "$set": {"updated_at": datetime.utcnow()}
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": f"Marked {len(request.notification_ids)} notification(s) as read"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MARK ALL AS READ ====================

@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_active_user)
):
    """
    ✅ Mark all notifications as read.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    try:
        # Get all current notification IDs
        result = await get_notifications(
            include_read=True,
            limit=100,
            current_user=current_user
        )
        
        all_ids = [n["id"] for n in result.get("data", {}).get("notifications", [])]
        
        await db["user_notifications"].update_one(
            {"user_id": user_id},
            {
                "$addToSet": {"read_ids": {"$each": all_ids}},
                "$set": {"updated_at": datetime.utcnow()}
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": f"Marked {len(all_ids)} notification(s) as read"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DISMISS NOTIFICATION ====================

@router.post("/notifications/dismiss")
async def dismiss_notification(
    request: DismissNotificationRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    🗑️ Dismiss a notification (won't show again).
    """
    db = get_database()
    user_id = current_user["_id"]
    
    try:
        await db["user_notifications"].update_one(
            {"user_id": user_id},
            {
                "$addToSet": {"dismissed_ids": request.notification_id},
                "$set": {"updated_at": datetime.utcnow()}
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Notification dismissed"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CLEAR ALL DISMISSED ====================

@router.delete("/notifications/dismissed")
async def clear_dismissed_notifications(
    current_user: dict = Depends(get_current_active_user)
):
    """
    🔄 Reset dismissed notifications (show them again).
    """
    db = get_database()
    user_id = current_user["_id"]
    
    try:
        await db["user_notifications"].update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "dismissed_ids": [],
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Dismissed notifications cleared"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== GET NOTIFICATION PREFERENCES ====================

@router.get("/notifications/preferences")
async def get_notification_preferences(
    current_user: dict = Depends(get_current_active_user)
):
    """
    ⚙️ Get user's notification preferences.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    user_prefs = await db["user_notifications"].find_one({"user_id": user_id})
    
    default_prefs = {
        "refill_reminders": True,
        "overdue_alerts": True,
        "low_stock_alerts": True,
        "health_insights": True,
        "promotional": False,
        "email_notifications": False,
        "push_notifications": True
    }
    
    if user_prefs and user_prefs.get("preferences"):
        default_prefs.update(user_prefs["preferences"])
    
    return {
        "success": True,
        "data": {"preferences": default_prefs}
    }


# ==================== UPDATE NOTIFICATION PREFERENCES ====================

@router.put("/notifications/preferences")
async def update_notification_preferences(
    preferences: dict,
    current_user: dict = Depends(get_current_active_user)
):
    """
    ⚙️ Update notification preferences.
    """
    db = get_database()
    user_id = current_user["_id"]
    
    allowed_keys = {
        "refill_reminders",
        "overdue_alerts", 
        "low_stock_alerts",
        "health_insights",
        "promotional",
        "email_notifications",
        "push_notifications"
    }
    
    # Filter only allowed preferences
    filtered_prefs = {k: v for k, v in preferences.items() if k in allowed_keys}
    
    try:
        await db["user_notifications"].update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "preferences": filtered_prefs,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Preferences updated",
            "data": {"preferences": filtered_prefs}
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
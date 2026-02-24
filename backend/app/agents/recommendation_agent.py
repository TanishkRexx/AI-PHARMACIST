"""
Recommendation Agent - AI-powered personalized medicine recommendations
Uses collaborative filtering and content-based approaches
"""
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import logging
from collections import Counter

from app.database.mongodb import get_sync_collection
from app.observability.tracer import get_langfuse

logger = logging.getLogger(__name__)


class RecommendationAgent:
    """
    AI-powered recommendation engine for pharmacy.
    
    Features:
    - Personalized recommendations based on purchase history
    - Similar medicine suggestions
    - Refill reminders
    - Cross-sell recommendations
    - Health profile-based suggestions
    """
    
    def __init__(self):
        self.langfuse = get_langfuse()
    
    def _log_operation(self, name: str, input_data: Any, output_data: Any, duration_ms: int = 0):
        """Log operation to Langfuse"""
        if self.langfuse:
            try:
                trace = self.langfuse.trace(name=f"recommendation_agent.{name}")
                trace.span(
                    name=name,
                    input=input_data,
                    output=output_data,
                    metadata={"duration_ms": duration_ms, "ai_powered": True}
                )
                self.langfuse.flush()
            except:
                pass
    
    def get_personalized_recommendations(
        self, 
        user_id: str, 
        medical_info: Optional[Dict] = None,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Get personalized medicine recommendations for a user.
        
        Based on:
        - Purchase history
        - Medical conditions
        - Allergies (to avoid)
        - Popular items in their categories
        """
        start_time = datetime.utcnow()
        
        try:
            orders_collection = get_sync_collection("orders")
            medicines_collection = get_sync_collection("medicines")
            
            # Get user's purchase history
            user_orders = list(orders_collection.find({
                "customer_id": user_id,
                "status": {"$in": ["delivered", "confirmed"]}
            }).sort("created_at", -1).limit(20))
            
            # Analyze purchase patterns
            purchased_categories = []
            purchased_medicine_ids = []
            
            for order in user_orders:
                for item in order.get("items", []):
                    purchased_medicine_ids.append(item.get("medicine_id"))
                    
                    # Get medicine category
                    med = medicines_collection.find_one({"_id": item.get("medicine_id")})
                    if med:
                        purchased_categories.append(med.get("category"))
            
            # Count category frequency
            category_counts = Counter(purchased_categories)
            top_categories = [cat for cat, _ in category_counts.most_common(3)]
            
            # Get recommendations
            recommendations = []
            
            # 1. Frequently bought together
            if purchased_medicine_ids:
                similar_meds = list(medicines_collection.find({
                    "category": {"$in": top_categories},
                    "_id": {"$nin": purchased_medicine_ids},
                    "is_active": True,
                    "stock_quantity": {"$gt": 0}
                }).limit(limit))
                
                for med in similar_meds:
                    recommendations.append({
                        "id": str(med["_id"]),
                        "name": med["name"],
                        "category": med.get("category"),
                        "price": med.get("unit_price", 0),
                        "reason": f"Based on your interest in {med.get('category', 'this category')}",
                        "confidence_score": 0.85,
                        "recommendation_type": "category_based"
                    })
            
            # 2. Health profile-based recommendations
            if medical_info:
                conditions = medical_info.get("chronic_conditions", [])
                allergies = [a.get("allergen", "").lower() for a in medical_info.get("allergies", [])]
                
                condition_medicines = {
                    "Diabetes": ["Metformin", "Glucose strips"],
                    "Hypertension": ["Amlodipine", "Losartan"],
                    "Asthma": ["Inhaler", "Respiratory medicines"]
                }
                
                for condition in conditions:
                    if condition in condition_medicines:
                        for med_name in condition_medicines[condition]:
                            med = medicines_collection.find_one({
                                "name": {"$regex": med_name, "$options": "i"},
                                "is_active": True
                            })
                            if med and str(med["_id"]) not in purchased_medicine_ids:
                                recommendations.append({
                                    "id": str(med["_id"]),
                                    "name": med["name"],
                                    "category": med.get("category"),
                                    "price": med.get("unit_price", 0),
                                    "reason": f"Recommended for {condition} management",
                                    "confidence_score": 0.9,
                                    "recommendation_type": "health_profile"
                                })
            
            # 3. Popular items (fallback)
            if len(recommendations) < limit:
                popular = list(medicines_collection.find({
                    "is_active": True,
                    "stock_quantity": {"$gt": 0}
                }).sort("stock_quantity", -1).limit(limit - len(recommendations)))
                
                for med in popular:
                    if str(med["_id"]) not in [r["id"] for r in recommendations]:
                        recommendations.append({
                            "id": str(med["_id"]),
                            "name": med["name"],
                            "category": med.get("category"),
                            "price": med.get("unit_price", 0),
                            "reason": "Popular choice",
                            "confidence_score": 0.7,
                            "recommendation_type": "popular"
                        })
            
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            result = {
                "success": True,
                "user_id": user_id,
                "recommendations": recommendations[:limit],
                "total_recommendations": len(recommendations),
                "analyzed_orders": len(user_orders),
                "top_categories": top_categories,
                "ai_powered": True,
                "processing_time_ms": duration_ms
            }
            
            self._log_operation(
                "personalized_recommendations",
                {"user_id": user_id, "limit": limit},
                {"count": len(recommendations)},
                duration_ms
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Recommendation error: {e}")
            return {
                "success": False,
                "recommendations": [],
                "error": str(e)
            }
    
    def get_refill_reminders(self, user_id: str) -> Dict[str, Any]:
        """
        AI-powered refill reminders based on purchase patterns.
        Predicts when user might need to reorder.
        """
        try:
            orders_collection = get_sync_collection("orders")
            
            # Get purchase history
            user_orders = list(orders_collection.find({
                "customer_id": user_id,
                "status": {"$in": ["delivered", "confirmed"]}
            }).sort("created_at", -1).limit(50))
            
            # Analyze reorder patterns
            medicine_purchases = {}  # medicine_id -> list of purchase dates
            
            for order in user_orders:
                order_date = order.get("created_at")
                for item in order.get("items", []):
                    med_id = item.get("medicine_id")
                    med_name = item.get("medicine_name")
                    
                    if med_id not in medicine_purchases:
                        medicine_purchases[med_id] = {
                            "name": med_name,
                            "purchases": []
                        }
                    
                    medicine_purchases[med_id]["purchases"].append({
                        "date": order_date,
                        "quantity": item.get("quantity", 1)
                    })
            
            # Calculate refill predictions
            reminders = []
            today = datetime.utcnow()
            
            for med_id, data in medicine_purchases.items():
                purchases = data["purchases"]
                
                if len(purchases) >= 2:
                    # Calculate average days between purchases
                    intervals = []
                    for i in range(1, len(purchases)):
                        if purchases[i-1]["date"] and purchases[i]["date"]:
                            delta = (purchases[i-1]["date"] - purchases[i]["date"]).days
                            if delta > 0:
                                intervals.append(delta)
                    
                    if intervals:
                        avg_interval = sum(intervals) / len(intervals)
                        last_purchase = purchases[0]["date"]
                        
                        if last_purchase:
                            days_since_last = (today - last_purchase).days
                            days_until_refill = avg_interval - days_since_last
                            
                            if days_until_refill <= 7:  # Remind if due within 7 days
                                urgency = "urgent" if days_until_refill <= 0 else "soon"
                                
                                reminders.append({
                                    "medicine_id": med_id,
                                    "medicine_name": data["name"],
                                    "last_ordered": last_purchase.strftime("%Y-%m-%d"),
                                    "days_since_last_order": days_since_last,
                                    "predicted_refill_interval": round(avg_interval),
                                    "days_until_refill": max(0, round(days_until_refill)),
                                    "urgency": urgency,
                                    "suggested_quantity": purchases[0]["quantity"],
                                    "confidence_score": min(0.95, 0.6 + (len(intervals) * 0.1))
                                })
            
            # Sort by urgency
            reminders.sort(key=lambda x: x["days_until_refill"])
            
            return {
                "success": True,
                "reminders": reminders,
                "total_tracked_medicines": len(medicine_purchases),
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"Refill reminder error: {e}")
            return {"success": False, "reminders": [], "error": str(e)}
    
    def get_cross_sell_suggestions(
        self, 
        medicine_ids: List[str], 
        limit: int = 3
    ) -> List[Dict]:
        """
        Get cross-sell suggestions based on what's in cart.
        "Customers who bought X also bought Y"
        """
        try:
            orders_collection = get_sync_collection("orders")
            medicines_collection = get_sync_collection("medicines")
            
            # Find orders containing these medicines
            related_medicine_ids = []
            
            for med_id in medicine_ids:
                orders = list(orders_collection.find({
                    "items.medicine_id": med_id,
                    "status": {"$in": ["delivered", "confirmed"]}
                }).limit(50))
                
                for order in orders:
                    for item in order.get("items", []):
                        item_med_id = item.get("medicine_id")
                        if item_med_id and item_med_id not in medicine_ids:
                            related_medicine_ids.append(item_med_id)
            
            # Count frequency
            related_counts = Counter(related_medicine_ids)
            top_related = [med_id for med_id, _ in related_counts.most_common(limit)]
            
            suggestions = []
            for med_id in top_related:
                from bson import ObjectId
                med = medicines_collection.find_one({
                    "_id": ObjectId(med_id),
                    "is_active": True,
                    "stock_quantity": {"$gt": 0}
                })
                
                if med:
                    suggestions.append({
                        "id": str(med["_id"]),
                        "name": med["name"],
                        "price": med.get("unit_price", 0),
                        "reason": "Frequently bought together",
                        "frequency": related_counts[med_id]
                    })
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Cross-sell error: {e}")
            return []


# Singleton instance
_recommendation_agent: Optional[RecommendationAgent] = None


def get_recommendation_agent() -> RecommendationAgent:
    """Get or create recommendation agent instance."""
    global _recommendation_agent
    
    if _recommendation_agent is None:
        _recommendation_agent = RecommendationAgent()
    
    return _recommendation_agent
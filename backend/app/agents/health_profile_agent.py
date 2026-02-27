"""
Health Profile Agent - Personalized health management
Maintains user health profiles and provides smart recommendations
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
import time

from app.database.mongodb import get_sync_collection
from app.observability.tracer import get_langfuse

logger = logging.getLogger(__name__)


class HealthProfileAgent:
    """
    AI-powered health profile management.
    
    Features:
    - Build and maintain user health profiles
    - Track medication history and purchase patterns
    - Provide personalized health tips
    - Medication adherence tracking
    - Smart health alerts
    """
    
    def __init__(self):
        self.langfuse = get_langfuse()
    
    def _log_operation(self, name: str, input_data: Any, output_data: Any, duration_ms: int = 0):
        """Log operation to Langfuse"""
        if self.langfuse:
            try:
                trace = self.langfuse.trace(name=f"health_profile_agent.{name}")
                trace.span(
                    name=name,
                    input=input_data,
                    output=output_data,
                    metadata={"duration_ms": duration_ms, "ai_powered": True}
                )
                self.langfuse.flush()
            except:
                pass
    
    def get_health_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Build comprehensive health profile from user data and purchase history.
        """
        start_time = time.time()
        
        try:
            users_collection = get_sync_collection("users")
            orders_collection = get_sync_collection("orders")
            medicines_collection = get_sync_collection("medicines")
            
            # Get user data
            from bson import ObjectId
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            
            if not user:
                return {"success": False, "error": "User not found"}
            
            medical_info = user.get("medical_info", {})
            allergies = medical_info.get("allergies", [])
            conditions = medical_info.get("chronic_conditions", [])
            
            # Analyze purchase history
            orders = list(orders_collection.find({
                "customer_id": user_id,
                "status": {"$in": ["delivered", "confirmed"]}
            }).sort("created_at", -1).limit(50))
            
            # Build medication history
            medication_history = []
            category_usage = {}
            total_spent = 0
            
            for order in orders:
                for item in order.get("items", []):
                    med_id = item.get("medicine_id")
                    med_name = item.get("medicine_name", "Unknown")
                    
                    # Get medicine details
                    try:
                        med = medicines_collection.find_one({"_id": ObjectId(med_id)})
                    except:
                        med = None
                    
                    category = med.get("category", "other") if med else "other"
                    
                    medication_history.append({
                        "medicine_name": med_name,
                        "category": category,
                        "quantity": item.get("quantity", 1),
                        "date": order.get("created_at"),
                        "prescription_required": med.get("prescription_required", False) if med else False
                    })
                    
                    # Track category usage
                    category_usage[category] = category_usage.get(category, 0) + 1
                    total_spent += item.get("subtotal", 0)
            
            # Generate health insights
            health_insights = self._generate_health_insights(
                medication_history, category_usage, conditions, allergies
            )
            
            # Calculate health score
            health_score = self._calculate_health_score(
                allergies, conditions, medication_history
            )
            
            # Detect patterns
            patterns = self._detect_medication_patterns(medication_history)
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            result = {
                "success": True,
                "user_id": user_id,
                "profile": {
                    "name": user.get("name", ""),
                    "allergies": allergies,
                    "chronic_conditions": conditions,
                    "blood_group": medical_info.get("blood_group", "Unknown"),
                    "age_group": medical_info.get("age_group", "adult")
                },
                "medication_summary": {
                    "total_orders": len(orders),
                    "unique_medicines": len(set(m["medicine_name"] for m in medication_history)),
                    "total_spent": round(total_spent, 2),
                    "top_categories": sorted(
                        category_usage.items(), 
                        key=lambda x: x[1], 
                        reverse=True
                    )[:5],
                    "recent_medications": medication_history[:10]
                },
                "health_score": health_score,
                "health_insights": health_insights,
                "medication_patterns": patterns,
                "ai_powered": True,
                "processing_time_ms": duration_ms
            }
            
            self._log_operation(
                "get_health_profile",
                {"user_id": user_id},
                {"health_score": health_score, "insights_count": len(health_insights)},
                duration_ms
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Health profile error: {e}")
            return {"success": False, "error": str(e)}
    
    def _generate_health_insights(
        self,
        medication_history: List[Dict],
        category_usage: Dict,
        conditions: List[str],
        allergies: List
    ) -> List[Dict]:
        """Generate AI-powered health insights"""
        insights = []
        
        # Insight 1: Frequent painkiller usage
        painkiller_count = category_usage.get("painkiller", 0)
        if painkiller_count >= 5:
            insights.append({
                "type": "warning",
                "icon": "⚠️",
                "title": "Frequent Painkiller Usage",
                "message": f"You've purchased painkillers {painkiller_count} times. "
                          f"Frequent use may cause liver/kidney issues. Consider consulting a doctor.",
                "priority": "high",
                "category": "medication_overuse"
            })
        
        # Insight 2: Antibiotic usage pattern
        antibiotic_count = category_usage.get("antibiotic", 0)
        if antibiotic_count >= 3:
            insights.append({
                "type": "warning",
                "icon": "🦠",
                "title": "Antibiotic Usage Alert",
                "message": f"You've used antibiotics {antibiotic_count} times recently. "
                          f"Overuse may lead to antibiotic resistance. Always complete the full course.",
                "priority": "high",
                "category": "antibiotic_resistance"
            })
        
        # Insight 3: Vitamin/supplement recommendation
        vitamin_count = category_usage.get("vitamin", 0)
        if vitamin_count == 0 and len(medication_history) > 5:
            insights.append({
                "type": "recommendation",
                "icon": "💊",
                "title": "Consider Supplements",
                "message": "Based on your medication history, you might benefit from "
                          "daily vitamins or supplements. Ask your doctor about Vitamin D and B12.",
                "priority": "low",
                "category": "wellness"
            })
        
        # Insight 4: Chronic condition management
        for condition in conditions:
            condition_lower = condition.lower()
            
            if "diabetes" in condition_lower:
                has_diabetes_meds = any(
                    m["category"] == "antidiabetic" for m in medication_history
                )
                if has_diabetes_meds:
                    insights.append({
                        "type": "info",
                        "icon": "🩸",
                        "title": "Diabetes Management",
                        "message": "You're managing diabetes. Remember to monitor blood sugar "
                                  "regularly, maintain a balanced diet, and exercise.",
                        "priority": "medium",
                        "category": "chronic_care"
                    })
            
            if "hypertension" in condition_lower or "blood pressure" in condition_lower:
                insights.append({
                    "type": "info",
                    "icon": "❤️",
                    "title": "Blood Pressure Management",
                    "message": "Monitor your blood pressure daily. Reduce salt intake, "
                              "exercise regularly, and take medications as prescribed.",
                    "priority": "medium",
                    "category": "chronic_care"
                })
        
        # Insight 5: Allergy awareness
        if allergies:
            allergen_names = [a.get("allergen", a) if isinstance(a, dict) else str(a) for a in allergies]
            insights.append({
                "type": "alert",
                "icon": "🚨",
                "title": "Allergy Reminder",
                "message": f"You have known allergies to: {', '.join(allergen_names)}. "
                          f"All your orders are automatically checked against these allergies.",
                "priority": "high",
                "category": "safety"
            })
        
        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        insights.sort(key=lambda x: priority_order.get(x["priority"], 3))
        
        return insights
    
    def _calculate_health_score(
        self,
        allergies: List,
        conditions: List[str],
        medication_history: List[Dict]
    ) -> Dict[str, Any]:
        """Calculate a health awareness score"""
        score = 100
        factors = []
        
        # Deduct for risk factors
        if conditions:
            score -= len(conditions) * 5
            factors.append(f"{len(conditions)} chronic condition(s) managed")
        
        if allergies:
            score -= len(allergies) * 3
            factors.append(f"{len(allergies)} known allergy(ies) tracked")
        
        # Bonus for regular health management
        if len(medication_history) > 0:
            score += 5
            factors.append("Active health management")
        
        # Cap score
        score = max(40, min(100, score))
        
        if score >= 80:
            status = "Excellent"
            color = "green"
        elif score >= 60:
            status = "Good"
            color = "yellow"
        else:
            status = "Needs Attention"
            color = "red"
        
        return {
            "score": score,
            "status": status,
            "color": color,
            "factors": factors
        }
    
    def _detect_medication_patterns(self, medication_history: List[Dict]) -> List[Dict]:
        """Detect patterns in medication usage"""
        patterns = []
        
        if not medication_history:
            return patterns
        
        # Pattern 1: Regular purchases (potential chronic medication)
        from collections import Counter
        med_counts = Counter(m["medicine_name"] for m in medication_history)
        
        for med_name, count in med_counts.most_common(5):
            if count >= 3:
                patterns.append({
                    "pattern": "regular_purchase",
                    "medicine": med_name,
                    "frequency": count,
                    "message": f"You regularly purchase {med_name} ({count} times). "
                              f"Consider setting up auto-refill reminders."
                })
        
        # Pattern 2: Seasonal purchases
        if len(medication_history) >= 10:
            recent_3_months = [
                m for m in medication_history 
                if m.get("date") and (datetime.utcnow() - m["date"]).days <= 90
            ]
            older = [
                m for m in medication_history 
                if m.get("date") and (datetime.utcnow() - m["date"]).days > 90
            ]
            
            if len(recent_3_months) > len(older) * 1.5:
                patterns.append({
                    "pattern": "increased_usage",
                    "message": "Your medication purchases have increased recently. "
                              "If you're feeling unwell more often, consider a health checkup."
                })
        
        return patterns
    
    def get_medication_adherence(self, user_id: str) -> Dict[str, Any]:
        """
        Track medication adherence for chronic conditions.
        Checks if user is refilling medications on time.
        """
        try:
            orders_collection = get_sync_collection("orders")
            
            # Get all orders
            orders = list(orders_collection.find({
                "customer_id": user_id,
                "status": {"$in": ["delivered", "confirmed"]}
            }).sort("created_at", -1))
            
            if not orders:
                return {
                    "success": True,
                    "adherence_score": None,
                    "message": "No purchase history to analyze"
                }
            
            # Track refill gaps
            medicine_timeline = {}
            
            for order in orders:
                for item in order.get("items", []):
                    med_name = item.get("medicine_name", "Unknown")
                    order_date = order.get("created_at")
                    
                    if med_name not in medicine_timeline:
                        medicine_timeline[med_name] = []
                    medicine_timeline[med_name].append(order_date)
            
            adherence_data = []
            
            for med_name, dates in medicine_timeline.items():
                if len(dates) >= 2:
                    dates.sort(reverse=True)
                    gaps = []
                    for i in range(1, len(dates)):
                        if dates[i-1] and dates[i]:
                            gap = (dates[i-1] - dates[i]).days
                            gaps.append(gap)
                    
                    if gaps:
                        avg_gap = sum(gaps) / len(gaps)
                        last_purchase_days = (datetime.utcnow() - dates[0]).days if dates[0] else 999
                        
                        # Is overdue?
                        is_overdue = last_purchase_days > avg_gap * 1.3
                        
                        adherence_data.append({
                            "medicine": med_name,
                            "refill_count": len(dates),
                            "avg_refill_interval_days": round(avg_gap),
                            "days_since_last_refill": last_purchase_days,
                            "is_overdue": is_overdue,
                            "status": "overdue" if is_overdue else "on_track",
                            "next_refill_in": max(0, round(avg_gap - last_purchase_days))
                        })
            
            # Calculate overall adherence score
            if adherence_data:
                on_track = sum(1 for a in adherence_data if a["status"] == "on_track")
                total = len(adherence_data)
                adherence_score = round((on_track / total) * 100)
            else:
                adherence_score = None
            
            return {
                "success": True,
                "adherence_score": adherence_score,
                "medications": adherence_data,
                "overdue_count": sum(1 for a in adherence_data if a["is_overdue"]),
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"Adherence tracking error: {e}")
            return {"success": False, "error": str(e)}


# Singleton
_health_profile_agent: Optional[HealthProfileAgent] = None


def get_health_profile_agent() -> HealthProfileAgent:
    """Get or create health profile agent."""
    global _health_profile_agent
    if _health_profile_agent is None:
        _health_profile_agent = HealthProfileAgent()
    return _health_profile_agent
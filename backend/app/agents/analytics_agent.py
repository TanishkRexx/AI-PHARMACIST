"""
Analytics Agent - AI-powered demand forecasting and inventory intelligence
Uses statistical analysis and trend detection
"""
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict
import logging
import math

from app.database.mongodb import get_sync_collection
from app.observability.tracer import get_langfuse

logger = logging.getLogger(__name__)

# Try to import numpy for advanced analytics
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False


class AnalyticsAgent:
    """
    AI-powered analytics and forecasting agent.
    
    Features:
    - Demand forecasting with trend analysis
    - Seasonality detection
    - Anomaly detection
    - Inventory optimization suggestions
    - Sales pattern analysis
    """
    
    def __init__(self):
        self.langfuse = get_langfuse()
    
    def _log_operation(self, name: str, input_data: Any, output_data: Any, duration_ms: int = 0):
        """Log operation to Langfuse"""
        if self.langfuse:
            try:
                trace = self.langfuse.trace(name=f"analytics_agent.{name}")
                trace.span(
                    name=name,
                    input=input_data,
                    output=output_data,
                    metadata={"duration_ms": duration_ms, "ai_powered": True}
                )
                self.langfuse.flush()
            except:
                pass
    
    def forecast_demand(
        self, 
        medicine_id: Optional[str] = None,
        days_history: int = 30,
        days_forecast: int = 30
    ) -> Dict[str, Any]:
        """
        AI-powered demand forecasting using historical data.
        
        Algorithm:
        1. Analyze historical sales
        2. Detect trends (linear regression)
        3. Apply seasonality factors
        4. Calculate confidence intervals
        """
        start_time = datetime.utcnow()
        
        try:
            orders_collection = get_sync_collection("orders")
            medicines_collection = get_sync_collection("medicines")
            
            start_date = datetime.utcnow() - timedelta(days=days_history)
            
            # Build query
            match_query = {
                "created_at": {"$gte": start_date},
                "status": {"$in": ["delivered", "confirmed", "dispatched"]}
            }
            
            if medicine_id:
                match_query["items.medicine_id"] = medicine_id
            
            # Aggregate sales data
            pipeline = [
                {"$match": match_query},
                {"$unwind": "$items"},
                {"$group": {
                    "_id": {
                        "medicine_id": "$items.medicine_id",
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}
                    },
                    "medicine_name": {"$first": "$items.medicine_name"},
                    "quantity": {"$sum": "$items.quantity"},
                    "revenue": {"$sum": "$items.subtotal"}
                }},
                {"$sort": {"_id.date": 1}}
            ]
            
            sales_data = list(orders_collection.aggregate(pipeline))
            
            # Group by medicine
            medicine_sales = defaultdict(list)
            for record in sales_data:
                med_id = record["_id"]["medicine_id"]
                medicine_sales[med_id].append({
                    "date": record["_id"]["date"],
                    "quantity": record["quantity"],
                    "revenue": record["revenue"],
                    "name": record.get("medicine_name", "Unknown")
                })
            
            # Generate forecasts
            forecasts = []
            
            for med_id, sales in medicine_sales.items():
                if len(sales) < 3:
                    continue
                
                # Calculate statistics
                quantities = [s["quantity"] for s in sales]
                revenues = [s["revenue"] for s in sales]
                
                mean_qty = sum(quantities) / len(quantities)
                total_qty = sum(quantities)
                daily_avg = total_qty / days_history
                
                # Trend analysis (simple linear regression)
                trend = self._calculate_trend(quantities)
                
                # Seasonality factor (day of week analysis)
                seasonality = self._calculate_seasonality(sales)
                
                # Forecast
                base_forecast = daily_avg * days_forecast
                trend_adjusted = base_forecast * (1 + trend * 0.1)
                final_forecast = round(trend_adjusted * seasonality)
                
                # Confidence score
                confidence = self._calculate_confidence(quantities)
                
                # Get current stock
                from bson import ObjectId
                medicine = medicines_collection.find_one({"_id": ObjectId(med_id)})
                current_stock = medicine.get("stock_quantity", 0) if medicine else 0
                reorder_level = medicine.get("reorder_level", 50) if medicine else 50
                
                # Calculate days of stock
                days_of_stock = round(current_stock / daily_avg) if daily_avg > 0 else 999
                
                # Generate recommendation
                if days_of_stock <= 7:
                    recommendation = "URGENT: Order immediately"
                    priority = "critical"
                elif days_of_stock <= 14:
                    recommendation = "Order within this week"
                    priority = "high"
                elif days_of_stock <= 30:
                    recommendation = "Monitor stock levels"
                    priority = "medium"
                else:
                    recommendation = "Stock adequate"
                    priority = "low"
                
                forecasts.append({
                    "medicine_id": med_id,
                    "medicine_name": sales[0]["name"],
                    "historical_data": {
                        "days_analyzed": days_history,
                        "total_sold": total_qty,
                        "total_revenue": round(sum(revenues), 2),
                        "daily_average": round(daily_avg, 2)
                    },
                    "forecast": {
                        "period_days": days_forecast,
                        "predicted_demand": final_forecast,
                        "trend": "upward" if trend > 0.05 else "downward" if trend < -0.05 else "stable",
                        "trend_value": round(trend, 3),
                        "seasonality_factor": round(seasonality, 2),
                        "confidence_score": confidence
                    },
                    "inventory": {
                        "current_stock": current_stock,
                        "reorder_level": reorder_level,
                        "days_of_stock_remaining": days_of_stock,
                        "stock_status": "adequate" if current_stock > reorder_level else "low"
                    },
                    "recommendation": recommendation,
                    "priority": priority,
                    "suggested_order_quantity": max(0, final_forecast - current_stock + reorder_level),
                    "ai_powered": True
                })
            
            # Sort by priority
            priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            forecasts.sort(key=lambda x: priority_order.get(x["priority"], 4))
            
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            result = {
                "success": True,
                "forecasts": forecasts,
                "summary": {
                    "total_medicines_analyzed": len(forecasts),
                    "critical_items": len([f for f in forecasts if f["priority"] == "critical"]),
                    "high_priority_items": len([f for f in forecasts if f["priority"] == "high"]),
                    "forecast_period_days": days_forecast,
                    "history_period_days": days_history
                },
                "ai_metadata": {
                    "algorithm": "linear_regression_with_seasonality",
                    "model_version": "1.0",
                    "processing_time_ms": duration_ms
                }
            }
            
            self._log_operation("demand_forecast", {"days": days_history}, result["summary"], duration_ms)
            
            return result
            
        except Exception as e:
            logger.error(f"Forecast error: {e}")
            return {"success": False, "forecasts": [], "error": str(e)}
    
    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate linear trend using least squares."""
        if len(values) < 2:
            return 0.0
        
        n = len(values)
        x = list(range(n))
        
        # Linear regression
        x_mean = sum(x) / n
        y_mean = sum(values) / n
        
        numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return 0.0
        
        slope = numerator / denominator
        
        # Normalize by mean
        trend = slope / y_mean if y_mean != 0 else 0
        
        return trend
    
    def _calculate_seasonality(self, sales: List[Dict]) -> float:
        """Calculate seasonality factor based on day of week."""
        # Simple seasonality: compare recent vs average
        if len(sales) < 7:
            return 1.0
        
        recent_avg = sum(s["quantity"] for s in sales[-7:]) / 7
        overall_avg = sum(s["quantity"] for s in sales) / len(sales)
        
        if overall_avg == 0:
            return 1.0
        
        return recent_avg / overall_avg
    
    def _calculate_confidence(self, values: List[float]) -> float:
        """Calculate confidence score based on data consistency."""
        if len(values) < 3:
            return 0.5
        
        mean_val = sum(values) / len(values)
        if mean_val == 0:
            return 0.5
        
        # Calculate coefficient of variation
        variance = sum((v - mean_val) ** 2 for v in values) / len(values)
        std_dev = math.sqrt(variance)
        cv = std_dev / mean_val
        
        # Lower CV = higher confidence
        confidence = max(0.5, min(0.95, 1 - cv))
        
        return round(confidence, 2)
    
    def detect_anomalies(self, days: int = 30) -> Dict[str, Any]:
        """
        Detect anomalies in sales patterns.
        Identifies unusual spikes or drops.
        """
        try:
            orders_collection = get_sync_collection("orders")
            
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Daily sales
            pipeline = [
                {"$match": {
                    "created_at": {"$gte": start_date},
                    "payment_status": "paid"
                }},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "orders": {"$sum": 1},
                    "revenue": {"$sum": "$total_amount"}
                }},
                {"$sort": {"_id": 1}}
            ]
            
            daily_data = list(orders_collection.aggregate(pipeline))
            
            if len(daily_data) < 7:
                return {"success": True, "anomalies": [], "message": "Not enough data"}
            
            # Calculate statistics
            revenues = [d["revenue"] for d in daily_data]
            orders_count = [d["orders"] for d in daily_data]
            
            revenue_mean = sum(revenues) / len(revenues)
            revenue_std = math.sqrt(sum((r - revenue_mean) ** 2 for r in revenues) / len(revenues))
            
            # Detect anomalies (> 2 standard deviations)
            anomalies = []
            
            for i, data in enumerate(daily_data):
                revenue_z = (data["revenue"] - revenue_mean) / revenue_std if revenue_std > 0 else 0
                
                if abs(revenue_z) > 2:
                    anomaly_type = "spike" if revenue_z > 0 else "drop"
                    anomalies.append({
                        "date": data["_id"],
                        "revenue": round(data["revenue"], 2),
                        "orders": data["orders"],
                        "anomaly_type": anomaly_type,
                        "z_score": round(revenue_z, 2),
                        "deviation_percent": round((data["revenue"] - revenue_mean) / revenue_mean * 100, 1)
                    })
            
            return {
                "success": True,
                "anomalies": anomalies,
                "statistics": {
                    "mean_daily_revenue": round(revenue_mean, 2),
                    "std_deviation": round(revenue_std, 2),
                    "days_analyzed": len(daily_data)
                },
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"Anomaly detection error: {e}")
            return {"success": False, "anomalies": [], "error": str(e)}
    
    def get_inventory_optimization(self) -> Dict[str, Any]:
        """
        AI-powered inventory optimization suggestions.
        """
        try:
            medicines_collection = get_sync_collection("medicines")
            
            medicines = list(medicines_collection.find({"is_active": True}))
            
            suggestions = []
            
            for med in medicines:
                stock = med.get("stock_quantity", 0)
                reorder = med.get("reorder_level", 50)
                price = med.get("unit_price", 0)
                
                # Calculate inventory value
                inventory_value = stock * price
                
                # Overstocked?
                if stock > reorder * 3:
                    suggestions.append({
                        "medicine_id": str(med["_id"]),
                        "medicine_name": med["name"],
                        "issue": "overstocked",
                        "current_stock": stock,
                        "recommended_stock": reorder * 2,
                        "excess_units": stock - (reorder * 2),
                        "capital_locked": round((stock - reorder * 2) * price, 2),
                        "suggestion": "Consider promotions or reducing reorder quantity",
                        "priority": "medium"
                    })
                
                # Understocked?
                elif stock < reorder:
                    suggestions.append({
                        "medicine_id": str(med["_id"]),
                        "medicine_name": med["name"],
                        "issue": "understocked",
                        "current_stock": stock,
                        "reorder_level": reorder,
                        "shortage": reorder - stock,
                        "suggestion": "Reorder immediately",
                        "priority": "high" if stock > 0 else "critical"
                    })
            
            # Sort by priority
            priority_order = {"critical": 0, "high": 1, "medium": 2}
            suggestions.sort(key=lambda x: priority_order.get(x["priority"], 3))
            
            # Calculate total metrics
            total_inventory_value = sum(m.get("stock_quantity", 0) * m.get("unit_price", 0) for m in medicines)
            
            return {
                "success": True,
                "suggestions": suggestions,
                "summary": {
                    "total_medicines": len(medicines),
                    "issues_found": len(suggestions),
                    "critical_issues": len([s for s in suggestions if s["priority"] == "critical"]),
                    "total_inventory_value": round(total_inventory_value, 2)
                },
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"Optimization error: {e}")
            return {"success": False, "suggestions": [], "error": str(e)}


# Singleton instance
_analytics_agent: Optional[AnalyticsAgent] = None


def get_analytics_agent() -> AnalyticsAgent:
    """Get or create analytics agent instance."""
    global _analytics_agent
    
    if _analytics_agent is None:
        _analytics_agent = AnalyticsAgent()
    
    return _analytics_agent
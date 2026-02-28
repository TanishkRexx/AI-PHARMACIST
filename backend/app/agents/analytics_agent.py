"""
Analytics Agent - AI-powered demand forecasting and inventory intelligence
Uses statistical analysis and trend detection
"""
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict
import logging
import math

from app.database.mongodb import get_database
from app.observability.tracer import get_langfuse, trace_agent_call

logger = logging.getLogger(__name__)


class AnalyticsAgent:
    """
    AI-powered analytics and forecasting agent.
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
            except Exception as e:
                logger.warning(f"Failed to log to Langfuse: {e}")

    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate linear trend using least squares."""
        if len(values) < 2:
            return 0.0
        
        n = len(values)
        x = list(range(n))
        
        x_mean = sum(x) / n
        y_mean = sum(values) / n
        
        if y_mean == 0:
            return 0.0
        
        numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return 0.0
        
        slope = numerator / denominator
        trend = slope / y_mean
        
        return trend

    def _calculate_seasonality(self, sales: List[Dict]) -> float:
        """Calculate seasonality factor."""
        if len(sales) < 7:
            return 1.0
        
        recent_avg = sum(s["quantity"] for s in sales[-7:]) / 7
        overall_avg = sum(s["quantity"] for s in sales) / len(sales)
        
        if overall_avg == 0:
            return 1.0
        
        return recent_avg / overall_avg

    def _calculate_confidence(self, values: List[float]) -> float:
        """Calculate confidence score."""
        if len(values) < 3:
            return 0.5
        
        mean_val = sum(values) / len(values)
        if mean_val == 0:
            return 0.5
        
        variance = sum((v - mean_val) ** 2 for v in values) / len(values)
        std_dev = math.sqrt(variance)
        cv = std_dev / mean_val
        
        confidence = max(0.5, min(0.95, 1 - cv))
        return round(confidence, 2)

    @trace_agent_call("AnalyticsAgent")
    async def forecast_demand(
        self, 
        medicine_id: Optional[str] = None,
        days_history: int = 30,
        days_forecast: int = 30
    ) -> Dict[str, Any]:
        """AI-powered demand forecasting."""
        try:
            db = get_database()
            start_date = datetime.utcnow() - timedelta(days=days_history)
            
            match_query = {
                "created_at": {"$gte": start_date},
                "status": {"$in": ["delivered", "confirmed", "dispatched"]}
            }
            
            if medicine_id:
                match_query["items.medicine_id"] = medicine_id
            
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
            
            sales_data = await db["orders"].aggregate(pipeline).to_list(1000)
            
            medicine_sales = defaultdict(list)
            for record in sales_data:
                med_id = record["_id"]["medicine_id"]
                medicine_sales[med_id].append({
                    "date": record["_id"]["date"],
                    "quantity": record["quantity"],
                    "revenue": record["revenue"],
                    "name": record.get("medicine_name", "Unknown")
                })
            
            forecasts = []
            
            for med_id, sales in medicine_sales.items():
                if len(sales) < 3:
                    continue
                
                quantities = [s["quantity"] for s in sales]
                revenues = [s["revenue"] for s in sales]
                
                total_qty = sum(quantities)
                daily_avg = total_qty / days_history
                
                trend = self._calculate_trend(quantities)
                seasonality = self._calculate_seasonality(sales)
                
                base_forecast = daily_avg * days_forecast
                trend_adjusted = base_forecast * (1 + trend * 0.1)
                final_forecast = round(trend_adjusted * seasonality)
                
                confidence = self._calculate_confidence(quantities)
                
                from bson import ObjectId
                try:
                    medicine = await db["medicines"].find_one({"_id": ObjectId(med_id)})
                except:
                    medicine = None
                    
                current_stock = medicine.get("stock_quantity", 0) if medicine else 0
                reorder_level = medicine.get("reorder_level", 50) if medicine else 50
                
                days_of_stock = round(current_stock / daily_avg) if daily_avg > 0 else 999
                
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
            
            priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            forecasts.sort(key=lambda x: priority_order.get(x["priority"], 4))
            
            return {
                "success": True,
                "forecasts": forecasts,
                "summary": {
                    "total_medicines_analyzed": len(forecasts),
                    "critical_items": len([f for f in forecasts if f["priority"] == "critical"]),
                    "high_priority_items": len([f for f in forecasts if f["priority"] == "high"]),
                    "forecast_period_days": days_forecast,
                    "history_period_days": days_history
                },
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"Forecast error: {e}")
            return {"success": False, "forecasts": [], "error": str(e)}

    @trace_agent_call("AnalyticsAgent")
    async def detect_anomalies(self, days: int = 30) -> Dict[str, Any]:
        """Detect anomalies in sales patterns."""
        try:
            db = get_database()
            start_date = datetime.utcnow() - timedelta(days=days)
            
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
            
            daily_data = await db["orders"].aggregate(pipeline).to_list(days)
            
            if len(daily_data) < 7:
                return {"success": True, "anomalies": [], "message": "Not enough data"}
            
            revenues = [d["revenue"] for d in daily_data]
            
            revenue_mean = sum(revenues) / len(revenues)
            revenue_std = math.sqrt(sum((r - revenue_mean) ** 2 for r in revenues) / len(revenues))
            
            anomalies = []
            
            for data in daily_data:
                revenue_z = (data["revenue"] - revenue_mean) / revenue_std if revenue_std > 0 else 0
                
                if abs(revenue_z) > 2:
                    anomaly_type = "spike" if revenue_z > 0 else "drop"
                    deviation_pct = round((data["revenue"] - revenue_mean) / revenue_mean * 100, 1) if revenue_mean > 0 else 0
                    
                    anomalies.append({
                        "date": data["_id"],
                        "revenue": round(data["revenue"], 2),
                        "orders": data["orders"],
                        "anomaly_type": anomaly_type,
                        "z_score": round(revenue_z, 2),
                        "deviation_percent": deviation_pct
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

    @trace_agent_call("AnalyticsAgent")
    async def get_inventory_optimization(self) -> Dict[str, Any]:
        """AI-powered inventory optimization suggestions."""
        try:
            db = get_database()
            
            medicines = await db["medicines"].find({"is_active": True}).to_list(1000)
            
            suggestions = []
            
            for med in medicines:
                stock = med.get("stock_quantity", 0)
                reorder = med.get("reorder_level", 50)
                price = med.get("unit_price", 0)
                
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
            
            priority_order = {"critical": 0, "high": 1, "medium": 2}
            suggestions.sort(key=lambda x: priority_order.get(x["priority"], 3))
            
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

    @trace_agent_call("AnalyticsAgent")
    async def get_sales_velocity(self) -> Dict[str, Any]:
        """Calculate sales velocity for all medicines."""
        try:
            db = get_database()
            start_date = datetime.utcnow() - timedelta(days=30)
            
            pipeline = [
                {"$match": {
                    "created_at": {"$gte": start_date},
                    "status": {"$in": ["delivered", "confirmed", "dispatched"]}
                }},
                {"$unwind": "$items"},
                {"$group": {
                    "_id": "$items.medicine_id",
                    "medicine_name": {"$first": "$items.medicine_name"},
                    "total_sold": {"$sum": "$items.quantity"},
                    "total_revenue": {"$sum": "$items.subtotal"},
                    "order_count": {"$sum": 1}
                }},
                {"$sort": {"total_sold": -1}}
            ]
            
            sales_data = await db["orders"].aggregate(pipeline).to_list(100)
            
            velocities = []
            
            for item in sales_data:
                from bson import ObjectId
                try:
                    medicine = await db["medicines"].find_one({"_id": ObjectId(item["_id"])})
                except:
                    medicine = None
                
                if not medicine:
                    continue
                
                daily_avg = item["total_sold"] / 30
                current_stock = medicine.get("stock_quantity", 0)
                
                days_until_stockout = round(current_stock / daily_avg) if daily_avg > 0 else 999
                
                if daily_avg >= 10:
                    velocity_rating = "fast"
                elif daily_avg >= 3:
                    velocity_rating = "medium"
                elif daily_avg >= 1:
                    velocity_rating = "slow"
                else:
                    velocity_rating = "very_slow"
                
                velocities.append({
                    "medicine_id": item["_id"],
                    "medicine_name": item["medicine_name"],
                    "total_sold_30d": item["total_sold"],
                    "total_revenue_30d": round(item["total_revenue"], 2),
                    "daily_average": round(daily_avg, 2),
                    "current_stock": current_stock,
                    "days_until_stockout": days_until_stockout,
                    "velocity_rating": velocity_rating,
                    "order_frequency": item["order_count"]
                })
            
            fast_movers = [v for v in velocities if v["velocity_rating"] == "fast"]
            medium_movers = [v for v in velocities if v["velocity_rating"] == "medium"]
            slow_movers = [v for v in velocities if v["velocity_rating"] in ["slow", "very_slow"]]
            
            return {
                "success": True,
                "velocities": velocities[:20],
                "summary": {
                    "fast_movers": len(fast_movers),
                    "medium_movers": len(medium_movers),
                    "slow_movers": len(slow_movers),
                    "total_analyzed": len(velocities)
                },
                "top_performers": velocities[:5],
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"Sales velocity error: {e}")
            return {"success": False, "velocities": [], "summary": {"fast_movers": 0, "medium_movers": 0, "slow_movers": 0}, "error": str(e)}

    @trace_agent_call("AnalyticsAgent")
    async def get_dead_stock(self) -> Dict[str, Any]:
        """Identify dead stock - medicines with no sales."""
        try:
            db = get_database()
            
            medicines_with_stock = await db["medicines"].find({
                "is_active": True,
                "stock_quantity": {"$gt": 0}
            }).to_list(500)
            
            start_date = datetime.utcnow() - timedelta(days=60)
            
            pipeline = [
                {"$match": {"created_at": {"$gte": start_date}}},
                {"$unwind": "$items"},
                {"$group": {
                    "_id": "$items.medicine_id",
                    "last_sale": {"$max": "$created_at"},
                    "total_sold": {"$sum": "$items.quantity"}
                }}
            ]
            
            sales_data_list = await db["orders"].aggregate(pipeline).to_list(500)
            sales_data = {item["_id"]: item for item in sales_data_list}
            
            dead_stock = []
            slow_moving = []
            
            for med in medicines_with_stock:
                med_id = str(med["_id"])
                stock = med.get("stock_quantity", 0)
                unit_price = med.get("unit_price", 0)
                stock_value = stock * unit_price
                
                if med_id not in sales_data:
                    dead_stock.append({
                        "medicine_id": med_id,
                        "medicine_name": med["name"],
                        "category": med.get("category", ""),
                        "current_stock": stock,
                        "unit_price": unit_price,
                        "stock_value": round(stock_value, 2),
                        "days_without_sale": 60,
                        "recommendation": "Consider clearance sale or return to supplier",
                        "priority": "high" if stock_value > 5000 else "medium"
                    })
                else:
                    sale_info = sales_data.get(med_id)
                    if sale_info and sale_info["total_sold"] < 5:
                        slow_moving.append({
                            "medicine_id": med_id,
                            "medicine_name": med["name"],
                            "category": med.get("category", ""),
                            "current_stock": stock,
                            "sold_60d": sale_info["total_sold"],
                            "stock_value": round(stock_value, 2),
                            "recommendation": "Monitor closely, consider promotion"
                        })
            
            total_dead_value = sum(d["stock_value"] for d in dead_stock)
            total_slow_value = sum(s["stock_value"] for s in slow_moving)
            
            # Generate AI insight
            ai_insight = self._generate_dead_stock_insight(dead_stock, slow_moving)
            
            return {
                "success": True,
                "dead_stock": dead_stock,
                "slow_moving": slow_moving[:10],
                "summary": {
                    "dead_stock_count": len(dead_stock),
                    "dead_stock_value": round(total_dead_value, 2),
                    "slow_moving_count": len(slow_moving),
                    "slow_moving_value": round(total_slow_value, 2),
                    "total_capital_at_risk": round(total_dead_value + total_slow_value, 2)
                },
                "ai_insight": ai_insight,
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"Dead stock error: {e}")
            return {
                "success": False, 
                "dead_stock": [], 
                "slow_moving": [],
                "summary": {"dead_stock_count": 0, "dead_stock_value": 0, "slow_moving_count": 0, "slow_moving_value": 0, "total_capital_at_risk": 0},
                "error": str(e)
            }

    def _generate_dead_stock_insight(self, dead_stock, slow_moving):
        """Generate AI insight for dead stock"""
        if not dead_stock and not slow_moving:
            return "Great job! Your inventory is moving well with no dead stock identified."
        
        insights = []
        
        if dead_stock:
            total_value = sum(d["stock_value"] for d in dead_stock)
            insights.append(
                f"You have {len(dead_stock)} items with no sales in 60 days, "
                f"worth ₹{total_value:,.2f}. Consider running a clearance sale."
            )
        
        if slow_moving:
            insights.append(
                f"{len(slow_moving)} items are slow-moving. "
                f"Consider bundling them with fast movers or offering discounts."
            )
        
        return " ".join(insights)

    @trace_agent_call("AnalyticsAgent")
    async def get_category_performance(self) -> Dict[str, Any]:
        """Analyze performance by medicine category."""
        try:
            db = get_database()
            start_date = datetime.utcnow() - timedelta(days=30)
            
            # ✅ FIXED: Simplified pipeline without $lookup
            pipeline = [
                {"$match": {
                    "created_at": {"$gte": start_date},
                    "status": {"$in": ["delivered", "confirmed", "dispatched"]}
                }},
                {"$unwind": "$items"},
                {"$group": {
                    "_id": "$items.medicine_id",
                    "medicine_name": {"$first": "$items.medicine_name"},
                    "total_revenue": {"$sum": "$items.subtotal"},
                    "total_quantity": {"$sum": "$items.quantity"},
                    "order_count": {"$sum": 1}
                }}
            ]
            
            sales_by_medicine = await db["orders"].aggregate(pipeline).to_list(500)
            
            # Group by category by fetching medicine details
            category_data = defaultdict(lambda: {
                "revenue": 0,
                "quantity": 0,
                "order_count": 0,
                "medicines": set()
            })
            
            for item in sales_by_medicine:
                from bson import ObjectId
                try:
                    medicine = await db["medicines"].find_one({"_id": ObjectId(item["_id"])})
                    category = medicine.get("category", "Uncategorized") if medicine else "Uncategorized"
                except:
                    category = "Uncategorized"
                
                category_data[category]["revenue"] += item["total_revenue"]
                category_data[category]["quantity"] += item["total_quantity"]
                category_data[category]["order_count"] += item["order_count"]
                category_data[category]["medicines"].add(item["_id"])
            
            total_revenue = sum(c["revenue"] for c in category_data.values())
            
            categories = []
            for cat_name, data in category_data.items():
                revenue = data["revenue"]
                categories.append({
                    "category": cat_name,
                    "revenue": round(revenue, 2),
                    "revenue_percentage": round((revenue / total_revenue * 100) if total_revenue > 0 else 0, 1),
                    "quantity_sold": data["quantity"],
                    "order_count": data["order_count"],
                    "unique_products": len(data["medicines"]),
                    "avg_order_value": round(revenue / data["order_count"], 2) if data["order_count"] > 0 else 0
                })
            
            # Sort by revenue
            categories.sort(key=lambda x: x["revenue"], reverse=True)
            
            top_category = categories[0] if categories else None
            bottom_category = categories[-1] if len(categories) > 1 else None
            
            return {
                "success": True,
                "categories": categories,
                "summary": {
                    "total_categories": len(categories),
                    "total_revenue": round(total_revenue, 2),
                    "top_category": top_category["category"] if top_category else None,
                    "top_category_revenue": top_category["revenue"] if top_category else 0
                },
                "insights": {
                    "top_performer": f"{top_category['category']} leads with ₹{top_category['revenue']:,.2f} ({top_category['revenue_percentage']}% of sales)" if top_category else None,
                    "opportunity": f"Consider expanding {bottom_category['category']} category with more products" if bottom_category else None
                },
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"Category performance error: {e}")
            return {
                "success": False, 
                "categories": [], 
                "summary": {"total_categories": 0, "total_revenue": 0},
                "error": str(e)
            }

    @trace_agent_call("AnalyticsAgent")
    async def get_revenue_forecast(self, days_forecast: int = 30) -> Dict[str, Any]:
        """Forecast future revenue based on historical trends."""
        try:
            db = get_database()
            start_date = datetime.utcnow() - timedelta(days=60)
            
            pipeline = [
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
            
            daily_data = await db["orders"].aggregate(pipeline).to_list(60)
            
            if len(daily_data) < 7:
                return {
                    "success": True,
                    "message": "Not enough data for forecasting (need at least 7 days)",
                    "historical": {"period_days": len(daily_data), "total_revenue": 0, "avg_daily_revenue": 0, "trend": "stable"},
                    "forecast": {"predicted_revenue": 0, "daily_breakdown": []},
                    "ai_powered": True
                }
            
            revenues = [d["revenue"] for d in daily_data]
            avg_daily = sum(revenues) / len(revenues)
            
            trend = self._calculate_trend(revenues)
            
            forecast_data = []
            for i in range(1, days_forecast + 1):
                forecast_date = datetime.utcnow() + timedelta(days=i)
                
                predicted_revenue = avg_daily * (1 + trend * i * 0.01)
                
                day_of_week = forecast_date.weekday()
                if day_of_week >= 5:
                    predicted_revenue *= 0.8
                
                forecast_data.append({
                    "date": forecast_date.strftime("%Y-%m-%d"),
                    "predicted_revenue": round(max(0, predicted_revenue), 2),
                    "confidence": max(0.5, 0.9 - (i * 0.01))
                })
            
            total_forecast = sum(f["predicted_revenue"] for f in forecast_data)
            
            last_30_revenue = sum(revenues[-30:]) if len(revenues) >= 30 else sum(revenues)
            growth_potential = ((total_forecast - last_30_revenue) / last_30_revenue * 100) if last_30_revenue > 0 else 0
            
            return {
                "success": True,
                "historical": {
                    "period_days": len(daily_data),
                    "total_revenue": round(sum(revenues), 2),
                    "avg_daily_revenue": round(avg_daily, 2),
                    "trend": "upward" if trend > 0.05 else "downward" if trend < -0.05 else "stable",
                    "trend_value": round(trend, 3)
                },
                "forecast": {
                    "period_days": days_forecast,
                    "predicted_revenue": round(total_forecast, 2),
                    "avg_daily_forecast": round(total_forecast / days_forecast, 2),
                    "growth_potential": round(growth_potential, 1),
                    "daily_breakdown": forecast_data[:14]
                },
                "recommendation": self._generate_revenue_recommendation(trend, growth_potential),
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"Revenue forecast error: {e}")
            return {
                "success": False, 
                "historical": {"period_days": 0, "total_revenue": 0, "avg_daily_revenue": 0, "trend": "stable"},
                "forecast": {"predicted_revenue": 0, "daily_breakdown": []},
                "error": str(e)
            }

    def _generate_revenue_recommendation(self, trend, growth_potential):
        """Generate recommendation based on revenue forecast"""
        if growth_potential > 10:
            return "Strong growth predicted! Consider increasing stock of fast-moving items."
        elif growth_potential > 0:
            return "Steady growth expected. Maintain current inventory levels."
        elif growth_potential > -10:
            return "Slight decline predicted. Focus on promotions and customer retention."
        else:
            return "Significant decline expected. Review pricing and consider special offers."

    @trace_agent_call("AnalyticsAgent")
    async def get_smart_reorder_suggestions(self) -> Dict[str, Any]:
        """AI-powered smart reorder suggestions."""
        try:
            db = get_database()
            
            medicines = await db["medicines"].find({"is_active": True}).to_list(500)
            
            start_date = datetime.utcnow() - timedelta(days=30)
            
            pipeline = [
                {"$match": {"created_at": {"$gte": start_date}}},
                {"$unwind": "$items"},
                {"$group": {
                    "_id": "$items.medicine_id",
                    "total_sold": {"$sum": "$items.quantity"},
                    "order_count": {"$sum": 1}
                }}
            ]
            
            sales_data_list = await db["orders"].aggregate(pipeline).to_list(500)
            sales_data = {item["_id"]: item for item in sales_data_list}
            
            suggestions = []
            
            for med in medicines:
                med_id = str(med["_id"])
                current_stock = med.get("stock_quantity", 0)
                reorder_level = med.get("reorder_level", 50)
                unit_price = med.get("unit_price", 0)
                
                sales_info = sales_data.get(med_id, {"total_sold": 0, "order_count": 0})
                daily_avg = sales_info["total_sold"] / 30
                
                days_until_stockout = round(current_stock / daily_avg) if daily_avg > 0 else 999
                
                should_reorder = False
                urgency = "low"
                reason = ""
                
                if current_stock == 0:
                    should_reorder = True
                    urgency = "critical"
                    reason = "Out of stock"
                elif days_until_stockout <= 7:
                    should_reorder = True
                    urgency = "critical"
                    reason = f"Will run out in {days_until_stockout} days"
                elif days_until_stockout <= 14:
                    should_reorder = True
                    urgency = "high"
                    reason = f"Stock for only {days_until_stockout} days"
                elif current_stock <= reorder_level:
                    should_reorder = True
                    urgency = "medium"
                    reason = "Below reorder level"
                
                if should_reorder:
                    target_stock = max(daily_avg * 30, reorder_level * 2)
                    order_quantity = max(0, round(target_stock - current_stock))
                    
                    suggestions.append({
                        "medicine_id": med_id,
                        "medicine_name": med["name"],
                        "category": med.get("category", ""),
                        "current_stock": current_stock,
                        "daily_average_sales": round(daily_avg, 2),
                        "days_until_stockout": days_until_stockout,
                        "reorder_level": reorder_level,
                        "suggested_order_quantity": order_quantity,
                        "estimated_cost": round(order_quantity * unit_price * 0.7, 2),
                        "urgency": urgency,
                        "reason": reason
                    })
            
            urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            suggestions.sort(key=lambda x: (urgency_order.get(x["urgency"], 4), -x["daily_average_sales"]))
            
            total_items = len(suggestions)
            total_cost = sum(s["estimated_cost"] for s in suggestions)
            critical_items = len([s for s in suggestions if s["urgency"] == "critical"])
            high_priority = len([s for s in suggestions if s["urgency"] == "high"])
            
            return {
                "success": True,
                "suggestions": suggestions[:20],
                "summary": {
                    "total_items_to_reorder": total_items,
                    "critical_items": critical_items,
                    "high_priority_items": high_priority,
                    "total_estimated_cost": round(total_cost, 2)
                },
                "quick_action": {
                    "critical_reorder": [s for s in suggestions if s["urgency"] == "critical"][:5],
                    "can_create_po": critical_items > 0
                },
                "ai_insight": self._generate_reorder_insight(suggestions),
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"Smart reorder error: {e}")
            return {
                "success": False, 
                "suggestions": [], 
                "summary": {"total_items_to_reorder": 0, "critical_items": 0, "high_priority_items": 0, "total_estimated_cost": 0},
                "quick_action": {"critical_reorder": [], "can_create_po": False},
                "error": str(e)
            }

    def _generate_reorder_insight(self, suggestions):
        """Generate insight for reorder suggestions"""
        if not suggestions:
            return "Your inventory levels are optimal. No immediate reorders needed."
        
        critical = [s for s in suggestions if s["urgency"] == "critical"]
        
        if critical:
            names = ", ".join([s["medicine_name"] for s in critical[:3]])
            return f"Urgent: {len(critical)} items need immediate reorder including {names}."
        
        return f"{len(suggestions)} items are due for reorder to maintain optimal stock levels."

    @trace_agent_call("AnalyticsAgent")
    async def get_ai_summary(self) -> Dict[str, Any]:
        """Get a comprehensive AI summary of pharmacy performance."""
        try:
            # Gather all insights with individual error handling
            try:
                inventory_opt = await self.get_inventory_optimization()
            except:
                inventory_opt = {"success": False, "summary": {}}
            
            try:
                velocity = await self.get_sales_velocity()
            except:
                velocity = {"success": False, "summary": {}}
            
            try:
                dead_stock = await self.get_dead_stock()
            except:
                dead_stock = {"success": False, "summary": {}}
            
            try:
                reorder = await self.get_smart_reorder_suggestions()
            except:
                reorder = {"success": False, "summary": {}}
            
            # Generate summary with safe access
            summary = {
                "health_score": 75,  # Default score
                "key_metrics": {
                    "inventory_value": 0,
                    "items_to_reorder": 0,
                    "dead_stock_value": 0,
                    "fast_movers": 0
                },
                "urgent_actions": [],
                "opportunities": [],
                "ai_recommendations": []
            }
            
            # Calculate health score with safe access
            scores = []
            
            # Inventory health
            if inventory_opt.get("success") and inventory_opt.get("summary"):
                opt_data = inventory_opt.get("summary", {})
                issues = opt_data.get("issues_found", 0)
                total = opt_data.get("total_medicines", 1) or 1  # Avoid division by zero
                inv_score = max(0, 100 - (issues / total * 100))
                scores.append(inv_score)
                summary["key_metrics"]["inventory_value"] = opt_data.get("total_inventory_value", 0)
            
            # Stock availability
            if reorder.get("success") and reorder.get("summary"):
                reorder_data = reorder.get("summary", {})
                critical = reorder_data.get("critical_items", 0)
                summary["key_metrics"]["items_to_reorder"] = reorder_data.get("total_items_to_reorder", 0)
                
                if critical == 0:
                    scores.append(100)
                elif critical <= 3:
                    scores.append(70)
                else:
                    scores.append(40)
                
                # Add urgent actions
                if reorder.get("quick_action", {}).get("critical_reorder"):
                    for item in reorder["quick_action"]["critical_reorder"][:3]:
                        summary["urgent_actions"].append({
                            "action": f"Reorder {item.get('medicine_name', 'Unknown')}",
                            "reason": item.get("reason", "Low stock"),
                            "priority": "critical"
                        })
            
            # Dead stock
            if dead_stock.get("success") and dead_stock.get("summary"):
                dead_data = dead_stock.get("summary", {})
                dead_count = dead_data.get("dead_stock_count", 0)
                summary["key_metrics"]["dead_stock_value"] = dead_data.get("dead_stock_value", 0)
                
                if dead_count == 0:
                    scores.append(100)
                elif dead_count <= 5:
                    scores.append(80)
                else:
                    scores.append(60)
                
                # Add opportunity
                if dead_data.get("dead_stock_value", 0) > 0:
                    summary["opportunities"].append({
                        "opportunity": "Clear dead stock",
                        "potential_recovery": dead_data["dead_stock_value"],
                        "suggestion": "Run clearance sale for non-moving items"
                    })
            
            # Velocity
            if velocity.get("success") and velocity.get("summary"):
                vel_data = velocity.get("summary", {})
                summary["key_metrics"]["fast_movers"] = vel_data.get("fast_movers", 0)
            
            # Calculate final health score
            summary["health_score"] = round(sum(scores) / len(scores)) if scores else 75
            
            # AI recommendations based on health score
            if summary["health_score"] >= 80:
                summary["ai_recommendations"].append("Your pharmacy is performing well! Focus on maintaining current practices.")
            elif summary["health_score"] >= 60:
                summary["ai_recommendations"].append("Good performance with room for improvement. Address critical reorders first.")
            else:
                summary["ai_recommendations"].append("Attention needed! Focus on resolving stock issues and reducing dead inventory.")
            
            return {
                "success": True,
                "summary": summary,
                "generated_at": datetime.utcnow().isoformat(),
                "ai_powered": True
            }
            
        except Exception as e:
            logger.error(f"AI summary error: {e}")
            return {
                "success": False, 
                "summary": {
                    "health_score": 75,
                    "key_metrics": {"inventory_value": 0, "items_to_reorder": 0, "dead_stock_value": 0, "fast_movers": 0},
                    "urgent_actions": [],
                    "opportunities": [],
                    "ai_recommendations": ["Unable to generate recommendations at this time."]
                },
                "error": str(e)
            }


# Singleton
_analytics_agent: Optional[AnalyticsAgent] = None

def get_analytics_agent() -> AnalyticsAgent:
    global _analytics_agent
    if _analytics_agent is None:
        _analytics_agent = AnalyticsAgent()
    return _analytics_agent
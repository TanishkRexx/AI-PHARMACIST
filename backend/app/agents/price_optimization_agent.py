"""
Price Optimization Agent - AI-powered price optimization for medicines
Suggests cheaper alternatives while maintaining therapeutic equivalence
"""
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging
from bson import ObjectId

from app.observability.tracer import get_langfuse
from app.agents.semantic_search import get_semantic_search

logger = logging.getLogger(__name__)


class PriceOptimizationAgent:
    """
    AI-powered price optimization for pharmacy cart.
    
    Features:
    - Find cheaper alternatives with same generic composition
    - Semantic similarity matching for therapeutic equivalence
    - Safety checks for alternatives (allergies, interactions)
    - Calculate potential savings
    - Smart bundling suggestions
    - Confidence scoring for alternatives
    """
    
    def __init__(self):
        self.langfuse = get_langfuse()
        self.semantic_search = get_semantic_search()
        self._safety_agent = None  # Lazy load
        
        # Cross-reactivity database for safety
        self.allergy_cross_reactivity = {
            "penicillin": ["amoxicillin", "ampicillin", "penicillin", "augmentin"],
            "sulfa": ["sulfamethoxazole", "sulfasalazine"],
            "aspirin": ["ibuprofen", "naproxen", "nsaids"],
            "codeine": ["morphine", "oxycodone", "tramadol"],
        }
        
        # Known drug interactions
        self.known_interactions = {
            "warfarin": ["aspirin", "ibuprofen", "amoxicillin"],
            "metformin": ["alcohol", "contrast dye"],
            "aspirin": ["warfarin", "ibuprofen", "blood thinners"],
            "amlodipine": ["simvastatin", "grapefruit"],
            "lisinopril": ["potassium supplements", "nsaids"],
        }
    
    def _get_sync_collection(self, name: str):
        """Get collection with lazy import"""
        from app.database.mongodb import get_sync_collection
        return get_sync_collection(name)
    
    def _log_operation(self, name: str, input_data: Any, output_data: Any, duration_ms: int = 0):
        """Log operation to Langfuse"""
        if self.langfuse:
            try:
                trace = self.langfuse.trace(name=f"price_optimization_agent.{name}")
                trace.span(
                    name=name,
                    input=input_data,
                    output=output_data,
                    metadata={
                        "duration_ms": duration_ms, 
                        "ai_powered": True,
                        "agent": "PriceOptimizationAgent"
                    }
                )
                
                # Score for savings tracking
                if isinstance(output_data, dict) and "total_potential_savings" in output_data:
                    trace.score(
                        name="savings_found",
                        value=min(1.0, output_data["total_potential_savings"] / 100),
                        comment=f"Savings: ₹{output_data.get('total_potential_savings', 0)}"
                    )
                
                self.langfuse.flush()
            except Exception as e:
                logger.debug(f"Langfuse logging error: {e}")
    
    def optimize_cart(
        self,
        cart_items: List[Dict],
        user_allergies: List[str] = None,
        current_medications: List[str] = None,
        budget_limit: Optional[float] = None,
        max_alternatives_per_item: int = 3,
        include_generic_only: bool = False
    ) -> Dict[str, Any]:
        """
        Analyze cart and suggest cheaper alternatives.
        
        Args:
            cart_items: List of cart items with medicine_id and quantity
            user_allergies: User's known allergies
            current_medications: User's current medications
            budget_limit: Optional maximum budget for optimization
            max_alternatives_per_item: Max alternatives to show per item
            include_generic_only: Only show generic equivalents
            
        Returns:
            Comprehensive optimization suggestions with potential savings
        """
        start_time = datetime.utcnow()
        
        medicines_collection = self._get_sync_collection("medicines")
        
        optimization_results = []
        total_current_price = 0
        total_optimized_price = 0
        total_potential_savings = 0
        
        for cart_item in cart_items:
            medicine_id = cart_item.get("medicine_id")
            quantity = cart_item.get("quantity", 1)
            
            # Get current medicine details
            try:
                medicine = medicines_collection.find_one({"_id": ObjectId(medicine_id)})
            except Exception as e:
                logger.warning(f"Invalid medicine_id: {medicine_id}, error: {e}")
                continue
            
            if not medicine:
                logger.warning(f"Medicine not found: {medicine_id}")
                continue
            
            current_price = medicine.get("unit_price", 0)
            item_total = current_price * quantity
            total_current_price += item_total
            
            # Find cheaper alternatives
            alternatives = self._find_cheaper_alternatives(
                medicine=medicine,
                quantity=quantity,
                user_allergies=user_allergies,
                current_medications=current_medications,
                max_alternatives=max_alternatives_per_item,
                generic_only=include_generic_only
            )
            
            # Calculate best savings
            best_alternative = None
            best_savings = 0
            
            if alternatives:
                best_alternative = alternatives[0]  # Already sorted by savings
                best_savings = (current_price - best_alternative["unit_price"]) * quantity
            
            # Determine optimization status
            if alternatives:
                if best_savings > item_total * 0.3:  # More than 30% savings
                    optimization_status = "high_savings"
                elif best_savings > item_total * 0.1:  # More than 10% savings
                    optimization_status = "moderate_savings"
                else:
                    optimization_status = "minor_savings"
            else:
                optimization_status = "optimal"  # Already at best price
            
            item_result = {
                "medicine_id": medicine_id,
                "medicine_name": medicine["name"],
                "generic_name": medicine.get("generic_name", ""),
                "brand": medicine.get("brand", ""),
                "category": medicine.get("category", ""),
                "dosage": medicine.get("dosage", ""),
                "quantity": quantity,
                "current_unit_price": current_price,
                "current_total": round(item_total, 2),
                "prescription_required": medicine.get("prescription_required", False),
                "image_url": medicine.get("image_url"),
                "alternatives": alternatives,
                "alternatives_count": len(alternatives),
                "has_alternatives": len(alternatives) > 0,
                "has_generic_alternative": any(a["match_type"] == "generic_equivalent" for a in alternatives),
                "best_alternative": best_alternative,
                "potential_savings": round(best_savings, 2),
                "savings_percentage": round((best_savings / item_total) * 100, 1) if item_total > 0 else 0,
                "optimization_status": optimization_status
            }
            
            optimization_results.append(item_result)
            
            if best_alternative:
                total_optimized_price += best_alternative["unit_price"] * quantity
                total_potential_savings += best_savings
            else:
                total_optimized_price += item_total
        
        # Generate smart recommendations
        recommendations = self._generate_recommendations(
            optimization_results, 
            total_current_price,
            total_potential_savings,
            budget_limit
        )
        
        # Budget analysis if limit provided
        budget_analysis = None
        if budget_limit:
            budget_analysis = self._analyze_budget(
                optimization_results,
                total_current_price,
                total_optimized_price,
                budget_limit
            )
        
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        result = {
            "success": True,
            "cart_analysis": {
                "total_items": len(cart_items),
                "items_analyzed": len(optimization_results),
                "items_with_alternatives": sum(1 for r in optimization_results if r["has_alternatives"]),
                "items_with_generic_alternatives": sum(1 for r in optimization_results if r["has_generic_alternative"]),
                "items_at_best_price": sum(1 for r in optimization_results if r["optimization_status"] == "optimal"),
                "current_total": round(total_current_price, 2),
                "optimized_total": round(total_optimized_price, 2),
                "total_potential_savings": round(total_potential_savings, 2),
                "savings_percentage": round((total_potential_savings / total_current_price) * 100, 1) if total_current_price > 0 else 0
            },
            "items": optimization_results,
            "recommendations": recommendations,
            "budget_analysis": budget_analysis,
            "processing_time_ms": duration_ms,
            "ai_powered": True
        }
        
        self._log_operation(
            "optimize_cart",
            {
                "items_count": len(cart_items),
                "has_allergies": bool(user_allergies),
                "has_medications": bool(current_medications),
                "budget_limit": budget_limit
            },
            {
                "total_potential_savings": total_potential_savings,
                "alternatives_found": sum(1 for r in optimization_results if r["has_alternatives"]),
                "duration_ms": duration_ms
            },
            duration_ms
        )
        
        return result
    
    def _find_cheaper_alternatives(
        self,
        medicine: Dict,
        quantity: int,
        user_allergies: List[str] = None,
        current_medications: List[str] = None,
        max_alternatives: int = 3,
        generic_only: bool = False
    ) -> List[Dict]:
        """
        Find cheaper alternatives for a medicine using multiple strategies.
        
        Priority:
        1. Same generic name (bioequivalent) - Highest confidence
        2. Same category with similar composition
        3. Semantically similar medicines (AI)
        """
        medicines_collection = self._get_sync_collection("medicines")
        
        current_price = medicine.get("unit_price", 0)
        generic_name = medicine.get("generic_name", "").strip()
        category = medicine.get("category", "")
        medicine_id = str(medicine["_id"])
        dosage = medicine.get("dosage", "")
        
        alternatives = []
        seen_ids = {medicine_id}
        
        # ==================== STRATEGY 1: SAME GENERIC NAME ====================
        # These are bioequivalent - same active ingredient, different brand
        if generic_name:
            generic_alternatives = list(medicines_collection.find({
                "generic_name": {"$regex": f"^{generic_name}$", "$options": "i"},
                "_id": {"$ne": medicine["_id"]},
                "is_active": True,
                "stock_quantity": {"$gte": quantity},
                "unit_price": {"$lt": current_price}
            }).sort("unit_price", 1).limit(max_alternatives * 2))
            
            for alt in generic_alternatives:
                alt_id = str(alt["_id"])
                if alt_id not in seen_ids:
                    # Safety check
                    if self._is_safe_alternative(alt, user_allergies, current_medications):
                        formatted = self._format_alternative(alt, medicine, "generic_equivalent")
                        formatted["confidence_score"] = 0.95  # Highest confidence
                        formatted["equivalence_note"] = "Same active ingredient - bioequivalent"
                        alternatives.append(formatted)
                        seen_ids.add(alt_id)
        
        # If generic_only flag is set, return only generic alternatives
        if generic_only:
            alternatives.sort(key=lambda x: x["unit_price"])
            return alternatives[:max_alternatives]
        
        # ==================== STRATEGY 2: SAME CATEGORY, SIMILAR PROPERTIES ====================
        if len(alternatives) < max_alternatives and category:
            # Build query for similar medicines in same category
            category_query = {
                "category": category,
                "_id": {"$nin": [ObjectId(id) for id in seen_ids]},
                "is_active": True,
                "stock_quantity": {"$gte": quantity},
                "unit_price": {"$lt": current_price}
            }
            
            # If dosage exists, prefer similar dosage forms
            category_alternatives = list(medicines_collection.find(category_query)
                                        .sort("unit_price", 1)
                                        .limit(max_alternatives * 2))
            
            for alt in category_alternatives:
                alt_id = str(alt["_id"])
                if alt_id not in seen_ids:
                    if self._is_safe_alternative(alt, user_allergies, current_medications):
                        formatted = self._format_alternative(alt, medicine, "same_category")
                        
                        # Calculate confidence based on similarity
                        confidence = 0.7
                        if alt.get("dosage", "") == dosage:
                            confidence += 0.1
                        if alt.get("manufacturer", "") == medicine.get("manufacturer", ""):
                            confidence += 0.05
                        
                        formatted["confidence_score"] = confidence
                        formatted["equivalence_note"] = f"Similar medicine in {category}"
                        alternatives.append(formatted)
                        seen_ids.add(alt_id)
        
        # ==================== STRATEGY 3: SEMANTIC SIMILARITY (AI) ====================
        if len(alternatives) < max_alternatives and self.semantic_search.is_initialized:
            try:
                similar = self.semantic_search.find_similar_medicines(medicine_id, top_k=max_alternatives * 2)
                
                for sim in similar:
                    sim_id = sim.get("id")
                    if sim_id and sim_id not in seen_ids:
                        try:
                            sim_medicine = medicines_collection.find_one({
                                "_id": ObjectId(sim_id),
                                "is_active": True,
                                "stock_quantity": {"$gte": quantity},
                                "unit_price": {"$lt": current_price}
                            })
                            
                            if sim_medicine and self._is_safe_alternative(sim_medicine, user_allergies, current_medications):
                                formatted = self._format_alternative(sim_medicine, medicine, "ai_similar")
                                formatted["similarity_score"] = sim.get("similarity_score", 0.5)
                                formatted["confidence_score"] = min(0.6, sim.get("similarity_score", 0.5))
                                formatted["equivalence_note"] = "AI-matched based on therapeutic similarity"
                                alternatives.append(formatted)
                                seen_ids.add(sim_id)
                        except Exception as e:
                            logger.debug(f"Error fetching similar medicine {sim_id}: {e}")
                            continue
            except Exception as e:
                logger.warning(f"Semantic search failed: {e}")
        
        # Sort by savings (highest savings first), then by confidence
        alternatives.sort(key=lambda x: (-(x["savings_per_unit"]), -x.get("confidence_score", 0)))
        
        return alternatives[:max_alternatives]
    
    def _format_alternative(self, alt_medicine: Dict, original_medicine: Dict, match_type: str) -> Dict:
        """Format alternative medicine for response."""
        original_price = original_medicine.get("unit_price", 0)
        alt_price = alt_medicine.get("unit_price", 0)
        savings = original_price - alt_price
        
        return {
            "id": str(alt_medicine["_id"]),
            "name": alt_medicine["name"],
            "generic_name": alt_medicine.get("generic_name", ""),
            "brand": alt_medicine.get("brand", ""),
            "category": alt_medicine.get("category", ""),
            "dosage": alt_medicine.get("dosage", ""),
            "description": alt_medicine.get("description", "")[:200] if alt_medicine.get("description") else "",
            "unit_price": alt_price,
            "original_price": original_price,
            "stock": alt_medicine.get("stock_quantity", 0),
            "in_stock": alt_medicine.get("stock_quantity", 0) > 0,
            "prescription_required": alt_medicine.get("prescription_required", False),
            "manufacturer": alt_medicine.get("manufacturer", ""),
            "image_url": alt_medicine.get("image_url"),
            "match_type": match_type,
            "match_type_label": self._get_match_type_label(match_type),
            "savings_per_unit": round(savings, 2),
            "savings_percentage": round((savings / original_price) * 100, 1) if original_price > 0 else 0,
            "why_suggested": self._get_suggestion_reason(alt_medicine, original_medicine, match_type)
        }
    
    def _get_match_type_label(self, match_type: str) -> str:
        """Get human-readable label for match type."""
        labels = {
            "generic_equivalent": "🧬 Generic Equivalent",
            "same_category": "📦 Same Category",
            "ai_similar": "🤖 AI Recommended"
        }
        return labels.get(match_type, "Alternative")
    
    def _get_suggestion_reason(self, alt: Dict, original: Dict, match_type: str) -> str:
        """Generate reason why this alternative is suggested."""
        alt_price = alt.get("unit_price", 0)
        orig_price = original.get("unit_price", 0)
        savings_pct = round(((orig_price - alt_price) / orig_price) * 100) if orig_price > 0 else 0
        
        if match_type == "generic_equivalent":
            return f"Same active ingredient ({alt.get('generic_name', 'N/A')}) at {savings_pct}% lower price"
        elif match_type == "same_category":
            return f"Similar {alt.get('category', '')} medicine - save {savings_pct}%"
        elif match_type == "ai_similar":
            return f"AI-matched for therapeutic similarity - {savings_pct}% cheaper"
        return "Alternative option available"
    
    def _is_safe_alternative(
        self,
        medicine: Dict,
        user_allergies: List[str] = None,
        current_medications: List[str] = None
    ) -> bool:
        """
        Check if alternative is safe for the user.
        Returns True if safe, False if potential risk.
        """
        if not user_allergies and not current_medications:
            return True
        
        medicine_name_lower = medicine["name"].lower()
        generic_lower = medicine.get("generic_name", "").lower()
        contraindications = [c.lower() for c in medicine.get("contraindications", [])]
        
        # Check allergies
        if user_allergies:
            for allergy in user_allergies:
                allergy_lower = allergy.lower().strip()
                if not allergy_lower:
                    continue
                
                # Direct match
                if allergy_lower in medicine_name_lower or allergy_lower in generic_lower:
                    logger.debug(f"Allergy match: {allergy} in {medicine['name']}")
                    return False
                
                # Check contraindications
                for contra in contraindications:
                    if allergy_lower in contra:
                        logger.debug(f"Contraindication match: {allergy} in {contra}")
                        return False
                
                # Check cross-reactivity
                cross_reactive = self.allergy_cross_reactivity.get(allergy_lower, [])
                if any(cr in medicine_name_lower or cr in generic_lower for cr in cross_reactive):
                    logger.debug(f"Cross-reactivity: {allergy} with {medicine['name']}")
                    return False
        
        # Check drug interactions
        if current_medications:
            drug_interactions = [di.lower() for di in medicine.get("drug_interactions", [])]
            generic = generic_lower
            
            for med in current_medications:
                med_lower = med.lower().strip()
                if not med_lower:
                    continue
                
                # Check known interactions database
                if generic in self.known_interactions:
                    if any(med_lower in ki.lower() for ki in self.known_interactions[generic]):
                        logger.debug(f"Known interaction: {medicine['name']} with {med}")
                        return False
                
                # Check medicine's interaction list
                for interaction in drug_interactions:
                    if med_lower in interaction:
                        logger.debug(f"Drug interaction: {medicine['name']} with {med}")
                        return False
        
        return True
    
    def _generate_recommendations(
        self,
        optimization_results: List[Dict],
        total_current: float,
        total_savings: float,
        budget_limit: Optional[float]
    ) -> List[Dict]:
        """Generate smart recommendations based on analysis."""
        recommendations = []
        
        # Count different scenarios
        items_with_alternatives = [r for r in optimization_results if r["has_alternatives"]]
        items_with_generics = [r for r in optimization_results if r["has_generic_alternative"]]
        high_savings_items = [r for r in optimization_results if r["savings_percentage"] > 30]
        
        # Recommendation 1: High savings opportunity
        if total_savings > 200:
            recommendations.append({
                "type": "high_savings",
                "priority": "high",
                "icon": "💰",
                "title": "Major Savings Available!",
                "message": f"Switch to alternatives and save ₹{total_savings:.0f} ({round((total_savings/total_current)*100)}% of your cart)",
                "action": "apply_all_alternatives",
                "action_label": "Apply All Savings"
            })
        elif total_savings > 100:
            recommendations.append({
                "type": "moderate_savings",
                "priority": "high",
                "icon": "💵",
                "title": "Good Savings Found",
                "message": f"Save ₹{total_savings:.0f} by switching to cheaper alternatives",
                "action": "review_alternatives",
                "action_label": "Review Options"
            })
        elif total_savings > 50:
            recommendations.append({
                "type": "some_savings",
                "priority": "medium",
                "icon": "💡",
                "title": "Some Savings Available",
                "message": f"You can save ₹{total_savings:.0f} on your order",
                "action": "review_alternatives",
                "action_label": "View Alternatives"
            })
        
        # Recommendation 2: Generic alternatives
        if items_with_generics:
            total_generic_savings = sum(
                r["potential_savings"] for r in items_with_generics
            )
            recommendations.append({
                "type": "generic_available",
                "priority": "high",
                "icon": "🧬",
                "title": "Generic Equivalents Available",
                "message": f"{len(items_with_generics)} medicine(s) have generic alternatives. Same quality, lower price - save ₹{total_generic_savings:.0f}",
                "action": "switch_to_generics",
                "action_label": "Switch to Generics",
                "affected_items": [r["medicine_id"] for r in items_with_generics]
            })
        
        # Recommendation 3: High savings items
        if high_savings_items and len(high_savings_items) < len(optimization_results):
            recommendations.append({
                "type": "quick_wins",
                "priority": "medium",
                "icon": "⚡",
                "title": "Quick Wins",
                "message": f"{len(high_savings_items)} item(s) can save you 30%+ each",
                "action": "show_high_savings",
                "action_label": "View Best Deals",
                "affected_items": [r["medicine_id"] for r in high_savings_items]
            })
        
        # Recommendation 4: Budget warning
        if budget_limit and total_current > budget_limit:
            optimized_total = total_current - total_savings
            if optimized_total <= budget_limit:
                recommendations.append({
                    "type": "budget_fit",
                    "priority": "high",
                    "icon": "🎯",
                    "title": "Fit Your Budget!",
                    "message": f"Switch to alternatives to bring your total under ₹{budget_limit:.0f}",
                    "action": "optimize_for_budget",
                    "action_label": "Fit to Budget"
                })
            else:
                over_budget = optimized_total - budget_limit
                recommendations.append({
                    "type": "budget_exceeded",
                    "priority": "high",
                    "icon": "⚠️",
                    "title": "Over Budget",
                    "message": f"Even with alternatives, you're ₹{over_budget:.0f} over budget. Consider removing some items.",
                    "action": "review_cart",
                    "action_label": "Review Cart"
                })
        
        # Recommendation 5: Already optimized
        items_at_best_price = [r for r in optimization_results if not r["has_alternatives"]]
        if items_at_best_price and len(items_at_best_price) == len(optimization_results):
            recommendations.append({
                "type": "already_optimal",
                "priority": "low",
                "icon": "✅",
                "title": "Best Prices Already!",
                "message": "All items in your cart are at the best available prices",
                "action": None,
                "action_label": None
            })
        elif items_at_best_price:
            recommendations.append({
                "type": "partial_optimal",
                "priority": "low",
                "icon": "✓",
                "title": "Some Items Optimized",
                "message": f"{len(items_at_best_price)} item(s) are already at best prices",
                "action": None,
                "action_label": None
            })
        
        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        recommendations.sort(key=lambda x: priority_order.get(x["priority"], 3))
        
        return recommendations
    
    def _analyze_budget(
        self,
        optimization_results: List[Dict],
        total_current: float,
        total_optimized: float,
        budget_limit: float
    ) -> Dict[str, Any]:
        """Analyze cart against budget limit."""
        
        is_within_budget = total_current <= budget_limit
        can_fit_with_alternatives = total_optimized <= budget_limit
        
        # Calculate what needs to be removed to fit budget
        items_to_remove = []
        if not can_fit_with_alternatives:
            remaining = total_optimized
            sorted_items = sorted(
                optimization_results,
                key=lambda x: x["current_total"] - x["potential_savings"],
                reverse=True
            )
            
            for item in sorted_items:
                if remaining <= budget_limit:
                    break
                item_cost = item["current_total"] - item["potential_savings"]
                items_to_remove.append({
                    "medicine_id": item["medicine_id"],
                    "medicine_name": item["medicine_name"],
                    "cost": item_cost
                })
                remaining -= item_cost
        
        return {
            "budget_limit": budget_limit,
            "current_total": round(total_current, 2),
            "optimized_total": round(total_optimized, 2),
            "is_within_budget": is_within_budget,
            "can_fit_with_alternatives": can_fit_with_alternatives,
            "amount_over_budget": round(max(0, total_current - budget_limit), 2),
            "amount_over_after_optimization": round(max(0, total_optimized - budget_limit), 2),
            "suggested_removals": items_to_remove if not can_fit_with_alternatives else []
        }
    
    def get_quick_alternative(
        self,
        medicine_id: str,
        quantity: int = 1,
        user_allergies: List[str] = None,
        current_medications: List[str] = None
    ) -> Optional[Dict]:
        """
        Get the best single alternative for a medicine.
        Quick lookup for UI hints (e.g., showing on add-to-cart).
        """
        medicines_collection = self._get_sync_collection("medicines")
        
        try:
            medicine = medicines_collection.find_one({"_id": ObjectId(medicine_id)})
        except Exception as e:
            logger.warning(f"Invalid medicine_id: {medicine_id}")
            return None
        
        if not medicine:
            return None
        
        alternatives = self._find_cheaper_alternatives(
            medicine=medicine,
            quantity=quantity,
            user_allergies=user_allergies,
            current_medications=current_medications,
            max_alternatives=1
        )
        
        if alternatives:
            alt = alternatives[0]
            return {
                "has_alternative": True,
                "alternative": alt,
                "savings_per_unit": alt["savings_per_unit"],
                "savings_percentage": alt["savings_percentage"],
                "message": f"Save ₹{alt['savings_per_unit']:.0f}/unit with {alt['name']}"
            }
        
        return {
            "has_alternative": False,
            "message": "This is the best price available"
        }
    
    def compare_medicines(
        self,
        medicine_id_1: str,
        medicine_id_2: str
    ) -> Dict[str, Any]:
        """
        Compare two medicines for detailed analysis.
        Useful when user wants to compare original vs alternative.
        """
        medicines_collection = self._get_sync_collection("medicines")
        
        try:
            med1 = medicines_collection.find_one({"_id": ObjectId(medicine_id_1)})
            med2 = medicines_collection.find_one({"_id": ObjectId(medicine_id_2)})
        except Exception as e:
            return {"success": False, "error": f"Invalid medicine ID: {e}"}
        
        if not med1:
            return {"success": False, "error": f"Medicine not found: {medicine_id_1}"}
        if not med2:
            return {"success": False, "error": f"Medicine not found: {medicine_id_2}"}
        
        price1 = med1.get("unit_price", 0)
        price2 = med2.get("unit_price", 0)
        price_diff = abs(price1 - price2)
        
        # Check equivalence
        same_generic = (
            med1.get("generic_name", "").lower().strip() == 
            med2.get("generic_name", "").lower().strip()
            and med1.get("generic_name", "") != ""
        )
        same_category = med1.get("category") == med2.get("category")
        same_dosage = med1.get("dosage", "").lower() == med2.get("dosage", "").lower()
        
        # Determine cheaper option
        cheaper_id = medicine_id_1 if price1 < price2 else medicine_id_2
        cheaper_name = med1["name"] if price1 < price2 else med2["name"]
        
        def format_medicine(med, med_id):
            return {
                "id": med_id,
                "name": med["name"],
                "generic_name": med.get("generic_name", ""),
                "brand": med.get("brand", ""),
                "category": med.get("category", ""),
                "dosage": med.get("dosage", ""),
                "unit_price": med.get("unit_price", 0),
                "manufacturer": med.get("manufacturer", ""),
                "prescription_required": med.get("prescription_required", False),
                "in_stock": med.get("stock_quantity", 0) > 0,
                "stock_quantity": med.get("stock_quantity", 0),
                "side_effects": med.get("side_effects", [])[:5],
                "image_url": med.get("image_url")
            }
        
        return {
            "success": True,
            "medicine_1": format_medicine(med1, medicine_id_1),
            "medicine_2": format_medicine(med2, medicine_id_2),
            "comparison": {
                "price_difference": round(price_diff, 2),
                "savings_percentage": round((price_diff / max(price1, price2)) * 100, 1) if max(price1, price2) > 0 else 0,
                "cheaper_option_id": cheaper_id,
                "cheaper_option_name": cheaper_name,
                "same_generic": same_generic,
                "same_category": same_category,
                "same_dosage": same_dosage,
                "equivalence_level": self._calculate_equivalence_level(same_generic, same_category, same_dosage),
                "recommendation": self._get_comparison_recommendation(med1, med2, price1, price2, same_generic)
            }
        }
    
    def _calculate_equivalence_level(self, same_generic: bool, same_category: bool, same_dosage: bool) -> str:
        """Calculate how equivalent two medicines are."""
        if same_generic and same_dosage:
            return "bioequivalent"  # Essentially the same medicine
        elif same_generic:
            return "therapeutically_equivalent"  # Same active ingredient
        elif same_category:
            return "same_class"  # Same type of medicine
        else:
            return "different"  # Different medicines
    
    def _get_comparison_recommendation(
        self,
        med1: Dict,
        med2: Dict,
        price1: float,
        price2: float,
        same_generic: bool
    ) -> str:
        """Generate recommendation for medicine comparison."""
        cheaper = med2["name"] if price1 > price2 else med1["name"]
        price_diff = abs(price1 - price2)
        
        if same_generic:
            if price_diff > 20:
                return f"✅ Both contain the same active ingredient. {cheaper} offers better value - save ₹{price_diff:.0f}."
            else:
                return f"✅ Both are bioequivalent with similar pricing. Either is a good choice."
        elif price_diff > 100:
            return f"⚠️ {cheaper} is significantly cheaper (₹{price_diff:.0f} less), but may have different composition. Consult your pharmacist."
        elif price_diff > 50:
            return f"ℹ️ {cheaper} is more economical. These are different formulations - check with your doctor if switching."
        else:
            return "ℹ️ Similar pricing. Please consult a pharmacist to understand the differences."
    
    def apply_optimization(
        self,
        cart_items: List[Dict],
        replacements: Dict[str, str],
        user_allergies: List[str] = None,
        current_medications: List[str] = None
    ) -> Dict[str, Any]:
        """
        Validate and prepare cart with selected replacements.
        
        Args:
            cart_items: Current cart items
            replacements: Dict mapping original_medicine_id -> replacement_medicine_id
            user_allergies: User's allergies
            current_medications: Current medications
            
        Returns:
            Validated optimized cart
        """
        medicines_collection = self._get_sync_collection("medicines")
        
        optimized_items = []
        total_savings = 0
        errors = []
        
        for cart_item in cart_items:
            original_id = cart_item.get("medicine_id")
            quantity = cart_item.get("quantity", 1)
            
            # Check if this item should be replaced
            if original_id in replacements:
                new_id = replacements[original_id]
                
                try:
                    new_medicine = medicines_collection.find_one({
                        "_id": ObjectId(new_id),
                        "is_active": True,
                        "stock_quantity": {"$gte": quantity}
                    })
                    original_medicine = medicines_collection.find_one({"_id": ObjectId(original_id)})
                    
                    if not new_medicine:
                        errors.append({
                            "medicine_id": new_id,
                            "error": "Replacement medicine not available or out of stock"
                        })
                        optimized_items.append(cart_item)  # Keep original
                        continue
                    
                    # Verify safety
                    if not self._is_safe_alternative(new_medicine, user_allergies, current_medications):
                        errors.append({
                            "medicine_id": new_id,
                            "error": "Replacement may not be safe due to allergies or interactions"
                        })
                        optimized_items.append(cart_item)  # Keep original
                        continue
                    
                    # Calculate savings
                    if original_medicine:
                        savings = (original_medicine.get("unit_price", 0) - new_medicine.get("unit_price", 0)) * quantity
                        total_savings += savings
                    
                    optimized_items.append({
                        "medicine_id": new_id,
                        "quantity": quantity,
                        "replaced_from": original_id
                    })
                    
                except Exception as e:
                    errors.append({
                        "medicine_id": new_id,
                        "error": str(e)
                    })
                    optimized_items.append(cart_item)
            else:
                optimized_items.append(cart_item)
        
        return {
            "success": len(errors) == 0,
            "optimized_items": optimized_items,
            "total_savings": round(total_savings, 2),
            "replacements_applied": len(replacements) - len(errors),
            "errors": errors
        }


# Singleton instance
_price_optimization_agent: Optional[PriceOptimizationAgent] = None


def get_price_optimization_agent() -> PriceOptimizationAgent:
    """Get or create price optimization agent instance."""
    global _price_optimization_agent
    
    if _price_optimization_agent is None:
        _price_optimization_agent = PriceOptimizationAgent()
    
    return _price_optimization_agent
"""
Medicine Agent - AI-powered medicine search and information
Now with semantic search capabilities (lazy loaded)
"""
from typing import Dict, Any, List, Optional
import time
import logging

from app.observability.tracer import get_langfuse
from app.agents.semantic_search import get_semantic_search

logger = logging.getLogger(__name__)


class MedicineAgent:
    """
    Medicine Agent with AI-powered search capabilities.
    
    Features:
    - Semantic search (understands intent)
    - Fuzzy matching
    - Category-based search
    - Alternative medicine suggestions
    - Stock checking
    """
    
    def __init__(self):
        self.langfuse = get_langfuse()
        self.semantic_search = get_semantic_search()
        self._semantic_initialized = False
    
    def _get_sync_collection(self, name: str):
        """Get collection with lazy import to avoid circular dependency"""
        from app.database.mongodb import get_sync_collection
        return get_sync_collection(name)
    
    def _ensure_semantic_initialized(self):
        """Lazy initialization of semantic search after DB is connected."""
        if self._semantic_initialized:
            return
        
        try:
            collection = self._get_sync_collection("medicines")
            medicines = list(collection.find({"is_active": True}).limit(500))
            
            if not medicines:
                logger.warning("No medicines found for indexing")
                return
            
            medicine_list = []
            for med in medicines:
                medicine_list.append({
                    "id": str(med["_id"]),
                    "name": med["name"],
                    "generic_name": med.get("generic_name", ""),
                    "brand": med.get("brand", ""),
                    "description": med.get("description", ""),
                    "category": med.get("category", ""),
                    "dosage": med.get("dosage", ""),
                    "price": med.get("unit_price", 0),
                    "stock": med.get("stock_quantity", 0),
                    "in_stock": med.get("stock_quantity", 0) > 0,
                    "prescription_required": med.get("prescription_required", False),
                    "side_effects": med.get("side_effects", []),
                    "image_url": med.get("image_url")
                })
            
            self.semantic_search.index_medicines(medicine_list)
            self._semantic_initialized = True
            logger.info(f"Medicine Agent initialized with {len(medicine_list)} medicines")
            
        except Exception as e:
            logger.warning(f"Semantic search not initialized: {e}")
            # Don't fail - just use database search as fallback
    
    def _log_operation(self, name: str, input_data: Any, output_data: Any, duration_ms: int):
        """Log operation to Langfuse"""
        if self.langfuse:
            try:
                trace = self.langfuse.trace(name=f"medicine_agent.{name}")
                trace.span(
                    name=name,
                    input=input_data,
                    output=output_data,
                    metadata={"duration_ms": duration_ms, "ai_powered": True}
                )
                self.langfuse.flush()
            except:
                pass
    
    def search_medicines(
        self, 
        query: str, 
        category: Optional[str] = None,
        limit: int = 10,
        use_semantic: bool = True
    ) -> Dict[str, Any]:
        """
        Search medicines using AI semantic search with database fallback.
        """
        start_time = time.time()
        
        # Ensure semantic search is initialized (lazy)
        if use_semantic and not self._semantic_initialized:
            self._ensure_semantic_initialized()
        
        # TRY SEMANTIC SEARCH FIRST
        if use_semantic and self.semantic_search.is_initialized:
            semantic_results = self.semantic_search.search(query, top_k=limit)
            
            if semantic_results:
                if category:
                    semantic_results = [r for r in semantic_results if r.get("category") == category]
                
                if semantic_results:
                    duration_ms = int((time.time() - start_time) * 1000)
                    
                    result = {
                        "found": True,
                        "count": len(semantic_results),
                        "medicines": semantic_results,
                        "query": query,
                        "search_type": "semantic_ai",
                        "duration_ms": duration_ms
                    }
                    
                    self._log_operation("semantic_search", {"query": query}, result, duration_ms)
                    return result
        
        # FALLBACK TO DATABASE SEARCH
        try:
            collection = self._get_sync_collection("medicines")
            
            search_filter = {
                "$or": [
                    {"name": {"$regex": query, "$options": "i"}},
                    {"generic_name": {"$regex": query, "$options": "i"}},
                    {"brand": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}}
                ],
                "is_active": True
            }
            
            if category:
                search_filter["category"] = category
            
            medicines = list(collection.find(search_filter).limit(limit))
            duration_ms = int((time.time() - start_time) * 1000)
            
            if not medicines:
                result = {
                    "found": False,
                    "message": f"No medicines found for '{query}'",
                    "medicines": [],
                    "query": query,
                    "search_type": "database",
                    "duration_ms": duration_ms
                }
                self._log_operation("search", {"query": query}, result, duration_ms)
                return result
            
            results = []
            for med in medicines:
                results.append({
                    "id": str(med["_id"]),
                    "name": med["name"],
                    "generic_name": med.get("generic_name", ""),
                    "brand": med.get("brand", ""),
                    "category": med.get("category", ""),
                    "dosage": med.get("dosage", ""),
                    "price": med.get("unit_price", 0),
                    "stock": med.get("stock_quantity", 0),
                    "in_stock": med.get("stock_quantity", 0) > 0,
                    "prescription_required": med.get("prescription_required", False),
                    "image_url": med.get("image_url"),
                    "search_type": "database"
                })
            
            result = {
                "found": True,
                "count": len(results),
                "medicines": results,
                "query": query,
                "search_type": "database",
                "duration_ms": duration_ms
            }
            
            self._log_operation("search", {"query": query, "category": category}, result, duration_ms)
            return result
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return {
                "found": False,
                "message": f"Search error: {str(e)}",
                "medicines": [],
                "query": query
            }
    
    def get_medicine_details(self, medicine_id: str) -> Dict[str, Any]:
        """Get full details of a medicine"""
        from bson import ObjectId
        
        start_time = time.time()
        
        try:
            collection = self._get_sync_collection("medicines")
            medicine = collection.find_one({"_id": ObjectId(medicine_id)})
            duration_ms = int((time.time() - start_time) * 1000)
            
            if not medicine:
                result = {"found": False, "message": "Medicine not found"}
                self._log_operation("get_details", {"medicine_id": medicine_id}, result, duration_ms)
                return result
            
            result = {
                "found": True,
                "medicine": {
                    "id": str(medicine["_id"]),
                    "name": medicine["name"],
                    "generic_name": medicine.get("generic_name", ""),
                    "brand": medicine.get("brand", ""),
                    "category": medicine.get("category", ""),
                    "dosage": medicine.get("dosage", ""),
                    "description": medicine.get("description", ""),
                    "price": medicine.get("unit_price", 0),
                    "stock": medicine.get("stock_quantity", 0),
                    "in_stock": medicine.get("stock_quantity", 0) > 0,
                    "prescription_required": medicine.get("prescription_required", False),
                    "contraindications": medicine.get("contraindications", []),
                    "drug_interactions": medicine.get("drug_interactions", []),
                    "side_effects": medicine.get("side_effects", []),
                    "max_daily_dosage": medicine.get("max_daily_dosage", ""),
                    "manufacturer": medicine.get("manufacturer", ""),
                    "image_url": medicine.get("image_url")
                },
                "duration_ms": duration_ms
            }
            
            self._log_operation("get_details", {"medicine_id": medicine_id}, result, duration_ms)
            return result
            
        except Exception as e:
            return {"found": False, "error": str(e)}
    
    def find_alternatives(self, medicine_id: str, limit: int = 5) -> List[Dict]:
        """Find alternative medicines using AI similarity."""
        start_time = time.time()
        
        # Ensure semantic search is initialized
        if not self._semantic_initialized:
            self._ensure_semantic_initialized()
        
        # Try semantic similarity first
        if self.semantic_search.is_initialized:
            similar = self.semantic_search.find_similar_medicines(medicine_id, top_k=limit)
            if similar:
                duration_ms = int((time.time() - start_time) * 1000)
                self._log_operation(
                    "find_alternatives_ai",
                    {"medicine_id": medicine_id},
                    {"count": len(similar)},
                    duration_ms
                )
                return similar
        
        # Fallback to category-based
        try:
            collection = self._get_sync_collection("medicines")
            
            from bson import ObjectId
            medicine = collection.find_one({"_id": ObjectId(medicine_id)})
            if not medicine:
                return []
            
            category = medicine.get("category")
            
            alternatives = list(collection.find({
                "is_active": True,
                "stock_quantity": {"$gt": 0},
                "category": category,
                "_id": {"$ne": ObjectId(medicine_id)}
            }).limit(limit))
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            result = [
                {
                    "id": str(med["_id"]),
                    "name": med["name"],
                    "price": med.get("unit_price", 0),
                    "in_stock": True,
                    "category": med.get("category", "")
                }
                for med in alternatives
            ]
            
            self._log_operation(
                "find_alternatives",
                {"medicine_id": medicine_id, "category": category},
                {"count": len(result)},
                duration_ms
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Find alternatives failed: {e}")
            return []
    
    def check_stock(self, medicine_id: str) -> Dict[str, Any]:
        """Check stock for a medicine"""
        from bson import ObjectId
        
        start_time = time.time()
        
        try:
            collection = self._get_sync_collection("medicines")
            medicine = collection.find_one({"_id": ObjectId(medicine_id)})
            duration_ms = int((time.time() - start_time) * 1000)
            
            if not medicine:
                return {"found": False, "in_stock": False}
            
            stock = medicine.get("stock_quantity", 0)
            
            result = {
                "found": True,
                "medicine_id": medicine_id,
                "medicine_name": medicine["name"],
                "stock": stock,
                "in_stock": stock > 0,
                "reorder_level": medicine.get("reorder_level", 50),
                "low_stock": stock <= medicine.get("reorder_level", 50),
                "duration_ms": duration_ms
            }
            
            self._log_operation("check_stock", {"medicine_id": medicine_id}, result, duration_ms)
            return result
            
        except Exception as e:
            return {"found": False, "error": str(e)}
    
    def get_search_stats(self) -> Dict[str, Any]:
        """Get search engine statistics."""
        return {
            "semantic_search": self.semantic_search.get_stats(),
            "semantic_initialized": self._semantic_initialized,
            "ai_powered": self.semantic_search.is_initialized
        }

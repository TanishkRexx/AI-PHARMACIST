"""
Medicine Agent - Handles medicine search and information
Uses direct OpenAI API for reliability
"""
from typing import Dict, Any, List, Optional
import json

from app.database.mongodb import get_sync_collection


class MedicineAgent:
    """
    Medicine Agent handles:
    - Searching medicines
    - Getting medicine details
    - Finding alternatives
    """
    
    def __init__(self):
        pass
    
    def search_medicines(
        self, 
        query: str, 
        category: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """Search medicines by name, generic name, or brand"""
        
        collection = get_sync_collection("medicines")
        
        # Build search filter
        search_filter = {
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"generic_name": {"$regex": query, "$options": "i"}},
                {"brand": {"$regex": query, "$options": "i"}}
            ],
            "is_active": True
        }
        
        if category:
            search_filter["category"] = category
        
        medicines = list(collection.find(search_filter).limit(limit))
        
        if not medicines:
            return {
                "found": False,
                "message": f"No medicines found for '{query}'",
                "medicines": []
            }
        
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
                "image_url": med.get("image_url")
            })
        
        return {
            "found": True,
            "count": len(results),
            "medicines": results
        }
    
    def get_medicine_details(self, medicine_id: str) -> Dict[str, Any]:
        """Get full details of a medicine"""
        from bson import ObjectId
        
        collection = get_sync_collection("medicines")
        
        try:
            medicine = collection.find_one({"_id": ObjectId(medicine_id)})
            
            if not medicine:
                return {"found": False, "message": "Medicine not found"}
            
            return {
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
                }
            }
        except Exception as e:
            return {"found": False, "error": str(e)}
    
    def find_alternatives(self, medicine_name: str, category: str = None) -> List[Dict]:
        """Find alternative medicines"""
        
        collection = get_sync_collection("medicines")
        
        # Search by generic name or category
        search_filter = {
            "is_active": True,
            "stock_quantity": {"$gt": 0},
            "name": {"$ne": medicine_name}
        }
        
        if category:
            search_filter["category"] = category
        
        alternatives = list(collection.find(search_filter).limit(5))
        
        return [
            {
                "id": str(med["_id"]),
                "name": med["name"],
                "price": med.get("unit_price", 0),
                "in_stock": True
            }
            for med in alternatives
        ]
    
    def check_stock(self, medicine_id: str) -> Dict[str, Any]:
        """Check stock for a medicine"""
        from bson import ObjectId
        
        collection = get_sync_collection("medicines")
        
        try:
            medicine = collection.find_one({"_id": ObjectId(medicine_id)})
            
            if not medicine:
                return {"found": False, "in_stock": False}
            
            stock = medicine.get("stock_quantity", 0)
            
            return {
                "found": True,
                "medicine_id": medicine_id,
                "medicine_name": medicine["name"],
                "stock": stock,
                "in_stock": stock > 0,
                "reorder_level": medicine.get("reorder_level", 50),
                "low_stock": stock <= medicine.get("reorder_level", 50)
            }
        except Exception as e:
            return {"found": False, "error": str(e)}
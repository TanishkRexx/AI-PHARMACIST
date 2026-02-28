"""
Pharmacy Inventory Management Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import re

from app.database.mongodb import get_database
from app.auth.dependencies import require_role
from app.auth.models import UserRole

router = APIRouter()


class MedicineCreate(BaseModel):
    name: str
    generic_name: str
    brand: str
    category: str
    dosage: str
    unit_price: float
    stock_quantity: int
    reorder_level: int = 50
    prescription_required: bool = False
    description: Optional[str] = None
    manufacturer: str
    contraindications: List[str] = []
    drug_interactions: List[str] = []
    side_effects: List[str] = []


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    unit_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    reorder_level: Optional[int] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


class StockUpdate(BaseModel):
    quantity: int
    operation: str = "add"
    reason: Optional[str] = None


def escape_regex(text: str) -> str:
    """
    Escape special regex characters in search string.
    Prevents regex errors when users type special characters.
    """
    # Escape all special regex characters
    special_chars = r'[\^$.*+?{}()|[\]\\]'
    return re.sub(special_chars, r'\\\g<0>', text)


@router.get("/inventory")
async def get_inventory(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    category: Optional[str] = None,
    stock_status: Optional[str] = None,  # "all", "low", "out", "ok"
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get pharmacy inventory with filters.
    """
    db = get_database()
    
    # ====================================
    # ALWAYS CALCULATE TOTAL STATS FIRST
    # (Regardless of filters)
    # ====================================
    
    total_stats = {
        "total": await db["medicines"].count_documents({"is_active": True}),
        "critical": await db["medicines"].count_documents({
            "is_active": True, 
            "stock_quantity": 0
        }),
        "low": await db["medicines"].count_documents({
            "is_active": True,
            "stock_quantity": {"$gt": 0},
            "$expr": {"$lte": ["$stock_quantity", "$reorder_level"]}
        }),
        "sufficient": await db["medicines"].count_documents({
            "is_active": True,
            "$expr": {"$gt": ["$stock_quantity", "$reorder_level"]}
        })
    }
    
    # ====================================
    # BUILD FILTER FOR CURRENT VIEW
    # ====================================
    
    filter_query = {"is_active": True}
    
    if search:
        # Escape special regex characters
        escaped_search = escape_regex(search.strip())
        if escaped_search:
            filter_query["$or"] = [
                {"name": {"$regex": escaped_search, "$options": "i"}},
                {"generic_name": {"$regex": escaped_search, "$options": "i"}},
                {"brand": {"$regex": escaped_search, "$options": "i"}}
            ]
    
    if category:
        filter_query["category"] = category
    
    if stock_status == "low":
        filter_query["stock_quantity"] = {"$gt": 0}
        filter_query["$expr"] = {"$lte": ["$stock_quantity", "$reorder_level"]}
    elif stock_status == "out":
        filter_query["stock_quantity"] = 0
    elif stock_status == "ok":
        filter_query["$expr"] = {"$gt": ["$stock_quantity", "$reorder_level"]}
    
    # Pagination
    skip = (page - 1) * limit
    
    try:
        # Count for current filter (for pagination)
        filtered_total = await db["medicines"].count_documents(filter_query)
        
        # Get medicines for current page
        cursor = db["medicines"].find(filter_query).sort("name", 1).skip(skip).limit(limit)
        medicines = await cursor.to_list(limit)
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": {
                "medicines": [],
                "pagination": {"total": 0, "page": page, "pages": 0},
                "stats": total_stats
            }
        }
    
    # Format results
    result = []
    for med in medicines:
        stock = med.get("stock_quantity", 0)
        reorder = med.get("reorder_level", 50)
        
        stock_status_label = (
            "out_of_stock" if stock == 0 else
            "low_stock" if stock <= reorder else
            "in_stock"
        )
        
        result.append({
            "id": str(med["_id"]),
            "name": med["name"],
            "generic_name": med.get("generic_name", ""),
            "brand": med.get("brand", ""),
            "category": med.get("category", ""),
            "dosage": med.get("dosage", ""),
            "unit_price": med.get("unit_price", 0),
            "stock_quantity": stock,
            "reorder_level": reorder,
            "stock_status": stock_status_label,
            "prescription_required": med.get("prescription_required", False),
            "manufacturer": med.get("manufacturer", "")
        })
    
    return {
        "success": True,
        "data": {
            "medicines": result,
            "pagination": {
                "total": filtered_total,
                "page": page,
                "pages": (filtered_total + limit - 1) // limit if filtered_total > 0 else 0
            },
            "stats": total_stats
        }
    }

@router.get("/inventory/{medicine_id}")
async def get_medicine(
    medicine_id: str,
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get medicine details.
    """
    db = get_database()
    
    try:
        medicine = await db["medicines"].find_one({"_id": ObjectId(medicine_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid medicine ID")
    
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    medicine["_id"] = str(medicine["_id"])
    medicine["id"] = medicine["_id"]
    
    return {"success": True, "data": medicine}


@router.post("/inventory")
async def add_medicine(
    medicine: MedicineCreate,
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Add new medicine to inventory.
    """
    db = get_database()
    
    # Check if medicine already exists
    existing = await db["medicines"].find_one({
        "name": {"$regex": f"^{medicine.name}$", "$options": "i"}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Medicine already exists")
    
    medicine_doc = {
        **medicine.model_dump(),
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db["medicines"].insert_one(medicine_doc)
    
    return {
        "success": True,
        "message": "Medicine added successfully",
        "data": {"id": str(result.inserted_id)}
    }


@router.put("/inventory/{medicine_id}")
async def update_medicine(
    medicine_id: str,
    update: MedicineUpdate,
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Update medicine details.
    """
    db = get_database()
    
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    try:
        result = await db["medicines"].update_one(
            {"_id": ObjectId(medicine_id)},
            {"$set": update_dict}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid medicine ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    return {"success": True, "message": "Medicine updated successfully"}


@router.post("/inventory/{medicine_id}/stock")
async def update_stock(
    medicine_id: str,
    stock_update: StockUpdate,
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Update stock quantity.
    """
    db = get_database()
    
    try:
        medicine = await db["medicines"].find_one({"_id": ObjectId(medicine_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid medicine ID")
    
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    current_stock = medicine.get("stock_quantity", 0)
    
    if stock_update.operation == "add":
        new_stock = current_stock + stock_update.quantity
    else:
        new_stock = max(0, current_stock - stock_update.quantity)
    
    await db["medicines"].update_one(
        {"_id": ObjectId(medicine_id)},
        {
            "$set": {
                "stock_quantity": new_stock,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Log stock movement
    await db["stock_movements"].insert_one({
        "medicine_id": medicine_id,
        "medicine_name": medicine["name"],
        "operation": stock_update.operation,
        "quantity": stock_update.quantity,
        "stock_before": current_stock,
        "stock_after": new_stock,
        "reason": stock_update.reason,
        "performed_by": current_user["_id"],
        "created_at": datetime.utcnow()
    })
    
    return {
        "success": True,
        "message": "Stock updated",
        "data": {
            "medicine_id": medicine_id,
            "previous_stock": current_stock,
            "new_stock": new_stock
        }
    }


@router.get("/inventory/alerts/low-stock")
async def get_low_stock_alerts(
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get low stock alerts.
    """
    db = get_database()
    
    # Low stock (above 0 but at or below reorder level)
    low_stock = await db["medicines"].find({
        "is_active": True,
        "stock_quantity": {"$gt": 0},
        "$expr": {"$lte": ["$stock_quantity", "$reorder_level"]}
    }).to_list(100)
    
    # Out of stock
    out_of_stock = await db["medicines"].find({
        "is_active": True,
        "stock_quantity": 0
    }).to_list(100)
    
    low_stock_list = []
    for med in low_stock:
        low_stock_list.append({
            "id": str(med["_id"]),
            "name": med["name"],
            "stock": med.get("stock_quantity", 0),
            "reorder_level": med.get("reorder_level", 50),
            "shortage": med.get("reorder_level", 50) - med.get("stock_quantity", 0)
        })
    
    out_of_stock_list = []
    for med in out_of_stock:
        out_of_stock_list.append({
            "id": str(med["_id"]),
            "name": med["name"],
            "reorder_level": med.get("reorder_level", 50)
        })
    
    return {
        "success": True,
        "data": {
            "low_stock": {
                "count": len(low_stock_list),
                "items": low_stock_list
            },
            "out_of_stock": {
                "count": len(out_of_stock_list),
                "items": out_of_stock_list
            }
        }
    }
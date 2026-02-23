"""
Customer Routes - E-commerce browsing (Medicines, Categories, Search)
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from bson import ObjectId

from app.database.mongodb import get_database
from app.auth.dependencies import get_current_active_user, require_role
from app.auth.models import UserRole

router = APIRouter()


@router.get("/medicines")
async def list_medicines(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    in_stock: Optional[bool] = None,
    prescription_required: Optional[bool] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = Query("name", enum=["name", "price", "stock"])
):
    """
    List all medicines with filtering and pagination.
    Public endpoint - no auth required.
    """
    db = get_database()
    collection = db["medicines"]
    
    # Build filter
    filter_query = {"is_active": True}
    
    if category:
        filter_query["category"] = category
    
    if in_stock is not None:
        if in_stock:
            filter_query["stock_quantity"] = {"$gt": 0}
        else:
            filter_query["stock_quantity"] = 0
    
    if prescription_required is not None:
        filter_query["prescription_required"] = prescription_required
    
    if min_price is not None:
        filter_query["unit_price"] = {"$gte": min_price}
    
    if max_price is not None:
        if "unit_price" in filter_query:
            filter_query["unit_price"]["$lte"] = max_price
        else:
            filter_query["unit_price"] = {"$lte": max_price}
    
    # Sort
    sort_field = "name" if sort_by == "name" else "unit_price" if sort_by == "price" else "stock_quantity"
    sort_order = 1 if sort_by == "name" else -1
    
    # Pagination
    skip = (page - 1) * limit
    
    # Get total count
    total = await collection.count_documents(filter_query)
    
    # Get medicines
    cursor = collection.find(filter_query).sort(sort_field, sort_order).skip(skip).limit(limit)
    medicines = await cursor.to_list(limit)
    
    # Format response
    result = []
    for med in medicines:
        result.append({
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
            "description": med.get("description", ""),
            "image_url": med.get("image_url")
        })
    
    return {
        "success": True,
        "data": {
            "medicines": result,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "pages": (total + limit - 1) // limit
            }
        }
    }


@router.get("/medicines/search")
async def search_medicines(
    q: str = Query(..., min_length=2, description="Search query"),
    category: Optional[str] = None,
    in_stock: bool = True,
    limit: int = Query(20, ge=1, le=50)
):
    """
    Search medicines by name, generic name, or brand.
    Public endpoint.
    """
    db = get_database()
    collection = db["medicines"]
    
    # Build search filter
    filter_query = {
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"generic_name": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}}
        ],
        "is_active": True
    }
    
    if category:
        filter_query["category"] = category
    
    if in_stock:
        filter_query["stock_quantity"] = {"$gt": 0}
    
    # Get medicines
    cursor = collection.find(filter_query).limit(limit)
    medicines = await cursor.to_list(limit)
    
    result = []
    for med in medicines:
        result.append({
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
        "success": True,
        "data": {
            "query": q,
            "count": len(result),
            "medicines": result
        }
    }


@router.get("/medicines/{medicine_id}")
async def get_medicine_details(medicine_id: str):
    """
    Get detailed information about a specific medicine.
    Public endpoint.
    """
    db = get_database()
    collection = db["medicines"]
    
    try:
        medicine = await collection.find_one({"_id": ObjectId(medicine_id), "is_active": True})
    except:
        raise HTTPException(status_code=400, detail="Invalid medicine ID")
    
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    return {
        "success": True,
        "data": {
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
            "manufacturer": medicine.get("manufacturer", ""),
            "contraindications": medicine.get("contraindications", []),
            "drug_interactions": medicine.get("drug_interactions", []),
            "side_effects": medicine.get("side_effects", []),
            "max_daily_dosage": medicine.get("max_daily_dosage", ""),
            "image_url": medicine.get("image_url")
        }
    }


@router.get("/categories")
async def list_categories():
    """
    List all medicine categories.
    Public endpoint.
    """
    categories = [
        {"id": "painkiller", "name": "Painkillers", "icon": "💊"},
        {"id": "antibiotic", "name": "Antibiotics", "icon": "🦠"},
        {"id": "antidiabetic", "name": "Diabetes Care", "icon": "🩸"},
        {"id": "cardiovascular", "name": "Heart & BP", "icon": "❤️"},
        {"id": "respiratory", "name": "Respiratory", "icon": "🫁"},
        {"id": "gastrointestinal", "name": "Digestive Health", "icon": "🍽️"},
        {"id": "vitamin", "name": "Vitamins & Supplements", "icon": "🌟"},
        {"id": "dermatological", "name": "Skin Care", "icon": "🧴"},
        {"id": "other", "name": "Other", "icon": "📦"}
    ]
    
    return {
        "success": True,
        "data": {"categories": categories}
    }


@router.get("/medicines/category/{category}")
async def get_medicines_by_category(
    category: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """
    Get medicines by category.
    Public endpoint.
    """
    db = get_database()
    collection = db["medicines"]
    
    filter_query = {
        "category": category,
        "is_active": True,
        "stock_quantity": {"$gt": 0}
    }
    
    skip = (page - 1) * limit
    total = await collection.count_documents(filter_query)
    
    cursor = collection.find(filter_query).skip(skip).limit(limit)
    medicines = await cursor.to_list(limit)
    
    result = []
    for med in medicines:
        result.append({
            "id": str(med["_id"]),
            "name": med["name"],
            "generic_name": med.get("generic_name", ""),
            "brand": med.get("brand", ""),
            "dosage": med.get("dosage", ""),
            "price": med.get("unit_price", 0),
            "in_stock": True,
            "prescription_required": med.get("prescription_required", False),
            "image_url": med.get("image_url")
        })
    
    return {
        "success": True,
        "data": {
            "category": category,
            "medicines": result,
            "pagination": {
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit
            }
        }
    }
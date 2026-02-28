"""
Pharmacy Procurement Routes - Order from Distributor
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from app.database.mongodb import get_database
from app.auth.dependencies import require_role
from app.auth.models import UserRole
from app.utils.helpers import generate_po_number

router = APIRouter()


class ProcurementItemRequest(BaseModel):
    medicine_id: str
    quantity: int


class CreateProcurementRequest(BaseModel):
    items: List[ProcurementItemRequest]
    notes: Optional[str] = None

class UpdateProcurementStatus(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    expected_delivery: Optional[str] = None

@router.get("/procurement")
async def get_procurement_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get all procurement orders.
    """
    db = get_database()
    
    filter_query = {}
    if status:
        filter_query["status"] = status
    
    skip = (page - 1) * limit
    total = await db["procurement_orders"].count_documents(filter_query)
    
    cursor = db["procurement_orders"].find(filter_query).sort("created_at", -1).skip(skip).limit(limit)
    orders = await cursor.to_list(limit)
    
    result = []
    for order in orders:
        result.append({
            "id": str(order["_id"]),
            "po_number": order["po_number"],
            "items_count": len(order.get("items", [])),
            "total_amount": order.get("total_amount", 0),
            "status": order.get("status", "pending"),
            "tracking_number": order.get("tracking_number"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        })
    
    return {
        "success": True,
        "data": {
            "orders": result,
            "pagination": {
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit
            }
        }
    }


@router.post("/procurement")
async def create_procurement_order(
    request: CreateProcurementRequest,
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Create procurement order to restock inventory.
    """
    db = get_database()
    
    if not request.items:
        raise HTTPException(status_code=400, detail="No items provided")
    
    # Build order items
    order_items = []
    subtotal = 0
    
    for item in request.items:
        try:
            medicine = await db["medicines"].find_one({"_id": ObjectId(item.medicine_id)})
        except:
            raise HTTPException(status_code=400, detail=f"Invalid medicine ID: {item.medicine_id}")
        
        if not medicine:
            raise HTTPException(status_code=404, detail=f"Medicine not found: {item.medicine_id}")
        
        # Wholesale cost (70% of retail)
        unit_cost = medicine.get("unit_price", 0) * 0.7
        item_subtotal = unit_cost * item.quantity
        subtotal += item_subtotal
        
        order_items.append({
            "medicine_id": item.medicine_id,
            "medicine_name": medicine["name"],
            "current_stock": medicine.get("stock_quantity", 0),
            "reorder_level": medicine.get("reorder_level", 50),
            "quantity_ordered": item.quantity,
            "unit_cost": round(unit_cost, 2),
            "subtotal": round(item_subtotal, 2)
        })
    
    # Calculate totals
    tax_amount = round(subtotal * 0.05, 2)  # 5% tax
    total_amount = round(subtotal + tax_amount, 2)
    
    # Create order
    order = {
        "po_number": generate_po_number(),
        "items": order_items,
        "subtotal": round(subtotal, 2),
        "tax_amount": tax_amount,
        "shipping_cost": 0,
        "total_amount": total_amount,
        "status": "pending",
        "notes": request.notes,
        "created_by": current_user["_id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db["procurement_orders"].insert_one(order)
    
    return {
        "success": True,
        "message": "Procurement order created",
        "data": {
            "id": str(result.inserted_id),
            "po_number": order["po_number"],
            "total_amount": total_amount,
            "items_count": len(order_items)
        }
    }


@router.get("/procurement/{po_id}")
async def get_procurement_order(
    po_id: str,
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get procurement order details.
    """
    db = get_database()
    
    try:
        order = await db["procurement_orders"].find_one({"_id": ObjectId(po_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order["_id"] = str(order["_id"])
    order["id"] = order["_id"]
    
    if order.get("created_at"):
        order["created_at"] = order["created_at"].isoformat()
    if order.get("shipped_at"):
        order["shipped_at"] = order["shipped_at"].isoformat()
    if order.get("delivered_at"):
        order["delivered_at"] = order["delivered_at"].isoformat()
    
    return {"success": True, "data": order}


@router.post("/procurement/{po_id}/receive")
async def receive_procurement(
    po_id: str,
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Mark procurement order as received and update inventory.
    """
    db = get_database()
    
    try:
        order = await db["procurement_orders"].find_one({"_id": ObjectId(po_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("status") == "delivered":
        raise HTTPException(status_code=400, detail="Order already received")
    
    # Update inventory
    for item in order.get("items", []):
        await db["medicines"].update_one(
            {"_id": ObjectId(item["medicine_id"])},
            {
                "$inc": {"stock_quantity": item["quantity_ordered"]},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Log stock movement
        medicine = await db["medicines"].find_one({"_id": ObjectId(item["medicine_id"])})
        
        await db["stock_movements"].insert_one({
            "medicine_id": item["medicine_id"],
            "medicine_name": item["medicine_name"],
            "operation": "add",
            "quantity": item["quantity_ordered"],
            "stock_before": medicine.get("stock_quantity", 0) - item["quantity_ordered"],
            "stock_after": medicine.get("stock_quantity", 0),
            "reason": f"Procurement received: {order['po_number']}",
            "performed_by": current_user["_id"],
            "created_at": datetime.utcnow()
        })
    
    # Update order status
    await db["procurement_orders"].update_one(
        {"_id": ObjectId(po_id)},
        {
            "$set": {
                "status": "delivered",
                "delivered_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Procurement received and inventory updated",
        "data": {
            "po_number": order["po_number"],
            "items_received": len(order.get("items", []))
        }
    }


@router.get("/procurement/suggestions/reorder")
async def get_reorder_suggestions(
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Get AI suggestions for reordering.
    """
    db = get_database()
    
    # Get low stock and out of stock items
    medicines = await db["medicines"].find({
        "is_active": True,
        "$expr": {"$lte": ["$stock_quantity", "$reorder_level"]}
    }).to_list(100)
    
    suggestions = []
    for med in medicines:
        current = med.get("stock_quantity", 0)
        reorder_level = med.get("reorder_level", 50)
        
        # Suggest ordering 2x reorder level
        suggested_qty = (reorder_level * 2) - current
        
        priority = "critical" if current == 0 else "high" if current < reorder_level / 2 else "medium"
        
        suggestions.append({
            "medicine_id": str(med["_id"]),
            "medicine_name": med["name"],
            "current_stock": current,
            "reorder_level": reorder_level,
            "suggested_quantity": max(suggested_qty, reorder_level),
            "priority": priority,
            "estimated_cost": round(med.get("unit_price", 0) * 0.7 * suggested_qty, 2)
        })
    
    # Sort by priority
    priority_order = {"critical": 0, "high": 1, "medium": 2}
    suggestions.sort(key=lambda x: priority_order.get(x["priority"], 3))
    
    return {
        "success": True,
        "data": {
            "suggestions": suggestions,
            "total_items": len(suggestions)
        }
    }

@router.put("/procurement/{po_id}/status")
async def update_procurement_status(
    po_id: str,
    update: UpdateProcurementStatus,
    current_user: dict = Depends(require_role([UserRole.PHARMACY]))
):
    """
    Update procurement order status.
    Used for simulation/testing or manual status updates.
    """
    db = get_database()
    
    valid_statuses = ["pending", "approved", "shipped", "delivered", "cancelled"]
    
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid_statuses}")
    
    try:
        order = await db["procurement_orders"].find_one({"_id": ObjectId(po_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        "status": update.status,
        "updated_at": datetime.utcnow()
    }
    
    # Set timestamps based on status
    if update.status == "approved":
        update_data["approved_at"] = datetime.utcnow()
    elif update.status == "shipped":
        update_data["shipped_at"] = datetime.utcnow()
        # Generate tracking number if not provided
        if update.tracking_number:
            update_data["tracking_number"] = update.tracking_number
        else:
            update_data["tracking_number"] = f"TRK{generate_po_number().replace('PO-', '')}"
        if update.carrier:
            update_data["carrier"] = update.carrier
        if update.expected_delivery:
            update_data["expected_delivery"] = update.expected_delivery
    elif update.status == "delivered":
        update_data["delivered_at"] = datetime.utcnow()
    
    await db["procurement_orders"].update_one(
        {"_id": ObjectId(po_id)},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": f"Order status updated to {update.status}",
        "data": {
            "po_number": order["po_number"],
            "new_status": update.status,
            "tracking_number": update_data.get("tracking_number")
        }
    }
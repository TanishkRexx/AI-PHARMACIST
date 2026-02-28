from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime
from typing import Optional

# Adjust these imports to match your project structure
from app.database.mongodb import get_database
from app.auth import get_current_active_user

router = APIRouter()


# ─────────────────────────────────────────────
# REQUEST SCHEMA
# ─────────────────────────────────────────────

class AddPrescriptionItemToCartRequest(BaseModel):
    prescription_id: str   # the prescription this medicine belongs to
    medicine_name: str     # used to look up the actual medicine in medicines collection
    quantity: int          # parsed integer from "8 tab" → 8, default 1


# ─────────────────────────────────────────────
# HELPER: parse int from strings like "8 tab"
# ─────────────────────────────────────────────

def parse_quantity(quantity_str: str) -> int:
    """Extract leading integer from strings like '8 tab', '10 capsules', '3'."""
    import re
    if not quantity_str:
        return 1
    match = re.search(r"\d+", str(quantity_str))
    return int(match.group()) if match else 1


# ─────────────────────────────────────────────
# POST /cart/add-from-prescription
# ─────────────────────────────────────────────

@router.post("/cart/add-from-prescription")
async def add_prescription_item_to_cart(
    request: AddPrescriptionItemToCartRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Add a medicine from a prescription to the cart.

    Flow:
    1. Validate the prescription belongs to the current user
    2. Confirm the medicine_name exists in that prescription
    3. Look up the medicine in the medicines collection by name (case-insensitive)
    4. Check stock
    5. Add to or update the user's cart
    """
    db = get_database()
    user_id = current_user["_id"]

    # ── Step 1: Validate prescription ownership ──────────────────
    try:
        prescription = await db["prescriptions"].find_one({
            "_id": ObjectId(request.prescription_id)
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid prescription ID")

    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Ensure this prescription belongs to the current user
    if str(prescription.get("patient_id")) != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied to this prescription")

    # ── Step 2: Confirm medicine exists in this prescription ──────
    prescription_medicines = await db["prescription_medicines"].find(
        {"prescription_id": request.prescription_id}
    ).to_list(length=None)

    prescribed_med = next(
        (m for m in prescription_medicines
         if m.get("medicine_name", "").lower() == request.medicine_name.lower()),
        None
    )

    if not prescribed_med:
        raise HTTPException(
            status_code=404,
            detail=f"'{request.medicine_name}' not found in this prescription"
        )

    # Use prescribed quantity if frontend sends 0 or doesn't send
    prescribed_qty = parse_quantity(str(prescribed_med.get("quantity", "1")))
    quantity_to_add = request.quantity if request.quantity > 0 else prescribed_qty

    # ── Step 3: Look up medicine in medicines collection by name ──
    medicine = await db["medicines"].find_one({
        "name": {"$regex": f"^{request.medicine_name}$", "$options": "i"},
        "is_active": True
    })

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail=f"Medicine '{request.medicine_name}' is not available in the store"
        )

    medicine_id = medicine["_id"]

    # ── Step 4: Check stock ───────────────────────────────────────
    available_stock = medicine.get("stock_quantity", 0)
    if available_stock < quantity_to_add:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock for '{request.medicine_name}'. Available: {available_stock}"
        )

    # ── Step 5: Find or create cart ───────────────────────────────
    cart = await db["carts"].find_one({"user_id": user_id})

    if not cart:
        # Create a fresh cart
        new_cart = {
            "user_id": user_id,
            "items": [
                {
                    "medicine_id": medicine_id,
                    "medicine_name": medicine.get("name"),
                    "quantity": quantity_to_add,
                    "price": medicine.get("price", 0),
                    "prescription_id": request.prescription_id,
                    "added_at": datetime.utcnow(),
                }
            ],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await db["carts"].insert_one(new_cart)

        return {
            "message": f"'{medicine.get('name')}' added to cart",
            "medicine_name": medicine.get("name"),
            "quantity_added": quantity_to_add,
        }

    # Cart exists — check if this medicine is already in it
    existing_items = cart.get("items", [])
    existing_index = next(
        (idx for idx, item in enumerate(existing_items)
         if str(item.get("medicine_id")) == str(medicine_id)),
        None
    )

    if existing_index is not None:
        # Medicine already in cart — increase quantity
        new_quantity = existing_items[existing_index]["quantity"] + quantity_to_add

        # Re-check stock for the new total
        if available_stock < new_quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot add {quantity_to_add} more. "
                    f"Already have {existing_items[existing_index]['quantity']} in cart. "
                    f"Available stock: {available_stock}"
                )
            )

        await db["carts"].update_one(
            {"user_id": user_id},
            {
                "$set": {
                    f"items.{existing_index}.quantity": new_quantity,
                    "updated_at": datetime.utcnow(),
                }
            }
        )

        return {
            "message": f"'{medicine.get('name')}' quantity updated in cart",
            "medicine_name": medicine.get("name"),
            "quantity_in_cart": new_quantity,
        }

    else:
        # New item — push to cart items array
        new_item = {
            "medicine_id": medicine_id,
            "medicine_name": medicine.get("name"),
            "quantity": quantity_to_add,
            "price": medicine.get("price", 0),
            "prescription_id": request.prescription_id,
            "added_at": datetime.utcnow(),
        }

        await db["carts"].update_one(
            {"user_id": user_id},
            {
                "$push": {"items": new_item},
                "$set": {"updated_at": datetime.utcnow()},
            }
        )

        return {
            "message": f"'{medicine.get('name')}' added to cart",
            "medicine_name": medicine.get("name"),
            "quantity_added": quantity_to_add,
        }
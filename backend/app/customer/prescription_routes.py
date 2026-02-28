from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import os
import uuid
import shutil

from app.database.mongodb import get_database
from app.agents.ocr import process_prescription


router = APIRouter()

# ✅ Define upload directory (absolute path recommended)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "prescriptions")

# ✅ Create directory if it doesn't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)


def serialize_doc(doc):
    """Convert MongoDB document ObjectId fields to strings."""
    if doc is None:
        return None
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
    return doc


@router.post("/upload-prescription")
async def upload_prescription(
    file: UploadFile = File(...),
    user_id :str
):
    """
    Upload prescription image/pdf locally and process with OCR.
    """
    patient_id = user_id

    # ✅ Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only image (jpg/png) or pdf files are allowed"
        )

    # ✅ Validate file size (max 10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 10MB limit"
        )

    db = get_database()

    # 📁 Generate unique file name
    original_filename = file.filename or "prescription"
    ext = original_filename.split(".")[-1].lower()
    
    # Validate extension
    if ext not in ["jpg", "jpeg", "png", "pdf"]:
        ext = "jpg"  # default fallback
    
    unique_filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # 💾 Save file locally
    try:
        with open(file_path, "wb") as f:
            f.write(content)
        print(f"✅ File saved locally: {file_path}")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )

    # ✅ Verify file was saved
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=500,
            detail="File was not saved properly"
        )

    file_type = "pdf" if file.content_type == "application/pdf" else "image"

    # ✅ Process with OCR
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyBm8bs5rWVkcWORyNmNHL3QZft9wA8ez9c"

    try:
        result = await process_prescription(file_path, api_key=GEMINI_API_KEY)
    except Exception as e:
        # ❌ Delete file if OCR fails (optional)
        # os.remove(file_path)
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}"
        )

    # 🧾 Insert prescription record
    prescription_data = {
        "patient_id": patient_id,
        "prescription_file_url": file_path,  # Local path
        "prescription_filename": unique_filename,  # Just filename
        "original_filename": original_filename,
        "prescription_file_type": file_type,
        "patient_name": result.get('patient', {}).get('name'),
        "issued_date": result.get('prescription_date'),
        "expired_date": result.get('follow_up_date'),
        "diagnosis": result.get('diagnosis'),
        "doctors_note": result.get('advice'),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    insert_result = await db["prescriptions"].insert_one(prescription_data)
    prescription_id = insert_result.inserted_id

    # Create doctor_prescription record
    doctor_data = result.get('doctor', {})
    hospital_data = result.get('hospital', {})

    doc_prescription_info = {
        "prescription_id": prescription_id,
        "name": doctor_data.get('name'),
        "qualification": doctor_data.get('qualification'),
        "clinic_name": hospital_data.get('name'),
        "clinic_no": hospital_data.get('phone'),
        "license_number": doctor_data.get('license_number'),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    await db['doctor_prescription'].insert_one(doc_prescription_info)

    # Insert medicines
    medicines = result.get('medicines', [])
    for med in medicines:
        medicine_info = {
            "prescription_id": prescription_id,
            "medicine_name": med.get('name'),
            "dosage": med.get('dosage'),
            "frequency": med.get('frequency'),
            "quantity": med.get('total_quantity'),
            "indications": med.get('indications'),
            "instructions": med.get('instructions'),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db['prescribed_medicine'].insert_one(medicine_info)

    return {
        "success": True,
        "message": "Prescription uploaded successfully",
        "prescription_id": str(prescription_id),
        "file_type": file_type,
        "filename": unique_filename,
        "file_path": file_path,
        "file_size": len(content),
        "ocr_result": result
    }


# ✅ Optional: Route to serve/download uploaded prescription image
@router.get("/prescription-image/{filename}")
async def get_prescription_image(
    filename: str,
    patient_id: str
):
    """
    Serve prescription image from local storage.
    """
    file_path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    # Determine media type
    ext = filename.split(".")[-1].lower()
    media_types = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "pdf": "application/pdf"
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
    )


# ✅ Optional: Delete prescription and its image
@router.delete("/prescription/{prescription_id}")
async def delete_prescription(
    prescription_id: str,
    patient_id: str 
):
    """
    Delete prescription and its associated image file.
    """
    db = get_database()
    patient_id = patient["_id"]

    try:
        presc_obj_id = ObjectId(prescription_id)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid prescription ID"
        )

    # Find prescription
    prescription = await db["prescriptions"].find_one({
        "_id": presc_obj_id,
        "patient_id": patient_id
    })

    if not prescription:
        raise HTTPException(
            status_code=404,
            detail="Prescription not found"
        )

    # Delete local file
    file_path = prescription.get("prescription_file_url")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
            print(f"✅ File deleted: {file_path}")
        except Exception as e:
            print(f"⚠️ Failed to delete file: {e}")

    # Delete from database
    await db["prescriptions"].delete_one({"_id": presc_obj_id})
    await db["doctor_prescription"].delete_many({"prescription_id": presc_obj_id})
    await db["prescribed_medicine"].delete_many({"prescription_id": presc_obj_id})

    return {
        "success": True,
        "message": "Prescription deleted successfully"
    }
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId
import traceback
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
import os
import uuid
import shutil

from app.database.mongodb import get_database
from app.agents.ocr import process_prescription_sync


router = APIRouter()

UPLOAD_DIR = "uploads/prescriptions"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload-prescription")
async def upload_prescription(
    user_id: str = Form(...),
    file: UploadFile = File(...)
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
    MAX_FILE_SIZE = 10 * 1024 * 1024
    content = await file.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 10MB limit"
        )

    # 📁 Generate unique file name
    original_filename = file.filename or "prescription"
    ext = original_filename.split(".")[-1].lower()
    
    if ext not in ["jpg", "jpeg", "png", "pdf"]:
        ext = "jpg"
    
    unique_filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # 💾 Save file locally
    try:
        with open(file_path, "wb") as f:
            f.write(content)
        print(f"✅ File saved: {file_path}")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )

    file_type = "pdf" if file.content_type == "application/pdf" else "image"

    # ✅ Step 1: Process with OCR
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyB-WiUZT4LPR_a24Z4cOI9molOQZaJQO2c"
    print(f"🔑 API Key exists: {bool(GEMINI_API_KEY)}")
    print(f"🔑 API Key (first 10 chars): {GEMINI_API_KEY[:10]}...")

    try:
        print("🔄 Starting OCR processing...")
        result = process_prescription_sync(file_path, api_key=GEMINI_API_KEY)
        print(f"✅ OCR Result: {result}")
    except Exception as e:
        print(f"❌ OCR Error: {str(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}"
        )

    # ✅ Step 2: Database connection
    try:
        print("🔄 Getting database connection...")
        db = get_database()
        print(f"✅ Database connected: {db}")
    except Exception as e:
        print(f"❌ Database Error: {str(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(e)}"
        )

    # ✅ Step 3: Insert prescription record
    try:
        print("🔄 Inserting prescription...")
        prescription_data = {
            "patient_id": patient_id,
            "prescription_file_url": file_path,
            "prescription_filename": unique_filename,
            "original_filename": original_filename,
            "prescription_file_type": file_type,
            "patient_name": result.get('patient', {}).get('name') if result.get('patient') else None,
            "issued_date": result.get('prescription_date'),
            "expired_date": result.get('follow_up_date'),
            "diagnosis": result.get('diagnosis'),
            "doctors_note": result.get('advice'),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        print(f"📝 Prescription data: {prescription_data}")

        insert_result = await db["prescriptions"].insert_one(prescription_data)
        prescription_id = insert_result.inserted_id
        print(f"✅ Prescription inserted: {prescription_id}")
    except Exception as e:
        print(f"❌ Prescription Insert Error: {str(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to insert prescription: {str(e)}"
        )

    # ✅ Step 4: Insert doctor record
    try:
        print("🔄 Inserting doctor info...")
        doctor_data = result.get('doctor') or {}
        hospital_data = result.get('hospital') or {}

        doc_prescription_info = {
            "prescription_id": prescription_id,
            "name": doctor_data.get('name') if doctor_data else None,
            "qualification": doctor_data.get('qualification') if doctor_data else None,
            "clinic_name": hospital_data.get('name') if hospital_data else None,
            "clinic_no": hospital_data.get('phone') if hospital_data else None,
            "license_number": doctor_data.get('license_number') if doctor_data else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        print(f"📝 Doctor data: {doc_prescription_info}")

        await db['doctor_prescription'].insert_one(doc_prescription_info)
        print("✅ Doctor info inserted")
    except Exception as e:
        print(f"❌ Doctor Insert Error: {str(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to insert doctor info: {str(e)}"
        )

    # ✅ Step 5: Insert medicines
    try:
        print("🔄 Inserting medicines...")
        medicines = result.get('medicines') or []
        print(f"📝 Medicines count: {len(medicines)}")

        for i, med in enumerate(medicines):
            medicine_info = {
                "prescription_id": prescription_id,
                "medicine_name": med.get('name') if med else None,
                "dosage": med.get('dosage') if med else None,
                "frequency": med.get('frequency') if med else None,
                "quantity": med.get('total_quantity') if med else None,
                "indications": med.get('indications') if med else None,
                "instructions": med.get('instructions') if med else None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db['prescribed_medicine'].insert_one(medicine_info)
            print(f"✅ Medicine {i+1} inserted")
        
        print("✅ All medicines inserted")
    except Exception as e:
        print(f"❌ Medicine Insert Error: {str(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to insert medicines: {str(e)}"
        )

    print("✅ All operations completed successfully!")
    
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
@router.get("/prescription-info")
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
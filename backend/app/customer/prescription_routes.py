from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from app.database.mongodb import get_database

from google import genai
from google.genai import types
from app.config import settings

from bson import ObjectId



router = APIRouter()


# ---------------- Gemini Setup ----------------

GEMINI_API_KEY = settings.GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

# ---------------- Pydantic Schemas ----------------


class Medication(BaseModel):
    name: Optional[str]
    dosage: Optional[str]
    frequency: Optional[str]
    total_quantity: Optional[str]
    indications: Optional[str]
    instructions: Optional[str]


class Patient(BaseModel):
    name: Optional[str]


class Doctor(BaseModel):
    name: Optional[str]
    qualification: Optional[str]
    license_number: Optional[str]


class Hospital(BaseModel):
    name: Optional[str]
    phone: Optional[str]


class PrescriptionData(BaseModel):
    patient: Optional[Patient]
    doctor: Optional[Doctor]
    hospital: Optional[Hospital]
    prescription_date: Optional[str]
    follow_up_date: Optional[str]
    diagnosis: Optional[str]
    advice: Optional[str]
    medicines: List[Medication] = []


# ---------------- OCR Function ----------------


async def read_prescription_ocr(file: UploadFile = File(...)):

    contents = await file.read()
    
    # This configuration forces Gemini to return structured JSON
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=[
            types.Part.from_bytes(data=contents, mime_type="image/jpeg"),
            "Extract the medical details from this prescription."
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=PrescriptionData,
        ),
    )
    return response.parsed


# ---------------- Route ----------------


@router.post("/upload-prescription")
async def process_prescription(
    patient_id: str = Form(...),
    file: UploadFile = File(...)
):

    # -------- OCR (wrapped to catch Gemini 503 and other AI errors) --------
    try:
        result = await read_prescription_ocr(file)
    except Exception as e:
        error_msg = str(e)

        # Gemini 503 — model overloaded
        if "503" in error_msg or "UNAVAILABLE" in error_msg or "high demand" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="The AI model is currently overloaded. Please wait a moment and try uploading again."
            )

        # Gemini 429 — rate limit
        if "429" in error_msg or "quota" in error_msg.lower() or "rate" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="Too many requests to the AI model. Please wait a few seconds and try again."
            )

        # Any other OCR / AI failure
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read prescription: {error_msg}"
        )

    # -------- Insert Prescription --------

    prescription_data = {
        "patient_id": patient_id,
        "prescription_filename": file.filename,
        "original_filename": file.filename,
        "prescription_file_type": file.content_type,
        "patient_name": result.patient.name if result.patient else None,
        "issued_date": result.prescription_date,
        "expired_date": result.follow_up_date,
        "diagnosis": result.diagnosis,
        "doctors_note": result.advice,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }

    db = get_database()

    insert_result = await db["prescriptions"].insert_one(prescription_data)
    prescription_id = insert_result.inserted_id

    # -------- Insert Doctor --------

    doctor = result.doctor
    hospital = result.hospital

    doc_prescription_info = {
        "prescription_id": prescription_id,
        "name": doctor.name if doctor else None,
        "qualification": doctor.qualification if doctor else None,
        "clinic_name": hospital.name if hospital else None,
        "clinic_no": hospital.phone if hospital else None,
        "license_number": doctor.license_number if doctor else None,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }

    await db["doctor_prescription"].insert_one(doc_prescription_info)

    # -------- Insert Medicines --------

    for med in result.medicines or []:
        medicine_info = {
            "prescription_id": prescription_id,
            "medicine_name": med.name,
            "dosage": med.dosage,
            "frequency": med.frequency,
            "quantity": med.total_quantity,
            "indications": med.indications,
            "instructions": med.instructions,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

        await db["medicines_prescription"].insert_one(medicine_info)

    return {
        "message": "Prescription processed successfully",
        "prescription_id": str(prescription_id),
        "data": result
    }
    
    
    
@router.get('/show-prescription')
async def show_prescription(patient_id: str):

    db = get_database()

    prescription = await db["prescriptions"].find_one(
        {"patient_id": patient_id},
        sort=[("created_at", -1)]
    )

    if not prescription:
        return {"message": "No prescription found"}

    prescription_id_obj = prescription["_id"]      # Keep as ObjectId for querying
    prescription["_id"] = str(prescription_id_obj) # Convert only for response

    doc_info = await db['doctor_prescription'].find_one({
        "prescription_id": prescription_id_obj  # Use ObjectId here
    })

    if doc_info:
        doc_info["_id"] = str(doc_info["_id"])
        doc_info["prescription_id"] = str(doc_info["prescription_id"])

    medicine_info = await db['medicines_prescription'].find({
        "prescription_id": prescription_id_obj  # Use ObjectId here
    }).to_list(length=1000)

    for med in medicine_info:
        med["_id"] = str(med["_id"])
        med["prescription_id"] = str(med["prescription_id"])

    return {
        "prescription": prescription,
        "doc_info": doc_info,
        "medicine_info": medicine_info
    }

@router.put('/update-prescription')
async def update_prescription(patient_id:str):
    pass
        
    
    
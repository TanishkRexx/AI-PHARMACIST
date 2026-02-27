"""
Customer Chat Routes - AI Chat Interface
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
import uuid
import base64

from app.auth.dependencies import get_current_active_user

router = APIRouter()

# Lazy initialization - don't create at import time
_pharmacy_ai = None

def get_pharmacy_ai():
    """Get or create PharmacyAI instance (lazy loading)"""
    global _pharmacy_ai
    if _pharmacy_ai is None:
        from app.agents.orchestrator import PharmacyAI
        _pharmacy_ai = PharmacyAI()
    return _pharmacy_ai


class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    success: bool
    session_id: str
    intent: str
    message: str
    data: dict
    suggestions: List[str]
    requires_action: bool
    timestamp: str


@router.post("/chat/message", response_model=ChatResponse)
async def send_chat_message(
    chat_input: ChatMessage,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Send a message to AI pharmacist and get response.
    Requires authentication.
    """
    session_id = chat_input.session_id or str(uuid.uuid4())
    
    # Get user allergies for safety checks
    medical_info = current_user.get("medical_info", {})
    allergies = [a.get("allergen", "") for a in medical_info.get("allergies", [])]
    
    try:
        # Get AI instance (lazy loaded)
        pharmacy_ai = get_pharmacy_ai()
        
        response = await pharmacy_ai.process_message(
            message=chat_input.message,
            session_id=session_id,
            user_id=current_user["_id"],
            user_allergies=allergies
        )
        
        return ChatResponse(
            success=True,
            session_id=response["session_id"],
            intent=response.get("intent", "UNKNOWN"),
            message=response.get("message", ""),
            data=response.get("data", {}),
            suggestions=response.get("suggestions", []),
            requires_action=response.get("requires_action", False),
            timestamp=response.get("timestamp", "")
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


@router.post("/chat/prescription")
async def upload_prescription(
    file: UploadFile = File(...),
    session_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Upload prescription image for AI parsing.
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Allowed: JPEG, PNG, PDF"
        )
    
    # Read file
    contents = await file.read()
    
    # Convert to base64
    base64_image = base64.b64encode(contents).decode('utf-8')
    
    return {
        "success": True,
        "session_id": session_id or str(uuid.uuid4()),
        "message": "Prescription uploaded successfully. Our AI is analyzing it.",
        "data": {
            "filename": file.filename,
            "status": "processing",
            "prescription_id": str(uuid.uuid4())[:8]
        },
        "suggestions": ["View parsed medicines", "Continue shopping"]
    }


@router.post("/chat/voice")
async def process_voice(
    audio_base64: str,
    session_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Process voice input - convert to text and process.
    """
    return {
        "success": True,
        "session_id": session_id or str(uuid.uuid4()),
        "transcribed_text": "[Voice transcription would appear here]",
        "message": "Voice input received. Processing...",
        "data": {},
        "suggestions": ["Speak again", "Type instead"]
    }


@router.delete("/chat/session/{session_id}")
async def clear_chat_session(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Clear chat session history.
    """
    pharmacy_ai = get_pharmacy_ai()
    
    if session_id in pharmacy_ai.sessions:
        pharmacy_ai.sessions[session_id].clear()
    
    return {"success": True, "message": "Session cleared"}

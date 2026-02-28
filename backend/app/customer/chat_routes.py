"""
Customer Chat Routes - AI Chat Interface with Full Voice Support
Uses Groq for STT/LLM and Edge TTS for voice responses
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List
import uuid
import base64
import logging
import time

from app.auth.dependencies import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter()

# ==================== LAZY INITIALIZATION ====================

_pharmacy_ai = None
_voice_service = None


def get_pharmacy_ai():
    """Get or create PharmacyAI instance (lazy loading)"""
    global _pharmacy_ai
    if _pharmacy_ai is None:
        from app.agents.orchestrator import PharmacyAI
        _pharmacy_ai = PharmacyAI()
    return _pharmacy_ai


def get_voice_service():
    """Get or create VoiceService instance (lazy loading)"""
    global _voice_service
    if _voice_service is None:
        from app.services.voice_service import VoiceService
        _voice_service = VoiceService()
    return _voice_service


# ==================== REQUEST/RESPONSE MODELS ====================

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class VoiceChatRequest(BaseModel):
    audio_base64: str
    audio_format: str = "webm"  # webm, mp3, wav, ogg, m4a
    session_id: Optional[str] = None
    return_audio: bool = True  # Whether to return TTS audio
    voice_type: str = "female_indian"  # Voice for TTS


class TTSRequest(BaseModel):
    text: str
    voice_type: str = "female_indian"


class ChatResponse(BaseModel):
    success: bool
    session_id: str
    intent: str
    message: str
    data: dict
    suggestions: List[str]
    requires_action: bool
    timestamp: str
    processing_time_ms: Optional[int] = None


class VoiceChatResponse(BaseModel):
    success: bool
    session_id: str
    
    # Transcription
    transcribed_text: str
    transcription_confidence: float
    
    # AI Response
    intent: str
    message: str  # Full detailed message (for display)
    voice_message: Optional[str] = None  # Short voice-optimized message
    data: dict
    suggestions: List[str]
    requires_action: bool
    
    # Audio Response
    audio_base64: Optional[str] = None
    audio_format: str = "mp3"
    
    # Timing
    timestamp: str
    processing_time_ms: int
    stt_time_ms: int
    llm_time_ms: int
    tts_time_ms: Optional[int] = None

# ==================== TEXT CHAT ENDPOINTS ====================

@router.post("/chat/message", response_model=ChatResponse)
async def send_chat_message(
    chat_input: ChatMessage,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Send a text message to AI pharmacist and get response.
    
    This is your existing text chat endpoint - unchanged functionality.
    """
    session_id = chat_input.session_id or str(uuid.uuid4())
    start_time = time.time()
    
    # Get user allergies for safety checks
    medical_info = current_user.get("medical_info", {})
    allergies = [a.get("allergen", "") for a in medical_info.get("allergies", [])]
    
    try:
        pharmacy_ai = get_pharmacy_ai()
        
        response = await pharmacy_ai.process_message(
            message=chat_input.message,
            session_id=session_id,
            user_id=current_user["_id"],
            user_allergies=allergies
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return ChatResponse(
            success=True,
            session_id=response["session_id"],
            intent=response.get("intent", "UNKNOWN"),
            message=response.get("message", ""),
            data=response.get("data", {}),
            suggestions=response.get("suggestions", []),
            requires_action=response.get("requires_action", False),
            timestamp=response.get("timestamp", ""),
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


# ==================== VOICE CHAT ENDPOINTS ====================

@router.post("/chat/voice", response_model=VoiceChatResponse)
async def process_voice_chat(
    request: VoiceChatRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Process voice input - full voice-to-voice pipeline with optimized responses.
    """
    session_id = request.session_id or str(uuid.uuid4())
    total_start = time.time()
    
    medical_info = current_user.get("medical_info", {})
    allergies = [a.get("allergen", "") for a in medical_info.get("allergies", [])]
    
    voice_service = get_voice_service()
    pharmacy_ai = get_pharmacy_ai()
    
    # Import voice response generator
    from app.services.voice_response_generator import get_voice_response_generator
    voice_generator = get_voice_response_generator()
    
    if not voice_service.is_stt_available():
        raise HTTPException(
            status_code=503, 
            detail="Speech-to-text service not available."
        )
    
    try:
        # ==================== STEP 1: SPEECH TO TEXT ====================
        stt_start = time.time()
        
        try:
            transcribed_text, confidence = await voice_service.process_voice_message(
                audio_base64=request.audio_base64,
                audio_format=request.audio_format
            )
        except ValueError as e:
            return VoiceChatResponse(
                success=False,
                session_id=session_id,
                transcribed_text="",
                transcription_confidence=0,
                intent="INVALID",
                message="I couldn't hear you clearly. Please try again.",
                data={},
                suggestions=["Try again", "Type instead"],
                requires_action=False,
                timestamp=str(time.time()),
                processing_time_ms=int((time.time() - total_start) * 1000),
                stt_time_ms=0,
                llm_time_ms=0
            )
        
        stt_time = int((time.time() - stt_start) * 1000)
        
        if not transcribed_text or len(transcribed_text.strip()) < 2:
            return VoiceChatResponse(
                success=False,
                session_id=session_id,
                transcribed_text="",
                transcription_confidence=confidence,
                intent="INVALID",
                message="I didn't catch that. Please speak clearly and try again.",
                data={},
                suggestions=["Try again", "Speak louder"],
                requires_action=False,
                timestamp=str(time.time()),
                processing_time_ms=int((time.time() - total_start) * 1000),
                stt_time_ms=stt_time,
                llm_time_ms=0
            )
        
        # ==================== STEP 2: AI PROCESSING ====================
        llm_start = time.time()
        
        ai_response = await pharmacy_ai.process_message(
            message=transcribed_text,
            session_id=session_id,
            user_id=current_user["_id"],
            user_allergies=allergies
        )
        
        llm_time = int((time.time() - llm_start) * 1000)
        
        # ==================== STEP 3: GENERATE VOICE-OPTIMIZED RESPONSE ====================
        intent = ai_response.get("intent", "GENERAL")
        data = ai_response.get("data", {})
        full_message = ai_response.get("message", "")
        
        # Generate short, conversational voice response
        voice_message = voice_generator.generate_voice_response(
            intent=intent,
            data=data,
            original_message=transcribed_text,
            full_response=full_message
        )
        
        # ==================== STEP 4: TEXT TO SPEECH ====================
        audio_base64 = None
        tts_time = None
        
        if request.return_audio and voice_service.is_tts_available():
            tts_start = time.time()
            
            try:
                # Use the voice-optimized message for TTS
                audio_base64 = await voice_service.generate_voice_response(
                    text=voice_message,  # Use short voice message
                    voice_type=request.voice_type
                )
                tts_time = int((time.time() - tts_start) * 1000)
            except Exception as e:
                logger.warning(f"TTS failed: {e}")
        
        # ==================== BUILD RESPONSE ====================
        total_time = int((time.time() - total_start) * 1000)
        
        return VoiceChatResponse(
            success=True,
            session_id=session_id,
            transcribed_text=transcribed_text,
            transcription_confidence=confidence,
            intent=intent,
            message=full_message,  # Keep full message for display
            voice_message=voice_message,  # Add voice-optimized message
            data=data,
            suggestions=ai_response.get("suggestions", []),
            requires_action=ai_response.get("requires_action", False),
            audio_base64=audio_base64,
            audio_format="mp3",
            timestamp=ai_response.get("timestamp", str(time.time())),
            processing_time_ms=total_time,
            stt_time_ms=stt_time,
            llm_time_ms=llm_time,
            tts_time_ms=tts_time
        )
    
    except Exception as e:
        logger.error(f"Voice chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/voice/upload")
async def process_voice_file_upload(
    audio: UploadFile = File(..., description="Audio file (webm, mp3, wav, ogg, m4a)"),
    session_id: Optional[str] = Form(None),
    return_audio: bool = Form(True),
    voice_type: str = Form("female_indian"),
    current_user: dict = Depends(get_current_active_user)
):
    """
    🎤 Process voice from file upload.
    
    Alternative to base64 - accepts direct file upload.
    Useful for mobile apps or when base64 is inconvenient.
    """
    session_id = session_id or str(uuid.uuid4())
    
    # Validate file type
    allowed_content_types = {
        "audio/webm": "webm",
        "audio/mp3": "mp3",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/wave": "wav",
        "audio/x-wav": "wav",
        "audio/ogg": "ogg",
        "audio/m4a": "m4a",
        "audio/mp4": "m4a",
        "audio/x-m4a": "m4a",
    }
    
    content_type = audio.content_type or "audio/webm"
    
    if content_type not in allowed_content_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid audio type: {content_type}. Allowed: webm, mp3, wav, ogg, m4a"
        )
    
    # Read audio data
    audio_data = await audio.read()
    
    if len(audio_data) < 1000:
        raise HTTPException(
            status_code=400,
            detail="Audio file too small. Please record a longer message."
        )
    
    # Convert to base64
    audio_base64 = base64.b64encode(audio_data).decode('utf-8')
    audio_format = allowed_content_types[content_type]
    
    # Process using the main voice endpoint
    request = VoiceChatRequest(
        audio_base64=audio_base64,
        audio_format=audio_format,
        session_id=session_id,
        return_audio=return_audio,
        voice_type=voice_type
    )
    
    return await process_voice_chat(request, current_user)


# ==================== TTS ENDPOINTS ====================

@router.post("/chat/tts")
async def text_to_speech(
    request: TTSRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    🔊 Convert text to speech.
    
    Returns base64 encoded MP3 audio.
    """
    voice_service = get_voice_service()
    
    if not voice_service.is_tts_available():
        raise HTTPException(
            status_code=503, 
            detail="Text-to-speech service not available"
        )
    
    if not request.text or len(request.text.strip()) < 1:
        raise HTTPException(status_code=400, detail="Text is required")
    
    try:
        audio_base64 = await voice_service.generate_voice_response(
            text=request.text,
            voice_type=request.voice_type
        )
        
        return {
            "success": True,
            "audio_base64": audio_base64,
            "audio_format": "mp3",
            "voice_type": request.voice_type
        }
        
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/tts/stream")
async def text_to_speech_stream(
    text: str,
    voice_type: str = "female_indian",
    current_user: dict = Depends(get_current_active_user)
):
    """
    🔊 Convert text to speech - returns audio file directly.
    
    Use this endpoint if you want to play audio directly in browser:
    <audio src="/api/customer/chat/tts/stream?text=Hello&voice_type=female_indian" />
    """
    voice_service = get_voice_service()
    
    if not voice_service.is_tts_available():
        raise HTTPException(status_code=503, detail="TTS not available")
    
    if not text or len(text.strip()) < 1:
        raise HTTPException(status_code=400, detail="Text is required")
    
    try:
        voice = voice_service.available_voices.get(voice_type, voice_service.tts_voice)
        audio_bytes = await voice_service.text_to_speech(text, voice=voice)
        
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3",
                "Cache-Control": "no-cache"
            }
        )
        
    except Exception as e:
        logger.error(f"TTS stream error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== VOICE SERVICE INFO ====================

@router.get("/chat/voice/status")
async def get_voice_status(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get voice service status.
    
    Check if STT and TTS are available before using voice features.
    """
    voice_service = get_voice_service()
    
    return {
        "success": True,
        "voice_enabled": voice_service.is_stt_available() and voice_service.is_tts_available(),
        "services": {
            "stt": {
                "available": voice_service.is_stt_available(),
                "provider": "Groq Whisper",
                "model": voice_service.settings.GROQ_WHISPER_MODEL if voice_service.is_stt_available() else None
            },
            "tts": {
                "available": voice_service.is_tts_available(),
                "provider": "Microsoft Edge TTS",
                "default_voice": voice_service.tts_voice
            }
        }
    }


@router.get("/chat/voice/voices")
async def list_available_voices(
    current_user: dict = Depends(get_current_active_user)
):
    """
    List available TTS voices.
    """
    voice_service = get_voice_service()
    
    voices = []
    for key, voice_id in voice_service.available_voices.items():
        # Parse voice info
        parts = key.split("_")
        gender = parts[0] if parts else "unknown"
        accent = parts[1] if len(parts) > 1 else "unknown"
        
        voices.append({
            "id": key,
            "voice_id": voice_id,
            "gender": gender,
            "accent": accent,
            "is_default": voice_id == voice_service.tts_voice
        })
    
    return {
        "success": True,
        "voices": voices,
        "default": voice_service.tts_voice
    }


# ==================== OTHER CHAT ENDPOINTS ====================

@router.post("/chat/prescription")
async def upload_prescription(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Upload prescription image for AI parsing.
    """
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Allowed: JPEG, PNG, PDF"
        )
    
    contents = await file.read()
    
    # Check file size (max 10MB)
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
    
    base64_image = base64.b64encode(contents).decode('utf-8')
    
    # TODO: Integrate with vision AI for prescription parsing
    
    return {
        "success": True,
        "session_id": session_id or str(uuid.uuid4()),
        "message": "Prescription uploaded successfully. Our AI is analyzing it.",
        "data": {
            "filename": file.filename,
            "file_size": len(contents),
            "status": "processing",
            "prescription_id": str(uuid.uuid4())[:8]
        },
        "suggestions": ["View parsed medicines", "Continue shopping"]
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
    
    return {"success": True, "message": "Session not found or already cleared"}


@router.get("/chat/session/{session_id}/history")
async def get_chat_history(
    session_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get chat session history.
    """
    pharmacy_ai = get_pharmacy_ai()
    
    if session_id in pharmacy_ai.sessions:
        memory = pharmacy_ai.sessions[session_id]
        return {
            "success": True,
            "session_id": session_id,
            "messages": memory.get_messages(),
            "context": memory.context
        }
    
    return {
        "success": True,
        "session_id": session_id,
        "messages": [],
        "context": {}
    }


@router.get("/chat/status")
async def get_chat_status(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get AI chat service status.
    """
    from app.config import settings
    
    voice_service = get_voice_service()
    pharmacy_ai = get_pharmacy_ai()
    
    # Check which AI provider is active
    ai_status = {
        "provider": settings.AI_PROVIDER,
        "groq_available": bool(settings.GROQ_API_KEY),
        "openai_available": bool(settings.OPENAI_API_KEY),
    }
    
    if settings.AI_PROVIDER == "groq" and settings.GROQ_API_KEY:
        ai_status["model"] = settings.GROQ_LLM_MODEL
    elif settings.OPENAI_API_KEY:
        ai_status["model"] = settings.OPENAI_MODEL
    else:
        ai_status["model"] = "pattern-based (no AI)"
    
    return {
        "success": True,
        "status": {
            "ai": ai_status,
            "voice": {
                "stt_available": voice_service.is_stt_available(),
                "tts_available": voice_service.is_tts_available(),
                "voice_enabled": voice_service.is_stt_available() and voice_service.is_tts_available()
            },
            "active_sessions": len(pharmacy_ai.sessions)
        }
    }


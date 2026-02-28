"""
Voice Service - Speech-to-Text and Text-to-Speech
Uses OpenAI Whisper and TTS APIs
"""
import io
import base64
import logging
from typing import Optional, Tuple
from openai import OpenAI
from app.config import settings

logger = logging.getLogger(__name__)


class VoiceService:
    """
    Voice processing service for STT and TTS
    """
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        
        # TTS Voice options: alloy, echo, fable, onyx, nova, shimmer
        self.tts_voice = "nova"  # Clear, professional female voice
        self.tts_model = "tts-1"  # Use "tts-1-hd" for higher quality
        
        # STT settings
        self.stt_model = "whisper-1"
        
    def speech_to_text(self, audio_data: bytes, audio_format: str = "webm") -> Tuple[str, bool]:
        """
        Convert speech audio to text using OpenAI Whisper
        
        Args:
            audio_data: Raw audio bytes
            audio_format: Audio format (webm, mp3, wav, etc.)
            
        Returns:
            Tuple of (transcribed_text, success)
        """
        if not self.client:
            logger.error("OpenAI client not initialized")
            return "Voice service unavailable", False
        
        try:
            # Create a file-like object from bytes
            audio_file = io.BytesIO(audio_data)
            audio_file.name = f"audio.{audio_format}"
            
            # Call Whisper API
            response = self.client.audio.transcriptions.create(
                model=self.stt_model,
                file=audio_file,
                language="en",  # Can be made dynamic
                response_format="text"
            )
            
            transcribed_text = response.strip()
            logger.info(f"Transcribed: {transcribed_text[:100]}...")
            
            return transcribed_text, True
            
        except Exception as e:
            logger.error(f"Speech-to-text error: {e}")
            return f"Could not transcribe audio: {str(e)}", False
    
    def text_to_speech(self, text: str) -> Tuple[Optional[bytes], bool]:
        """
        Convert text to speech audio using OpenAI TTS
        
        Args:
            text: Text to convert to speech
            
        Returns:
            Tuple of (audio_bytes, success)
        """
        if not self.client:
            logger.error("OpenAI client not initialized")
            return None, False
        
        try:
            # Clean text for speech (remove markdown, emojis that don't speak well)
            clean_text = self._clean_text_for_speech(text)
            
            # Limit text length (TTS has limits)
            if len(clean_text) > 4096:
                clean_text = clean_text[:4096] + "... For more details, please check the text response."
            
            # Call TTS API
            response = self.client.audio.speech.create(
                model=self.tts_model,
                voice=self.tts_voice,
                input=clean_text,
                response_format="mp3"  # mp3 is widely supported
            )
            
            # Get audio bytes
            audio_bytes = response.content
            logger.info(f"Generated TTS audio: {len(audio_bytes)} bytes")
            
            return audio_bytes, True
            
        except Exception as e:
            logger.error(f"Text-to-speech error: {e}")
            return None, False
    
    def _clean_text_for_speech(self, text: str) -> str:
        """
        Clean text for better speech synthesis
        """
        import re
        
        # Remove markdown formatting
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # Bold
        text = re.sub(r'\*(.*?)\*', r'\1', text)      # Italic
        text = re.sub(r'`(.*?)`', r'\1', text)        # Code
        text = re.sub(r'#{1,6}\s*', '', text)         # Headers
        
        # Convert bullet points to spoken format
        text = re.sub(r'^\s*[-•]\s*', 'Item: ', text, flags=re.MULTILINE)
        text = re.sub(r'^\s*\d+\.\s*', 'Number ', text, flags=re.MULTILINE)
        
        # Remove excessive emojis but keep some context
        emoji_map = {
            '💊': 'medicine',
            '💰': 'price',
            '✅': 'available',
            '❌': 'not available',
            '⚠️': 'warning',
            '🩺': '',
            '👋': '',
            '📦': 'order',
            '🛒': 'cart',
            '📞': 'phone',
            '📧': 'email',
        }
        
        for emoji, replacement in emoji_map.items():
            text = text.replace(emoji, replacement)
        
        # Remove remaining emojis
        text = re.sub(r'[^\x00-\x7F]+', ' ', text)
        
        # Clean up whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)
        
        return text.strip()
    
    def process_voice_message(
        self,
        audio_base64: str,
        audio_format: str = "webm"
    ) -> dict:
        """
        Full voice processing: STT -> Process -> TTS
        Returns transcription and audio response
        """
        result = {
            "success": False,
            "transcribed_text": "",
            "error": None
        }
        
        try:
            # Decode base64 audio
            audio_data = base64.b64decode(audio_base64)
            
            # Speech to text
            transcribed_text, stt_success = self.speech_to_text(audio_data, audio_format)
            
            if not stt_success:
                result["error"] = transcribed_text
                return result
            
            result["transcribed_text"] = transcribed_text
            result["success"] = True
            
            return result
            
        except Exception as e:
            logger.error(f"Voice processing error: {e}")
            result["error"] = str(e)
            return result


# Global instance
_voice_service = None

def get_voice_service() -> VoiceService:
    """Get or create voice service instance"""
    global _voice_service
    if _voice_service is None:
        _voice_service = VoiceService()
    return _voice_service
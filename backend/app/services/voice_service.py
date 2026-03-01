"""
Voice Service - Speech-to-Text (Groq Whisper) and Text-to-Speech (Edge TTS)
IMPROVED: Better audio handling, error recovery, and logging
"""
import base64
import tempfile
import logging
import re
import time
import uuid
from typing import Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# Check for Groq availability
GROQ_AVAILABLE = False
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    logger.warning("Groq not installed. Run: pip install groq")

# Check for Edge TTS availability
EDGE_TTS_AVAILABLE = False
try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    logger.warning("edge-tts not installed. Run: pip install edge-tts")

# Check for pydub (for audio conversion)
PYDUB_AVAILABLE = False
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    logger.warning("pydub not installed. Run: pip install pydub")


class VoiceService:
    """
    Voice Service for Speech-to-Text and Text-to-Speech.
    """
    
    def __init__(self):
        from app.config import settings
        
        self.settings = settings
        self.groq_client = None
        self.tts_voice = getattr(settings, 'TTS_VOICE', 'en-IN-NeerjaNeural')
        self.tts_rate = getattr(settings, 'TTS_RATE', '+5%')
        
        # Initialize Groq client
        if GROQ_AVAILABLE and getattr(settings, 'GROQ_API_KEY', None):
            try:
                self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
                logger.info("Groq Whisper client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Groq: {e}")
        
        # Available TTS voices
        self.available_voices = {
            "female_indian": "en-IN-NeerjaNeural",
            "male_indian": "en-IN-PrabhatNeural",
            "female_us": "en-US-JennyNeural",
            "male_us": "en-US-GuyNeural",
            "female_uk": "en-GB-SoniaNeural",
        }
        
        # Create temp directory
        self.temp_dir = Path(tempfile.gettempdir()) / "gomed_voice"
        self.temp_dir.mkdir(exist_ok=True)
    
    # ==================== SPEECH TO TEXT ====================
    
    async def speech_to_text(
        self, 
        audio_data: bytes, 
        audio_format: str = "webm",
        language: str = "en"
    ) -> Tuple[str, float]:
        """Convert speech to text using Groq Whisper."""
        
        if not self.groq_client:
            raise ValueError("Groq client not initialized. Check GROQ_API_KEY.")
        
        if not audio_data or len(audio_data) < 500:
            raise ValueError("Audio data too small")
        
        start_time = time.time()
        temp_files = []
        
        try:
            # Determine file extension
            ext = self._get_extension(audio_format)
            
            # Create unique temp file
            file_id = uuid.uuid4().hex[:8]
            temp_file = self.temp_dir / f"audio_{file_id}{ext}"
            temp_files.append(temp_file)
            
            # Write audio data
            temp_file.write_bytes(audio_data)
            logger.info(f"Saved audio: {temp_file.name}, size: {len(audio_data)} bytes")
            
            # Try transcription
            transcription = None
            
            try:
                transcription = self._transcribe(temp_file, language)
            except Exception as e:
                error_str = str(e).lower()
                
                # If format error and pydub available, try converting
                if PYDUB_AVAILABLE and ("invalid" in error_str or "could not process" in error_str):
                    logger.warning("Trying audio conversion...")
                    
                    wav_file = self.temp_dir / f"audio_{file_id}_converted.wav"
                    temp_files.append(wav_file)
                    
                    try:
                        # Convert to WAV
                        audio_segment = AudioSegment.from_file(str(temp_file))
                        audio_segment = audio_segment.set_frame_rate(16000).set_channels(1)
                        audio_segment.export(str(wav_file), format="wav")
                        
                        transcription = self._transcribe(wav_file, language)
                    except Exception as conv_err:
                        logger.error(f"Conversion failed: {conv_err}")
                        raise ValueError("Could not process audio. Please try again.")
                else:
                    raise
            
            if not transcription:
                raise ValueError("Transcription failed")
            
            # Get text
            text = transcription.text.strip() if transcription.text else ""
            
            # Calculate confidence
            confidence = 0.9
            if hasattr(transcription, 'segments') and transcription.segments:
                try:
                    probs = [getattr(s, 'avg_logprob', -0.5) for s in transcription.segments]
                    avg_prob = sum(probs) / len(probs)
                    confidence = min(0.99, max(0.5, 1.0 + avg_prob / 2))
                except:
                    pass
            
            duration = time.time() - start_time
            logger.info(f"STT done in {duration:.2f}s: '{text[:50]}...'")
            
            return text, round(confidence, 2)
            
        finally:
            # Cleanup temp files
            for f in temp_files:
                try:
                    if f.exists():
                        f.unlink()
                except:
                    pass
    
    def _get_extension(self, audio_format: str) -> str:
        """Get file extension from audio format."""
        fmt = audio_format.lower().replace("audio/", "").replace("codecs=opus", "").strip(";")
        
        ext_map = {
            "webm": ".webm",
            "ogg": ".ogg",
            "mp4": ".mp4",
            "m4a": ".m4a",
            "mp3": ".mp3",
            "mpeg": ".mp3",
            "wav": ".wav",
            "flac": ".flac",
        }
        
        for key, ext in ext_map.items():
            if key in fmt:
                return ext
        
        return ".webm"
    
    def _transcribe(self, file_path: Path, language: str = "en"):
        """Transcribe audio file."""
        with open(file_path, "rb") as f:
            audio_bytes = f.read()
        
        return self.groq_client.audio.transcriptions.create(
            file=(file_path.name, audio_bytes),
            model=getattr(self.settings, 'GROQ_WHISPER_MODEL', 'whisper-large-v3'),
            language=language,
            response_format="verbose_json"
        )
    
    async def process_voice_message(
        self, 
        audio_base64: str, 
        audio_format: str = "webm"
    ) -> Tuple[str, float]:
        """Process base64 audio and return transcription."""
        
        try:
            # Handle data URL format: data:audio/webm;base64,xxxxx
            if "base64," in audio_base64:
                parts = audio_base64.split("base64,")
                
                # Extract format from MIME type
                if "data:" in parts[0]:
                    mime = parts[0].replace("data:", "").replace(";", "")
                    if "audio/" in mime:
                        audio_format = mime.split("audio/")[1].split(";")[0]
                
                audio_base64 = parts[1]
            
            # Clean and decode
            audio_base64 = audio_base64.strip()
            audio_data = base64.b64decode(audio_base64)
            
        except Exception as e:
            raise ValueError(f"Invalid audio data: {e}")
        
        if len(audio_data) < 1000:
            raise ValueError("Recording too short. Please speak longer.")
        
        logger.info(f"Processing audio: {len(audio_data)} bytes, format: {audio_format}")
        
        return await self.speech_to_text(audio_data, audio_format)
    
    # ==================== TEXT TO SPEECH ====================
    
    async def text_to_speech(
        self, 
        text: str, 
        voice: Optional[str] = None,
        rate: Optional[str] = None
    ) -> bytes:
        """Convert text to speech using Edge TTS."""
        
        if not EDGE_TTS_AVAILABLE:
            raise ValueError("edge-tts not installed")
        
        voice = voice or self.tts_voice
        rate = rate or self.tts_rate
        
        # Clean text
        clean_text = self._clean_for_tts(text)
        if not clean_text:
            clean_text = "I'm here to help."
        
        # Limit length
        if len(clean_text) > 1500:
            clean_text = clean_text[:1500] + "."
        
        try:
            communicate = edge_tts.Communicate(text=clean_text, voice=voice, rate=rate)
            
            audio_bytes = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_bytes += chunk["data"]
            
            return audio_bytes
            
        except Exception as e:
            logger.error(f"TTS error: {e}")
            raise
    
    async def generate_voice_response(self, text: str, voice_type: str = "female_indian") -> str:
        """Generate voice response as base64."""
        voice = self.available_voices.get(voice_type, self.tts_voice)
        audio_bytes = await self.text_to_speech(text, voice=voice)
        return base64.b64encode(audio_bytes).decode('utf-8')
    
    def _clean_for_tts(self, text: str) -> str:
        """Clean text for TTS output."""
        if not text:
            return ""
        
        # Remove emojis
        emoji_re = re.compile(
            "["
            "\U0001F600-\U0001F64F"
            "\U0001F300-\U0001F5FF"
            "\U0001F680-\U0001F6FF"
            "\U0001F1E0-\U0001F1FF"
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "\u2600-\u2B55"
            "]+",
            flags=re.UNICODE
        )
        text = emoji_re.sub('', text)
        
        # Remove markdown
        text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        text = re.sub(r'\*(.+?)\*', r'\1', text)
        text = re.sub(r'```[\s\S]*?```', '', text)
        text = re.sub(r'`(.+?)`', r'\1', text)
        text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
        text = re.sub(r'^[\s]*[•\-\*]\s*', '', text, flags=re.MULTILINE)
        
        # Clean up
        text = re.sub(r'\n+', '. ', text)
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\.+', '.', text)
        
        return text.strip()
    
    # ==================== STATUS ====================
    
    def is_stt_available(self) -> bool:
        return GROQ_AVAILABLE and self.groq_client is not None
    
    def is_tts_available(self) -> bool:
        return EDGE_TTS_AVAILABLE
    
    def get_available_voices(self) -> dict:
        return self.available_voices
    
    def get_status(self) -> dict:
        return {
            "stt_available": self.is_stt_available(),
            "tts_available": self.is_tts_available(),
            "pydub_available": PYDUB_AVAILABLE,
        }


# Singleton
_voice_service: Optional[VoiceService] = None

def get_voice_service() -> VoiceService:
    global _voice_service
    if _voice_service is None:
        _voice_service = VoiceService()
    return _voice_service
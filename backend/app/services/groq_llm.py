"""
Groq LLM Service - Fast AI inference using Groq
Primary AI provider for the pharmacy chatbot
"""
import logging
import json
import time
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)

# Check Groq availability
GROQ_AVAILABLE = False
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    logger.warning("⚠️ Groq not installed. Run: pip install groq")


class GroqLLM:
    """
    Groq LLM client for fast AI inference.
    
    Available Models (as of 2024):
    - llama-3.1-70b-versatile: Best quality
    - llama-3.1-8b-instant: Fastest
    - mixtral-8x7b-32768: Good balance, 32K context
    - gemma2-9b-it: Fast, efficient
    """
    
    MODELS = {
        "llama-3.1-70b-versatile": {"context": 32768, "speed": "fast", "quality": "best"},
        "llama-3.1-8b-instant": {"context": 8192, "speed": "fastest", "quality": "good"},
        "mixtral-8x7b-32768": {"context": 32768, "speed": "fast", "quality": "great"},
        "gemma2-9b-it": {"context": 8192, "speed": "very_fast", "quality": "good"},
        "llama3-70b-8192": {"context": 8192, "speed": "fast", "quality": "great"},
        "llama3-8b-8192": {"context": 8192, "speed": "fastest", "quality": "good"},
    }
    
    def __init__(self):
        from app.config import settings
        
        self.settings = settings
        self.client = None
        self.model = settings.GROQ_LLM_MODEL
        
        if GROQ_AVAILABLE and settings.GROQ_API_KEY:
            try:
                self.client = Groq(api_key=settings.GROQ_API_KEY)
                logger.info(f"✅ Groq LLM initialized (Model: {self.model})")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Groq LLM: {e}")
        else:
            if not settings.GROQ_API_KEY:
                logger.warning("⚠️ GROQ_API_KEY not set")
    
    def is_available(self) -> bool:
        """Check if Groq LLM is available."""
        return self.client is not None
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
        model: Optional[str] = None,
        json_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Get chat completion from Groq.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens in response
            model: Model to use (optional, uses default)
            json_mode: Whether to request JSON response
            
        Returns:
            Dict with 'content', 'model', 'usage', 'duration_ms'
        """
        if not self.client:
            raise ValueError("Groq client not initialized. Check GROQ_API_KEY.")
        
        start_time = time.time()
        model = model or self.model
        
        try:
            # Build request params
            params = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            
            if json_mode:
                params["response_format"] = {"type": "json_object"}
            
            # Make request (Groq client is sync but very fast)
            response = self.client.chat.completions.create(**params)
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            content = response.choices[0].message.content
            
            logger.debug(f"Groq response in {duration_ms}ms: {content[:100]}...")
            
            return {
                "content": content,
                "model": model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                "duration_ms": duration_ms,
                "finish_reason": response.choices[0].finish_reason
            }
            
        except Exception as e:
            logger.error(f"❌ Groq chat completion error: {e}")
            raise
    
    def chat_completion_sync(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
        model: Optional[str] = None,
        json_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Synchronous version of chat_completion.
        Use this when you're not in an async context.
        """
        if not self.client:
            raise ValueError("Groq client not initialized")
        
        start_time = time.time()
        model = model or self.model
        
        try:
            params = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            
            if json_mode:
                params["response_format"] = {"type": "json_object"}
            
            response = self.client.chat.completions.create(**params)
            duration_ms = int((time.time() - start_time) * 1000)
            
            return {
                "content": response.choices[0].message.content,
                "model": model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                "duration_ms": duration_ms
            }
            
        except Exception as e:
            logger.error(f"❌ Groq sync completion error: {e}")
            raise
    
    async def classify_intent(
        self, 
        message: str,
        context: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Classify user intent using Groq.
        Optimized prompt for pharmacy chatbot.
        """
        system_prompt = """You are an intent classifier for a pharmacy chatbot. Analyze the user message and classify it.

INTENT TYPES:
- BUY_MEDICINE: User wants to buy/search for medicine (by name OR symptom like "I have headache")
- PRICE_CHECK: User asking about price/cost/rate of medicine
- SIDE_EFFECTS: User asking about side effects, safety, or if medicine is safe
- CHECK_STOCK: User checking if medicine is available/in stock
- DOSAGE_INFO: User asking about dosage, how to take medicine
- DRUG_INTERACTION: User asking about drug interactions or combining medicines
- ORDER_STATUS: User asking about their order, tracking, delivery
- REORDER: User wants to reorder previous medicines
- GREETING: Simple greeting (hi, hello, hey, good morning)
- THANKS: Thank you, goodbye, bye
- GENERAL: Other/unclear

EXTRACT ENTITIES:
- medicine_names: List of medicine names mentioned (e.g., ["Paracetamol", "Ibuprofen"])
- symptoms: List of symptoms mentioned (e.g., ["headache", "fever"])
- recommended_medicines: For symptoms, suggest common medicines

RESPOND IN VALID JSON FORMAT ONLY:
{"intent": "INTENT_TYPE", "entities": {"medicine_names": [], "symptoms": [], "recommended_medicines": []}, "confidence": 0.9}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]
        
        try:
            result = await self.chat_completion(
                messages=messages,
                temperature=0,
                max_tokens=300,
                json_mode=True
            )
            
            parsed = json.loads(result["content"])
            parsed["llm_duration_ms"] = result["duration_ms"]
            parsed["llm_model"] = result["model"]
            
            logger.info(f"🧠 Intent: {parsed.get('intent')} (confidence: {parsed.get('confidence', 'N/A')})")
            
            return parsed
            
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse Groq response as JSON: {e}")
            return {
                "intent": "GENERAL",
                "entities": {},
                "confidence": 0.5,
                "error": "json_parse_error"
            }
        except Exception as e:
            logger.error(f"Groq classify_intent error: {e}")
            raise
    
    async def generate_response(
        self,
        user_message: str,
        context: str = "",
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Generate a conversational response.
        
        Args:
            user_message: The user's message
            context: Additional context (e.g., medicine info, search results)
            system_prompt: Custom system prompt (optional)
            
        Returns:
            Generated response text
        """
        default_system = """You are APOS, a friendly and helpful AI pharmacist assistant for GoMed online pharmacy.

Your personality:
- Professional but warm and approachable
- Clear and concise in explanations
- Always prioritize patient safety
- Recommend consulting a doctor for serious concerns

Guidelines:
- Provide accurate medicine information
- Warn about prescription requirements
- Mention side effects when relevant
- Keep responses conversational but informative
- Use simple language, avoid jargon"""

        messages = [
            {"role": "system", "content": system_prompt or default_system}
        ]
        
        if context:
            messages.append({
                "role": "system", 
                "content": f"Context information:\n{context}"
            })
        
        messages.append({"role": "user", "content": user_message})
        
        result = await self.chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        return result["content"]


# ==================== SINGLETON ====================

_groq_llm: Optional[GroqLLM] = None


def get_groq_llm() -> GroqLLM:
    """Get or create Groq LLM instance."""
    global _groq_llm
    if _groq_llm is None:
        _groq_llm = GroqLLM()
    return _groq_llm
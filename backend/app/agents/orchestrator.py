"""
Orchestrator Agent - Main AI Brain with ROBUST Intent Handling
PRODUCTION VERSION - Groq as Primary, OpenAI as Backup
✅ All existing functionality preserved
✅ Groq for faster, free AI processing
✅ OpenAI as fallback
"""
from typing import Dict, Any, List, Optional
import json
from datetime import datetime
import time
import re
import logging

logger = logging.getLogger(__name__)

# Fuzzy matching (optional)
try:
    from rapidfuzz import fuzz, process
    FUZZY_AVAILABLE = True
except ImportError:
    FUZZY_AVAILABLE = False

# Spell checker (optional)
try:
    from spellchecker import SpellChecker
    SPELL_AVAILABLE = True
except ImportError:
    SPELL_AVAILABLE = False

from app.config import settings
from app.agents.medicine_agent import MedicineAgent
from app.agents.safety_agent import SafetyAgent
from app.observability.tracer import get_langfuse, create_trace


class ConversationMemory:
    """Simple conversation memory"""
    
    def __init__(self, max_messages: int = 10):
        self.messages: List[Dict] = []
        self.max_messages = max_messages
        self.context: Dict[str, Any] = {}
    
    def add(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages:]
    
    def get_messages(self) -> List[Dict]:
        return self.messages
    
    def set_context(self, key: str, value: Any):
        self.context[key] = value
    
    def get_context(self, key: str) -> Any:
        return self.context.get(key)
    
    def clear(self):
        self.messages = []
        self.context = {}


class PharmacyAI:
    """
    Main AI Orchestrator - Groq Primary, OpenAI Backup
    ALL EXISTING FUNCTIONALITY PRESERVED
    """
    
    def __init__(self):
        # ==================== AI CLIENTS ====================
        # Groq (Primary - Fast & Free)
        self.groq_client = None
        self.use_groq = False
        
        try:
            if settings.GROQ_API_KEY:
                from groq import Groq
                self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
                self.use_groq = True
                logger.info(f" Groq initialized (Model: {settings.GROQ_LLM_MODEL})")
        except Exception as e:
            logger.warning(f"Groq initialization failed: {e}")
        
        # OpenAI (Backup)
        self.openai_client = None
        try:
            if settings.OPENAI_API_KEY:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info(f" OpenAI initialized (Model: {settings.OPENAI_MODEL})")
        except Exception as e:
            logger.warning(f"OpenAI initialization failed: {e}")
        
        # Log which provider will be used
        if self.use_groq:
            logger.info(" Using Groq as PRIMARY AI provider")
        elif self.openai_client:
            logger.info(" Using OpenAI as PRIMARY AI provider")
        else:
            logger.warning(" No AI provider available - using pattern-based only")
        
        # ==================== AGENTS ====================
        self.medicine_agent = MedicineAgent()
        self.safety_agent = SafetyAgent()
        self.sessions: Dict[str, ConversationMemory] = {}
        self.langfuse = get_langfuse()
        
        # ==================== SPELL CHECKER ====================
        if SPELL_AVAILABLE:
            self.spell = SpellChecker()
            medicine_terms = [
                "paracetamol", "ibuprofen", "amoxicillin", "azithromycin", 
                "cetirizine", "metformin", "omeprazole", "amlodipine",
                "aspirin", "diclofenac", "pantoprazole", "losartan",
                "atorvastatin", "metoprolol", "ciprofloxacin", "doxycycline"
            ]
            self.spell.word_frequency.load_words(medicine_terms)
        else:
            self.spell = None
        
        # ==================== NAVIGATION KEYWORDS ====================
        self.navigation_keywords = {
            "browse categories": "BROWSE_CATEGORIES",
            "browse medicines": "BROWSE_MEDICINES",
            "view categories": "BROWSE_CATEGORIES",
            "show categories": "BROWSE_CATEGORIES",
            "view cart": "VIEW_CART",
            "my cart": "VIEW_CART",
            "cart": "VIEW_CART",
            "checkout": "CHECKOUT",
            "talk to pharmacist": "CONTACT_PHARMACIST",
            "contact pharmacist": "CONTACT_PHARMACIST",
            "speak to pharmacist": "CONTACT_PHARMACIST",
            "help": "HELP",
            "help me": "HELP",
            "view all medicines": "BROWSE_MEDICINES",
            "show all medicines": "BROWSE_MEDICINES",
            "all medicines": "BROWSE_MEDICINES"
        }
        
        # ==================== SYMPTOM MAPPING ====================
        self.symptom_medicine_map = {
            "fever": ["Paracetamol", "Ibuprofen", "Crocin"],
            "temperature": ["Paracetamol", "Ibuprofen"],
            "headache": ["Paracetamol", "Ibuprofen", "Aspirin"],
            "head pain": ["Paracetamol", "Ibuprofen"],
            "migraine": ["Ibuprofen", "Sumatriptan"],
            "pain": ["Ibuprofen", "Paracetamol", "Diclofenac"],
            "body pain": ["Ibuprofen", "Paracetamol"],
            "back pain": ["Ibuprofen", "Diclofenac"],
            "joint pain": ["Ibuprofen", "Diclofenac"],
            "muscle pain": ["Ibuprofen", "Diclofenac"],
            "cold": ["Cetirizine", "Paracetamol", "Vitamin C"],
            "common cold": ["Cetirizine", "Paracetamol"],
            "flu": ["Paracetamol", "Cetirizine", "Vitamin C"],
            "cough": ["Benadryl", "Honitus", "Cetirizine"],
            "dry cough": ["Benadryl", "Honitus"],
            "wet cough": ["Benadryl", "Ambroxol"],
            "sore throat": ["Strepsils", "Paracetamol"],
            "throat pain": ["Strepsils", "Ibuprofen"],
            "allergy": ["Cetirizine", "Loratadine", "Allegra"],
            "allergies": ["Cetirizine", "Loratadine"],
            "allergic": ["Cetirizine", "Loratadine"],
            "runny nose": ["Cetirizine", "Loratadine"],
            "sneezing": ["Cetirizine", "Loratadine"],
            "diabetes": ["Metformin", "Glimepiride"],
            "sugar": ["Metformin"],
            "high sugar": ["Metformin", "Glimepiride"],
            "blood pressure": ["Amlodipine", "Losartan", "Telmisartan"],
            "bp": ["Amlodipine", "Losartan"],
            "high bp": ["Amlodipine", "Losartan"],
            "hypertension": ["Amlodipine", "Losartan"],
            "acidity": ["Omeprazole", "Pantoprazole", "Ranitidine"],
            "heartburn": ["Omeprazole", "Pantoprazole"],
            "acid reflux": ["Omeprazole", "Esomeprazole"],
            "gas": ["Digene", "Omeprazole"],
            "bloating": ["Digene", "Omeprazole"],
            "stomach": ["Omeprazole", "Digene"],
            "stomach pain": ["Omeprazole", "Digene", "Buscopan"],
            "indigestion": ["Digene", "Omeprazole"],
            "infection": ["Amoxicillin", "Azithromycin"],
            "bacterial infection": ["Amoxicillin", "Azithromycin", "Ciprofloxacin"],
            "throat infection": ["Amoxicillin", "Azithromycin"],
            "diarrhea": ["ORS", "Loperamide"],
            "loose motion": ["ORS", "Loperamide"],
            "vomiting": ["Ondansetron", "Domperidone"],
            "nausea": ["Ondansetron", "Domperidone"],
            "motion sickness": ["Ondansetron", "Domperidone"],
            "sleep": ["Melatonin"],
            "insomnia": ["Melatonin"],
            "cant sleep": ["Melatonin"],
            "anxiety": ["Alprazolam"],
            "stress": ["Ashwagandha"],
            "weakness": ["Vitamin B12", "Multivitamin"],
            "tiredness": ["Vitamin B12", "Multivitamin"],
            "fatigue": ["Vitamin B12", "Multivitamin"],
            "vitamin deficiency": ["Multivitamin", "Vitamin B12", "Vitamin D"],
        }
        
        # ==================== SYSTEM PROMPT ====================
        self.system_prompt = """You are APOS, an AI pharmacist assistant for GoMed online pharmacy.

Your capabilities:
1. Understand symptoms and recommend appropriate medicines
2. Search for medicines by name, symptom, or condition
3. Provide price information
4. Check drug safety and interactions
5. Assist with orders

IMPORTANT RULES:
- When user mentions symptoms, recommend appropriate medicines
- Provide clear pricing information when asked
- Always check if prescription is required
- Warn about allergies and interactions
- Keep responses helpful and concise
- If user asks to navigate (browse, view cart, etc.), guide them appropriately

Respond naturally in conversation."""
    
    def get_session(self, session_id: str) -> ConversationMemory:
        """Get or create session memory"""
        if session_id not in self.sessions:
            self.sessions[session_id] = ConversationMemory()
        return self.sessions[session_id]
    
    # ==================== MAIN PROCESS MESSAGE ====================
    
    async def process_message(
        self,
        message: str,
        session_id: str,
        user_id: Optional[str] = None,
        user_allergies: List[str] = None
    ) -> Dict[str, Any]:
        """
        Process customer message with ROBUST intent handling
        """
        
        # Edge case: Empty or very short message
        if not message or len(message.strip()) < 2:
            return {
                "session_id": session_id,
                "intent": "INVALID",
                "message": "Please type a message. How can I help you today?",
                "data": {},
                "suggestions": ["I have a fever", "Price of Paracetamol", "Browse medicines"],
                "requires_action": False,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        trace = create_trace(
            name="customer_chat",
            user_id=user_id,
            session_id=session_id,
            metadata={
                "message_length": len(message),
                "has_allergies": bool(user_allergies),
                "ai_provider": "groq" if self.use_groq else "openai"
            },
            tags=["chat", "customer"]
        )
        
        start_time = time.time()
        memory = self.get_session(session_id)
        message_clean = message.strip()
        message_lower = message_clean.lower()
        
        try:
            # STEP 1: CHECK FOR NAVIGATION INTENT
            nav_intent = self._check_navigation_intent(message_lower)
            if nav_intent:
                return self._handle_navigation(nav_intent, session_id)
            
            # STEP 2: CLASSIFY INTENT
            intent_data = await self._classify_intent(message_clean, memory, trace)
            intent = intent_data.get("intent", "GENERAL")
            entities = intent_data.get("entities", {})
            
            # STEP 3: ROUTE TO HANDLER
            response = await self._handle_intent(
                intent=intent,
                entities=entities,
                message=message_clean,
                user_allergies=user_allergies,
                memory=memory,
                trace=trace,
                user_id=user_id
            )
            
            # Update memory
            memory.add("user", message_clean)
            memory.add("assistant", response.get("message", ""))
            
            # FINAL RESULT
            total_duration = int((time.time() - start_time) * 1000)
            
            result = {
                "session_id": session_id,
                "intent": intent,
                "message": response.get("message", "I'm here to help! What would you like to know?"),
                "data": response.get("data", {}),
                "suggestions": response.get("suggestions", ["Search medicines", "Browse categories", "View cart"]),
                "requires_action": response.get("requires_action", False),
                "timestamp": datetime.utcnow().isoformat(),
                "processing_time_ms": total_duration
            }
            
            if trace:
                trace.update(
                    output=result,
                    metadata={"total_duration_ms": total_duration, "intent": intent, "success": True}
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Process message error: {e}", exc_info=True)
            
            if trace:
                trace.update(output={"error": str(e)}, level="ERROR", metadata={"success": False})
            
            return {
                "session_id": session_id,
                "intent": "ERROR",
                "message": "I apologize, I encountered an error. Please try again or browse our medicines directly.",
                "data": {"error_type": type(e).__name__},
                "suggestions": ["Browse medicines", "View categories", "Try again"],
                "requires_action": False,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        finally:
            if self.langfuse:
                self.langfuse.flush()
    
    # ==================== NAVIGATION HANDLING ====================
    
    def _check_navigation_intent(self, message_lower: str) -> Optional[str]:
        """
        Check if message is a navigation/action request.
        IMPORTANT: Exclude add-to-cart commands!
        """
        
        # ==================== EXCLUDE CART ADD COMMANDS ====================
        cart_add_patterns = [
            r"add\s+.+\s+to\s+(?:the\s+|my\s+)?cart",  # "add X to cart" / "add X to the cart"
            r"add\s+.+\s+in\s+(?:the\s+|my\s+)?cart",  # "add X in cart"
            r"put\s+.+\s+(?:in|to)\s+(?:the\s+|my\s+)?cart",  # "put X in cart"
            r"add\s+\d+\s+.+",                          # "add 10 paracetamol"
            r"add\s+it\s+to",                           # "add it to cart"
            r"add\s+this\s+to",                         # "add this to cart"
            r"add\s+that\s+to",                         # "add that to cart"
            r"add\s+to\s+(?:the\s+|my\s+)?cart$",       # just "add to cart"
            r"i\s+want\s+\d+",                          # "i want 5 cetirizine"
            r"i\s+need\s+\d+",                          # "i need 10 paracetamol"
            r"give\s+me\s+\d+",                         # "give me 5 ibuprofen"
            r"buy\s+\d+",                               # "buy 10 paracetamol"
            r"order\s+\d+",                             # "order 5 cetirizine"
            r"^add\s+\w+",                              
        ]
        
        for pattern in cart_add_patterns:
            if re.search(pattern, message_lower):
                logger.debug(f"Cart pattern matched, skipping navigation: {pattern}")
                return None  # Let intent classification handle it
        
        # ==================== EXCLUDE ORDER-RELATED QUERIES ====================
        order_keywords = [
            "track", "order status", "orders", "delivery", "shipping", 
            "where is my", "my order"
        ]
        
        # Be more careful - "order" alone could be navigation, but "order paracetamol" is a command
        if any(keyword in message_lower for keyword in order_keywords):
            # Make sure it's not "order [medicine]"
            if not re.search(r"order\s+\d*\s*[a-zA-Z]", message_lower):
                return None
        
        # ==================== NAVIGATION KEYWORDS ====================
        navigation_map = {
            # Cart viewing (NOT adding) - must be exact or very specific
            "view cart": "VIEW_CART",
            "view my cart": "VIEW_CART",
            "view the cart": "VIEW_CART",
            "show cart": "VIEW_CART",
            "show my cart": "VIEW_CART",
            "show the cart": "VIEW_CART",
            "open cart": "VIEW_CART",
            "open my cart": "VIEW_CART",
            "open the cart": "VIEW_CART",
            "see cart": "VIEW_CART",
            "see my cart": "VIEW_CART",
            "see the cart": "VIEW_CART",
            "go to cart": "VIEW_CART",
            "check cart": "VIEW_CART",
            "check my cart": "VIEW_CART",
            "whats in my cart": "VIEW_CART",
            "what's in my cart": "VIEW_CART",
            "what is in my cart": "VIEW_CART",
            
            # Exact "my cart" or "cart" (must be EXACT match)
            # These will be checked separately
            
            # Categories
            "browse categories": "BROWSE_CATEGORIES",
            "view categories": "BROWSE_CATEGORIES",
            "show categories": "BROWSE_CATEGORIES",
            "all categories": "BROWSE_CATEGORIES",
            "medicine categories": "BROWSE_CATEGORIES",
            "list categories": "BROWSE_CATEGORIES",
            
            # Medicines
            "browse medicines": "BROWSE_MEDICINES",
            "view medicines": "BROWSE_MEDICINES",
            "show medicines": "BROWSE_MEDICINES",
            "all medicines": "BROWSE_MEDICINES",
            "view all medicines": "BROWSE_MEDICINES",
            "show all medicines": "BROWSE_MEDICINES",
            "list medicines": "BROWSE_MEDICINES",
            
            # Checkout
            "checkout": "CHECKOUT",
            "check out": "CHECKOUT",
            "proceed to checkout": "CHECKOUT",
            "go to checkout": "CHECKOUT",
            
            # Pharmacist
            "talk to pharmacist": "CONTACT_PHARMACIST",
            "contact pharmacist": "CONTACT_PHARMACIST",
            "speak to pharmacist": "CONTACT_PHARMACIST",
            "call pharmacist": "CONTACT_PHARMACIST",
            
            # Help
            "help": "HELP",
            "help me": "HELP",
            "i need help": "HELP",
        }
        
        # Exact matches only
        if message_lower in navigation_map:
            return navigation_map[message_lower]
        
        # Very specific phrases
        for keyword, intent in navigation_map.items():
            if message_lower == keyword:
                return intent
        
        # "cart" or "my cart" ONLY as exact match
        if message_lower in ["cart", "my cart", "the cart"]:
            return "VIEW_CART"
        
        return None
    
    def _handle_navigation(self, intent: str, session_id: str) -> Dict[str, Any]:
        """Handle navigation intents"""
        responses = {
            "BROWSE_CATEGORIES": {
                "message": "📂 **Medicine Categories**\n\nHere are our medicine categories:\n\n💊 **Painkillers** - For pain & fever\n🦠 **Antibiotics** - For infections\n🩸 **Diabetes Care** - For blood sugar\n❤️ **Heart & BP** - Cardiovascular\n🫁 **Respiratory** - Breathing issues\n🍽️ **Digestive Health** - Stomach care\n🌟 **Vitamins** - Supplements\n🧴 **Skin Care** - Dermatological\n\nWhich category would you like to explore?",
                "suggestions": ["Painkillers", "Antibiotics", "Diabetes Care", "Vitamins"],
                "data": {"action": "SHOW_CATEGORIES"}
            },
            "BROWSE_MEDICINES": {
                "message": "💊 **Browse Medicines**\n\nYou can browse our complete medicine catalog by:\n\n• Clicking 'Medicines' in the menu\n• Searching by name or symptom\n• Filtering by category\n\nOr tell me what you're looking for!",
                "suggestions": ["I have a headache", "Show painkillers", "Price of Paracetamol"],
                "data": {"action": "BROWSE_MEDICINES"}
            },
            "VIEW_CART": {
                "message": "🛒 **Your Cart**\n\nTo view your shopping cart, click the Cart icon in the menu or the 'Cart' button in the sidebar.\n\nWould you like me to help you find any medicines to add?",
                "suggestions": ["Browse medicines", "I need painkillers", "Show categories"],
                "data": {"action": "VIEW_CART"}
            },
            "CHECKOUT": {
                "message": " **Checkout**\n\nTo complete your purchase, go to your Cart and click 'Proceed to Checkout'.\n\nWould you like to add anything else before checking out?",
                "suggestions": ["View cart", "Browse medicines", "I need help"],
                "data": {"action": "CHECKOUT"}
            },
            "CONTACT_PHARMACIST": {
                "message": "👨‍⚕️ **Contact Pharmacist**\n\nFor complex medical queries or prescription advice, please:\n\n📞 Call: +91 1800-XXX-XXXX\n📧 Email: pharmacist@gomed.com\n💬 Live Chat: Available 9 AM - 9 PM\n\nI'm also here to help with general medicine queries!",
                "suggestions": ["I have a question", "Browse medicines", "Check drug interaction"],
                "data": {"action": "CONTACT_PHARMACIST"}
            },
            "HELP": {
                "message": "❓ **Help & Support**\n\nI can help you with:\n\n🩺 **Find medicine for symptoms** - 'I have a headache'\n💰 **Check prices** - 'Price of Paracetamol'\n🔍 **Search medicines** - 'Do you have Amoxicillin?'\n💊 **Medicine info** - 'Side effects of Metformin'\n⚠️ **Drug interactions** - 'Can I take X with Y?'\n📦 **Track orders** - 'Track my order'\n\nWhat would you like help with?",
                "suggestions": ["I have symptoms", "Search medicine", "Check price", "Track order"],
                "data": {"action": "HELP"}
            }
        }
        
        response = responses.get(intent, responses["HELP"])
        
        return {
            "session_id": session_id,
            "intent": intent,
            "message": response["message"],
            "data": response["data"],
            "suggestions": response["suggestions"],
            "requires_action": False,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # ==================== INTENT CLASSIFICATION ====================
    
    async def _classify_intent(self, message: str, memory: ConversationMemory, trace=None) -> Dict[str, Any]:
        """Classify intent using pattern-based + LLM fallback"""
        
        # Check for context-based follow-ups FIRST
        follow_up = self._check_follow_up_intent(message, memory)
        if follow_up:
            return follow_up
        
        # Try pattern-based classification (faster, more reliable)
        pattern_result = self._pattern_based_classification(message)
        if pattern_result.get("confidence", 0) > 0.75:
            return pattern_result
        
        # Then try LLM if available
        if self.use_groq or self.openai_client:
            try:
                return await self._llm_classification(message, trace)
            except Exception as e:
                logger.warning(f"LLM classification failed: {e}")
                if trace:
                    trace.event(name="llm_classification_error", input={"error": str(e)})
        
        # Fallback to pattern-based
        return pattern_result
    
    async def _llm_classification(self, message: str, trace=None) -> Dict[str, Any]:
        """LLM-based intent classification - Groq PRIMARY, OpenAI BACKUP"""
        
        classification_prompt = """Analyze this pharmacy chatbot message and classify the intent.

Message: "{message}"

Classify into ONE of these intents:
- BUY_MEDICINE: User wants to buy/search for medicine (by name OR symptom)
- PRICE_CHECK: User asking about price/cost
- SIDE_EFFECTS: User asking about side effects or safety
- CHECK_STOCK: User checking availability
- DOSAGE_INFO: User asking about dosage or how to take medicine
- DRUG_INTERACTION: User asking about drug interactions
- ORDER_STATUS: User asking about their order
- GREETING: Simple greeting (hi, hello, etc.)
- THANKS: Thank you or goodbye
- GENERAL: General question or unclear intent

Extract:
- medicine_names: List of medicine names mentioned
- symptoms: List of symptoms mentioned
- recommended_medicines: Suggested medicines for symptoms

RESPOND IN VALID JSON ONLY:
{{"intent": "INTENT_TYPE", "entities": {{"medicine_names": [], "symptoms": [], "recommended_medicines": []}}, "confidence": 0.9}}"""

        prompt = classification_prompt.format(message=message)
        
        # ==================== TRY GROQ FIRST ====================
        if self.use_groq and self.groq_client:
            try:
                start_time = time.time()
                
                response = self.groq_client.chat.completions.create(
                    model=settings.GROQ_LLM_MODEL,
                    messages=[
                        {"role": "system", "content": "You are an intent classifier. Respond ONLY in valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0,
                    max_tokens=200,
                    response_format={"type": "json_object"}
                )
                
                content = response.choices[0].message.content.strip()
                duration_ms = int((time.time() - start_time) * 1000)
                
                if trace:
                    trace.generation(
                        name="intent_classification_groq",
                        model=settings.GROQ_LLM_MODEL,
                        input=prompt,
                        output=content,
                        usage={
                            "input": response.usage.prompt_tokens,
                            "output": response.usage.completion_tokens
                        },
                        metadata={"duration_ms": duration_ms, "provider": "groq"}
                    )
                
                result = json.loads(content)
                result["llm_provider"] = "groq"
                result["llm_duration_ms"] = duration_ms
                
                logger.debug(f"Groq classification ({duration_ms}ms): {result.get('intent')}")
                return result
                
            except Exception as e:
                logger.warning(f"Groq classification failed, trying OpenAI: {e}")
        
        # ==================== FALLBACK TO OPENAI ====================
        if self.openai_client:
            try:
                start_time = time.time()
                
                response = self.openai_client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": "You are an intent classifier. Respond ONLY in valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0,
                    max_tokens=200
                )
                
                content = response.choices[0].message.content.strip()
                duration_ms = int((time.time() - start_time) * 1000)
                
                if trace:
                    trace.generation(
                        name="intent_classification_openai",
                        model=settings.OPENAI_MODEL,
                        input=prompt,
                        output=content,
                        usage={
                            "input": response.usage.prompt_tokens,
                            "output": response.usage.completion_tokens
                        },
                        metadata={"duration_ms": duration_ms, "provider": "openai"}
                    )
                
                # Clean JSON
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                
                result = json.loads(content.strip())
                result["llm_provider"] = "openai"
                result["llm_duration_ms"] = duration_ms
                
                return result
                
            except Exception as e:
                logger.warning(f"OpenAI classification also failed: {e}")
        
        # Final fallback
        return self._pattern_based_classification(message)
    
    def _check_follow_up_intent(self, message: str, memory: ConversationMemory) -> Optional[Dict[str, Any]]:
        """Check for context-aware follow-up questions - FIXED VERSION"""
        message_lower = message.lower().strip()
        last_medicine = memory.get_context("last_medicine")
        last_intent = memory.get_context("last_intent")
        
        # ============================================================
        # 1. ADD TO CART CONFIRMATIONS (when we have a last medicine)
        # ============================================================
        if last_medicine:
            # Direct confirmations
            add_to_cart_exact = [
                "add to cart", "add it to cart", "add this to cart",
                "add it", "add this", "add that",
                "yes", "ok", "okay", "sure", "yep", "yeah", "yea",
                "yes please", "ok add it", "okay add it",
                "i'll take it", "i want it", "i'll buy it",
                "buy it", "buy this", "order it", "order this",
                "get it", "get this", "take it",
                "add", "buy", "order", "get",
            ]
            
            if message_lower in add_to_cart_exact:
                logger.info(f"Follow-up ADD_TO_CART for: {last_medicine.get('name')}")
                return {
                    "intent": "ADD_TO_CART",
                    "entities": {"medicine": last_medicine, "quantity": 1},
                    "confidence": 0.98
                }
            
            # Partial match for add to cart phrases
            add_partial = ["add to cart", "add it", "add this", "buy it", "order it", "i'll take"]
            if any(phrase in message_lower for phrase in add_partial):
                # Make sure it's not adding a DIFFERENT medicine
                # Check if message has another medicine name
                words = message_lower.replace("add", "").replace("to", "").replace("cart", "").replace("it", "").replace("this", "").strip()
                if len(words) < 3:  # Just "add to cart" type phrases
                    logger.info(f"Follow-up ADD_TO_CART (partial) for: {last_medicine.get('name')}")
                    return {
                        "intent": "ADD_TO_CART",
                        "entities": {"medicine": last_medicine, "quantity": 1},
                        "confidence": 0.95
                    }
            
            # ============================================================
            # 2. PRICE FOLLOW-UP
            # ============================================================
            if len(message_lower.split()) <= 4:
                price_words = ["price", "cost", "how much", "rate", "mrp", "pricing"]
                if any(kw in message_lower for kw in price_words):
                    # Check it's not asking about a different medicine
                    if not any(w in message_lower for w in ["of", "for"]) or message_lower in ["price?", "cost?", "how much?"]:
                        return {
                            "intent": "PRICE_CHECK",
                            "entities": {"medicine_names": [last_medicine.get("name")], "is_followup": True},
                            "confidence": 0.9
                        }
            
            # ============================================================
            # 3. SIDE EFFECTS FOLLOW-UP
            # ============================================================
            if len(message_lower.split()) <= 5:
                safety_words = ["side effect", "effects", "safe", "safety", "harmful", "danger", "risk"]
                if any(kw in message_lower for kw in safety_words):
                    if not any(w in message_lower for w in ["of", "for"]) or message_lower in ["side effects?", "is it safe?", "safe?"]:
                        return {
                            "intent": "SIDE_EFFECTS",
                            "entities": {"medicine_names": [last_medicine.get("name")], "is_followup": True},
                            "confidence": 0.85
                        }
            
            # ============================================================
            # 4. ALTERNATIVES FOLLOW-UP
            # ============================================================
            alt_words = ["alternative", "alternatives", "similar", "other", "different", "else", "another", "substitute", "substitutes"]
            if any(kw in message_lower for kw in alt_words):
                return {
                    "intent": "FIND_ALTERNATIVES",
                    "entities": {"medicine": last_medicine},
                    "confidence": 0.9
                }
            
            # ============================================================
            # 5. DOSAGE FOLLOW-UP
            # ============================================================
            if len(message_lower.split()) <= 5:
                dosage_words = ["dosage", "dose", "how to take", "how much to take", "when to take", "how many", "how often"]
                if any(kw in message_lower for kw in dosage_words):
                    return {
                        "intent": "DOSAGE_INFO",
                        "entities": {"medicine": last_medicine},
                        "confidence": 0.9
                    }
            
            # ============================================================
            # 6. QUANTITY ADD (e.g., "add 5" or "5 please")
            # ============================================================
            quantity_patterns = [
                r"^add\s+(\d+)$",           # "add 5"
                r"^(\d+)\s*(?:please|pls)?$",  # "5" or "5 please"
                r"^add\s+(\d+)\s+(?:units?|tablets?|pcs?)?$",  # "add 5 units"
                r"^i(?:'ll)?\s+take\s+(\d+)$",  # "i'll take 5"
                r"^give\s+me\s+(\d+)$",      # "give me 5"
            ]
            
            for pattern in quantity_patterns:
                match = re.match(pattern, message_lower)
                if match:
                    quantity = int(match.group(1))
                    if 1 <= quantity <= 100:  # Reasonable quantity
                        return {
                            "intent": "ADD_TO_CART",
                            "entities": {"medicine": last_medicine, "quantity": quantity},
                            "confidence": 0.95
                        }
        
        return None
    
    def _pattern_based_classification(self, message: str) -> Dict[str, Any]:
        """Pattern-based intent classification - CART COMMANDS PRIORITIZED"""
        message_lower = message.lower().strip()
        original_message = message.strip()
        
        # ============================================================
        # 1. GREETINGS - Check first for short messages
        # ============================================================
        greetings = ["hello", "hi", "hey", "good morning", "good afternoon", 
                    "good evening", "howdy", "hola", "namaste", "hii", "hiii"]
        
        for g in greetings:
            if message_lower == g or message_lower.startswith(g + " ") or message_lower.startswith(g + "!"):
                return {"intent": "GREETING", "entities": {}, "confidence": 0.99}
        
        cart_with_quantity = [
    # "add 10 paracetamol to cart" / "add 10 paracetamol to the cart"
            r"^add\s+(\d+)\s*(?:units?|tablets?|capsules?|strips?|pieces?|pcs?)?\s*(?:of\s+)?(.+?)(?:\s+to\s+(?:the\s+|my\s+)?cart)?$",
            # "add 10 of paracetamol"
            r"^add\s+(\d+)\s+of\s+(.+?)(?:\s+to\s+(?:the\s+|my\s+)?cart)?$",
            # "i want 10 paracetamol"
            r"^(?:i\s+want|i\s+need|give\s+me|get\s+me)\s+(\d+)\s*(?:units?|tablets?|capsules?)?\s*(?:of\s+)?(.+?)$",
            # "buy 10 paracetamol"
            r"^(?:buy|order|get)\s+(\d+)\s*(?:units?|tablets?|capsules?)?\s*(?:of\s+)?(.+?)$",
            # "10 paracetamol please" or just "10 paracetamol"
            r"^(\d+)\s+(.+?)(?:\s+please)?$",
        ]

        for pattern in cart_with_quantity:
            match = re.search(pattern, message_lower, re.IGNORECASE)
            if match:
                groups = match.groups()
                quantity = None
                medicine_name = None
                
                for g in groups:
                    if g and g.strip():
                        g_clean = g.strip()
                        if g_clean.isdigit():
                            quantity = int(g_clean)
                        else:
                            # Clean and validate
                            cleaned = self._clean_medicine_name(g_clean)
                            # Exclude noise words
                            noise = ['to', 'cart', 'my', 'the', 'please', 'a', 'an', 'some']
                            if cleaned and len(cleaned) >= 2 and cleaned.lower() not in noise:
                                medicine_name = cleaned
                
                if medicine_name and len(medicine_name) >= 2:
                    logger.info(f"SMART_ADD_TO_CART: {medicine_name} x {quantity or 1}")
                    return {
                        "intent": "SMART_ADD_TO_CART",
                        "entities": {
                            "medicine_names": [medicine_name],
                            "quantity": quantity or 1,
                            "raw_query": original_message
                        },
                        "confidence": 0.96
                    }

        # "add [medicine] to cart" (no quantity) - FIXED to include "the"
        cart_no_quantity = [
            r"^add\s+(.+?)\s+to\s+(?:the\s+|my\s+)?cart$",
            r"^add\s+(.+?)\s+to\s+(?:the\s+|my\s+)?basket$",
            r"^add\s+(.+?)\s+in\s+(?:the\s+|my\s+)?cart$",
            r"^put\s+(.+?)\s+in\s+(?:the\s+|my\s+)?cart$",
            r"^put\s+(.+?)\s+to\s+(?:the\s+|my\s+)?cart$",
            r"^(?:can\s+you\s+)?add\s+(.+?)\s+(?:to\s+)?(?:the\s+|my\s+)?cart$",
            r"^(?:please\s+)?add\s+(.+?)\s+(?:to\s+)?(?:the\s+|my\s+)?cart(?:\s+please)?$",
        ]

        for pattern in cart_no_quantity:
            match = re.match(pattern, message_lower)
            if match:
                medicine_name = self._clean_medicine_name(match.group(1))
                # Exclude words that aren't medicine names
                noise = ['it', 'this', 'that', 'some', 'the', 'a', 'an', 'more', 'one']
                if medicine_name and len(medicine_name) >= 2 and medicine_name.lower() not in noise:
                    logger.info(f"SMART_ADD_TO_CART (no qty): {medicine_name}")
                    return {
                        "intent": "SMART_ADD_TO_CART",
                        "entities": {
                            "medicine_names": [medicine_name],
                            "quantity": 1,
                            "raw_query": original_message
                        },
                        "confidence": 0.95
                    }

        # Simple confirmations that use last medicine from context
        simple_add_patterns = [
            r"^add\s*(?:it|this|that)?\s*(?:to\s+(?:the\s+|my\s+)?cart)?$",
            r"^add\s+to\s+(?:the\s+|my\s+)?cart$",
            r"^(?:add|put)\s+(?:it|this|that)\s+(?:in|to)\s+(?:the\s+|my\s+)?cart$",
            r"^(?:yes|ok|okay|sure|yep|yeah),?\s*add\s*(?:it|this|that)?(?:\s+to\s+(?:the\s+)?cart)?$",
            r"^(?:yes|ok|okay|sure|yep|yeah),?\s*(?:please)?$",
            r"^buy\s*(?:it|this|that)?$",
            r"^order\s*(?:it|this|that)?$",
            r"^i(?:'ll| will)?\s+(?:take|buy|want|get)\s+(?:it|this|that|one)$",
            r"^(?:yes|ok),?\s*i(?:'ll)?\s+take\s+(?:it|this|that)?$",
            r"^add$",
            r"^yes$",
            r"^ok$",
            r"^okay$",
            r"^sure$",
        ]

        for pattern in simple_add_patterns:
            if re.match(pattern, message_lower):
                logger.info("ADD_TO_CART (use context medicine)")
                return {
                    "intent": "ADD_TO_CART",
                    "entities": {"use_last_medicine": True, "quantity": 1},
                    "confidence": 0.95
                }
        
        # ============================================================
        # 3. ORDER STATUS
        # ============================================================
        order_keywords = [
            "track my order", "track order", "track orders",
            "where is my order", "where's my order",
            "order status", "my order", "my orders",
            "view order", "show orders", "check order",
            "delivery status", "shipping status"
        ]
        
        if any(keyword in message_lower for keyword in order_keywords):
            return {"intent": "ORDER_STATUS", "entities": {"raw_query": original_message}, "confidence": 0.95}
        
        if message_lower in ["track", "orders", "order", "my orders"]:
            return {"intent": "ORDER_STATUS", "entities": {"raw_query": original_message}, "confidence": 0.95}
        
        # ============================================================
        # 4. REORDER
        # ============================================================
        reorder_keywords = ["reorder", "order again", "buy again", "repeat order", "refill"]
        if any(keyword in message_lower for keyword in reorder_keywords):
            return {"intent": "REORDER", "entities": {"raw_query": original_message}, "confidence": 0.95}
        
        # ============================================================
        # 5. SIDE EFFECTS
        # ============================================================
        side_effect_patterns = [
            r"(?:what are (?:the )?)?side effects? (?:of |for )?(.+?)(?:\?|$)",
            r"(.+?)\s+side effects?(?:\?|$)",
            r"is (.+?) safe(?:\?)?$",
        ]
        
        for pattern in side_effect_patterns:
            match = re.search(pattern, message_lower, re.IGNORECASE)
            if match:
                medicine_name = match.group(1).strip()
                noise = ['the', 'of', 'for', 'about', 'what', 'are', 'is']
                words = medicine_name.split()
                cleaned = [w for w in words if w.lower() not in noise]
                medicine_name = ' '.join(cleaned).strip().rstrip('?!.,').strip()
                
                if medicine_name and len(medicine_name) >= 3:
                    return {
                        "intent": "SIDE_EFFECTS",
                        "entities": {"medicine_names": [medicine_name.title()], "raw_query": original_message},
                        "confidence": 0.95
                    }
        
        # ============================================================
        # 6. PRICE CHECK
        # ============================================================
        price_patterns = [
            r"(?:what(?:'s| is)(?: the)? )?price (?:of |for )?(.+?)(?:\?|$)",
            r"how much (?:is |does |for |cost )?(.+?)(?:\?|cost\?|$)",
            r"(?:what(?:'s| is)(?: the)? )?cost (?:of |for )?(.+?)(?:\?|$)",
            r"(.+?) (?:price|cost|rate|mrp)(?:\?)?$",
        ]
        
        for pattern in price_patterns:
            match = re.search(pattern, message_lower, re.IGNORECASE)
            if match:
                medicine_name = self._clean_medicine_name(match.group(1))
                if medicine_name and len(medicine_name) >= 3:
                    return {
                        "intent": "PRICE_CHECK",
                        "entities": {"medicine_names": [medicine_name], "raw_query": original_message},
                        "confidence": 0.95
                    }
        
        # ============================================================
        # 7. STOCK CHECK
        # ============================================================
        stock_patterns = [
            r"do you have (.+?)(?:\?|$)",
            r"(?:is |are )?(.+?) (?:available|in stock)(?:\?)?$",
            r"can i (?:get|buy|order) (.+?)(?:\?|$)",
        ]
        
        for pattern in stock_patterns:
            match = re.search(pattern, message_lower)
            if match:
                medicine_name = self._clean_medicine_name(match.group(1))
                if medicine_name and len(medicine_name) >= 3:
                    return {
                        "intent": "CHECK_STOCK",
                        "entities": {"medicine_names": [medicine_name], "raw_query": original_message},
                        "confidence": 0.9
                    }
        
        # ============================================================
        # 8. SYMPTOM DETECTION
        # ============================================================
        detected_symptoms = []
        recommended_medicines = []
        
        for symptom, medicines in self.symptom_medicine_map.items():
            pattern = r'\b' + re.escape(symptom) + r'(?:s|ing|ed)?\b'
            if re.search(pattern, message_lower):
                detected_symptoms.append(symptom)
                recommended_medicines.extend(medicines)
        
        recommended_medicines = list(dict.fromkeys(recommended_medicines))
        
        if detected_symptoms:
            return {
                "intent": "BUY_MEDICINE",
                "entities": {
                    "symptoms": detected_symptoms,
                    "recommended_medicines": recommended_medicines[:5],
                    "raw_query": original_message
                },
                "confidence": 0.9
            }
        
        # ============================================================
        # 9. BUY INTENT (generic)
        # ============================================================
        buy_patterns = [
            r"(?:i )?(?:want|need|require) (.+?)(?:\?|$)",
            r"(?:give|get|bring) me (.+?)(?:\?|$)",
        ]
        
        for pattern in buy_patterns:
            match = re.search(pattern, message_lower)
            if match:
                medicine_name = self._clean_medicine_name(match.group(1))
                if medicine_name and len(medicine_name) >= 3:
                    return {
                        "intent": "BUY_MEDICINE",
                        "entities": {"medicine_names": [medicine_name], "raw_query": original_message},
                        "confidence": 0.8
                    }
        
        # ============================================================
        # 10. DRUG INTERACTION
        # ============================================================
        if any(word in message_lower for word in ["interaction", "interact", "mix", "combine", "together"]):
            return {"intent": "DRUG_INTERACTION", "entities": {"raw_query": original_message}, "confidence": 0.85}
        
        # ============================================================
        # 11. THANKS
        # ============================================================
        if any(word in message_lower for word in ["thank", "thanks", "bye", "goodbye"]):
            return {"intent": "THANKS", "entities": {}, "confidence": 0.9}
        
        # ============================================================
        # 12. DEFAULT - Check if looks like medicine name
        # ============================================================
        if self._looks_like_medicine_name(original_message):
            return {
                "intent": "BUY_MEDICINE",
                "entities": {"medicine_names": [original_message.strip().title()], "raw_query": original_message},
                "confidence": 0.6
            }
        
        return {"intent": "GENERAL", "entities": {"raw_query": original_message}, "confidence": 0.5}

    def _clean_medicine_name(self, name: str) -> str:
        """Clean medicine name"""
        if not name:
            return ""
        
        noise_patterns = [
            r'\bthe\b', r'\ba\b', r'\ban\b', r'\bsome\b',
            r'\bplease\b', r'\bthanks?\b', r'\bmedicine\b',
            r'\btablets?\b', r'\bcapsules?\b', r'\bsyrup\b',
        ]
        
        name_clean = name.lower().strip()
        
        for noise in noise_patterns:
            name_clean = re.sub(noise, ' ', name_clean, flags=re.IGNORECASE)
        
        name_clean = re.sub(r'[^\w\s\-]', '', name_clean)
        name_clean = ' '.join(name_clean.split()).strip()
        
        if name_clean:
            name_clean = name_clean.title()
        
        return name_clean
    
    def _looks_like_medicine_name(self, text: str) -> bool:
        """Check if text looks like a medicine name"""
        text = text.strip()
        
        if len(text) < 3 or len(text) > 50:
            return False
        
        non_medicine = [
            "what", "how", "why", "when", "where", "which", "who",
            "can", "could", "would", "should", "will", "shall",
            "please", "thanks", "help", "tell me", "show me",
            "browse", "view", "cart", "checkout", "track"
        ]
        
        text_lower = text.lower()
        if any(word in text_lower for word in non_medicine):
            return False
        
        return len(text.split()) <= 4
    
    def _auto_correct_spelling(self, query: str) -> tuple:
        """Auto-correct spelling mistakes"""
        if not self.spell:
            return query, False
        
        words = query.split()
        corrected = []
        was_corrected = False
        
        for word in words:
            if len(word) <= 2 or word.isdigit():
                corrected.append(word)
                continue
            
            word_lower = word.lower()
            
            if word_lower not in self.spell:
                correction = self.spell.correction(word_lower)
                if correction and correction != word_lower:
                    corrected.append(correction.title())
                    was_corrected = True
                else:
                    corrected.append(word)
            else:
                corrected.append(word)
        
        return ' '.join(corrected), was_corrected
    
    def _find_best_medicine_match(self, query: str, medicines: List[Dict]) -> tuple:
        """Find the best matching medicine"""
        if not medicines:
            return None, 0
        
        query_lower = query.lower().strip()
        query_words = set(query_lower.split())
        
        best_match = None
        best_score = 0
        
        for med in medicines:
            med_name_lower = med["name"].lower()
            med_words = set(med_name_lower.split())
            
            score = 0
            
            if query_lower == med_name_lower:
                score = 100
            elif med_name_lower.split()[0].lower() == query_lower:
                score = 98
            elif query_words and med_words:
                query_first = list(query_words)[0] if query_words else ""
                med_first = med_name_lower.split()[0]
                if query_first == med_first:
                    score = 95
            elif med_name_lower.startswith(query_lower):
                score = 90
            elif query_lower in med_name_lower:
                score = 85
            else:
                clean_query = {w for w in query_words if len(w) > 2}
                clean_med = {w for w in med_words if len(w) > 2}
                if clean_query and clean_med:
                    common = clean_query & clean_med
                    if common:
                        score = 70 + (len(common) * 5)
            
            if score > best_score:
                best_score = score
                best_match = med
        
        return best_match, best_score
    
    # ==================== INTENT HANDLERS ====================
    
    async def _handle_intent(
        self,
        intent: str,
        entities: Dict,
        message: str,
        user_allergies: List[str],
        memory: ConversationMemory,
        trace=None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Handle different intents"""
        
        logger.info(f"Handling intent: {intent}, entities: {entities}")
        
        try:
            if intent == "BUY_MEDICINE" or intent == "PRICE_CHECK" or intent == "CHECK_STOCK":
                return await self._handle_medicine_search(entities, message, user_allergies, memory, trace)
            
            elif intent == "SMART_ADD_TO_CART":
                return await self._handle_smart_add_to_cart(entities, message, user_allergies, memory, trace)
            
            elif intent == "SIDE_EFFECTS":
                return await self._handle_side_effects(entities, message, user_allergies, memory, trace)
            
            elif intent == "DOSAGE_INFO":
                return await self._handle_dosage_info(entities, message, user_allergies, memory, trace)
            
            elif intent == "DRUG_INTERACTION":
                return await self._handle_drug_interaction(entities, message, user_allergies, memory, trace)
            
            elif intent == "ADD_TO_CART":
                return await self._handle_add_to_cart(entities, message, user_allergies, memory, trace)
            
            elif intent == "FIND_ALTERNATIVES":
                return await self._handle_find_alternatives(entities, message, user_allergies, memory, trace)
            
            elif intent == "ORDER_STATUS":
                return await self._handle_order_status(user_id=user_id, trace=trace)
            
            elif intent == "REORDER":
                return await self._handle_reorder(user_id=user_id, trace=trace)
            
            elif intent == "GREETING":
                return self._handle_greeting()
            
            elif intent == "THANKS":
                return self._handle_thanks()
            
            elif intent == "GENERAL":
                return await self._handle_general(entities, message, user_allergies, memory, trace)
            
            else:
                return await self._handle_general(entities, message, user_allergies, memory, trace)
        
        except Exception as e:
            logger.error(f"Handle intent error for intent={intent}: {e}", exc_info=True)
            return {
                "message": "I'm having trouble processing that. Please try again.",
                "suggestions": ["Browse medicines", "Help"],
                "data": {"error": str(e)}
            }
    
    async def _handle_medicine_search(
        self,
        entities: Dict,
        message: str,
        user_allergies: List[str],
        memory: ConversationMemory,
        trace=None
    ) -> Dict[str, Any]:
        """Handle medicine search"""
        
        symptoms = entities.get("symptoms", [])
        recommended = entities.get("recommended_medicines", [])
        medicine_names = entities.get("medicine_names", [])
        
        # Build search queries
        search_queries = []
        
        if medicine_names:
            search_queries.extend(medicine_names)
        
        if recommended:
            search_queries.extend(recommended)
        
        if not search_queries:
            raw_query = entities.get("raw_query", message)
            cleaned = self._clean_medicine_name(raw_query)
            if cleaned and len(cleaned) >= 3:
                search_queries.append(cleaned)
        
        if not search_queries and symptoms:
            for symptom in symptoms:
                if symptom in self.symptom_medicine_map:
                    search_queries.extend(self.symptom_medicine_map[symptom][:3])
            search_queries = list(dict.fromkeys(search_queries))
        
        # Try each query
        best_result = None
        best_score = 0
        corrected_query = None
        searched_term = None
        all_results = []
        
        for query in search_queries:
            if not query or len(query) < 2:
                continue
            
            searched_term = query
            
            corrected, was_corrected = self._auto_correct_spelling(query)
            if was_corrected:
                corrected_query = f"{query} → {corrected}"
                query = corrected
            
            try:
                search_result = self.medicine_agent.search_medicines(query, limit=10)
                
                if search_result.get("found") and search_result.get("medicines"):
                    medicines = search_result["medicines"]
                    all_results.extend(medicines)
                    match, score = self._find_best_medicine_match(query, medicines)
                    
                    if match and score > best_score:
                        best_result = match
                        best_score = score
                    
                    if best_score >= 90:
                        break
            except Exception as e:
                logger.error(f"Search error for query '{query}': {e}")
                continue
        
        # If found a medicine
        if best_result and best_score >= 60:
            memory.set_context("last_medicine", best_result)
            memory.set_context("last_intent", "MEDICINE_SEARCH")
            
            try:
                safety_result = self.safety_agent.check_drug_safety(
                    best_result["name"],
                    user_allergies=user_allergies or []
                )
            except Exception as e:
                safety_result = {"warnings": [], "alerts": [], "safe": True}
            
            return self._build_medicine_response(best_result, safety_result, symptoms, corrected_query)
        
        # Show symptom recommendations
        if symptoms and recommended:
            rec_list = "\n".join([f"• **{med}**" for med in recommended[:5]])
            
            return {
                "message": f"💊 For **{', '.join(symptoms)}**, I recommend:\n\n{rec_list}\n\n🔍 Click on any medicine to see details and pricing!",
                "suggestions": recommended[:3] + ["Browse categories"],
                "data": {
                    "symptoms": symptoms,
                    "recommendations": recommended,
                    "found": False,
                    "action": "SHOW_RECOMMENDATIONS"
                }
            }
        
        # Show any results we found
        if all_results:
            seen = set()
            unique_results = []
            for med in all_results:
                if med.get("name") not in seen:
                    seen.add(med.get("name"))
                    unique_results.append(med)
            
            if unique_results:
                memory.set_context("last_medicine", unique_results[0])
                
                try:
                    safety_result = self.safety_agent.check_drug_safety(
                        unique_results[0]["name"],
                        user_allergies=user_allergies or []
                    )
                except:
                    safety_result = {"warnings": [], "alerts": [], "safe": True}
                
                return self._build_medicine_response(unique_results[0], safety_result, symptoms, corrected_query)
        
        # No results
        search_term = searched_term or (search_queries[0] if search_queries else message)
        
        return {
            "message": f"❌ I couldn't find **'{search_term}'**.\n\n🔍 **Suggestions:**\n• Check spelling\n• Use generic name\n• Browse categories\n• Describe symptoms",
            "suggestions": recommended[:3] if recommended else ["Browse categories", "View all medicines", "I have symptoms"],
            "data": {"searched_for": search_term, "found": False}
        }
    
    def _build_medicine_response(
        self,
        medicine: Dict,
        safety_result: Dict,
        symptoms: List[str],
        corrected_query: Optional[str] = None
    ) -> Dict[str, Any]:
        """Build formatted medicine response"""
        
        warnings = safety_result.get("warnings", []) + safety_result.get("alerts", [])
        warning_text = ""
        if warnings:
            warning_text = "\n\n⚠️ **Warnings:**\n" + "\n".join([f"• {w}" for w in warnings[:3]])
        
        rx_badge = "🔴 **Prescription Required**" if medicine.get("prescription_required") else "🟢 **No Prescription Needed**"
        stock_status = "✅ In Stock" if medicine.get("in_stock") else "❌ Out of Stock"
        
        symptom_text = ""
        if symptoms:
            symptom_text = f"\n💊 **Good for:** {', '.join(symptoms).title()}"
        
        correction_text = ""
        if corrected_query:
            correction_text = f"\n🔍 **Did you mean:** {corrected_query}"
        
        response_msg = f"""✅ I found **{medicine['name']}**!{symptom_text}{correction_text}

💰 **Price:** ₹{medicine.get('price', 0)}
💊 **Dosage:** {medicine.get('dosage', 'N/A')}
🏭 **Brand:** {medicine.get('brand', 'N/A')}
📦 **Stock:** {stock_status}
{rx_badge}{warning_text}

Would you like to add this to your cart?"""

        if medicine.get("in_stock"):
            suggestions = ["Add to cart", "Side effects?", "Find alternatives"]
        else:
            suggestions = ["Find alternatives", "Notify when available", "Browse similar"]
        
        return {
            "message": response_msg,
            "data": {
                "medicine": medicine,
                "safety": safety_result,
                "action": "ADD_TO_CART" if medicine.get("in_stock") else "FIND_ALTERNATIVES"
            },
            "suggestions": suggestions,
            "requires_action": medicine.get("in_stock", False)
        }
    
    async def _handle_side_effects(
        self,
        entities: Dict,
        message: str,
        user_allergies: List[str],
        memory: ConversationMemory,
        trace=None
    ) -> Dict[str, Any]:
        """Handle side effects queries"""
        
        medicine_names = entities.get("medicine_names", [])
        is_followup = entities.get("is_followup", False)
        
        if not medicine_names and not is_followup:
            raw_query = entities.get("raw_query", message)
            
            patterns = [
                r"side effects? (?:of |for )?(.+?)(?:\?|$)",
                r"(.+?)\s+side effects?(?:\?|$)",
                r"is (.+?) safe(?:\?)?$",
            ]
            
            for pattern in patterns:
                match = re.search(pattern, raw_query.lower())
                if match:
                    extracted = match.group(1).strip()
                    noise = ['the', 'of', 'for', 'about']
                    words = extracted.split()
                    cleaned = [w for w in words if w not in noise]
                    extracted = ' '.join(cleaned).strip().rstrip('?!.,')
                    
                    if extracted and len(extracted) >= 3:
                        medicine_names = [extracted.title()]
                        break
        
        if not medicine_names:
            last_medicine = memory.get_context("last_medicine")
            if last_medicine:
                medicine_names = [last_medicine.get("name")]
        
        if not medicine_names:
            return {
                "message": "Which medicine would you like to know the side effects for?\n\nPlease tell me the medicine name, for example:\n• 'Side effects of Paracetamol'\n• 'Is Ibuprofen safe?'",
                "suggestions": ["Paracetamol side effects", "Ibuprofen side effects", "Amoxicillin side effects"],
                "data": {}
            }
        
        query = medicine_names[0]
        corrected, was_corrected = self._auto_correct_spelling(query)
        if was_corrected:
            query = corrected
        
        search = self.medicine_agent.search_medicines(query, limit=10)
        
        if search.get("found") and search["medicines"]:
            medicines = search["medicines"]
            best_match, best_score = self._find_best_medicine_match(query, medicines)
            
            if best_match and best_score >= 65:
                med_details = self.medicine_agent.get_medicine_details(best_match["id"])
                
                if med_details.get("found"):
                    med = med_details["medicine"]
                    side_effects = med.get("side_effects", [])
                    
                    memory.set_context("last_medicine", med)
                    
                    if side_effects:
                        effects_list = "\n".join([f"• {effect}" for effect in side_effects[:8]])
                        return {
                            "message": f"**Side effects of {med['name']}:**\n\n{effects_list}\n\n⚠️ If you experience severe side effects, stop using and consult a doctor immediately.",
                            "suggestions": [f"Buy {med['name']}", "Find alternatives", "Check price"],
                            "data": {"medicine": med, "side_effects": side_effects}
                        }
                    else:
                        return {
                            "message": f"**{med['name']}** generally has no commonly reported side effects listed.\n\n💡 However, always:\n• Read the package insert\n• Consult a doctor if you notice anything unusual",
                            "suggestions": [f"Buy {med['name']}", "Check price", "Browse medicines"],
                            "data": {"medicine": med}
                        }
        
        return {
            "message": f"❌ I couldn't find **'{medicine_names[0]}'** in our database.\n\n🔍 Please check the spelling or browse our catalog.",
            "suggestions": ["Browse medicines", "Search by category", "Help"],
            "data": {"searched_for": medicine_names[0], "found": False}
        }
    
    async def _handle_dosage_info(
        self,
        entities: Dict,
        message: str,
        user_allergies: List[str],
        memory: ConversationMemory,
        trace=None
    ) -> Dict[str, Any]:
        """Handle dosage information queries"""
        
        medicine = entities.get("medicine")
        medicine_names = entities.get("medicine_names", [])
        
        if not medicine and not medicine_names:
            last_medicine = memory.get_context("last_medicine")
            if last_medicine:
                medicine = last_medicine
        
        if not medicine and not medicine_names:
            return {
                "message": "Which medicine would you like dosage information for?",
                "suggestions": ["Paracetamol dosage", "How to take Ibuprofen", "Browse medicines"],
                "data": {}
            }
        
        if not medicine and medicine_names:
            search = self.medicine_agent.search_medicines(medicine_names[0], limit=5)
            if search.get("found") and search["medicines"]:
                best_match, score = self._find_best_medicine_match(medicine_names[0], search["medicines"])
                if best_match and score >= 60:
                    medicine = best_match
        
        if medicine:
            med_details = self.medicine_agent.get_medicine_details(medicine["id"])
            if med_details.get("found"):
                med = med_details["medicine"]
                dosage = med.get("dosage", "Not specified")
                
                memory.set_context("last_medicine", med)
                
                return {
                    "message": f"**Dosage Information for {med['name']}:**\n\n💊 **Dosage:** {dosage}\n\n⚠️ **Important:** Always follow your doctor's prescription.",
                    "suggestions": ["Side effects?", "Buy this medicine", "Talk to pharmacist"],
                    "data": {"medicine": med}
                }
        
        return {
            "message": "I couldn't find dosage information for that medicine. Please consult a pharmacist.",
            "suggestions": ["Browse medicines", "Talk to pharmacist", "Help"],
            "data": {}
        }
    
    async def _handle_drug_interaction(
        self,
        entities: Dict,
        message: str,
        user_allergies: List[str],
        memory: ConversationMemory,
        trace=None
    ) -> Dict[str, Any]:
        """Handle drug interaction queries"""
        
        return {
            "message": "⚠️ **Drug Interactions**\n\nFor accurate drug interaction information:\n\n1. 👨‍⚕️ **Consult your doctor**\n2. 💊 **Talk to our pharmacist** - Call +91 1800-XXX-XXXX\n3. 📋 **Check medicine leaflets**\n\n**Never combine medications without professional advice.**",
            "suggestions": ["Talk to pharmacist", "Browse medicines", "Check side effects"],
            "data": {"requires_professional_advice": True}
        }
    
    async def _handle_add_to_cart(
        self,
        entities: Dict,
        message: str,
        user_allergies: List[str],
        memory: ConversationMemory,
        trace=None
    ) -> Dict[str, Any]:
        """Handle add to cart action - uses context medicine"""
        
        medicine = entities.get("medicine")
        quantity = entities.get("quantity", 1)
        use_last = entities.get("use_last_medicine", False)
        
        # Get medicine from context if not provided
        if not medicine or use_last:
            last_medicine = memory.get_context("last_medicine")
            if last_medicine:
                medicine = last_medicine
            else:
                return {
                    "message": "Which medicine would you like to add to cart?\n\nPlease search for a medicine first, or tell me what you need.",
                    "suggestions": ["Browse medicines", "I need painkillers", "Search medicine"],
                    "data": {}
                }
        
        # Check stock
        if not medicine.get("in_stock", True):
            return {
                "message": f"Sorry, **{medicine.get('name')}** is currently out of stock.\n\nWould you like me to find alternatives?",
                "suggestions": ["Find alternatives", "Browse medicines", "Notify when available"],
                "data": {"medicine": medicine, "action": "OUT_OF_STOCK"}
            }
        
        # Calculate price
        unit_price = medicine.get("price", 0)
        total_price = unit_price * quantity
        
        # Build response
        qty_text = f"{quantity} unit{'s' if quantity > 1 else ''}" if quantity > 1 else ""
        price_text = f"₹{unit_price}" if quantity == 1 else f"₹{unit_price} × {quantity} = ₹{total_price}"
        
        return {
            "message": f"""🛒 **Added to Cart!**

    **{medicine.get('name')}** {qty_text}
    💰 {price_text}

    What else would you like?""",
            "data": {
                "medicine": medicine,
                "quantity": quantity,
                "unit_price": unit_price,
                "total_price": total_price,
                "action": "ADD_TO_CART",
                "auto_add": True  # Signal frontend to auto-add
            },
            "suggestions": ["View cart", "Continue shopping", "Checkout"],
            "requires_action": True
        }
        
    async def _handle_find_alternatives(
        self,
        entities: Dict,
        message: str,
        user_allergies: List[str],
        memory: ConversationMemory,
        trace=None
    ) -> Dict[str, Any]:
        """Handle find alternatives request"""
        
        medicine = entities.get("medicine")
        
        if not medicine:
            last_medicine = memory.get_context("last_medicine")
            if last_medicine:
                medicine = last_medicine
        
        if not medicine:
            return {
                "message": "Which medicine would you like alternatives for?\n\nPlease search for a medicine first.",
                "suggestions": ["Browse medicines", "I have symptoms", "Search medicine"],
                "data": {}
            }
        
        med_details = self.medicine_agent.get_medicine_details(medicine.get("id"))
        category = ""
        if med_details.get("found"):
            category = med_details["medicine"].get("category", "")
        
        search_result = self.medicine_agent.search_medicines(category, limit=6) if category else {"found": False}
        
        alternatives = []
        if search_result.get("found") and search_result.get("medicines"):
            alternatives = [m for m in search_result["medicines"] if m.get("id") != medicine.get("id")][:4]
        
        if alternatives:
            alt_list = "\n".join([f"• **{m['name']}** - ₹{m.get('price', 0)} {'✅' if m.get('in_stock') else '❌'}" for m in alternatives])
            return {
                "message": f"**Alternatives to {medicine.get('name')}:**\n\n{alt_list}",
                "suggestions": [m["name"] for m in alternatives[:3]] + ["Browse more"],
                "data": {"alternatives": alternatives, "original_medicine": medicine}
            }
        
        return {
            "message": f"I couldn't find alternatives to **{medicine.get('name')}** right now.\n\nTry browsing our categories.",
            "suggestions": ["Browse categories", "I have symptoms", "Search medicines"],
            "data": {"original_medicine": medicine}
        }
    
    async def _handle_order_status(
        self,
        user_id: Optional[str] = None,
        trace=None
    ) -> Dict[str, Any]:
        """Handle order status queries"""
        
        if not user_id:
            return {
                "message": "📦 **Track Your Order**\n\nPlease log in to view your orders.",
                "suggestions": ["Login", "Browse medicines", "Help"],
                "data": {"action": "REQUIRE_LOGIN"}
            }
        
        try:
            from app.database.mongodb import get_sync_collection
            
            orders_collection = get_sync_collection("orders")
            recent_orders = list(orders_collection.find({
                "customer_id": user_id
            }).sort("created_at", -1).limit(5))
            
            if not recent_orders:
                return {
                    "message": "📦 **Your Orders**\n\nYou don't have any orders yet!\n\n💡 Browse our medicine catalog to get started.",
                    "suggestions": ["Browse medicines", "I have symptoms", "View categories"],
                    "data": {"action": "NO_ORDERS", "has_orders": False}
                }
            
            status_emoji = {
                "pending": "🕐", "confirmed": "✅", "processing": "📦",
                "dispatched": "🚚", "shipped": "🚚", "out_for_delivery": "🏃",
                "delivered": "✅", "cancelled": "❌"
            }
            
            status_messages = {
                "pending": "Awaiting confirmation", "confirmed": "Order confirmed",
                "processing": "Being prepared", "dispatched": "On the way",
                "delivered": "Delivered successfully", "cancelled": "Order cancelled"
            }
            
            orders_text = ""
            order_list = []
            
            for i, order in enumerate(recent_orders[:3]):
                status = order.get("status", "pending")
                emoji = status_emoji.get(status, "📦")
                status_text = status_messages.get(status, status.title())
                
                order_date = ""
                if order.get("created_at"):
                    order_date = order["created_at"].strftime("%b %d, %Y")
                
                order_data = {
                    "id": str(order["_id"]),
                    "order_number": order.get("order_number", f"ORD-{i+1}"),
                    "status": status,
                    "total": order.get("total_amount", 0),
                    "date": order_date
                }
                order_list.append(order_data)
                
                orders_text += f"\n\n{emoji} **Order #{order_data['order_number']}**\n"
                orders_text += f"   Status: {status_text}\n"
                orders_text += f"   Items: {len(order.get('items', []))} | Total: ₹{order_data['total']}\n"
                orders_text += f"   Date: {order_date}"
            
            return {
                "message": f"📦 **Your Recent Orders**{orders_text}",
                "suggestions": ["View all orders", "Reorder medicines", "Browse more"],
                "data": {"action": "SHOW_ORDERS", "orders": order_list},
                "requires_action": True
            }
        
        except Exception as e:
            logger.error(f"Order fetch error: {e}")
            return {
                "message": "📦 I'm having trouble fetching your orders. Please try the 'My Orders' menu.",
                "suggestions": ["Try again", "Browse medicines", "Contact support"],
                "data": {"action": "VIEW_ORDERS_ERROR", "error": str(e)}
            }
    
    async def _handle_reorder(
        self,
        user_id: Optional[str] = None,
        trace=None
    ) -> Dict[str, Any]:
        """Handle reorder requests"""
        
        if not user_id:
            return {
                "message": "🔄 **Reorder Medicines**\n\nPlease log in to view your previous orders.",
                "suggestions": ["Login", "Browse medicines", "Help"],
                "data": {"action": "REQUIRE_LOGIN"}
            }
        
        try:
            from app.database.mongodb import get_sync_collection
            from bson import ObjectId
            from collections import Counter
            
            orders_collection = get_sync_collection("orders")
            medicines_collection = get_sync_collection("medicines")
            
            recent_orders = list(orders_collection.find({
                "customer_id": user_id,
                "status": {"$in": ["delivered", "confirmed", "processing"]}
            }).sort("created_at", -1).limit(10))
            
            if not recent_orders:
                return {
                    "message": "🔄 **Reorder Medicines**\n\nNo previous orders found. Start shopping to build your order history!",
                    "suggestions": ["Browse medicines", "I have symptoms", "View categories"],
                    "data": {"action": "NO_ORDERS"}
                }
            
            medicine_counts = Counter()
            medicine_details = {}
            
            for order in recent_orders:
                for item in order.get("items", []):
                    med_id = item.get("medicine_id")
                    med_name = item.get("medicine_name", "Unknown")
                    quantity = item.get("quantity", 1)
                    
                    medicine_counts[med_id] += quantity
                    
                    if med_id not in medicine_details:
                        medicine_details[med_id] = {
                            "id": med_id,
                            "name": med_name,
                            "last_price": item.get("unit_price", 0),
                            "last_quantity": quantity
                        }
            
            top_medicines = []
            for med_id, count in medicine_counts.most_common(5):
                med_info = medicine_details.get(med_id, {})
                
                try:
                    current_med = medicines_collection.find_one({"_id": ObjectId(med_id)})
                    if current_med:
                        med_info["current_price"] = current_med.get("unit_price", med_info.get("last_price", 0))
                        med_info["in_stock"] = current_med.get("stock_quantity", 0) > 0
                    else:
                        med_info["current_price"] = med_info.get("last_price", 0)
                        med_info["in_stock"] = False
                except:
                    med_info["in_stock"] = True
                
                med_info["total_ordered"] = count
                top_medicines.append(med_info)
            
            if top_medicines:
                meds_text = ""
                for i, med in enumerate(top_medicines, 1):
                    stock_icon = "✅" if med.get("in_stock") else "❌"
                    meds_text += f"\n\n{i}. **{med['name']}**\n"
                    meds_text += f"   💰 ₹{med.get('current_price', 0)} | {stock_icon}"
                
                suggestions = [med["name"] for med in top_medicines[:3] if med.get("in_stock")]
                if len(suggestions) < 3:
                    suggestions.extend(["Browse medicines", "Track order"])
                
                return {
                    "message": f"🔄 **Reorder Your Medicines**\n\nFrequently ordered:{meds_text}\n\n💡 Click any medicine to add to cart!",
                    "suggestions": suggestions[:4],
                    "data": {"action": "SHOW_REORDER", "medicines": top_medicines},
                    "requires_action": True
                }
            
            return {
                "message": "🔄 No medicines found from previous orders.",
                "suggestions": ["Browse medicines", "I have symptoms", "Help"],
                "data": {"action": "NO_MEDICINES"}
            }
        
        except Exception as e:
            logger.error(f"Reorder error: {e}")
            return {
                "message": "🔄 I'm having trouble fetching your order history. Please try 'My Orders' in the menu.",
                "suggestions": ["Browse medicines", "Track order", "Help"],
                "data": {"action": "REORDER_ERROR", "error": str(e)}
            }
    
    def _handle_greeting(self) -> Dict[str, Any]:
        """Handle greeting messages"""
        hour = datetime.now().hour
        if hour < 12:
            greeting = "Good morning"
        elif hour < 17:
            greeting = "Good afternoon"
        else:
            greeting = "Good evening"
        
        return {
            "message": f"""{greeting}! 👋 Welcome to **GoMed Pharmacy**!

I'm your AI Pharmacist Assistant. I can help you with:

🩺 **Find medicine for symptoms** - "I have a headache"
💰 **Check prices** - "Price of Paracetamol"
🔍 **Search medicines** - "Do you have Amoxicillin?"
💊 **Medicine info** - "Side effects of Ibuprofen"
📦 **Track orders** - "Where is my order?"

What can I help you with today?""",
            "suggestions": ["I have a fever", "Browse medicines", "Track my order", "Help"],
            "data": {}
        }
    
    def _handle_thanks(self) -> Dict[str, Any]:
        """Handle thank you messages"""
        return {
            "message": "You're welcome! 😊\n\nThank you for choosing **GoMed Pharmacy**. Stay healthy!\n\nFeel free to come back if you have any more questions.",
            "suggestions": ["Browse medicines", "View cart", "Start new search"],
            "data": {}
        }
    
    async def _handle_general(
        self,
        entities: Dict,
        message: str,
        user_allergies: List[str],
        memory: ConversationMemory,
        trace=None
    ) -> Dict[str, Any]:
        """Handle general queries"""
        
        # Try medicine search as fallback
        search_result = self.medicine_agent.search_medicines(message, limit=5)
        
        if search_result.get("found") and search_result.get("medicines"):
            best_match, score = self._find_best_medicine_match(message, search_result["medicines"])
            
            if best_match and score >= 60:
                memory.set_context("last_medicine", best_match)
                
                try:
                    safety_result = self.safety_agent.check_drug_safety(
                        best_match["name"],
                        user_allergies=user_allergies or []
                    )
                except:
                    safety_result = {"warnings": [], "alerts": [], "safe": True}
                
                return self._build_medicine_response(best_match, safety_result, [])
        
        # Use LLM for general response
        if self.use_groq and self.groq_client:
            try:
                response = self.groq_client.chat.completions.create(
                    model=settings.GROQ_LLM_MODEL,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": message}
                    ],
                    temperature=0.7,
                    max_tokens=300
                )
                
                return {
                    "message": response.choices[0].message.content,
                    "suggestions": ["Search medicines", "Browse categories", "I have symptoms"],
                    "data": {}
                }
            except:
                pass
        
        if self.openai_client:
            try:
                from openai import OpenAI
                response = self.openai_client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": message}
                    ],
                    temperature=0.7,
                    max_tokens=300
                )
                
                return {
                    "message": response.choices[0].message.content,
                    "suggestions": ["Search medicines", "Browse categories", "I have symptoms"],
                    "data": {}
                }
            except:
                pass
        
        # Final fallback
        return {
            "message": "I'm here to help with your pharmacy needs! 💊\n\n**I can assist you with:**\n\n🩺 **Tell me your symptoms** - I'll suggest medicines\n💰 **Ask about prices** - 'Price of [medicine]'\n🔍 **Search medicines** - By name or category\n📦 **Track orders** - Check delivery status\n\nWhat would you like to do?",
            "suggestions": ["I have symptoms", "Browse medicines", "Help", "Track order"],
            "data": {}
        }
    
    async def _handle_smart_add_to_cart(
        self,
        entities: Dict,
        message: str,
        user_allergies: List[str],
        memory: ConversationMemory,
        trace=None
    ) -> Dict[str, Any]:
        """
        Handle smart cart commands with quantity extraction.
        Examples:   
        - "Add 10 units of Paracetamol to cart"
        - "Add Ibuprofen to cart"
        - "I want 5 Cetirizine"
        """
        
        medicine_names = entities.get("medicine_names", [])
        quantity = entities.get("quantity", 1)
        
        if not medicine_names:
            # Check if we should use last medicine
            if entities.get("use_last_medicine"):
                last_medicine = memory.get_context("last_medicine")
                if last_medicine:
                    return {
                        "message": f"🛒 Adding **{last_medicine.get('name')}** ({quantity} unit{'s' if quantity > 1 else ''}) to your cart!",
                        "data": {
                            "medicine": last_medicine,
                            "quantity": quantity,
                            "action": "ADD_TO_CART",
                            "auto_add": True
                        },
                        "suggestions": ["View cart", "Continue shopping", "Checkout"],
                        "requires_action": True
                    }
            
            return {
                "message": "Which medicine would you like to add to cart? Please specify the medicine name.",
                "suggestions": ["Search medicines", "Browse categories", "Help"],
                "data": {}
            }
        
        # Search for the medicine
        query = medicine_names[0]
        corrected, was_corrected = self._auto_correct_spelling(query)
        if was_corrected:
            query = corrected
        
        search_result = self.medicine_agent.search_medicines(query, limit=5)
        
        if search_result.get("found") and search_result.get("medicines"):
            medicines = search_result["medicines"]
            best_match, score = self._find_best_medicine_match(query, medicines)
            
            if best_match and score >= 60:
                # Check stock
                if not best_match.get("in_stock"):
                    return {
                        "message": f"Sorry, **{best_match['name']}** is currently out of stock.\n\nWould you like me to find alternatives?",
                        "suggestions": ["Find alternatives", "Browse medicines", "Notify when available"],
                        "data": {"medicine": best_match, "action": "OUT_OF_STOCK"}
                    }
                
                # Check if requested quantity is available
                available_stock = best_match.get("stock", 0)
                if quantity > available_stock and available_stock > 0:
                    return {
                        "message": f"⚠️ Only **{available_stock} units** of **{best_match['name']}** available.\n\nWould you like to add {available_stock} units instead?",
                        "suggestions": [f"Add {available_stock} units", "Find alternatives", "Browse more"],
                        "data": {
                            "medicine": best_match,
                            "requested_quantity": quantity,
                            "available_quantity": available_stock,
                            "action": "PARTIAL_STOCK"
                        }
                    }
                
                # Check safety
                try:
                    safety_result = self.safety_agent.check_drug_safety(
                        best_match["name"],
                        user_allergies=user_allergies or []
                    )
                except:
                    safety_result = {"warnings": [], "alerts": [], "safe": True}
                
                # Check for allergy alerts
                if safety_result.get("alerts"):
                    alerts_text = "\n".join([f"⚠️ {a}" for a in safety_result["alerts"][:2]])
                    return {
                        "message": f"🚨 **Safety Alert for {best_match['name']}!**\n\n{alerts_text}\n\nAre you sure you want to add this to cart?",
                        "suggestions": ["Yes, add anyway", "No, find alternatives", "Talk to pharmacist"],
                        "data": {
                            "medicine": best_match,
                            "quantity": quantity,
                            "safety": safety_result,
                            "action": "SAFETY_WARNING"
                        }
                    }
                
                # Save context
                memory.set_context("last_medicine", best_match)
                memory.set_context("last_quantity", quantity)
                
                # Calculate total price
                unit_price = best_match.get("price", 0)
                total_price = unit_price * quantity
                
                # Build success message
                prescription_note = ""
                if best_match.get("prescription_required"):
                    prescription_note = "\n\n🔴 **Note:** This medicine requires a prescription."
                
                correction_note = ""
                if was_corrected:
                    correction_note = f"\n🔍 *Found: {best_match['name']}*"
                
                return {
                    "message": f"""🛒 **Adding to Cart:**

**{best_match['name']}**
📦 Quantity: {quantity} unit{'s' if quantity > 1 else ''}
💰 Price: ₹{unit_price} × {quantity} = **₹{total_price}**{correction_note}{prescription_note}

✅ Added to your cart! What else would you like?""",
                    "data": {
                        "medicine": best_match,
                        "quantity": quantity,
                        "unit_price": unit_price,
                        "total_price": total_price,
                        "action": "ADD_TO_CART",
                        "auto_add": True  # Signal frontend to auto-add
                    },
                    "suggestions": ["View cart", "Continue shopping", "Checkout", "Add more"],
                    "requires_action": True
                }
        
        # Medicine not found
        return {
            "message": f"❌ I couldn't find **'{medicine_names[0]}'** in our inventory.\n\n🔍 Please check the spelling or try a different name.",
            "suggestions": ["Browse medicines", "Search by category", "Help"],
            "data": {"searched_for": medicine_names[0], "found": False}
        }
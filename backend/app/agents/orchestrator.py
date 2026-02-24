"""
Orchestrator Agent - Main AI Brain with Symptom Understanding
PRODUCTION VERSION - All Edge Cases Handled
✅ SUPPORTS: Price queries, Stock queries, Symptom queries, Side effects
"""
from typing import Dict, Any, List, Optional
from openai import OpenAI
import json
from datetime import datetime
import time

from app.config import settings
from app.agents.medicine_agent import MedicineAgent
from app.agents.safety_agent import SafetyAgent
from app.observability.tracer import get_langfuse, create_trace


class ConversationMemory:
    """Simple conversation memory"""
    
    def __init__(self, max_messages: int = 10):
        self.messages: List[Dict] = []
        self.max_messages = max_messages
    
    def add(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages:]
    
    def get_messages(self) -> List[Dict]:
        return self.messages
    
    def clear(self):
        self.messages = []


class PharmacyAI:
    """
    Main AI Orchestrator with SYMPTOM-BASED medicine recommendation
    """
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        self.medicine_agent = MedicineAgent()
        self.safety_agent = SafetyAgent()
        self.sessions: Dict[str, ConversationMemory] = {}
        self.langfuse = get_langfuse()
        
        # IMPROVED SYSTEM PROMPT with symptom knowledge
        self.system_prompt = """You are APOS, an AI pharmacist assistant for an online pharmacy.

Your capabilities:
1. Understand symptoms and recommend appropriate medicines
2. Search for medicines by name, symptom, or condition
3. Provide price information
4. Check drug safety and interactions
5. Assist with orders

IMPORTANT - Symptom to Medicine Mapping:
- Fever/Temperature → Paracetamol, Ibuprofen
- Headache/Migraine → Paracetamol, Ibuprofen
- Cold/Cough → Cetirizine, antihistamines
- Diabetes → Metformin (prescription required)
- High Blood Pressure → Amlodipine, Losartan (prescription required)
- Acid reflux/Heartburn → Omeprazole
- Bacterial infection → Amoxicillin, Azithromycin (prescription required)
- Pain/Inflammation → Ibuprofen
- Allergy → Cetirizine

Guidelines:
- When user mentions symptoms, recommend appropriate medicine first
- Provide clear pricing information when asked
- Always check if prescription is required
- Warn about allergies and interactions
- Keep responses helpful and concise

Respond naturally in conversation."""
    
    def get_session(self, session_id: str) -> ConversationMemory:
        """Get or create session memory"""
        if session_id not in self.sessions:
            self.sessions[session_id] = ConversationMemory()
        return self.sessions[session_id]
    
    async def process_message(
        self,
        message: str,
        session_id: str,
        user_id: Optional[str] = None,
        user_allergies: List[str] = None
    ) -> Dict[str, Any]:
        """
        Process customer message with SYMPTOM UNDERSTANDING
        """
        
        # Edge case: Empty or very short message
        if not message or len(message.strip()) < 2:
            return {
                "session_id": session_id,
                "intent": "ERROR",
                "message": "Please provide a valid message. How can I help you?",
                "data": {},
                "suggestions": ["I have a fever", "Price of Paracetamol", "Search medicines"],
                "requires_action": False,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        trace = create_trace(
            name="customer_chat",
            user_id=user_id,
            session_id=session_id,
            metadata={
                "message_length": len(message),
                "has_allergies": bool(user_allergies)
            },
            tags=["chat", "customer"]
        )
        
        start_time = time.time()
        memory = self.get_session(session_id)
        
        try:
            # ==================== STEP 1: CLASSIFY INTENT + EXTRACT ENTITIES ====================
            if trace:
                intent_span = trace.span(
                    name="1_intent_classification",
                    input={"message": message}
                )
            
            intent_start = time.time()
            intent_data = await self._classify_intent_with_symptom_extraction(message, trace)
            intent_duration = int((time.time() - intent_start) * 1000)
            
            intent = intent_data.get("intent", "GENERAL")
            entities = intent_data.get("entities", {})
            
            if trace:
                intent_span.end(
                    output={
                        "intent": intent,
                        "entities": entities,
                        "duration_ms": intent_duration
                    }
                )
            
            # ==================== STEP 2: ROUTE TO HANDLER ====================
            if trace:
                handler_span = trace.span(
                    name="2_intent_handler",
                    input={
                        "intent": intent,
                        "entities": entities
                    }
                )
            
            handler_start = time.time()
            response = await self._handle_intent(
                intent=intent,
                entities=entities,
                message=message,
                user_allergies=user_allergies,
                trace=trace
            )
            handler_duration = int((time.time() - handler_start) * 1000)
            
            if trace:
                handler_span.end(
                    output={
                        "response_preview": response.get("message", "")[:100],
                        "has_data": bool(response.get("data")),
                        "duration_ms": handler_duration
                    }
                )
            
            # Update memory
            memory.add("user", message)
            memory.add("assistant", response.get("message", ""))
            
            # ==================== FINAL RESULT ====================
            total_duration = int((time.time() - start_time) * 1000)
            
            result = {
                "session_id": session_id,
                "intent": intent,
                "message": response.get("message", "I apologize, I couldn't process your request."),
                "data": response.get("data", {}),
                "suggestions": response.get("suggestions", []),
                "requires_action": response.get("requires_action", False),
                "timestamp": datetime.utcnow().isoformat(),
                "processing_time_ms": total_duration
            }
            
            if trace:
                trace.update(
                    output=result,
                    metadata={
                        "total_duration_ms": total_duration,
                        "intent": intent,
                        "success": True
                    }
                )
            
            return result
            
        except Exception as e:
            if trace:
                trace.update(
                    output={"error": str(e)},
                    level="ERROR",
                    metadata={"success": False}
                )
            
            return {
                "session_id": session_id,
                "intent": "ERROR",
                "message": "I apologize, I encountered an error. Please try again or contact support.",
                "data": {"error_type": type(e).__name__},
                "suggestions": ["Try again", "Browse medicines", "Contact support"],
                "requires_action": False,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        finally:
            if self.langfuse:
                self.langfuse.flush()
    
    async def _classify_intent_with_symptom_extraction(self, message: str, trace=None) -> Dict[str, Any]:
        """
        Classify intent AND extract symptoms/conditions
        ✅ INCLUDES: PRICE_CHECK intent
        """
        
        if not self.client:
            return self._fallback_classification_with_symptoms(message)
        
        try:
            prompt = f"""Analyze this customer message for a pharmacy:

Message: "{message}"

TASKS:
1. Classify the intent
2. Extract symptoms, conditions, or medicine names
3. If symptoms mentioned, suggest appropriate medicines

Intents:
- BUY_MEDICINE: Customer wants to buy/order medicine (by name OR symptom)
- CHECK_STOCK: Customer wants to check availability
- PRICE_CHECK: Customer asking about price/cost of medicine
- SIDE_EFFECTS: Asking about side effects
- DRUG_INTERACTION: Asking about interactions
- ORDER_STATUS: Asking about order
- GREETING: Simple greeting
- GENERAL: General question

Extract:
- symptoms: ["fever", "headache", etc.]
- conditions: ["diabetes", "high blood pressure", etc.]
- medicine_names: ["Paracetamol", "Amoxicillin", etc.] (if mentioned)
- recommended_medicines: ["Paracetamol", "Ibuprofen"] (based on symptoms)
- quantities: [1, 2, etc.] (if mentioned)

RESPOND IN JSON:
{{
  "intent": "INTENT_TYPE",
  "entities": {{
    "symptoms": [],
    "conditions": [],
    "medicine_names": [],
    "recommended_medicines": [],
    "quantities": []
  }}
}}

Examples:
- "I need medicine for fever" → {{"intent": "BUY_MEDICINE", "entities": {{"symptoms": ["fever"], "recommended_medicines": ["Paracetamol", "Ibuprofen"]}}}}
- "Price of Amoxicillin" → {{"intent": "PRICE_CHECK", "entities": {{"medicine_names": ["Amoxicillin"]}}}}
- "How much is Paracetamol?" → {{"intent": "PRICE_CHECK", "entities": {{"medicine_names": ["Paracetamol"]}}}}
- "How much does Metformin cost?" → {{"intent": "PRICE_CHECK", "entities": {{"medicine_names": ["Metformin"]}}}}
- "Do you have Paracetamol?" → {{"intent": "BUY_MEDICINE", "entities": {{"medicine_names": ["Paracetamol"]}}}}
- "Side effects of Amoxicillin" → {{"intent": "SIDE_EFFECTS", "entities": {{"medicine_names": ["Amoxicillin"]}}}}
"""

            start_time = time.time()
            
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an intent classifier with medical knowledge. Respond ONLY in valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0
            )
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            content = response.choices[0].message.content.strip()
            
            # Log LLM call
            if trace:
                trace.generation(
                    name="intent_classification_llm",
                    model=settings.OPENAI_MODEL,
                    input=prompt,
                    output=content,
                    usage={
                        "input": response.usage.prompt_tokens,
                        "output": response.usage.completion_tokens,
                        "total": response.usage.total_tokens
                    },
                    metadata={
                        "duration_ms": duration_ms,
                        "temperature": 0
                    }
                )
            
            # Clean JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            return json.loads(content.strip())
            
        except Exception as e:
            if trace:
                trace.event(
                    name="intent_classification_error",
                    input={"error": str(e)}
                )
            return self._fallback_classification_with_symptoms(message)
    
    def _extract_medicine_name(self, message: str) -> List[str]:
        """
        ✅ Smart medicine name extraction from various query patterns
        """
        message_lower = message.lower()
        
        # Patterns to remove to get medicine name
        remove_patterns = [
            "price of", "cost of", "how much is", "how much does", "how much for",
            "rate of", "mrp of", "what is the price of", "tell me the price of",
            "what is the cost of", "charges for", "pricing of",
            "do you have", "is there", "can i get", "i want", "i need",
            "looking for", "search for", "find", "show me",
            "side effects of", "effects of", "side effect of",
            "available", "in stock", "stock of",
            "what is", "tell me about", "information on", "info on", "about",
            "?", "please", "thanks", "thank you", "the", "a", "an"
        ]
        
        clean_message = message_lower
        
        for pattern in remove_patterns:
            clean_message = clean_message.replace(pattern, "")
        
        # Remove extra whitespace
        clean_message = " ".join(clean_message.split()).strip()
        
        # If we have something left, it's likely the medicine name
        if clean_message and len(clean_message) >= 2:
            # Capitalize first letter of each word
            medicine_name = clean_message.title()
            return [medicine_name]
        
        return []
    
    def _fallback_classification_with_symptoms(self, message: str) -> Dict[str, Any]:
        """
        Fallback intent classification WITH symptom detection (no LLM)
        ✅ HANDLES: price, cost, how much queries
        """
        message_lower = message.lower()
        
        # Symptom mapping
        symptom_medicine_map = {
            "fever": ["Paracetamol", "Ibuprofen"],
            "temperature": ["Paracetamol", "Ibuprofen"],
            "headache": ["Paracetamol", "Ibuprofen"],
            "migraine": ["Ibuprofen", "Paracetamol"],
            "pain": ["Ibuprofen", "Paracetamol"],
            "cold": ["Cetirizine"],
            "cough": ["Cetirizine"],
            "allergy": ["Cetirizine"],
            "allergies": ["Cetirizine"],
            "diabetes": ["Metformin"],
            "blood pressure": ["Amlodipine", "Losartan"],
            "hypertension": ["Amlodipine", "Losartan"],
            "acidity": ["Omeprazole"],
            "heartburn": ["Omeprazole"],
            "acid reflux": ["Omeprazole"],
            "infection": ["Amoxicillin"],
        }
        
        # Check for symptoms
        detected_symptoms = []
        recommended_medicines = []
        
        for symptom, medicines in symptom_medicine_map.items():
            if symptom in message_lower:
                detected_symptoms.append(symptom)
                recommended_medicines.extend(medicines)
        
        # Remove duplicates
        recommended_medicines = list(set(recommended_medicines))
        
        # Extract medicine name
        medicine_names = self._extract_medicine_name(message)
        
        # ✅ Detect PRICE queries
        is_price_query = any(word in message_lower for word in [
            "price", "cost", "how much", "rate", "charges", "pricing", "mrp", "amount"
        ])
        
        # Detect STOCK queries
        is_stock_query = any(word in message_lower for word in [
            "stock", "available", "availability", "do you have", "is there", "in stock"
        ])
        
        # Detect SIDE EFFECTS queries
        is_side_effects_query = any(word in message_lower for word in [
            "side effect", "effects", "reactions", "adverse"
        ])
        
        # Detect BUY intent
        is_buy_query = any(word in message_lower for word in [
            "need", "want", "buy", "order", "get", "purchase", "give me"
        ])
        
        # Determine intent based on query type
        if is_side_effects_query:
            return {
                "intent": "SIDE_EFFECTS",
                "entities": {
                    "medicine_names": medicine_names,
                    "raw_query": message
                }
            }
        elif is_price_query:
            return {
                "intent": "PRICE_CHECK",
                "entities": {
                    "medicine_names": medicine_names,
                    "raw_query": message
                }
            }
        elif is_stock_query or is_buy_query or detected_symptoms or medicine_names:
            return {
                "intent": "BUY_MEDICINE",
                "entities": {
                    "symptoms": detected_symptoms,
                    "recommended_medicines": recommended_medicines,
                    "medicine_names": medicine_names,
                    "raw_query": message
                }
            }
        elif any(word in message_lower for word in ["interaction", "mix", "combine", "together"]):
            return {
                "intent": "DRUG_INTERACTION",
                "entities": {
                    "medicine_names": medicine_names,
                    "raw_query": message
                }
            }
        elif any(word in message_lower for word in ["order", "track", "delivery", "shipped", "where is my"]):
            return {"intent": "ORDER_STATUS", "entities": {}}
        elif any(word in message_lower for word in ["hello", "hi", "hey", "good morning", "good evening"]):
            return {"intent": "GREETING", "entities": {}}
        else:
            return {"intent": "GENERAL", "entities": {"raw_query": message, "medicine_names": medicine_names}}
    
    async def _handle_intent(
        self,
        intent: str,
        entities: Dict,
        message: str,
        user_allergies: List[str] = None,
        trace=None
    ) -> Dict[str, Any]:
        """Handle different intents - ALL INTENTS ROUTED CORRECTLY"""
        
        # ✅ BUY_MEDICINE, CHECK_STOCK, and PRICE_CHECK use same handler
        if intent in ["BUY_MEDICINE", "CHECK_STOCK", "PRICE_CHECK"]:
            return await self._handle_buy_medicine_with_symptoms(entities, message, user_allergies, trace, is_price_query=(intent == "PRICE_CHECK"))
        elif intent == "SIDE_EFFECTS":
            return await self._handle_side_effects(entities, message, trace)
        elif intent == "DRUG_INTERACTION":
            return await self._handle_drug_interaction(entities, message, trace)
        elif intent == "ORDER_STATUS":
            return self._handle_order_status()
        elif intent == "GREETING":
            return self._handle_greeting()
        else:
            return await self._handle_general(message, trace)
    
    async def _handle_buy_medicine_with_symptoms(
        self, 
        entities: Dict, 
        message: str,
        user_allergies: List[str] = None,
        trace=None,
        is_price_query: bool = False
    ) -> Dict[str, Any]:
        """
        Handle medicine purchase with SYMPTOM understanding
        ✅ ALL EDGE CASES HANDLED including PRICE queries
        """
        
        symptoms = entities.get("symptoms", [])
        recommended_medicines = entities.get("recommended_medicines", [])
        explicit_medicines = entities.get("medicine_names", [])
        
        # Determine search query
        if explicit_medicines:
            search_query = explicit_medicines[0]
        elif recommended_medicines:
            search_query = recommended_medicines[0]
        else:
            raw_query = entities.get("raw_query", message)
            search_query = raw_query.lower()
            
            # Remove common words
            for word in ["i need", "i want", "buy", "get", "medicine", "for", "a", "the", "price of", "cost of", "how much"]:
                search_query = search_query.replace(word, "")
            
            search_query = search_query.strip()
            
            if not search_query:
                words = message.split()
                search_query = words[-1] if words else "medicine"
        
        # ==================== MEDICINE AGENT ====================
        if trace:
            medicine_span = trace.span(
                name="medicine_agent_search",
                input={
                    "query": search_query,
                    "symptoms": symptoms,
                    "recommended": recommended_medicines,
                    "is_price_query": is_price_query
                }
            )
        
        search_start = time.time()
        search_result = self.medicine_agent.search_medicines(search_query)
        search_duration = int((time.time() - search_start) * 1000)
        
        if trace:
            medicine_span.end(
                output={
                    "found": search_result.get("found"),
                    "count": search_result.get("count", 0),
                    "duration_ms": search_duration
                }
            )
        
        if not search_result.get("found"):
            # Try alternatives
            if len(recommended_medicines) > 1:
                search_result = self.medicine_agent.search_medicines(recommended_medicines[1])
            
            if not search_result.get("found"):
                symptom_text = f" for **{', '.join(symptoms)}**" if symptoms else ""
                recommendation_text = ""
                
                if recommended_medicines:
                    recommendation_text = f"\n\n💡 **Recommended medicines{symptom_text}:**\n" + "\n".join([f"• {med}" for med in recommended_medicines[:3]])
                
                return {
                    "message": f"I couldn't find **{search_query}** in our current inventory.{recommendation_text}\n\nWould you like me to search for any of these?",
                    "suggestions": recommended_medicines[:3] if recommended_medicines else ["Browse categories", "Talk to pharmacist", "View all medicines"],
                    "data": {
                        "searched_for": search_query,
                        "symptoms": symptoms,
                        "recommendations": recommended_medicines
                    }
                }
        
        found_medicines = search_result.get("medicines", [])
        med = found_medicines[0]
        
        # ==================== SAFETY AGENT ====================
        if trace:
            safety_span = trace.span(
                name="safety_agent_check",
                input={
                    "medicine": med["name"],
                    "user_allergies": user_allergies
                }
            )
        
        safety_start = time.time()
        
        safety_result = self.safety_agent.check_drug_safety(
            med["name"],
            user_allergies=user_allergies or []
        )
        
        safety_duration = int((time.time() - safety_start) * 1000)
        
        if trace:
            safety_span.end(
                output={
                    "safe": safety_result.get("safe"),
                    "warnings_count": len(safety_result.get("warnings", [])),
                    "prescription_required": safety_result.get("prescription_required"),
                    "duration_ms": safety_duration
                }
            )
        
        # Build response
        warnings = safety_result.get("warnings", [])
        warning_text = ""
        if warnings:
            warning_text = "\n\n⚠️ **Warnings:**\n" + "\n".join(warnings)
        
        rx_badge = "🔴 **Prescription Required**" if med.get("prescription_required") else "🟢 **No Prescription Needed**"
        stock_status = "✅ In Stock" if med.get("in_stock") else "❌ Out of Stock"
        
        # Add symptom context
        symptom_context = ""
        if symptoms:
            symptom_context = f"\n💊 **Good for:** {', '.join(symptoms).title()}"
        
        # ✅ Build response based on query type (PRICE or regular)
        if is_price_query:
            # Price-focused response
            response_msg = f"""**💰 Price Information for {med['name']}**

💵 **Price:** ₹{med.get('price', 0)} per unit
💊 **Dosage:** {med.get('dosage', 'N/A')}
🏭 **Brand:** {med.get('brand', 'N/A')}
📦 **Stock:** {stock_status} ({med.get('stock', 0)} units)
{rx_badge}

Would you like to add this to your cart?"""
        else:
            # Regular response
            response_msg = f"""I found **{med['name']}** ({med.get('dosage', '')}){symptom_context}

💰 **Price:** ₹{med.get('price', 0)}
💊 **Brand:** {med.get('brand', 'N/A')}
📦 {stock_status} ({med.get('stock', 0)} units available)
{rx_badge}{warning_text}

Would you like to add this to your cart?"""
        
        return {
            "message": response_msg,
            "data": {
                "medicine": med,
                "safety": safety_result,
                "action": "ADD_TO_CART" if med.get("in_stock") else None,
                "symptoms_addressed": symptoms,
                "agents_used": ["medicine_agent", "safety_agent"]
            },
            "suggestions": ["Add to cart", "View details", "Find alternatives"] if med.get("in_stock") else ["Find alternatives", "Browse categories", "Notify when available"],
            "requires_action": med.get("in_stock", False)
        }
    
    async def _handle_side_effects(self, entities: Dict, message: str, trace=None) -> Dict[str, Any]:
        """
        Handle side effects inquiry
        """
        
        if trace:
            trace.event(name="side_effects_handler", input={"message": message})
        
        medicine_names = entities.get("medicine_names", [])
        
        if not medicine_names:
            search_query = message.lower()
            for phrase in ["side effects", "effects of", "side effect of", "of", "?"]:
                search_query = search_query.replace(phrase, "")
            search_query = search_query.strip()
            
            if not search_query or len(search_query) < 2:
                return {
                    "message": "Which medicine would you like to know the side effects for?",
                    "suggestions": ["Paracetamol", "Amoxicillin", "Metformin", "Browse medicines"]
                }
        else:
            search_query = medicine_names[0]
        
        search = self.medicine_agent.search_medicines(search_query, limit=1)
        
        if search.get("found"):
            med_details = self.medicine_agent.get_medicine_details(search["medicines"][0]["id"])
            if med_details.get("found"):
                med = med_details["medicine"]
                side_effects = med.get("side_effects", [])
                
                if side_effects:
                    effects_list = "\n".join([f"• {effect}" for effect in side_effects[:8]])
                    return {
                        "message": f"**Common side effects of {med['name']}:**\n\n{effects_list}\n\n⚠️ **Important:** If you experience severe side effects, stop using and consult a doctor immediately.",
                        "suggestions": ["Buy this medicine", "Check price", "View details", "Talk to pharmacist"],
                        "data": {"medicine": med, "side_effects": side_effects}
                    }
                else:
                    return {
                        "message": f"**{med['name']}** - No common side effects listed. This is generally well-tolerated, but consult a doctor if you notice any unusual reactions.",
                        "suggestions": ["Buy this medicine", "Check price", "Talk to pharmacist"]
                    }
        
        return {
            "message": f"I couldn't find **{search_query}**. Could you check the spelling or try the generic name?",
            "suggestions": ["Browse medicines", "Search by category", "Talk to pharmacist"]
        }
    
    async def _handle_drug_interaction(self, entities: Dict, message: str, trace=None) -> Dict[str, Any]:
        """
        Handle drug interaction queries
        """
        
        if trace:
            trace.event(name="drug_interaction_handler", input={"message": message})
        
        return {
            "message": "⚠️ **Drug Interactions**\n\nFor drug interaction information, please consult with our pharmacist or your doctor. This is important for your safety.\n\nNever combine medications without professional advice.",
            "suggestions": ["Talk to pharmacist", "Browse medicines", "View cart"],
            "data": {"requires_professional_advice": True}
        }
    
    def _handle_order_status(self) -> Dict[str, Any]:
        """
        Handle order status queries
        """
        return {
            "message": "📦 **Track Your Order**\n\nTo check your order status, please visit the **My Orders** section in your account.\n\nYou can view delivery status, tracking info, and estimated delivery time there.",
            "suggestions": ["View my orders", "Track delivery", "Browse medicines"],
            "data": {"action": "VIEW_ORDERS"}
        }
    
    def _handle_greeting(self) -> Dict[str, Any]:
        """Handle greeting"""
        return {
            "message": """Hello! 👋 Welcome to APOS Pharmacy!

I'm your AI pharmacist assistant. I can help you:

🩺 **Find medicine for symptoms** - "I have a headache"
💰 **Check prices** - "Price of Paracetamol"
🔍 **Search medicines** - "Do you have Amoxicillin?"
💊 **Medicine information** - "Side effects of Metformin"
🛒 **Order medicines** - Add to cart and checkout
📦 **Track orders** - Check your order status

What can I help you with today?""",
            "suggestions": ["I have a fever", "Price of Paracetamol", "View my orders"]
        }
    
    async def _handle_general(self, message: str, trace=None) -> Dict[str, Any]:
        """
        Handle general queries using AI
        """
        
        # Try to extract medicine name for general queries too
        medicine_names = self._extract_medicine_name(message)
        
        if medicine_names:
            # If there's a medicine name, treat as BUY_MEDICINE
            return await self._handle_buy_medicine_with_symptoms(
                {"medicine_names": medicine_names, "raw_query": message},
                message,
                None,
                trace
            )
        
        if not self.client:
            return {
                "message": "I'm here to help with your pharmacy needs. You can:\n\n• Ask about symptoms\n• Search for medicines\n• Check prices\n• View side effects\n• Place orders\n\nWhat would you like to do?",
                "suggestions": ["I have symptoms", "Browse medicines", "Check prices"]
            }
        
        try:
            start_time = time.time()
            
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            if trace:
                trace.generation(
                    name="general_response_llm",
                    model=settings.OPENAI_MODEL,
                    input=message,
                    output=response.choices[0].message.content,
                    usage={
                        "input": response.usage.prompt_tokens,
                        "output": response.usage.completion_tokens
                    },
                    metadata={"duration_ms": duration_ms}
                )
            
            return {
                "message": response.choices[0].message.content,
                "suggestions": ["Search medicines", "I have symptoms", "Check prices"]
            }
            
        except Exception as e:
            if trace:
                trace.event(name="general_handler_error", input={"error": str(e)})
            
            return {
                "message": "I'm here to help with your pharmacy needs. What would you like to do?",
                "suggestions": ["I have symptoms", "Browse medicines", "Check prices"]
            }
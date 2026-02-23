"""
Orchestrator Agent - Main AI Brain
Uses direct OpenAI API for reliability (no deprecated imports)
"""
from typing import Dict, Any, List, Optional
from openai import OpenAI
import json
from datetime import datetime

from app.config import settings
from app.agents.medicine_agent import MedicineAgent
from app.agents.safety_agent import SafetyAgent


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
    Main AI Orchestrator for pharmacy operations.
    Handles customer conversations and routes to appropriate actions.
    """
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        self.medicine_agent = MedicineAgent()
        self.safety_agent = SafetyAgent()
        self.sessions: Dict[str, ConversationMemory] = {}
        
        self.system_prompt = """You are APOS, an AI pharmacist assistant for an online pharmacy.

Your capabilities:
1. Help customers find medicines
2. Provide medicine information
3. Check drug safety and interactions
4. Assist with orders

Guidelines:
- Be friendly, professional, and helpful
- Always prioritize patient safety
- If a medicine requires prescription, inform the customer
- Never recommend specific dosages - refer to doctor
- Keep responses concise and clear

When customer asks about medicine:
1. Search and provide options
2. Check if prescription required
3. Provide safety information if asked

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
        """Process a customer message and return response"""
        
        memory = self.get_session(session_id)
        
        # Classify intent
        intent_data = await self._classify_intent(message)
        intent = intent_data.get("intent", "GENERAL")
        entities = intent_data.get("entities", {})
        
        # Route based on intent
        response = await self._handle_intent(
            intent=intent,
            entities=entities,
            message=message,
            user_allergies=user_allergies
        )
        
        # Update memory
        memory.add("user", message)
        memory.add("assistant", response.get("message", ""))
        
        return {
            "session_id": session_id,
            "intent": intent,
            "message": response.get("message", "I apologize, I couldn't process your request."),
            "data": response.get("data", {}),
            "suggestions": response.get("suggestions", []),
            "requires_action": response.get("requires_action", False),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _classify_intent(self, message: str) -> Dict[str, Any]:
        """Classify user intent using OpenAI"""
        
        if not self.client:
            # Fallback classification
            message_lower = message.lower()
            
            if any(word in message_lower for word in ["buy", "need", "want", "order", "get"]):
                # Extract medicine names (simple approach)
                return {
                    "intent": "BUY_MEDICINE",
                    "entities": {"medicines": [], "raw_query": message}
                }
            elif any(word in message_lower for word in ["stock", "available", "have"]):
                return {"intent": "CHECK_STOCK", "entities": {}}
            elif any(word in message_lower for word in ["side effect", "effect"]):
                return {"intent": "SIDE_EFFECTS", "entities": {}}
            elif any(word in message_lower for word in ["hello", "hi", "hey"]):
                return {"intent": "GREETING", "entities": {}}
            else:
                return {"intent": "GENERAL", "entities": {}}
        
        try:
            prompt = f"""Classify this customer message for a pharmacy:

Message: "{message}"

Classify into one of:
- BUY_MEDICINE: Customer wants to buy/order medicine
- CHECK_STOCK: Customer wants to check availability
- SIDE_EFFECTS: Customer asking about side effects
- DRUG_INTERACTION: Customer asking about drug interactions
- ORDER_STATUS: Customer asking about their order
- GREETING: Simple greeting
- GENERAL: General question

Also extract:
- medicine names mentioned
- quantities if mentioned

Respond in JSON:
{{"intent": "INTENT_TYPE", "entities": {{"medicines": ["name1"], "quantities": [1]}}}}"""

            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an intent classifier. Respond only in JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0
            )
            
            content = response.choices[0].message.content.strip()
            
            # Clean JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            return json.loads(content.strip())
            
        except Exception as e:
            return {"intent": "GENERAL", "entities": {}, "error": str(e)}
    
    async def _handle_intent(
        self,
        intent: str,
        entities: Dict,
        message: str,
        user_allergies: List[str] = None
    ) -> Dict[str, Any]:
        """Handle different intents"""
        
        if intent == "BUY_MEDICINE":
            return await self._handle_buy_medicine(entities, message, user_allergies)
        
        elif intent == "CHECK_STOCK":
            return await self._handle_check_stock(entities, message)
        
        elif intent == "SIDE_EFFECTS":
            return await self._handle_side_effects(entities, message)
        
        elif intent == "GREETING":
            return self._handle_greeting()
        
        else:
            return await self._handle_general(message)
    
    async def _handle_buy_medicine(
        self, 
        entities: Dict, 
        message: str,
        user_allergies: List[str] = None
    ) -> Dict[str, Any]:
        """Handle medicine purchase intent"""
        
        medicines = entities.get("medicines", [])
        raw_query = entities.get("raw_query", message)
        
        # Search for medicines
        if medicines:
            search_query = medicines[0]
        else:
            # Extract potential medicine name from message
            search_query = message.replace("i need", "").replace("i want", "").replace("buy", "").strip()
        
        search_result = self.medicine_agent.search_medicines(search_query)
        
        if not search_result.get("found"):
            return {
                "message": f"I couldn't find '{search_query}' in our inventory. Could you please check the spelling or try a different name?",
                "suggestions": ["Try generic name", "Browse categories", "Ask for alternatives"]
            }
        
        found_medicines = search_result.get("medicines", [])
        med = found_medicines[0]
        
        # Safety check
        safety_result = self.safety_agent.check_drug_safety(
            med["name"],
            user_allergies=user_allergies
        )
        
        warnings = safety_result.get("warnings", [])
        warning_text = "\n".join(warnings) if warnings else ""
        
        rx_badge = "🔴 Prescription Required" if med.get("prescription_required") else "🟢 No Prescription Needed"
        stock_status = "✅ In Stock" if med.get("in_stock") else "❌ Out of Stock"
        
        response_msg = f"""I found **{med['name']}** ({med.get('dosage', '')})

💊 **Brand:** {med.get('brand', 'N/A')}
💰 **Price:** ₹{med.get('price', 0)}
📦 **{stock_status}**
{rx_badge}
{warning_text}

Would you like to add this to your cart?"""
        
        return {
            "message": response_msg,
            "data": {
                "medicine": med,
                "safety": safety_result,
                "action": "ADD_TO_CART"
            },
            "suggestions": ["Add to cart", "View details", "Find alternatives"],
            "requires_action": True
        }
    
    async def _handle_check_stock(self, entities: Dict, message: str) -> Dict[str, Any]:
        """Handle stock check intent"""
        
        medicines = entities.get("medicines", [])
        
        if not medicines:
            return {
                "message": "Which medicine would you like me to check the stock for?",
                "suggestions": ["Paracetamol", "Amoxicillin", "Browse all"]
            }
        
        results = []
        for med_name in medicines:
            search = self.medicine_agent.search_medicines(med_name, limit=1)
            if search.get("found"):
                med = search["medicines"][0]
                status = "✅" if med.get("in_stock") else "❌"
                results.append(f"{status} **{med['name']}**: {med.get('stock', 0)} units")
        
        if results:
            return {
                "message": "Here's the stock status:\n\n" + "\n".join(results),
                "suggestions": ["Add to cart", "Check another"]
            }
        
        return {
            "message": "I couldn't find those medicines. Please check the names.",
            "suggestions": ["Browse medicines", "Search again"]
        }
    
    async def _handle_side_effects(self, entities: Dict, message: str) -> Dict[str, Any]:
        """Handle side effects inquiry"""
        
        medicines = entities.get("medicines", [])
        
        if not medicines:
            # Try to extract from message
            search_query = message.replace("side effects", "").replace("effects of", "").strip()
            search = self.medicine_agent.search_medicines(search_query, limit=1)
            
            if search.get("found"):
                med_details = self.medicine_agent.get_medicine_details(search["medicines"][0]["id"])
                if med_details.get("found"):
                    med = med_details["medicine"]
                    side_effects = med.get("side_effects", [])
                    
                    if side_effects:
                        effects_list = "\n".join([f"• {effect}" for effect in side_effects[:5]])
                        return {
                            "message": f"**Common side effects of {med['name']}:**\n\n{effects_list}\n\n⚠️ If you experience severe side effects, consult a doctor immediately.",
                            "suggestions": ["Buy this medicine", "Check interactions"]
                        }
        
        return {
            "message": "Which medicine would you like to know the side effects for?",
            "suggestions": ["Paracetamol", "Amoxicillin"]
        }
    
    def _handle_greeting(self) -> Dict[str, Any]:
        """Handle greeting"""
        
        return {
            "message": """Hello! 👋 Welcome to APOS Pharmacy!

I'm your AI pharmacist assistant. I can help you:

🛒 **Order medicines** - Just tell me what you need
🔍 **Search medicines** - Find by name or category  
💊 **Medicine info** - Side effects, interactions
📦 **Track orders** - Check your order status

How can I help you today?""",
            "suggestions": ["Order medicine", "Browse medicines", "Check my orders"]
        }
    
    async def _handle_general(self, message: str) -> Dict[str, Any]:
        """Handle general queries using AI"""
        
        if not self.client:
            return {
                "message": "I'm here to help with your pharmacy needs. You can ask me about medicines, place orders, or check your order status.",
                "suggestions": ["Order medicine", "Browse medicines", "Help"]
            }
        
        try:
            response = self.client.chat.completions.create(
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
                "suggestions": ["Order medicine", "Browse medicines"]
            }
            
        except Exception as e:
            return {
                "message": "I'm here to help with your pharmacy needs. What would you like to do?",
                "suggestions": ["Order medicine", "Browse medicines", "Help"]
            }
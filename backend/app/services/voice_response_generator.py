"""
Voice Response Generator - Converts detailed responses to voice-friendly format
Makes responses short, conversational, and natural for speech
"""
import re
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class VoiceResponseGenerator:
    """
    Generates voice-optimized responses from detailed text responses.
    
    Voice responses should be:
    - Short (under 100 words ideally)
    - Conversational
    - No emojis or formatting
    - Natural speech patterns
    - Easy to understand when heard
    """
    
    def __init__(self):
        # Common replacements for voice
        self.text_to_speech_replacements = {
            "₹": "rupees ",
            "Rs.": "rupees ",
            "Rs": "rupees ",
            "%": " percent",
            "&": " and ",
            "+": " plus ",
            "mg": " milligrams",
            "ml": " milliliters",
            "kg": " kilograms",
            "g": " grams",
        }
    
    def generate_voice_response(
        self,
        intent: str,
        data: Dict[str, Any],
        original_message: str,
        full_response: str
    ) -> str:
        """
        Generate a voice-optimized response based on intent and data.
        
        Args:
            intent: The detected intent (e.g., "BUY_MEDICINE", "GREETING")
            data: Response data containing medicine info, etc.
            original_message: What the user said
            full_response: The full text response (for fallback)
            
        Returns:
            Voice-optimized response string
        """
        
        try:
            # Route to specific handlers based on intent
            if intent == "GREETING":
                return self._voice_greeting()
            
            elif intent == "BUY_MEDICINE" or intent == "PRICE_CHECK" or intent == "CHECK_STOCK":
                return self._voice_medicine_found(data, intent)
            
            elif intent == "SMART_ADD_TO_CART" or intent == "ADD_TO_CART":
                return self._voice_added_to_cart(data)
            
            elif intent == "SIDE_EFFECTS":
                return self._voice_side_effects(data)
            
            elif intent == "ORDER_STATUS":
                return self._voice_order_status(data)
            
            elif intent == "THANKS":
                return self._voice_thanks()
            
            elif intent == "FIND_ALTERNATIVES":
                return self._voice_alternatives(data)
            
            elif intent == "DOSAGE_INFO":
                return self._voice_dosage(data)
            
            elif intent in ["BROWSE_CATEGORIES", "BROWSE_MEDICINES", "VIEW_CART", "HELP"]:
                return self._voice_navigation(intent)
            
            else:
                # Fallback: Clean and shorten the original response
                return self._clean_for_voice(full_response)
        
        except Exception as e:
            logger.error(f"Voice response generation error: {e}")
            return self._clean_for_voice(full_response)
    
    # ==================== INTENT-SPECIFIC VOICE RESPONSES ====================
    
    def _voice_greeting(self) -> str:
        """Voice-friendly greeting"""
        return "Hi! I'm your pharmacy assistant. How can I help you today? You can ask me about medicines, symptoms, or check your orders."
    
    def _voice_medicine_found(self, data: Dict, intent: str) -> str:
        """Voice response for medicine found"""
        medicine = data.get("medicine", {})
        symptoms = data.get("symptoms", [])
        
        if not medicine:
            # No specific medicine, might be symptom-based recommendations
            recommendations = data.get("recommendations", [])
            if recommendations:
                meds = ", ".join(recommendations[:3])
                symptom_text = symptoms[0] if symptoms else "that"
                return f"For {symptom_text}, I recommend {meds}. Would you like details on any of these?"
            return "I couldn't find what you're looking for. Could you tell me more about what you need?"
        
        name = medicine.get("name", "this medicine")
        price = medicine.get("price", 0)
        in_stock = medicine.get("in_stock", True)
        prescription = medicine.get("prescription_required", False)
        
        # Build conversational response
        symptom_text = ""
        if symptoms:
            symptom_text = f" for your {symptoms[0]}"
        
        stock_text = "and it's in stock" if in_stock else "but it's currently out of stock"
        
        rx_text = ""
        if prescription:
            rx_text = " Note that this requires a prescription."
        
        if in_stock:
            return f"I found {name}{symptom_text}. It costs {int(price)} rupees {stock_text}.{rx_text} Should I add it to your cart?"
        else:
            return f"I found {name}{symptom_text}, but it's currently out of stock. Would you like me to find alternatives?"
    
    def _voice_added_to_cart(self, data: Dict) -> str:
        """Voice response for item added to cart"""
        medicine = data.get("medicine", {})
        quantity = data.get("quantity", 1)
        total_price = data.get("total_price", 0)
        
        name = medicine.get("name", "the item")
        
        if quantity > 1:
            return f"Done! I've added {quantity} {name} to your cart. That's {int(total_price)} rupees total. Anything else?"
        else:
            return f"Added {name} to your cart. What else do you need?"
    
    def _voice_side_effects(self, data: Dict) -> str:
        """Voice response for side effects"""
        medicine = data.get("medicine", {})
        side_effects = data.get("side_effects", [])
        
        name = medicine.get("name", "this medicine") if medicine else "this medicine"
        
        if not side_effects:
            return f"{name} generally has no major side effects. But always read the label and consult a doctor if you notice anything unusual."
        
        # Take top 3 side effects
        effects = side_effects[:3]
        effects_text = ", ".join(effects)
        
        return f"Common side effects of {name} include {effects_text}. If you experience anything severe, stop taking it and see a doctor."
    
    def _voice_order_status(self, data: Dict) -> str:
        """Voice response for order status"""
        orders = data.get("orders", [])
        
        if not orders:
            return "You don't have any orders yet. Would you like to browse our medicines?"
        
        # Get the most recent order
        latest = orders[0]
        status = latest.get("status", "pending")
        order_num = latest.get("order_number", "")
        
        status_text = {
            "pending": "is being processed",
            "confirmed": "has been confirmed",
            "processing": "is being prepared",
            "dispatched": "is on its way",
            "shipped": "has been shipped",
            "out_for_delivery": "is out for delivery",
            "delivered": "has been delivered",
        }.get(status, "is being processed")
        
        if len(orders) == 1:
            return f"Your order {order_num} {status_text}."
        else:
            return f"You have {len(orders)} orders. Your latest order {order_num} {status_text}. Would you like more details?"
    
    def _voice_thanks(self) -> str:
        """Voice response for thank you/goodbye"""
        return "You're welcome! Take care and stay healthy. Come back anytime you need help."
    
    def _voice_alternatives(self, data: Dict) -> str:
        """Voice response for alternatives"""
        alternatives = data.get("alternatives", [])
        original = data.get("original_medicine", {})
        
        original_name = original.get("name", "that medicine") if original else "that medicine"
        
        if not alternatives:
            return f"Sorry, I couldn't find alternatives for {original_name} right now. Would you like to browse other medicines?"
        
        # List top 3 alternatives
        alt_names = [a.get("name", "") for a in alternatives[:3]]
        alt_text = ", ".join(alt_names)
        
        return f"Instead of {original_name}, you could try {alt_text}. Would you like details on any of these?"
    
    def _voice_dosage(self, data: Dict) -> str:
        """Voice response for dosage info"""
        medicine = data.get("medicine", {})
        
        name = medicine.get("name", "this medicine") if medicine else "this medicine"
        dosage = medicine.get("dosage", "")
        
        if dosage:
            return f"{name} comes in {dosage} strength. Always follow your doctor's prescription for the correct dosage."
        else:
            return f"Please check the packaging of {name} for dosage information, or ask your doctor for the right dose."
    
    def _voice_navigation(self, intent: str) -> str:
        """Voice response for navigation intents"""
        responses = {
            "BROWSE_CATEGORIES": "You can browse medicine categories on the screen. We have painkillers, antibiotics, diabetes care, vitamins, and more.",
            "BROWSE_MEDICINES": "You can browse all our medicines on the screen. Or tell me what you're looking for.",
            "VIEW_CART": "Your cart is shown on the screen. You can review and checkout from there.",
            "HELP": "I can help you find medicines, check prices, track orders, or answer questions about medications. What do you need?",
        }
        return responses.get(intent, "How can I help you?")
    
    # ==================== UTILITY METHODS ====================
    
    def _clean_for_voice(self, text: str, max_length: int = 200) -> str:
        """
        Clean and shorten text for voice output.
        Removes formatting and keeps it conversational.
        """
        if not text:
            return "I'm sorry, I couldn't process that. Could you try again?"
        
        clean = text
        
        # Remove emojis
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"
            "\U0001F300-\U0001F5FF"
            "\U0001F680-\U0001F6FF"
            "\U0001F1E0-\U0001F1FF"
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "]+",
            flags=re.UNICODE
        )
        clean = emoji_pattern.sub('', clean)
        
        # Remove markdown
        clean = re.sub(r'\*\*(.+?)\*\*', r'\1', clean)  # Bold
        clean = re.sub(r'\*(.+?)\*', r'\1', clean)      # Italic
        clean = re.sub(r'__(.+?)__', r'\1', clean)
        clean = re.sub(r'_(.+?)_', r'\1', clean)
        
        # Remove bullet points
        clean = re.sub(r'^[\s]*[•\-\*]\s*', '', clean, flags=re.MULTILINE)
        
        # Remove code blocks
        clean = re.sub(r'```[\s\S]*?```', '', clean)
        clean = re.sub(r'`(.+?)`', r'\1', clean)
        
        # Replace currency and units
        for old, new in self.text_to_speech_replacements.items():
            clean = clean.replace(old, new)
        
        # Remove multiple newlines
        clean = re.sub(r'\n+', '. ', clean)
        
        # Remove multiple spaces
        clean = re.sub(r'\s+', ' ', clean)
        
        # Trim and limit length
        clean = clean.strip()
        
        # If still too long, take first few sentences
        if len(clean) > max_length:
            sentences = clean.split('.')
            result = ""
            for sentence in sentences:
                if len(result) + len(sentence) < max_length:
                    result += sentence.strip() + ". "
                else:
                    break
            clean = result.strip() if result else clean[:max_length] + "..."
        
        return clean
    
    def should_use_voice_response(self, intent: str, data: Dict) -> bool:
        """
        Determine if we should use the voice-optimized response.
        Some intents benefit from voice optimization more than others.
        """
        # These intents benefit most from voice optimization
        voice_optimized_intents = [
            "GREETING", "BUY_MEDICINE", "PRICE_CHECK", "CHECK_STOCK",
            "SMART_ADD_TO_CART", "ADD_TO_CART", "SIDE_EFFECTS",
            "ORDER_STATUS", "THANKS", "FIND_ALTERNATIVES", "DOSAGE_INFO"
        ]
        return intent in voice_optimized_intents


# Singleton
_voice_response_generator: Optional[VoiceResponseGenerator] = None


def get_voice_response_generator() -> VoiceResponseGenerator:
    """Get or create voice response generator."""
    global _voice_response_generator
    if _voice_response_generator is None:
        _voice_response_generator = VoiceResponseGenerator()
    return _voice_response_generator
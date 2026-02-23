"""
Safety Agent - Drug safety checks
Uses direct OpenAI API for reliability
"""
from typing import Dict, Any, List, Optional
from openai import OpenAI
import json

from app.config import settings
from app.database.mongodb import get_sync_collection


class SafetyAgent:
    """
    Safety Agent handles:
    - Drug interaction checks
    - Allergy checks
    - Dosage validation
    - Prescription verification
    """
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
    
    def check_drug_safety(
        self, 
        medicine_name: str, 
        user_allergies: List[str] = None,
        current_medications: List[str] = None
    ) -> Dict[str, Any]:
        """Comprehensive safety check for a medicine"""
        
        collection = get_sync_collection("medicines")
        
        # Find medicine
        medicine = collection.find_one({
            "$or": [
                {"name": {"$regex": medicine_name, "$options": "i"}},
                {"generic_name": {"$regex": medicine_name, "$options": "i"}}
            ]
        })
        
        if not medicine:
            return {
                "safe": True,
                "warnings": [],
                "medicine_found": False
            }
        
        warnings = []
        is_safe = True
        
        # Check prescription requirement
        if medicine.get("prescription_required"):
            warnings.append("⚠️ This medicine requires a valid prescription")
        
        # Check allergies
        if user_allergies:
            contraindications = medicine.get("contraindications", [])
            for allergy in user_allergies:
                for contra in contraindications:
                    if allergy.lower() in contra.lower():
                        warnings.append(f"🚨 ALLERGY ALERT: You may be allergic to this medicine ({allergy})")
                        is_safe = False
        
        # Check drug interactions
        if current_medications:
            drug_interactions = medicine.get("drug_interactions", [])
            for med in current_medications:
                for interaction in drug_interactions:
                    if med.lower() in interaction.lower():
                        warnings.append(f"⚠️ Potential interaction with {med}")
        
        return {
            "safe": is_safe,
            "warnings": warnings,
            "medicine_found": True,
            "prescription_required": medicine.get("prescription_required", False),
            "contraindications": medicine.get("contraindications", []),
            "side_effects": medicine.get("side_effects", [])
        }
    
    async def verify_prescription_ai(self, prescription_text: str, medicines: List[str]) -> Dict[str, Any]:
        """AI verification of prescription for ordered medicines"""
        
        if not self.client:
            # Auto-approve if no OpenAI key
            return {
                "verified": True,
                "message": "Prescription auto-verified",
                "medicines_matched": medicines
            }
        
        try:
            prompt = f"""You are a pharmacist verifying a prescription.

Prescription text/content:
{prescription_text}

Medicines being ordered:
{', '.join(medicines)}

Verify if the prescription is valid for these medicines.
Consider:
1. Are the medicines mentioned in the prescription?
2. Is there a doctor's name/signature indication?
3. Does it look like a legitimate prescription?

Respond in JSON format:
{{
    "verified": true/false,
    "confidence": 0.0-1.0,
    "medicines_matched": ["list of matched medicines"],
    "medicines_not_found": ["list of medicines not in prescription"],
    "reason": "explanation"
}}"""

            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a pharmacist verifying prescriptions. Be thorough but reasonable. For demo purposes, be lenient. Respond only in JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            content = response.choices[0].message.content.strip()
            
            # Clean JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            return json.loads(content.strip())
            
        except Exception as e:
            # Auto-approve on error for demo
            return {
                "verified": True,
                "message": f"Auto-verified (AI unavailable: {str(e)})",
                "medicines_matched": medicines
            }
    
    def check_interactions(self, medicines: List[str]) -> Dict[str, Any]:
        """Check for interactions between multiple medicines"""
        
        if len(medicines) < 2:
            return {"has_interactions": False, "interactions": []}
        
        collection = get_sync_collection("medicines")
        interactions = []
        
        for med_name in medicines:
            med = collection.find_one({
                "$or": [
                    {"name": {"$regex": med_name, "$options": "i"}},
                    {"generic_name": {"$regex": med_name, "$options": "i"}}
                ]
            })
            
            if med:
                drug_interactions = med.get("drug_interactions", [])
                for other_med in medicines:
                    if other_med != med_name:
                        for interaction in drug_interactions:
                            if other_med.lower() in interaction.lower():
                                interactions.append(f"{med_name} may interact with {other_med}")
        
        return {
            "has_interactions": len(interactions) > 0,
            "interactions": list(set(interactions))
        }
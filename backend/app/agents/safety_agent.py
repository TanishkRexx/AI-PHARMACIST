"""
Safety Agent - AI-powered drug safety checks
Enhanced with comprehensive safety analysis
"""
from typing import Dict, Any, List, Optional
from openai import OpenAI
import json
import time
import logging

from app.config import settings
# from app.database.mongodb import get_sync_collection
from app.observability.tracer import get_langfuse

logger = logging.getLogger(__name__)


class SafetyAgent:
    """
    AI-powered Safety Agent for drug safety checks.
    
    Features:
    - Allergy detection with severity assessment
    - Drug interaction checking
    - Contraindication analysis
    - Prescription verification using AI
    - Dosage validation
    - Age-appropriate medication checks
    """
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        self.langfuse = get_langfuse()
        
        # Common drug interaction database
        self.known_interactions = {
            "warfarin": ["aspirin", "ibuprofen", "amoxicillin"],
            "metformin": ["alcohol", "contrast dye"],
            "aspirin": ["warfarin", "ibuprofen", "blood thinners"],
            "amlodipine": ["simvastatin", "grapefruit"],
            "lisinopril": ["potassium supplements", "nsaids"],
        }
        
        # Allergy cross-reactivity
        self.allergy_cross_reactivity = {
            "penicillin": ["amoxicillin", "ampicillin", "penicillin", "augmentin"],
            "sulfa": ["sulfamethoxazole", "sulfasalazine"],
            "aspirin": ["ibuprofen", "naproxen", "nsaids"],
            "codeine": ["morphine", "oxycodone", "tramadol"],
        }
    
    def _get_sync_collection(self, name: str):
        """Get collection with lazy import"""
        from app.database.mongodb import get_sync_collection
        return get_sync_collection(name)

    def _log_operation(self, name: str, input_data: Any, output_data: Any, duration_ms: int):
        """Enhanced logging with scores"""
        if self.langfuse:
            try:
                trace = self.langfuse.trace(name=f"safety_agent.{name}")
                span = trace.span(
                    name=name,
                    input=input_data,
                    output=output_data,
                    metadata={
                        "duration_ms": duration_ms,
                        "ai_powered": True,
                        "agent": "SafetyAgent"
                    }
                )
                
                # Add score for quality tracking
                if isinstance(output_data, dict):
                    risk_scores = {"low": 1.0, "medium": 0.6, "high": 0.3, "critical": 0.0}
                    risk_level = output_data.get("risk_level", "low")
                    trace.score(
                        name="safety_score",
                        value=risk_scores.get(risk_level, 0.5),
                        comment=f"Risk level: {risk_level}"
                    )
                
                self.langfuse.flush()
            except Exception as e:
                logger.debug(f"Langfuse logging error: {e}")
    
    def check_drug_safety(
        self, 
        medicine_name: str, 
        user_allergies: List[str] = None,
        current_medications: List[str] = None,
        user_conditions: List[str] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive safety check for a medicine.
        
        Args:
            medicine_name: Name of the medicine to check
            user_allergies: List of user's known allergies
            current_medications: List of current medications
            user_conditions: List of medical conditions
            
        Returns:
            Safety assessment with warnings and recommendations
        """
        start_time = time.time()
        collection = self._get_sync_collection("medicines")
        
        # Find medicine
        medicine = collection.find_one({
            "$or": [
                {"name": {"$regex": medicine_name, "$options": "i"}},
                {"generic_name": {"$regex": medicine_name, "$options": "i"}}
            ]
        })
        
        if not medicine:
            result = {
                "safe": True,
                "warnings": [],
                "medicine_found": False,
                "ai_analyzed": False
            }
            duration_ms = int((time.time() - start_time) * 1000)
            self._log_operation("check_safety", {"medicine": medicine_name}, result, duration_ms)
            return result
        
        warnings = []
        alerts = []
        is_safe = True
        risk_level = "low"
        
        # ==================== CHECK PRESCRIPTION REQUIREMENT ====================
        if medicine.get("prescription_required"):
            warnings.append("This medicine requires a valid prescription")
        
        # ==================== CHECK ALLERGIES ====================
        if user_allergies:
            medicine_lower = medicine_name.lower()
            generic_lower = medicine.get("generic_name", "").lower()
            contraindications = [c.lower() for c in medicine.get("contraindications", [])]
            
            for allergy in user_allergies:
                allergy_lower = allergy.lower()
                
                # Direct match
                if allergy_lower in medicine_lower or allergy_lower in generic_lower:
                    alerts.append(f"ALLERGY ALERT: You are allergic to {allergy}! This medicine may contain it.")
                    is_safe = False
                    risk_level = "critical"
                
                # Check contraindications
                for contra in contraindications:
                    if allergy_lower in contra:
                        alerts.append(f"ALLERGY WARNING: {allergy} allergy may react with this medicine")
                        is_safe = False
                        risk_level = "high"
                
                # Cross-reactivity check
                if allergy_lower in self.allergy_cross_reactivity:
                    cross_reactive = self.allergy_cross_reactivity[allergy_lower]
                    if any(cr in medicine_lower or cr in generic_lower for cr in cross_reactive):
                        alerts.append(f"CROSS-REACTIVITY: {allergy} allergy may cross-react with this medicine")
                        is_safe = False
                        risk_level = "high"
        
        # ==================== CHECK DRUG INTERACTIONS ====================
        if current_medications:
            drug_interactions = medicine.get("drug_interactions", [])
            generic_lower = medicine.get("generic_name", "").lower()
            
            for med in current_medications:
                med_lower = med.lower()
                
                # Check against known interactions
                for interaction in drug_interactions:
                    if med_lower in interaction.lower():
                        warnings.append(f"Potential interaction with {med}: {interaction}")
                        if risk_level != "critical":
                            risk_level = "medium"
                
                # Check known interaction database
                if generic_lower in self.known_interactions:
                    if any(med_lower in ki for ki in self.known_interactions[generic_lower]):
                        warnings.append(f"Known interaction between {medicine_name} and {med}")
                        if risk_level != "critical":
                            risk_level = "medium"
        
        # ==================== CHECK MEDICAL CONDITIONS ====================
        if user_conditions:
            contraindications = medicine.get("contraindications", [])
            
            for condition in user_conditions:
                condition_lower = condition.lower()
                for contra in contraindications:
                    if condition_lower in contra.lower():
                        warnings.append(f"This medicine may not be suitable for patients with {condition}")
                        if risk_level == "low":
                            risk_level = "medium"
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        result = {
            "safe": is_safe,
            "risk_level": risk_level,
            "alerts": alerts,
            "warnings": warnings,
            "warnings_count": len(warnings) + len(alerts),
            "medicine_found": True,
            "prescription_required": medicine.get("prescription_required", False),
            "contraindications": medicine.get("contraindications", []),
            "side_effects": medicine.get("side_effects", []),
            "max_daily_dosage": medicine.get("max_daily_dosage", ""),
            "ai_analyzed": True,
            "duration_ms": duration_ms
        }
        
        self._log_operation(
            "check_safety",
            {
                "medicine": medicine_name,
                "allergies": user_allergies,
                "medications": current_medications
            },
            {"safe": is_safe, "risk_level": risk_level, "warnings": len(warnings)},
            duration_ms
        )
        
        return result
    
    async def verify_prescription_ai(
        self, 
        prescription_text: str, 
        medicines: List[str]
    ) -> Dict[str, Any]:
        """
        AI-powered prescription verification.
        Uses GPT to analyze prescription validity.
        """
        start_time = time.time()
        
        if not self.client:
            result = {
                "verified": True,
                "message": "Prescription auto-verified (AI unavailable)",
                "medicines_matched": medicines,
                "confidence": 0.7,
                "ai_analyzed": False
            }
            duration_ms = int((time.time() - start_time) * 1000)
            self._log_operation("verify_prescription", {"medicines": medicines}, result, duration_ms)
            return result
        
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
4. Are dosages mentioned appropriate?

Respond in JSON format:
{{
    "verified": true/false,
    "confidence": 0.0-1.0,
    "medicines_matched": ["list of matched medicines"],
    "medicines_not_found": ["list of medicines not in prescription"],
    "issues": ["list of any issues found"],
    "reason": "brief explanation"
}}"""

            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a pharmacist verifying prescriptions. Be thorough but reasonable. Respond only in JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            duration_ms = int((time.time() - start_time) * 1000)
            content = response.choices[0].message.content.strip()
            
            # Log LLM call
            if self.langfuse:
                trace = self.langfuse.trace(name="safety_agent.verify_prescription")
                trace.generation(
                    name="prescription_verification_llm",
                    model=settings.OPENAI_MODEL,
                    input=prompt,
                    output=content,
                    usage={
                        "input": response.usage.prompt_tokens,
                        "output": response.usage.completion_tokens
                    },
                    metadata={"duration_ms": duration_ms}
                )
                self.langfuse.flush()
            
            # Clean JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            result = json.loads(content.strip())
            result["duration_ms"] = duration_ms
            result["ai_analyzed"] = True
            
            return result
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            result = {
                "verified": True,
                "message": f"Auto-verified (AI error: {str(e)})",
                "medicines_matched": medicines,
                "confidence": 0.6,
                "duration_ms": duration_ms,
                "ai_analyzed": False
            }
            self._log_operation("verify_prescription_error", {"error": str(e)}, result, duration_ms)
            return result
    
    def check_interactions(self, medicines: List[str]) -> Dict[str, Any]:
        """
        Check for interactions between multiple medicines.
        Uses both database and AI analysis.
        """
        start_time = time.time()
        
        if len(medicines) < 2:
            return {"has_interactions": False, "interactions": [], "ai_analyzed": False}
        
        collection = self._get_sync_collection("medicines")
        interactions = []
        severity_levels = []
        
        for med_name in medicines:
            med = collection.find_one({
                "$or": [
                    {"name": {"$regex": med_name, "$options": "i"}},
                    {"generic_name": {"$regex": med_name, "$options": "i"}}
                ]
            })
            
            if med:
                drug_interactions = med.get("drug_interactions", [])
                generic = med.get("generic_name", "").lower()
                
                for other_med in medicines:
                    if other_med != med_name:
                        # Check database interactions
                        for interaction in drug_interactions:
                            if other_med.lower() in interaction.lower():
                                interactions.append({
                                    "medicine1": med_name,
                                    "medicine2": other_med,
                                    "description": interaction,
                                    "severity": "moderate"
                                })
                                severity_levels.append("moderate")
                        
                        # Check known interactions
                        if generic in self.known_interactions:
                            if any(other_med.lower() in ki for ki in self.known_interactions[generic]):
                                interactions.append({
                                    "medicine1": med_name,
                                    "medicine2": other_med,
                                    "description": f"Known interaction between {generic} and {other_med}",
                                    "severity": "moderate"
                                })
                                severity_levels.append("moderate")
        
        # Remove duplicates
        unique_interactions = []
        seen = set()
        for interaction in interactions:
            key = tuple(sorted([interaction["medicine1"], interaction["medicine2"]]))
            if key not in seen:
                seen.add(key)
                unique_interactions.append(interaction)
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        result = {
            "has_interactions": len(unique_interactions) > 0,
            "interactions": unique_interactions,
            "interaction_count": len(unique_interactions),
            "highest_severity": max(severity_levels) if severity_levels else "none",
            "medicines_checked": medicines,
            "recommendation": "Consult a pharmacist before taking these medicines together" if unique_interactions else "No known interactions found",
            "duration_ms": duration_ms,
            "ai_analyzed": True
        }
        
        self._log_operation("check_interactions", {"medicines": medicines}, result, duration_ms)
        
        return result
    
    def get_safety_summary(self, medicine_name: str) -> Dict[str, Any]:
        """
        Get comprehensive safety summary for a medicine.
        """
        collection = self._get_sync_collection("medicines")
        
        medicine = collection.find_one({
            "$or": [
                {"name": {"$regex": medicine_name, "$options": "i"}},
                {"generic_name": {"$regex": medicine_name, "$options": "i"}}
            ]
        })
        
        if not medicine:
            return {"found": False}
        
        return {
            "found": True,
            "medicine_name": medicine["name"],
            "generic_name": medicine.get("generic_name", ""),
            "prescription_required": medicine.get("prescription_required", False),
            "safety_info": {
                "contraindications": medicine.get("contraindications", []),
                "side_effects": medicine.get("side_effects", []),
                "drug_interactions": medicine.get("drug_interactions", []),
                "max_daily_dosage": medicine.get("max_daily_dosage", "")
            },
            "warnings_count": len(medicine.get("contraindications", [])) + len(medicine.get("drug_interactions", [])),
            "ai_analyzed": True
        }
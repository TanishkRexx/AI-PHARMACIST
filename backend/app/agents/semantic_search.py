"""
Semantic Search Agent - AI-powered medicine search using embeddings
Uses Sentence Transformers for semantic understanding
"""
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Try to import dependencies
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    logger.warning("NumPy not installed. Semantic search disabled.")

try:
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    logger.warning("sentence-transformers not installed. Semantic search disabled.")


class SemanticSearchAgent:
    """
    AI-powered semantic search for medicines.
    Uses sentence embeddings to understand user intent.
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize semantic search - model loaded lazily."""
        self.model = None
        self.model_name = model_name
        self.medicine_embeddings = None
        self.medicine_data: List[Dict] = []
        self.is_initialized = False
        self.last_indexed = None
        self.model_loaded = False
    
    def _ensure_model_loaded(self):
        """Lazy load the model only when needed"""
        if self.model_loaded:
            return True
        
        if not EMBEDDINGS_AVAILABLE:
            logger.warning("Embeddings not available")
            return False
        
        try:
            logger.info(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            self.model_loaded = True
            logger.info("Semantic search model loaded")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model = None
            return False
    
    def index_medicines(self, medicines: List[Dict]) -> bool:
        """Create embeddings for all medicines in inventory."""
        if not self._ensure_model_loaded():
            return False
        
        if not NUMPY_AVAILABLE:
            logger.warning("NumPy not available, skipping indexing")
            return False
        
        try:
            texts = []
            self.medicine_data = medicines
            
            for med in medicines:
                text = self._create_searchable_text(med)
                texts.append(text)
            
            logger.info(f"Creating embeddings for {len(texts)} medicines...")
            self.medicine_embeddings = self.model.encode(
                texts, 
                show_progress_bar=False,
                convert_to_numpy=True
            )
            
            self.is_initialized = True
            self.last_indexed = datetime.utcnow()
            logger.info(f"Indexed {len(medicines)} medicines for semantic search")
            
            return True
            
        except Exception as e:
            logger.error(f"Indexing failed: {e}")
            return False
    
    def _create_searchable_text(self, medicine: Dict) -> str:
        """Create rich text representation for embedding."""
        parts = [
            medicine.get("name", ""),
            medicine.get("generic_name", ""),
            medicine.get("description", ""),
            medicine.get("category", ""),
        ]
        
        category_symptoms = {
            "painkiller": "pain headache fever body ache muscle pain",
            "antibiotic": "infection bacterial fever inflammation",
            "antidiabetic": "diabetes blood sugar glucose",
            "cardiovascular": "heart blood pressure hypertension",
            "respiratory": "breathing asthma cough cold",
            "gastrointestinal": "stomach digestion acid reflux heartburn",
            "vitamin": "supplement nutrition deficiency",
            "dermatological": "skin rash itching allergy",
        }
        
        category = medicine.get("category", "").lower()
        if category in category_symptoms:
            parts.append(category_symptoms[category])
        
        if medicine.get("side_effects"):
            parts.append(" ".join(medicine.get("side_effects", [])[:3]))
        
        return " ".join(filter(None, parts))
    
    def search(
        self, 
        query: str, 
        top_k: int = 5, 
        threshold: float = 0.3
    ) -> List[Dict]:
        """Semantic search for medicines."""
        if not self.model or self.medicine_embeddings is None:
            return []
        
        if not NUMPY_AVAILABLE:
            return []
        
        try:
            query_embedding = self.model.encode([query], convert_to_numpy=True)[0]
            similarities = self._cosine_similarity(query_embedding, self.medicine_embeddings)
            top_indices = np.argsort(similarities)[::-1][:top_k]
            
            results = []
            for idx in top_indices:
                score = float(similarities[idx])
                if score >= threshold:
                    medicine = self.medicine_data[idx].copy()
                    medicine["relevance_score"] = round(score, 3)
                    medicine["search_type"] = "semantic_ai"
                    results.append(medicine)
            
            return results
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    def _cosine_similarity(self, query_vec, doc_vecs) -> Any:
        """Calculate cosine similarity."""
        if not NUMPY_AVAILABLE:
            return []
        
        query_norm = query_vec / (np.linalg.norm(query_vec) + 1e-8)
        doc_norms = doc_vecs / (np.linalg.norm(doc_vecs, axis=1, keepdims=True) + 1e-8)
        return np.dot(doc_norms, query_norm)
    
    def find_similar_medicines(self, medicine_id: str, top_k: int = 5) -> List[Dict]:
        """Find medicines similar to a given medicine."""
        if not self.is_initialized or not NUMPY_AVAILABLE:
            return []
        
        target_idx = None
        for idx, med in enumerate(self.medicine_data):
            if med.get("id") == medicine_id:
                target_idx = idx
                break
        
        if target_idx is None:
            return []
        
        target_embedding = self.medicine_embeddings[target_idx]
        similarities = self._cosine_similarity(target_embedding, self.medicine_embeddings)
        similarities[target_idx] = -1
        
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            if score > 0.3:
                medicine = self.medicine_data[idx].copy()
                medicine["similarity_score"] = round(score, 3)
                results.append(medicine)
        
        return results
    
    def get_stats(self) -> Dict[str, Any]:
        """Get search engine statistics."""
        return {
            "is_initialized": self.is_initialized,
            "model_name": self.model_name,
            "model_loaded": self.model_loaded,
            "indexed_medicines": len(self.medicine_data),
            "last_indexed": self.last_indexed.isoformat() if self.last_indexed else None,
            "embeddings_available": EMBEDDINGS_AVAILABLE,
            "numpy_available": NUMPY_AVAILABLE
        }


# Singleton instance
_semantic_search_instance: Optional[SemanticSearchAgent] = None


def get_semantic_search() -> SemanticSearchAgent:
    """Get or create semantic search instance."""
    global _semantic_search_instance
    
    if _semantic_search_instance is None:
        _semantic_search_instance = SemanticSearchAgent()
    
    return _semantic_search_instance
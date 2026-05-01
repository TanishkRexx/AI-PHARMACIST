import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('apos.log')
    ]
)

from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # App
    APP_NAME: str = "GoMed"
    DEBUG: bool = True
    
    # MongoDB
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "GoMed")
    
    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # AI Provider Selection: "groq" or "openai"
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "groq")
    
    # Groq Settings (PRIMARY - Free & Fast)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_LLM_MODEL: str = os.getenv("GROQ_LLM_MODEL", "llama-3.1-70b-versatile")
    GROQ_WHISPER_MODEL: str = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3")
    
    # OpenAI Settings (Backup)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # TTS Settings (Edge TTS - Free)
    TTS_VOICE: str = os.getenv("TTS_VOICE", "en-IN-NeerjaNeural")  # Indian English Female
    TTS_RATE: str = os.getenv("TTS_RATE", "+5%")  # Speech rate
    
    # Langfuse Observability
    LANGFUSE_PUBLIC_KEY: str = os.getenv("LANGFUSE_PUBLIC_KEY", "")
    LANGFUSE_SECRET_KEY: str = os.getenv("LANGFUSE_SECRET_KEY", "")
    LANGFUSE_HOST: str = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
    
    
    GEMINI_API_KEY :str = os.getenv("GEMINI_API_KEY")
    class Config:
        env_file = ".env"


settings = Settings()

# Log which AI provider is configured
if settings.GROQ_API_KEY:
    logging.info(f"Groq API configured (Model: {settings.GROQ_LLM_MODEL})")
if settings.OPENAI_API_KEY:
    logging.info(f"OpenAI API configured (Model: {settings.OPENAI_MODEL})")
if not settings.GROQ_API_KEY and not settings.OPENAI_API_KEY:
    logging.warning("No AI API keys configured! Chat will use pattern-based only.")
"""
APOS - Autonomous Pharmacy Operating System
Main Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database.mongodb import connect_db, disconnect_db
from app.auth import router as auth_router
from app.customer import router as customer_router
from app.pharmacy import router as pharmacy_router
from app.distributor import router as distributor_router
from app.admin.routes import router as admin_router
from app.admin.observability_routes import router as observability_router
from app.observability.tracer import get_langfuse, flush_traces
from app.customer.therapy_routes import start_scheduler


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting APOS Pharmacy System...")
    await connect_db()
    
    langfuse = get_langfuse()
    if langfuse:
        logger.info("Langfuse observability enabled")
    else:
        logger.warning("Langfuse observability not configured")
    
    logger.info("APOS is ready!")
    
    yield
    
    # Shutdown
    logger.info(" Shutting down APOS...")
    flush_traces() 
    await disconnect_db()


# Create FastAPI app
app = FastAPI(
    title="APOS - Autonomous Pharmacy Operating System",
    description="""
    An AI-powered multi-role pharmacy system.
    
    ## Roles
    
    ### Customer
    - Browse & search medicines
    - AI-powered chat ordering
    - Cart management
    - Order placement & tracking
    - Refill suggestions
    
    ### Pharmacy
    - Inventory management
    - Customer order processing
    - Procurement from distributor
    - Sales analytics
    - Demand forecasting
    
    ### Distributor
    - View pharmacy orders
    - Ship orders
    - Track deliveries
    - Basic analytics
    """,
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://localhost:5173"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api", tags=["Authentication"])
app.include_router(customer_router, prefix="/api")
app.include_router(pharmacy_router, prefix="/api")
app.include_router(distributor_router, prefix="/api")
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(observability_router, prefix="/api/admin", tags=["Admin", "Observability"])


@app.on_event("startup")
async def startup_event():
    start_scheduler()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to APOS - Autonomous Pharmacy Operating System",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "auth": "/api/auth",
            "customer": "/api/customer",
            "pharmacy": "/api/pharmacy",
            "distributor": "/api/distributor"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    from app.database.mongodb import db
    from app.observability.tracer import get_langfuse
    from app.config import settings
    
    db_status = "connected" if db.client else "disconnected"
    langfuse_status = "enabled" if get_langfuse() else "disabled"
    
    # AI Provider info
    if settings.AI_PROVIDER == "groq" and settings.GROQ_API_KEY:
        ai_engine = f"Groq {settings.GROQ_LLM_MODEL}"
    elif settings.OPENAI_API_KEY:
        ai_engine = f"OpenAI {settings.OPENAI_MODEL}"
    else:
        ai_engine = "Pattern-based (no AI)"
    
    return {
        "status": "healthy",
        "service": "APOS Pharmacy System",
        "version": "1.0.0",
        "database": db_status,
        "observability": langfuse_status,
        "ai_engine": ai_engine,
        "voice_enabled": bool(settings.GROQ_API_KEY)
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
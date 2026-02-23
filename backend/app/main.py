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
from app.agents.voice import router as voice_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("🚀 Starting APOS Pharmacy System...")
    await connect_db()
    logger.info("✅ APOS is ready!")
    
    yield
    
    # Shutdown
    logger.info("🔌 Shutting down APOS...")
    await disconnect_db()


# Create FastAPI app
app = FastAPI(
    title="APOS - Autonomous Pharmacy Operating System",
    description="""
    🏥 An AI-powered multi-role pharmacy system.
    
    ## Roles
    
    ### 👤 Customer
    - Browse & search medicines
    - AI-powered chat ordering
    - Cart management
    - Order placement & tracking
    - Refill suggestions
    
    ### 🏥 Pharmacy
    - Inventory management
    - Customer order processing
    - Procurement from distributor
    - Sales analytics
    - Demand forecasting
    
    ### 🚚 Distributor
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
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(customer_router, prefix="/api")
app.include_router(pharmacy_router, prefix="/api")
app.include_router(distributor_router, prefix="/api")
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(auth_router, prefix="/api/v1", tags=["Authentication"])
app.include_router(voice_router)


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
    return {
        "status": "healthy",
        "service": "APOS Pharmacy System"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
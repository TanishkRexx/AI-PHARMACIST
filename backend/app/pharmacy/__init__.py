"""
Pharmacy APIs Package
"""
from fastapi import APIRouter

from app.pharmacy.routes import router as pharmacy_router
from app.pharmacy.inventory_routes import router as inventory_router
from app.pharmacy.order_routes import router as order_router
from app.pharmacy.procurement_routes import router as procurement_router
from app.pharmacy.analytics_routes import router as analytics_router

# Combined router
router = APIRouter(prefix="/pharmacy", tags=["Pharmacy"])

router.include_router(pharmacy_router)
router.include_router(inventory_router)
router.include_router(order_router)
router.include_router(procurement_router)
router.include_router(analytics_router)

__all__ = ["router"]
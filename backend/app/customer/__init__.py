"""
Customer APIs Package
"""
from fastapi import APIRouter

from app.customer.routes import router as customer_router
from app.customer.chat_routes import router as chat_router
from app.customer.cart_routes import router as cart_router
from app.customer.order_routes import router as order_router
from app.customer.health_routes import router as health_router
from .prescription_routes import router as prescription_router
from .therapy_routes import router as therapy_router
from .prescription_cart import router as prescription_cart_router
from app.customer.price_routes import router as price_router
from app.customer.notification_routes import router as notification_router

# Combined router
router = APIRouter(prefix="/customer", tags=["Customer"])

router.include_router(customer_router)
router.include_router(chat_router)
router.include_router(cart_router)
router.include_router(order_router)
router.include_router(health_router)
router.include_router(prescription_router)
router.include_router(prescription_cart_router)
router.include_router(therapy_router)
router.include_router(price_router)
router.include_router(notification_router)

__all__ = ["router"]
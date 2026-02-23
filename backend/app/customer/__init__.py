"""
Customer APIs Package
"""
from fastapi import APIRouter

from app.customer.routes import router as customer_router
from app.customer.chat_routes import router as chat_router
from app.customer.cart_routes import router as cart_router
from app.customer.order_routes import router as order_router

# Combined router
router = APIRouter(prefix="/customer", tags=["Customer"])

router.include_router(customer_router)
router.include_router(chat_router)
router.include_router(cart_router)
router.include_router(order_router)

__all__ = ["router"]
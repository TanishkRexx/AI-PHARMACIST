"""
Admin APIs Package
"""
from fastapi import APIRouter

from .routes import router

# router = APIRouter(prefix="/admin", tags=["Admin"])
# router.include_router(admin_router)

__all__ = ["router"]
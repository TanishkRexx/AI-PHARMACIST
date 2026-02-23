"""
Distributor APIs Package
"""
from fastapi import APIRouter

from app.distributor.routes import router as distributor_router

router = APIRouter(prefix="/distributor", tags=["Distributor"])
router.include_router(distributor_router)

__all__ = ["router"]
"""
Admin APIs Package
"""
from fastapi import APIRouter
from app.admin import routes
from app.admin import observability_routes

router = APIRouter()
router.include_router(routes.router)
router.include_router(observability_routes.router)

__all__ = ["router"]
"""
Admin Observability Routes - View agent performance metrics
"""
from fastapi import APIRouter, Depends
from typing import Optional
from datetime import datetime, timedelta

from app.auth.dependencies import require_role
from app.auth.models import UserRole
from app.observability.tracer import get_langfuse

router = APIRouter()


@router.get("/observability/summary")
async def get_observability_summary(
    hours: int = 24,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get AI agent performance summary.
    Note: This fetches data from Langfuse API.
    """
    langfuse = get_langfuse()
    
    if not langfuse:
        return {
            "success": False,
            "message": "Observability not configured"
        }
    
    # In a real implementation, you would fetch from Langfuse API
    # For demo, return mock data structure
    return {
        "success": True,
        "data": {
            "period_hours": hours,
            "summary": {
                "total_traces": "View in Langfuse Dashboard",
                "total_llm_calls": "View in Langfuse Dashboard",
                "avg_latency_ms": "View in Langfuse Dashboard",
                "error_rate": "View in Langfuse Dashboard"
            },
            "agent_breakdown": {
                "orchestrator": {
                    "calls": "View in Langfuse",
                    "avg_latency": "View in Langfuse"
                },
                "medicine_agent": {
                    "calls": "View in Langfuse",
                    "avg_latency": "View in Langfuse"
                },
                "safety_agent": {
                    "calls": "View in Langfuse",
                    "avg_latency": "View in Langfuse"
                }
            },
            "dashboard_url": "https://cloud.langfuse.com"
        }
    }


@router.get("/observability/status")
async def get_observability_status(
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Check if observability is configured and working.
    """
    langfuse = get_langfuse()
    
    return {
        "success": True,
        "data": {
            "enabled": langfuse is not None,
            "provider": "Langfuse" if langfuse else None,
            "dashboard_url": "https://cloud.langfuse.com" if langfuse else None,
            "features": {
                "trace_tracking": langfuse is not None,
                "llm_monitoring": langfuse is not None,
                "cost_tracking": langfuse is not None,
                "latency_tracking": langfuse is not None,
                "error_tracking": langfuse is not None
            }
        }
    }
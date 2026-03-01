"""
Customer Health Profile Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from app.auth.dependencies import get_current_active_user
from app.agents.health_profile_agent import get_health_profile_agent

router = APIRouter()


@router.get("/health/profile")
async def get_health_profile(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get personalized health profile with AI insights.
    Endpoint: GET /api/customer/health/profile
    """
    try:
        agent = get_health_profile_agent()
        user_id = str(current_user["_id"])
        
        profile_data = agent.get_health_profile(user_id)
        
        return {
            "success": True,
            "data": profile_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health/adherence")
async def get_medication_adherence(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Track medication adherence and refill patterns.
    Endpoint: GET /api/customer/health/adherence
    """
    try:
        agent = get_health_profile_agent()
        user_id = str(current_user["_id"])
        
        adherence_data = agent.get_medication_adherence(user_id)
        
        return {
            "success": True,
            "data": adherence_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health/insights")
async def get_health_insights(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get AI-powered health insights and recommendations.
    Endpoint: GET /api/customer/health/insights
    """
    try:
        agent = get_health_profile_agent()
        user_id = str(current_user["_id"])
        
        profile = agent.get_health_profile(user_id)
        
        if not profile.get("success"):
            return {
                "success": False,
                "insights": []
            }
        
        return {
            "success": True,
            "data": {
                "insights": profile.get("health_insights", []),
                "health_score": profile.get("health_score"),
                "patterns": profile.get("medication_patterns", [])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


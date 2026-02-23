"""
Authentication Routes
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from bson import ObjectId

from app.auth.models import UserRegister, UserLogin, TokenResponse, UserResponse, UserRole
from app.auth.utils import get_password_hash, verify_password, create_access_token
from app.auth.dependencies import get_current_active_user
from app.database.mongodb import get_database

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """Register a new user"""
    
    db = get_database()
    users_collection = db["users"]
    
    # Check if email already exists
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if phone already exists
    existing_phone = await users_collection.find_one({"phone": user_data.phone})
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Create user document
    user_doc = {
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "name": user_data.name,
        "phone": user_data.phone,
        "role": user_data.role,
        "address": user_data.address,
        "medical_info": user_data.medical_info.model_dump() if user_data.medical_info else {
            "allergies": [],
            "chronic_conditions": [],
            "current_medications": []
        },
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Insert user
    result = await users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id, "role": user_data.role})
    
    # Return response
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "phone": user_data.phone,
            "role": user_data.role
        }
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user and return access token"""
    
    db = get_database()
    users_collection = db["users"]
    
    # Find user by email
    user = await users_collection.find_one({"email": credentials.email})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if active
    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    user_id = str(user["_id"])
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id, "role": user["role"]})
    
    # Return response
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user_id,
            "email": user["email"],
            "name": user["name"],
            "phone": user["phone"],
            "role": user["role"]
        }
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_active_user)):
    """Get current user information"""
    
    return UserResponse(
        id=current_user["_id"],
        email=current_user["email"],
        name=current_user["name"],
        phone=current_user["phone"],
        role=current_user["role"],
        address=current_user.get("address"),
        medical_info=current_user.get("medical_info"),
        is_active=current_user["is_active"],
        created_at=current_user["created_at"]
    )


@router.put("/profile")
async def update_profile(
    name: str = None,
    phone: str = None,
    address: str = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Update user profile"""
    
    db = get_database()
    
    update_data = {"updated_at": datetime.utcnow()}
    
    if name:
        update_data["name"] = name
    if phone:
        update_data["phone"] = phone
    if address:
        update_data["address"] = address
    
    await db["users"].update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_data}
    )
    
    return {"message": "Profile updated successfully"}


@router.put("/allergies")
async def update_allergies(
    allergies: list,
    current_user: dict = Depends(get_current_active_user)
):
    """Update customer allergies (Customer only)"""
    
    if current_user["role"] != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only customers can update allergies"
        )
    
    db = get_database()
    
    await db["users"].update_one(
        {"_id": ObjectId(current_user["_id"])},
        {
            "$set": {
                "medical_info.allergies": allergies,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Allergies updated successfully"}
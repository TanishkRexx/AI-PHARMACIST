from fastapi import APIRouter, Depends
from pydantic import BaseModel,Field,validator
from typing import Optional,Literal, List
from datetime import datetime,date
from bson import ObjectId

from apscheduler.schedulers.background import BackgroundScheduler


from app.database.mongodb import get_database



router = APIRouter()

# ------------------ Mongo ObjectId Handler ------------------

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

# ------------------ Timestamp Base ------------------

class TimestampModel(BaseModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ================== Therapy ==================

class TherapySchema(TimestampModel):
    patient_id: str
    days: int = Field(default=30, description="Number of therapy days")
    activate_therapy_schedule: bool = Field(default=True)
    reminder_method: Literal["sms", "email", "whatsapp"] = Field(default="sms")
    tracking_started_at_date: datetime = Field(default_factory=datetime.utcnow)
    medicine_delivery_date: Optional[datetime] = Field(default=None)

class TherapyInDB(TherapySchema):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# ================== Current Inventory ==================

class CurrentInventorySchema(TimestampModel):
    patient_id: str
    medicine_id: str

    # Input format: ["morning", "night"]
    frequency: Optional[List[Literal["morning", "afternoon", "night"]]] = Field(
        default=None,
        description="Dose times e.g. ['morning','night']"
    )

    duration: int = Field(description="Number of days")
    meal_timing: Optional[Literal["before_meal", "after_meal"]] = None

    #  Auto conversion + default logic
    @validator("frequency", pre=True, always=True)
    def convert_frequency(cls, v):
        #  If nothing comes → full dosage
        if v is None or len(v) == 0:
            return [1, 1, 1]

        mapping = {
            "morning": 0,
            "afternoon": 1,
            "night": 2
        }

        freq = [0, 0, 0]

        for time in v:
            key = time.lower()
            if key not in mapping:
                raise ValueError("frequency must be one of ['morning','afternoon','night']")
            freq[mapping[key]] = 1

        return freq


class CurrentInventoryInDB(CurrentInventorySchema):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
    
# ======================== Log system =======================

class CurrentInventoryLogSchema(BaseModel):
    patient_id: str
    medicine_id: str

    log_date: date = Field(description="Date of the log (YYYY-MM-DD)")
    day_no: int = Field(default=1)

    tracking_started_at_date: datetime = Field(default_factory=datetime.utcnow)
    tracking_ends_at_date: datetime = Field(default=None)

    days_followed: int = Field(default=1)
    total_dosage_today: int = Field(default=0)
    routine_followed: bool = Field(default=False)



class CurrentInventoryLogInDB(CurrentInventoryLogSchema):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

#============================================================

router.post('/activate-therapy')
async def therapy_plan( plan : TherapySchema, patient_id: str):
    """ Insert into database """ 

    db = get_database()

    # Collection (auto-created on first insert)
    therapies_col = db["therapies"]

    # Convert schema to dict
    doc = plan.dict()

    # Attach patient_id from auth/dependency
    doc["patient_id"] = patient_id

    # Safety: timestamps (if not already present)
    doc.setdefault("created_at", datetime.utcnow())
    doc.setdefault("updated_at", datetime.utcnow())

    result = await therapies_col.insert_one(doc)

    # Attach _id for response
    doc["_id"] = result.inserted_id

    # Return DB model
    return {
        "success": True,
        "message": "Therapy plan created successfully",
        "data": TherapyInDB(**doc)
    }

@router.put("/update-therapy")
async def update_therapy_plan(
    plan: TherapySchema,
    patient_id: str 
):
    db = get_database()
    therapies_col = db["therapies"]

    # Find existing therapy for this patient
    existing = await therapies_col.find_one({"patient_id": patient_id})

    if not existing:
        raise HTTPException(status_code=404, detail="Therapy plan not found")

    # Convert schema to dict
    update_data = plan.dict()

    # Never allow patient_id to change
    update_data.pop("patient_id", None)

    # Auto-update timestamp
    update_data["updated_at"] = datetime.utcnow()

    # Update document
    result = await therapies_col.update_one(
        {"patient_id": patient_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Therapy plan not found")

    # Fetch updated doc
    updated_doc = await therapies_col.find_one({"patient_id": patient_id})

    return {
        "success": True,
        "message": "Therapy plan updated successfully",
        "data": updated_doc
    }


@router.post('/create-inventory')
async def create_current_inventory(inventory: CurrentInventorySchema,patient_id : str):
    db = get_database()

    # Collection (auto-created on first insert)
    inventory_col = db["current_inventory"]

    # Convert schema to dict
    doc = inventory.dict()

    # Attach patient_id from auth/dependency
    doc["patient_id"] = patient_id

     # Safety: timestamps (if not already present)
    doc.setdefault("created_at", datetime.utcnow())
    doc.setdefault("updated_at", datetime.utcnow())

    result = await inventory_col.insert_one(doc)

    # Attach _id for response
    doc["_id"] = result.inserted_id

    # Return DB model
    return {
        "success": True,
        "message": "Current Inventory created successfully",
        "data": CurrentInventoryInDB(**doc)
    }



@router.put('/update-inventory')
async def update_current_inventory(inventory: CurrentInventorySchema,patient_id :str ):

    db = get_database()

    inventory_col = db['current_inventory']

    # Find existing therapy for this patient
    existing = await inventory_col.find_one({"patient_id": patient_id})

    if not existing:
        raise HTTPException(status_code=404, detail="Current Inventory  not found")

    # Convert schema to dict
    update_data = inventory.dict()

    # Never allow patient_id to change
    update_data.pop("patient_id", None)

    # Auto-update timestamp
    update_data["updated_at"] = datetime.utcnow()

    # Update document
    result = await therapies_col.update_one(
        {"patient_id": patient_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Current Inventory not found")


@router.get('/manage-plan')
async def manage_therapy_plan(patient_id : str):

    db = get_database()
    therapies_col = db["therapies"]

    therapy_plan = await therapies_col.find_one({"patient_id" : patient_id})

    plan_activated = therapy_plan['activate_therapy_schedule']

    if plan_activated :
        if therapy_plan['tracking_started_at_date'].date() != therapy_plan['medicine_delivery_date'].date() :

            pass
    
    pass

# ================  Therapy Management =====================

@router.post("/daily-log-update/{medicine_id}")
async def daily_log_update(medicine_id: str, patient_id: str):
    """
    End-of-day update for a medicine:
    - day_no += 1
    - check if routine followed
    - calculate required dosage from frequency
    - compare with taken dosage
    - reset daily dosage
    """

    db = get_database()
    today = datetime.utcnow().date()

    # 1️⃣ Get current inventory (medicine config)
    inventory = await db["current_inventory"].find_one({
        "patient_id": patient_id,
        "medicine_id": medicine_id
    })

    if not inventory:
        raise HTTPException(status_code=404, detail="Medicine not found in inventory")

    # frequency example: [1,0,1]
    frequency = inventory.get("frequency", [1,1,1])
    total_required_dosage = sum(frequency)

    # 2️⃣ Get today's log
    log = await db["current_inventory_logs"].find_one({
        "patient_id": patient_id,
        "medicine_id": medicine_id,
        "log_date": today
    })

    if not log:
        raise HTTPException(status_code=404, detail="Today's log not found")

    taken_today = log.get("total_dosage_today", 0)

    # 3️⃣ Check routine followed
    routine_followed = taken_today >= total_required_dosage

    # 4️⃣ Update today's log
    await db["current_inventory_logs"].update_one(
        {"_id": log["_id"]},
        {
            "$set": {
                "routine_followed": routine_followed,
                "updated_at": datetime.utcnow()
            },
            "$inc": {
                "day_no": 1
            }
        }
    )

    # 5️⃣ Create next day log
    next_day = today + timedelta(days=1)

    await db["current_inventory_logs"].insert_one({
        "patient_id": patient_id,
        "medicine_id": medicine_id,
        "log_date": next_day,
        "day_no": log["day_no"] + 1,
        "total_dosage_today": 0,
        "routine_followed": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })

    return {
        "success": True,
        "patient_id": patient_id,
        "medicine_id": medicine_id,
        "day_completed": str(today),
        "required_dosage": total_required_dosage,
        "taken_dosage": taken_today,
        "routine_followed": routine_followed,
        "message": "Daily log updated and new day initialized"
    }

@router.post("/send-notifications")
async def send_notifications():
    await TherapyManagement.send_notification()
    return {"success": True, "message": "Notifications triggered"}
    

# ===================== log management ===================
async def calculate_total_daily_dosage(patient_id: str, medicine_id: str) -> int:
    db = get_database()

    med = await db["current_inventory"].find_one({
        "patient_id": patient_id,
        "medicine_id": medicine_id
    })

    if not med:
        return 0

    # frequency format: [1,0,1]
    dosage_pattern = med.get("frequency", [1,1,1])

    # total dosage for the day = number of 1s
    total_dosage_today = sum(dosage_pattern)

    return total_dosage_today

    
scheduler = BackgroundScheduler()


def notify_defaulters_1_hour_before():
    db = get_database()
    today = datetime.utcnow().date()

    # Find logs where routine NOT followed today
    cursor = db["current_inventory_logs"].find({
        "log_date": today,
        "routine_followed": False
    })

    for log in cursor:
        patient_id = log["patient_id"]

        patient = db["patients"].find_one({"_id": patient_id})
        if not patient:
            continue

        email = patient.get("email")
        if email:
            send_notification_email(
                email,
                "Medicine Reminder ⏰",
                "You have not completed today's medicine routine. 1 hour left for today 💊"
            )


def notify_defaulters_30_min_before():
    db = get_database()
    today = datetime.utcnow().date()

    cursor = db["current_inventory_logs"].find({
        "log_date": today,
        "routine_followed": False
    })

    for log in cursor:
        patient_id = log["patient_id"]

        patient = db["patients"].find_one({"_id": patient_id})
        if not patient:
            continue

        email = patient.get("email")
        if email:
            send_notification_email(
                email,
                "URGENT Medicine Reminder ⚠️",
                "Only 30 minutes left! You still haven't completed today's medicine routine 💊"
            )


def start_scheduler():
    # ⏰ 1 hour before day end
    scheduler.add_job(notify_defaulters_1_hour_before, "cron", hour=23, minute=0)

    # ⏰ 30 minutes before day end
    scheduler.add_job(notify_defaulters_30_min_before, "cron", hour=23, minute=30)

    scheduler.start()
    

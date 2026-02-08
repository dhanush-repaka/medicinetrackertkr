from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Medicine data based on prescription - Start Date: Feb 7, 2026
MEDICINES = [
    {
        "id": "1",
        "name": "CEFTUM-CV",
        "dosage": "500MG",
        "frequency": "twice",
        "times": ["08:00", "20:00"],
        "duration_days": 7,
        "instruction": "PER ORAL",
        "start_date": "2026-02-07"
    },
    {
        "id": "2",
        "name": "ETOVA-ER",
        "dosage": "400MG",
        "frequency": "twice",
        "times": ["08:00", "20:00"],
        "duration_days": 14,
        "instruction": "G TWILY",
        "start_date": "2026-02-07"
    },
    {
        "id": "3",
        "name": "DOLO",
        "dosage": "650MG",
        "frequency": "thrice",
        "times": ["08:00", "14:00", "20:00"],
        "duration_days": 5,
        "instruction": "THRICE DAILY",
        "start_date": "2026-02-07"
    },
    {
        "id": "4",
        "name": "ASPIRIN",
        "dosage": "75MG",
        "frequency": "twice",
        "times": ["08:00", "20:00"],
        "duration_days": 30,
        "instruction": "TWICE DAILY",
        "start_date": "2026-02-07"
    },
    {
        "id": "5",
        "name": "PREGABALIN-D",
        "dosage": "75/20MG",
        "frequency": "once",
        "times": ["20:00"],
        "duration_days": 14,
        "instruction": "ONCE DAILY AT 8 PM",
        "start_date": "2026-02-07"
    },
    {
        "id": "6",
        "name": "AFICAL PLUS",
        "dosage": "",
        "frequency": "twice",
        "times": ["08:00", "20:00"],
        "duration_days": 30,
        "instruction": "TWICE DAILY",
        "start_date": "2026-02-07"
    },
    {
        "id": "7",
        "name": "PAN-D",
        "dosage": "40MG",
        "frequency": "once",
        "times": ["07:00"],
        "duration_days": 30,
        "instruction": "ONCE DAILY AT 7 AM BEFORE BREAKFAST",
        "start_date": "2026-02-07"
    },
    {
        "id": "8",
        "name": "NEURONEX-CD3",
        "dosage": "",
        "frequency": "once",
        "times": ["14:00"],
        "duration_days": 30,
        "instruction": "ONCE DAILY AT 2 PM",
        "start_date": "2026-02-07"
    },
    {
        "id": "9",
        "name": "ELIQUIS",
        "dosage": "2.5MG",
        "frequency": "twice",
        "times": ["08:00", "20:00"],
        "duration_days": 30,
        "instruction": "TWICE DAILY",
        "start_date": "2026-02-07"
    },
    {
        "id": "10",
        "name": "BETACAP TR",
        "dosage": "20MG",
        "frequency": "twice",
        "times": ["08:00", "20:00"],
        "duration_days": 30,
        "instruction": "TWICE TO CONTINUE",
        "start_date": "2026-02-07"
    },
    {
        "id": "11",
        "name": "STAMLO",
        "dosage": "5MG",
        "frequency": "once",
        "times": ["08:00"],
        "duration_days": 30,
        "instruction": "ONCE A DAY TO CONTINUE",
        "start_date": "2026-02-07"
    },
    {
        "id": "12",
        "name": "ULTRACET",
        "dosage": "",
        "frequency": "twice",
        "times": ["08:00", "20:00"],
        "duration_days": 14,
        "instruction": "TWICE A DAY FOR 2 WEEKS",
        "start_date": "2026-02-07"
    }
]

# Models
class Medicine(BaseModel):
    id: str
    name: str
    dosage: str
    frequency: str
    times: List[str]
    duration_days: int
    instruction: str
    start_date: str

class IntakeRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    medicine_id: str
    date: str
    time: str
    taken: bool
    taken_at: Optional[str] = None

class IntakeCreate(BaseModel):
    medicine_id: str
    date: str
    time: str
    taken: bool

class IntakeUpdate(BaseModel):
    taken: bool

# Routes
@api_router.get("/")
async def root():
    return {"message": "Medicine Tracker API"}

@api_router.get("/medicines", response_model=List[Medicine])
async def get_medicines():
    return MEDICINES

@api_router.get("/medicines/{medicine_id}", response_model=Medicine)
async def get_medicine(medicine_id: str):
    for med in MEDICINES:
        if med["id"] == medicine_id:
            return med
    raise HTTPException(status_code=404, detail="Medicine not found")

@api_router.get("/medicines/schedule/{date}")
async def get_medicines_for_date(date: str):
    """Get all medicines scheduled for a specific date with their times"""
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    scheduled_medicines = []
    
    for med in MEDICINES:
        start_date = datetime.strptime(med["start_date"], "%Y-%m-%d")
        end_date = start_date + timedelta(days=med["duration_days"])
        
        if start_date <= target_date < end_date:
            for time in med["times"]:
                scheduled_medicines.append({
                    "medicine_id": med["id"],
                    "name": med["name"],
                    "dosage": med["dosage"],
                    "time": time,
                    "instruction": med["instruction"],
                    "frequency": med["frequency"]
                })
    
    # Sort by time
    scheduled_medicines.sort(key=lambda x: x["time"])
    return scheduled_medicines

@api_router.get("/intake/{date}")
async def get_intake_records(date: str):
    """Get all intake records for a specific date"""
    records = await db.intake_records.find({"date": date}, {"_id": 0}).to_list(1000)
    return records

@api_router.post("/intake", response_model=IntakeRecord)
async def create_intake_record(intake: IntakeCreate):
    """Create or update an intake record"""
    existing = await db.intake_records.find_one({
        "medicine_id": intake.medicine_id,
        "date": intake.date,
        "time": intake.time
    })
    
    if existing:
        await db.intake_records.update_one(
            {"medicine_id": intake.medicine_id, "date": intake.date, "time": intake.time},
            {"$set": {
                "taken": intake.taken,
                "taken_at": datetime.now(timezone.utc).isoformat() if intake.taken else None
            }}
        )
        updated = await db.intake_records.find_one({
            "medicine_id": intake.medicine_id,
            "date": intake.date,
            "time": intake.time
        }, {"_id": 0})
        return updated
    
    record = IntakeRecord(
        medicine_id=intake.medicine_id,
        date=intake.date,
        time=intake.time,
        taken=intake.taken,
        taken_at=datetime.now(timezone.utc).isoformat() if intake.taken else None
    )
    doc = record.model_dump()
    await db.intake_records.insert_one(doc)
    return record

@api_router.get("/schedule/full")
async def get_full_schedule():
    """Get full medicine schedule with all dates and times"""
    schedule = []
    for med in MEDICINES:
        start_date = datetime.strptime(med["start_date"], "%Y-%m-%d")
        for day in range(med["duration_days"]):
            current_date = start_date + timedelta(days=day)
            for time in med["times"]:
                schedule.append({
                    "medicine_id": med["id"],
                    "name": med["name"],
                    "dosage": med["dosage"],
                    "date": current_date.strftime("%Y-%m-%d"),
                    "time": time,
                    "instruction": med["instruction"]
                })
    
    schedule.sort(key=lambda x: (x["date"], x["time"]))
    return schedule

@api_router.get("/stats/{date}")
async def get_daily_stats(date: str):
    """Get statistics for a specific date"""
    scheduled = await get_medicines_for_date(date)
    intake_records = await db.intake_records.find({"date": date}, {"_id": 0}).to_list(1000)
    
    taken_count = sum(1 for r in intake_records if r.get("taken", False))
    total_count = len(scheduled)
    
    return {
        "date": date,
        "total": total_count,
        "taken": taken_count,
        "pending": total_count - taken_count,
        "percentage": round((taken_count / total_count * 100) if total_count > 0 else 0, 1)
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

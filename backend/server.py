from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Form, Cookie, Response, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import aiofiles
import base64
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Emergent LLM client
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

async def call_llm(prompt: str, session_id: str = "default") -> str:
    """Helper function to call LLM using Emergent Integration"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="Você é um assistente financeiro inteligente."
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logging.error(f"LLM call failed: {e}")
        raise e

app = FastAPI()
api_router = APIRouter(prefix="/api")

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    xp: int = 0
    rank: str = "Recruta"
    created_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class SessionData(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    task_id: str
    user_id: str
    title: str
    description: Optional[str] = None
    completed: bool = False
    date: str
    priority: str = "medium"
    xp_reward: int = 10
    recurrence: str = "daily"
    is_template: bool = True
    created_at: datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: str
    priority: str = "medium"
    recurrence: str = "daily"

class Habit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    habit_id: str
    user_id: str
    name: str
    description: Optional[str] = None
    color: str
    streak: int = 0
    best_streak: int = 0
    completions: List[str] = []
    created_at: datetime

class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#007AFF"

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str
    user_id: str
    type: str
    amount: float
    category: str
    description: Optional[str] = None
    date: str
    created_at: datetime

class TransactionCreate(BaseModel):
    type: str
    amount: float
    category: str
    description: Optional[str] = None
    date: str

class Budget(BaseModel):
    model_config = ConfigDict(extra="ignore")
    budget_id: str
    user_id: str
    category: str
    limit: float
    spent: float = 0
    month: str
    created_at: datetime

class BudgetCreate(BaseModel):
    category: str
    limit: float
    month: str

class Goal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    goal_id: str
    user_id: str
    title: str
    description: Optional[str] = None
    target_date: str
    progress: float = 0
    sprint_duration: int = 60
    daily_checks: List[str] = []
    sprints: List[Dict[str, Any]] = []
    created_at: datetime

class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: str
    sprint_duration: int = 60

class Challenge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    challenge_id: str
    title: str
    description: str
    xp_reward: int
    week_start: str
    week_end: str
    completed_by: List[str] = []
    created_at: datetime

class Achievement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    achievement_id: str
    user_id: str
    title: str
    description: str
    icon: str
    unlocked_at: datetime

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message_id: str
    user_id: str
    role: str
    content: str
    transaction_data: Optional[Dict[str, Any]] = None
    created_at: datetime

class Report(BaseModel):
    model_config = ConfigDict(extra="ignore")
    report_id: str
    user_id: str
    type: str
    period: str
    data: Dict[str, Any]
    insights: str
    created_at: datetime

# ========== WORKOUT MODELS ==========
class WorkoutPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    plan_id: str
    user_id: str
    name: str
    description: Optional[str] = None
    exercises: List[Dict[str, Any]] = []  # [{name, sets, reps, weight, notes}]
    created_at: datetime

class WorkoutPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    exercises: List[Dict[str, Any]] = []

class WorkoutLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str
    user_id: str
    plan_id: Optional[str] = None
    activity_type: str  # running, weightlifting, cycling, swimming, etc.
    name: str
    duration_minutes: int = 0
    distance_km: Optional[float] = None
    calories: Optional[int] = None
    exercises_completed: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    xp_earned: int = 20
    completed: bool = True
    date: str
    created_at: datetime

class WorkoutLogCreate(BaseModel):
    plan_id: Optional[str] = None
    activity_type: str
    name: str
    duration_minutes: int = 0
    distance_km: Optional[float] = None
    calories: Optional[int] = None
    exercises_completed: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    date: str

# ========== NOTIFICATION MODELS ==========
class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notification_id: str
    user_id: str
    title: str
    message: str
    type: str  # reminder, achievement, alert, system
    category: str  # workout, habit, task, hydration, custom
    scheduled_time: Optional[str] = None
    repeat: str = "none"  # none, daily, weekly, custom
    repeat_days: List[str] = []  # ["monday", "tuesday", etc.]
    enabled: bool = True
    channels: List[str] = ["in_app"]  # in_app, browser, email, whatsapp, telegram
    last_sent: Optional[str] = None
    created_at: datetime

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "reminder"
    category: str = "custom"
    scheduled_time: Optional[str] = None
    repeat: str = "none"
    repeat_days: List[str] = []
    channels: List[str] = ["in_app"]

class NotificationLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str
    notification_id: str
    user_id: str
    sent_at: datetime
    channel: str
    status: str  # sent, read, dismissed

# ========== BODY MEASUREMENT MODELS ==========
class BodyMeasurement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    measurement_id: str
    user_id: str
    date: str
    # Peso e composição corporal
    weight_kg: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    muscle_mass_kg: Optional[float] = None
    bone_mass_kg: Optional[float] = None
    water_percentage: Optional[float] = None
    visceral_fat: Optional[int] = None
    metabolic_age: Optional[int] = None
    bmr_kcal: Optional[int] = None  # Taxa metabólica basal
    # Medidas corporais (cm)
    height_cm: Optional[float] = None
    neck_cm: Optional[float] = None
    shoulders_cm: Optional[float] = None
    chest_cm: Optional[float] = None
    waist_cm: Optional[float] = None
    abdomen_cm: Optional[float] = None
    hips_cm: Optional[float] = None
    left_arm_cm: Optional[float] = None
    right_arm_cm: Optional[float] = None
    left_forearm_cm: Optional[float] = None
    right_forearm_cm: Optional[float] = None
    left_thigh_cm: Optional[float] = None
    right_thigh_cm: Optional[float] = None
    left_calf_cm: Optional[float] = None
    right_calf_cm: Optional[float] = None
    # Calculados
    bmi: Optional[float] = None  # IMC
    # Notas e observações
    notes: Optional[str] = None
    source: str = "manual"  # manual, pdf_import, bioimpedance
    created_at: datetime

class BodyMeasurementCreate(BaseModel):
    date: str
    weight_kg: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    muscle_mass_kg: Optional[float] = None
    bone_mass_kg: Optional[float] = None
    water_percentage: Optional[float] = None
    visceral_fat: Optional[int] = None
    metabolic_age: Optional[int] = None
    bmr_kcal: Optional[int] = None
    height_cm: Optional[float] = None
    neck_cm: Optional[float] = None
    shoulders_cm: Optional[float] = None
    chest_cm: Optional[float] = None
    waist_cm: Optional[float] = None
    abdomen_cm: Optional[float] = None
    hips_cm: Optional[float] = None
    left_arm_cm: Optional[float] = None
    right_arm_cm: Optional[float] = None
    left_forearm_cm: Optional[float] = None
    right_forearm_cm: Optional[float] = None
    left_thigh_cm: Optional[float] = None
    right_thigh_cm: Optional[float] = None
    left_calf_cm: Optional[float] = None
    right_calf_cm: Optional[float] = None
    notes: Optional[str] = None
    source: str = "manual"

# ========== DAILY WORKOUT TRACKING ==========
class DailyWorkoutStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    status_id: str
    user_id: str
    plan_id: str
    date: str
    exercises_status: Dict[int, bool] = {}  # {exercise_index: completed}
    completed: bool = False
    created_at: datetime
    updated_at: datetime

async def get_current_user(authorization: Optional[str] = None, session_token: Optional[str] = Cookie(None)) -> User:
    token = session_token or (authorization.replace("Bearer ", "") if authorization else None)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

@api_router.get("/")
async def root():
    return {"message": "Sirius API - Discipline is Destiny"}

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hashed_password.decode('utf-8'),
        "picture": None,
        "xp": 0,
        "rank": "Recruta",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"session_token": session_token, "user": {"user_id": user_id, "email": user_data.email, "name": user_data.name}}

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(credentials.password.encode('utf-8'), user_doc['password'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"session_token": session_token, "user": {"user_id": user_doc["user_id"], "email": user_doc["email"], "name": user_doc["name"]}}

@api_router.get("/auth/google-session")
async def process_google_session(session_id: str, response: Response):
    try:
        headers = {"X-Session-ID": session_id}
        res = requests.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers=headers)
        
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid session ID")
        
        data = res.json()
        user_doc = await db.users.find_one({"email": data["email"]}, {"_id": 0})
        
        if user_doc:
            user_id = user_doc["user_id"]
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user_doc = {
                "user_id": user_id,
                "email": data["email"],
                "name": data["name"],
                "picture": data.get("picture"),
                "xp": 0,
                "rank": "Recruta",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
        
        session_token = data["session_token"]
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session_doc)
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7*24*60*60
        )
        
        return {"session_token": session_token, "user": {"user_id": user_id, "email": data["email"], "name": data["name"], "picture": data.get("picture")}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_me(request: Request, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    token = session_token or (auth_header.replace("Bearer ", "") if auth_header else None)
    
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

@api_router.post("/auth/upload-picture")
async def upload_profile_picture(
    request: Request,
    file: UploadFile = File(...),
    session_token: Optional[str] = Cookie(None)
):
    """Upload a profile picture for the user"""
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, GIF or WebP images are allowed")
    
    # Read and encode file
    content = await file.read()
    
    # Check file size (max 5MB)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    # Store as base64 data URL
    file_base64 = base64.b64encode(content).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{file_base64}"
    
    # Update user picture
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"picture": data_url}}
    )
    
    return {"message": "Profile picture updated", "picture": data_url}

@api_router.delete("/auth/remove-picture")
async def remove_profile_picture(request: Request, session_token: Optional[str] = Cookie(None)):
    """Remove the user's profile picture"""
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"picture": None}}
    )
    
    return {"message": "Profile picture removed"}

@api_router.get("/tasks")
async def get_tasks(request: Request, date: Optional[str] = None, recurrence: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {"user_id": user.user_id}
    if recurrence:
        query["recurrence"] = recurrence
    
    all_tasks = await db.tasks.find({"user_id": user.user_id, "is_template": True}, {"_id": 0}).to_list(1000)
    
    result_tasks = []
    for task in all_tasks:
        if recurrence and task.get('recurrence') != recurrence:
            continue
            
        instance = await db.task_instances.find_one({
            "task_id": task["task_id"],
            "date": date
        }, {"_id": 0})
        
        task_copy = task.copy()
        task_copy["date"] = date
        task_copy["completed"] = instance["completed"] if instance else False
        task_copy["instance_id"] = instance["instance_id"] if instance else None
        
        if isinstance(task_copy['created_at'], str):
            task_copy['created_at'] = datetime.fromisoformat(task_copy['created_at'])
        
        result_tasks.append(task_copy)
    
    return result_tasks

@api_router.post("/tasks")
async def create_task(request: Request, task_data: TaskCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    task_doc = {
        "task_id": task_id,
        "user_id": user.user_id,
        "title": task_data.title,
        "description": task_data.description,
        "priority": task_data.priority,
        "xp_reward": 10 if task_data.priority == "low" else 20 if task_data.priority == "medium" else 30,
        "recurrence": task_data.recurrence,
        "is_template": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(task_doc)
    task_doc['created_at'] = datetime.fromisoformat(task_doc['created_at'])
    task_doc['date'] = task_data.date
    task_doc['completed'] = False
    task_doc['instance_id'] = None
    return Task(**task_doc)

@api_router.patch("/tasks/{task_id}")
async def update_task(request: Request, task_id: str, completed: bool, date: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    task = await db.tasks.find_one({"task_id": task_id, "user_id": user.user_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    instance = await db.task_instances.find_one({"task_id": task_id, "date": date}, {"_id": 0})
    
    if not instance:
        instance_id = f"inst_{uuid.uuid4().hex[:12]}"
        instance_doc = {
            "instance_id": instance_id,
            "task_id": task_id,
            "user_id": user.user_id,
            "date": date,
            "completed": completed,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.task_instances.insert_one(instance_doc)
        was_completed = False
    else:
        await db.task_instances.update_one(
            {"instance_id": instance["instance_id"]},
            {"$set": {"completed": completed}}
        )
        was_completed = instance["completed"]
    
    # Completing task - award XP
    if completed and not was_completed:
        new_xp = user.xp + task['xp_reward']
        new_rank = calculate_rank(new_xp)
        await db.users.update_one({"user_id": user.user_id}, {"$set": {"xp": new_xp, "rank": new_rank}})
        return {"message": "Task completed", "xp_earned": task['xp_reward'], "new_xp": new_xp, "new_rank": new_rank}
    
    # Uncompleting task - deduct XP
    if not completed and was_completed:
        new_xp = max(0, user.xp - task['xp_reward'])
        new_rank = calculate_rank(new_xp)
        await db.users.update_one({"user_id": user.user_id}, {"$set": {"xp": new_xp, "rank": new_rank}})
        return {"message": "Task uncompleted", "xp_earned": -task['xp_reward'], "new_xp": new_xp, "new_rank": new_rank}
    
    return {"message": "Task updated"}

@api_router.delete("/tasks/{task_id}")
async def delete_task(request: Request, task_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    result = await db.tasks.delete_one({"task_id": task_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

@api_router.get("/habits")
async def get_habits(request: Request, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    habits = await db.habits.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    for habit in habits:
        if isinstance(habit['created_at'], str):
            habit['created_at'] = datetime.fromisoformat(habit['created_at'])
    return habits

@api_router.post("/habits")
async def create_habit(request: Request, habit_data: HabitCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    habit_id = f"habit_{uuid.uuid4().hex[:12]}"
    habit_doc = {
        "habit_id": habit_id,
        "user_id": user.user_id,
        "name": habit_data.name,
        "description": habit_data.description,
        "color": habit_data.color,
        "streak": 0,
        "best_streak": 0,
        "completions": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.habits.insert_one(habit_doc)
    habit_doc['created_at'] = datetime.fromisoformat(habit_doc['created_at'])
    return Habit(**habit_doc)

@api_router.post("/habits/{habit_id}/complete")
async def complete_habit(request: Request, habit_id: str, date: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    habit = await db.habits.find_one({"habit_id": habit_id, "user_id": user.user_id}, {"_id": 0})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Toggle: if already completed, uncomplete it
    if date in habit['completions']:
        # Uncomplete - remove date and deduct XP
        completions = [d for d in habit['completions'] if d != date]
        completions.sort()
        
        streak = calculate_streak(completions)
        
        await db.habits.update_one(
            {"habit_id": habit_id},
            {"$set": {"completions": completions, "streak": streak}}
        )
        
        # Deduct XP
        new_xp = max(0, user.xp - 15)
        new_rank = calculate_rank(new_xp)
        await db.users.update_one({"user_id": user.user_id}, {"$set": {"xp": new_xp, "rank": new_rank}})
        
        return {"message": "Habit uncompleted", "streak": streak, "xp_earned": -15, "new_xp": new_xp, "uncompleted": True}
    
    # Complete - add date and award XP
    completions = habit['completions'] + [date]
    completions.sort()
    
    streak = calculate_streak(completions)
    best_streak = max(habit['best_streak'], streak)
    
    await db.habits.update_one(
        {"habit_id": habit_id},
        {"$set": {"completions": completions, "streak": streak, "best_streak": best_streak}}
    )
    
    new_xp = user.xp + 15
    new_rank = calculate_rank(new_xp)
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"xp": new_xp, "rank": new_rank}})
    
    return {"message": "Habit completed", "streak": streak, "xp_earned": 15, "new_xp": new_xp, "uncompleted": False}

@api_router.delete("/habits/{habit_id}")
async def delete_habit(request: Request, habit_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    result = await db.habits.delete_one({"habit_id": habit_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    return {"message": "Habit deleted"}

@api_router.get("/transactions")
async def get_transactions(request: Request, month: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    query = {"user_id": user.user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(1000)
    for transaction in transactions:
        if isinstance(transaction['created_at'], str):
            transaction['created_at'] = datetime.fromisoformat(transaction['created_at'])
    return transactions

@api_router.post("/transactions")
async def create_transaction(request: Request, transaction_data: TransactionCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    transaction_id = f"trans_{uuid.uuid4().hex[:12]}"
    transaction_doc = {
        "transaction_id": transaction_id,
        "user_id": user.user_id,
        "type": transaction_data.type,
        "amount": transaction_data.amount,
        "category": transaction_data.category,
        "description": transaction_data.description,
        "date": transaction_data.date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(transaction_doc)
    
    if transaction_data.type == "expense":
        month = transaction_data.date[:7]
        budget = await db.budgets.find_one(
            {"user_id": user.user_id, "category": transaction_data.category, "month": month},
            {"_id": 0}
        )
        if budget:
            new_spent = budget['spent'] + transaction_data.amount
            await db.budgets.update_one(
                {"budget_id": budget['budget_id']},
                {"$set": {"spent": new_spent}}
            )
    
    transaction_doc['created_at'] = datetime.fromisoformat(transaction_doc['created_at'])
    return Transaction(**transaction_doc)

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(request: Request, transaction_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    # Primeiro verificar se a transação existe e pegar seus dados
    transaction = await db.transactions.find_one({"transaction_id": transaction_id, "user_id": user.user_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Deletar projeções relacionadas (parcelas futuras)
    await db.projections.delete_many({"source_transaction_id": transaction_id, "user_id": user.user_id})
    
    # Deletar a transação
    await db.transactions.delete_one({"transaction_id": transaction_id, "user_id": user.user_id})
    
    return {"message": "Transaction and related projections deleted"}

@api_router.get("/budgets")
async def get_budgets(request: Request, month: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    query = {"user_id": user.user_id}
    if month:
        query["month"] = month
    
    budgets = await db.budgets.find(query, {"_id": 0}).to_list(1000)
    for budget in budgets:
        if isinstance(budget['created_at'], str):
            budget['created_at'] = datetime.fromisoformat(budget['created_at'])
    return budgets

@api_router.post("/budgets")
async def create_budget(request: Request, budget_data: BudgetCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    existing = await db.budgets.find_one(
        {"user_id": user.user_id, "category": budget_data.category, "month": budget_data.month},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Budget already exists for this category and month")
    
    budget_id = f"budget_{uuid.uuid4().hex[:12]}"
    budget_doc = {
        "budget_id": budget_id,
        "user_id": user.user_id,
        "category": budget_data.category,
        "limit": budget_data.limit,
        "spent": 0,
        "month": budget_data.month,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.budgets.insert_one(budget_doc)
    budget_doc['created_at'] = datetime.fromisoformat(budget_doc['created_at'])
    return Budget(**budget_doc)

@api_router.get("/goals")
async def get_goals(request: Request, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    goals = await db.goals.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    for goal in goals:
        if isinstance(goal['created_at'], str):
            goal['created_at'] = datetime.fromisoformat(goal['created_at'])
    return goals

@api_router.post("/goals")
async def create_goal(request: Request, goal_data: GoalCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    goal_id = f"goal_{uuid.uuid4().hex[:12]}"
    goal_doc = {
        "goal_id": goal_id,
        "user_id": user.user_id,
        "title": goal_data.title,
        "description": goal_data.description,
        "target_date": goal_data.target_date,
        "progress": 0,
        "sprint_duration": goal_data.sprint_duration,
        "sprints": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.goals.insert_one(goal_doc)
    goal_doc['created_at'] = datetime.fromisoformat(goal_doc['created_at'])
    return Goal(**goal_doc)

@api_router.patch("/goals/{goal_id}")
async def update_goal(request: Request, goal_id: str, progress: float, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    result = await db.goals.update_one(
        {"goal_id": goal_id, "user_id": user.user_id},
        {"$set": {"progress": progress}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Goal updated"}

@api_router.delete("/goals/{goal_id}")
async def delete_goal(request: Request, goal_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    result = await db.goals.delete_one({"goal_id": goal_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Goal deleted"}

@api_router.get("/achievements")
async def get_achievements(request: Request, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    achievements = await db.achievements.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    for achievement in achievements:
        if isinstance(achievement['unlocked_at'], str):
            achievement['unlocked_at'] = datetime.fromisoformat(achievement['unlocked_at'])
    return achievements

@api_router.get("/chat/messages")
async def get_chat_messages(request: Request, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    messages = await db.chat_messages.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    for message in messages:
        if isinstance(message['created_at'], str):
            message['created_at'] = datetime.fromisoformat(message['created_at'])
    return messages

class ChatMessageCreate(BaseModel):
    content: str

@api_router.post("/chat/send")
async def send_chat_message(request: Request, message_data: ChatMessageCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    content = message_data.content.strip()
    content_lower = content.lower()
    
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    user_message = {
        "message_id": message_id,
        "user_id": user.user_id,
        "role": "user",
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(user_message.copy())
    
    try:
        # Get financial context
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        transactions = await db.transactions.find(
            {"user_id": user.user_id, "date": {"$regex": f"^{current_month}"}},
            {"_id": 0}
        ).to_list(500)
        
        total_income = sum([t['amount'] for t in transactions if t['type'] == 'income'])
        total_expense = sum([t['amount'] for t in transactions if t['type'] == 'expense'])
        balance = total_income - total_expense
        
        # Get budgets
        budgets = await db.budgets.find({"user_id": user.user_id, "month": current_month}, {"_id": 0}).to_list(100)
        
        # Get categories usage
        expense_by_category = {}
        income_by_category = {}
        for t in transactions:
            if t['type'] == 'expense':
                expense_by_category[t['category']] = expense_by_category.get(t['category'], 0) + t['amount']
            else:
                income_by_category[t['category']] = income_by_category.get(t['category'], 0) + t['amount']
        
        context = f"""Contexto Financeiro do Usuário ({current_month}):
- Receitas Totais: R$ {total_income:.2f}
- Despesas Totais: R$ {total_expense:.2f}
- Saldo Atual: R$ {balance:.2f}
- Total de Transações: {len(transactions)}

Despesas por Categoria: {json.dumps(expense_by_category, ensure_ascii=False)}
Receitas por Categoria: {json.dumps(income_by_category, ensure_ascii=False)}
Orçamentos Definidos: {len(budgets)}"""

        # Detect user intent
        income_keywords = ['ganhei', 'recebi', 'entrou', 'salário', 'salario', 'renda', 'recebimento', 
                          'depósito', 'deposito', 'transferência recebida', 'pix recebido', 'crédito', 
                          'credito', 'freelance', 'bônus', 'bonus', 'comissão', 'comissao', 'vendi',
                          'receita', 'entrada', 'reembolso']
        
        expense_keywords = ['gastei', 'paguei', 'comprei', 'compra', 'gasto', 'despesa', 'conta', 
                           'boleto', 'parcela', 'débito', 'debito', 'saída', 'saida', 'pix enviado',
                           'transferi', 'aluguel', 'luz', 'água', 'agua', 'internet', 'supermercado',
                           'mercado', 'restaurante', 'uber', 'combustível', 'combustivel', 'gasolina']
        
        report_keywords = ['relatório', 'relatorio', 'resumo', 'analise', 'análise', 'como está', 
                          'como estão', 'situação', 'balanço', 'balanco', 'extrato', 'histórico',
                          'quanto gastei', 'quanto ganhei', 'quanto tenho', 'saldo']
        
        budget_keywords = ['orçamento', 'orcamento', 'limite', 'meta de gasto', 'definir limite',
                          'criar orçamento', 'criar orcamento', 'estabelecer limite']
        
        list_keywords = ['listar', 'mostrar', 'ver transações', 'ver gastos', 'ver receitas', 
                        'últimas transações', 'ultimas transacoes']
        
        help_keywords = ['ajuda', 'help', 'o que você pode fazer', 'comandos', 'funcionalidades']
        
        # Check for amount in message
        import re
        amount_pattern = r'(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)'
        amount_matches = re.findall(amount_pattern, content)
        has_amount = len(amount_matches) > 0
        
        is_income = any(word in content_lower for word in income_keywords)
        is_expense = any(word in content_lower for word in expense_keywords)
        is_report = any(word in content_lower for word in report_keywords)
        is_budget = any(word in content_lower for word in budget_keywords)
        is_list = any(word in content_lower for word in list_keywords)
        is_help = any(word in content_lower for word in help_keywords)
        
        ai_response = ""
        action_taken = None
        
        # HELP - Show available commands
        if is_help:
            ai_response = """🤖 **Olá! Sou o assistente financeiro do Sirius. Posso ajudar com:**

💰 **Registrar Transações:**
- "Recebi 5000 de salário"
- "Gastei 150 no supermercado"
- "Paguei 200 de luz"
- "Entrou 300 de freelance"

📊 **Relatórios e Análises:**
- "Como estão minhas finanças?"
- "Resumo do mês"
- "Quanto gastei este mês?"
- "Qual meu saldo?"

📋 **Listar Transações:**
- "Mostrar últimas transações"
- "Ver gastos do mês"
- "Listar receitas"

💡 **Dicas e Insights:**
- "Me dê dicas de economia"
- "Analise meus gastos"

📝 **Orçamentos:**
- "Criar orçamento de 500 para alimentação"
- "Definir limite de 1000 para lazer"

**Categorias disponíveis:** alimentação, transporte, moradia, saúde, educação, lazer, salário, outros"""
        
        # LIST TRANSACTIONS
        elif is_list:
            recent = transactions[-10:] if len(transactions) > 10 else transactions
            if not recent:
                ai_response = "📋 Não há transações registradas este mês."
            else:
                ai_response = "📋 **Últimas Transações:**\n\n"
                for t in reversed(recent):
                    emoji = "💚" if t['type'] == 'income' else "🔴"
                    tipo = "+" if t['type'] == 'income' else "-"
                    ai_response += f"{emoji} {t['date']} | {tipo}R$ {t['amount']:.2f} | {t['category']}"
                    if t.get('description'):
                        ai_response += f" | {t['description']}"
                    ai_response += "\n"
        
        # INCOME TRANSACTION
        elif is_income and has_amount:
            prompt = f'''Extraia os dados da RECEITA/ENTRADA financeira desta mensagem.

Mensagem: "{content}"

Responda APENAS com JSON válido:
{{"type": "income", "amount": 1000.0, "category": "salário", "description": "descrição curta"}}

Categorias para receita: salário, freelance, investimentos, vendas, reembolso, outros
Extraia o valor numérico exato. Responda SOMENTE com o JSON.'''
            
            response = await call_llm(prompt, f"income_{user.user_id}")
            
            try:
                clean_response = response.strip()
                if "```" in clean_response:
                    clean_response = clean_response.split("```")[1].replace("json", "").strip()
                start_idx = clean_response.find('{')
                end_idx = clean_response.rfind('}') + 1
                if start_idx != -1 and end_idx > start_idx:
                    transaction_data = json.loads(clean_response[start_idx:end_idx])
                    
                    if float(transaction_data.get("amount", 0)) > 0:
                        transaction_id = f"trans_{uuid.uuid4().hex[:12]}"
                        transaction_doc = {
                            "transaction_id": transaction_id,
                            "user_id": user.user_id,
                            "type": "income",
                            "amount": float(transaction_data["amount"]),
                            "category": transaction_data.get("category", "outros"),
                            "description": transaction_data.get("description", ""),
                            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                            "created_at": datetime.now(timezone.utc).isoformat()
                        }
                        await db.transactions.insert_one(transaction_doc)
                        action_taken = transaction_data
                        
                        new_balance = balance + float(transaction_data["amount"])
                        ai_response = f"""✅ **Receita Registrada!**

💰 **Valor:** R$ {float(transaction_data['amount']):.2f}
📁 **Categoria:** {transaction_data.get('category', 'outros')}
📝 **Descrição:** {transaction_data.get('description', '-')}

📊 **Novo Saldo:** R$ {new_balance:.2f}"""
            except Exception:
                ai_response = "❌ Não consegui processar a receita. Tente: 'Recebi 1000 de salário'"
        
        # EXPENSE TRANSACTION
        elif is_expense and has_amount:
            prompt = f'''Extraia os dados da DESPESA/GASTO financeiro desta mensagem.

Mensagem: "{content}"

Responda APENAS com JSON válido:
{{"type": "expense", "amount": 100.0, "category": "alimentação", "description": "descrição curta"}}

Categorias para despesa: alimentação, transporte, moradia, saúde, educação, lazer, outros
Extraia o valor numérico exato. Responda SOMENTE com o JSON.'''
            
            response = await call_llm(prompt, f"expense_{user.user_id}")
            
            try:
                clean_response = response.strip()
                if "```" in clean_response:
                    clean_response = clean_response.split("```")[1].replace("json", "").strip()
                start_idx = clean_response.find('{')
                end_idx = clean_response.rfind('}') + 1
                if start_idx != -1 and end_idx > start_idx:
                    transaction_data = json.loads(clean_response[start_idx:end_idx])
                    
                    if float(transaction_data.get("amount", 0)) > 0:
                        transaction_id = f"trans_{uuid.uuid4().hex[:12]}"
                        transaction_doc = {
                            "transaction_id": transaction_id,
                            "user_id": user.user_id,
                            "type": "expense",
                            "amount": float(transaction_data["amount"]),
                            "category": transaction_data.get("category", "outros"),
                            "description": transaction_data.get("description", ""),
                            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                            "created_at": datetime.now(timezone.utc).isoformat()
                        }
                        await db.transactions.insert_one(transaction_doc)
                        action_taken = transaction_data
                        
                        # Check budget
                        cat = transaction_data.get("category", "outros")
                        budget_alert = ""
                        for b in budgets:
                            if b['category'] == cat:
                                new_spent = expense_by_category.get(cat, 0) + float(transaction_data["amount"])
                                pct = (new_spent / b['limit']) * 100
                                if pct >= 100:
                                    budget_alert = f"\n\n⚠️ **ALERTA:** Orçamento de {cat} estourado! ({pct:.0f}%)"
                                elif pct >= 80:
                                    budget_alert = f"\n\n⚠️ **Atenção:** {pct:.0f}% do orçamento de {cat} usado"
                        
                        new_balance = balance - float(transaction_data["amount"])
                        ai_response = f"""✅ **Despesa Registrada!**

🔴 **Valor:** R$ {float(transaction_data['amount']):.2f}
📁 **Categoria:** {transaction_data.get('category', 'outros')}
📝 **Descrição:** {transaction_data.get('description', '-')}

📊 **Novo Saldo:** R$ {new_balance:.2f}{budget_alert}"""
            except Exception:
                ai_response = "❌ Não consegui processar a despesa. Tente: 'Gastei 50 no mercado'"
        
        # CREATE BUDGET
        elif is_budget and has_amount:
            prompt = f'''Extraia os dados do orçamento desta mensagem.

Mensagem: "{content}"

Responda APENAS com JSON válido:
{{"category": "alimentação", "limit": 500.0}}

Categorias: alimentação, transporte, moradia, saúde, educação, lazer, outros
Responda SOMENTE com o JSON.'''
            
            response = await call_llm(prompt, f"budget_{user.user_id}")
            
            try:
                clean_response = response.strip()
                if "```" in clean_response:
                    clean_response = clean_response.split("```")[1].replace("json", "").strip()
                start_idx = clean_response.find('{')
                end_idx = clean_response.rfind('}') + 1
                if start_idx != -1 and end_idx > start_idx:
                    budget_data = json.loads(clean_response[start_idx:end_idx])
                    
                    # Check if budget exists
                    existing = await db.budgets.find_one({
                        "user_id": user.user_id, 
                        "category": budget_data['category'], 
                        "month": current_month
                    })
                    
                    if existing:
                        await db.budgets.update_one(
                            {"budget_id": existing['budget_id']},
                            {"$set": {"limit": float(budget_data['limit'])}}
                        )
                        ai_response = f"""✅ **Orçamento Atualizado!**

📁 **Categoria:** {budget_data['category']}
💰 **Novo Limite:** R$ {float(budget_data['limit']):.2f}
📅 **Mês:** {current_month}"""
                    else:
                        budget_id = f"budget_{uuid.uuid4().hex[:12]}"
                        budget_doc = {
                            "budget_id": budget_id,
                            "user_id": user.user_id,
                            "category": budget_data['category'],
                            "limit": float(budget_data['limit']),
                            "spent": expense_by_category.get(budget_data['category'], 0),
                            "month": current_month,
                            "created_at": datetime.now(timezone.utc).isoformat()
                        }
                        await db.budgets.insert_one(budget_doc)
                        ai_response = f"""✅ **Orçamento Criado!**

📁 **Categoria:** {budget_data['category']}
💰 **Limite:** R$ {float(budget_data['limit']):.2f}
📅 **Mês:** {current_month}"""
            except Exception:
                ai_response = "❌ Não consegui criar o orçamento. Tente: 'Criar orçamento de 500 para alimentação'"
        
        # REPORT / ANALYSIS
        elif is_report:
            # Generate detailed report
            top_expenses = sorted(expense_by_category.items(), key=lambda x: x[1], reverse=True)[:5]
            top_income = sorted(income_by_category.items(), key=lambda x: x[1], reverse=True)[:3]
            
            budget_status = ""
            for b in budgets:
                pct = (b['spent'] / b['limit']) * 100 if b['limit'] > 0 else 0
                status = "🔴 Estourado" if pct >= 100 else "🟡 Atenção" if pct >= 80 else "🟢 OK"
                budget_status += f"- {b['category']}: R$ {b['spent']:.2f} / R$ {b['limit']:.2f} ({pct:.0f}%) {status}\n"
            
            ai_response = f"""📊 **RELATÓRIO FINANCEIRO - {current_month}**

💰 **Resumo:**
- Receitas: R$ {total_income:.2f}
- Despesas: R$ {total_expense:.2f}
- **Saldo: R$ {balance:.2f}** {"✅" if balance >= 0 else "⚠️"}

📈 **Maiores Receitas:**
"""
            for cat, val in top_income:
                ai_response += f"- {cat}: R$ {val:.2f}\n"
            
            ai_response += "\n📉 **Maiores Despesas:**\n"
            for cat, val in top_expenses:
                ai_response += f"- {cat}: R$ {val:.2f}\n"
            
            if budget_status:
                ai_response += f"\n📋 **Status dos Orçamentos:**\n{budget_status}"
            
            # Add AI insights
            prompt = f"""Baseado nestes dados financeiros, dê 2-3 insights curtos e práticos:
{context}

Seja direto e objetivo. Foque em dicas acionáveis."""
            
            try:
                insights = await call_llm(prompt, f"insights_{user.user_id}")
                ai_response += f"\n💡 **Insights:**\n{insights}"
            except Exception:
                pass
        
        # GENERAL CONVERSATION - Use AI
        else:
            prompt = f"""Você é o assistente financeiro inteligente do Sirius. Ajude o usuário com finanças pessoais.

{context}

Mensagem do usuário: "{content}"

Responda de forma útil, amigável e em português. Se o usuário parecer querer registrar uma transação mas não ficou claro, pergunte os detalhes. Se for uma pergunta sobre finanças, responda com base no contexto. Se for uma saudação, seja amigável e ofereça ajuda.

Mantenha a resposta concisa (máximo 3-4 parágrafos)."""
            
            ai_response = await call_llm(prompt, f"chat_{user.user_id}")
        
        ai_message_id = f"msg_{uuid.uuid4().hex[:12]}"
        ai_message = {
            "message_id": ai_message_id,
            "user_id": user.user_id,
            "role": "assistant",
            "content": ai_response,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if action_taken:
            ai_message["transaction_data"] = action_taken
        
        await db.chat_messages.insert_one(ai_message.copy())
        
        user_message['created_at'] = datetime.fromisoformat(user_message['created_at'])
        ai_message['created_at'] = datetime.fromisoformat(ai_message['created_at'])
        
        return {"user_message": user_message, "ai_message": ai_message}
    except Exception as e:
        logging.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/reports")
async def get_reports(request: Request, type: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    query = {"user_id": user.user_id}
    if type:
        query["type"] = type
    
    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for report in reports:
        if isinstance(report['created_at'], str):
            report['created_at'] = datetime.fromisoformat(report['created_at'])
    return reports

@api_router.post("/reports/generate")
async def generate_report(request: Request, report_type: str, period: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    tasks = await db.tasks.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    habits = await db.habits.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    transactions = await db.transactions.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    goals = await db.goals.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    
    data = {
        "tasks": len(tasks),
        "tasks_completed": len([t for t in tasks if t['completed']]),
        "habits": len(habits),
        "total_habits_completions": sum([len(h['completions']) for h in habits]),
        "income": sum([t['amount'] for t in transactions if t['type'] == 'income']),
        "expenses": sum([t['amount'] for t in transactions if t['type'] == 'expense']),
        "goals": len(goals),
        "goals_progress": sum([g['progress'] for g in goals]) / len(goals) if goals else 0
    }
    
    try:
        prompt = f"""Você é um analista de produtividade e finanças. Gere um relatório {report_type} para o período {period} baseado nos seguintes dados:

Tarefas: {data['tasks']} total, {data['tasks_completed']} concluídas
Hábitos: {data['habits']} total, {data['total_habits_completions']} completações
Receitas: R$ {data['income']:.2f}
Despesas: R$ {data['expenses']:.2f}
Metas: {data['goals']} total, {data['goals_progress']:.1f}% progresso médio

Forneça insights, padrões identificados e sugestões de otimização em português."""
        
        # Use Emergent LLM API
        insights = await call_llm(prompt, f"report_{user.user_id}")
        
        report_id = f"report_{uuid.uuid4().hex[:12]}"
        report_doc = {
            "report_id": report_id,
            "user_id": user.user_id,
            "type": report_type,
            "period": period,
            "data": data,
            "insights": insights,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.reports.insert_one(report_doc)
        report_doc['created_at'] = datetime.fromisoformat(report_doc['created_at'])
        
        return Report(**report_doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(request: Request, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    tasks_today = await db.tasks.count_documents({"user_id": user.user_id, "date": today})
    tasks_completed_today = await db.tasks.count_documents({"user_id": user.user_id, "date": today, "completed": True})
    
    habits = await db.habits.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    habits_completed_today = len([h for h in habits if today in h['completions']])
    
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    transactions = await db.transactions.find({"user_id": user.user_id, "date": {"$regex": f"^{current_month}"}}, {"_id": 0}).to_list(1000)
    income = sum([t['amount'] for t in transactions if t['type'] == 'income'])
    expenses = sum([t['amount'] for t in transactions if t['type'] == 'expense'])
    
    goals = await db.goals.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    avg_progress = sum([len(g.get('daily_checks', [])) for g in goals]) / len(goals) if goals else 0
    
    return {
        "user": {"name": user.name, "xp": user.xp, "rank": user.rank, "picture": user.picture},
        "tasks_today": tasks_today,
        "tasks_completed_today": tasks_completed_today,
        "habits_total": len(habits),
        "habits_completed_today": habits_completed_today,
        "income": income,
        "expenses": expenses,
        "balance": income - expenses,
        "goals_total": len(goals),
        "goals_avg_progress": avg_progress
    }

@api_router.post("/goals/{goal_id}/check")
async def check_goal_day(request: Request, goal_id: str, date: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    goal = await db.goals.find_one({"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    daily_checks = goal.get('daily_checks', [])
    was_checked = date in daily_checks
    
    if was_checked:
        daily_checks.remove(date)
        xp_change = -5
        new_xp = max(0, user.xp + xp_change)
        new_rank = calculate_rank(new_xp)
        await db.users.update_one({"user_id": user.user_id}, {"$set": {"xp": new_xp, "rank": new_rank}})
    else:
        daily_checks.append(date)
        xp_change = 5
        new_xp = user.xp + xp_change
        new_rank = calculate_rank(new_xp)
        await db.users.update_one({"user_id": user.user_id}, {"$set": {"xp": new_xp, "rank": new_rank}})
    
    await db.goals.update_one(
        {"goal_id": goal_id},
        {"$set": {"daily_checks": daily_checks}}
    )
    
    if xp_change > 0:
        return {"message": "Day checked", "xp_earned": xp_change, "new_xp": user.xp + xp_change}
    else:
        return {"message": "Day unchecked", "xp_earned": xp_change, "new_xp": user.xp + xp_change}

@api_router.get("/challenges/current")
async def get_current_challenges(request: Request, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    today = datetime.now(timezone.utc).date()
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    
    challenges = await db.challenges.find({"week_start": week_start}, {"_id": 0}).to_list(100)
    
    if len(challenges) == 0:
        default_challenges = [
            {
                "challenge_id": f"chal_{uuid.uuid4().hex[:12]}",
                "title": "Mestre das Tarefas",
                "description": "Complete 10 tarefas esta semana",
                "xp_reward": 100,
                "week_start": week_start,
                "week_end": (today + timedelta(days=7-today.weekday())).isoformat(),
                "completed_by": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "challenge_id": f"chal_{uuid.uuid4().hex[:12]}",
                "title": "Guardião dos Hábitos",
                "description": "Mantenha 5 dias de streak em qualquer hábito",
                "xp_reward": 150,
                "week_start": week_start,
                "week_end": (today + timedelta(days=7-today.weekday())).isoformat(),
                "completed_by": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "challenge_id": f"chal_{uuid.uuid4().hex[:12]}",
                "title": "Controlador Financeiro",
                "description": "Registre todas as transações diárias por 5 dias",
                "xp_reward": 200,
                "week_start": week_start,
                "week_end": (today + timedelta(days=7-today.weekday())).isoformat(),
                "completed_by": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.challenges.insert_many(default_challenges)
        challenges = default_challenges
    
    for challenge in challenges:
        if isinstance(challenge['created_at'], str):
            challenge['created_at'] = datetime.fromisoformat(challenge['created_at'])
        challenge['completed'] = user.user_id in challenge.get('completed_by', [])
    
    return challenges

@api_router.post("/challenges/{challenge_id}/complete")
async def complete_challenge(request: Request, challenge_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    challenge = await db.challenges.find_one({"challenge_id": challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if user.user_id in challenge.get('completed_by', []):
        raise HTTPException(status_code=400, detail="Challenge already completed")
    
    await db.challenges.update_one(
        {"challenge_id": challenge_id},
        {"$push": {"completed_by": user.user_id}}
    )
    
    new_xp = user.xp + challenge['xp_reward']
    new_rank = calculate_rank(new_xp)
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"xp": new_xp, "rank": new_rank}})
    
    achievement_id = f"ach_{uuid.uuid4().hex[:12]}"
    achievement_doc = {
        "achievement_id": achievement_id,
        "user_id": user.user_id,
        "title": challenge['title'],
        "description": challenge['description'],
        "icon": "trophy",
        "unlocked_at": datetime.now(timezone.utc).isoformat()
    }
    await db.achievements.insert_one(achievement_doc)
    
    return {"message": "Challenge completed", "xp_earned": challenge['xp_reward'], "new_xp": new_xp, "new_rank": new_rank}

@api_router.get("/notifications")
async def get_notifications(request: Request, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    notifications = []
    
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    budgets = await db.budgets.find({"user_id": user.user_id, "month": current_month}, {"_id": 0}).to_list(100)
    
    for budget in budgets:
        percentage = (budget['spent'] / budget['limit']) * 100
        if percentage >= 90:
            notifications.append({
                "type": "budget_alert",
                "severity": "high" if percentage >= 100 else "warning",
                "title": "Orçamento Estourado" if percentage >= 100 else "Orçamento Quase Estourado",
                "message": f"Categoria {budget['category']}: {percentage:.0f}% do orçamento usado",
                "data": budget
            })
    
    habits = await db.habits.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for habit in habits:
        if today not in habit['completions'] and habit['streak'] > 0:
            notifications.append({
                "type": "habit_reminder",
                "severity": "info",
                "title": "Hábito Pendente",
                "message": f"{habit['name']}: Não esqueça de marcar hoje! Streak: {habit['streak']} dias",
                "data": habit
            })
    
    return notifications

def calculate_rank(xp: int) -> str:
    ranks = [
        (0, "Recruta"),
        (100, "Soldado"),
        (300, "Cabo"),
        (600, "Sargento"),
        (1000, "Tenente"),
        (1500, "Capitão"),
        (2200, "Major"),
        (3000, "Coronel"),
        (4000, "General")
    ]
    for threshold, rank in reversed(ranks):
        if xp >= threshold:
            return rank
    return "Recruta"

def calculate_streak(completions: List[str]) -> int:
    if not completions:
        return 0
    
    today = datetime.now(timezone.utc).date()
    completions_dates = [datetime.fromisoformat(d).date() for d in completions]
    completions_dates.sort(reverse=True)
    
    if completions_dates[0] != today and completions_dates[0] != today - timedelta(days=1):
        return 0
    
    streak = 1
    for i in range(len(completions_dates) - 1):
        if completions_dates[i] - completions_dates[i+1] == timedelta(days=1):
            streak += 1
        else:
            break
    return streak

@api_router.get("/finance/stats")
async def get_finance_stats(request: Request, month: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    transactions = await db.transactions.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{month}"}},
        {"_id": 0}
    ).to_list(1000)
    
    categories_expense = {}
    categories_income = {}
    
    for t in transactions:
        if t['type'] == 'expense':
            categories_expense[t['category']] = categories_expense.get(t['category'], 0) + t['amount']
        else:
            categories_income[t['category']] = categories_income.get(t['category'], 0) + t['amount']
    
    return {
        "expense_by_category": categories_expense,
        "income_by_category": categories_income,
        "total_expense": sum(categories_expense.values()),
        "total_income": sum(categories_income.values())
    }

@api_router.get("/reports/{report_id}/download")
async def download_report(report_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    from fastapi.responses import StreamingResponse
    import io
    
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    report = await db.reports.find_one({"report_id": report_id, "user_id": user.user_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    content = f"""SIRIUS - RELATÓRIO {report['type'].upper()}
Período: {report['period']}
Gerado em: {report['created_at']}

{'='*60}
DADOS DO PERÍODO
{'='*60}

Tarefas: {report['data']['tasks_completed']}/{report['data']['tasks']}
Hábitos: {report['data']['total_habits_completions']} completações
Receitas: R$ {report['data']['income']:.2f}
Despesas: R$ {report['data']['expenses']:.2f}
Metas: {report['data']['goals']} total
Progresso Médio: {report['data']['goals_progress']:.1f}%

{'='*60}
INSIGHTS E SUGESTÕES
{'='*60}

{report['insights']}
"""
    
    buffer = io.BytesIO(content.encode('utf-8'))
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=sirius_relatorio_{report_id}.txt"}
    )

class CreditCard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    card_id: str
    user_id: str
    name: str
    limit: float
    closing_day: int
    due_day: int
    created_at: datetime

class CreditCardCreate(BaseModel):
    name: str
    limit: float
    closing_day: int
    due_day: int

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    invoice_id: str
    card_id: str
    user_id: str
    month: str
    amount: float
    paid: bool = False
    created_at: datetime

class Projection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    projection_id: str
    user_id: str
    month: str
    description: str
    amount: float
    category: str
    projection_type: str  # "fixed", "installment", "manual"
    is_fixed: bool = False  # Despesa fixa que se repete todo mês
    repeat_count: Optional[int] = None  # Número de vezes que se repete (se não for fixa)
    remaining_repeats: Optional[int] = None  # Repetições restantes
    source_transaction_id: Optional[str] = None  # ID da transação original (para parcelas)
    installment_number: Optional[int] = None  # Número da parcela atual
    total_installments: Optional[int] = None  # Total de parcelas
    card_id: Optional[str] = None  # Cartão associado (se aplicável)
    created_at: datetime

class ProjectionCreate(BaseModel):
    description: str
    amount: float
    category: str
    month: str
    is_fixed: bool = False
    repeat_count: Optional[int] = None

class CardChargeRequest(BaseModel):
    amount: float
    description: str
    category: str
    payment_type: str = "vista"  # "vista" ou "parcelado"
    installments: Optional[int] = 1  # Número de parcelas
    start_month: str = "current"  # "current" ou "next" - quando começa a primeira parcela

@api_router.get("/credit-cards")
async def get_credit_cards(request: Request, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    cards = await db.credit_cards.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    for card in cards:
        if isinstance(card['created_at'], str):
            card['created_at'] = datetime.fromisoformat(card['created_at'])
    return cards

@api_router.post("/credit-cards")
async def create_credit_card(request: Request, card_data: CreditCardCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    card_id = f"card_{uuid.uuid4().hex[:12]}"
    card_doc = {
        "card_id": card_id,
        "user_id": user.user_id,
        "name": card_data.name,
        "limit": card_data.limit,
        "closing_day": card_data.closing_day,
        "due_day": card_data.due_day,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.credit_cards.insert_one(card_doc)
    card_doc['created_at'] = datetime.fromisoformat(card_doc['created_at'])
    return CreditCard(**card_doc)

@api_router.get("/credit-cards/{card_id}/invoices")
async def get_card_invoices(request: Request, card_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    invoices = await db.invoices.find({"card_id": card_id, "user_id": user.user_id}, {"_id": 0}).to_list(100)
    for invoice in invoices:
        if isinstance(invoice['created_at'], str):
            invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    return invoices

@api_router.post("/credit-cards/{card_id}/charge")
async def charge_to_card(request: Request, card_id: str, charge_data: CardChargeRequest, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    card = await db.credit_cards.find_one({"card_id": card_id, "user_id": user.user_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    amount = charge_data.amount
    description = charge_data.description
    category = charge_data.category
    payment_type = charge_data.payment_type
    installments = charge_data.installments or 1
    start_month = charge_data.start_month  # "current" ou "next"
    
    if payment_type == "parcelado" and installments < 2:
        installments = 2  # Mínimo de 2 parcelas para parcelamento
    
    # Calcular valor da parcela
    installment_amount = amount / installments if payment_type == "parcelado" else amount
    
    # Determinar o mês de início baseado na escolha do usuário
    current_date = datetime.now(timezone.utc)
    if start_month == "next":
        # Primeira parcela no próximo mês
        first_month_date = current_date + timedelta(days=30)
        first_month = first_month_date.strftime("%Y-%m")
        transaction_date = first_month_date.strftime("%Y-%m-%d")
    else:
        # Primeira parcela no mês atual
        first_month = current_date.strftime("%Y-%m")
        transaction_date = current_date.strftime("%Y-%m-%d")
    
    transaction_id = f"trans_{uuid.uuid4().hex[:12]}"
    transaction_doc = {
        "transaction_id": transaction_id,
        "user_id": user.user_id,
        "type": "expense",
        "amount": installment_amount,  # Primeira parcela ou valor à vista
        "total_amount": amount,  # Valor total da compra
        "category": category,
        "description": f"{description} (Cartão: {card['name']})" + (f" - Parcela 1/{installments}" if payment_type == "parcelado" else ""),
        "date": transaction_date,
        "card_id": card_id,
        "payment_type": payment_type,
        "installments": installments,
        "installment_number": 1,
        "start_month": start_month,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Se for para o próximo mês, criar como projeção ao invés de transação
    if start_month == "next":
        # Criar projeção para primeira parcela
        projection_id = f"proj_{uuid.uuid4().hex[:12]}"
        projection_doc = {
            "projection_id": projection_id,
            "user_id": user.user_id,
            "month": first_month,
            "description": f"{description} (Cartão: {card['name']})" + (f" - Parcela 1/{installments}" if payment_type == "parcelado" else ""),
            "amount": installment_amount,
            "category": category,
            "projection_type": "installment",
            "is_fixed": False,
            "repeat_count": None,
            "remaining_repeats": None,
            "source_transaction_id": transaction_id,
            "installment_number": 1,
            "total_installments": installments,
            "card_id": card_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.projections.insert_one(projection_doc)
    else:
        # Mês atual - criar transação normalmente
        await db.transactions.insert_one(transaction_doc)
    
    # Atualizar fatura do mês correspondente
    invoice = await db.invoices.find_one({"card_id": card_id, "month": first_month}, {"_id": 0})
    
    if not invoice:
        invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
        invoice_doc = {
            "invoice_id": invoice_id,
            "card_id": card_id,
            "user_id": user.user_id,
            "month": first_month,
            "amount": installment_amount,
            "paid": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.invoices.insert_one(invoice_doc)
    else:
        new_amount = invoice['amount'] + installment_amount
        await db.invoices.update_one(
            {"invoice_id": invoice['invoice_id']},
            {"$set": {"amount": new_amount}}
        )
    
    # Se for parcelado, criar projeções para os meses seguintes
    if payment_type == "parcelado" and installments > 1:
        # Determinar data base para cálculo dos meses seguintes
        base_date = first_month_date if start_month == "next" else current_date
        
        for i in range(2, installments + 1):  # Começar da parcela 2
            # Calcular mês da parcela
            future_date = base_date + timedelta(days=30 * (i - 1))
            future_month = future_date.strftime("%Y-%m")
            
            projection_id = f"proj_{uuid.uuid4().hex[:12]}"
            projection_doc = {
                "projection_id": projection_id,
                "user_id": user.user_id,
                "month": future_month,
                "description": f"{description} (Cartão: {card['name']}) - Parcela {i}/{installments}",
                "amount": installment_amount,
                "category": category,
                "projection_type": "installment",
                "is_fixed": False,
                "repeat_count": None,
                "remaining_repeats": None,
                "source_transaction_id": transaction_id,
                "installment_number": i,
                "total_installments": installments,
                "card_id": card_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.projections.insert_one(projection_doc)
    
    return {
        "message": "Charged to card", 
        "transaction_id": transaction_id,
        "installment_amount": installment_amount,
        "total_amount": amount,
        "installments": installments
    }

@api_router.patch("/invoices/{invoice_id}/pay")
async def pay_invoice(request: Request, invoice_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "user_id": user.user_id},
        {"$set": {"paid": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice paid"}

# ========== PROJECTION ENDPOINTS ==========

@api_router.get("/projections")
async def get_projections(request: Request, month: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    if not month:
        # Próximo mês por padrão
        next_month = datetime.now(timezone.utc) + timedelta(days=30)
        month = next_month.strftime("%Y-%m")
    
    projections = await db.projections.find(
        {"user_id": user.user_id, "month": month},
        {"_id": 0}
    ).to_list(1000)
    
    for proj in projections:
        if isinstance(proj['created_at'], str):
            proj['created_at'] = datetime.fromisoformat(proj['created_at'])
    
    return projections

@api_router.post("/projections")
async def create_projection(request: Request, projection_data: ProjectionCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    projection_id = f"proj_{uuid.uuid4().hex[:12]}"
    projection_doc = {
        "projection_id": projection_id,
        "user_id": user.user_id,
        "month": projection_data.month,
        "description": projection_data.description,
        "amount": projection_data.amount,
        "category": projection_data.category,
        "projection_type": "manual",
        "is_fixed": projection_data.is_fixed,
        "repeat_count": projection_data.repeat_count if not projection_data.is_fixed else None,
        "remaining_repeats": projection_data.repeat_count if not projection_data.is_fixed else None,
        "source_transaction_id": None,
        "installment_number": None,
        "total_installments": None,
        "card_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.projections.insert_one(projection_doc)
    
    # Se for despesa fixa ou com repetições, criar projeções para meses futuros
    if projection_data.is_fixed or (projection_data.repeat_count and projection_data.repeat_count > 1):
        base_date = datetime.strptime(projection_data.month + "-01", "%Y-%m-%d")
        repeat_times = 12 if projection_data.is_fixed else (projection_data.repeat_count - 1)
        
        for i in range(1, repeat_times + 1):
            future_date = base_date + timedelta(days=30 * i)
            future_month = future_date.strftime("%Y-%m")
            
            future_proj_id = f"proj_{uuid.uuid4().hex[:12]}"
            future_proj_doc = {
                "projection_id": future_proj_id,
                "user_id": user.user_id,
                "month": future_month,
                "description": projection_data.description,
                "amount": projection_data.amount,
                "category": projection_data.category,
                "projection_type": "manual",
                "is_fixed": projection_data.is_fixed,
                "repeat_count": projection_data.repeat_count,
                "remaining_repeats": (projection_data.repeat_count - i - 1) if projection_data.repeat_count else None,
                "source_transaction_id": None,
                "installment_number": i + 1 if projection_data.repeat_count else None,
                "total_installments": projection_data.repeat_count,
                "card_id": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.projections.insert_one(future_proj_doc)
    
    projection_doc['created_at'] = datetime.fromisoformat(projection_doc['created_at'])
    return Projection(**projection_doc)

@api_router.patch("/projections/{projection_id}")
async def update_projection(request: Request, projection_id: str, amount: Optional[float] = None, description: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    update_data = {}
    if amount is not None:
        update_data["amount"] = amount
    if description is not None:
        update_data["description"] = description
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.projections.update_one(
        {"projection_id": projection_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Projection not found")
    
    return {"message": "Projection updated"}

@api_router.delete("/projections/{projection_id}")
async def delete_projection(request: Request, projection_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    result = await db.projections.delete_one({"projection_id": projection_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Projection not found")
    return {"message": "Projection deleted"}

@api_router.get("/projections/summary")
async def get_projection_summary(request: Request, month: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    if not month:
        next_month = datetime.now(timezone.utc) + timedelta(days=30)
        month = next_month.strftime("%Y-%m")
    
    # Buscar projeções do mês
    projections = await db.projections.find(
        {"user_id": user.user_id, "month": month},
        {"_id": 0}
    ).to_list(1000)
    
    # Calcular totais por categoria
    categories_totals = {}
    total_projected = 0
    fixed_expenses = 0
    installment_expenses = 0
    manual_expenses = 0
    
    for proj in projections:
        cat = proj.get('category', 'outros')
        amount = proj.get('amount', 0)
        proj_type = proj.get('projection_type', 'manual')
        
        categories_totals[cat] = categories_totals.get(cat, 0) + amount
        total_projected += amount
        
        if proj.get('is_fixed'):
            fixed_expenses += amount
        elif proj_type == 'installment':
            installment_expenses += amount
        else:
            manual_expenses += amount
    
    # Buscar receitas recorrentes (estimativa baseada no mês atual)
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    current_income = await db.transactions.find(
        {"user_id": user.user_id, "type": "income", "date": {"$regex": f"^{current_month}"}},
        {"_id": 0}
    ).to_list(1000)
    estimated_income = sum([t['amount'] for t in current_income])
    
    return {
        "month": month,
        "total_projected_expenses": total_projected,
        "fixed_expenses": fixed_expenses,
        "installment_expenses": installment_expenses,
        "manual_expenses": manual_expenses,
        "categories_totals": categories_totals,
        "estimated_income": estimated_income,
        "estimated_balance": estimated_income - total_projected,
        "projections_count": len(projections)
    }

@api_router.post("/projections/insights")
async def get_projection_insights(request: Request, month: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    if not month:
        next_month = datetime.now(timezone.utc) + timedelta(days=30)
        month = next_month.strftime("%Y-%m")
    
    # Buscar resumo das projeções
    projections = await db.projections.find(
        {"user_id": user.user_id, "month": month},
        {"_id": 0}
    ).to_list(1000)
    
    total_projected = sum([p.get('amount', 0) for p in projections])
    
    # Buscar receitas do mês atual como base
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    current_transactions = await db.transactions.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{current_month}"}},
        {"_id": 0}
    ).to_list(1000)
    
    estimated_income = sum([t['amount'] for t in current_transactions if t['type'] == 'income'])
    
    # Categorias com maiores gastos
    categories = {}
    for p in projections:
        cat = p.get('category', 'outros')
        categories[cat] = categories.get(cat, 0) + p.get('amount', 0)
    
    top_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:3]
    
    prompt = f"""Você é um consultor financeiro pessoal. Analise a projeção de gastos para {month} e forneça insights e sugestões práticas.

Dados da Projeção:
- Receita Estimada: R$ {estimated_income:.2f}
- Total de Despesas Projetadas: R$ {total_projected:.2f}
- Saldo Estimado: R$ {estimated_income - total_projected:.2f}
- Número de Despesas Projetadas: {len(projections)}

Maiores Categorias de Gastos:
{chr(10).join([f"- {cat}: R$ {val:.2f}" for cat, val in top_categories])}

Despesas Parceladas: {len([p for p in projections if p.get('projection_type') == 'installment'])}
Despesas Fixas: {len([p for p in projections if p.get('is_fixed')])}

Forneça:
1. Uma análise do cenário financeiro projetado
2. Alertas se houver risco de saldo negativo
3. Sugestões de economia específicas para as maiores categorias
4. Dicas para melhorar a saúde financeira

Responda em português, de forma objetiva e prática."""
    
    try:
        insights = await call_llm(prompt, f"projection_insights_{user.user_id}")
        
        return {
            "month": month,
            "insights": insights,
            "summary": {
                "estimated_income": estimated_income,
                "total_projected": total_projected,
                "estimated_balance": estimated_income - total_projected,
                "top_categories": top_categories
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========== WORKOUT ENDPOINTS ==========
@api_router.get("/workout-plans")
async def get_workout_plans(request: Request, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    plans = await db.workout_plans.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    for plan in plans:
        if isinstance(plan['created_at'], str):
            plan['created_at'] = datetime.fromisoformat(plan['created_at'])
    return plans

@api_router.post("/workout-plans")
async def create_workout_plan(request: Request, plan_data: WorkoutPlanCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    plan_id = f"plan_{uuid.uuid4().hex[:12]}"
    plan_doc = {
        "plan_id": plan_id,
        "user_id": user.user_id,
        "name": plan_data.name,
        "description": plan_data.description,
        "exercises": plan_data.exercises,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.workout_plans.insert_one(plan_doc)
    plan_doc['created_at'] = datetime.fromisoformat(plan_doc['created_at'])
    return WorkoutPlan(**plan_doc)

@api_router.patch("/workout-plans/{plan_id}")
async def update_workout_plan(request: Request, plan_id: str, plan_data: WorkoutPlanCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    update_data = {
        "name": plan_data.name,
        "description": plan_data.description,
        "exercises": plan_data.exercises
    }
    
    result = await db.workout_plans.update_one(
        {"plan_id": plan_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return {"message": "Workout plan updated"}

@api_router.delete("/workout-plans/{plan_id}")
async def delete_workout_plan(request: Request, plan_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    result = await db.workout_plans.delete_one({"plan_id": plan_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return {"message": "Workout plan deleted"}

@api_router.get("/workouts")
async def get_workouts(request: Request, date: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    query = {"user_id": user.user_id}
    if date:
        query["date"] = date
    
    workouts = await db.workout_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for workout in workouts:
        if isinstance(workout['created_at'], str):
            workout['created_at'] = datetime.fromisoformat(workout['created_at'])
    return workouts

@api_router.post("/workouts")
async def log_workout(request: Request, workout_data: WorkoutLogCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    # Calcular XP baseado no tipo de atividade e duração
    base_xp = 20
    duration_bonus = (workout_data.duration_minutes // 15) * 5  # +5 XP a cada 15 min
    xp_earned = base_xp + duration_bonus
    
    log_id = f"workout_{uuid.uuid4().hex[:12]}"
    workout_doc = {
        "log_id": log_id,
        "user_id": user.user_id,
        "plan_id": workout_data.plan_id,
        "activity_type": workout_data.activity_type,
        "name": workout_data.name,
        "duration_minutes": workout_data.duration_minutes,
        "distance_km": workout_data.distance_km,
        "calories": workout_data.calories,
        "exercises_completed": workout_data.exercises_completed,
        "notes": workout_data.notes,
        "xp_earned": xp_earned,
        "completed": True,
        "date": workout_data.date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.workout_logs.insert_one(workout_doc)
    
    # Award XP to user
    new_xp = user.xp + xp_earned
    new_rank = calculate_rank(new_xp)
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"xp": new_xp, "rank": new_rank}})
    
    workout_doc['created_at'] = datetime.fromisoformat(workout_doc['created_at'])
    return {**workout_doc, "new_xp": new_xp, "new_rank": new_rank}

@api_router.patch("/workouts/{log_id}/toggle")
async def toggle_workout(request: Request, log_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    workout = await db.workout_logs.find_one({"log_id": log_id, "user_id": user.user_id}, {"_id": 0})
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    new_completed = not workout['completed']
    xp_change = workout['xp_earned'] if new_completed else -workout['xp_earned']
    
    await db.workout_logs.update_one(
        {"log_id": log_id},
        {"$set": {"completed": new_completed}}
    )
    
    # Update user XP
    new_xp = max(0, user.xp + xp_change)
    new_rank = calculate_rank(new_xp)
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"xp": new_xp, "rank": new_rank}})
    
    return {
        "message": "Workout toggled",
        "completed": new_completed,
        "xp_change": xp_change,
        "new_xp": new_xp,
        "new_rank": new_rank
    }

@api_router.delete("/workouts/{log_id}")
async def delete_workout(request: Request, log_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    workout = await db.workout_logs.find_one({"log_id": log_id, "user_id": user.user_id}, {"_id": 0})
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    # Deduct XP if was completed
    if workout['completed']:
        new_xp = max(0, user.xp - workout['xp_earned'])
        new_rank = calculate_rank(new_xp)
        await db.users.update_one({"user_id": user.user_id}, {"$set": {"xp": new_xp, "rank": new_rank}})
    
    await db.workout_logs.delete_one({"log_id": log_id})
    return {"message": "Workout deleted"}

@api_router.get("/workout-stats")
async def get_workout_stats(request: Request, period: str = "week", session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    # Calculate date range
    today = datetime.now(timezone.utc)
    if period == "week":
        start_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
    elif period == "month":
        start_date = (today - timedelta(days=30)).strftime("%Y-%m-%d")
    else:
        start_date = (today - timedelta(days=365)).strftime("%Y-%m-%d")
    
    workouts = await db.workout_logs.find({
        "user_id": user.user_id,
        "date": {"$gte": start_date},
        "completed": True
    }, {"_id": 0}).to_list(1000)
    
    total_workouts = len(workouts)
    total_duration = sum([w.get('duration_minutes', 0) for w in workouts])
    total_distance = sum([w.get('distance_km', 0) or 0 for w in workouts])
    total_calories = sum([w.get('calories', 0) or 0 for w in workouts])
    total_xp = sum([w.get('xp_earned', 0) for w in workouts])
    
    # Count by activity type
    by_type = {}
    for w in workouts:
        t = w['activity_type']
        by_type[t] = by_type.get(t, 0) + 1
    
    return {
        "period": period,
        "total_workouts": total_workouts,
        "total_duration_minutes": total_duration,
        "total_distance_km": round(total_distance, 2),
        "total_calories": total_calories,
        "total_xp_earned": total_xp,
        "by_activity_type": by_type
    }

# ========== NOTIFICATION ENDPOINTS ==========
@api_router.get("/notifications")
async def get_notifications(request: Request, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    notifications = await db.notifications.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    for notif in notifications:
        if isinstance(notif['created_at'], str):
            notif['created_at'] = datetime.fromisoformat(notif['created_at'])
    return notifications

@api_router.post("/notifications")
async def create_notification(request: Request, notif_data: NotificationCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    notification_id = f"notif_{uuid.uuid4().hex[:12]}"
    notification_doc = {
        "notification_id": notification_id,
        "user_id": user.user_id,
        "title": notif_data.title,
        "message": notif_data.message,
        "type": notif_data.type,
        "category": notif_data.category,
        "scheduled_time": notif_data.scheduled_time,
        "repeat": notif_data.repeat,
        "repeat_days": notif_data.repeat_days,
        "enabled": True,
        "channels": notif_data.channels,
        "last_sent": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    notification_doc['created_at'] = datetime.fromisoformat(notification_doc['created_at'])
    return Notification(**notification_doc)

@api_router.patch("/notifications/{notification_id}")
async def update_notification(request: Request, notification_id: str, notif_data: NotificationCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    update_data = {
        "title": notif_data.title,
        "message": notif_data.message,
        "type": notif_data.type,
        "category": notif_data.category,
        "scheduled_time": notif_data.scheduled_time,
        "repeat": notif_data.repeat,
        "repeat_days": notif_data.repeat_days,
        "channels": notif_data.channels
    }
    
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification updated"}

@api_router.patch("/notifications/{notification_id}/toggle")
async def toggle_notification(request: Request, notification_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    notif = await db.notifications.find_one({"notification_id": notification_id, "user_id": user.user_id}, {"_id": 0})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    new_enabled = not notif['enabled']
    await db.notifications.update_one(
        {"notification_id": notification_id},
        {"$set": {"enabled": new_enabled}}
    )
    return {"message": "Notification toggled", "enabled": new_enabled}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(request: Request, notification_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    result = await db.notifications.delete_one({"notification_id": notification_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

@api_router.get("/notifications/pending")
async def get_pending_notifications(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get notifications that should be triggered now"""
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    current_time = datetime.now(timezone.utc).strftime("%H:%M")
    current_day = datetime.now(timezone.utc).strftime("%A").lower()
    
    # Find enabled notifications for current time
    notifications = await db.notifications.find({
        "user_id": user.user_id,
        "enabled": True,
        "scheduled_time": current_time
    }, {"_id": 0}).to_list(100)
    
    pending = []
    for notif in notifications:
        should_send = False
        if notif['repeat'] == "none":
            should_send = True
        elif notif['repeat'] == "daily":
            should_send = True
        elif notif['repeat'] == "weekly":
            if current_day in [d.lower() for d in notif.get('repeat_days', [])]:
                should_send = True
        elif notif['repeat'] == "custom":
            if current_day in [d.lower() for d in notif.get('repeat_days', [])]:
                should_send = True
        
        if should_send:
            pending.append(notif)
    
    return pending

@api_router.post("/notifications/{notification_id}/send")
async def mark_notification_sent(request: Request, notification_id: str, channel: str, session_token: Optional[str] = Cookie(None)):
    """Mark a notification as sent and log it"""
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    # Update last_sent timestamp
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user.user_id},
        {"$set": {"last_sent": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Log the notification send
    log_id = f"nlog_{uuid.uuid4().hex[:12]}"
    log_doc = {
        "log_id": log_id,
        "notification_id": notification_id,
        "user_id": user.user_id,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "channel": channel,
        "status": "sent"
    }
    await db.notification_logs.insert_one(log_doc)
    
    return {"message": "Notification marked as sent", "log_id": log_id}

# ========== NOTIFICATION TEMPLATES ==========
@api_router.get("/notification-templates")
async def get_notification_templates():
    """Get predefined notification templates"""
    templates = [
        {
            "id": "hydration",
            "title": "💧 Hora de Beber Água",
            "message": "Lembre-se de se manter hidratado! Beba um copo de água.",
            "category": "hydration",
            "suggested_times": ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
            "repeat": "daily"
        },
        {
            "id": "workout",
            "title": "💪 Hora do Treino",
            "message": "Não esqueça do seu treino de hoje! Bora mover o corpo!",
            "category": "workout",
            "suggested_times": ["06:00", "07:00", "18:00", "19:00"],
            "repeat": "custom"
        },
        {
            "id": "morning_tasks",
            "title": "📋 Revisão Matinal",
            "message": "Bom dia! Hora de revisar suas tarefas do dia.",
            "category": "task",
            "suggested_times": ["07:00", "08:00"],
            "repeat": "daily"
        },
        {
            "id": "evening_review",
            "title": "🌙 Revisão Noturna",
            "message": "Como foi seu dia? Hora de revisar o progresso e planejar amanhã.",
            "category": "task",
            "suggested_times": ["21:00", "22:00"],
            "repeat": "daily"
        },
        {
            "id": "habit_check",
            "title": "✅ Verificar Hábitos",
            "message": "Já completou seus hábitos de hoje?",
            "category": "habit",
            "suggested_times": ["20:00"],
            "repeat": "daily"
        },
        {
            "id": "stretch",
            "title": "🧘 Hora de Alongar",
            "message": "Faça uma pausa e alongue-se por 5 minutos.",
            "category": "workout",
            "suggested_times": ["10:00", "15:00"],
            "repeat": "daily"
        },
        {
            "id": "posture",
            "title": "🪑 Verificar Postura",
            "message": "Corrija sua postura! Costas retas, ombros relaxados.",
            "category": "custom",
            "suggested_times": ["09:00", "11:00", "14:00", "16:00"],
            "repeat": "daily"
        }
    ]
    return templates

# ========== BODY MEASUREMENTS ENDPOINTS ==========
@api_router.get("/body-measurements")
async def get_body_measurements(request: Request, limit: int = 30, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    measurements = await db.body_measurements.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("date", -1).limit(limit).to_list(limit)
    
    return measurements

@api_router.get("/body-measurements/latest")
async def get_latest_measurement(request: Request, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    measurement = await db.body_measurements.find_one(
        {"user_id": user.user_id}, {"_id": 0}, sort=[("date", -1)]
    )
    
    return measurement

@api_router.post("/body-measurements")
async def create_body_measurement(request: Request, data: BodyMeasurementCreate, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    measurement_id = f"measure_{uuid.uuid4().hex[:12]}"
    
    # Calcular IMC se altura e peso foram fornecidos
    bmi = None
    if data.weight_kg and data.height_cm:
        height_m = data.height_cm / 100
        bmi = round(data.weight_kg / (height_m ** 2), 1)
    
    measurement_doc = {
        "measurement_id": measurement_id,
        "user_id": user.user_id,
        "date": data.date,
        "weight_kg": data.weight_kg,
        "body_fat_percentage": data.body_fat_percentage,
        "muscle_mass_kg": data.muscle_mass_kg,
        "bone_mass_kg": data.bone_mass_kg,
        "water_percentage": data.water_percentage,
        "visceral_fat": data.visceral_fat,
        "metabolic_age": data.metabolic_age,
        "bmr_kcal": data.bmr_kcal,
        "height_cm": data.height_cm,
        "neck_cm": data.neck_cm,
        "shoulders_cm": data.shoulders_cm,
        "chest_cm": data.chest_cm,
        "waist_cm": data.waist_cm,
        "abdomen_cm": data.abdomen_cm,
        "hips_cm": data.hips_cm,
        "left_arm_cm": data.left_arm_cm,
        "right_arm_cm": data.right_arm_cm,
        "left_forearm_cm": data.left_forearm_cm,
        "right_forearm_cm": data.right_forearm_cm,
        "left_thigh_cm": data.left_thigh_cm,
        "right_thigh_cm": data.right_thigh_cm,
        "left_calf_cm": data.left_calf_cm,
        "right_calf_cm": data.right_calf_cm,
        "bmi": bmi,
        "notes": data.notes,
        "source": data.source,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.body_measurements.insert_one(measurement_doc)
    measurement_doc.pop('_id', None)
    
    return measurement_doc

@api_router.delete("/body-measurements/{measurement_id}")
async def delete_body_measurement(request: Request, measurement_id: str, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    result = await db.body_measurements.delete_one({"measurement_id": measurement_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Measurement not found")
    
    return {"message": "Measurement deleted"}

@api_router.get("/body-measurements/evolution")
async def get_body_evolution(request: Request, months: int = 6, session_token: Optional[str] = Cookie(None)):
    """Get body measurement evolution over time"""
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    start_date = (datetime.now() - timedelta(days=months * 30)).strftime("%Y-%m-%d")
    
    measurements = await db.body_measurements.find(
        {"user_id": user.user_id, "date": {"$gte": start_date}}, {"_id": 0}
    ).sort("date", 1).to_list(1000)
    
    # Calculate changes
    if len(measurements) >= 2:
        first = measurements[0]
        last = measurements[-1]
        
        changes = {}
        for field in ["weight_kg", "body_fat_percentage", "muscle_mass_kg", "waist_cm", "bmi"]:
            if first.get(field) and last.get(field):
                changes[field] = round(last[field] - first[field], 2)
    else:
        changes = {}
    
    return {
        "measurements": measurements,
        "changes": changes,
        "total_records": len(measurements)
    }

# ========== PDF ANALYSIS ENDPOINT ==========
@api_router.post("/body-measurements/analyze-pdf")
async def analyze_pdf_measurement(
    request: Request,
    file: UploadFile = File(...),
    session_token: Optional[str] = Cookie(None)
):
    """Analyze a PDF file containing body measurement data using AI"""
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    # Read file content
    content = await file.read()
    file_base64 = base64.b64encode(content).decode('utf-8')
    
    # Use Gemini to analyze the PDF
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"pdf_analysis_{user.user_id}",
            system_message="""Você é um especialista em análise de avaliações físicas e bioimpedância.
            Analise o documento e extraia TODOS os dados disponíveis.
            Responda APENAS em formato JSON válido com os campos encontrados.
            Use os seguintes nomes de campos (deixe null se não encontrado):
            - weight_kg, height_cm, body_fat_percentage, muscle_mass_kg
            - bone_mass_kg, water_percentage, visceral_fat, metabolic_age, bmr_kcal
            - neck_cm, shoulders_cm, chest_cm, waist_cm, abdomen_cm, hips_cm
            - left_arm_cm, right_arm_cm, left_forearm_cm, right_forearm_cm
            - left_thigh_cm, right_thigh_cm, left_calf_cm, right_calf_cm
            - date (formato YYYY-MM-DD), notes (observações relevantes)
            - recommendations (array de recomendações baseadas nos dados)"""
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(
            text="Analise este documento de avaliação física/bioimpedância e extraia todos os dados em JSON:",
            files=[{"mime_type": "application/pdf", "data": file_base64}]
        )
        
        response = await chat.send_message(user_message)
        
        # Try to parse JSON from response
        try:
            # Remove markdown code blocks if present
            json_str = response.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.startswith("```"):
                json_str = json_str[3:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            extracted_data = json.loads(json_str.strip())
        except json.JSONDecodeError:
            # If JSON parsing fails, return raw analysis
            extracted_data = {"raw_analysis": response, "parse_error": True}
        
        return {
            "success": True,
            "extracted_data": extracted_data,
            "filename": file.filename
        }
        
    except Exception as e:
        logging.error(f"PDF analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze PDF: {str(e)}")

# ========== AI RECOMMENDATIONS ==========
@api_router.get("/body-measurements/recommendations")
async def get_workout_recommendations(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get AI-powered workout and health recommendations based on body measurements"""
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    # Get latest measurements
    measurements = await db.body_measurements.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)
    
    # Get recent workouts
    workouts = await db.workout_logs.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("date", -1).limit(10).to_list(10)
    
    if not measurements:
        return {
            "recommendations": ["Registre suas medidas corporais para receber recomendações personalizadas."],
            "based_on": "no_data"
        }
    
    latest = measurements[0]
    
    prompt = f"""Com base nos seguintes dados corporais do usuário, forneça recomendações personalizadas de treino e saúde:

MEDIDAS ATUAIS:
- Peso: {latest.get('weight_kg', 'N/A')} kg
- Altura: {latest.get('height_cm', 'N/A')} cm
- IMC: {latest.get('bmi', 'N/A')}
- Gordura corporal: {latest.get('body_fat_percentage', 'N/A')}%
- Massa muscular: {latest.get('muscle_mass_kg', 'N/A')} kg
- Cintura: {latest.get('waist_cm', 'N/A')} cm
- Gordura visceral: {latest.get('visceral_fat', 'N/A')}

HISTÓRICO DE TREINOS (últimos 10):
{json.dumps([{"name": w.get("name"), "type": w.get("activity_type"), "duration": w.get("duration_minutes")} for w in workouts], indent=2)}

Forneça:
1. 3-5 recomendações específicas de treino
2. Dicas de nutrição
3. Áreas de foco prioritárias
4. Metas sugeridas para os próximos 30 dias

Responda em português de forma direta e motivadora."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"recommendations_{user.user_id}",
            system_message="Você é um personal trainer e nutricionista experiente. Forneça recomendações práticas e motivadoras."
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "recommendations": response,
            "based_on": latest,
            "workouts_analyzed": len(workouts)
        }
        
    except Exception as e:
        logging.error(f"Recommendations generation failed: {e}")
        return {
            "recommendations": "Não foi possível gerar recomendações no momento. Tente novamente mais tarde.",
            "error": str(e)
        }

# ========== MOTIVATIONAL QUOTES ==========
@api_router.get("/motivational-quote")
async def get_motivational_quote(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get a personalized motivational quote based on user's progress"""
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    # Get user stats
    today = datetime.now().strftime("%Y-%m-%d")
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    hour = datetime.now().hour
    
    workouts_this_week = await db.workout_logs.count_documents({
        "user_id": user.user_id,
        "date": {"$gte": week_ago},
        "completed": True
    })
    
    habits_today = await db.habit_logs.count_documents({
        "user_id": user.user_id,
        "date": today,
        "completed": True
    })
    
    # Determine time of day
    if hour < 12:
        time_of_day = "manhã"
    elif hour < 18:
        time_of_day = "tarde"
    else:
        time_of_day = "noite"
    
    prompt = f"""Gere UMA frase motivacional ÚNICA, CRIATIVA e IMPACTANTE.

CONTEXTO:
- Nome: {user.name}
- Hora do dia: {time_of_day}
- Treinos esta semana: {workouts_this_week}
- Atividades hoje: {habits_today}

ESTILOS POSSÍVEIS (escolha um aleatoriamente):
1. Frase filosófica profunda sobre disciplina e crescimento
2. Citação inspiradora no estilo de grandes líderes ou atletas
3. Metáfora poderosa sobre superação
4. Desafio direto e provocativo
5. Reflexão sobre mentalidade de guerreiro/campeão
6. Frase sobre consistência e processo
7. Motivação brutal e direta estilo militar
8. Insight sobre autoconhecimento e evolução
9. Comparação inspiradora com a natureza ou elementos
10. Frase sobre legado e propósito

REGRAS:
- Máximo 2 linhas
- Seja CRIATIVO e ORIGINAL - evite clichês
- Pode ou não mencionar o nome "{user.name}"
- Use 1-2 emojis impactantes (🔥💪⚡🎯🏆🦁⚔️🌟💎🚀)
- A frase deve causar IMPACTO e fazer a pessoa querer agir
- Varie entre tom filosófico, agressivo, reflexivo ou desafiador
- NÃO precisa falar de XP, patente ou progresso no app

Responda APENAS com a frase, sem explicações."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"motivation_{user.user_id}_{datetime.now().minute}",
            system_message="Você é um mestre motivacional que combina sabedoria filosófica, mentalidade de elite atlética e coaching de alta performance. Suas frases são impactantes, únicas e memoráveis."
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "quote": response.strip(),
            "context": {
                "workouts_this_week": workouts_this_week,
                "habits_today": habits_today
            }
        }
        
    except Exception as e:
        logging.error(f"Quote generation failed: {e}")
        # Fallback quotes - mais impactantes e variadas
        fallback_quotes = [
            "🔥 A dor do treino é temporária. A dor do arrependimento é permanente.",
            "⚔️ Guerreiros não nascem. São forjados no fogo da disciplina diária.",
            "🦁 Seja a pessoa que você precisava quando era mais novo.",
            "💎 Diamantes são apenas pedras que não desistiram sob pressão.",
            "🎯 Enquanto outros dormem, você constrói seu império.",
            "⚡ Sua única competição é quem você era ontem.",
            "🏆 Champions são feitos quando ninguém está olhando.",
            "🚀 Conforto é a morte lenta dos seus sonhos. Acorde!",
            "💪 Seu corpo pode quase tudo. É sua mente que você precisa convencer.",
            "🌟 A excelência não é um ato, é um hábito. Que hábito você está construindo?"
        ]
        import random
        return {
            "quote": random.choice(fallback_quotes),
            "fallback": True
        }

# ========== DAILY WORKOUT STATUS ==========
@api_router.get("/daily-workout-status/{plan_id}")
async def get_daily_workout_status(request: Request, plan_id: str, session_token: Optional[str] = Cookie(None)):
    """Get the exercise completion status for a plan on today's date"""
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    status = await db.daily_workout_status.find_one({
        "user_id": user.user_id,
        "plan_id": plan_id,
        "date": today
    }, {"_id": 0})
    
    return status or {"exercises_status": {}, "completed": False}

@api_router.post("/daily-workout-status/{plan_id}/toggle/{exercise_idx}")
async def toggle_daily_exercise(request: Request, plan_id: str, exercise_idx: int, session_token: Optional[str] = Cookie(None)):
    """Toggle an exercise completion status for today"""
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Get or create today's status
    status = await db.daily_workout_status.find_one({
        "user_id": user.user_id,
        "plan_id": plan_id,
        "date": today
    })
    
    if not status:
        status = {
            "status_id": f"dws_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            "plan_id": plan_id,
            "date": today,
            "exercises_status": {},
            "completed": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.daily_workout_status.insert_one(status)
    
    # Toggle the exercise
    exercise_key = str(exercise_idx)
    current_status = status.get("exercises_status", {}).get(exercise_key, False)
    new_status = not current_status
    
    await db.daily_workout_status.update_one(
        {"user_id": user.user_id, "plan_id": plan_id, "date": today},
        {
            "$set": {
                f"exercises_status.{exercise_key}": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Get updated status
    updated = await db.daily_workout_status.find_one({
        "user_id": user.user_id,
        "plan_id": plan_id,
        "date": today
    }, {"_id": 0})
    
    return updated

@api_router.post("/daily-workout-status/{plan_id}/complete")
async def complete_daily_workout(request: Request, plan_id: str, data: dict, session_token: Optional[str] = Cookie(None)):
    """Complete a daily workout and log it"""
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Get the plan
    plan = await db.workout_plans.find_one({"plan_id": plan_id, "user_id": user.user_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Get today's status
    status = await db.daily_workout_status.find_one({
        "user_id": user.user_id,
        "plan_id": plan_id,
        "date": today
    }, {"_id": 0})
    
    exercises_status = status.get("exercises_status", {}) if status else {}
    
    # Build exercises_completed list
    exercises_completed = []
    for idx, ex in enumerate(plan.get("exercises", [])):
        exercises_completed.append({
            **ex,
            "completed": exercises_status.get(str(idx), False)
        })
    
    completed_count = sum(1 for ex in exercises_completed if ex.get("completed"))
    total_exercises = len(exercises_completed)
    
    # Calculate XP based on completion
    base_xp = 20
    completion_bonus = int((completed_count / total_exercises) * 30) if total_exercises > 0 else 0
    duration_bonus = (data.get("duration_minutes", 30) // 15) * 5
    total_xp = base_xp + completion_bonus + duration_bonus
    
    # Estimate calories if not provided (rough estimate based on duration and activity)
    calories = data.get("calories")
    if not calories:
        # Average 5-8 calories per minute for strength training
        calories = int(data.get("duration_minutes", 30) * 6)
    
    # Create workout log
    log_id = f"workout_{uuid.uuid4().hex[:12]}"
    workout_doc = {
        "log_id": log_id,
        "user_id": user.user_id,
        "plan_id": plan_id,
        "activity_type": "weightlifting",
        "name": plan.get("name", "Treino"),
        "duration_minutes": data.get("duration_minutes", 30),
        "calories": calories,
        "exercises_completed": exercises_completed,
        "notes": data.get("notes", ""),
        "xp_earned": total_xp,
        "completed": True,
        "date": today,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.workout_logs.insert_one(workout_doc)
    
    # Update user XP
    new_xp = user.xp + total_xp
    new_rank = calculate_rank(new_xp)
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"xp": new_xp, "rank": new_rank}})
    
    # Mark daily status as completed
    await db.daily_workout_status.update_one(
        {"user_id": user.user_id, "plan_id": plan_id, "date": today},
        {"$set": {"completed": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    workout_doc.pop('_id', None)
    return {
        **workout_doc,
        "new_xp": new_xp,
        "new_rank": new_rank,
        "exercises_completed_count": completed_count,
        "total_exercises": total_exercises
    }

@api_router.post("/daily-workout-status/{plan_id}/reset")
async def reset_daily_workout(request: Request, plan_id: str, session_token: Optional[str] = Cookie(None)):
    """Reset today's workout status for a plan"""
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    await db.daily_workout_status.update_one(
        {"user_id": user.user_id, "plan_id": plan_id, "date": today},
        {
            "$set": {
                "exercises_status": {},
                "completed": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Daily workout status reset", "date": today}

# Include router AFTER all endpoints are defined
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

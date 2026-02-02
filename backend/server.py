from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Form, Cookie, Response, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from emergentintegrations.llm.openai import OpenAISpeechToText
import aiofiles
import base64
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    created_at: datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: str
    priority: str = "medium"

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

@api_router.get("/tasks")
async def get_tasks(request: Request, date: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    query = {"user_id": user.user_id}
    if date:
        query["date"] = date
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    for task in tasks:
        if isinstance(task['created_at'], str):
            task['created_at'] = datetime.fromisoformat(task['created_at'])
    return tasks

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
        "completed": False,
        "date": task_data.date,
        "priority": task_data.priority,
        "xp_reward": 10 if task_data.priority == "low" else 20 if task_data.priority == "medium" else 30,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(task_doc)
    task_doc['created_at'] = datetime.fromisoformat(task_doc['created_at'])
    return Task(**task_doc)

@api_router.patch("/tasks/{task_id}")
async def update_task(request: Request, task_id: str, completed: bool, session_token: Optional[str] = Cookie(None)):
    auth_header = request.headers.get("Authorization")
    user = await get_current_user(authorization=auth_header, session_token=session_token)
    
    task = await db.tasks.find_one({"task_id": task_id, "user_id": user.user_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.tasks.update_one({"task_id": task_id}, {"$set": {"completed": completed}})
    
    if completed and not task['completed']:
        new_xp = user.xp + task['xp_reward']
        new_rank = calculate_rank(new_xp)
        await db.users.update_one({"user_id": user.user_id}, {"$set": {"xp": new_xp, "rank": new_rank}})
        return {"message": "Task completed", "xp_earned": task['xp_reward'], "new_xp": new_xp, "new_rank": new_rank}
    
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
    
    if date in habit['completions']:
        return {"message": "Habit already completed today"}
    
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
    
    return {"message": "Habit completed", "streak": streak, "xp_earned": 15, "new_xp": new_xp}

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
    
    result = await db.transactions.delete_one({"transaction_id": transaction_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

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
    
    content = message_data.content
    
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    user_message = {
        "message_id": message_id,
        "user_id": user.user_id,
        "role": "user",
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(user_message)
    
    prompt = f"""Você é um assistente financeiro integrado ao app Sirius. O usuário enviou a seguinte mensagem: "{content}".
    
Analise a mensagem e identifique se há informações sobre transações financeiras (receitas ou despesas).
Se houver, extraia:
- tipo: "income" ou "expense"
- valor (número)
- categoria
- descrição

Responda em formato JSON se for uma transação, ou uma mensagem de texto amigável caso contrário.

Exemplo de resposta JSON:
{{"type": "expense", "amount": 50.0, "category": "alimentação", "description": "almoço no restaurante"}}
"""
    
    try:
        llm_key = os.getenv("EMERGENT_LLM_KEY", "")
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"chat_{user.user_id}",
            system_message="Você é um assistente financeiro do Sirius."
        ).with_model("openai", "gpt-5.2")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        ai_message_id = f"msg_{uuid.uuid4().hex[:12]}"
        ai_message = {
            "message_id": ai_message_id,
            "user_id": user.user_id,
            "role": "assistant",
            "content": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            import json
            transaction_data = json.loads(response)
            if "type" in transaction_data and "amount" in transaction_data:
                transaction_id = f"trans_{uuid.uuid4().hex[:12]}"
                transaction_doc = {
                    "transaction_id": transaction_id,
                    "user_id": user.user_id,
                    "type": transaction_data["type"],
                    "amount": float(transaction_data["amount"]),
                    "category": transaction_data.get("category", "outros"),
                    "description": transaction_data.get("description", ""),
                    "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.transactions.insert_one(transaction_doc)
                ai_message["transaction_data"] = transaction_data
        except:
            pass
        
        await db.chat_messages.insert_one(ai_message)
        
        user_message['created_at'] = datetime.fromisoformat(user_message['created_at'])
        ai_message['created_at'] = datetime.fromisoformat(ai_message['created_at'])
        
        return {"user_message": user_message, "ai_message": ai_message}
    except Exception as e:
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
        llm_key = os.getenv("EMERGENT_LLM_KEY", "")
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"report_{user.user_id}",
            system_message="Você é um analista de produtividade e finanças."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Gere um relatório {report_type} para o período {period} baseado nos seguintes dados:

Tarefas: {data['tasks']} total, {data['tasks_completed']} concluídas
Hábitos: {data['habits']} total, {data['total_habits_completions']} completações
Receitas: R$ {data['income']:.2f}
Despesas: R$ {data['expenses']:.2f}
Metas: {data['goals']} total, {data['goals_progress']:.1f}% progresso médio

Forneça insights, padrões identificados e sugestões de otimização em português."""
        
        insights = await chat.send_message(UserMessage(text=prompt))
        
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
        xp_change = 0
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
        return {"message": "Day unchecked", "xp_earned": 0}

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

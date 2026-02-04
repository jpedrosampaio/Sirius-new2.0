#!/usr/bin/env python3
"""
Script para converter server.py de MongoDB para MySQL
Execute: python3 convert_to_mysql.py
"""

import re

def convert_to_mysql():
    # Read original file
    with open('server.py', 'r') as f:
        content = f.read()
    
    # Replace imports
    old_imports = '''from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Form, Cookie, Response, Request
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
from google import genai
from google.genai import types
import aiofiles
import base64
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]'''
    
    new_imports = '''from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Form, Cookie, Response, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from google import genai
from google.genai import types
import aiofiles
import base64
import requests

# SQLAlchemy imports for MySQL
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select, update, delete, and_, or_, func as sql_func, Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import DeclarativeBase

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MySQL Configuration
MYSQL_USER = os.environ.get('MYSQL_USER', 'sirius')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '')
MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
MYSQL_PORT = os.environ.get('MYSQL_PORT', '3306')
MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE', 'dani4743_sirius')

DATABASE_URL = f"mysql+aiomysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

# ========== SQL MODELS ==========
class UserModel(Base):
    __tablename__ = "users"
    user_id = Column(String(50), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    picture = Column(Text, nullable=True)
    xp = Column(Integer, default=0)
    rank = Column(String(50), default="Recruta")
    created_at = Column(DateTime, default=sql_func.now())

class UserSessionModel(Base):
    __tablename__ = "user_sessions"
    session_token = Column(String(100), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=sql_func.now())

class TaskModel(Base):
    __tablename__ = "tasks"
    task_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)
    date = Column(String(20), nullable=False, index=True)
    priority = Column(String(20), default="medium")
    xp_reward = Column(Integer, default=10)
    recurrence = Column(String(20), default="daily")
    is_template = Column(Boolean, default=True)
    created_at = Column(DateTime, default=sql_func.now())

class TaskInstanceModel(Base):
    __tablename__ = "task_instances"
    instance_id = Column(String(50), primary_key=True)
    task_id = Column(String(50), nullable=False, index=True)
    date = Column(String(20), nullable=False, index=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=sql_func.now())

class HabitModel(Base):
    __tablename__ = "habits"
    habit_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), default="#007AFF")
    streak = Column(Integer, default=0)
    best_streak = Column(Integer, default=0)
    completions = Column(JSON, default=[])
    created_at = Column(DateTime, default=sql_func.now())

class TransactionModel(Base):
    __tablename__ = "transactions"
    transaction_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    type = Column(String(20), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(String(20), nullable=False, index=True)
    created_at = Column(DateTime, default=sql_func.now())

class BudgetModel(Base):
    __tablename__ = "budgets"
    budget_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    limit_amount = Column(Float, nullable=False)
    spent = Column(Float, default=0)
    month = Column(String(10), nullable=False, index=True)
    created_at = Column(DateTime, default=sql_func.now())

class GoalModel(Base):
    __tablename__ = "goals"
    goal_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_date = Column(String(20), nullable=False)
    progress = Column(Float, default=0)
    sprint_duration = Column(Integer, default=60)
    daily_checks = Column(JSON, default=[])
    sprints = Column(JSON, default=[])
    created_at = Column(DateTime, default=sql_func.now())

class ChallengeModel(Base):
    __tablename__ = "challenges"
    challenge_id = Column(String(50), primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    xp_reward = Column(Integer, default=50)
    week_start = Column(String(20), nullable=False, index=True)
    week_end = Column(String(20), nullable=False)
    completed_by = Column(JSON, default=[])
    created_at = Column(DateTime, default=sql_func.now())

class AchievementModel(Base):
    __tablename__ = "achievements"
    achievement_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    unlocked_at = Column(DateTime, default=sql_func.now())

class ChatMessageModel(Base):
    __tablename__ = "chat_messages"
    message_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    transaction_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=sql_func.now())

class ReportModel(Base):
    __tablename__ = "reports"
    report_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    period = Column(String(50), nullable=False)
    data = Column(JSON, nullable=True)
    insights = Column(Text, nullable=True)
    created_at = Column(DateTime, default=sql_func.now())

class WorkoutPlanModel(Base):
    __tablename__ = "workout_plans"
    plan_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    exercises = Column(JSON, default=[])
    created_at = Column(DateTime, default=sql_func.now())

class WorkoutLogModel(Base):
    __tablename__ = "workout_logs"
    log_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    plan_id = Column(String(50), nullable=True)
    activity_type = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    duration_minutes = Column(Integer, default=0)
    distance_km = Column(Float, nullable=True)
    calories = Column(Integer, nullable=True)
    exercises_completed = Column(JSON, default=[])
    notes = Column(Text, nullable=True)
    xp_earned = Column(Integer, default=20)
    completed = Column(Boolean, default=True)
    date = Column(String(20), nullable=False, index=True)
    created_at = Column(DateTime, default=sql_func.now())

class NotificationModel(Base):
    __tablename__ = "notifications"
    notification_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    type = Column(String(50), default="reminder")
    category = Column(String(50), default="custom")
    scheduled_time = Column(String(20), nullable=True)
    repeat = Column(String(20), default="none")
    repeat_days = Column(JSON, default=[])
    enabled = Column(Boolean, default=True)
    channels = Column(JSON, default=["in_app"])
    last_sent = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=sql_func.now())

class NotificationLogModel(Base):
    __tablename__ = "notification_logs"
    log_id = Column(String(50), primary_key=True)
    notification_id = Column(String(50), nullable=False, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    sent_at = Column(DateTime, default=sql_func.now())
    channel = Column(String(50), nullable=False)
    status = Column(String(20), default="sent")

class BodyMeasurementModel(Base):
    __tablename__ = "body_measurements"
    measurement_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    date = Column(String(20), nullable=False, index=True)
    weight_kg = Column(Float, nullable=True)
    body_fat_percentage = Column(Float, nullable=True)
    muscle_mass_kg = Column(Float, nullable=True)
    bone_mass_kg = Column(Float, nullable=True)
    water_percentage = Column(Float, nullable=True)
    visceral_fat = Column(Integer, nullable=True)
    metabolic_age = Column(Integer, nullable=True)
    bmr_kcal = Column(Integer, nullable=True)
    height_cm = Column(Float, nullable=True)
    neck_cm = Column(Float, nullable=True)
    shoulders_cm = Column(Float, nullable=True)
    chest_cm = Column(Float, nullable=True)
    waist_cm = Column(Float, nullable=True)
    abdomen_cm = Column(Float, nullable=True)
    hips_cm = Column(Float, nullable=True)
    left_arm_cm = Column(Float, nullable=True)
    right_arm_cm = Column(Float, nullable=True)
    left_forearm_cm = Column(Float, nullable=True)
    right_forearm_cm = Column(Float, nullable=True)
    left_thigh_cm = Column(Float, nullable=True)
    right_thigh_cm = Column(Float, nullable=True)
    left_calf_cm = Column(Float, nullable=True)
    right_calf_cm = Column(Float, nullable=True)
    bmi = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String(50), default="manual")
    created_at = Column(DateTime, default=sql_func.now())

class DailyWorkoutStatusModel(Base):
    __tablename__ = "daily_workout_status"
    status_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    plan_id = Column(String(50), nullable=False, index=True)
    date = Column(String(20), nullable=False, index=True)
    exercises_status = Column(JSON, default={})
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=sql_func.now())
    updated_at = Column(DateTime, default=sql_func.now())

class CreditCardModel(Base):
    __tablename__ = "credit_cards"
    card_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    last_digits = Column(String(4), nullable=True)
    limit_amount = Column(Float, default=0)
    closing_day = Column(Integer, default=1)
    due_day = Column(Integer, default=10)
    color = Column(String(20), default="#1E90FF")
    created_at = Column(DateTime, default=sql_func.now())

class InvoiceModel(Base):
    __tablename__ = "invoices"
    invoice_id = Column(String(50), primary_key=True)
    card_id = Column(String(50), nullable=False, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    month = Column(String(10), nullable=False, index=True)
    total = Column(Float, default=0)
    paid = Column(Boolean, default=False)
    due_date = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=sql_func.now())

class ProjectionModel(Base):
    __tablename__ = "projections"
    projection_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)
    type = Column(String(20), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=False)
    month = Column(String(10), nullable=False, index=True)
    is_fixed = Column(Boolean, default=False)
    recurrence = Column(String(20), default="none")
    source = Column(String(50), default="manual")
    source_transaction_id = Column(String(50), nullable=True)
    installment_info = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=sql_func.now())

class HabitLogModel(Base):
    __tablename__ = "habit_logs"
    log_id = Column(String(50), primary_key=True)
    habit_id = Column(String(50), nullable=False, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    date = Column(String(20), nullable=False, index=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=sql_func.now())

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
'''
    
    content = content.replace(old_imports, new_imports)
    
    # Write converted file
    with open('server_mysql.py', 'w') as f:
        f.write(content)
    
    print("Arquivo server_mysql.py criado com sucesso!")
    print("ATENÇÃO: Este arquivo ainda precisa de conversão manual das queries MongoDB para SQLAlchemy.")
    print("As queries precisam ser convertidas de:")
    print("  await db.collection.find_one() -> await session.execute(select(Model).where())")
    print("  await db.collection.insert_one() -> session.add(Model()); await session.commit()")
    
if __name__ == "__main__":
    convert_to_mysql()

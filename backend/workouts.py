import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, HTTPException, Request

from core.auth import get_current_user
from core.database import get_database
from core.llm import get_gemini_client, GEMINI_MODEL, call_llm
from core.utils import award_xp, calculate_rank
from models.workout import WorkoutLog, WorkoutLogCreate, WorkoutPlan, WorkoutPlanCreate, WorkoutPlanGenerate
from google.genai import types

router = APIRouter(tags=["workouts"])


# ------------------------------------------------------------------ plans

@router.get("/workout-plans")
async def get_workout_plans(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    plans = await db.workout_plans.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    for p in plans:
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"])
    return plans


@router.post("/workout-plans")
async def create_workout_plan(request: Request, data: WorkoutPlanCreate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    plan_id = f"plan_{uuid.uuid4().hex[:12]}"
    doc = {
        "plan_id": plan_id,
        "user_id": user.user_id,
        "name": data.name,
        "description": data.description,
        "exercises": data.exercises,
        "plan_duration": data.plan_duration or "dia",
        "generated_by_ai": False,
        "days": data.days,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.workout_plans.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return WorkoutPlan(**doc)


@router.patch("/workout-plans/{plan_id}")
async def update_workout_plan(request: Request, plan_id: str, data: WorkoutPlanCreate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    result = await db.workout_plans.update_one(
        {"plan_id": plan_id, "user_id": user.user_id},
        {"$set": {"name": data.name, "description": data.description, "exercises": data.exercises, "plan_duration": data.plan_duration or "dia", "days": data.days}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return {"message": "Workout plan updated"}


@router.delete("/workout-plans/{plan_id}")
async def delete_workout_plan(request: Request, plan_id: str, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    result = await db.workout_plans.delete_one({"plan_id": plan_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return {"message": "Workout plan deleted"}


@router.post("/workout-plans/generate")
async def generate_workout_plan(request: Request, gen: WorkoutPlanGenerate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    gemini = get_gemini_client()
    if not gemini:
        raise HTTPException(status_code=503, detail="Serviço de IA indisponível")

    health_text = ""
    if gen.health_condition and gen.health_condition.strip():
        health_text = f"\nCONDIÇÃO DE SAÚDE: {gen.health_condition.strip()}\nAdapte TODOS os exercícios a esta condição."
        db = get_database()
        await db.users.update_one({"user_id": user.user_id}, {"$set": {"health_condition": gen.health_condition.strip()}})

    if gen.generation_mode == "tipo_treino" and gen.split_config:
        split_desc = "\n".join(f"  Treino {s['label']}: {s.get('name','')} ({', '.join(s.get('muscle_groups',[]))})" for s in gen.split_config)
        days_per = gen.training_days_per_week or 5
        weeks = gen.cycle_weeks or 4
        prompt = f"""Personal trainer. Gere plano em JSON para divisão {gen.split_type}.
Objetivo: {gen.objective} | Nível: {gen.level} | Dias/semana: {days_per} | Ciclo: {weeks} sem.{health_text}
Divisões:\n{split_desc}

JSON:
{{"name":"...", "description":"...", "plan_duration":"ciclo", "split_type":"{gen.split_type}", "cycle_weeks":{weeks}, "training_days_per_week":{days_per},
"days":[{{"day_name":"sem1_dia1","day_label":"...","split_label":"A","week":1,"exercises":[{{"name":"...","sets":4,"reps":10,"weight":"","rest_seconds":90,"muscle_group":"peito","tutorial":"...","video_url":"https://youtube.com/..."}}]}}]}}
Retorne APENAS o JSON."""
    else:
        muscle_text = f"\nGrupos prioritários: {', '.join(gen.muscle_groups)}" if gen.muscle_groups else ""
        prompt = f"""Personal trainer. Gere plano de treino em JSON.
Objetivo: {gen.objective} | Nível: {gen.level} | Duração: {gen.duration}{muscle_text}{health_text}

JSON:
{{"name":"...","description":"...","plan_duration":"{gen.duration}","days":[{{"day_name":"dia1","day_label":"...","exercises":[{{"name":"...","sets":3,"reps":"12","weight":"","rest_seconds":90,"muscle_group":"...","tutorial":"...","video_url":"https://youtube.com/..."}}]}}]}}
Retorne APENAS o JSON."""

    try:
        response = gemini.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(system_instruction="Personal trainer profissional. Responda em JSON válido."),
        )
        text = response.text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        plan_data = json.loads(text)
        days = plan_data.get("days", [])
        all_exercises = [ex for day in days for ex in day.get("exercises", [])]
        plan_duration = "ciclo" if gen.generation_mode == "tipo_treino" else gen.duration

        plan_id = f"plan_{uuid.uuid4().hex[:12]}"
        doc = {
            "plan_id": plan_id,
            "user_id": user.user_id,
            "name": plan_data.get("name", f"Treino {gen.objective}"),
            "description": plan_data.get("description", ""),
            "exercises": all_exercises,
            "plan_duration": plan_duration,
            "generated_by_ai": True,
            "days": days,
            "objective": gen.objective,
            "level": gen.level,
            "generation_mode": gen.generation_mode,
            "split_type": gen.split_type if gen.generation_mode == "tipo_treino" else None,
            "split_config": gen.split_config if gen.generation_mode == "tipo_treino" else None,
            "training_days_per_week": gen.training_days_per_week if gen.generation_mode == "tipo_treino" else None,
            "cycle_weeks": gen.cycle_weeks if gen.generation_mode == "tipo_treino" else None,
            "health_condition": gen.health_condition or None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        db_conn = get_database()
        await db_conn.workout_plans.insert_one(doc)
        doc.pop("_id", None)
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        new_xp, new_rank = await award_xp(user.user_id, 5)
        return {"success": True, "plan": doc, "xp_earned": 5, "new_xp": new_xp, "new_rank": new_rank}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail="Erro ao processar resposta da IA.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar treino: {str(e)[:100]}")


# ------------------------------------------------------------------ workout logs

@router.get("/workouts")
async def get_workouts(request: Request, date: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    query = {"user_id": user.user_id}
    if date:
        query["date"] = date
    workouts = await db.workout_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return workouts


@router.post("/workouts")
async def log_workout(request: Request, data: WorkoutLogCreate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    xp = 10 + (data.duration_minutes // 15) * 5
    log_id = f"workout_{uuid.uuid4().hex[:12]}"
    doc = {
        "log_id": log_id,
        "user_id": user.user_id,
        "plan_id": data.plan_id,
        "activity_type": data.activity_type,
        "name": data.name,
        "duration_minutes": data.duration_minutes,
        "distance_km": data.distance_km,
        "calories": data.calories,
        "exercises_completed": data.exercises_completed,
        "notes": data.notes,
        "xp_earned": xp,
        "completed": True,
        "date": data.date,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.workout_logs.insert_one(doc)
    doc.pop("_id", None)
    new_xp, new_rank = await award_xp(user.user_id, xp)
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return {**doc, "new_xp": new_xp, "new_rank": new_rank}


@router.delete("/workouts/{log_id}")
async def delete_workout(request: Request, log_id: str, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    workout = await db.workout_logs.find_one({"log_id": log_id, "user_id": user.user_id}, {"_id": 0})
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if workout["completed"]:
        await award_xp(user.user_id, -workout["xp_earned"])
    await db.workout_logs.delete_one({"log_id": log_id})
    return {"message": "Workout deleted"}


@router.get("/workout-stats")
async def workout_stats(request: Request, period: str = "week", session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    from datetime import timedelta
    today = datetime.now(timezone.utc)
    days = {"week": 7, "month": 30, "year": 365}.get(period, 7)
    start = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    workouts = await db.workout_logs.find({"user_id": user.user_id, "date": {"$gte": start}, "completed": True}, {"_id": 0}).to_list(1000)
    by_type: dict = {}
    for w in workouts:
        t = w["activity_type"]
        by_type[t] = by_type.get(t, 0) + 1
    return {
        "period": period,
        "total_workouts": len(workouts),
        "total_duration_minutes": sum(w.get("duration_minutes", 0) for w in workouts),
        "total_distance_km": round(sum(w.get("distance_km", 0) or 0 for w in workouts), 2),
        "total_calories": sum(w.get("calories", 0) or 0 for w in workouts),
        "total_xp_earned": sum(w.get("xp_earned", 0) for w in workouts),
        "by_activity_type": by_type,
    }

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Cookie, HTTPException, Request

from core.auth import get_current_user
from core.database import get_database
from core.llm import call_llm
from core.utils import award_xp, update_study_streak, calculate_rank
from models.study import (
    FlashcardCreate,
    FlashcardReview,
    FocusSessionCreate,
    NotebookCreate,
    QuestionLogCreate,
    QuizCreate,
    SimuladoCreate,
    SimuladoSubmit,
    StudyAreaCreate,
    StudyNoteCreate,
    StudyProgramCreate,
    StudyScheduleCreate,
    StudySessionCreate,
    StudyTaskCreate,
)

router = APIRouter(prefix="/study", tags=["study"])


# ------------------------------------------------------------------ areas

@router.get("/areas")
async def get_areas(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    areas = await db.study_areas.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    if not areas:
        defaults = [
            {"name": "Faculdade", "color": "#007AFF", "icon": "graduation-cap", "order": 0},
            {"name": "Concursos", "color": "#10B981", "icon": "file-text", "order": 1},
            {"name": "Trabalho", "color": "#F59E0B", "icon": "briefcase", "order": 2},
            {"name": "Outros", "color": "#8B5CF6", "icon": "folder", "order": 3},
        ]
        for d in defaults:
            doc = {"area_id": f"area_{uuid.uuid4().hex[:12]}", "user_id": user.user_id, **d, "description": None, "created_at": datetime.now(timezone.utc).isoformat()}
            await db.study_areas.insert_one(doc)
            doc.pop("_id", None)
            areas.append(doc)
    return areas


@router.post("/areas")
async def create_area(request: Request, data: StudyAreaCreate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    existing = await db.study_areas.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    order = max((a.get("order", 0) for a in existing), default=-1) + 1
    doc = {"area_id": f"area_{uuid.uuid4().hex[:12]}", "user_id": user.user_id, "name": data.name, "description": data.description, "color": data.color, "icon": data.icon, "order": order, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.study_areas.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/areas/{area_id}")
async def delete_area(request: Request, area_id: str, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    result = await db.study_areas.delete_one({"area_id": area_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Area not found")
    await db.notebooks.delete_many({"area_id": area_id, "user_id": user.user_id})
    await db.study_programs.delete_many({"area_id": area_id, "user_id": user.user_id})
    return {"message": "Area deleted"}


# ------------------------------------------------------------------ programs

@router.get("/programs")
async def get_programs(request: Request, area_id: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    query = {"user_id": user.user_id}
    if area_id:
        query["area_id"] = area_id
    programs = await db.study_programs.find(query, {"_id": 0}).to_list(100)
    for p in programs:
        nbs = await db.notebooks.find({"program_id": p["program_id"], "user_id": user.user_id}, {"_id": 0}).to_list(100)
        p["notebooks_count"] = len(nbs)
        p["total_questions"] = sum(n.get("total_questions", 0) for n in nbs)
        p["correct_questions"] = sum(n.get("correct_questions", 0) for n in nbs)
    return programs


@router.post("/programs")
async def create_program(request: Request, data: StudyProgramCreate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    doc = {"program_id": f"prog_{uuid.uuid4().hex[:12]}", "user_id": user.user_id, "area_id": data.area_id, "name": data.name, "description": data.description, "color": data.color, "icon": data.icon, "target_date": data.target_date, "status": "active", "total_questions": 0, "correct_questions": 0, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.study_programs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/programs/{program_id}")
async def delete_program(request: Request, program_id: str, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    result = await db.study_programs.delete_one({"program_id": program_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Program not found")
    nbs = await db.notebooks.find({"program_id": program_id, "user_id": user.user_id}, {"_id": 0}).to_list(100)
    for nb in nbs:
        nb_id = nb["notebook_id"]
        await db.study_notes.delete_many({"notebook_id": nb_id, "user_id": user.user_id})
        await db.flashcards.delete_many({"notebook_id": nb_id, "user_id": user.user_id})
        await db.quizzes.delete_many({"notebook_id": nb_id, "user_id": user.user_id})
    await db.notebooks.delete_many({"program_id": program_id, "user_id": user.user_id})
    return {"message": "Program deleted"}


# ------------------------------------------------------------------ notebooks

@router.get("/notebooks")
async def get_notebooks(request: Request, area_id: Optional[str] = None, program_id: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    query = {"user_id": user.user_id}
    if area_id:
        query["area_id"] = area_id
    if program_id:
        query["program_id"] = program_id
    return await db.notebooks.find(query, {"_id": 0}).to_list(1000)


@router.post("/notebooks")
async def create_notebook(request: Request, data: NotebookCreate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    doc = {"notebook_id": f"notebook_{uuid.uuid4().hex[:12]}", "user_id": user.user_id, "area_id": data.area_id, "program_id": data.program_id, "name": data.name, "description": data.description, "color": data.color, "tags": data.tags, "total_study_time_minutes": 0, "total_questions": 0, "correct_questions": 0, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.notebooks.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/notebooks/{notebook_id}")
async def update_notebook(request: Request, notebook_id: str, data: dict, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    fields = {k: data[k] for k in ["name", "description", "color", "tags", "area_id", "program_id", "weight", "dificuldade", "topicos", "conteudo_programatico"] if k in data}
    if fields:
        await db.notebooks.update_one({"notebook_id": notebook_id, "user_id": user.user_id}, {"$set": fields})
    return await db.notebooks.find_one({"notebook_id": notebook_id, "user_id": user.user_id}, {"_id": 0})


@router.delete("/notebooks/{notebook_id}")
async def delete_notebook(request: Request, notebook_id: str, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    result = await db.notebooks.delete_one({"notebook_id": notebook_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notebook not found")
    await db.study_notes.delete_many({"notebook_id": notebook_id, "user_id": user.user_id})
    await db.flashcards.delete_many({"notebook_id": notebook_id, "user_id": user.user_id})
    await db.quizzes.delete_many({"notebook_id": notebook_id, "user_id": user.user_id})
    return {"message": "Notebook deleted"}


# ------------------------------------------------------------------ notes

@router.get("/notes")
async def get_notes(request: Request, notebook_id: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    q = {"user_id": user.user_id}
    if notebook_id:
        q["notebook_id"] = notebook_id
    return await db.study_notes.find(q, {"_id": 0}).to_list(1000)


@router.post("/notes")
async def create_note(request: Request, data: StudyNoteCreate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    now = datetime.now(timezone.utc).isoformat()
    doc = {"note_id": f"note_{uuid.uuid4().hex[:12]}", "user_id": user.user_id, "notebook_id": data.notebook_id, "title": data.title, "content": data.content, "tags": data.tags, "links": data.links, "attachments": [], "created_at": now, "updated_at": now}
    await db.study_notes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/notes/{note_id}")
async def update_note(request: Request, note_id: str, data: dict, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    for k in ["title", "content", "tags", "links"]:
        if k in data:
            fields[k] = data[k]
    await db.study_notes.update_one({"note_id": note_id, "user_id": user.user_id}, {"$set": fields})
    return await db.study_notes.find_one({"note_id": note_id, "user_id": user.user_id}, {"_id": 0})


@router.delete("/notes/{note_id}")
async def delete_note(request: Request, note_id: str, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    result = await db.study_notes.delete_one({"note_id": note_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}


# ------------------------------------------------------------------ flashcards

@router.get("/flashcards")
async def get_flashcards(request: Request, notebook_id: Optional[str] = None, due_only: bool = False, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    q = {"user_id": user.user_id}
    if notebook_id:
        q["notebook_id"] = notebook_id
    if due_only:
        q["next_review"] = {"$lte": datetime.now().strftime("%Y-%m-%d")}
    return await db.flashcards.find(q, {"_id": 0}).to_list(1000)


@router.post("/flashcards")
async def create_flashcard(request: Request, data: FlashcardCreate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    today = datetime.now().strftime("%Y-%m-%d")
    doc = {"flashcard_id": f"flash_{uuid.uuid4().hex[:12]}", "user_id": user.user_id, "notebook_id": data.notebook_id, "deck_name": data.deck_name, "front": data.front, "back": data.back, "tags": data.tags, "ease_factor": 2.5, "interval_days": 1, "repetitions": 0, "next_review": today, "last_review": None, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.flashcards.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.post("/flashcards/{flashcard_id}/review")
async def review_flashcard(request: Request, flashcard_id: str, review: FlashcardReview, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    card = await db.flashcards.find_one({"flashcard_id": flashcard_id, "user_id": user.user_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    q = review.quality
    ef = card.get("ease_factor", 2.5)
    interval = card.get("interval_days", 1)
    reps = card.get("repetitions", 0)

    if q < 3:
        reps, interval = 0, 1
    else:
        interval = 1 if reps == 0 else (6 if reps == 1 else int(interval * ef))
        reps += 1
    ef = max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

    next_review = (datetime.now() + timedelta(days=interval)).strftime("%Y-%m-%d")
    today = datetime.now().strftime("%Y-%m-%d")
    await db.flashcards.update_one({"flashcard_id": flashcard_id}, {"$set": {"ease_factor": ef, "interval_days": interval, "repetitions": reps, "next_review": next_review, "last_review": today}})
    xp = 5 if q >= 3 else 2
    new_xp, _ = await award_xp(user.user_id, xp)
    return {"message": "Card reviewed", "next_review": next_review, "interval_days": interval, "ease_factor": ef, "xp_earned": xp, "new_xp": new_xp}


@router.delete("/flashcards/{flashcard_id}")
async def delete_flashcard(request: Request, flashcard_id: str, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    result = await db.flashcards.delete_one({"flashcard_id": flashcard_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    return {"message": "Flashcard deleted"}


# ------------------------------------------------------------------ sessions

@router.post("/sessions")
async def create_study_session(request: Request, data: StudySessionCreate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    xp = (data.duration_minutes // 15) * 10
    doc = {"session_id": f"ssession_{uuid.uuid4().hex[:12]}", "user_id": user.user_id, "notebook_id": data.notebook_id, "duration_minutes": data.duration_minutes, "date": data.date, "notes": data.notes, "xp_earned": xp, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.study_sessions.insert_one(doc)
    await db.notebooks.update_one({"notebook_id": data.notebook_id, "user_id": user.user_id}, {"$inc": {"total_study_time_minutes": data.duration_minutes}})
    new_xp, new_rank = await award_xp(user.user_id, xp)
    await update_study_streak(user.user_id)
    doc.pop("_id", None)
    return {**doc, "new_xp": new_xp, "new_rank": new_rank}


# ------------------------------------------------------------------ question logs

@router.post("/questions/log")
async def log_questions(request: Request, data: QuestionLogCreate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    nb = await db.notebooks.find_one({"notebook_id": data.notebook_id, "user_id": user.user_id}, {"_id": 0})
    program_id = nb.get("program_id") if nb else None
    doc = {"log_id": f"qlog_{uuid.uuid4().hex[:12]}", "user_id": user.user_id, "notebook_id": data.notebook_id, "program_id": program_id, "total": data.total, "correct": data.correct, "incorrect": data.total - data.correct, "source": data.source, "date": datetime.now().strftime("%Y-%m-%d"), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.question_logs.insert_one(doc)
    await db.notebooks.update_one({"notebook_id": data.notebook_id, "user_id": user.user_id}, {"$inc": {"total_questions": data.total, "correct_questions": data.correct}})
    new_xp, new_rank = await award_xp(user.user_id, data.correct)
    await update_study_streak(user.user_id)
    doc.pop("_id", None)
    return {**doc, "xp_earned": data.correct, "new_xp": new_xp}


# ------------------------------------------------------------------ streak

@router.get("/streak")
async def get_streak(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    streak = await db.study_streaks.find_one({"user_id": user.user_id}, {"_id": 0})
    if not streak:
        return {"current_streak": 0, "best_streak": 0, "total_study_days": 0}
    return streak


# ------------------------------------------------------------------ focus

@router.post("/focus/complete")
async def complete_focus(request: Request, data: FocusSessionCreate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    xp = max(3, (data.focus_minutes // 25) * 5)
    doc = {"focus_id": f"focus_{uuid.uuid4().hex[:12]}", "user_id": user.user_id, "notebook_id": data.notebook_id, "focus_minutes": data.focus_minutes, "break_minutes": data.break_minutes, "completed": True, "date": datetime.now().strftime("%Y-%m-%d"), "notes": data.notes, "xp_earned": xp, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.focus_sessions.insert_one(doc)
    if data.notebook_id:
        await db.notebooks.update_one({"notebook_id": data.notebook_id, "user_id": user.user_id}, {"$inc": {"total_study_time_minutes": data.focus_minutes}})
    new_xp, new_rank = await award_xp(user.user_id, xp)
    await update_study_streak(user.user_id)
    doc.pop("_id", None)
    return {**doc, "new_xp": new_xp, "new_rank": new_rank}


# ------------------------------------------------------------------ ai chat

@router.post("/ai-chat")
async def study_ai_chat(request: Request, data: dict, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    message = data.get("message", "")
    notebook_id = data.get("notebook_id")
    context_type = data.get("context_type", "general")

    context = ""
    if notebook_id:
        nb = await db.notebooks.find_one({"notebook_id": notebook_id, "user_id": user.user_id}, {"_id": 0})
        if nb:
            context += f"\nMatéria: {nb.get('name', '')}"

    system_map = {
        "general": "Tutor de estudos inteligente e paciente. Ajude a entender conceitos. Responda em português.",
        "explain": "Professor especialista. Explique com exemplos práticos. Responda em português.",
        "quiz_help": "Especialista em provas. Resolva questões e explique. Responda em português.",
        "summarize": "Especialista em resumos. Use bullet points. Responda em português.",
        "motivate": "Coach motivacional de estudos. Seja energético e positivo. Responda em português.",
    }

    try:
        response = await call_llm(f"{context}\n\nPergunta: {message}" if context else message, f"study_{user.user_id}", system_map.get(context_type, system_map["general"]))
        return {"response": response, "context_type": context_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

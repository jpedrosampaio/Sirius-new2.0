"""
Sirius Backend - Modular FastAPI Application
Entry point: main.py

Structure:
  core/       - database, auth, llm, utils
  models/     - Pydantic schemas per domain
  routers/    - APIRouter per domain
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from core.database import connect_db, close_db
from core.llm import init_gemini

# ── routers ──────────────────────────────────────────────────────────────────
from routers.auth import router as auth_router
from routers.tasks import router as tasks_router
from routers.habits import router as habits_router
from routers.goals import router as goals_router
from routers.finance import router as finance_router
from routers.workouts import router as workouts_router
from routers.study import router as study_router
from routers.nutrition import router as nutrition_router
from routers.notifications import router as notifications_router
from routers.achievements import router as achievements_router
from routers.chat import router as chat_router
from routers.body_measurements import router as body_router
from routers.reports import router as reports_router
from routers.stats import router as stats_router

# ─────────────────────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)

# ── lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    await connect_db()
    init_gemini()
    logging.info("✅ Database connected | Gemini initialised")

    # Optional: auto-configure Telegram webhook on startup
    _setup_telegram_webhook()

    yield

    # shutdown
    await close_db()
    logging.info("🛑 Database connection closed")


def _setup_telegram_webhook():
    """Best-effort Telegram webhook registration at startup."""
    import httpx, asyncio

    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    backend_url = os.environ.get("BACKEND_PUBLIC_URL", "").rstrip("/")
    if not token or not backend_url:
        return

    async def _register():
        url = f"{backend_url}/api/telegram/webhook/{token}"
        try:
            async with httpx.AsyncClient() as c:
                r = await c.post(
                    f"https://api.telegram.org/bot{token}/setWebhook",
                    json={"url": url, "allowed_updates": ["message"]},
                    timeout=10,
                )
                if r.json().get("ok"):
                    logging.info(f"Telegram webhook → {url}")
                else:
                    logging.warning(f"Telegram webhook failed: {r.text}")
        except Exception as e:
            logging.warning(f"Telegram webhook setup error: {e}")

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_register())
        else:
            loop.run_until_complete(_register())
    except Exception:
        pass


# ── app ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Sirius API",
    description="Discipline is Destiny",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── register routers ──────────────────────────────────────────────────────────

PREFIX = "/api"

app.include_router(auth_router,          prefix=f"{PREFIX}")
app.include_router(tasks_router,         prefix=f"{PREFIX}")
app.include_router(habits_router,        prefix=f"{PREFIX}")
app.include_router(goals_router,         prefix=f"{PREFIX}")
app.include_router(finance_router,       prefix=f"{PREFIX}")
app.include_router(workouts_router,      prefix=f"{PREFIX}")
app.include_router(study_router,         prefix=f"{PREFIX}")
app.include_router(nutrition_router,     prefix=f"{PREFIX}")
app.include_router(notifications_router, prefix=f"{PREFIX}")
app.include_router(achievements_router,  prefix=f"{PREFIX}")
app.include_router(chat_router,          prefix=f"{PREFIX}")
app.include_router(body_router,          prefix=f"{PREFIX}")
app.include_router(reports_router,       prefix=f"{PREFIX}")
app.include_router(stats_router,         prefix=f"{PREFIX}")


@app.get(f"{PREFIX}/")
async def root():
    return {"message": "Sirius API - Discipline is Destiny", "version": "2.0.0"}


# ── Telegram webhook (no auth required) ─────────────────────────────────────

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")

if TELEGRAM_BOT_TOKEN:
    from fastapi import Request as FRequest

    @app.post(f"{PREFIX}/telegram/webhook/{{token}}")
    async def telegram_webhook(token: str, request: FRequest):
        if token != TELEGRAM_BOT_TOKEN:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Invalid token")
        try:
            import asyncio
            from services.telegram import handle_telegram_message
            data = await request.json()
            msg = data.get("message", {})
            chat_id = msg.get("chat", {}).get("id")
            text = msg.get("text", "")
            name = msg.get("from", {}).get("first_name", "") or msg.get("from", {}).get("username", "")
            if chat_id and text:
                asyncio.create_task(handle_telegram_message(chat_id, text, name))
        except Exception as e:
            logging.error(f"Telegram webhook error: {e}")
        return {"ok": True}

from datetime import datetime, timezone, timedelta
from typing import List

from core.database import get_database


# ---------------------------------------------------------------------------
# Rank calculation
# ---------------------------------------------------------------------------

RANK_THRESHOLDS = [
    (0, "Recruta"),
    (200, "Soldado"),
    (500, "Cabo"),
    (1000, "Sargento"),
    (1800, "Subtenente"),
    (3000, "Tenente"),
    (4500, "Capitão"),
    (6500, "Major"),
    (9000, "Tenente-Coronel"),
    (12000, "Coronel"),
    (16000, "General de Brigada"),
    (21000, "General de Divisão"),
    (27000, "General de Exército"),
    (35000, "Marechal"),
]


def calculate_rank(xp: int) -> str:
    for threshold, rank in reversed(RANK_THRESHOLDS):
        if xp >= threshold:
            return rank
    return "Recruta"


# ---------------------------------------------------------------------------
# XP helpers
# ---------------------------------------------------------------------------

async def award_xp(user_id: str, amount: int):
    """Award (or deduct, if negative) XP and update rank."""
    db = get_database()
    user_doc = await db.users.find_one({"user_id": user_id}, {"xp": 1})
    current_xp = user_doc.get("xp", 0) if user_doc else 0
    new_xp = max(0, current_xp + amount)
    new_rank = calculate_rank(new_xp)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"xp": new_xp, "rank": new_rank}},
    )
    return new_xp, new_rank


# ---------------------------------------------------------------------------
# Habit streak helpers
# ---------------------------------------------------------------------------

def calculate_streak(completions: List[str]) -> int:
    if not completions:
        return 0
    today = datetime.now(timezone.utc).date()
    dates = sorted([datetime.fromisoformat(d).date() for d in completions], reverse=True)
    if dates[0] not in (today, today - timedelta(days=1)):
        return 0
    streak = 1
    for i in range(len(dates) - 1):
        if (dates[i] - dates[i + 1]).days == 1:
            streak += 1
        else:
            break
    return streak


def calculate_best_streak(completions: List[str]) -> int:
    if not completions:
        return 0
    dates = sorted([datetime.fromisoformat(d).date() for d in completions])
    if len(dates) == 1:
        return 1
    best = current = 1
    for i in range(1, len(dates)):
        if (dates[i] - dates[i - 1]).days == 1:
            current += 1
            best = max(best, current)
        else:
            current = 1
    return best


# ---------------------------------------------------------------------------
# Study streak helper
# ---------------------------------------------------------------------------

async def update_study_streak(user_id: str):
    db = get_database()
    today = datetime.now().strftime("%Y-%m-%d")
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    streak = await db.study_streaks.find_one({"user_id": user_id}, {"_id": 0})
    if not streak:
        import uuid
        await db.study_streaks.insert_one({
            "streak_id": f"streak_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "current_streak": 1,
            "best_streak": 1,
            "last_study_date": today,
            "total_study_days": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return

    last = streak.get("last_study_date")
    if last == today:
        return

    if last == yesterday:
        new_streak = streak.get("current_streak", 0) + 1
        best = max(streak.get("best_streak", 0), new_streak)
        await db.study_streaks.update_one(
            {"user_id": user_id},
            {"$set": {
                "current_streak": new_streak,
                "best_streak": best,
                "last_study_date": today,
                "total_study_days": streak.get("total_study_days", 0) + 1,
            }},
        )
    else:
        await db.study_streaks.update_one(
            {"user_id": user_id},
            {"$set": {
                "current_streak": 1,
                "last_study_date": today,
                "total_study_days": streak.get("total_study_days", 0) + 1,
            }},
        )

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Cookie, HTTPException, Request

from core.auth import get_current_user
from core.database import get_database
from models.finance import (
    Budget,
    BudgetCreate,
    Projection,
    ProjectionCreate,
    Transaction,
    TransactionCreate,
)

router = APIRouter(tags=["finance"])

# ------------------------------------------------------------------ helpers

DEFAULT_CATEGORIES = [
    "alimentação", "transporte", "moradia", "saúde", "educação",
    "lazer", "investimentos", "salário", "freelance", "outros",
]


def _next_month_str(base_date: datetime) -> str:
    nm = base_date.month + 1
    ny = base_date.year + (nm - 1) // 12
    nm = ((nm - 1) % 12) + 1
    return f"{ny}-{nm:02d}"


# ----------------------------------------------------------------- transactions

@router.get("/transactions")
async def get_transactions(
    request: Request,
    month: Optional[str] = None,
    session_token: Optional[str] = Cookie(None),
):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    query = {"user_id": user.user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    txns = await db.transactions.find(query, {"_id": 0}).to_list(1000)
    for t in txns:
        if isinstance(t.get("created_at"), str):
            t["created_at"] = datetime.fromisoformat(t["created_at"])
    return txns


@router.post("/transactions")
async def create_transaction(
    request: Request,
    tx: TransactionCreate,
    session_token: Optional[str] = Cookie(None),
):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    tx_id = f"trans_{uuid.uuid4().hex[:12]}"
    doc = {
        "transaction_id": tx_id,
        "user_id": user.user_id,
        "type": tx.type,
        "amount": tx.amount,
        "category": tx.category,
        "description": tx.description,
        "date": tx.date,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.transactions.insert_one(doc)
    # update budget spent
    if tx.type == "expense":
        budget = await db.budgets.find_one({"user_id": user.user_id, "category": tx.category, "month": tx.date[:7]}, {"_id": 0})
        if budget:
            await db.budgets.update_one({"budget_id": budget["budget_id"]}, {"$inc": {"spent": tx.amount}})
    doc.pop("_id", None)
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return Transaction(**doc)


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    request: Request,
    transaction_id: str,
    session_token: Optional[str] = Cookie(None),
):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    tx = await db.transactions.find_one({"transaction_id": transaction_id, "user_id": user.user_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await db.projections.delete_many({"source_transaction_id": transaction_id, "user_id": user.user_id})
    await db.transactions.delete_one({"transaction_id": transaction_id})
    return {"message": "Transaction and related projections deleted"}


# ------------------------------------------------------------------ budgets

@router.get("/budgets")
async def get_budgets(
    request: Request,
    month: Optional[str] = None,
    session_token: Optional[str] = Cookie(None),
):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    query = {"user_id": user.user_id}
    if month:
        query["month"] = month
    budgets = await db.budgets.find(query, {"_id": 0}).to_list(1000)
    for b in budgets:
        if isinstance(b.get("created_at"), str):
            b["created_at"] = datetime.fromisoformat(b["created_at"])
    return budgets


@router.post("/budgets")
async def create_budget(
    request: Request,
    data: BudgetCreate,
    session_token: Optional[str] = Cookie(None),
):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    existing = await db.budgets.find_one({"user_id": user.user_id, "category": data.category, "month": data.month})
    if existing:
        raise HTTPException(status_code=400, detail="Budget already exists for this category and month")
    bid = f"budget_{uuid.uuid4().hex[:12]}"
    doc = {
        "budget_id": bid,
        "user_id": user.user_id,
        "category": data.category,
        "limit": data.limit,
        "spent": 0,
        "month": data.month,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.budgets.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return Budget(**doc)


# ------------------------------------------------------------------ stats / trend

@router.get("/finance/stats")
async def finance_stats(
    request: Request,
    month: Optional[str] = None,
    session_token: Optional[str] = Cookie(None),
):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    txns = await db.transactions.find({"user_id": user.user_id, "date": {"$regex": f"^{month}"}}, {"_id": 0}).to_list(1000)
    exp_cat: dict = {}
    inc_cat: dict = {}
    for t in txns:
        if t["type"] == "expense":
            exp_cat[t["category"]] = exp_cat.get(t["category"], 0) + t["amount"]
        else:
            inc_cat[t["category"]] = inc_cat.get(t["category"], 0) + t["amount"]
    return {
        "expense_by_category": exp_cat,
        "income_by_category": inc_cat,
        "total_expense": sum(exp_cat.values()),
        "total_income": sum(inc_cat.values()),
    }


@router.get("/finance/trend")
async def finance_trend(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    today = datetime.now(timezone.utc)
    result = []
    for i in range(5, -1, -1):
        md = today - timedelta(days=i * 30)
        ms = md.strftime("%Y-%m")
        txns = await db.transactions.find({"user_id": user.user_id, "date": {"$regex": f"^{ms}"}}, {"_id": 0}).to_list(500)
        inc = sum(t["amount"] for t in txns if t["type"] == "income")
        exp = sum(t["amount"] for t in txns if t["type"] == "expense")
        result.append({
            "month": md.strftime("%b/%y"),
            "month_key": ms,
            "receitas": round(inc, 2),
            "despesas": round(exp, 2),
            "saldo": round(inc - exp, 2),
            "economia": round((inc - exp) / inc * 100, 1) if inc > 0 else 0,
        })
    total_inc = sum(m["receitas"] for m in result)
    total_exp = sum(m["despesas"] for m in result)
    return {
        "trend": result,
        "summary": {
            "total_income_6m": round(total_inc, 2),
            "total_expense_6m": round(total_exp, 2),
            "avg_monthly_expense": round(total_exp / 6, 2),
            "savings_rate": round((total_inc - total_exp) / total_inc * 100, 1) if total_inc > 0 else 0,
            "best_month": max(result, key=lambda m: m["saldo"])["month"] if result else None,
            "worst_month": min(result, key=lambda m: m["saldo"])["month"] if result else None,
        },
    }


# ------------------------------------------------------------------ categories

@router.get("/finance/categories")
async def get_categories(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    custom = await db.finance_categories.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    all_cats = [{"name": c, "is_default": True} for c in DEFAULT_CATEGORIES]
    for c in custom:
        if c["name"] not in DEFAULT_CATEGORIES:
            all_cats.append({"name": c["name"], "is_default": False, "icon": c.get("icon", ""), "color": c.get("color", "")})
    return {"categories": all_cats}


@router.post("/finance/categories")
async def create_category(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    body = await request.json()
    name = body.get("name", "").strip().lower()
    if not name:
        raise HTTPException(status_code=400, detail="Nome é obrigatório")
    if len(name) > 30:
        raise HTTPException(status_code=400, detail="Nome muito longo")
    if name in [c.lower() for c in DEFAULT_CATEGORIES]:
        raise HTTPException(status_code=400, detail="Categoria já existe como padrão")
    if await db.finance_categories.find_one({"user_id": user.user_id, "name": name}):
        raise HTTPException(status_code=400, detail="Categoria já existe")
    await db.finance_categories.insert_one({
        "cat_id": f"cat_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "name": name,
        "icon": body.get("icon", ""),
        "color": body.get("color", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"success": True, "category": {"name": name, "is_default": False}}


@router.delete("/finance/categories/{category_name}")
async def delete_category(request: Request, category_name: str, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    name = category_name.lower().strip()
    if name in [c.lower() for c in DEFAULT_CATEGORIES]:
        raise HTTPException(status_code=400, detail="Não é possível excluir categorias padrão")
    result = await db.finance_categories.delete_one({"user_id": user.user_id, "name": name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return {"success": True}


# ------------------------------------------------------------------ projections

@router.get("/projections")
async def get_projections(
    request: Request,
    month: Optional[str] = None,
    session_token: Optional[str] = Cookie(None),
):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    if not month:
        month = _next_month_str(datetime.now(timezone.utc))
    projs = await db.projections.find({"user_id": user.user_id, "month": month}, {"_id": 0}).to_list(1000)
    for p in projs:
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"])
    return projs


@router.post("/projections")
async def create_projection(
    request: Request,
    data: ProjectionCreate,
    session_token: Optional[str] = Cookie(None),
):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    pid = f"proj_{uuid.uuid4().hex[:12]}"
    doc = {
        "projection_id": pid,
        "user_id": user.user_id,
        "month": data.month,
        "description": data.description,
        "amount": data.amount,
        "category": data.category,
        "projection_type": "manual",
        "is_fixed": data.is_fixed,
        "repeat_count": data.repeat_count if not data.is_fixed else None,
        "remaining_repeats": data.repeat_count if not data.is_fixed else None,
        "source_transaction_id": None,
        "installment_number": None,
        "total_installments": None,
        "card_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.projections.insert_one(doc)

    base_y = int(data.month.split("-")[0])
    base_m = int(data.month.split("-")[1])
    repeats = 12 if data.is_fixed else (data.repeat_count - 1 if data.repeat_count else 0)
    for i in range(1, repeats + 1):
        total_m = base_m + i
        fy = base_y + (total_m - 1) // 12
        fm = ((total_m - 1) % 12) + 1
        future_doc = {**doc, "projection_id": f"proj_{uuid.uuid4().hex[:12]}", "month": f"{fy}-{fm:02d}"}
        await db.projections.insert_one(future_doc)

    doc.pop("_id", None)
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return Projection(**doc)


@router.delete("/projections/{projection_id}")
async def delete_projection(request: Request, projection_id: str, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    result = await db.projections.delete_one({"projection_id": projection_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Projection not found")
    return {"message": "Projection deleted"}


@router.get("/projections/summary")
async def projection_summary(
    request: Request,
    month: Optional[str] = None,
    session_token: Optional[str] = Cookie(None),
):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    if not month:
        month = _next_month_str(datetime.now(timezone.utc))
    projs = await db.projections.find({"user_id": user.user_id, "month": month}, {"_id": 0}).to_list(1000)
    cat_totals: dict = {}
    total = fixed = installment = manual = 0.0
    for p in projs:
        cat_totals[p.get("category", "outros")] = cat_totals.get(p.get("category", "outros"), 0) + p["amount"]
        total += p["amount"]
        if p.get("is_fixed"):
            fixed += p["amount"]
        elif p.get("projection_type") == "installment":
            installment += p["amount"]
        else:
            manual += p["amount"]
    curr = datetime.now(timezone.utc).strftime("%Y-%m")
    inc_txns = await db.transactions.find({"user_id": user.user_id, "type": "income", "date": {"$regex": f"^{curr}"}}, {"_id": 0}).to_list(500)
    est_income = sum(t["amount"] for t in inc_txns)
    return {
        "month": month,
        "total_projected_expenses": total,
        "fixed_expenses": fixed,
        "installment_expenses": installment,
        "manual_expenses": manual,
        "categories_totals": cat_totals,
        "estimated_income": est_income,
        "estimated_balance": est_income - total,
        "projections_count": len(projs),
    }

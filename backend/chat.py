import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, HTTPException, Request

from core.auth import get_current_user
from core.database import get_database
from core.llm import call_llm
from models.misc import ChatMessageCreate

router = APIRouter(prefix="/chat", tags=["chat"])

INCOME_KW = ["ganhei", "recebi", "entrou", "salário", "salario", "renda", "recebimento", "depósito", "deposito", "pix recebido", "crédito", "credito", "freelance", "bônus", "bonus", "vendi", "entrada de", "reembolso"]
EXPENSE_KW = ["gastei", "paguei", "comprei", "compra de", "boleto", "parcela", "débito", "debito", "saída", "saida", "pix enviado", "transferi", "aluguel", "supermercado", "mercado", "restaurante", "combustível", "gasolina"]
REPORT_KW = ["relatório", "relatorio", "resumo financeiro", "analise financeira", "análise financeira", "como estão minhas finanças", "saldo", "quanto gastei", "quanto ganhei", "balanço financeiro", "extrato"]
HELP_KW = ["ajuda", "help", "o que você pode fazer", "comandos", "funcionalidades"]
LIST_KW = ["listar transações", "mostrar transações", "ver gastos", "ver receitas", "últimas transações", "ultimas transacoes"]
AMOUNT_RE = re.compile(r"(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)")


async def _get_finance_context(user_id: str, db):
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    txns = await db.transactions.find({"user_id": user_id, "date": {"$regex": f"^{month}"}}, {"_id": 0}).to_list(500)
    total_in = sum(t["amount"] for t in txns if t["type"] == "income")
    total_out = sum(t["amount"] for t in txns if t["type"] == "expense")
    exp_cat: dict = {}
    inc_cat: dict = {}
    for t in txns:
        if t["type"] == "expense":
            exp_cat[t["category"]] = exp_cat.get(t["category"], 0) + t["amount"]
        else:
            inc_cat[t["category"]] = inc_cat.get(t["category"], 0) + t["amount"]
    budgets = await db.budgets.find({"user_id": user_id, "month": month}, {"_id": 0}).to_list(100)
    return total_in, total_out, total_in - total_out, txns, exp_cat, inc_cat, budgets, month


def _detect_intent(content_lower: str, has_amount: bool):
    is_income = any(k in content_lower for k in INCOME_KW)
    is_expense = any(k in content_lower for k in EXPENSE_KW)
    if is_income and is_expense and has_amount:
        return "mixed"
    if is_income and has_amount:
        return "income"
    if is_expense and has_amount:
        return "expense"
    if any(k in content_lower for k in REPORT_KW):
        return "report"
    if any(k in content_lower for k in LIST_KW):
        return "list"
    if any(k in content_lower for k in HELP_KW):
        return "help"
    return "general"


async def _register_transactions(user_id: str, db, txn_list: list, default_type: str) -> list:
    registered = []
    for td in txn_list:
        amt = float(td.get("amount", 0))
        if amt <= 0:
            continue
        t_type = td.get("type", default_type)
        if t_type not in ("income", "expense"):
            t_type = default_type
        doc = {
            "transaction_id": f"trans_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "type": t_type,
            "amount": amt,
            "category": td.get("category", "outros"),
            "description": td.get("description", ""),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.transactions.insert_one(doc)
        registered.append({**td, "type": t_type, "amount": amt})
    return registered


async def _parse_llm_json(prompt: str, session_id: str) -> list:
    resp = await call_llm(prompt, session_id)
    clean = resp.strip()
    if "```" in clean:
        clean = clean.split("```")[1].replace("json", "").strip()
    start, end = clean.find("["), clean.rfind("]") + 1
    if start != -1 and end > start:
        return json.loads(clean[start:end])
    start, end = clean.find("{"), clean.rfind("}") + 1
    if start != -1 and end > start:
        return [json.loads(clean[start:end])]
    return []


@router.get("/messages")
async def get_messages(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    msgs = await db.chat_messages.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    for m in msgs:
        if isinstance(m.get("created_at"), str):
            m["created_at"] = datetime.fromisoformat(m["created_at"])
    return msgs


@router.post("/send")
async def send_message(request: Request, data: ChatMessageCreate, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request.headers.get("Authorization"), session_token)
    db = get_database()
    content = data.content.strip()
    cl = content.lower()
    has_amount = bool(AMOUNT_RE.search(content))
    intent = _detect_intent(cl, has_amount)

    # Save user message
    msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    user_msg = {"message_id": msg_id, "user_id": user.user_id, "role": "user", "content": content, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.chat_messages.insert_one(user_msg.copy())

    total_in, total_out, balance, txns, exp_cat, inc_cat, budgets, month = await _get_finance_context(user.user_id, db)
    action_taken = None
    ai_text = ""

    try:
        if intent == "help":
            ai_text = """🤖 **Comandos disponíveis:**

💰 **Registrar transações:**
- "Recebi 5000 de salário"
- "Gastei 50 no mercado e 30 de uber"

📊 **Relatórios:** "Como estão minhas finanças?" / "Resumo do mês"

📋 **Listar:** "Mostrar últimas transações"

📝 **Orçamentos:** "Criar orçamento de 500 para alimentação"

**Categorias:** alimentação, transporte, moradia, saúde, educação, lazer, salário, outros"""

        elif intent == "list":
            recent = txns[-10:]
            if not recent:
                ai_text = "📋 Nenhuma transação este mês."
            else:
                ai_text = "📋 **Últimas Transações:**\n\n"
                for t in reversed(recent):
                    e = "💚" if t["type"] == "income" else "🔴"
                    s = "+" if t["type"] == "income" else "-"
                    ai_text += f"{e} {t['date']} | {s}R$ {t['amount']:.2f} | {t['category']}"
                    if t.get("description"):
                        ai_text += f" | {t['description']}"
                    ai_text += "\n"

        elif intent in ("income", "expense", "mixed"):
            type_hint = "income" if intent == "income" else ("expense" if intent == "expense" else None)
            cat_income = "salário, freelance, investimentos, vendas, reembolso, outros"
            cat_expense = "alimentação, transporte, moradia, saúde, educação, lazer, outros"
            if intent == "income":
                prompt = f'Extraia TODAS as receitas desta mensagem: "{content}"\nJSON array: [{{"amount":0.0,"category":"salário","description":"..."}}]\nCategorias: {cat_income}\nSOMENTE o JSON array.'
            elif intent == "expense":
                prompt = f'Extraia TODAS as despesas desta mensagem: "{content}"\nJSON array: [{{"amount":0.0,"category":"alimentação","description":"..."}}]\nCategorias: {cat_expense}\nSOMENTE o JSON array.'
            else:
                prompt = f'Extraia TODAS as transações (receitas E despesas) desta mensagem: "{content}"\nJSON array: [{{"type":"income/expense","amount":0.0,"category":"...","description":"..."}}]\nSOMENTE o JSON array.'

            items = await _parse_llm_json(prompt, f"chat_{user.user_id}")
            registered = await _register_transactions(user.user_id, db, items, type_hint or "expense")

            if registered:
                action_taken = registered if len(registered) > 1 else registered[0]
                running_bal = balance
                for r in registered:
                    running_bal += r["amount"] if r["type"] == "income" else -r["amount"]

                if len(registered) == 1:
                    r = registered[0]
                    e = "💰" if r["type"] == "income" else "🔴"
                    ai_text = f"✅ **Registrado!**\n\n{e} R$ {r['amount']:.2f} | {r.get('category','outros')} | {r.get('description','-')}\n\n📊 Novo Saldo: R$ {running_bal:.2f}"
                else:
                    total_r = sum(r["amount"] for r in registered if r["type"] == "income")
                    total_e = sum(r["amount"] for r in registered if r["type"] == "expense")
                    ai_text = f"✅ **{len(registered)} transações registradas!**\n\n"
                    for i, r in enumerate(registered, 1):
                        e = "💰" if r["type"] == "income" else "🔴"
                        ai_text += f"**{i}.** {e} R$ {r['amount']:.2f} | {r.get('category','outros')} | {r.get('description','-')}\n"
                    if total_r:
                        ai_text += f"\n💰 Receitas: R$ {total_r:.2f}"
                    if total_e:
                        ai_text += f"\n💸 Despesas: R$ {total_e:.2f}"
                    ai_text += f"\n📊 Novo Saldo: R$ {running_bal:.2f}"
            else:
                ai_text = "❌ Não consegui processar. Tente: 'Gastei 50 no mercado'"

        elif intent == "report":
            top_exp = sorted(exp_cat.items(), key=lambda x: x[1], reverse=True)[:5]
            ai_text = f"""📊 **RELATÓRIO - {month}**

💰 Receitas: R$ {total_in:.2f}
💸 Despesas: R$ {total_out:.2f}
**Saldo: R$ {balance:.2f}** {"✅" if balance >= 0 else "⚠️"}

📉 **Maiores gastos:**
""" + "\n".join(f"- {c}: R$ {v:.2f}" for c, v in top_exp)
            if budgets:
                ai_text += "\n\n📋 **Orçamentos:**\n"
                for b in budgets:
                    pct = (b["spent"] / b["limit"]) * 100 if b["limit"] > 0 else 0
                    st = "🔴" if pct >= 100 else "🟡" if pct >= 80 else "🟢"
                    ai_text += f"- {b['category']}: {pct:.0f}% {st}\n"

        else:
            ctx = f"""Finanças do usuário ({month}):
- Receitas: R$ {total_in:.2f} | Despesas: R$ {total_out:.2f} | Saldo: R$ {balance:.2f}
- Top gastos: {json.dumps(dict(sorted(exp_cat.items(), key=lambda x: x[1], reverse=True)[:5]), ensure_ascii=False)}"""
            prompt = f"""{ctx}\n\nMensagem: "{content}"\n\nResponda de forma útil e concisa em português."""
            ai_text = await call_llm(prompt, f"chat_{user.user_id}", "Assistente financeiro do Sirius. Seja direto e útil.")

    except Exception as e:
        logging.error(f"Chat error: {e}")
        ai_text = "⚠️ Erro ao processar. Tente novamente."

    ai_msg = {"message_id": f"msg_{uuid.uuid4().hex[:12]}", "user_id": user.user_id, "role": "assistant", "content": ai_text, "created_at": datetime.now(timezone.utc).isoformat()}
    if action_taken:
        ai_msg["transaction_data"] = action_taken
    await db.chat_messages.insert_one(ai_msg.copy())

    user_msg["created_at"] = datetime.fromisoformat(user_msg["created_at"])
    ai_msg["created_at"] = datetime.fromisoformat(ai_msg["created_at"])
    return {"user_message": user_msg, "ai_message": ai_msg}

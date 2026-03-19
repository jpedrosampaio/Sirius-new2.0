"""
Telegram bot service — handles incoming messages and sends replies.
Extracted from the monolithic server.py into a dedicated service module.
"""

import json
import logging
import random
import uuid
from datetime import datetime, timezone

import httpx

from core.database import get_database
from core.llm import call_llm

BOT_TOKEN: str = ""

FALLBACK_QUOTES = [
    "🔥 A dor do treino é temporária. A dor do arrependimento é permanente.",
    "⚔️ Guerreiros não nascem. São forjados no fogo da disciplina diária.",
    "🎯 Enquanto outros dormem, você constrói seu império.",
    "⚡ Sua única competição é quem você era ontem.",
    "💎 Diamantes são apenas pedras que não desistiram sob pressão.",
    "🏆 Champions são feitos quando ninguém está olhando.",
]


def init_telegram(token: str):
    global BOT_TOKEN
    BOT_TOKEN = token


async def send_message(chat_id: int, text: str, parse_mode: str = None):
    if not BOT_TOKEN:
        return
    payload = {"chat_id": chat_id, "text": text}
    if parse_mode:
        payload["parse_mode"] = parse_mode
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage", json=payload, timeout=10)
            result = r.json()
            if not result.get("ok") and parse_mode:
                payload.pop("parse_mode", None)
                await c.post(f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage", json=payload, timeout=10)
    except Exception as e:
        logging.error(f"Telegram send error: {e}")


async def handle_telegram_message(chat_id: int, text: str, telegram_name: str = ""):
    db = get_database()
    text = text.strip()

    # /start
    if text.startswith("/start"):
        await send_message(chat_id, (
            "🌟 *Bem-vindo ao Sirius Bot!*\n\n"
            "📝 Registre transações:\n• `Gastei 50 no mercado`\n• `Recebi 3000 de salário`\n\n"
            "📊 Consulte dados:\n/resumo /saldo /metas /mes /frase\n\n"
            "🔗 Vincule sua conta:\n/vincular CODIGO\n\n❓ /ajuda"
        ), parse_mode="Markdown")
        return

    if text.startswith("/ajuda") or text.startswith("/help"):
        await send_message(chat_id, (
            "📋 *Comandos:*\n\n"
            "🔗 `/vincular CODIGO` - Vincular conta\n"
            "💰 `/saldo` - Saldo atual\n📊 `/resumo` - Resumo do dia\n"
            "🎯 `/metas` - Metas ativas\n📅 `/mes` - Resumo mensal\n"
            "💪 `/frase` - Motivação\n❓ `/ajuda` - Esta mensagem\n\n"
            "💡 Envie mensagens naturais:\n• `Gastei 150 no supermercado`\n• `Recebi 500 de freelance`"
        ), parse_mode="Markdown")
        return

    # /vincular
    if text.startswith("/vincular"):
        parts = text.split()
        if len(parts) < 2:
            await send_message(chat_id, "⚠️ Use: /vincular CODIGO\n\nGere o código no app Sirius em Configurações > Telegram.")
            return
        code = parts[1].upper()
        link_code = await db.telegram_link_codes.find_one({"code": code}, {"_id": 0})
        if not link_code:
            await send_message(chat_id, "❌ Código inválido ou expirado. Gere um novo código no app.")
            return
        expires = datetime.fromisoformat(link_code["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires:
            await send_message(chat_id, "⏰ Código expirado. Gere um novo no app.")
            await db.telegram_link_codes.delete_one({"code": code})
            return
        user_id = link_code["user_id"]
        await db.telegram_links.update_many({"user_id": user_id, "status": "active"}, {"$set": {"status": "inactive"}})
        await db.telegram_links.update_many({"chat_id": chat_id, "status": "active"}, {"$set": {"status": "inactive"}})
        await db.telegram_links.insert_one({"user_id": user_id, "chat_id": chat_id, "telegram_name": telegram_name, "status": "active", "linked_at": datetime.now(timezone.utc).isoformat()})
        await db.telegram_link_codes.delete_one({"code": code})
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        name = user_doc.get("name", "Usuário") if user_doc else "Usuário"
        await send_message(chat_id, f"✅ *Conta vinculada!*\n\nOlá, {name}! 🎉\nAgora registre transações diretamente aqui.", parse_mode="Markdown")
        return

    # All other commands need a linked account
    link = await db.telegram_links.find_one({"chat_id": chat_id, "status": "active"}, {"_id": 0})
    if not link:
        await send_message(chat_id, "🔒 Vincule sua conta primeiro!\n\n1️⃣ Abra o app Sirius\n2️⃣ Configurações > Telegram\n3️⃣ /vincular CODIGO")
        return

    user_id = link["user_id"]

    if text.startswith("/saldo"):
        txns = await db.transactions.find({"user_id": user_id}).to_list(10000)
        total_in = sum(t.get("amount", 0) for t in txns if t.get("type") == "income")
        total_out = sum(t.get("amount", 0) for t in txns if t.get("type") == "expense")
        month = datetime.now().strftime("%Y-%m")
        m_txns = [t for t in txns if t.get("date", "").startswith(month)]
        m_in = sum(t.get("amount", 0) for t in m_txns if t.get("type") == "income")
        m_out = sum(t.get("amount", 0) for t in m_txns if t.get("type") == "expense")
        await send_message(chat_id, f"📊 *Saldo*\n\n💰 Total: R$ {total_in - total_out:,.2f}\n\n📅 Este mês:\n↗️ Receitas: R$ {m_in:,.2f}\n↘️ Despesas: R$ {m_out:,.2f}\n📊 Balanço: R$ {m_in - m_out:,.2f}", parse_mode="Markdown")
        return

    if text.startswith("/resumo"):
        today = datetime.now().strftime("%Y-%m-%d")
        today_txns = await db.transactions.find({"user_id": user_id, "date": today}).to_list(100)
        if not today_txns:
            await send_message(chat_id, "📋 Nenhuma transação hoje.\n\nEnvie algo como `Gastei 50 no almoço`!")
            return
        inc = sum(t.get("amount", 0) for t in today_txns if t.get("type") == "income")
        exp = sum(t.get("amount", 0) for t in today_txns if t.get("type") == "expense")
        msg = f"📊 *Resumo de Hoje*\n\n↗️ Receitas: R$ {inc:,.2f}\n↘️ Despesas: R$ {exp:,.2f}\n📝 {len(today_txns)} transações"
        await send_message(chat_id, msg, parse_mode="Markdown")
        return

    if text.startswith("/metas"):
        goals = await db.goals.find({"user_id": user_id}).to_list(20)
        if not goals:
            await send_message(chat_id, "🎯 Nenhuma meta cadastrada. Crie no app Sirius!")
            return
        msg = "🎯 *Suas Metas*\n\n"
        for g in goals:
            p = g.get("progress", 0)
            bar = "█" * int(p / 10) + "░" * (10 - int(p / 10))
            msg += f"• {g.get('title','')}\n  [{bar}] {p}%\n\n"
        await send_message(chat_id, msg, parse_mode="Markdown")
        return

    if text.startswith("/mes"):
        month = datetime.now().strftime("%Y-%m")
        m_txns = await db.transactions.find({"user_id": user_id, "date": {"$regex": f"^{month}"}}).to_list(1000)
        inc = sum(t.get("amount", 0) for t in m_txns if t.get("type") == "income")
        exp = sum(t.get("amount", 0) for t in m_txns if t.get("type") == "expense")
        cats: dict = {}
        for t in m_txns:
            if t.get("type") == "expense":
                cats[t.get("category", "outros")] = cats.get(t.get("category", "outros"), 0) + t.get("amount", 0)
        top = sorted(cats.items(), key=lambda x: x[1], reverse=True)[:5]
        msg = f"📅 *Resumo do Mês*\n\n↗️ R$ {inc:,.2f}\n↘️ R$ {exp:,.2f}\n📊 R$ {inc - exp:,.2f}\n\n"
        if top:
            msg += "*Top despesas:*\n" + "".join(f"   • {c.title()}: R$ {v:,.2f}\n" for c, v in top)
        await send_message(chat_id, msg, parse_mode="Markdown")
        return

    if text.startswith("/frase"):
        try:
            quote = await call_llm("Gere UMA frase motivacional única e impactante. 1-2 emojis. Máximo 2 linhas. Apenas a frase.", f"tg_quote_{user_id}", "Mestre motivacional.", raise_on_error=True)
            await send_message(chat_id, quote.strip())
        except Exception:
            await send_message(chat_id, random.choice(FALLBACK_QUOTES))
        return

    # Natural language — try to parse as transaction
    prompt = f"""Analise esta mensagem e determine se é um registro de transação financeira.
Mensagem: "{text}"

Se for uma ou mais transações, responda APENAS com JSON array:
[{{"type":"income/expense","amount":0.0,"description":"...","category":"..."}}]

Categorias receita: salário, freelance, investimentos, vendas, reembolso, outros
Categorias despesa: alimentação, transporte, moradia, saúde, educação, lazer, outros

Se NÃO for uma transação, responda EXATAMENTE: NOT_TRANSACTION"""

    try:
        resp = await call_llm(prompt, f"tg_parse_{user_id}", "Parser de transações financeiras.", raise_on_error=True)
        resp = resp.strip()

        if "NOT_TRANSACTION" in resp:
            chat_resp = await call_llm(f"O usuário disse: '{text}'. Responda brevemente como assistente financeiro. Máximo 3 linhas.", f"tg_chat_{user_id}", "Assistente do Sirius.", raise_on_error=True)
            await send_message(chat_id, chat_resp.strip())
            return

        clean = resp.replace("```json", "").replace("```", "").strip()
        start, end = clean.find("["), clean.rfind("]") + 1
        transactions = json.loads(clean[start:end]) if start != -1 and end > start else []

        if not isinstance(transactions, list):
            transactions = [transactions]

        today = datetime.now().strftime("%Y-%m-%d")
        registered = []
        for txn in transactions:
            amt = float(txn.get("amount", 0))
            if amt <= 0:
                continue
            doc = {"transaction_id": f"txn_{uuid.uuid4().hex[:12]}", "user_id": user_id, "type": txn.get("type", "expense"), "amount": amt, "description": txn.get("description", ""), "category": txn.get("category", "outros"), "date": today, "source": "telegram", "created_at": datetime.now(timezone.utc).isoformat()}
            await db.transactions.insert_one(doc)
            registered.append(doc)

        if len(registered) == 1:
            t = registered[0]
            e = "↗️" if t["type"] == "income" else "↘️"
            await send_message(chat_id, f"✅ Registrado!\n\n{e} {t['description']}\n💰 R$ {t['amount']:,.2f}\n📂 {t['category'].title()}")
        elif registered:
            total = sum(t["amount"] for t in registered)
            msg = f"✅ {len(registered)} transações!\n\n"
            for i, t in enumerate(registered, 1):
                e = "↗️" if t["type"] == "income" else "↘️"
                msg += f"{i}. {e} {t['description']} - R$ {t['amount']:,.2f}\n"
            msg += f"\n💰 Total: R$ {total:,.2f}"
            await send_message(chat_id, msg)
        else:
            await send_message(chat_id, "🤖 Não entendi. Tente:\n• `Gastei 50 no mercado`\n• `Recebi 3000 de salário`\n• /ajuda")

    except json.JSONDecodeError:
        await send_message(chat_id, "🤖 Não entendi. Tente: `Gastei 50 no mercado`\n/ajuda")
    except Exception as e:
        logging.error(f"Telegram handler error: {e}")
        await send_message(chat_id, "⚠️ Erro. Tente novamente.")

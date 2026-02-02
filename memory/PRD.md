# SIRIUS - Product Requirements Document

## Original Problem Statement
Sistema de produtividade e finanças pessoais chamado "Sirius" com:
- **Tarefas Diárias:** Criar, organizar e executar tarefas recorrentes (diárias, semanais, mensais)
- **Sistema de Hábitos:** Registrar sequências de hábitos para construir consistência
- **Controle Financeiro:** Rastrear receitas, despesas, orçamentos, com alertas de estouro e gerenciamento de cartões de crédito
- **Metas & Sprints:** Definir metas divididas em sprints de 60 dias com checkboxes diários
- **Gamificação Militar:** Ganhar XP, subir de ranking (patentes do exército) e desbloquear conquistas
- **Relatórios Inteligentes:** Geração automática de relatórios com IA
- **Chat com IA:** Registrar transações financeiras via texto/conversa
- **Interface:** Tema escuro (dark theme)
- **Autenticação:** E-mail/senha e Google Auth

## User Personas
- Usuário que busca organização pessoal e controle financeiro
- Prefere interface dark/militar
- Valoriza gamificação como motivação

## Core Architecture
```
/app
├── backend/
│   ├── server.py (FastAPI - monolithic)
│   └── .env (MONGO_URL, DB_NAME, EMERGENT_LLM_KEY)
└── frontend/
    └── src/
        ├── components/ (Sidebar, ProtectedRoute)
        └── pages/ (Dashboard, Tasks, Habits, Finance, Goals, Chat, Reports, Profile)
```

## Tech Stack
- **Backend:** FastAPI, Motor (MongoDB async), Pydantic, emergentintegrations (LLM)
- **Frontend:** React, Tailwind CSS, Recharts, Axios
- **Database:** MongoDB
- **AI:** OpenAI GPT-5.2 via Emergent LLM Key

## What's Been Implemented ✅
- [x] Autenticação email/senha e Google Auth
- [x] Dashboard com estatísticas
- [x] Tarefas recorrentes (diárias, semanais, mensais)
- [x] Sistema de hábitos com streaks
- [x] Controle financeiro (transações, orçamentos)
- [x] Gráficos de gastos por categoria (PieChart)
- [x] Gerenciamento de cartões de crédito
- [x] Metas com checkboxes diários
- [x] Gamificação (XP e ranks militares)
- [x] Chat com IA para registro de transações
- [x] Relatórios com IA
- [x] Logo do lobo (Sirius)
- [x] Desafios semanais

## Key API Endpoints
- `/api/auth/register`, `/api/auth/login`, `/api/auth/google-session`, `/api/auth/me`
- `/api/tasks`, `/api/tasks/{task_id}`
- `/api/habits`, `/api/habits/{habit_id}/complete`
- `/api/transactions`, `/api/finance/stats`
- `/api/credit-cards`, `/api/credit-cards/{card_id}/charge`
- `/api/budgets`
- `/api/goals`, `/api/goals/{goal_id}/check`
- `/api/chat/send`, `/api/chat/messages`
- `/api/reports/generate`, `/api/reports/{report_id}/download`
- `/api/challenges/current`

## Database Collections
- users, user_sessions
- tasks, task_instances
- habits
- transactions, budgets
- credit_cards, invoices
- goals
- chat_messages
- reports, achievements, challenges

## Test Credentials
- Email: testsirius@test.com
- Password: Test123!

---

## Backlog / Future Tasks

### P0 (Critical)
- None currently

### P1 (Important)
- [ ] Notificações push para alertas de orçamento
- [ ] Metas de gastos por categoria na página de Finanças
- [ ] Dashboard avançado com gráficos de progresso histórico

### P2 (Nice to Have)
- [ ] Melhorar responsividade mobile completa
- [ ] Refatorar server.py em múltiplos módulos

### P3 (Future)
- [ ] Integração com bancos via Open Banking
- [ ] Export para Excel/PDF mais elaborado

## Bugs Fixed This Session
1. ✅ Endpoints /api/credit-cards e /api/finance/stats retornavam 404 (estavam definidos após app.include_router)
2. ✅ Chat retornava erro de ObjectId (MongoDB inseria _id no documento)
3. ✅ Logo do lobo adicionada ao Sidebar

## Last Updated
2026-02-02

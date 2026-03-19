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
- **Treinos:** Área de treinos com geração por IA, sessões com timer, estatísticas
- **Alimentação:** Controle calórico, dietas, receitas com IA
- **Estudos:** Área de estudos integrada com IA (flashcards, quizzes, simulados, repetição espaçada, importar edital)

## User Personas
- Usuário que busca organização pessoal e controle financeiro
- Prefere interface dark/militar
- Valoriza gamificação como motivação

## Core Architecture
```
/app
├── backend/
│   ├── server.py (FastAPI - monolithic)
│   └── .env (MONGO_URL, DB_NAME, GOOGLE_GEMINI_API_KEY)
└── frontend/
    └── src/
        ├── components/ (Sidebar, ProtectedRoute, ui/)
        └── pages/ (Dashboard, Tasks, Habits, Finance, Goals, Chat, Reports, Profile, Workouts, Nutrition, Studies)
```

## Tech Stack
- **Backend:** FastAPI, Motor (MongoDB async), Pydantic, Google Gemini AI
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Recharts, Axios
- **Database:** MongoDB
- **AI:** Google Gemini 2.5 Flash

## What's Been Implemented
- [x] Autenticação email/senha e Google Auth
- [x] Dashboard com estatísticas
- [x] Tarefas recorrentes (diárias, semanais, mensais)
- [x] Sistema de hábitos com streaks
- [x] Controle financeiro (transações, orçamentos, cartões, projeções)
- [x] Gráficos de gastos por categoria (PieChart)
- [x] Gerenciamento de cartões de crédito com parcelas
- [x] Metas com checkboxes diários
- [x] Gamificação (XP e ranks militares)
- [x] Chat com IA para registro de transações (múltiplas de uma vez)
- [x] Relatórios com IA
- [x] Logo do lobo (Sirius)
- [x] Desafios semanais
- [x] Área de Alimentação (refeições, calorias, água, receitas IA)
- [x] Área de Estudos (programas, cadernos, notas, flashcards, quizzes, simulados, pomodoro, importar edital)
- [x] Área de Treinos (fichas, sessões com timer, estatísticas, evolução)
- [x] Geração de treinos com IA - DUAL MODE (Por Tipo de Treino / Por Período) ✅ NEW
- [x] Split badges e informações de divisão nos cards de treino ✅ NEW

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
- `/api/workout-plans`, `/api/workout-plans/generate` (dual mode: tipo_treino/periodo)
- `/api/workouts`, `/api/workout-stats`
- `/api/nutrition/meals`, `/api/nutrition/goals`, `/api/nutrition/water`
- `/api/study/areas`, `/api/study/notebooks`, `/api/study/notes`
- `/api/study/flashcards`, `/api/study/simulados`
- `/api/study/programs/import-edital`
- `/api/notifications`

## Database Collections
- users, user_sessions
- tasks, task_instances
- habits
- transactions, budgets
- credit_cards, invoices
- goals
- chat_messages
- reports, achievements, challenges
- workout_plans, workout_logs, workout_sessions
- meals, nutrition_goals, water_logs, diets, recipes
- study_areas, notebooks, notes, study_tasks, flashcard_decks, simulados, study_programs

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

## Last Updated
2026-03-19

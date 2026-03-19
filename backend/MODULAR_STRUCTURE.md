# Sirius Backend — Estrutura Modular

O `server.py` monolítico (10.758 linhas) foi refatorado em módulos por domínio.

## Estrutura

```
backend/
├── main.py                   # Entry point FastAPI (lifespan, CORS, registro de routers)
│
├── core/                     # Infraestrutura compartilhada
│   ├── database.py           # Conexão MongoDB (Motor)
│   ├── auth.py               # get_current_user (validação de sessão)
│   ├── llm.py                # Gemini client + call_llm()
│   └── utils.py              # calculate_rank, award_xp, streaks
│
├── models/                   # Schemas Pydantic por domínio
│   ├── user.py               # User, UserCreate, UserLogin
│   ├── finance.py            # Transaction, Budget, CreditCard, Projection…
│   ├── workout.py            # WorkoutPlan, WorkoutLog, BodyMeasurement…
│   ├── study.py              # Notebook, Flashcard, Quiz, Simulado…
│   ├── nutrition.py          # Meal, NutritionGoal, Diet
│   └── misc.py               # Task, Habit, Goal, Notification, ChatMessage
│
├── routers/                  # APIRouter por domínio
│   ├── auth.py               # /auth/*
│   ├── tasks.py              # /tasks/*
│   ├── habits.py             # /habits/*
│   ├── goals.py              # /goals/*
│   ├── finance.py            # /transactions, /budgets, /finance/*, /projections
│   ├── workouts.py           # /workout-plans, /workouts, /workout-stats
│   ├── study.py              # /study/*
│   ├── nutrition.py          # /nutrition/*
│   ├── notifications.py      # /notifications/*
│   ├── achievements.py       # /achievements, /challenges
│   ├── chat.py               # /chat/*
│   ├── body_measurements.py  # /body-measurements/*
│   ├── reports.py            # /reports, /motivational-quote
│   └── stats.py              # /stats/dashboard, /alerts
│
└── services/
    └── telegram.py           # Lógica do bot Telegram (handle + send)
```

## Como iniciar

```bash
# Substituir server.py pelo novo entry point
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## Migração do server.py

O `server.py` original continua funcionando. Para migrar:

1. Copiar os arquivos desta estrutura para a pasta `backend/`
2. Alterar o comando de start de `uvicorn server:app` para `uvicorn main:app`
3. Testar cada domínio com os testes existentes em `tests/`

## Comparativo de tamanho

| Arquivo             | Linhas |
|---------------------|--------|
| server.py (antes)   | ~10.800 |
| main.py             | ~100   |
| core/ (total)       | ~250   |
| models/ (total)     | ~300   |
| routers/ (total)    | ~1.400 |
| services/ (total)   | ~200   |
| **TOTAL NOVO**      | **~2.250** |

Redução de ~79% nas linhas por arquivo. Cada módulo tem responsabilidade única.

## Endpoints preservados (sem breaking changes)

Todos os endpoints mantêm os mesmos paths `/api/*`. Nenhuma alteração na API pública.

## Adicionando novos endpoints

1. Criar (ou editar) o router no módulo correspondente em `routers/`
2. Se necessário, adicionar o modelo em `models/`
3. Registrar o router em `main.py` se for um novo arquivo

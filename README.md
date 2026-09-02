# ESC — Enhanced Study Companion

**Problem statement:** “AI Personalized Learning Assistant — Recommend study plans and learning resources based on student performance.”

ESC is a FastAPI + React application that closes the learning loop instead of acting as a generic chatbot:

`Profile and goal → diagnostic quiz → authoritative backend scoring → topic mastery → diagnosis → plan and resources → task completion / re-test → updated mastery and plan version`

The student’s authenticated SQLite learning memory owns profiles, uploaded material, quizzes, attempts, topic-level results, mastery, diagnoses, plans, tasks, and resource recommendations. No answer key is sent to the browser before submission, and objective grading never uses an LLM.

## Architecture

- `backend/app/db.py` — SQLite connection and idempotent migrations.
- `backend/app/auth.py` — local bearer-session authentication.
- `backend/app/routes/student.py` — authenticated `/api/v1/me/...` product API.
- `backend/app/repositories/student_repository.py` — owner-scoped parameterized persistence adapter.
- `backend/app/services/` — deterministic quiz validation/scoring, mastery, diagnosis, plans, and resource matching.
- `frontend/src/pages/DashboardLayout.tsx` — query-backed Business, Student, and Playground mode/view routing. Each starts in chat; its marketplace workspace is an explicit secondary view.
- `frontend/src/lib/studentSpecialists.ts` — the 12 data-driven learning specialists used in Student and Playground marketplaces.
- `frontend/src/components/esc/EscDashboard.tsx` — student onboarding and adaptive dashboard, opened from the Student workspace action.

Business retains its business-specialist chat flow. Student and Playground use the 12 learning-specialist marketplace; Quick Launch opens the existing mode chat with the selected specialist and its suggested prompt. ESC’s adaptive dashboard remains available as the Student workspace rather than replacing the Student chat.

## Setup

Requirements: Node.js 20+ and Python 3.11+.

```powershell
cd backend
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `GEMINI_API_KEY` in `backend/.env` for AI-generated, source-informed questions; Gemini is the preferred configured provider and defaults to `gemini-3.5-flash` (override with `GEMINI_MODEL`). `OPENAI_API_KEY` and `OPENROUTER_API_KEY` remain backend-only fallbacks. ESC falls back to clearly labelled original practice items when no provider is configured; it never fabricates prior-year provenance or external citations.

```powershell
# terminal 1
cd backend
py -3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# terminal 2
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). API docs are at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Commands

```powershell
cd backend; py -3 -m pytest -q
cd backend; py -3 scripts/seed_esc_demo.py
cd frontend; npm run build
cd frontend; npm run lint
```

## Adaptive demo

1. Register, complete the profile, and set a deadline plus daily available minutes.
2. Optionally upload notes tagged with a topic, then take a diagnostic for that topic.
3. Submit weak or unattempted answers. ESC stores topic results, calculates weak mastery, generates a diagnosis, plan version 1, and matching resources.
4. Complete a plan task, then re-test the same topic with better answers.
5. The result shows the old/new mastery, trend, and plan version 2’s explanation of priority changes. Sign out and back in to see the persisted memory.

To create the ready-made local contrast demo, run `py -3 scripts/seed_esc_demo.py` from `backend/`. It creates `student.a@esc.demo` (weak Topic X, strong Topic Y, then improving Topic X) and `student.b@esc.demo` (strong Topic X, weak Topic Y), both with password `EscDemoPass123!`.

For a 60–90 second guided script and implementation details, see [ESC demo](docs/ESC_DEMO.md), [architecture](docs/ESC_ARCHITECTURE.md), and [implementation status](docs/ESC_IMPLEMENTATION_STATUS.md).

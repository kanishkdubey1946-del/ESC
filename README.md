# ESC- Enhanced Study Companion — AI Personalized Learning Assistant

> **Problem Statement:** AI Personalized Learning Assistant — recommend study plans and learning resources based on student performance.

**ESC** solves this with a **Student Orchestrator**: a team of specialized AI agents that turn a single student's goals, materials, and performance signals into a personalized study plan, curated resources, and ongoing exam-readiness insight — all inside one unified workspace instead of scattered across separate chat tools.

---

## 📌 Overview

Studying with generic AI chat tools means repeating context over and over: pasting your notes into one chat for summaries, another for a study plan, another for exam tips. ESC fixes this by keeping a single shared context per student and routing it through purpose-built agents, each responsible for one part of the learning workflow:

```
Materials & Goals → StudyVault → ExamInsight → SuccessArchitect → GuideMinds / SpecialistHub
      (organize)      (analyze)      (plan)          (mentor / solve)
```

ESC also ships a **Business Orchestrator** mode (market research, strategy, pitch decks) and an **Agent Playground** for 1:1 specialist chat, built on the same underlying platform — but this README focuses on the learning-assistant experience.

---

## ✨ Features

- 🧠 **Student Orchestrator** — a coordinated pipeline of learning agents instead of one generic chatbot
- 📚 **StudyVault** — personal study library and knowledge organization for uploaded notes, syllabi, and materials
- 📊 **ExamInsight** — exam preparation and performance intelligence; surfaces weak areas from what you feed it
- 🗓️ **SuccessArchitect** — turns performance insight into a concrete, scheduled study plan
- 💡 **GuideMinds** — a personal study mentor for guidance, motivation, and study strategy
- 🧪 **SpecialistHub** — multi-subject expert for problem-solving across topics
- 📎 **Source intelligence** — web research, quality-scored citations, and uploaded file support (PDF, DOCX, and more)
- 🔒 **Secure AI path** — OpenAI credentials stay server-side; the browser never talks to the model provider directly
- 📤 **Export** — download consolidated study plans and outputs as Markdown/PDF/DOCX

---

## 🏗️ How It Works

```
Student → Upload materials / goals → StudyVault organizes → ExamInsight analyzes performance
        → SuccessArchitect builds a study plan → GuideMinds / SpecialistHub assist along the way
        → Export plan & resources → Re-engage as performance updates
```

Each agent consumes the shared workspace context built up by the agents before it, so a weak topic surfaced by ExamInsight automatically shapes the plan SuccessArchitect generates — no re-explaining yourself between tools.

---

## 🧱 Tech Stack

| Layer      | Technology                                             |
|------------|---------------------------------------------------------|
| Frontend   | React 19, TypeScript, Vite, Tailwind CSS                |
| Backend    | FastAPI (Python), SQLite for local auth/sessions        |
| AI         | OpenAI API (optional OpenRouter fallback)                |
| Research   | Backend web retrieval with source quality filtering      |
| Exports    | `docx`, `jspdf`, `pptxgenjs` on the frontend              |

```

---

## ⚡ Quickstart

### Prerequisites
- **Node.js** 20+
- **Python** 3.11+ (3.12–3.14 tested locally)
- An **OpenAI API key**

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # Windows: copy .env.example .env
```

Set your key in `backend/.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Start the API:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Health check: http://127.0.0.1:8000/health
- API docs: http://127.0.0.1:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # optional; defaults to http://localhost:8000
npm run dev
```

App: http://127.0.0.1:5173

### 3. Production build (frontend)

```bash
cd frontend
npm run build
npm run preview
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`) — secrets stay here

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes* | OpenAI API key (*or configure OpenRouter) |
| `OPENAI_DEFAULT_MODEL` | No | Default model (e.g. `gpt-4o-mini`) |
| `OPENAI_FAST_MODEL` | No | Fast path model |
| `OPENAI_REASONING_MODEL` | No | Heavier reasoning model |
| `OPENAI_FALLBACK_MODEL` | No | Fallback if primary model fails |
| `TAVILY_API_KEY` / `BRAVE_API_KEY` / `SERPER_API_KEY` | No | Optional paid search providers |
| `ESC_DATABASE_PATH` | No | SQLite path for local auth |

See `backend/.env.example` for the full template. **Never commit real `.env` files.**

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | No | Backend base URL (default `http://localhost:8000`) |

Do **not** put OpenAI keys in `VITE_*` variables.

---

## 📡 Core API Endpoints

```bash
# Register / login
POST /api/auth/register
POST /api/auth/login

# Run a student agent (e.g. examinsight, successarchitect)
POST /api/v1/agents/run

# Research a topic with cited web sources
POST /api/v1/research/run
POST /api/v1/research/stream   # streamed version

# Extract content from uploaded study materials
POST /api/v1/sources/extract
POST /api/v1/sources/website
```

Full interactive reference is available at `/docs` once the backend is running.

---

## 🔐 Security Notes

- All LLM and search credentials are backend-only.
- Errors are sanitized so keys are never returned to the client.
- Local SQLite stores auth sessions — use strong passwords and HTTPS in production.
- Rotate any key that was ever pasted into chat or logs.

---

## 🎥 Demo Flow

1. Sign in and open a new Student workspace
2. Upload notes/syllabus or describe recent performance
3. StudyVault organizes materials → ExamInsight flags weak topics
4. SuccessArchitect generates a scheduled study plan
5. Chat with GuideMinds or SpecialistHub to work through sticking points
6. Export the plan and resources

---

## 🛣️ Roadmap

- Deeper performance analytics across repeated quizzes/tests
- Spaced-repetition scheduling in SuccessArchitect
- Additional resource providers beyond web search
- Mobile-friendly dashboard

---
## 📄 License

Private / project-specific unless otherwise stated by the repository owner.

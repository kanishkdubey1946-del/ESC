# ESC Google ADK Agent Team

ESC implements its active learning specialists as a real Google Agent Development Kit team. Each specialist is an independent backend agent with a backend-owned role, a minimal read-only tool set, persistent sessions, and shared safety callbacks.

## Architecture

```text
ESC Learning Orchestrator (root ADK agent)
├── StudyVault
├── ExamInsight
├── SuccessArchitect
├── Concept Clarifier
├── Problem Solver
├── QuizForge
├── Revision Coach
├── Flashcard Studio
├── MindMap Maker
├── Resource Scout
├── Paper Pattern Analyst
└── GuideMinds
```

The root agent delegates an open-ended request to the best specialist. The existing studio can also call a named specialist directly. Both paths use Google ADK's `Runner` and persistent `DatabaseSessionService`.

## Source files

Every specialist has its own file under `backend/app/agents/`. `root.py` defines the orchestrator, `registry.py` is the backend-owned catalog, `runtime.py` manages runners and persistent sessions, and `tools/` contains authenticated read-only tools.

The frontend agent names and icons remain presentation metadata. The frontend-supplied `systemPrompt` field is intentionally ignored by the backend so a browser cannot replace an agent's protected instructions.

## API

All endpoints require the normal ESC bearer token.

- `GET /api/v1/agents/catalog` lists the root agent and all 12 active specialists.
- `POST /api/v1/agents/run` runs a named specialist. The existing UI uses this endpoint.
- `POST /api/v1/agents/team/run` runs the root orchestrator and lets ADK delegate automatically.

Example root-team request:

```json
{
  "prompt": "Explain electric potential, then make five flashcards",
  "sessionId": "demo-session",
  "enableResearch": false,
  "uploads": []
}
```

Successful responses identify the runtime and actual delegated agent:

```json
{
  "success": true,
  "runtime": "google-adk",
  "agentId": "conceptclarifier",
  "agentName": "Concept Clarifier",
  "delegatedAgents": ["conceptclarifier"],
  "data": {}
}
```

## Local setup

```powershell
cd backend
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Set a Gemini backend model key in `.env` for the native ADK configuration:

```env
GEMINI_API_KEY=your_real_key
ADK_MODEL=gemini-2.5-flash
ADK_SESSION_DB_URL=sqlite+aiosqlite:///./adk_sessions.db
```

Start the API and open Swagger:

```powershell
py -3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs`, authenticate, inspect the catalog, and run `/api/v1/agents/team/run` to demonstrate delegation.

## Safety boundaries

- Learning-memory queries derive ownership from the authenticated user ID.
- Agents receive only the read-only tools assigned to their role.
- Uploaded documents and evidence are labeled untrusted data, never instructions.
- Model callbacks block explicit prompt-exfiltration and instruction-bypass attempts.
- Tool callbacks block unknown tools and unexpected arguments.
- Agents create structured drafts; deterministic quiz grading and persistent learning writes remain in the existing server-side services.

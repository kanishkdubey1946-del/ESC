# COMET Frontend

COMET uses a local FastAPI backend for email/password authentication during development. Account data is stored in the local SQLite database at `backend/comet.db` and sessions expire after eight hours.

## Run locally

Open two PowerShell terminals.

```powershell
# Terminal 1: local API
cd C:\Users\LOQ\Downloads\COMET-Codex--main\COMET-Codex--main\backend
python -m uvicorn app.main:app --reload --port 8000
```

```powershell
# Terminal 2: frontend
cd C:\Users\LOQ\Downloads\COMET-Codex--main\COMET-Codex--main\frontend
npm.cmd run dev
```

Then open http://localhost:5173. The frontend reads `VITE_API_BASE_URL` from `.env.local`, which defaults to `http://localhost:8000`.

AI generation is handled **only** by the backend via `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `OPENROUTER_API_KEY` in `backend/.env`. Never put provider secrets in `VITE_*` variables.

## Enable real AI agent responses

Add a provider key to `backend/.env`, then restart the backend server:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
```

Gemini is preferred when configured. COMET then runs each selected agent in sequence, giving it the original request and the complete structured output from earlier agents. If a provider is not configured or returns an error, the agent is marked as failed; COMET never substitutes a sample result.

## Learning specialist marketplace

Student and Playground workspaces display the same 12 student-focused specialists: StudyVault, ExamInsight, SuccessArchitect, Concept Clarifier, Problem Solver, QuizForge, Revision Coach, Flashcard Studio, MindMap Maker, Resource Scout, Paper Pattern Analyst, and GuideMinds. Search covers each specialist’s name, responsibility, and tags.

Quick Launch preserves the current mode, sources, session history, and report flow. It opens the existing chat, selects the specialist in Manual mode, and pre-fills that specialist’s suggested prompt. Playground uses `pg_` display IDs which are safely mapped back to the stable agent ID before the backend request. Business keeps its existing business-specialist catalog.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

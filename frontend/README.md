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

AI generation is handled **only** by the backend via `OPENAI_API_KEY` in `backend/.env`. Never put OpenAI secrets in `VITE_*` variables.

## Enable real AI agent responses

Add at least one provider key to `frontend/.env.local`, then restart the frontend server:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GEMINI_API_KEY=your_gemini_api_key
# Or use: VITE_OPENROUTER_API_KEY=your_openrouter_api_key
```

COMET then runs each selected agent in sequence, giving it the original request and the complete structured output from earlier agents. If a provider is not configured or returns an error, the agent is marked as failed; COMET never substitutes a sample result.

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

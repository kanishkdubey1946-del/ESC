# COMET Technical Architecture

## High-Level Diagram
```text
User's Browser
  │ (React Web App, tailwind-styled, hosted on InsForge CDN)
  ▼
FastAPI API Gateway (Cloud Run container)
  │
  ├─> InsForge Database (PostgreSQL database service)
  ├─> InsForge Auth (JWT Token Verification)
  └─> Google ADK Engine ──> Gemini 2.5 Flash
```

## System Rationale
* **Vite + React 18**: Quick hot-reloads and modular structure.
* **FastAPI**: Unidirectional SSE streaming for agent output.
* **Google ADK + Gemini 2.5 Flash**: Fast processing and massive context capacity.
* **InsForge BaaS**: All-in-one Postgres database, auth, hosting, and edge runtime, replacing standard Firebase and GCP container setups.

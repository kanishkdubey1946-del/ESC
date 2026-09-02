# Backend Specification

## FastAPI Core
* Fully asynchronous Python application.
* Pydantic schemas for request/response serialization.
* CORS headers configured for frontend domains.

## Agent Orchestration (Google ADK)
* Base Agent abstract class defined in `backend/app/agents/base.py`.
* LLM Temperature:
  - Factual agents (Research/Strategy): `temperature=0.4`
  - Creative agents (Content/Pitch): `temperature=0.7`
* Orchestrator manages sequential workflows, passing updated outputs downstream.

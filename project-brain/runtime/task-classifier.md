# Task Classifier

Classifies incoming developer requests into functional scopes to isolate context changes.

## Classification Rubric
* **Frontend UI Change**: Targets pages, layout, or styles. Load `frontend.md` and `tailwind.md` first.
* **Backend API Change**: Targets routers, models, or endpoint schema. Load `backend.md`, `api.md` and `fastapi.md` first.
* **Database/Auth Update**: Targets tables or auth flow. Load `database.md` and `security.md`.
* **Orchestration / LLM Update**: Targets ADK agents or Gemini prompt setups. Load `architecture.md`, `adk.md`, and `workflow.md`.

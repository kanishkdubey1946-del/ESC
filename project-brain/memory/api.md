# API Contracts

All endpoints are prefixed with `/api/v1` and require an Authorization Header: `Authorization: Bearer <token>`.

## Endpoint Matrix
* `POST /auth/verify` - Token check.
* `GET /workspaces` - List user workspaces.
* `POST /workspaces` - Create empty workspace.
* `GET /workspaces/{id}` - Fetch single workspace details.
* `DELETE /workspaces/{id}` - Delete workspace.
* `POST /workspaces/{id}/run` - Trigger orchestrator pipeline (streams Server-Sent Events).
* `POST /workspaces/{id}/refine` - Refine single agent output (streams Server-Sent Events).

## SSE Event Stream Structure
* `plan_initialized`: `{"plan": ["research", "strategy", ...]}`
* `agent_started`: `{"agent": "research"}`
* `agent_thought`: `{"thought": "searching competitors..."}`
* `agent_stream`: `{"delta": "competitor details..."}`
* `agent_completed`: `{"agent": "research", "output": {...}}`
* `run_finished`: `{"status": "success", "workspace_id": "uuid"}`

# Database Schema & Structure

COMET persists data using InsForge database services.

## Tables

### Users (`users`)
* `id` (PK, matches auth user ID)
* `email` (string)
* `display_name` (string)
* `created_at` (timestamp)

### Workspaces (`workspaces`)
* `id` (PK, UUID)
* `user_id` (FK to users)
* `title` (string)
* `business_concept` (text)
* `state` (CREATED, RUNNING, COMPLETED, FAILED)
* `plan` (JSON array of steps)
* `outputs` (JSON object holding final agent deliverables)
* `created_at` (timestamp)
* `updated_at` (timestamp)

### Agent Runs (`agent_runs`)
* `id` (PK, UUID)
* `workspace_id` (FK to workspaces)
* `agent_name` (research | strategy | content | development | pitch)
* `status` (PENDING | EXECUTING | COMPLETED | FAILED)
* `input_context` (JSON block)
* `output_data` (JSON block)
* `started_at` (timestamp)
* `completed_at` (timestamp)

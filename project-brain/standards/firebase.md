# Firebase & InsForge Standards

## Architectural Pivot
While standard specs refer to Firebase Firestore/Auth, the active runtime utilizes **InsForge** as the BaaS provider:
* **Authentication**: Managed through `@insforge/sdk` auth clients.
* **Database**: Persisted to InsForge PostgreSQL tables instead of Firestore collections.
* **Realtime**: Handled via InsForge real-time channels or standard FastAPI SSE connections.
* **CLI/Infrastructure**: Configured in `.insforge/project.json` and deployed through the InsForge CLI.

## Keys & Environment
* Never hardcode API keys or credentials.
* Read credentials locally from `.env.local` or environment secrets.

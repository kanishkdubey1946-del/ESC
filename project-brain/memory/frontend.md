# Frontend Specifications

## Design Tokens & Theme
* **Deep Space Background**: `#090D16` (slate-950)
* **Surface Background**: `rgba(15, 23, 42, 0.5)` (slate-900/50 with backdrop blur)
* **Borders**: Translucent `#1E293B` (slate-880/80) or Indigo glow.
* **Typography**: Outfit (titles), Inter (body), JetBrains Mono (monospaced logs/code).

## Main Layout Grid
* **Sidebar**: Workspace selector, creation button, settings, user details.
* **Workspace Details**: Header controls, Agent tabs (Orchestrator, Research, Strategy, Development, Content, Pitch), active workspace panel.
* **Chat Console**: Bottom panel for direct refinement chats with the active agent.
* **Animations**: All interactive buttons utilize `:hover` scale transition duration-200 and custom neon glow borders.

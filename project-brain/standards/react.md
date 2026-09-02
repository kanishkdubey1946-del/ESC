# React Coding Standards

* Use **React 18+** features (e.g. concurrent rendering where applicable).
* Prefer functional components with hooks.
* Maintain strict TypeScript parameters (use type imports explicitly to prevent compiler warnings).
* Clean up all active listeners (e.g., SSE connection `EventSource`) during unmounting inside `useEffect` cleanup blocks.
* Keep components small, focused, and reusable. Avoid inline layout definitions; pull complex styles to centralized CSS variables or clear Tailwind configurations.

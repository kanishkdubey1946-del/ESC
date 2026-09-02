# ESC implementation status

## Completed

- Authenticated, owner-scoped SQLite learning memory with idempotent migrations.
- Safe diagnostic generation, server-side deterministic scoring, hidden answer keys before submission, and per-topic result storage.
- Deterministic mastery, confidence, status, trend, diagnoses, resources, and availability-limited versioned plans.
- Student-first authenticated ESC UI with profile onboarding, uploaded/pasted material, diagnostics, task persistence, re-test, results, and plan-change states.
- Backend regression suite covering masteries, hidden answers, ownership isolation, plan versioning, resources, task updates, and the adaptive flow.
- Root documentation, setup, commands, and demo script.

## Verification commands

```powershell
cd backend; py -3 -m pytest -q
cd frontend; npm run build
cd frontend; npm run lint
```

## Current limitations

- A configured backend AI provider improves subject-specific question generation. Without one, ESC uses clearly marked original practice fallback questions, not false prior-year questions.
- External web resources are deliberately not fetched on every interaction. Recommendations first use learner uploads, then deterministic study guidance and practice prompts with provenance.
- This workspace’s host did not have Python installed at implementation time, so backend tests could not be executed here. The frontend build passes; install Python 3.11+ and run the listed test command to execute the backend suite.

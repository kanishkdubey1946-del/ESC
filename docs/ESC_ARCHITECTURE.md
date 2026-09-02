# ESC architecture

ESC keeps local SQLite behind `student_repository.py`. Every learner-owned lookup includes `owner_id = authenticated_user.id`; no `/api/v1/me` request accepts a student ID as authority.

## Data flow

```text
Bearer session
  → profile / sources
  → safe quiz payload (no correct_index, no explanation)
  → transactional attempt submission
  → topic results + deterministic mastery
  → persisted diagnosis
  → versioned availability-constrained study plan + matched resources
  → persisted task completion and future re-test
```

Migrations are applied through `schema_migrations`, use foreign keys and indexes, and create: `student_profiles`, `learning_sources`, `quizzes`, `quiz_questions`, `quiz_attempts`, `topic_results`, `mastery_states`, `diagnoses`, `study_plans`, `plan_tasks`, and `learning_resources`.

## Deterministic rules

- Topic accuracy = correct / graded × 100.
- First mastery = latest topic accuracy.
- Repeated mastery = 0.40 × previous mastery + 0.60 × latest topic accuracy.
- Confidence = min(1.0, cumulative graded questions / 10).
- Trend changes at ±10 percentage points; no comparison is `insufficient`.
- Status is `insufficient_evidence` below three questions, then weak (<65), developing (<80), or strong (≥80).

The planner derives priorities from weakness gap, confidence gap, declining trend, deadline urgency, and incomplete prior tasks. It never schedules more minutes than the availability stored in the profile. A deterministic fallback remains available if no AI provider is configured.

## Security boundaries

The quiz key is stored only in `quiz_questions.correct_index`; safe quiz retrieval does not serialize it. Attempts are graded server-side in one SQLite transaction. Upload extraction has size/type limits. API provider credentials remain in backend `.env`; none are read by the Vite client.

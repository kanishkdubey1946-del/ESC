"""Owner-scoped access to ESC's deterministic learning memory."""

from __future__ import annotations

from typing import Any

from app import db
from app.agents.request_context import current_request_context
from app.repositories import student_repository as repo


def get_student_learning_memory() -> dict[str, Any]:
    """Return this signed-in student's profile and learning progress.

    Use this when recommendations depend on real deadlines, availability,
    mastery, attempts, diagnoses, saved resources, or the current study plan.
    The lookup is always restricted to the authenticated user for this run.
    """
    context = current_request_context()
    with db.database() as connection:
        attempts = repo.list_attempts(connection, context.user_id)
        resources = repo.list_resources(connection, context.user_id)
        return {
            "status": "success",
            "profile": repo.get_profile(connection, context.user_id),
            "mastery": repo.list_mastery(connection, context.user_id),
            "recentAttempts": attempts[:10],
            "latestDiagnosis": repo.latest_diagnosis(connection, context.user_id),
            "currentPlan": repo.get_current_plan(connection, context.user_id),
            "savedResources": resources[:20],
        }

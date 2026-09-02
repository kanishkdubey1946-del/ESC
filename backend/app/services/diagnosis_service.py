from __future__ import annotations

import sqlite3
from typing import Any

from app.repositories import student_repository as repo


def create_deterministic_diagnosis(
    connection: sqlite3.Connection, user_id: str, attempt_ids: list[str] | None = None
) -> dict[str, Any]:
    states = repo.list_mastery(connection, user_id)
    strengths = [state for state in states if state["status"] == "strong"]
    weaknesses = [state for state in states if state["status"] == "weak"]
    insufficient = [state for state in states if state["status"] == "insufficient_evidence"]
    priorities = weaknesses or [state for state in states if state["status"] == "developing"]
    statements = []
    for state in priorities[:3]:
        trend_text = "performance declined" if state["trend"] == "declining" else f"latest accuracy is {state['latestAccuracy']:.0f}%"
        statements.append(
            f"{state['topic']} is prioritised because mastery is {state['mastery']:.0f}, "
            f"latest accuracy is {state['latestAccuracy']:.0f}%, and {trend_text}."
        )
    if not statements and insufficient:
        statements.append("More diagnostic questions are needed before ESC can make a confident topic recommendation.")
    if not statements:
        statements.append("Complete a diagnostic quiz to create your first performance-based recommendation.")
    return repo.create_diagnosis(connection, user_id, {
        "attemptIds": attempt_ids or [], "strengths": strengths, "weaknesses": weaknesses,
        "insufficientEvidence": insufficient, "explanation": " ".join(statements),
    })

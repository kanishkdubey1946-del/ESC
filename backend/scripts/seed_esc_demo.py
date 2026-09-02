"""Create two local ESC demo accounts with contrasting, real stored performance.

Run from backend/: py -3 scripts/seed_esc_demo.py
The script is idempotent: it does not alter existing demo accounts.
"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.auth import RegisterRequest, register_user
from app.db import database, initialise_database
from app.repositories import student_repository as repo
from app.services import quiz_service


PASSWORD = "EscDemoPass123!"


def questions(topic: str) -> list[dict]:
    return [{
        "prompt": f"{topic}: diagnostic practice item {index + 1}",
        "options": ["Correct concept", "Distractor one", "Distractor two", "Distractor three"],
        "correct_index": 0,
        "explanation": f"This original practice item records performance for {topic}.",
        "topic": topic, "difficulty": "medium", "provenance": "original_exam_style_practice",
    } for index in range(5)]


def create_quiz(connection, user_id: str, topic: str) -> dict:
    return repo.create_quiz(connection, user_id, {
        "title": f"{topic} demo diagnostic", "subject": "Physics", "topic": topic,
        "difficulty": "medium", "duration_minutes": 10, "source_ids": [],
        "provenance": "original_exam_style_practice",
    }, questions(topic))


def submit(connection, user_id: str, quiz_id: str, correct: bool) -> None:
    keyed = repo.get_quiz(connection, user_id, quiz_id, include_answers=True)
    assert keyed
    answers = [{"question_id": question["id"], "selected_index": question["correctIndex"] if correct else 1} for question in keyed["questions"]]
    quiz_service.submit_attempt(connection, user_id, {
        "quiz_id": quiz_id, "answers": answers, "started_at": None, "duration_seconds": 60,
    })


def seed(email: str, name: str, x_is_strong: bool) -> None:
    with database() as connection:
        existing = connection.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        print(f"Skipped {email}: demo account already exists.")
        return
    user = register_user(RegisterRequest(name=name, email=email, password=PASSWORD)).user
    with database() as connection:
        repo.upsert_profile(connection, user.id, {
            "grade": "12", "curriculum": "CBSE", "subjects": ["Physics"], "goal": "Physics final readiness",
            "deadline": (date.today() + timedelta(days=14)).isoformat(), "weekly_hours": 7,
            "daily_availability": {"default": 45}, "preferred_session_minutes": 45,
            "weak_topics": ["Topic X", "Topic Y"],
        })
        repo.create_source(connection, user.id, {
            "title": "Demo Physics notes", "source_type": "notes", "extracted_text": "Topic X. Topic Y.",
            "reference": None, "topics": ["Topic X", "Topic Y"], "provenance": "ESC demo material",
        })
        x_quiz = create_quiz(connection, user.id, "Topic X")
        y_quiz = create_quiz(connection, user.id, "Topic Y")
        submit(connection, user.id, x_quiz["id"], x_is_strong)
        submit(connection, user.id, y_quiz["id"], not x_is_strong)
        if not x_is_strong:
            # Two attempts make Student A's Topic X trend and plan change visible.
            retest = create_quiz(connection, user.id, "Topic X")
            submit(connection, user.id, retest["id"], True)
    print(f"Created {email} (password: {PASSWORD})")


if __name__ == "__main__":
    initialise_database()
    seed("student.a@esc.demo", "Student A", x_is_strong=False)
    seed("student.b@esc.demo", "Student B", x_is_strong=True)

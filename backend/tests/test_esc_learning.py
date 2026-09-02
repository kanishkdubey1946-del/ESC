"""Regression coverage for ESC's deterministic, authenticated adaptive loop."""

from __future__ import annotations

from fastapi.testclient import TestClient
import pytest

from app import db
from app.services.mastery_service import (
    STRONG_THRESHOLD,
    WEAK_THRESHOLD,
    calculate_state,
    status_for,
    trend_for,
)


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DATABASE_PATH", tmp_path / "esc-test.db")
    db.initialise_database()
    from app.main import app
    with TestClient(app) as test_client:
        yield test_client


def auth_headers(client: TestClient, email: str, name: str = "Student") -> dict[str, str]:
    response = client.post("/api/auth/register", json={"name": name, "email": email, "password": "correct-horse-battery"})
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['token']}"}


def profile_payload() -> dict:
    return {
        "grade": "12", "curriculum": "CBSE", "subjects": ["Physics"], "goal": "Physics final",
        "deadline": "2030-01-08", "weekly_hours": 7, "daily_availability": {"default": 45},
        "preferred_session_minutes": 45, "weak_topics": ["Electrostatics"],
    }


def test_mastery_boundaries_and_trends():
    assert status_for(WEAK_THRESHOLD - 0.01, 3) == "weak"
    assert status_for(WEAK_THRESHOLD, 3) == "developing"
    assert status_for(STRONG_THRESHOLD - 0.01, 3) == "developing"
    assert status_for(STRONG_THRESHOLD, 3) == "strong"
    assert status_for(100, 2) == "insufficient_evidence"
    assert trend_for(None, 50) == "insufficient"
    assert trend_for(50, 60) == "improving"
    assert trend_for(60, 50) == "declining"
    assert trend_for(60, 59.99) == "stable"
    first = calculate_state(None, "Topic", 2, 4)
    assert first["mastery"] == 50
    previous = {"mastery": 50, "latest_accuracy": 50, "cumulative_graded_count": 4}
    # sqlite Rows are not required by the calculation; this mapping exercises 40/60 weighting.
    repeated = calculate_state(previous, "Topic", 4, 4)  # type: ignore[arg-type]
    assert repeated["mastery"] == 80
    assert repeated["confidence"] == 0.8


def test_authenticated_adaptive_flow_persists_and_isolated(client: TestClient):
    student_a = auth_headers(client, "a@example.com", "Student A")
    student_b = auth_headers(client, "b@example.com", "Student B")
    assert client.put("/api/v1/me/profile", headers=student_a, json=profile_payload()).status_code == 200
    assert client.put("/api/v1/me/profile", headers=student_b, json=profile_payload()).status_code == 200

    source = client.post("/api/v1/me/sources", headers=student_a, json={
        "title": "Electrostatics notes", "source_type": "notes", "extracted_text": "Electrostatics field and charge.",
        "topics": ["Electrostatics"], "provenance": "Student-uploaded material",
    })
    assert source.status_code == 201
    generated = client.post("/api/v1/me/quizzes/generate", headers=student_a, json={
        "subject": "Physics", "topic": "Electrostatics", "difficulty": "medium", "question_count": 5,
        "duration_minutes": 10, "source_ids": [source.json()["source"]["id"]],
    })
    assert generated.status_code == 201, generated.text
    quiz = generated.json()["quiz"]
    assert all("correctIndex" not in question and "explanation" not in question for question in quiz["questions"])
    assert client.get(f"/api/v1/me/quizzes/{quiz['id']}", headers=student_b).status_code == 404

    weak = client.post("/api/v1/me/quiz-attempts", headers=student_a, json={
        "quiz_id": quiz["id"], "answers": [], "started_at": "2030-01-01T10:00:00+00:00", "duration_seconds": 30,
    })
    assert weak.status_code == 201, weak.text
    first = weak.json()["attempt"]
    assert first["unattempted"] == 5 and first["correct"] == 0
    assert first["masteryChanges"][0]["after"]["status"] == "weak"
    assert first["plan"]["version"] == 1
    assert len(first["plan"]["tasks"]) <= 7  # one 45-minute slot per declared day
    topic_resources = client.get("/api/v1/me/resources?topic=Electrostatics", headers=student_a).json()["resources"]
    assert len(topic_resources) >= 2 and all(resource["topic"] == "Electrostatics" for resource in topic_resources)

    task = first["plan"]["tasks"][0]
    completed = client.patch(f"/api/v1/me/plan-tasks/{task['id']}", headers=student_a, json={"completed": True})
    assert completed.status_code == 200 and completed.json()["task"]["completed"]
    assert client.patch(f"/api/v1/me/plan-tasks/{task['id']}", headers=student_b, json={"completed": True}).status_code == 404

    # Keys are retrieved only inside the server test after the first submitted attempt.
    with db.database() as connection:
        from app.repositories import student_repository as repo
        keyed = repo.get_quiz(connection, "", quiz["id"], include_answers=True)
        # The public repository lookup is intentionally owner-scoped; inspect by correct owner below.
        assert keyed is None
        user = connection.execute("SELECT id FROM users WHERE email = ?", ("a@example.com",)).fetchone()
        assert user
        keyed = repo.get_quiz(connection, user["id"], quiz["id"], include_answers=True)
    assert keyed
    improved = client.post("/api/v1/me/quiz-attempts", headers=student_a, json={
        "quiz_id": quiz["id"],
        "answers": [{"question_id": question["id"], "selected_index": question["correctIndex"]} for question in keyed["questions"]],
        "started_at": "2030-01-02T10:00:00+00:00", "duration_seconds": 60,
    })
    assert improved.status_code == 201, improved.text
    second = improved.json()["attempt"]
    assert second["correct"] == 5 and second["percentage"] == 100
    assert second["masteryChanges"][0]["after"]["mastery"] > first["masteryChanges"][0]["after"]["mastery"]
    assert second["plan"]["version"] == 2
    assert second["planChangeSummary"]
    memory = client.get("/api/v1/me/memory", headers=student_a)
    assert memory.status_code == 200
    history = client.get("/api/v1/me/study-plans/history", headers=student_a).json()["plans"]
    assert len(history) == 2 and any(item["status"] == "superseded" for item in history)
    assert any(task["completed"] for plan in history for task in plan["tasks"])  # persisted after a refresh request

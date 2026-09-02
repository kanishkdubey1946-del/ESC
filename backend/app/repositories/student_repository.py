"""Parameterized SQLite repository for authenticated ESC learning records."""

from __future__ import annotations

import json
import secrets
import sqlite3
from typing import Any, Iterable

from app.db import utc_now


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(12)}"


def normalize_topic(topic: str) -> str:
    return " ".join(topic.lower().split())


def dump(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def load(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def _source(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"], "title": row["title"], "sourceType": row["source_type"],
        "extractedText": row["extracted_text"], "reference": row["reference"],
        "topics": load(row["topics_json"], []), "provenance": row["provenance"], "createdAt": row["created_at"],
    }


def _resource(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"], "topic": row["topic"], "title": row["title"],
        "urlOrReference": row["url_or_reference"], "type": row["resource_type"],
        "relevance": row["relevance"], "reliability": row["reliability"], "provenance": row["provenance"],
        "difficulty": row["difficulty"], "estimatedMinutes": row["estimated_minutes"],
        "citation": load(row["citation_json"], {}), "reason": row["reason"], "createdAt": row["created_at"],
    }


def get_profile(connection: sqlite3.Connection, user_id: str) -> dict[str, Any] | None:
    row = connection.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        return None
    return {
        "grade": row["grade"], "curriculum": row["curriculum"], "subjects": load(row["subjects_json"], []),
        "goal": row["goal"], "deadline": row["deadline"], "weeklyHours": row["weekly_hours"],
        "dailyAvailability": load(row["daily_availability_json"], {}),
        "preferredSessionMinutes": row["preferred_session_minutes"], "weakTopics": load(row["weak_topics_json"], []),
        "createdAt": row["created_at"], "updatedAt": row["updated_at"],
    }


def upsert_profile(connection: sqlite3.Connection, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    timestamp = utc_now().isoformat()
    connection.execute(
        """INSERT INTO student_profiles
        (user_id, grade, curriculum, subjects_json, goal, deadline, weekly_hours, daily_availability_json,
         preferred_session_minutes, weak_topics_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET grade=excluded.grade, curriculum=excluded.curriculum,
          subjects_json=excluded.subjects_json, goal=excluded.goal, deadline=excluded.deadline,
          weekly_hours=excluded.weekly_hours, daily_availability_json=excluded.daily_availability_json,
          preferred_session_minutes=excluded.preferred_session_minutes, weak_topics_json=excluded.weak_topics_json,
          updated_at=excluded.updated_at""",
        (user_id, data["grade"], data["curriculum"], dump(data["subjects"]), data["goal"], data.get("deadline"),
         data["weekly_hours"], dump(data["daily_availability"]), data["preferred_session_minutes"],
         dump(data["weak_topics"]), timestamp, timestamp),
    )
    result = get_profile(connection, user_id)
    assert result is not None
    return result


def create_source(connection: sqlite3.Connection, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    source_id = new_id("src")
    connection.execute(
        """INSERT INTO learning_sources
        (id, owner_id, title, source_type, extracted_text, reference, topics_json, provenance, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (source_id, user_id, data["title"], data["source_type"], data.get("extracted_text", ""),
         data.get("reference"), dump(data.get("topics", [])), data.get("provenance", ""), utc_now().isoformat()),
    )
    row = connection.execute("SELECT * FROM learning_sources WHERE id = ? AND owner_id = ?", (source_id, user_id)).fetchone()
    assert row
    return _source(row)


def list_sources(connection: sqlite3.Connection, user_id: str) -> list[dict[str, Any]]:
    return [_source(row) for row in connection.execute(
        "SELECT * FROM learning_sources WHERE owner_id = ? ORDER BY created_at DESC", (user_id,)
    ).fetchall()]


def owned_sources(connection: sqlite3.Connection, user_id: str, source_ids: Iterable[str]) -> list[dict[str, Any]]:
    values = list(dict.fromkeys(source_ids))
    if not values:
        return []
    marks = ",".join("?" for _ in values)
    rows = connection.execute(
        f"SELECT * FROM learning_sources WHERE owner_id = ? AND id IN ({marks})", (user_id, *values)
    ).fetchall()
    if len(rows) != len(values):
        raise PermissionError("One or more sources are unavailable.")
    return [_source(row) for row in rows]


def create_quiz(connection: sqlite3.Connection, user_id: str, quiz: dict[str, Any], questions: list[dict[str, Any]]) -> dict[str, Any]:
    quiz_id = new_id("quiz")
    created_at = utc_now().isoformat()
    connection.execute(
        """INSERT INTO quizzes (id, owner_id, title, subject, topic, difficulty, duration_minutes,
           source_references_json, provenance, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (quiz_id, user_id, quiz["title"], quiz["subject"], quiz["topic"], quiz["difficulty"],
         quiz["duration_minutes"], dump(quiz.get("source_ids", [])), quiz.get("provenance", "original_exam_style_practice"), created_at),
    )
    for position, question in enumerate(questions, start=1):
        connection.execute(
            """INSERT INTO quiz_questions (id, quiz_id, prompt, options_json, correct_index, explanation,
               topic, difficulty, provenance, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (new_id("question"), quiz_id, question["prompt"], dump(question["options"]), question["correct_index"],
             question["explanation"], question["topic"], question["difficulty"], question.get("provenance", "original_exam_style_practice"), position),
        )
    return get_quiz(connection, user_id, quiz_id, include_answers=False) or {}


def get_quiz(connection: sqlite3.Connection, user_id: str, quiz_id: str, include_answers: bool = False) -> dict[str, Any] | None:
    quiz = connection.execute("SELECT * FROM quizzes WHERE id = ? AND owner_id = ?", (quiz_id, user_id)).fetchone()
    if not quiz:
        return None
    question_rows = connection.execute("SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY position", (quiz_id,)).fetchall()
    questions: list[dict[str, Any]] = []
    for row in question_rows:
        question = {
            "id": row["id"], "prompt": row["prompt"], "options": load(row["options_json"], []),
            "topic": row["topic"], "difficulty": row["difficulty"], "provenance": row["provenance"],
        }
        if include_answers:
            question.update({"correctIndex": row["correct_index"], "explanation": row["explanation"]})
        questions.append(question)
    return {
        "id": quiz["id"], "title": quiz["title"], "subject": quiz["subject"], "topic": quiz["topic"],
        "difficulty": quiz["difficulty"], "durationMinutes": quiz["duration_minutes"],
        "sourceReferences": load(quiz["source_references_json"], []), "provenance": quiz["provenance"],
        "createdAt": quiz["created_at"], "questions": questions,
    }


def get_quiz_with_keys(connection: sqlite3.Connection, user_id: str, quiz_id: str) -> tuple[sqlite3.Row, list[sqlite3.Row]] | None:
    quiz = connection.execute("SELECT * FROM quizzes WHERE id = ? AND owner_id = ?", (quiz_id, user_id)).fetchone()
    if not quiz:
        return None
    questions = connection.execute("SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY position", (quiz_id,)).fetchall()
    return quiz, questions


def insert_attempt(connection: sqlite3.Connection, user_id: str, data: dict[str, Any]) -> str:
    attempt_id = new_id("attempt")
    connection.execute(
        """INSERT INTO quiz_attempts (id, owner_id, quiz_id, submitted_answers_json, correct_count,
          incorrect_count, unattempted_count, graded_count, attempted_count, percentage, started_at,
          submitted_at, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (attempt_id, user_id, data["quiz_id"], dump(data["answers"]), data["correct_count"], data["incorrect_count"],
         data["unattempted_count"], data["graded_count"], data["attempted_count"], data["percentage"],
         data.get("started_at"), utc_now().isoformat(), data["duration_seconds"]),
    )
    return attempt_id


def insert_topic_result(connection: sqlite3.Connection, user_id: str, attempt_id: str, result: dict[str, Any]) -> None:
    connection.execute(
        """INSERT INTO topic_results (id, attempt_id, owner_id, topic, topic_normalized, correct_count,
        graded_count, attempted_count, accuracy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (new_id("topic_result"), attempt_id, user_id, result["topic"], normalize_topic(result["topic"]),
         result["correct"], result["graded"], result["attempted"], result["accuracy"]),
    )


def get_mastery(connection: sqlite3.Connection, user_id: str, normalized_topic: str) -> sqlite3.Row | None:
    return connection.execute(
        "SELECT * FROM mastery_states WHERE owner_id = ? AND topic_normalized = ?", (user_id, normalized_topic)
    ).fetchone()


def upsert_mastery(connection: sqlite3.Connection, user_id: str, state: dict[str, Any]) -> None:
    connection.execute(
        """INSERT INTO mastery_states (id, owner_id, topic, topic_normalized, mastery, confidence, status, trend,
         cumulative_graded_count, latest_accuracy, previous_accuracy, assessed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(owner_id, topic_normalized) DO UPDATE SET topic=excluded.topic, mastery=excluded.mastery,
         confidence=excluded.confidence, status=excluded.status, trend=excluded.trend,
         cumulative_graded_count=excluded.cumulative_graded_count, latest_accuracy=excluded.latest_accuracy,
         previous_accuracy=excluded.previous_accuracy, assessed_at=excluded.assessed_at""",
        (new_id("mastery"), user_id, state["topic"], normalize_topic(state["topic"]), state["mastery"], state["confidence"],
         state["status"], state["trend"], state["cumulativeGradedCount"], state["latestAccuracy"],
         state.get("previousAccuracy"), utc_now().isoformat()),
    )


def list_mastery(connection: sqlite3.Connection, user_id: str) -> list[dict[str, Any]]:
    rows = connection.execute("SELECT * FROM mastery_states WHERE owner_id = ? ORDER BY mastery ASC, topic", (user_id,)).fetchall()
    return [{
        "topic": row["topic"], "mastery": row["mastery"], "confidence": row["confidence"], "status": row["status"],
        "trend": row["trend"], "cumulativeGradedCount": row["cumulative_graded_count"], "latestAccuracy": row["latest_accuracy"],
        "previousAccuracy": row["previous_accuracy"], "assessedAt": row["assessed_at"],
    } for row in rows]


def create_diagnosis(connection: sqlite3.Connection, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    diagnosis_id = new_id("diagnosis")
    created_at = utc_now().isoformat()
    connection.execute(
        """INSERT INTO diagnoses (id, owner_id, source_attempt_ids_json, strengths_json, weaknesses_json,
        insufficient_evidence_json, explanation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (diagnosis_id, user_id, dump(data["attemptIds"]), dump(data["strengths"]), dump(data["weaknesses"]),
         dump(data["insufficientEvidence"]), data["explanation"], created_at),
    )
    return {"id": diagnosis_id, **data, "createdAt": created_at}


def latest_diagnosis(connection: sqlite3.Connection, user_id: str) -> dict[str, Any] | None:
    row = connection.execute("SELECT * FROM diagnoses WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1", (user_id,)).fetchone()
    if not row:
        return None
    return {"id": row["id"], "attemptIds": load(row["source_attempt_ids_json"], []), "strengths": load(row["strengths_json"], []),
            "weaknesses": load(row["weaknesses_json"], []), "insufficientEvidence": load(row["insufficient_evidence_json"], []),
            "explanation": row["explanation"], "createdAt": row["created_at"]}


def list_resources(connection: sqlite3.Connection, user_id: str, topic: str | None = None) -> list[dict[str, Any]]:
    if topic:
        rows = connection.execute(
            "SELECT * FROM learning_resources WHERE owner_id = ? AND topic_normalized = ? ORDER BY relevance DESC, created_at DESC",
            (user_id, normalize_topic(topic)),
        ).fetchall()
    else:
        rows = connection.execute("SELECT * FROM learning_resources WHERE owner_id = ? ORDER BY relevance DESC, created_at DESC", (user_id,)).fetchall()
    return [_resource(row) for row in rows]


def create_resource(connection: sqlite3.Connection, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    resource_id = new_id("resource")
    connection.execute(
        """INSERT INTO learning_resources (id, owner_id, topic, topic_normalized, title, url_or_reference,
        resource_type, relevance, reliability, provenance, difficulty, estimated_minutes, citation_json, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (resource_id, user_id, data["topic"], normalize_topic(data["topic"]), data["title"], data["url_or_reference"],
         data["resource_type"], data["relevance"], data["reliability"], data["provenance"], data.get("difficulty"),
         data.get("estimated_minutes"), dump(data.get("citation", {})), data["reason"], utc_now().isoformat()),
    )
    row = connection.execute("SELECT * FROM learning_resources WHERE id = ? AND owner_id = ?", (resource_id, user_id)).fetchone()
    assert row
    return _resource(row)


def get_current_plan(connection: sqlite3.Connection, user_id: str) -> dict[str, Any] | None:
    row = connection.execute("SELECT * FROM study_plans WHERE owner_id = ? AND status = 'current' ORDER BY version DESC LIMIT 1", (user_id,)).fetchone()
    return _plan(connection, user_id, row) if row else None


def _plan(connection: sqlite3.Connection, user_id: str, row: sqlite3.Row) -> dict[str, Any]:
    task_rows = connection.execute("SELECT * FROM plan_tasks WHERE plan_id = ? AND owner_id = ? ORDER BY task_date, priority DESC", (row["id"], user_id)).fetchall()
    tasks = [{
        "id": task["id"], "date": task["task_date"], "topic": task["topic"], "action": task["action"],
        "durationMinutes": task["duration_minutes"], "priority": task["priority"], "rationale": task["rationale"],
        "resourceId": task["resource_id"], "resourceReference": task["resource_reference"],
        "completed": bool(task["completed"]), "completedAt": task["completed_at"],
    } for task in task_rows]
    return {
        "id": row["id"], "version": row["version"], "startDate": row["start_date"], "endDate": row["end_date"],
        "diagnosisId": row["diagnosis_id"], "generationReason": row["generation_reason"], "status": row["status"],
        "summary": row["summary"], "changeSummary": load(row["change_summary_json"], []), "createdAt": row["created_at"], "tasks": tasks,
    }


def list_plan_history(connection: sqlite3.Connection, user_id: str) -> list[dict[str, Any]]:
    rows = connection.execute("SELECT * FROM study_plans WHERE owner_id = ? ORDER BY version DESC", (user_id,)).fetchall()
    return [_plan(connection, user_id, row) for row in rows]


def create_plan(connection: sqlite3.Connection, user_id: str, data: dict[str, Any], tasks: list[dict[str, Any]]) -> dict[str, Any]:
    current = get_current_plan(connection, user_id)
    next_version = (current["version"] + 1) if current else 1
    if current:
        connection.execute("UPDATE study_plans SET status = 'superseded' WHERE id = ? AND owner_id = ?", (current["id"], user_id))
    plan_id = new_id("plan")
    created_at = utc_now().isoformat()
    connection.execute(
        """INSERT INTO study_plans (id, owner_id, version, start_date, end_date, diagnosis_id, generation_reason,
        status, summary, change_summary_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'current', ?, ?, ?)""",
        (plan_id, user_id, next_version, data["start_date"], data["end_date"], data.get("diagnosis_id"),
         data["generation_reason"], data["summary"], dump(data.get("change_summary", [])), created_at),
    )
    for task in tasks:
        connection.execute(
            """INSERT INTO plan_tasks (id, plan_id, owner_id, task_date, topic, action, duration_minutes, priority,
            rationale, resource_id, resource_reference, completed, completed_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)""",
            (new_id("task"), plan_id, user_id, task["date"], task["topic"], task["action"], task["durationMinutes"],
             task["priority"], task["rationale"], task.get("resourceId"), task.get("resourceReference"), created_at),
        )
    row = connection.execute("SELECT * FROM study_plans WHERE id = ?", (plan_id,)).fetchone()
    assert row
    return _plan(connection, user_id, row)


def patch_task(connection: sqlite3.Connection, user_id: str, task_id: str, completed: bool) -> dict[str, Any] | None:
    cursor = connection.execute(
        "UPDATE plan_tasks SET completed = ?, completed_at = ? WHERE id = ? AND owner_id = ?",
        (int(completed), utc_now().isoformat() if completed else None, task_id, user_id),
    )
    if cursor.rowcount != 1:
        return None
    row = connection.execute("SELECT * FROM plan_tasks WHERE id = ? AND owner_id = ?", (task_id, user_id)).fetchone()
    assert row
    return {
        "id": row["id"], "date": row["task_date"], "topic": row["topic"], "action": row["action"],
        "durationMinutes": row["duration_minutes"], "priority": row["priority"], "rationale": row["rationale"],
        "resourceId": row["resource_id"], "resourceReference": row["resource_reference"],
        "completed": bool(row["completed"]), "completedAt": row["completed_at"],
    }


def get_attempt(connection: sqlite3.Connection, user_id: str, attempt_id: str) -> dict[str, Any] | None:
    attempt = connection.execute("SELECT * FROM quiz_attempts WHERE id = ? AND owner_id = ?", (attempt_id, user_id)).fetchone()
    if not attempt:
        return None
    topics = connection.execute("SELECT * FROM topic_results WHERE attempt_id = ? AND owner_id = ?", (attempt_id, user_id)).fetchall()
    quiz = connection.execute("SELECT title, subject, topic FROM quizzes WHERE id = ? AND owner_id = ?", (attempt["quiz_id"], user_id)).fetchone()
    return {
        "id": attempt["id"], "quizId": attempt["quiz_id"], "quizTitle": quiz["title"] if quiz else "Quiz",
        "subject": quiz["subject"] if quiz else "", "topic": quiz["topic"] if quiz else "",
        "correct": attempt["correct_count"], "incorrect": attempt["incorrect_count"], "unattempted": attempt["unattempted_count"],
        "graded": attempt["graded_count"], "attempted": attempt["attempted_count"], "percentage": attempt["percentage"],
        "startedAt": attempt["started_at"], "submittedAt": attempt["submitted_at"], "durationSeconds": attempt["duration_seconds"],
        "topicResults": [{"topic": r["topic"], "correct": r["correct_count"], "graded": r["graded_count"],
                          "attempted": r["attempted_count"], "accuracy": r["accuracy"]} for r in topics],
    }


def list_attempts(connection: sqlite3.Connection, user_id: str) -> list[dict[str, Any]]:
    rows = connection.execute("SELECT id FROM quiz_attempts WHERE owner_id = ? ORDER BY submitted_at DESC", (user_id,)).fetchall()
    return [result for row in rows if (result := get_attempt(connection, user_id, row["id"]))]

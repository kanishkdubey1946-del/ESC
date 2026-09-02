"""SQLite connection and idempotent schema migrations for ESC."""

from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator


ROOT = Path(__file__).resolve().parents[1]
DATABASE_PATH = Path(os.getenv("COMET_DATABASE_PATH", ROOT / "comet.db"))


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@contextmanager
def database() -> Iterator[sqlite3.Connection]:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


MIGRATIONS: tuple[tuple[str, str], ...] = (
    (
        "001_auth",
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_salt BLOB NOT NULL,
            password_hash BLOB NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash BLOB PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        """,
    ),
    (
        "002_esc_learning_memory",
        """
        CREATE TABLE IF NOT EXISTS student_profiles (
            user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            grade TEXT NOT NULL,
            curriculum TEXT NOT NULL,
            subjects_json TEXT NOT NULL,
            goal TEXT NOT NULL,
            deadline TEXT,
            weekly_hours REAL NOT NULL DEFAULT 0,
            daily_availability_json TEXT NOT NULL DEFAULT '{}',
            preferred_session_minutes INTEGER NOT NULL DEFAULT 45,
            weak_topics_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS learning_sources (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            source_type TEXT NOT NULL,
            extracted_text TEXT NOT NULL DEFAULT '',
            reference TEXT,
            topics_json TEXT NOT NULL DEFAULT '[]',
            provenance TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_learning_sources_owner ON learning_sources(owner_id, created_at DESC);
        CREATE TABLE IF NOT EXISTS quizzes (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            subject TEXT NOT NULL,
            topic TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            source_references_json TEXT NOT NULL DEFAULT '[]',
            provenance TEXT NOT NULL DEFAULT 'original_exam_style_practice',
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_quizzes_owner ON quizzes(owner_id, created_at DESC);
        CREATE TABLE IF NOT EXISTS quiz_questions (
            id TEXT PRIMARY KEY,
            quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            prompt TEXT NOT NULL,
            options_json TEXT NOT NULL,
            correct_index INTEGER NOT NULL CHECK(correct_index BETWEEN 0 AND 3),
            explanation TEXT NOT NULL,
            topic TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            provenance TEXT NOT NULL DEFAULT 'original_exam_style_practice',
            position INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id, position);
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            submitted_answers_json TEXT NOT NULL,
            correct_count INTEGER NOT NULL,
            incorrect_count INTEGER NOT NULL,
            unattempted_count INTEGER NOT NULL,
            graded_count INTEGER NOT NULL,
            attempted_count INTEGER NOT NULL,
            percentage REAL NOT NULL,
            started_at TEXT,
            submitted_at TEXT NOT NULL,
            duration_seconds INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_quiz_attempts_owner ON quiz_attempts(owner_id, submitted_at DESC);
        CREATE TABLE IF NOT EXISTS topic_results (
            id TEXT PRIMARY KEY,
            attempt_id TEXT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
            owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            topic TEXT NOT NULL,
            topic_normalized TEXT NOT NULL,
            correct_count INTEGER NOT NULL,
            graded_count INTEGER NOT NULL,
            attempted_count INTEGER NOT NULL,
            accuracy REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_topic_results_owner_topic ON topic_results(owner_id, topic_normalized);
        CREATE TABLE IF NOT EXISTS mastery_states (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            topic TEXT NOT NULL,
            topic_normalized TEXT NOT NULL,
            mastery REAL NOT NULL,
            confidence REAL NOT NULL,
            status TEXT NOT NULL,
            trend TEXT NOT NULL,
            cumulative_graded_count INTEGER NOT NULL,
            latest_accuracy REAL NOT NULL,
            previous_accuracy REAL,
            assessed_at TEXT NOT NULL,
            UNIQUE(owner_id, topic_normalized)
        );
        CREATE INDEX IF NOT EXISTS idx_mastery_owner ON mastery_states(owner_id, mastery ASC);
        CREATE TABLE IF NOT EXISTS diagnoses (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            source_attempt_ids_json TEXT NOT NULL DEFAULT '[]',
            strengths_json TEXT NOT NULL DEFAULT '[]',
            weaknesses_json TEXT NOT NULL DEFAULT '[]',
            insufficient_evidence_json TEXT NOT NULL DEFAULT '[]',
            explanation TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_diagnoses_owner ON diagnoses(owner_id, created_at DESC);
        CREATE TABLE IF NOT EXISTS study_plans (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            version INTEGER NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            diagnosis_id TEXT REFERENCES diagnoses(id) ON DELETE SET NULL,
            generation_reason TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'current',
            summary TEXT NOT NULL,
            change_summary_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            UNIQUE(owner_id, version)
        );
        CREATE INDEX IF NOT EXISTS idx_study_plans_owner ON study_plans(owner_id, version DESC);
        CREATE TABLE IF NOT EXISTS learning_resources (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            topic TEXT NOT NULL,
            topic_normalized TEXT NOT NULL,
            title TEXT NOT NULL,
            url_or_reference TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            relevance REAL NOT NULL,
            reliability TEXT NOT NULL,
            provenance TEXT NOT NULL,
            difficulty TEXT,
            estimated_minutes INTEGER,
            citation_json TEXT NOT NULL DEFAULT '{}',
            reason TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_resources_owner_topic ON learning_resources(owner_id, topic_normalized);
        CREATE TABLE IF NOT EXISTS plan_tasks (
            id TEXT PRIMARY KEY,
            plan_id TEXT NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
            owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            task_date TEXT NOT NULL,
            topic TEXT NOT NULL,
            action TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
            priority INTEGER NOT NULL,
            rationale TEXT NOT NULL,
            resource_id TEXT REFERENCES learning_resources(id) ON DELETE SET NULL,
            resource_reference TEXT,
            completed INTEGER NOT NULL DEFAULT 0,
            completed_at TEXT,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan ON plan_tasks(plan_id, task_date);
        CREATE INDEX IF NOT EXISTS idx_plan_tasks_owner ON plan_tasks(owner_id, completed, task_date);
        """,
    ),
)


def initialise_database() -> None:
    with database() as connection:
        connection.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
        )
        for version, script in MIGRATIONS:
            applied = connection.execute(
                "SELECT 1 FROM schema_migrations WHERE version = ?", (version,)
            ).fetchone()
            if not applied:
                connection.executescript(script)
                connection.execute(
                    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                    (version, utc_now().isoformat()),
                )

"""Authoritative mastery calculations. AI may explain these numbers, never replace them."""

from __future__ import annotations

import sqlite3
from typing import Any

from app.repositories import student_repository as repo


FIRST_MASTERY_WEIGHT = 1.0
PREVIOUS_MASTERY_WEIGHT = 0.40
LATEST_ACCURACY_WEIGHT = 0.60
CONFIDENCE_QUESTION_COUNT = 10
MIN_EVIDENCE_QUESTIONS = 3
WEAK_THRESHOLD = 65
STRONG_THRESHOLD = 80
TREND_DELTA = 10


def accuracy(correct: int, graded: int) -> float:
    return round((correct / graded) * 100, 2) if graded else 0.0


def status_for(mastery: float, cumulative_graded_count: int) -> str:
    if cumulative_graded_count < MIN_EVIDENCE_QUESTIONS:
        return "insufficient_evidence"
    if mastery < WEAK_THRESHOLD:
        return "weak"
    if mastery < STRONG_THRESHOLD:
        return "developing"
    return "strong"


def trend_for(previous_accuracy: float | None, latest_accuracy: float) -> str:
    if previous_accuracy is None:
        return "insufficient"
    difference = latest_accuracy - previous_accuracy
    if difference >= TREND_DELTA:
        return "improving"
    if difference <= -TREND_DELTA:
        return "declining"
    return "stable"


def calculate_state(previous: sqlite3.Row | None, topic: str, correct: int, graded: int) -> dict[str, Any]:
    latest = accuracy(correct, graded)
    if previous is None:
        mastery = latest * FIRST_MASTERY_WEIGHT
        prior_accuracy = None
        cumulative = graded
    else:
        mastery = PREVIOUS_MASTERY_WEIGHT * float(previous["mastery"]) + LATEST_ACCURACY_WEIGHT * latest
        prior_accuracy = float(previous["latest_accuracy"])
        cumulative = int(previous["cumulative_graded_count"]) + graded
    mastery = round(mastery, 2)
    confidence = round(min(1.0, cumulative / CONFIDENCE_QUESTION_COUNT), 2)
    return {
        "topic": topic,
        "mastery": mastery,
        "confidence": confidence,
        "status": status_for(mastery, cumulative),
        "trend": trend_for(prior_accuracy, latest),
        "cumulativeGradedCount": cumulative,
        "latestAccuracy": latest,
        "previousAccuracy": prior_accuracy,
    }


def update_mastery(
    connection: sqlite3.Connection, user_id: str, topic_results: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    changes: list[dict[str, Any]] = []
    for result in topic_results:
        if not result["graded"]:
            continue
        normalized = repo.normalize_topic(result["topic"])
        existing = repo.get_mastery(connection, user_id, normalized)
        before = None if existing is None else {
            "mastery": float(existing["mastery"]), "status": existing["status"],
            "latestAccuracy": float(existing["latest_accuracy"]), "trend": existing["trend"],
        }
        state = calculate_state(existing, result["topic"], result["correct"], result["graded"])
        repo.upsert_mastery(connection, user_id, state)
        changes.append({"topic": result["topic"], "before": before, "after": state})
    return changes

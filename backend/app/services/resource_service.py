"""Topic-matched resource ranking; no live research is needed for routine recommendations."""

from __future__ import annotations

import sqlite3
from typing import Any

from app.repositories import student_repository as repo


def recommend_for_topic(connection: sqlite3.Connection, user_id: str, topic: str) -> list[dict[str, Any]]:
    existing = repo.list_resources(connection, user_id, topic)
    if len(existing) >= 2:
        return existing[:3]
    normalized = repo.normalize_topic(topic)
    candidates: list[dict[str, Any]] = list(existing)
    source_records = repo.list_sources(connection, user_id)
    for source in source_records:
        source_topics = {repo.normalize_topic(item) for item in source["topics"]}
        if normalized in source_topics or normalized in source["extractedText"].lower():
            candidates.append(repo.create_resource(connection, user_id, {
                "topic": topic, "title": source["title"], "url_or_reference": source["reference"] or source["id"],
                "resource_type": "student_material", "relevance": 0.98, "reliability": "Student-provided material",
                "provenance": source["provenance"], "difficulty": None, "estimated_minutes": 25,
                "citation": {"sourceId": source["id"]},
                "reason": f"Your uploaded material is tagged or matched to {topic}.",
            }))
        if len(candidates) >= 3:
            return candidates[:3]
    fallbacks = [
        {
            "title": f"Concept review: {topic}", "url_or_reference": f"Review the {topic} section in your prescribed textbook or class notes.",
            "resource_type": "study_guidance", "estimated_minutes": 25,
            "reason": f"A focused review is recommended because this topic needs more evidence or reinforcement.",
        },
        {
            "title": f"Retrieval practice: {topic}", "url_or_reference": f"Complete a closed-book recall exercise and five original practice questions for {topic}.",
            "resource_type": "practice", "estimated_minutes": 20,
            "reason": "Active recall gives ESC another performance signal for the next re-test.",
        },
    ]
    for fallback in fallbacks:
        if len(candidates) >= 3:
            break
        candidates.append(repo.create_resource(connection, user_id, {
            "topic": topic, "relevance": 0.72, "reliability": "ESC deterministic recommendation",
            "provenance": "No external source was automatically claimed or fetched.", "difficulty": None,
            "citation": {}, **fallback,
        }))
    return candidates[:3]

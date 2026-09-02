from __future__ import annotations

import sqlite3
from datetime import date, timedelta
from typing import Any

from app.repositories import student_repository as repo
from app.services import resource_service


def _deadline_days(deadline: str | None) -> int:
    if not deadline:
        return 7
    try:
        return max(1, min(7, (date.fromisoformat(deadline) - date.today()).days + 1))
    except ValueError:
        return 7


def priority_for(state: dict[str, Any], days_remaining: int) -> int:
    weakness_gap = max(0.0, 100 - float(state["mastery"]))
    confidence_gap = (1 - float(state["confidence"])) * 20
    trend_penalty = 15 if state["trend"] == "declining" else 0
    urgency = max(0, 14 - days_remaining) * 2
    return round(weakness_gap + confidence_gap + trend_penalty + urgency)


def _available_minutes(profile: dict[str, Any], current_date: date) -> int:
    availability = profile["dailyAvailability"]
    day = current_date.strftime("%A").lower()
    if day in availability:
        return int(availability[day])
    if "default" in availability:
        return int(availability["default"])
    weekly = float(profile["weeklyHours"])
    return int((weekly * 60) / 7) if weekly > 0 else 0


def create_personalized_plan(
    connection: sqlite3.Connection, user_id: str, generation_reason: str, diagnosis: dict[str, Any] | None
) -> dict[str, Any] | None:
    profile = repo.get_profile(connection, user_id)
    if not profile:
        return None
    states = repo.list_mastery(connection, user_id)
    days = _deadline_days(profile["deadline"])
    today = date.today()
    priorities = [{**state, "priority": priority_for(state, days)} for state in states]
    if not priorities:
        priorities = [{"topic": topic, "mastery": 50.0, "confidence": 0.0, "status": "insufficient_evidence",
                       "trend": "insufficient", "latestAccuracy": 0.0, "priority": 70} for topic in profile["weakTopics"]]
    priorities.sort(key=lambda item: item["priority"], reverse=True)
    old_plan = repo.get_current_plan(connection, user_id)
    resource_by_topic: dict[str, dict[str, Any]] = {}
    for state in priorities[:3]:
        recommended = resource_service.recommend_for_topic(connection, user_id, state["topic"])
        if recommended:
            resource_by_topic[repo.normalize_topic(state["topic"])] = recommended[0]
    tasks: list[dict[str, Any]] = []
    if priorities:
        cursor = 0
        for offset in range(days):
            task_day = today + timedelta(days=offset)
            remaining = _available_minutes(profile, task_day)
            session = profile["preferredSessionMinutes"]
            while remaining >= 15 and len([task for task in tasks if task["date"] == task_day.isoformat()]) < 3:
                state = priorities[cursor % len(priorities)]
                duration = min(session, remaining)
                resource = resource_by_topic.get(repo.normalize_topic(state["topic"]))
                action = "Re-test with a short diagnostic" if state["status"] == "insufficient_evidence" else "Review concepts, then complete targeted retrieval practice"
                tasks.append({
                    "date": task_day.isoformat(), "topic": state["topic"], "action": action,
                    "durationMinutes": duration, "priority": state["priority"],
                    "rationale": f"Mastery is {state['mastery']:.0f}; latest accuracy is {state['latestAccuracy']:.0f}% and trend is {state['trend']}.",
                    "resourceId": resource["id"] if resource else None,
                    "resourceReference": resource["urlOrReference"] if resource else None,
                })
                remaining -= duration
                cursor += 1
    change_summary: list[dict[str, str]] = []
    if old_plan:
        previous_priorities: dict[str, int] = {}
        for task in old_plan["tasks"]:
            previous_priorities[task["topic"]] = max(previous_priorities.get(task["topic"], 0), task["priority"])
        new_priorities = {item["topic"]: item["priority"] for item in priorities}
        for topic, priority in list(new_priorities.items())[:3]:
            previous = previous_priorities.get(topic)
            if previous is None:
                change_summary.append({"topic": topic, "change": "added", "reason": "New performance evidence created a priority."})
            elif priority > previous:
                change_summary.append({"topic": topic, "change": "increased", "reason": "Priority increased after the latest performance update."})
            elif priority < previous:
                change_summary.append({"topic": topic, "change": "decreased", "reason": "Priority decreased after stronger recent performance."})
        unfinished = sum(1 for task in old_plan["tasks"] if not task["completed"])
        if unfinished:
            change_summary.append({"topic": "Plan", "change": "rescheduled", "reason": f"{unfinished} incomplete task(s) were considered in this new plan version."})
    if not tasks:
        summary = "No study tasks were scheduled because the profile has no available study minutes. Update availability to generate a feasible plan."
    else:
        summary = f"Versioned {days}-day plan with {len(tasks)} task(s), constrained to your declared availability."
    return repo.create_plan(connection, user_id, {
        "start_date": today.isoformat(), "end_date": (today + timedelta(days=days - 1)).isoformat(),
        "diagnosis_id": diagnosis["id"] if diagnosis else None, "generation_reason": generation_reason,
        "summary": summary, "change_summary": change_summary,
    }, tasks)

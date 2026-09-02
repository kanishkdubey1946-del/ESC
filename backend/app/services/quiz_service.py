from __future__ import annotations

import sqlite3
from collections import defaultdict
from typing import Any

from fastapi import HTTPException, status

from app.openai_client import generate_json, is_any_provider_configured
from app.repositories import student_repository as repo
from app.services import diagnosis_service, mastery_service, plan_service


def validate_questions(raw: Any, topic: str, difficulty: str) -> list[dict[str, Any]]:
    if isinstance(raw, dict):
        raw = raw.get("questions")
    if not isinstance(raw, list):
        raise ValueError("Expected a questions array.")
    result: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError("Every question must be an object.")
        prompt = str(item.get("prompt") or item.get("question") or "").strip()
        options = item.get("options")
        correct_index = item.get("correct_index", item.get("correctIndex"))
        explanation = str(item.get("explanation") or "").strip()
        question_topic = str(item.get("topic") or topic).strip()
        question_difficulty = str(item.get("difficulty") or difficulty).strip().lower()
        if not prompt or not isinstance(options, list) or len(options) != 4:
            raise ValueError("Each question needs a prompt and exactly four options.")
        cleaned_options = [str(option).strip() for option in options]
        if any(not option for option in cleaned_options) or len({option.lower() for option in cleaned_options}) != 4:
            raise ValueError("Question options must be four distinct meaningful choices.")
        if not isinstance(correct_index, int) or correct_index not in range(4) or not explanation or not question_topic:
            raise ValueError("Question answer, explanation, topic, or difficulty is invalid.")
        result.append({"prompt": prompt, "options": cleaned_options, "correct_index": correct_index,
                       "explanation": explanation, "topic": question_topic, "difficulty": question_difficulty,
                       "provenance": str(item.get("provenance") or "original_exam_style_practice")})
    if not result:
        raise ValueError("At least one valid question is required.")
    return result


def fallback_questions(topic: str, difficulty: str, count: int) -> list[dict[str, Any]]:
    stems = [
        ("Which study action best checks your understanding of {topic}?", "Explain the core idea from memory, then check your notes", "Read the heading once", "Skip practice until exam week", "Memorize an unrelated definition"),
        ("After reviewing {topic}, what is the most useful next step?", "Solve a short problem and explain each step", "Only highlight the chapter", "Switch topics without checking recall", "Wait for an answer key before attempting anything"),
        ("What does a strong answer about {topic} need first?", "A correct use of its key definitions and relationships", "A longer introduction", "A copied paragraph without reasoning", "A guess based only on keywords"),
        ("Which error should you investigate after a question on {topic}?", "The exact step or concept that led to the wrong choice", "Only the time on the clock", "The question number", "A classmate's score"),
    ]
    questions: list[dict[str, Any]] = []
    for index in range(count):
        stem, correct, *wrong = stems[index % len(stems)]
        options = [correct, *wrong]
        correct_index = index % 4
        options = options[-correct_index:] + options[:-correct_index] if correct_index else options
        questions.append({
            "prompt": stem.format(topic=topic), "options": options, "correct_index": correct_index,
            "explanation": f"This original practice item checks a transferable study skill for {topic}; use uploaded or prescribed material for subject-specific review.",
            "topic": topic, "difficulty": difficulty, "provenance": "original_exam_style_practice",
        })
    return questions


async def generate_quiz(connection: sqlite3.Connection, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    source_ids = data.get("source_ids", [])
    try:
        sources = repo.owned_sources(connection, user_id, source_ids)
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more requested sources were not found.") from error
    questions: list[dict[str, Any]] | None = None
    if is_any_provider_configured():
        source_context = "\n".join(f"SOURCE: {source['title']}\n{source['extractedText'][:6000]}" for source in sources)
        prompt = (
            f"Create {data['question_count']} original exam-style diagnostic MCQs for subject {data['subject']} and topic {data['topic']}. "
            f"Difficulty: {data['difficulty']}. Return JSON {{\"questions\":[...]}} only. Each item must have prompt, exactly four distinct options, "
            "correct_index (0-3), explanation, topic and difficulty. Do not claim previous-year provenance unless the supplied source proves it.\n"
            f"{source_context}"
        )
        for retry in range(2):
            response = await generate_json(system_message="You produce valid, safe educational MCQ JSON.", user_message=prompt, agent_id="examinsight", temperature=0.2)
            if response.get("success"):
                try:
                    questions = validate_questions(response.get("data"), data["topic"], data["difficulty"])
                    if len(questions) == data["question_count"]:
                        break
                    questions = None
                except ValueError as error:
                    prompt += f"\nValidation feedback: {error}. Correct the structure exactly."
            if retry == 1:
                questions = None
    if questions is None:
        questions = fallback_questions(data["topic"], data["difficulty"], data["question_count"])
    return repo.create_quiz(connection, user_id, {
        "title": f"{data['topic']} diagnostic", "subject": data["subject"], "topic": data["topic"],
        "difficulty": data["difficulty"], "duration_minutes": data["duration_minutes"], "source_ids": source_ids,
        "provenance": "original_exam_style_practice",
    }, questions)


def submit_attempt(connection: sqlite3.Connection, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    loaded = repo.get_quiz_with_keys(connection, user_id, data["quiz_id"])
    if not loaded:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
    quiz, questions = loaded
    known_ids = {row["id"] for row in questions}
    answer_map = {answer["question_id"]: answer.get("selected_index") for answer in data["answers"]}
    if not set(answer_map).issubset(known_ids):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="An answer does not belong to this quiz.")
    correct = incorrect = attempted = 0
    by_topic: dict[str, dict[str, int]] = defaultdict(lambda: {"correct": 0, "graded": 0, "attempted": 0})
    review: list[dict[str, Any]] = []
    stored_answers: list[dict[str, Any]] = []
    for question in questions:
        selection = answer_map.get(question["id"])
        is_attempted = selection is not None
        is_correct = is_attempted and selection == question["correct_index"]
        if is_attempted:
            attempted += 1
        if is_correct:
            correct += 1
        elif is_attempted:
            incorrect += 1
        topic = question["topic"]
        by_topic[topic]["graded"] += 1
        by_topic[topic]["attempted"] += int(is_attempted)
        by_topic[topic]["correct"] += int(is_correct)
        stored_answers.append({"questionId": question["id"], "selectedIndex": selection})
        review.append({"questionId": question["id"], "prompt": question["prompt"], "selectedIndex": selection,
                       "correctIndex": question["correct_index"], "explanation": question["explanation"],
                       "topic": topic, "isCorrect": bool(is_correct)})
    graded = len(questions)
    unattempted = graded - attempted
    percentage = round((correct / graded) * 100, 2) if graded else 0.0
    topic_results = [{"topic": topic, **values, "accuracy": mastery_service.accuracy(values["correct"], values["graded"])} for topic, values in by_topic.items()]
    attempt_id = repo.insert_attempt(connection, user_id, {
        "quiz_id": quiz["id"], "answers": stored_answers, "correct_count": correct, "incorrect_count": incorrect,
        "unattempted_count": unattempted, "graded_count": graded, "attempted_count": attempted, "percentage": percentage,
        "started_at": data.get("started_at"), "duration_seconds": data["duration_seconds"],
    })
    for topic_result in topic_results:
        repo.insert_topic_result(connection, user_id, attempt_id, topic_result)
    mastery_changes = mastery_service.update_mastery(connection, user_id, topic_results)
    diagnosis = diagnosis_service.create_deterministic_diagnosis(connection, user_id, [attempt_id])
    plan = plan_service.create_personalized_plan(connection, user_id, "Updated after diagnostic re-test", diagnosis)
    attempt = repo.get_attempt(connection, user_id, attempt_id)
    assert attempt
    return {**attempt, "review": review, "masteryChanges": mastery_changes, "diagnosis": diagnosis,
            "plan": plan, "planChangeSummary": plan["changeSummary"] if plan else []}

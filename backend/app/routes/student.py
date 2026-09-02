from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.auth import UserResponse, current_user
from app.db import database
from app.models.student import (
    DiagnosisCreate,
    PlanCreate,
    PlanTaskPatch,
    ProfileUpsert,
    QuizAttemptCreate,
    QuizGenerateRequest,
    ResourceCreate,
    SourceCreate,
)
from app.repositories import student_repository as repo
from app.services import diagnosis_service, plan_service, quiz_service
from app.source_extract import extract_text_from_bytes


router = APIRouter(prefix="/api/v1/me", tags=["ESC learning memory"])


def profile_data(payload: ProfileUpsert) -> dict:
    result = payload.model_dump()
    result["deadline"] = result["deadline"].isoformat() if result["deadline"] else None
    return result


@router.get("/profile")
def get_profile(user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        return {"profile": repo.get_profile(connection, user.id)}


@router.put("/profile")
def put_profile(payload: ProfileUpsert, user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        return {"profile": repo.upsert_profile(connection, user.id, profile_data(payload))}


@router.get("/memory")
def get_memory(user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        current_plan = repo.get_current_plan(connection, user.id)
        attempts = repo.list_attempts(connection, user.id)
        sources = repo.list_sources(connection, user.id)
        resources = repo.list_resources(connection, user.id)
        return {
            "profile": repo.get_profile(connection, user.id), "mastery": repo.list_mastery(connection, user.id),
            "diagnosis": repo.latest_diagnosis(connection, user.id), "currentPlan": current_plan,
            "recentAttempts": attempts[:10], "sources": sources, "resources": resources,
            "planProgress": {
                "completed": sum(1 for task in (current_plan or {}).get("tasks", []) if task["completed"]),
                "total": len((current_plan or {}).get("tasks", [])),
            },
        }


@router.post("/sources", status_code=status.HTTP_201_CREATED)
def post_source(payload: SourceCreate, user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        return {"source": repo.create_source(connection, user.id, payload.model_dump())}


@router.get("/sources")
def get_sources(user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        return {"sources": repo.list_sources(connection, user.id)}


@router.post("/sources/upload", status_code=status.HTTP_201_CREATED)
async def upload_source(
    file: UploadFile = File(...), topics_json: str = "[]", user: UserResponse = Depends(current_user)
) -> dict:
    try:
        topics = json.loads(topics_json)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Topics must be a JSON array.") from error
    if not isinstance(topics, list) or not all(isinstance(topic, str) for topic in topics):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Topics must be a list of strings.")
    raw = await file.read()
    extracted = extract_text_from_bytes(
        filename=file.filename or "upload", content_type=file.content_type or "", data=raw
    )
    if not extracted.get("success"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=extracted.get("error", "Could not extract source text."))
    with database() as connection:
        source = repo.create_source(connection, user.id, {
            "title": file.filename or "upload", "source_type": extracted.get("format") or file.content_type or "upload",
            "extracted_text": extracted.get("text", ""), "reference": None, "topics": [topic.strip() for topic in topics if topic.strip()],
            "provenance": "Student-uploaded material",
        })
    return {"source": source}


@router.post("/quizzes/generate", status_code=status.HTTP_201_CREATED)
async def post_generate_quiz(payload: QuizGenerateRequest, user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        quiz = await quiz_service.generate_quiz(connection, user.id, payload.model_dump())
        return {"quiz": quiz}


@router.get("/quizzes/{quiz_id}")
def get_quiz(quiz_id: str, user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        quiz = repo.get_quiz(connection, user.id, quiz_id, include_answers=False)
        if not quiz:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
        return {"quiz": quiz}


@router.post("/quiz-attempts", status_code=status.HTTP_201_CREATED)
def post_quiz_attempt(payload: QuizAttemptCreate, user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        return {"attempt": quiz_service.submit_attempt(connection, user.id, payload.model_dump())}


@router.get("/quiz-attempts")
def get_quiz_attempts(user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        return {"attempts": repo.list_attempts(connection, user.id)}


@router.get("/quiz-attempts/{attempt_id}")
def get_quiz_attempt(attempt_id: str, user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        attempt = repo.get_attempt(connection, user.id, attempt_id)
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz attempt not found.")
        return {"attempt": attempt}


@router.post("/diagnoses", status_code=status.HTTP_201_CREATED)
def post_diagnosis(payload: DiagnosisCreate, user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        for attempt_id in payload.attempt_ids:
            if not repo.get_attempt(connection, user.id, attempt_id):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz attempt not found.")
        diagnosis = diagnosis_service.create_deterministic_diagnosis(connection, user.id, payload.attempt_ids)
        return {"diagnosis": diagnosis}


@router.get("/diagnoses/latest")
def get_latest_diagnosis(user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        return {"diagnosis": repo.latest_diagnosis(connection, user.id)}


@router.post("/study-plans", status_code=status.HTTP_201_CREATED)
def post_study_plan(payload: PlanCreate, user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        if not repo.get_profile(connection, user.id):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Complete your profile before generating a study plan.")
        diagnosis = repo.latest_diagnosis(connection, user.id)
        if not diagnosis:
            diagnosis = diagnosis_service.create_deterministic_diagnosis(connection, user.id)
        plan = plan_service.create_personalized_plan(connection, user.id, payload.generation_reason, diagnosis)
        return {"plan": plan}


@router.get("/study-plans/current")
def get_current_plan(user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        return {"plan": repo.get_current_plan(connection, user.id)}


@router.get("/study-plans/history")
def get_plan_history(user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        return {"plans": repo.list_plan_history(connection, user.id)}


@router.patch("/plan-tasks/{task_id}")
def patch_plan_task(task_id: str, payload: PlanTaskPatch, user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        task = repo.patch_task(connection, user.id, task_id, payload.completed)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan task not found.")
        return {"task": task}


@router.get("/resources")
def get_resources(topic: str | None = Query(default=None, max_length=160), user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        return {"resources": repo.list_resources(connection, user.id, topic)}


@router.post("/resources", status_code=status.HTTP_201_CREATED)
def post_resource(payload: ResourceCreate, user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        return {"resource": repo.create_resource(connection, user.id, payload.model_dump())}

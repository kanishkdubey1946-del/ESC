from __future__ import annotations

import json
import mimetypes
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

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
    StudentNoteCreate,
    StudentProfileUpdate,
)
from app.repositories import student_repository as repo
from app.services import diagnosis_service, plan_service, quiz_service
from app.source_extract import extract_text_from_bytes


router = APIRouter(prefix="/api/v1/me", tags=["ESC learning memory"])
UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "profile_uploads"
MAX_PROFILE_UPLOAD_BYTES = 5 * 1024 * 1024


async def persist_upload(file: UploadFile, user_id: str, allowed_types: set[str]) -> tuple[str, str, str]:
    """Persist a bounded, user-scoped upload. Downloads are always auth-checked."""
    content_type = (file.content_type or "").lower()
    if content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Only PDF, PNG, JPEG, or WebP files are supported.")
    raw = await file.read(MAX_PROFILE_UPLOAD_BYTES + 1)
    if len(raw) > MAX_PROFILE_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Files must be 5 MB or smaller.")
    suffix = mimetypes.guess_extension(content_type) or ".bin"
    filename = f"{secrets.token_urlsafe(18)}{suffix}"
    directory = UPLOAD_ROOT / user_id
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / filename
    path.write_bytes(raw)
    return str(path), file.filename or f"upload{suffix}", content_type


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


@router.get("/profile/details")
def get_profile_details(user: UserResponse = Depends(current_user)) -> dict:
    """Account profile plus lightweight agent-owned activity aggregates."""
    with database() as connection:
        profile = repo.get_profile(connection, user.id)
        return {
            "profile": profile,
            "user": {"id": user.id, "name": user.name, "email": user.email},
            "activity": repo.activity_stats(connection, user.id),
        }


@router.put("/profile/details")
def put_profile_details(payload: StudentProfileUpdate, user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        profile = repo.update_student_profile(connection, user.id, payload.model_dump(by_alias=True, exclude_unset=True))
        return {"profile": profile, "activity": repo.activity_stats(connection, user.id)}


@router.post("/profile/image")
async def post_profile_image(file: UploadFile = File(...), user: UserResponse = Depends(current_user)) -> dict:
    path, _filename, _content_type = await persist_upload(file, user.id, {"image/jpeg", "image/png", "image/webp"})
    with database() as connection:
        profile = repo.set_profile_image(connection, user.id, "/api/v1/me/profile/image", path)
    # The image URL points to an authenticated endpoint; it is never a public disk path.
    return {"profile": profile, "imageUrl": "/api/v1/me/profile/image"}


@router.get("/profile/image")
def get_profile_image(user: UserResponse = Depends(current_user)) -> FileResponse:
    with database() as connection:
        profile = repo.get_profile(connection, user.id)
        image_row = connection.execute("SELECT profile_image_key FROM student_profiles WHERE user_id = ?", (user.id,)).fetchone()
    if not profile or not profile.get("profileImageUrl"):
        raise HTTPException(status_code=404, detail="Profile image not found.")
    image_path = Path(image_row["profile_image_key"] or "") if image_row else Path()
    if not image_path.is_file() or UPLOAD_ROOT not in image_path.parents:
        raise HTTPException(status_code=404, detail="Profile image not found.")
    return FileResponse(image_path)


@router.post("/notes", status_code=status.HTTP_201_CREATED)
async def post_student_note(
    title: str = Form(...), subject: str = Form(""), resource_link: str | None = Form(None),
    file: UploadFile | None = File(None), user: UserResponse = Depends(current_user),
) -> dict:
    payload = StudentNoteCreate(title=title, subject=subject, resource_link=resource_link)
    if not file and not payload.resource_link:
        raise HTTPException(status_code=422, detail="Add a PDF/image file or an external resource link.")
    data = payload.model_dump()
    if file:
        path, filename, content_type = await persist_upload(file, user.id, {"application/pdf", "image/jpeg", "image/png", "image/webp"})
        data.update({"file_path": path, "file_name": filename, "file_content_type": content_type})
    with database() as connection:
        return {"note": repo.create_student_note(connection, user.id, data)}


@router.get("/notes")
def get_student_notes(offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=50), user: UserResponse = Depends(current_user)) -> dict:
    with database() as connection:
        return {"notes": repo.list_student_notes(connection, user.id, offset, limit), "activity": repo.activity_stats(connection, user.id)}


@router.get("/profile/files/{note_id}")
def get_student_note_file(note_id: str, user: UserResponse = Depends(current_user)) -> FileResponse:
    with database() as connection:
        note = repo.get_student_note(connection, user.id, note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found.")
        row = connection.execute("SELECT file_path FROM student_notes WHERE id = ? AND owner_id = ?", (note_id, user.id)).fetchone()
    path = Path(row["file_path"]) if row and row["file_path"] else None
    if not path or not path.is_file() or UPLOAD_ROOT not in path.parents:
        raise HTTPException(status_code=404, detail="Note file not found.")
    return FileResponse(path, filename=note["fileName"])


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

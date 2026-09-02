from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator


class ProfileUpsert(BaseModel):
    grade: str = Field(min_length=1, max_length=80)
    curriculum: str = Field(min_length=1, max_length=120)
    subjects: list[str] = Field(min_length=1, max_length=20)
    goal: str = Field(min_length=1, max_length=240)
    deadline: date | None = None
    weekly_hours: float = Field(default=0, ge=0, le=112)
    daily_availability: dict[str, int] = Field(default_factory=dict)
    preferred_session_minutes: int = Field(default=45, ge=15, le=180)
    weak_topics: list[str] = Field(default_factory=list, max_length=30)

    @field_validator("subjects")
    @classmethod
    def clean_subjects(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values if value.strip()]
        if not cleaned:
            raise ValueError("At least one subject is required.")
        return cleaned

    @field_validator("weak_topics")
    @classmethod
    def clean_weak_topics(cls, values: list[str]) -> list[str]:
        return [value.strip() for value in values if value.strip()]

    @field_validator("daily_availability")
    @classmethod
    def validate_availability(cls, values: dict[str, int]) -> dict[str, int]:
        if any(minutes < 0 or minutes > 1440 for minutes in values.values()):
            raise ValueError("Daily availability must be between 0 and 1440 minutes.")
        return {str(day).strip().lower(): int(minutes) for day, minutes in values.items()}


class SourceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    source_type: str = Field(default="notes", min_length=1, max_length=80)
    extracted_text: str = Field(default="", max_length=45_000)
    reference: str | None = Field(default=None, max_length=2_000)
    topics: list[str] = Field(default_factory=list, max_length=50)
    provenance: str = Field(default="Student-uploaded material", max_length=500)


class QuizGenerateRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=120)
    topic: str = Field(min_length=1, max_length=160)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    question_count: int = Field(default=5, ge=3, le=20)
    duration_minutes: int = Field(default=10, ge=3, le=120)
    source_ids: list[str] = Field(default_factory=list, max_length=20)


class AnswerSubmission(BaseModel):
    question_id: str = Field(min_length=1, max_length=200)
    selected_index: int | None = Field(default=None, ge=0, le=3)


class QuizAttemptCreate(BaseModel):
    quiz_id: str = Field(min_length=1, max_length=200)
    answers: list[AnswerSubmission] = Field(default_factory=list, max_length=100)
    started_at: str | None = None
    duration_seconds: int = Field(default=0, ge=0, le=86_400)


class DiagnosisCreate(BaseModel):
    attempt_ids: list[str] = Field(default_factory=list, max_length=100)


class PlanCreate(BaseModel):
    generation_reason: str = Field(default="Personalized plan requested", min_length=1, max_length=500)


class PlanTaskPatch(BaseModel):
    completed: bool


class ResourceCreate(BaseModel):
    topic: str = Field(min_length=1, max_length=160)
    title: str = Field(min_length=1, max_length=240)
    url_or_reference: str = Field(min_length=1, max_length=2_000)
    resource_type: str = Field(default="link", max_length=80)
    relevance: float = Field(default=0.8, ge=0, le=1)
    reliability: str = Field(default="Student-provided", max_length=240)
    provenance: str = Field(default="Student-provided", max_length=500)
    difficulty: str | None = Field(default=None, max_length=80)
    estimated_minutes: int | None = Field(default=None, ge=1, le=1_440)
    citation: dict = Field(default_factory=dict)
    reason: str = Field(default="Matched to this topic", max_length=500)

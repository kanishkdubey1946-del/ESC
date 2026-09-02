import base64
import hashlib
import hmac
import json as json_module
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
import httpx

ROOT = Path(__file__).resolve().parents[1]
# Load backend .env before importing AI modules so provider keys are available.
load_dotenv(ROOT / ".env")

from app.research_engine import run_research_pipeline, stream_research_events  # noqa: E402
from app.openai_client import generate_json, is_any_provider_configured, provider_status  # noqa: E402
from app.source_extract import extract_text_from_bytes  # noqa: E402
from app.db import initialise_database as initialise_esc_database  # noqa: E402
from app.routes.student import router as student_router  # noqa: E402
from app.auth import current_user as esc_current_user, login_user, logout_token, register_user  # noqa: E402

DATABASE_PATH = Path(os.getenv("COMET_DATABASE_PATH", ROOT / "comet.db"))
SESSION_DURATION = timedelta(hours=8)


@contextmanager
def database():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialise_database() -> None:
    with database() as connection:
        connection.executescript("""
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
                user_id TEXT NOT NULL REFERENCES users(id),
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)


def now() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600_000)


def hash_token(token: str) -> bytes:
    return hashlib.sha256(token.encode("utf-8")).digest()


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


def create_session(user: sqlite3.Row) -> AuthResponse:
    token = secrets.token_urlsafe(48)
    expires_at = now() + SESSION_DURATION
    with database() as connection:
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
            (hash_token(token), user["id"], expires_at.isoformat(), now().isoformat()),
        )
    return AuthResponse(token=token, user=UserResponse(id=user["id"], name=user["name"], email=user["email"]))


def current_user(authorization: str | None = Header(default=None)) -> UserResponse:
    user = esc_current_user(authorization)
    return UserResponse(id=user.id, name=user.name, email=user.email)


app = FastAPI(title="ESC — Enhanced Study Companion API", version="2.0.0")
cors_origins = [origin.strip() for origin in os.getenv(
    "CORS_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(student_router)


@app.on_event("startup")
def startup() -> None:
    initialise_esc_database()


@app.get("/health")
def health() -> dict[str, Any]:
    status = provider_status()
    return {
        "status": "ok",
        "aiConfigured": is_any_provider_configured(),
        "aiProvider": status.get("activeProvider"),
        "models": {
            "default": status.get("defaultModel"),
            "fast": status.get("fastModel"),
            "reasoning": status.get("reasoningModel"),
        },
    }


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "ESC — Enhanced Study Companion API",
        "status": "running",
        "frontend": "http://localhost:5173",
        "documentation": "/docs",
        "aiConfigured": is_any_provider_configured(),
    }


@app.post("/api/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> AuthResponse:
    result = register_user(payload)
    return AuthResponse(token=result.token, user=UserResponse(**result.user.model_dump()))


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    result = login_user(payload)
    return AuthResponse(token=result.token, user=UserResponse(**result.user.model_dump()))


@app.get("/api/auth/me", response_model=UserResponse)
def me(user: UserResponse = Depends(current_user)) -> UserResponse:
    return user


@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(authorization: str | None = Header(default=None)) -> None:
    logout_token(authorization)


# ─── AI Proxy + Research Endpoints ───────────────────────────────────────────

class UploadSource(BaseModel):
    id: str | None = None
    name: str
    type: str = "text/plain"
    text: str = ""
    url: str | None = None
    addedAt: str | None = None


class ResearchRunRequest(BaseModel):
    prompt: str
    agentId: str = "research"
    uploads: list[UploadSource] = Field(default_factory=list)
    forceResearch: bool | None = None


class AgentRunRequest(BaseModel):
    agentId: str
    prompt: str
    context: str = ""
    systemPrompt: str = ""
    temperature: float = 0.4
    enableResearch: bool = True
    forceResearch: bool | None = None
    uploads: list[UploadSource] = Field(default_factory=list)
    evidencePack: str = ""
    sources: list[dict[str, Any]] = Field(default_factory=list)
    skipResearch: bool = False


class AgentRunResponse(BaseModel):
    success: bool
    data: dict | None = None
    error: str | None = None
    sources: list[dict[str, Any]] = Field(default_factory=list)
    researchEvents: list[dict[str, Any]] = Field(default_factory=list)
    researchClassification: str | None = None
    researchFailed: bool = False
    researchError: str | None = None
    generatedWithoutLiveResearch: bool = False
    evidencePack: str | None = None
    retrievedAt: str | None = None
    provider: str | None = None
    model: str | None = None


EVIDENCE_SYSTEM_ADDENDUM = (
    " ACCURACY RULES: NO SOURCE → NO VERIFIED FACT. "
    "Never invent statistics, competitors, citations, URLs, market sizes, exam trends, "
    "customer reviews, government figures, or research papers. "
    "Use only the EVIDENCE PACK and user-uploaded material for factual claims. "
    "Cite facts with inline markers like [1] or [2] matching source citation numbers. "
    "Label estimates as Estimate and list assumptions. "
    "If evidence is missing, write: Reliable supporting information could not be found for this claim. "
    "If sources conflict, report both values with citations. "
    "Separate Evidence from Recommendations. "
    "Include fields when relevant: dataLimitations (string), sourcesUsed (array of citation numbers), "
    "evidenceStatus (Verified|Strong Evidence|Moderate Evidence|Limited Evidence|Conflicting Evidence|Estimate|Needs Verification), "
    "claims (array of {claim, sourceIds, confidence, evidenceType})."
)


@app.post("/api/v1/research/run")
async def research_run(payload: ResearchRunRequest, user: UserResponse = Depends(current_user)) -> dict[str, Any]:
    result = await run_research_pipeline(
        prompt=payload.prompt,
        agent_id=payload.agentId,
        uploads=[u.model_dump() for u in payload.uploads],
        force_research=payload.forceResearch,
    )
    return result


@app.post("/api/v1/research/stream")
async def research_stream(payload: ResearchRunRequest, user: UserResponse = Depends(current_user)):
    async def generate():
        async for line in stream_research_events(
            prompt=payload.prompt,
            agent_id=payload.agentId,
            uploads=[u.model_dump() for u in payload.uploads],
            force_research=payload.forceResearch,
        ):
            yield line

    return StreamingResponse(generate(), media_type="application/x-ndjson")


@app.post("/api/v1/agents/run", response_model=AgentRunResponse)
async def run_agent(payload: AgentRunRequest, user: UserResponse = Depends(current_user)) -> AgentRunResponse:
    sources: list[dict[str, Any]] = list(payload.sources or [])
    research_events: list[dict[str, Any]] = []
    evidence_pack = payload.evidencePack or ""
    research_classification: str | None = None
    research_failed = False
    research_error: str | None = None
    generated_without_live = False
    retrieved_at: str | None = None

    if payload.enableResearch and not payload.skipResearch and not evidence_pack:
        research = await run_research_pipeline(
            prompt=payload.prompt,
            agent_id=payload.agentId,
            uploads=[u.model_dump() for u in payload.uploads],
            force_research=payload.forceResearch,
        )
        sources = research.get("sources") or []
        research_events = research.get("events") or []
        evidence_pack = research.get("evidencePack") or ""
        research_classification = (research.get("classification") or {}).get("classification")
        research_failed = bool(research.get("researchFailed"))
        research_error = research.get("researchError")
        generated_without_live = bool(research.get("generatedWithoutLiveResearch"))
        retrieved_at = research.get("retrievedAt")

        # Soft-fail: if live research fails with no sources, continue generation
        # clearly labeled as without live external verification (never sample data).
        classification = research.get("classification") or {}
        if (
            classification.get("liveResearchRequired")
            and research_failed
            and not sources
            and not payload.uploads
        ):
            generated_without_live = True
            if not evidence_pack:
                evidence_pack = (
                    "EVIDENCE PACK\n"
                    "Live external research could not be completed.\n"
                    f"Error: {research_error or 'No reliable sources retrieved.'}\n"
                    "You MUST NOT invent statistics, competitors, URLs, or citations.\n"
                    "Label the output: Generated without live external verification.\n"
                    "For factual claims write: Reliable supporting information could not be found for this claim.\n"
                )
    elif evidence_pack:
        research_classification = "provided_evidence"
        retrieved_at = datetime.now(timezone.utc).isoformat()

    source_only_instruction = ""
    if payload.uploads and payload.forceResearch is not True:
        source_only_instruction = (
            " SOURCE-ONLY MODE: Answer using only the user's uploaded sources in the EVIDENCE PACK. "
            "Do not use general knowledge, web knowledge, assumptions, or outside examples. "
            "Every answerable factual statement must cite an uploaded source. "
            "If the answer is not contained in the uploaded material, say exactly: "
            "\"This information is not present in the uploaded source(s).\""
        )
    system_message = (payload.systemPrompt or f"You are COMET's {payload.agentId} agent.") + EVIDENCE_SYSTEM_ADDENDUM + source_only_instruction
    full_prompt = f"ORIGINAL USER CHALLENGE:\n{payload.prompt}"
    if payload.context:
        full_prompt += f"\n\nSHARED WORKSPACE MEMORY / UPSTREAM OUTPUTS:\n{payload.context}"
    if evidence_pack:
        full_prompt += f"\n\n{evidence_pack}"
    if generated_without_live:
        full_prompt += (
            "\n\nNOTE: Live external research failed or was incomplete. "
            "Mark the output as Generated without live external verification. "
            "Do not invent external facts."
        )
    full_prompt += (
        f"\n\nProduce your {payload.agentId} output now. "
        "Respond with valid JSON only. Do not use markdown fences. "
        "Include inline citation markers [n] inside factual text fields."
    )

    llm = await generate_json(
        system_message=system_message,
        user_message=full_prompt,
        agent_id=payload.agentId,
        temperature=payload.temperature,
    )
    if not llm.get("success"):
        return AgentRunResponse(
            success=False,
            error=llm.get("error") or "AI generation failed.",
            sources=sources,
            researchEvents=research_events,
            researchClassification=research_classification,
            researchFailed=research_failed,
            researchError=research_error,
            generatedWithoutLiveResearch=generated_without_live,
            evidencePack=evidence_pack,
            retrievedAt=retrieved_at,
            provider=llm.get("provider"),
            model=llm.get("model"),
        )

    data = llm["data"]
    if generated_without_live and isinstance(data, dict):
        data.setdefault("evidenceStatus", "Needs Verification")
        note = "Generated without live external verification."
        if data.get("dataLimitations"):
            data["dataLimitations"] = f"{data['dataLimitations']}\n{note}"
        else:
            data["dataLimitations"] = note

    # Attach sourcesUsed if model omitted them
    if isinstance(data, dict) and sources and not data.get("sourcesUsed"):
        data["sourcesUsed"] = [s.get("citationNumber") for s in sources if s.get("citationNumber")]

    return AgentRunResponse(
        success=True,
        data=data,
        sources=sources,
        researchEvents=research_events,
        researchClassification=research_classification,
        researchFailed=research_failed,
        researchError=research_error,
        generatedWithoutLiveResearch=generated_without_live,
        evidencePack=evidence_pack,
        retrievedAt=retrieved_at,
        provider=llm.get("provider"),
        model=llm.get("model"),
    )


# ─── Source extraction (PDF/DOCX/etc.) ───────────────────────────────────────

@app.post("/api/v1/sources/extract")
async def extract_source(
    file: UploadFile = File(...),
    user: UserResponse = Depends(current_user),
) -> dict[str, Any]:
    raw = await file.read()
    result = extract_text_from_bytes(
        filename=file.filename or "upload",
        content_type=file.content_type or "",
        data=raw,
    )
    if result.get("success"):
        result["name"] = file.filename or "upload"
        result["type"] = file.content_type or result.get("format") or "text/plain"
    return result


# ─── Website Source Endpoint ──────────────────────────────────────────────────

class WebsiteSourceRequest(BaseModel):
    url: str

class WebsiteSourceResponse(BaseModel):
    success: bool
    title: str = ""
    domain: str = ""
    text: str = ""
    url: str = ""
    error: str | None = None

@app.post("/api/v1/sources/website", response_model=WebsiteSourceResponse)
async def fetch_website_source(payload: WebsiteSourceRequest, user: UserResponse = Depends(current_user)):
    url = payload.url.strip()

    # Basic validation
    if not url:
        return WebsiteSourceResponse(success=False, error="URL is required.")

    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        parsed = urlparse(url)
        if not parsed.hostname:
            return WebsiteSourceResponse(success=False, error="Invalid URL format.")

        # Block private/internal IPs (SSRF protection)
        hostname = parsed.hostname.lower()
        blocked = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.", "10.", "192.168.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31."]
        if any(hostname.startswith(b) or hostname == b for b in blocked):
            return WebsiteSourceResponse(success=False, error="Access to internal/private URLs is not permitted.")

    except Exception:
        return WebsiteSourceResponse(success=False, error="Invalid URL format.")

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, max_redirects=5) as client:
            response = await client.get(url, headers={
                "User-Agent": "COMET-Bot/1.0 (Research Assistant)",
                "Accept": "text/html,application/xhtml+xml,text/plain",
            })

        if response.status_code != 200:
            return WebsiteSourceResponse(success=False, error=f"Website returned status {response.status_code}.")

        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type and "text/plain" not in content_type:
            return WebsiteSourceResponse(success=False, error=f"Unsupported content type: {content_type[:100]}")

        from bs4 import BeautifulSoup
        html = response.text[:500_000]  # Limit to 500KB
        soup = BeautifulSoup(html, "html.parser")

        # Remove script/style elements
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        title = soup.title.string.strip() if soup.title and soup.title.string else parsed.hostname
        text = soup.get_text(separator="\n", strip=True)

        # Clean up excessive whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        text = "\n".join(lines)[:45_000]  # Match workspace document limit

        return WebsiteSourceResponse(
            success=True,
            title=title,
            domain=parsed.hostname or "",
            text=text,
            url=url,
        )

    except httpx.TimeoutException:
        return WebsiteSourceResponse(success=False, error="Website request timed out.")
    except Exception as e:
        return WebsiteSourceResponse(success=False, error=f"Failed to fetch website: {str(e)[:300]}")

"""Persistent Google ADK runtime used by FastAPI agent endpoints."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.agents.registry import get_agent_spec, normalize_agent_id
from app.agents.request_context import AgentRequestContext, use_request_context


APP_ROOT = Path(__file__).resolve().parents[2]


class AdkUnavailableError(RuntimeError):
    pass


class UnknownAgentError(ValueError):
    pass


@dataclass(slots=True)
class AdkRunResult:
    data: dict[str, Any]
    text: str
    agent_id: str
    agent_name: str
    delegated_agents: list[str] = field(default_factory=list)
    model: str = ""
    provider: str = "google-adk"


_SESSION_SERVICE: Any | None = None
_RUNNERS: dict[tuple[str, str], Any] = {}


def _configured_value(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value or value.lower().startswith("your_"):
        return ""
    return value


def _model_and_label() -> tuple[Any, str]:
    explicit = _configured_value("ADK_MODEL")
    gemini_key = _configured_value("GEMINI_API_KEY") or _configured_value("GOOGLE_API_KEY")
    if explicit:
        if explicit.startswith(("openai/", "groq/", "openrouter/", "anthropic/")):
            try:
                from google.adk.models.lite_llm import LiteLlm
                return LiteLlm(model=explicit), explicit
            except ImportError as exc:
                raise AdkUnavailableError(
                    "This ADK_MODEL uses LiteLLM. Install litellm or configure a Gemini ADK_MODEL instead."
                ) from exc
        if gemini_key:
            os.environ.setdefault("GOOGLE_API_KEY", gemini_key)
        return explicit, explicit

    if gemini_key:
        os.environ.setdefault("GOOGLE_API_KEY", gemini_key)
        model = _configured_value("GEMINI_MODEL") or "gemini-2.5-flash"
        return model, model

    raise AdkUnavailableError(
        "No native ADK model is configured. Set GEMINI_API_KEY (recommended) or GOOGLE_API_KEY."
    )


def _session_service() -> Any:
    global _SESSION_SERVICE
    if _SESSION_SERVICE is not None:
        return _SESSION_SERVICE
    try:
        from google.adk.sessions import DatabaseSessionService
    except ImportError as exc:
        raise AdkUnavailableError(
            "Google ADK database support is missing. Install google-adk, sqlalchemy, and aiosqlite."
        ) from exc
    default_path = (APP_ROOT / "adk_sessions.db").as_posix()
    db_url = os.getenv("ADK_SESSION_DB_URL", f"sqlite+aiosqlite:///{default_path}")
    _SESSION_SERVICE = DatabaseSessionService(db_url=db_url)
    return _SESSION_SERVICE


def _runner(agent_id: str, model: Any, model_label: str) -> tuple[Any, str]:
    normalized = normalize_agent_id(agent_id)
    key = (normalized, model_label)
    cached = _RUNNERS.get(key)
    app_name = f"esc_{normalized}"
    if cached is not None:
        return cached, app_name

    try:
        from google.adk.runners import Runner
    except ImportError as exc:
        raise AdkUnavailableError("Google ADK Runner is unavailable.") from exc

    if normalized == "team":
        from app.agents.root import build_root_agent

        agent = build_root_agent(model)
        app_name = "esc_learning_team"
    else:
        spec = get_agent_spec(normalized)
        if spec is None:
            raise UnknownAgentError(f"Unknown ESC agent: {agent_id}")
        agent = spec.builder(model)

    runner = Runner(agent=agent, app_name=app_name, session_service=_session_service())
    _RUNNERS[key] = runner
    return runner, app_name


def _safe_identifier(value: str, fallback: str) -> str:
    clean = re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-.")
    return (clean or fallback)[:160]


async def _ensure_session(service: Any, *, app_name: str, user_id: str, session_id: str) -> None:
    existing = await service.get_session(app_name=app_name, user_id=user_id, session_id=session_id)
    if existing is not None:
        return
    try:
        await service.create_session(app_name=app_name, user_id=user_id, session_id=session_id)
    except Exception:
        # A concurrent first request may have created the same session.
        existing = await service.get_session(app_name=app_name, user_id=user_id, session_id=session_id)
        if existing is None:
            raise


def _extract_text(event: Any) -> str:
    content = getattr(event, "content", None)
    parts = getattr(content, "parts", None) or []
    return "".join(str(getattr(part, "text", "") or "") for part in parts)


def parse_agent_json(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
        stripped = re.sub(r"\s*```$", "", stripped)
    try:
        value = json.loads(stripped)
    except json.JSONDecodeError:
        start, end = stripped.find("{"), stripped.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("The ADK agent did not return a JSON object.")
        value = json.loads(stripped[start : end + 1])
    if not isinstance(value, dict):
        raise ValueError("The ADK agent response must be a JSON object.")
    nested = value.get("data")
    if isinstance(nested, dict) and set(value).issubset({"agentId", "agentName", "data"}):
        return nested
    return value


async def run_adk_agent(
    *,
    agent_id: str,
    user_id: str,
    session_id: str,
    prompt: str,
    uploads: list[dict[str, Any]],
    evidence_pack: str,
    shared_context: str,
    source_only: bool,
) -> AdkRunResult:
    try:
        from google.genai import types
    except ImportError as exc:
        raise AdkUnavailableError("Google GenAI types are unavailable. Install google-adk.") from exc

    model, model_label = _model_and_label()
    normalized = normalize_agent_id(agent_id)
    runner, app_name = _runner(normalized, model, model_label)
    safe_user = _safe_identifier(user_id, "anonymous")
    safe_session = _safe_identifier(session_id, f"{normalized}-session")
    service = _session_service()
    await _ensure_session(service, app_name=app_name, user_id=safe_user, session_id=safe_session)

    availability = (
        f"\n\nESC CONTEXT AVAILABLE THROUGH TOOLS: selected files={len(uploads)}; "
        f"verified evidence={'yes' if evidence_pack else 'no'}; "
        f"source-only mode={'yes' if source_only else 'no'}."
    )
    if shared_context:
        availability += f"\n\nUPSTREAM AGENT OUTPUTS:\n{shared_context[:28_000]}"
    message = types.Content(role="user", parts=[types.Part(text=prompt + availability)])
    request_context = AgentRequestContext(
        user_id=user_id,
        uploads=tuple(uploads),
        evidence_pack=evidence_pack,
        shared_context=shared_context,
        source_only=source_only,
    )

    final_text = ""
    final_author = normalized
    delegated: list[str] = []
    with use_request_context(request_context):
        async for event in runner.run_async(
            user_id=safe_user,
            session_id=safe_session,
            new_message=message,
        ):
            author = str(getattr(event, "author", "") or "")
            if author and author not in delegated and author != "esc_learning_orchestrator":
                delegated.append(author)
            if event.is_final_response():
                candidate = _extract_text(event)
                if candidate:
                    final_text = candidate
                    final_author = author or final_author

    if not final_text:
        raise RuntimeError("The ADK agent completed without a final response.")
    data = parse_agent_json(final_text)
    spec = get_agent_spec(final_author) or get_agent_spec(normalized)
    return AdkRunResult(
        data=data,
        text=final_text,
        agent_id=final_author,
        agent_name=spec.name if spec else "ESC Learning Team",
        delegated_agents=delegated,
        model=model_label,
    )

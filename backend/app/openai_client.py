"""
Centralized, backend-only LLM client for Project COMET.

Security:
- Reads provider API keys only from server environment / backend .env
- Never logs or returns the secret
- Frontend must never call an AI provider with a secret key
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any, Literal
from urllib.parse import quote

import httpx
from dotenv import load_dotenv
from pathlib import Path

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    BadRequestError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
)

# Ensure backend/.env is loaded even if this module is imported first.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

logger = logging.getLogger("comet.openai")

# ─── Environment / model configuration (read at call time) ──────────────────

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# Gemini often returns a 429 with a short cooldown.  Two sub-three-second
# retries made a temporary limit look like a permanent failed specialist.
MAX_RETRIES = 4
BASE_BACKOFF_SECONDS = 2.0
DEFAULT_TIMEOUT_SECONDS = 90.0
MAX_OUTPUT_TOKENS = 8192

Complexity = Literal["fast", "default", "reasoning"]

REASONING_AGENTS = {
    "research", "strategy", "market", "finance", "pitch", "development",
    "examinsight", "specialisthub", "studyvault",
}
FAST_AGENTS = {
    "content", "marketing", "guideminds", "successarchitect",
}

_client: AsyncOpenAI | None = None
_client_key: str | None = None


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def openai_api_key() -> str:
    return _env("OPENAI_API_KEY")


def openrouter_api_key() -> str:
    return _env("OPENROUTER_API_KEY")


def groq_api_key() -> str:
    return _env("GROQ_API_KEY")


def groq_model() -> str:
    return _env("GROQ_MODEL", "openai/gpt-oss-120b")


def gemini_api_key() -> str:
    return _env("GEMINI_API_KEY")


def gemini_model() -> str:
    return _env("GEMINI_MODEL", "gemini-3.5-flash")


def default_model() -> str:
    return _env("OPENAI_DEFAULT_MODEL", "gpt-4o-mini")


def fast_model() -> str:
    return _env("OPENAI_FAST_MODEL") or default_model()


def reasoning_model() -> str:
    return _env("OPENAI_REASONING_MODEL", "gpt-4o")


def fallback_model() -> str:
    return _env("OPENAI_FALLBACK_MODEL") or default_model()


def openrouter_model() -> str:
    return _env("OPENROUTER_MODEL", "openai/gpt-4o-mini")


def is_openai_configured() -> bool:
    return bool(openai_api_key())


def is_gemini_configured() -> bool:
    return bool(gemini_api_key())


def is_any_provider_configured() -> bool:
    return is_gemini_configured() or is_openai_configured() or bool(openrouter_api_key()) or bool(groq_api_key())


def active_provider() -> str | None:
    configured = {
        "gemini": is_gemini_configured(),
        "openai": is_openai_configured(),
        "openrouter": bool(openrouter_api_key()),
        "groq": bool(groq_api_key()),
    }
    preferred = _env("AI_PROVIDER").lower()
    if preferred in configured and configured[preferred]:
        return preferred
    # Default to Gemini when no explicit provider has been selected.
    if is_gemini_configured():
        return "gemini"
    if is_openai_configured():
        return "openai"
    if openrouter_api_key():
        return "openrouter"
    if groq_api_key():
        return "groq"
    return None


def provider_status() -> dict[str, Any]:
    """Safe status for health checks — never includes secrets."""
    provider = active_provider()
    active_model = (
        gemini_model() if provider == "gemini"
        else groq_model() if provider == "groq"
        else default_model() if provider == "openai"
        else openrouter_model() if provider == "openrouter"
        else None
    )
    return {
        "openaiConfigured": is_openai_configured(),
        "openrouterConfigured": bool(openrouter_api_key()),
        "groqConfigured": bool(groq_api_key()),
        "geminiConfigured": is_gemini_configured(),
        "defaultModel": active_model,
        "fastModel": fast_model() if provider == "openai" else active_model,
        "reasoningModel": reasoning_model() if provider == "openai" else active_model,
        "activeProvider": provider,
    }


def get_openai_client() -> AsyncOpenAI:
    global _client, _client_key
    key = openai_api_key()
    if not key:
        raise RuntimeError("OPENAI_API_KEY is not configured in the backend environment.")
    if _client is None or _client_key != key:
        _client = AsyncOpenAI(api_key=key, timeout=DEFAULT_TIMEOUT_SECONDS, max_retries=0)
        _client_key = key
    return _client


def complexity_for_agent(agent_id: str, temperature: float = 0.4) -> Complexity:
    aid = (agent_id or "").lower()
    if aid in REASONING_AGENTS or temperature <= 0.3:
        return "reasoning"
    if aid in FAST_AGENTS or temperature >= 0.5:
        return "fast"
    return "default"


def select_model(agent_id: str = "", temperature: float = 0.4, explicit: str | None = None) -> str:
    if explicit:
        return explicit.strip()
    level = complexity_for_agent(agent_id, temperature)
    if level == "reasoning":
        return reasoning_model()
    if level == "fast":
        return fast_model()
    return default_model()


def parse_llm_json(text: str) -> dict[str, Any]:
    cleaned = (text or "").strip()
    if not cleaned:
        raise ValueError("Empty model response")
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace < 0 or last_brace < 0 or last_brace <= first_brace:
        raise ValueError("Model response did not contain a JSON object")
    return json.loads(cleaned[first_brace : last_brace + 1])


def _sanitize_error_text(text: str, limit: int = 280) -> str:
    """Remove anything that looks like a key or bearer token before surfacing errors."""
    cleaned = re.sub(r"sk-[A-Za-z0-9_-]{10,}", "[redacted]", text or "")
    cleaned = re.sub(r"(?:AIza|AQ\.)[A-Za-z0-9_-]{10,}", "[redacted]", cleaned)
    cleaned = re.sub(r"Bearer\s+\S+", "Bearer [redacted]", cleaned, flags=re.I)
    cleaned = re.sub(r"OPENAI_API_KEY\s*=\s*\S+", "OPENAI_API_KEY=[redacted]", cleaned, flags=re.I)
    cleaned = re.sub(r"GEMINI_API_KEY\s*=\s*\S+", "GEMINI_API_KEY=[redacted]", cleaned, flags=re.I)
    return cleaned[:limit]


def map_provider_error(exc: Exception) -> str:
    if isinstance(exc, AuthenticationError):
        return "AI service authentication failed. Verify the backend API configuration."
    if isinstance(exc, PermissionDeniedError):
        return "The selected model is unavailable for the configured project, or the key lacks permission."
    if isinstance(exc, RateLimitError):
        return "The AI service is temporarily busy (rate limit). Please retry in a moment."
    if isinstance(exc, APITimeoutError):
        return "Generation timed out before completion. Please retry."
    if isinstance(exc, APIConnectionError):
        return "Could not reach the AI service. Check network connectivity and try again."
    if isinstance(exc, httpx.TimeoutException):
        return "Generation timed out before completion. Please retry."
    if isinstance(exc, httpx.RequestError):
        return "Could not reach the AI service. Check network connectivity and try again."
    if isinstance(exc, BadRequestError):
        msg = _sanitize_error_text(str(exc))
        if "model" in msg.lower():
            return "The selected model is unavailable for the configured project."
        return f"Invalid AI request: {msg}"
    if isinstance(exc, APIStatusError):
        code = getattr(exc, "status_code", None)
        if code == 401:
            return "AI service authentication failed. Verify the backend API configuration."
        if code == 403:
            return "The selected model is unavailable for the configured project."
        if code == 429:
            return "The AI service is temporarily busy. Please retry."
        if code in {500, 502, 503, 504}:
            return "The AI service is temporarily unavailable. Please retry."
        return f"AI provider returned an error ({code})."
    return f"AI request failed: {_sanitize_error_text(str(exc))}"


def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, (RateLimitError, APITimeoutError, APIConnectionError, httpx.TimeoutException, httpx.RequestError)):
        return True
    if isinstance(exc, APIStatusError) and getattr(exc, "status_code", None) in {429, 500, 502, 503, 504}:
        return True
    return False


async def _complete_openai(
    *,
    system_message: str,
    user_message: str,
    model: str,
    temperature: float,
    max_tokens: int,
    json_mode: bool,
) -> str:
    client = get_openai_client()
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    last_error: Exception | None = None
    models_to_try = [model]
    fb = fallback_model()
    if fb and fb != model:
        models_to_try.append(fb)

    for model_name in models_to_try:
        kwargs["model"] = model_name
        for attempt in range(MAX_RETRIES + 1):
            try:
                response = await client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content if response.choices else None
                if not content:
                    raise ValueError("AI provider returned empty response.")
                logger.info(
                    "openai_completion ok model=%s tokens_prompt=%s tokens_completion=%s",
                    model_name,
                    getattr(getattr(response, "usage", None), "prompt_tokens", None),
                    getattr(getattr(response, "usage", None), "completion_tokens", None),
                )
                return content
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.warning(
                    "openai_completion failed model=%s attempt=%s error_type=%s",
                    model_name,
                    attempt + 1,
                    type(exc).__name__,
                )
                # Model unavailable → try fallback model
                if isinstance(exc, (BadRequestError, NotFoundError)):
                    msg = str(exc).lower()
                    if "model" in msg and ("not found" in msg or "does not exist" in msg or "invalid" in msg):
                        break  # next model
                if attempt < MAX_RETRIES and _is_retryable(exc):
                    await asyncio.sleep(BASE_BACKOFF_SECONDS * (2 ** attempt))
                    continue
                if not _is_retryable(exc) and not (
                    isinstance(exc, (BadRequestError, NotFoundError, APIStatusError))
                    and "model" in str(exc).lower()
                ):
                    raise
                break  # try next model
    assert last_error is not None
    raise last_error


async def _complete_gemini(
    *,
    system_message: str,
    user_message: str,
    model: str,
    temperature: float,
    max_tokens: int,
    json_mode: bool,
) -> str:
    """Run a single Gemini GenerateContent request without exposing the API key."""
    key = gemini_api_key()
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not configured in the backend environment.")

    model_name = (model or gemini_model()).removeprefix("models/")
    payload: dict[str, Any] = {
        "systemInstruction": {"parts": [{"text": system_message}]},
        "contents": [{"role": "user", "parts": [{"text": user_message}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }
    if json_mode:
        payload["generationConfig"]["responseMimeType"] = "application/json"

    url = GEMINI_URL.format(model=quote(model_name, safe="-_."))
    last_error: Exception | None = None
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS) as client:
        for attempt in range(MAX_RETRIES + 1):
            try:
                response = await client.post(
                    url,
                    headers={"Content-Type": "application/json", "x-goog-api-key": key},
                    json=payload,
                )
                if response.status_code in {401, 403}:
                    raise RuntimeError("Gemini authentication failed. Verify the backend API configuration.")
                if response.status_code == 429:
                    # Keep the provider's suggested cooldown when available.
                    # It is stored on the exception only, never exposed to the UI.
                    retry_after = response.headers.get("retry-after", "").strip()
                    try:
                        retry_seconds = max(1.0, min(float(retry_after), 30.0))
                    except ValueError:
                        retry_seconds = 0.0
                    error = RuntimeError("Gemini is temporarily busy (rate limit). Please retry in a moment.")
                    setattr(error, "retry_after_seconds", retry_seconds)
                    raise error
                if response.status_code >= 500:
                    raise RuntimeError(f"Gemini is temporarily unavailable ({response.status_code}).")
                if response.status_code != 200:
                    raise RuntimeError(f"Gemini returned an error ({response.status_code}).")

                data = response.json()
                parts = (data.get("candidates") or [{}])[0].get("content", {}).get("parts") or []
                content = "".join(str(part.get("text", "")) for part in parts if isinstance(part, dict)).strip()
                if not content:
                    raise ValueError("Gemini returned an empty response.")
                logger.info("gemini_completion ok model=%s", model_name)
                return content
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                retryable_status = isinstance(exc, RuntimeError) and any(
                    label in str(exc) for label in ("rate limit", "temporarily unavailable")
                )
                logger.warning(
                    "gemini_completion failed model=%s attempt=%s error_type=%s",
                    model_name,
                    attempt + 1,
                    type(exc).__name__,
                )
                if attempt < MAX_RETRIES and (_is_retryable(exc) or retryable_status):
                    cooldown = getattr(exc, "retry_after_seconds", 0.0)
                    await asyncio.sleep(cooldown or BASE_BACKOFF_SECONDS * (2 ** attempt))
                    continue
                raise
    assert last_error is not None
    raise last_error


async def _complete_openrouter(
    *,
    system_message: str,
    user_message: str,
    temperature: float,
    max_tokens: int,
    json_mode: bool,
) -> str:
    """Optional backend-only OpenRouter path if OpenAI is not configured."""
    key = openrouter_api_key()
    if not key:
        raise RuntimeError("No AI provider configured.")

    payload: dict[str, Any] = {
        "model": openrouter_model(),
        "messages": [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS) as client:
        response = await client.post(
            OPENROUTER_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {key}",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "COMET",
            },
            json=payload,
        )
    if response.status_code == 401:
        raise RuntimeError("AI service authentication failed. Verify the backend API configuration.")
    if response.status_code == 429:
        raise RuntimeError("The AI service is temporarily busy. Please retry.")
    if response.status_code != 200:
        raise RuntimeError(f"AI provider returned an error ({response.status_code}).")
    data = response.json()
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not text:
        raise ValueError("AI provider returned empty response.")
    return text


async def _complete_groq(
    *,
    system_message: str,
    user_message: str,
    temperature: float,
    max_tokens: int,
    json_mode: bool,
) -> str:
    """Groq's OpenAI-compatible endpoint, used when Gemini is unavailable."""
    key = groq_api_key()
    if not key:
        raise RuntimeError("GROQ_API_KEY is not configured in the backend environment.")
    payload: dict[str, Any] = {
        "model": groq_model(),
        "messages": [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ],
        "temperature": temperature,
        "max_completion_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS) as client:
        response = await client.post(
            GROQ_URL,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
            json=payload,
        )
        # GPT-OSS occasionally rejects Groq's strict JSON validator before it
        # generates a response. The application still parses and validates JSON
        # below, so retry once without provider-side schema enforcement.
        if response.status_code == 400 and json_mode and "json_validate_failed" in response.text:
            payload.pop("response_format", None)
            response = await client.post(
                GROQ_URL,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
                json=payload,
            )
    if response.status_code == 401:
        raise RuntimeError("Groq authentication failed. Verify the backend API configuration.")
    if response.status_code == 429:
        raise RuntimeError("Groq is temporarily busy (rate limit). Please retry in a moment.")
    if response.status_code >= 500:
        raise RuntimeError(f"Groq is temporarily unavailable ({response.status_code}).")
    if response.status_code != 200:
        detail = _sanitize_error_text(response.text, limit=220)
        raise RuntimeError(f"Groq returned an error ({response.status_code}): {detail}")
    data = response.json()
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not text:
        raise ValueError("Groq returned an empty response.")
    logger.info("groq_completion ok model=%s", groq_model())
    return text


async def generate_json(
    *,
    system_message: str,
    user_message: str,
    agent_id: str = "",
    temperature: float = 0.4,
    max_tokens: int = MAX_OUTPUT_TOKENS,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Generate structured JSON via OpenAI (preferred) or optional OpenRouter.
    Returns {success, data?, error?, model?, provider?} — never includes secrets.
    """
    if not is_any_provider_configured():
        return {
            "success": False,
            "error": "AI service is not configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY in the backend environment.",
            "provider": None,
            "model": None,
        }

    provider = active_provider()
    selected_model = (model.strip() if model else gemini_model()) if provider == "gemini" else select_model(agent_id, temperature, model)

    try:
        if provider == "gemini":
            try:
                raw = await _complete_gemini(
                    system_message=system_message, user_message=user_message, model=selected_model,
                    temperature=temperature, max_tokens=max_tokens, json_mode=True,
                )
            except Exception:
                if not groq_api_key():
                    raise
                raw = await _complete_groq(
                    system_message=system_message, user_message=user_message, temperature=temperature,
                    max_tokens=max_tokens, json_mode=True,
                )
                provider = "groq"
                selected_model = groq_model()
        elif provider == "openai":
            raw = await _complete_openai(
                system_message=system_message,
                user_message=user_message,
                model=selected_model,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=True,
            )
        elif provider == "groq":
            try:
                raw = await _complete_groq(
                    system_message=system_message, user_message=user_message, temperature=temperature,
                    max_tokens=max_tokens, json_mode=True,
                )
                selected_model = groq_model()
            except Exception:
                if not is_gemini_configured():
                    raise
                raw = await _complete_gemini(
                    system_message=system_message, user_message=user_message, model=gemini_model(),
                    temperature=temperature, max_tokens=max_tokens, json_mode=True,
                )
                provider = "gemini"
                selected_model = gemini_model()
        else:
            raw = await _complete_openrouter(
                system_message=system_message,
                user_message=user_message,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=True,
            )
            selected_model = openrouter_model()

        data = parse_llm_json(raw)
        return {
            "success": True,
            "data": data,
            "provider": provider,
            "model": selected_model,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "success": False,
            "error": map_provider_error(exc),
            "provider": provider,
            "model": selected_model,
        }


async def generate_text(
    *,
    system_message: str,
    user_message: str,
    agent_id: str = "",
    temperature: float = 0.4,
    max_tokens: int = 2048,
    model: str | None = None,
) -> dict[str, Any]:
    if not is_any_provider_configured():
        return {
            "success": False,
            "error": "AI service is not configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY in the backend environment.",
        }
    provider = active_provider()
    selected_model = (model.strip() if model else gemini_model()) if provider == "gemini" else select_model(agent_id, temperature, model)
    try:
        if provider == "gemini":
            try:
                raw = await _complete_gemini(
                    system_message=system_message, user_message=user_message, model=selected_model,
                    temperature=temperature, max_tokens=max_tokens, json_mode=False,
                )
            except Exception:
                if not groq_api_key():
                    raise
                raw = await _complete_groq(
                    system_message=system_message, user_message=user_message, temperature=temperature,
                    max_tokens=max_tokens, json_mode=False,
                )
                provider = "groq"
                selected_model = groq_model()
        elif provider == "openai":
            raw = await _complete_openai(
                system_message=system_message,
                user_message=user_message,
                model=selected_model,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=False,
            )
        elif provider == "groq":
            try:
                raw = await _complete_groq(
                    system_message=system_message, user_message=user_message, temperature=temperature,
                    max_tokens=max_tokens, json_mode=False,
                )
                selected_model = groq_model()
            except Exception:
                if not is_gemini_configured():
                    raise
                raw = await _complete_gemini(
                    system_message=system_message, user_message=user_message, model=gemini_model(),
                    temperature=temperature, max_tokens=max_tokens, json_mode=False,
                )
                provider = "gemini"
                selected_model = gemini_model()
        else:
            raw = await _complete_openrouter(
                system_message=system_message,
                user_message=user_message,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=False,
            )
        return {"success": True, "text": raw, "model": selected_model, "provider": provider}
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "error": map_provider_error(exc)}

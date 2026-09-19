"""Invocation-scoped data exposed to permission-checked ADK tools."""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any, Iterator


@dataclass(frozen=True, slots=True)
class AgentRequestContext:
    user_id: str
    uploads: tuple[dict[str, Any], ...] = field(default_factory=tuple)
    evidence_pack: str = ""
    shared_context: str = ""
    source_only: bool = False


_REQUEST_CONTEXT: ContextVar[AgentRequestContext | None] = ContextVar(
    "esc_adk_request_context",
    default=None,
)


def current_request_context() -> AgentRequestContext:
    context = _REQUEST_CONTEXT.get()
    if context is None:
        raise RuntimeError("This tool can only be used during an authenticated ESC agent run.")
    return context


@contextmanager
def use_request_context(context: AgentRequestContext) -> Iterator[None]:
    token = _REQUEST_CONTEXT.set(context)
    try:
        yield
    finally:
        _REQUEST_CONTEXT.reset(token)

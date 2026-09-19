"""Shared metadata type for independently defined ESC agents."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


AgentBuilder = Callable[[Any], Any]


@dataclass(frozen=True, slots=True)
class AgentSpec:
    id: str
    name: str
    role: str
    description: str
    builder: AgentBuilder

    def public_dict(self) -> dict[str, str]:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "description": self.description,
        }

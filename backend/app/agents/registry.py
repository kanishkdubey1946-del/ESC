"""Single backend-owned registry for all active ESC specialists."""

from __future__ import annotations

from app.agents.conceptclarifier import SPEC as CONCEPTCLARIFIER
from app.agents.examinsight import SPEC as EXAMINSIGHT
from app.agents.flashcardstudio import SPEC as FLASHCARDSTUDIO
from app.agents.guideminds import SPEC as GUIDEMINDS
from app.agents.mindmapmaker import SPEC as MINDMAPMAKER
from app.agents.paperpatternanalyst import SPEC as PAPERPATTERNANALYST
from app.agents.problemsolver import SPEC as PROBLEMSOLVER
from app.agents.quizforge import SPEC as QUIZFORGE
from app.agents.resourcescout import SPEC as RESOURCESCOUT
from app.agents.revisioncoach import SPEC as REVISIONCOACH
from app.agents.spec import AgentSpec
from app.agents.studyvault import SPEC as STUDYVAULT
from app.agents.successarchitect import SPEC as SUCCESSARCHITECT


AGENT_SPECS: tuple[AgentSpec, ...] = (
    STUDYVAULT,
    EXAMINSIGHT,
    SUCCESSARCHITECT,
    CONCEPTCLARIFIER,
    PROBLEMSOLVER,
    QUIZFORGE,
    REVISIONCOACH,
    FLASHCARDSTUDIO,
    MINDMAPMAKER,
    RESOURCESCOUT,
    PAPERPATTERNANALYST,
    GUIDEMINDS,
)

_BY_ID = {spec.id: spec for spec in AGENT_SPECS}


def normalize_agent_id(agent_id: str) -> str:
    return agent_id.removeprefix("pg_").strip().lower()


def get_agent_spec(agent_id: str) -> AgentSpec | None:
    return _BY_ID.get(normalize_agent_id(agent_id))


def public_catalog() -> list[dict[str, str]]:
    return [spec.public_dict() for spec in AGENT_SPECS]

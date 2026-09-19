"""ESC's Google ADK multi-agent team.

The package deliberately keeps every specialist in its own module so the
agent team is easy to inspect, demonstrate, test, and extend.
"""

from app.agents.registry import AGENT_SPECS, get_agent_spec, public_catalog

__all__ = ["AGENT_SPECS", "get_agent_spec", "public_catalog"]

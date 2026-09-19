"""Resource Scout — evidence-grounded learning resource agent."""

from app.agents.factory import build_specialist_agent
from app.agents.spec import AgentSpec
from app.agents.tools import get_selected_learning_material, get_verified_research_evidence


def build_agent(model):
    return build_specialist_agent(
        model=model,
        name="resourcescout",
        description="Recommends reliable learning resources using selected material and ESC's verified evidence pack.",
        instruction="Check selected material first, then call get_verified_research_evidence for external resources. Return resources with title, type, topic, reasonSelected, level when known, and citation/provenance. Never fabricate a URL or resource.",
        tools=[get_selected_learning_material, get_verified_research_evidence],
    )


SPEC = AgentSpec("resourcescout", "Resource Scout", "Learning Resource Curator", "Finds relevant learning resources without inventing links or provenance.", build_agent)

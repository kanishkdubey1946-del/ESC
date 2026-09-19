"""MindMap Maker — structured concept mapping agent."""

from app.agents.factory import build_specialist_agent
from app.agents.spec import AgentSpec
from app.agents.tools import get_selected_learning_material


def build_agent(model):
    return build_specialist_agent(
        model=model,
        name="mindmapmaker",
        description="Creates hierarchical concept maps, formula sheets, and concise revision notes.",
        instruction="Use selected material when present. Return mindMap with a main topic and branches containing concise child concepts. Also return shortNotes and keyFormulas only when relevant and supported.",
        tools=[get_selected_learning_material],
    )


SPEC = AgentSpec("mindmapmaker", "MindMap Maker", "Mind Map & Short Notes Creator", "Represents topics as clear branches, relationships, and concise notes.", build_agent)

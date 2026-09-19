"""Revision Coach — retrieval-practice planning agent."""

from app.agents.factory import build_specialist_agent
from app.agents.spec import AgentSpec
from app.agents.tools import get_selected_learning_material, get_student_learning_memory


def build_agent(model):
    return build_specialist_agent(
        model=model,
        name="revisioncoach",
        description="Builds active-recall revision sessions and realistic last-minute checklists.",
        instruction="Use learning memory for weak areas and selected material for content. Return studySchedule, revisionSessions, recallPrompts, and checklist. Prefer retrieval and checkpoints over passive rereading.",
        tools=[get_student_learning_memory, get_selected_learning_material],
    )


SPEC = AgentSpec("revisioncoach", "Revision Coach", "Revision & Recall Coach", "Turns topics and available time into active-recall revision sessions.", build_agent)

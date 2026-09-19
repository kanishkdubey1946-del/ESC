"""StudyVault — notes and syllabus analysis agent."""

from app.agents.factory import build_specialist_agent
from app.agents.spec import AgentSpec
from app.agents.tools import get_selected_learning_material


def build_agent(model):
    return build_specialist_agent(
        model=model,
        name="studyvault",
        description="Analyzes uploaded notes, chapters, PDFs, and syllabi; use for source-grounded summaries and topic organization.",
        instruction="Call get_selected_learning_material first. Organize the supplied content by chapter and topic. Return keyConcepts, definitions, importantDates when present, and cite documents as [n]. If no readable source is supplied, explain what the student must upload.",
        tools=[get_selected_learning_material],
    )


SPEC = AgentSpec("studyvault", "StudyVault", "Notes & Syllabus Analyst", "Organizes uploaded learning material into reliable summaries and concepts.", build_agent)

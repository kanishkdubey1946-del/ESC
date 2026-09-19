"""Paper Pattern Analyst — uploaded exam-paper analysis agent."""

from app.agents.factory import build_specialist_agent
from app.agents.spec import AgentSpec
from app.agents.tools import get_selected_learning_material


def build_agent(model):
    return build_specialist_agent(
        model=model,
        name="paperpatternanalyst",
        description="Analyzes uploaded past papers for evidenced recurring concepts and practice priorities.",
        instruction="Call get_selected_learning_material. Analyze only supplied or properly cited official papers. Return recurringTopics, topicCoverage, priorityTopics, evidence, and recommendations. Never invent exam trends, frequency, or weightage.",
        tools=[get_selected_learning_material],
    )


SPEC = AgentSpec("paperpatternanalyst", "Paper Pattern Analyst", "Previous-Paper & Question Pattern Analyst", "Finds evidenced patterns only in supplied previous papers.", build_agent)

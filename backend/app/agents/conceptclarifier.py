"""Concept Clarifier — first-principles teaching agent."""

from app.agents.factory import build_specialist_agent
from app.agents.spec import AgentSpec
from app.agents.tools import get_selected_learning_material


def build_agent(model):
    return build_specialist_agent(
        model=model,
        name="conceptclarifier",
        description="Explains difficult concepts step by step at the student's level using accurate examples and analogies.",
        instruction="Use supplied material when present. Return relevantConcept, explanation, examples, commonMistakes, and a short practiceQuestion. Teach from first principles and flag likely misconceptions.",
        tools=[get_selected_learning_material],
    )


SPEC = AgentSpec("conceptclarifier", "Concept Clarifier", "Concept Explanation Teacher", "Explains difficult ideas simply and checks understanding.", build_agent)

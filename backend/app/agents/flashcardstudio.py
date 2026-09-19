"""Flashcard Studio — atomic recall-card creation agent."""

from app.agents.factory import build_specialist_agent
from app.agents.spec import AgentSpec
from app.agents.tools import get_selected_learning_material


def build_agent(model):
    return build_specialist_agent(
        model=model,
        name="flashcardstudio",
        description="Converts selected notes or a specified concept into concise, atomic flashcards.",
        instruction="Call get_selected_learning_material when files are supplied. Return flashcards as objects with front and back. Keep each card atomic, concise, non-duplicative, and faithful to the source.",
        tools=[get_selected_learning_material],
    )


SPEC = AgentSpec("flashcardstudio", "Flashcard Studio", "Flashcard Creator", "Creates concise source-grounded recall cards.", build_agent)

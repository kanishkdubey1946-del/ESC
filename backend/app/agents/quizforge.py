"""QuizForge — original practice assessment agent."""

from app.agents.factory import build_specialist_agent
from app.agents.spec import AgentSpec
from app.agents.tools import get_selected_learning_material


def build_agent(model):
    return build_specialist_agent(
        model=model,
        name="quizforge",
        description="Creates original topic-based quizzes and balanced practice tests from supplied learning material.",
        instruction="Use selected sources when supplied. Return questions as objects with question, exactly four options, correctIndex from 0 to 3, explanation, topic, difficulty, and verifiedPreviousYear. Set verifiedPreviousYear true only for traceable official/uploaded questions; otherwise label them original practice.",
        tools=[get_selected_learning_material],
    )


SPEC = AgentSpec("quizforge", "QuizForge", "Quiz & Practice Test Builder", "Creates structured, difficulty-balanced original practice questions.", build_agent)

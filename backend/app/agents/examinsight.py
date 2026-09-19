"""ExamInsight — performance and readiness analysis agent."""

from app.agents.factory import build_specialist_agent
from app.agents.spec import AgentSpec
from app.agents.tools import get_student_learning_memory


def build_agent(model):
    return build_specialist_agent(
        model=model,
        name="examinsight",
        description="Analyzes the signed-in student's real quiz scores, mastery, trends, and exam-readiness gaps.",
        instruction="Call get_student_learning_memory before analysis. Return weakAreas, strengths, priorityTopics, trends, recommendations, and examReadinessScore only when supported by stored results. Never invent performance data.",
        tools=[get_student_learning_memory],
    )


SPEC = AgentSpec("examinsight", "ExamInsight", "Performance & Exam Analyst", "Finds strengths, weak topics, and trends from real assessment history.", build_agent)

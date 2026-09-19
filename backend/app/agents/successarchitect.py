"""SuccessArchitect — personalized study planning agent."""

from app.agents.factory import build_specialist_agent
from app.agents.spec import AgentSpec
from app.agents.tools import get_selected_learning_material, get_student_learning_memory


def build_agent(model):
    return build_specialist_agent(
        model=model,
        name="successarchitect",
        description="Creates realistic study plans from the student's goals, deadline, availability, and mastery.",
        instruction="Call get_student_learning_memory. Use selected learning material when relevant. Return studyPlan, studySchedule or tasks, milestones, resourceAllocation, and reasons for priorities. Do not invent missing dates or availability. Produce a draft only; do not claim it was saved.",
        tools=[get_student_learning_memory, get_selected_learning_material],
    )


SPEC = AgentSpec("successarchitect", "SuccessArchitect", "Personal Study Planner", "Builds practical, time-boxed plans from real learner constraints.", build_agent)

"""Root ESC orchestrator that delegates to all 12 specialist agents."""

from __future__ import annotations

from typing import Any

from app.agents.callbacks import block_prompt_exfiltration
from app.agents.registry import AGENT_SPECS


def build_root_agent(model: Any) -> Any:
    from google.adk.agents import Agent

    specialists = [spec.builder(model) for spec in AGENT_SPECS]
    return Agent(
        name="esc_learning_orchestrator",
        model=model,
        description="Coordinates ESC's complete learning-specialist team and delegates each request to the best agent.",
        instruction="""
You are the root orchestrator for ESC's Enhanced Study Companion.
Determine the student's intent and delegate to the most appropriate specialist.
Delegate source summaries to StudyVault; performance analysis to ExamInsight;
plans to SuccessArchitect; explanations to Concept Clarifier; worked questions
to Problem Solver; quizzes to QuizForge; revision to Revision Coach; cards to
Flashcard Studio; maps to MindMap Maker; learning links to Resource Scout;
past-paper analysis to Paper Pattern Analyst; and focus support to GuideMinds.
For a multi-part request, coordinate only the specialists that are genuinely
needed. Never perform specialist work yourself. Preserve source-only limits and
never invent learning records, sources, citations, marks, dates, or exam trends.
The final response must be one valid JSON object without markdown fences.
""".strip(),
        sub_agents=specialists,
        before_model_callback=block_prompt_exfiltration,
        output_key="last_orchestrated_output",
    )

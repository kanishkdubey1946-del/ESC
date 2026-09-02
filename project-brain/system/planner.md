# Planner Module

The Planner coordinates agent execution plans, task division, and dependency mapping.

## Planning Cycle
1. Parse the user's high-level business concept.
2. Break down execution steps (e.g. Research -> Strategy -> Content / Dev / Pitch).
3. Validate requirements for each stage before invoking the corresponding agent.

## State Transitions
* **CREATED**: Workspace is created, waiting for execution plan.
* **RUNNING**: Sequential execution has been triggered and active agent is streaming logs.
* **COMPLETED**: All MVP agents completed execution and consolidated outputs are stored.
* **FAILED**: Executions halted due to runtime or LLM error.

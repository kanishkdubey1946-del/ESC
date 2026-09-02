# System Architecture & Orchestration

This is the system-level blueprint for the **COMET — Multi-Agent Business Orchestrator** engineering runtime.

## Core System Objective
COMET orchestrates five specialized agents (Research, Strategy, Content, Development, Pitch) to form a unified business launch sequence. It operates with a dark-themed high-fidelity UI on the frontend, coordinated by a FastAPI backend using Google ADK and Gemini 2.5 Flash, backed by InsForge (database, authentication, hosting) rather than traditional Firebase.

## System Execution Pipeline
The runtime enforces a strict pipeline for every developer prompt and system update:
1. **Task Classification**: Identify scope, intent, and affected modules.
2. **Context Retrieval**: Load Cache -> Memory -> System -> Source.
3. **Planning**: Formulate execution strategy.
4. **Execution**: Implement changes.
5. **Static Validation**: Code quality, linting, build checks.
6. **Review**: Performance, security, and architecture review.
7. **Incremental Memory Update**: Log updates only to changed docs.

## Critical Rules
* **No Single-Agent Shortcuts**: All workflows must route through the central Orchestrator.
* **Persistent Context Hierarchy**: Always query cache first, then memory, system, and source files.
* **No Redundant Scanning**: Never analyze the entire codebase repeatedly; use incremental updates.

# Design & Architecture Patterns

## Base Agent Pattern
Every agent in the backend must inherit from the base class `COMETBaseAgent` and implement `execute(self, shared_context: dict) -> dict`.

## Client State Management
* React context handles Global Auth State.
* Component states isolate local streaming deltas and tab parameters to avoid page performance lag.
* The frontend uses server-sent event listeners cleaned up inside React lifecycle hooks to prevent memory leaks.

## Concurrency and Serialization
* To prevent database write collisions during multi-agent execution, the orchestrator serializes state writing. Logs are buffered in memory and a single consolidation commit is made per agent stage completion.

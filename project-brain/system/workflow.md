# Workflow Management

COMET runs a multi-agent pipeline where context is passed sequentially from upstream agents to downstream agents.

## Core Flow Steps
1. **User Prompt Input**: Startups, founders, freelancers, or students submit a business concept.
2. **Research Agent**: Parses market, competitors, and demographic data. Generatescompetitors table and TAM/SAM/SOM estimates.
3. **Strategy Agent**: Takes Research output, builds Lean Canvas, pricing tiers, and a 30-day roadmap.
4. **Downstream Execution**:
   - **Content Agent**: Generates marketing copies, taglines, email templates, and social calendars.
   - **Development Agent**: Builds software architecture charts, databases schemas, and boilerplate structure.
   - **Pitch Agent**: Compiles investor pitches, elevator pitch, and 3-year financial projections.
5. **Result Aggregation**: All outputs are compiled and written to the database.

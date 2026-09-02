# Google ADK Standards

* Import agent class definitions from standard Google ADK libraries.
* Isolate prompt configurations and system instructions inside corresponding agent source files:
  - `backend/app/agents/research.py`
  - `backend/app/agents/strategy.py`
  - `backend/app/agents/content.py`
  - `backend/app/agents/development.py`
  - `backend/app/agents/pitch.py`
* Enforce strict type checking and JSON schema constraints on generated responses.

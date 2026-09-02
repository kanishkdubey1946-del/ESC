# FastAPI Backend Standards

* Target Python 3.11+ asynchronous runtime environment.
* Leverage Pydantic models for incoming payload validation and JSON output serialization.
* Implement custom asynchronous streaming classes/middleware to stream agent outputs to frontend client via SSE.
* Maintain clean error responses (`HTTPException`) and descriptive logger records.

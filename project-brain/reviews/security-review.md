# Security Review

## Critical Safeguards
* **Token Verification**: Verify JWT tokens on all requests.
* **Row-Level Security / SQL Filtering**: Restrict database calls based on authenticated user IDs.
* **Sensitive Variables**: Verify that all secrets (Gemini API keys, InsForge secrets) are stored inside environment configurations and never committed to version control.

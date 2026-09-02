# Security Standards

## Client Authentication
* Every API call must verify the user's JWT token via the authorization middleware.
* The frontend must not cache tokens locally in insecure cookies.

## Data Access Rules
* PostgreSQL queries must restrict records based on the authenticated user's ID.
* User roles (`admin`, `member`, `guest`) must restrict workspace mutations where appropriate.
* Prevent unauthorized execution runs by validating workspace ownership before triggering agent execution endpoints.

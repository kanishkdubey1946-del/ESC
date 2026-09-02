# Routing System

## Client-Side Routing
The frontend uses standard React Router to manage views:
* `/` - Landing Page containing product features, testimonials, and access portal.
* `/dashboard` - Core workspace view shell containing sidebar, agent tabs, and active consoles.
* SPA Fallback: Enabled via `vercel.json` rewrite config (`"source": "/(.*)", "destination": "/index.html"`) for client-side routing on CDN deployment.

## Server-Side Routing
FastAPI router prefixes:
* `/auth` - Authentication verification.
* `/workspaces` - CRUD operations and active streaming triggers.

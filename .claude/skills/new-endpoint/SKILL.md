---
name: new-endpoint
description: Create a new API endpoint in rentmate-server following canonical conventions
---

# New Endpoint Workflow
To create a new HTTP API endpoint:

1. Define request DTO with `class-validator` annotations in `src/modules/<module>/dto/`.
2. Add `@RequirePermissions('resource:action')` and Swagger decorators on controller method.
3. Call Service method; service invokes Repository for queries.
4. Verify response envelope matching `{ success: true, data, meta }`.
5. Refer to `docs/ai/05-api-conventions.md` and `docs/ai/07-security-and-logging.md`.

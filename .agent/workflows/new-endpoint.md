# Workflow: Create New API Endpoint

1. Define request/query DTO in `dto/` using `class-validator`.
2. Add `@RequirePermissions('resource:action')` and Swagger decorators on controller method in `controllers/`.
3. Invoke service in `services/`; service uses repository in `repositories/`.
4. Follow API conventions in `docs/ai/05-api-conventions.md`.
5. Run validation: `yarn lint`, `yarn test`, `yarn test:e2e`, `yarn build`.

# 06 — Local Backend (Module E, local part)

**Depends on:** 04, 05. **Cloud:** none. **Next:** [07 AWS Integration](../07_aws_integration/README.md)

## Purpose
Prove the API contract and business logic locally before any cloud service exists. This makes the later AWS step a swap of implementation, not a redesign.

## In Scope
- API contract in `API_SPECIFICATION.md`: operations to save, get, list, delete experiments; create/get package; (later) share operations.
- Request/response examples, validation rules, status and error model.
- A local implementation (simple server or local adapter) behind the same interface cloud code will implement.
- Storage adapter interface with local file/memory implementation.
- Frontend API client with a configuration switch: local-only mode vs backend mode.
- Server-side validation (never trust the client).
- Structured error responses; no private data in logs.

## Out of Scope
AWS SDKs, real authentication, cloud resources.

## Rules
- Keep it a simple modular design; no microservices.
- Local-only mode must continue to work with the backend off.

## Tests
- API tests for every operation: success, validation failure, not found, oversize payload.
- Consistent error format.
- Frontend falls back or reports clearly when the backend is unreachable.
- Local export still works when the backend is unavailable.

## Acceptance Gate
- [ ] All operations match the written contract.
- [ ] Validation enforced server-side.
- [ ] Frontend works in both modes.
- [ ] Storage adapter interface documented for the AWS implementation.

## Agent Prompt
`docs/agent-prompts/06_LOCAL_BACKEND_PROMPT.md`

## Evidence
API test report; request/response samples; mode-switch screenshots.

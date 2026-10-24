# 09 — Security Hardening (Module F)

**Depends on:** 05–08. **Cloud:** partly. **Next:** [10 Testing & QA](../10_testing_and_qa/README.md)

## Purpose
Review and strengthen what exists, guided by a threat model appropriate to a small student project, and prove it with negative tests. Security practices begin earlier (e.g. import validation in 05); this milestone consolidates and closes gaps.

## In Scope
- Threat model: assets, actors, entry points, threats, mitigations, residual risks.
- Input validation on every boundary (UI, API, import).
- Ownership checks on every private operation.
- Least-privilege IAM review (each role: why each permission is needed).
- S3: Block Public Access, no public private-data objects, object-size limits, content-type checks, expiration policy.
- Filename sanitization; never execute uploaded files or user content.
- Secrets only via environment/configuration; scan the repository history.
- CORS restricted; error messages that don't leak internals.
- Logging without private data or secrets.
- Privacy notes for shared experiments and exported packages (what is included, who can see it).
- Delete/cleanup behavior verified.

## Out of Scope
Claims of production-grade security; advanced paid security services (e.g. WAF) unless verified free and justified.

## Negative Tests
| Attack / mistake | Expected |
|------------------|----------|
| Path traversal in package | Rejected |
| Archive bomb | Rejected by limits |
| Malformed/oversize JSON | Rejected, no crash |
| Access another user's resource | Denied |
| Expired/revoked share | Denied |
| Wrong origin (CORS) | Blocked |
| Secret in repo | Scan finds none |
| Public S3 access attempt | Denied |

## Acceptance Gate
- [ ] Threat model documented and mapped to tests.
- [ ] All negative tests pass.
- [ ] IAM reviewed; no wildcard permissions without justification.
- [ ] No secrets in repo or logs.

## Agent Prompt
`docs/agent-prompts/09_SECURITY_HARDENING_PROMPT.md`

## Evidence
Threat model table; negative-test results; IAM policy review notes.

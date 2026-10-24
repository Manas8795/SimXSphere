# 10 — Testing & Quality (Module G)

**Depends on:** all (runs continuously). **Cloud:** partly. **Next:** [11 Deployment & Cost](../11_deployment_and_cost/README.md)

## Purpose
Consolidate and complete the test suite and quality checks. Tests are written during each milestone; this component fills gaps, adds integration and acceptance tests, and produces evidence.

## Test Layers
| Layer | What | Runs where |
|-------|------|-----------|
| Unit | Simulation equations, validation, serialization | Local |
| Statistical | Large-N checks with tolerances | Local |
| Seeded | Reproducibility | Local |
| Round trip | Export → import → compare | Local |
| Package validation | Manifest, checksum, limits, malformed input | Local |
| API | Validation, errors, contract | Local, then cloud |
| Authorization | User A vs user B | Cloud/local auth |
| Browser integration | Key user workflows end to end | Local browser |
| Accessibility / responsive | Keyboard, labels, widths | Manual + tools |
| Cloud smoke | Basic real-endpoint checks, console verification | AWS |
| Performance | Small academic workloads | Local |

## For Every Test Record
Input, expected result, actual result, where it runs, pass/fail, date.

## Key Rules
- Never assert exact random outcomes without a seed; use tolerances otherwise.
- Fixtures for valid, invalid, oversized, and old-version files.
- Regression checklist after each module.

## Acceptance Gate
- [ ] Every earlier milestone's tests still pass.
- [ ] Critical workflows covered by browser integration tests.
- [ ] Negative and authorization tests included.
- [ ] Results recorded in a test evidence document.

## Agent Prompt
`docs/agent-prompts/10_TESTING_AND_QA_PROMPT.md`

## Evidence
Full test run output; coverage summary (if used); regression checklist results.

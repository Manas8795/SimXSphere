# 12 — Academic Evidence & Deliverables

**Depends on:** all. **Cloud:** none. **End of sequence.**

## Purpose
Turn the working project into defensible academic material, backed by real evidence rather than assertions.

## Deliverables
| Deliverable | Content |
|-------------|---------|
| Problem statement, objectives, scope | From master plan |
| Requirements | Functional and non-functional |
| Use cases / user journeys | Run, save, bundle, import, share |
| Architecture diagram | Frontend, engine, backend, storage, flows |
| AWS service mapping table | Purpose, data, alternatives, verification status and date, why included |
| Data model / schema | Versioned experiment and manifest |
| API contract | From 06 |
| Sequence diagrams | Save, export package, import package, share |
| Security / threat model | From 09 |
| Test plan and evidence | From 10 |
| Evaluation metrics and results | See below |
| Limitations and future work | Honest, specific |
| Final report and presentation outline | |
| Viva questions and answers | Architecture, free-tier constraints, compression, integrity, security, failures, trade-offs |

## Suggested Measurable Evaluation
- Round-trip success rate across N sample packages.
- Original vs compressed size by content type (report as measured; no promised ratio).
- Simulation accuracy vs theory with tolerances.
- Import rejection rate on a malformed-file set.
- Run time for maximum workloads.
- Authorization test pass rate.
- Cost observed (expected zero) with billing screenshots.

## Evidence Checklist
- [ ] Screenshots of every key page and flow.
- [ ] Test outputs saved with dates.
- [ ] Verified-service table with links.
- [ ] Budget and teardown proof.
- [ ] Demo script rehearsed in local-only mode and (if used) cloud mode.

## Honesty Rules
No claims of production-grade or highly scalable without evidence. State actual scale, limits, and unknowns.

## Agent Prompt
`docs/agent-prompts/12_ACADEMIC_EVIDENCE_PROMPT.md`

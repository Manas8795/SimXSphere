# OmniLab — Project Workflow

> OmniLab is a browser-based simulation and experiment platform. **OmniPack** is its bundling/compression/export subsystem.
> This file is the entry point for the build order. Each step links to a component README that defines what to do, what not to do, tests, and the gate to pass before moving on.

## 1. What OmniLab Is (Plain Language)

Users run simulations in the browser (probability, projectile motion, pendulum, optionally Ohm's law), change parameters, view graphs, save experiments, group them into an **experiment collection**, bundle them into one losslessly compressed ZIP (OmniPack), and import or share them. AWS supports hosting, metadata, storage, and sharing; it is not the product.

**Out of scope:** machine learning/generative AI, management-system features, paid services, running user-submitted code, high-fidelity lab simulation claims, automatic "relatedness" detection (collections are user-selected).

## 2. Ground Rules (Apply to Every Component)

1. **Local-first.** Core app works fully offline/local before any AWS is touched.
2. **One milestone at a time.** No scaffolding of future modules.
3. **Gate before moving on.** If acceptance criteria fail, stop and fix.
4. **AWS free-only.** Every AWS service is marked `VERIFY BEFORE USE` against current official AWS pricing/free-tier pages for *your* account, plan and region. A free allowance is not a spending cap; AWS Budgets can notify but does not guarantee preventing charges.
5. **No secrets in Git or frontend code.** Placeholders only.
6. **Lossless compression only.** Never promise a specific compression ratio.
7. **Honest claims.** No "production-grade" or "highly scalable" without evidence.
8. **Small agent prompts.** One prompt at a time; inspect, test, approve, commit.

## 3. Build Sequence

| # | Component | Maps to | Depends on | Cloud? |
|---|-----------|---------|------------|--------|
| 01 | [Repository & Foundation](components/01_repository_foundation/README.md) | Module H (local part) | — | No |
| 02 | [Frontend Shell](components/02_frontend_shell/README.md) | Module A | 01 | No |
| 03 | [Simulation Engine](components/03_simulation_engine/README.md) | Module B | 01, 02 | No |
| 04 | [Experiment Model & Persistence](components/04_experiment_persistence/README.md) | Module C | 03 | No |
| 05 | [OmniPack Export/Import](components/05_omnipack_export_import/README.md) | Module D | 04 | No |
| 06 | [Local Backend](components/06_local_backend/README.md) | Module E (local) | 04, 05 | No |
| 07 | [AWS Integration](components/07_aws_integration/README.md) | Module E (cloud) | 06 | **Yes — gated** |
| 08 | [Auth & Sharing](components/08_auth_and_sharing/README.md) | Modules D/E/F | 07 | **Yes — gated** |
| 09 | [Security Hardening](components/09_security_hardening/README.md) | Module F | 05–08 | Partly |
| 10 | [Testing & QA](components/10_testing_and_qa/README.md) | Module G | all (runs continuously) | Partly |
| 11 | [Deployment & Cost Verification](components/11_deployment_and_cost/README.md) | Module H | 07–10 | **Yes — gated** |
| 12 | [Academic Evidence](components/12_academic_evidence/README.md) | Deliverables | all | No |

**Testing (10) is not only a final phase.** Run its relevant tests at the end of every milestone; component 10 consolidates and extends them.

## 4. Phases and Decision Points

```
PHASE 1  LOCAL CORE        01 → 02 → 03 → 04 → 05      (demonstrable with zero AWS)
   Gate: round-trip export/import passes locally.

PHASE 2  LOCAL BACKEND     06                           (API contract proven locally)
   Gate: API tests pass against local implementation.

PHASE 3  CLOUD (OPTIONAL)  07 → 08                      (only after AWS verification)
   Gate: cost checklist signed off; smoke tests pass.

PHASE 4  HARDEN & SHIP     09 → 10 → 11
   Gate: pre-deployment checklist fully ticked.

PHASE 5  EVIDENCE          12
```

**Fallback:** If AWS setup is blocked or any service cannot be verified free, stop at Phase 2 and present the local-only mode. The project remains demonstrable.

## 5. Per-Milestone Loop (Repeat for Each Component)

1. Read the component README and its linked spec/prompt.
2. Paste **only** that component's agent prompt into the coding agent.
3. Require the agent to inspect the repo and explain its plan *before* editing.
4. Review the diff; reject unrelated changes.
5. Run the listed tests/commands; compare to expected results.
6. Tick the acceptance checklist; capture evidence (screenshots, test output).
7. Commit with a message naming the milestone. Tag it (e.g., `m03-simulations`).
8. Only then start the next component.

If a gate fails: fix within the same milestone, or roll back to the last tag.

## 6. Cross-Cutting Tracks

| Track | When | Where |
|-------|------|-------|
| Testing | End of every milestone | Component 10 |
| Security checks | From milestone 05 onward; consolidated in 09 | Component 09 |
| Cost verification | Before 07, 08, 11 | Component 11 + `AWS_FREE_TIER_AND_COST_GUARDRAILS.md` |
| Evidence capture | Every milestone | Component 12 |

## 7. Pre-Deployment Checklist (Summary)

Full version lives in component 11. Do not deploy unless all are true:

- [ ] Each AWS service verified free for my account/plan/region on official AWS pages (date recorded).
- [ ] No paid or unverified service in the stack.
- [ ] Budget and alerts configured (understood as notification, not a cap).
- [ ] S3 Block Public Access on; no public private-data objects.
- [ ] IAM least privilege; no keys in Git or frontend.
- [ ] Logging retention limited; no private data in logs.
- [ ] Teardown procedure written and rehearsed.
- [ ] Local-only mode still works.

## 8. Definition of Done (Project)

All component gates passed; round-trip and negative import tests pass; authorization tests pass (user A cannot access user B's private experiment); resources cleaned up after testing; report, demo, and viva material produced with evidence.

# PROJECT_PLAN

## 1. Problem and motivation
Students run small simulations but lose the parameters and results; sharing several related runs means emailing loose files. SimXSphere keeps experiments reproducible (parameters + seed), bundles related ones into one verified, compressed package, and (cloud mode) stores them privately on AWS.

## 2. Objectives
1. Two correct, tested simulations with validated inputs.
2. Reproducible experiment records with a versioned schema.
3. Lossless, validated ZIP packaging with measurable size savings.
4. A storage abstraction so local and AWS backends are interchangeable.
5. A documented, security-reviewed AWS architecture, deployed only after cost verification.

## 3. Scope boundaries
In/out lists: see [README.md](README.md) sections 3-4. Any new idea goes to "Future work" unless it replaces something of equal size.

## 4. Requirements
**Functional:** FR1 run probability sim; FR2 run projectile sim; FR3 validate inputs/reset; FR4 save/list/open/delete experiments; FR5 select 2-4 experiments into a collection; FR6 export SimXPack; FR7 show size stats; FR8 import with validation and restore; FR9 (cloud) sign in, upload, list, download, delete packages.
**Non-functional:** NFR1 works offline in local mode; NFR2 lossless round trip; NFR3 no secrets in files/repo; NFR4 import rejects hostile archives; NFR5 export/import of a 4-experiment package completes in well under a few seconds on a normal laptop (measured, not assumed); NFR6 cloud resources private and removable.

## 5. Milestones
| # | Milestone | Depends on | Acceptance gate |
|---|---|---|---|
| 1 | Repo, UI shell, local dev | - | `npm run dev/test/lint/build` all pass |
| 2 | Probability sim + tests | 1 | Same seed -> same counts; bounds enforced; tests green |
| 3 | Projectile sim + tests | 1 | Test vectors in SIMULATIONS.md pass; 0 and 90 deg handled |
| 4 | Local save/restore | 2, 3 | Reload page -> experiments identical |
| 5 | SimXPack export/import | 4 | Round trip identical; all hostile-archive tests rejected |
| 6 | End-to-end UI | 5 | Every button works; e2e workflow passes |
| 7 | AWS cloud mode | 6 + cost gate | Cost checklist signed; deploy; adapter tests; teardown tested |
| 8 | Security, regression, evidence, demo | 6 (7 if deployed) | Full test run archived; demo rehearsed |

**Milestone 7 and the course requirement.** Because this is a cloud project, AWS design is mandatory and is fully specified in ARCHITECTURE.md. Deployment is performed only if the cost gate passes for the student's real account. If it does not pass, the submission contains the complete architecture, IaC template (unapplied), IAM policies, cost analysis, and an adapter tested against mocks, and states clearly that deployment was withheld for cost reasons.

## 6. Risks
| Risk | Mitigation |
|---|---|
| Scope creep | Only 2 simulations; extras are future work |
| ZIP library issue | Verify license/size at M5; adapter around it |
| Float round-trip surprises | Canonical JSON; test with awkward values |
| AWS cost surprise | Local default; gate; teardown; no paid-by-default services |
| AWS free plan ends/closes account | Deploy close to demo date; keep local copies of all ZIPs |
| Time | Milestones 1-6 form a complete project by themselves |

## 7. Scope control rules
- No milestone starts before the previous gate passes.
- No new dependency without a written reason.
- No AWS service without a row in AWS_FREE_COST_CHECKLIST.md.

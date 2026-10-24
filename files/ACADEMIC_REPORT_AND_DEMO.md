# ACADEMIC_REPORT_AND_DEMO

Suggested title: **SimXSphere: An Interactive Simulation Platform with Experiment Packaging, Compression, Export, and Sharing**

## 1. Report outline
1. Abstract (150 words)
2. Introduction: problem, motivation
3. Objectives and scope boundaries (in/out)
4. Requirements: functional, non-functional
5. Use cases and user journeys: run -> save -> group -> export -> import; (cloud) sign in -> upload -> share link -> delete
6. System design: architecture diagram (local + AWS), storage adapter, data model, example experiment JSON, SimXPack layout and manifest
7. **Cloud architecture on AWS**: services chosen and why, data flow, IAM least privilege, S3/DynamoDB/Cognito/Lambda design, cost-control strategy and the cost gate, excluded services and reasons, teardown
8. Simulation models: formulas, assumptions, limits
9. Implementation: stack, milestones, notable decisions (canonical JSON, running byte counter, local-first)
10. Security: threat model, controls, residual risks
11. Testing: strategy, test table, results (real output)
12. Evaluation: metrics below with measured data
13. Limitations and future enhancements
14. Conclusion
15. References: AWS docs/pricing pages (with access dates), ZIP library docs, PRNG reference
16. Appendices: schemas, manifest, test logs, resource inventory, cost-checklist record

## 2. Evaluation metrics (measure; do not estimate)
| Metric | How |
|---|---|
| Compression ratio, bytes saved, percent saved | Packs of 2, 3, 4 experiments; with and without CSV; table of original/compressed |
| Export time, import time | `performance.now()`, median of 10 runs, state machine/browser |
| Round-trip success | Count passed X1-X2 style cases (e.g. 50 randomized experiments, 50/50 equal) |
| Rejection rate of hostile archives | S1-S9 all rejected |
| Simulation correctness | J1-J9, P1-P7 pass; max deviation vs analytic values |
| (cloud) end-to-end latency of upload/download | Measured over a few runs; state region and network |

Report honestly if savings are small or negative for tiny packs.

## 3. Demo script (about 8-10 minutes)
1. (30 s) What and why; local-first; AWS as private cloud layer.
2. (1 min) Probability: 1000 coin tosses, seed 42, histogram; rerun same seed -> same result.
3. (1 min) Projectile: 20 m/s at 45 degrees; show range and the "no air resistance" note; change gravity to Moon.
4. (1 min) Save both plus one more; reload page; still present.
5. (1.5 min) Select 3 -> Export SimXPack; show size stats; open ZIP, show manifest and files.
6. (1 min) Tamper with a file in the ZIP -> import rejected with checksum error. Then import the genuine ZIP after deleting local copies -> restored identically.
7. (2 min) Cloud mode (if deployed): sign in, upload, show S3/DynamoDB console (private bucket), download via expiring link, delete. If not deployed: walk through the architecture diagram, IaC template, IAM policy, cost-gate decisions, and show adapter tests passing.
8. (1 min) Tests green, limitations, future work.
Prepare a backup screen recording and local-only fallback.

## 4. Limitations to state
Idealized physics; small catalogue; checksums are not signatures; browser storage limits; cloud mode scale untested beyond demo; free-offer conditions vary by account and time; student-scale security review.

## 5. Future work
More simulations (binomial, normal, pendulum, Ohm's law), package signing, shared collections with access control, frontend hosting on AWS if cost-verified, accessibility audit.

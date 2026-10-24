# 11 — Deployment & Cost Verification (Module H)

**Depends on:** 07–10. **Cloud:** YES — **gated**. **Next:** [12 Academic Evidence](../12_academic_evidence/README.md)

> Any command or service that could incur cost is flagged and blocked until its verification is ticked. A free-tier allowance is not a spending cap. AWS Budgets may notify but does not guarantee preventing charges. Do not claim any service is free without checking current official AWS pages for your account.

## Purpose
Deploy the verified minimal architecture, confirm it behaves, and tear it down cleanly. Also covers local setup documentation, rollback, and operations.

## In Scope
- Local development setup guide.
- Environment configuration example (placeholders only).
- Deployment steps using only verified no-cost features; frontend hosting only if its free eligibility is verified, otherwise stay local.
- Rollback strategy (previous tag/stack state).
- Logs and debugging steps.
- Resource inventory and teardown procedure.
- Cost checklist before and after deployment.

## Pre-Deployment Checklist
- [ ] Each service verified on official AWS pages for my account, plan and region (record date and link).
- [ ] Unverifiable services removed; local alternative documented.
- [ ] Budget and alerts set.
- [ ] Billing/cost console checked for unexpected usage.
- [ ] S3 Block Public Access on; IAM least privilege.
- [ ] CloudWatch retention limited.
- [ ] No keys in Git/frontend.
- [ ] Teardown steps written and rehearsed.
- [ ] Local-only mode confirmed working.

## Post-Deployment Checklist
- [ ] Smoke tests pass.
- [ ] Resource inventory matches console.
- [ ] Test data deleted.
- [ ] Billing view checked again after a day.

## Teardown
Delete in dependency-safe order (stacks/functions → tables → emptied buckets → logs → identity pool/users → budgets only if desired). Confirm in the console that nothing remains. Record the date.

## Acceptance Gate
- [ ] Deploy, verify, rollback, and teardown each rehearsed once.
- [ ] No resources left running after testing.
- [ ] Final checklist signed with date.

## Agent Prompt
`docs/agent-prompts/11_DEPLOYMENT_AND_COST_VERIFICATION_PROMPT.md`

## Evidence
Dated verification table; budget screenshot; deployment and teardown logs; empty resource inventory.

# 07 — AWS Integration (Module E, cloud part)

**Depends on:** 06. **Cloud:** YES — **gated**. **Next:** [08 Auth & Sharing](../08_auth_and_sharing/README.md)

> **STOP before starting.** Complete the cost verification in [11](../11_deployment_and_cost/README.md) and `AWS_FREE_TIER_AND_COST_GUARDRAILS.md` for every service below. A free-tier allowance is not a spending cap. AWS Budgets may notify but does not guarantee preventing charges. If a service cannot be verified free for your account, plan and region, exclude it and keep the local alternative.

## Purpose
Implement the storage adapter and API on the smallest practical set of AWS services, behind the interface proven in 06.

## Service Decisions (all `VERIFY BEFORE USE`)
| Service | Status | Purpose | Local alternative |
|---------|--------|---------|-------------------|
| AWS Lambda | Candidate (required if cloud used) | API / business logic | Local server |
| Amazon DynamoDB | Candidate (required) | Experiment, ownership, share metadata | Local file/memory store |
| Amazon S3 | Candidate | Experiment files and packages | Local file store |
| API layer (e.g. API Gateway or Lambda function URL) | Choose smallest that is verified; record as assumption | HTTP entry point | Local server |
| CloudWatch | Candidate (limited) | Basic logs; short retention | Console logs |
| CloudFormation | Optional | Repeatable deploy and clean teardown | Manual steps |
| Cognito | Decided in 08 | Authentication | Local stub |
| SQS, SNS, EventBridge, Step Functions, CloudFront, CloudTrail, WAF, EC2, RDS, NAT Gateway | **Excluded** from default | No requirement they uniquely solve; cost or complexity risk | — |

## In Scope
- Cloud implementation of the storage adapter (DynamoDB + S3).
- Lambda handlers matching the API contract.
- CORS configured to specific allowed origins.
- Configuration via environment variables; no keys in code.
- IAM roles with least privilege (only the tables/buckets/actions needed).
- S3 Block Public Access on; size limits; lifecycle expiration for test data.
- Retry and failure handling for transient errors.
- Resource inventory file listing everything created.

## Out of Scope
User login and sharing logic (08), unverified services.

## Tests
- Cloud smoke test: save → get → list → delete via real endpoint.
- Console check: items exist in DynamoDB/S3, then are removed on delete.
- Invalid and oversize requests rejected.
- CORS: allowed origin works; other origin blocked.
- Same test suite from 06 passes against the cloud implementation.

## Acceptance Gate
- [ ] Every service verified and dated in the guardrails file.
- [ ] Budget alert configured before deployment.
- [ ] No public buckets; no credentials in Git.
- [ ] Contract tests pass in cloud mode.
- [ ] Teardown tested; resource inventory empty afterwards.

## Agent Prompt
`docs/agent-prompts/07_AWS_INTEGRATION_PROMPT.md`

## Evidence
Verification table with dates and links; console screenshots; smoke-test output; teardown confirmation.

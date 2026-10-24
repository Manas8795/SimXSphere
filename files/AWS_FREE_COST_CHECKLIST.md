# AWS_FREE_COST_CHECKLIST

> **No unverified claims.** Nothing here guarantees free usage. AWS offers change. Everything marked **VERIFY BEFORE USE** must be checked on the official page *and* in your own account before creating any resource. Budgets and billing alerts are **notifications, not spending caps**.
> If you require a zero chance of AWS charges, run local-only and do not deploy.

## 1. Free-offer landscape (to verify, not assume)
Reports (including an AWS Builder Center post, last updated May 2026) describe that accounts created on or after **15 July 2025** choose a **Free plan** or **Paid plan** at signup, with credits (reported as $100, up to $200 with onboarding activities); the Free plan reportedly ends after **6 months or when credits run out**, then the account closes unless upgraded; accounts created earlier remain on the legacy Free Tier. Some services/features may require the Paid plan, and enabling them can convert the account (credits then expire). **VERIFY BEFORE USE** on https://aws.amazon.com/free/ and in Billing console -> Free Tier / Credits.

Implications for this project:
- Deploy shortly before the demo; the plan clock may close the account. Keep local copies of every ZIP.
- Credits being used up is not the same as "free forever". Do not treat credits as proof a service is permanently free.
- Account type decides whether overage bills your card or consumes credits / closes the account. Find out which applies *to you*.

## 2. Account verification steps (do all before deploying)
- [ ] Note account creation date and plan (Free vs Paid vs legacy).
- [ ] Open Billing -> Free Tier; record remaining credits/limits and expiry dates (screenshot).
- [ ] Choose one region; confirm every service below is available and eligible there.
- [ ] Create a **zero-spend / low budget** in AWS Budgets with email alerts (notification only).
- [ ] Enable Free Tier usage alerts if offered.
- [ ] Create an IAM user/role for deployment (not root); enable MFA on root; never create root access keys.
- [ ] Confirm no existing resources that already incur cost.

## 3. Service-by-service table
| Service | Role | Official pricing / free-tier page | Status |
|---|---|---|---|
| AWS Lambda | API logic | https://aws.amazon.com/lambda/pricing/ | VERIFY BEFORE USE |
| Amazon DynamoDB | Metadata | https://aws.amazon.com/dynamodb/pricing/ | VERIFY BEFORE USE (check capacity mode, storage, backups off) |
| Amazon S3 | Package storage | https://aws.amazon.com/s3/pricing/ | VERIFY BEFORE USE (storage, requests, data transfer out) |
| Amazon Cognito | Authentication | https://aws.amazon.com/cognito/pricing/ | VERIFY BEFORE USE (check plan/feature tier, MAU allowance, advanced security features OFF) |
| Amazon API Gateway (HTTP API) | HTTPS entry + JWT authorizer | https://aws.amazon.com/api-gateway/pricing/ | VERIFY BEFORE USE; **exclude if not eligible** |
| Lambda Function URL (alternative to API Gateway) | HTTPS entry | https://aws.amazon.com/lambda/pricing/ and https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html | VERIFY BEFORE USE |
| Amazon CloudWatch Logs | Error logs | https://aws.amazon.com/cloudwatch/pricing/ | VERIFY BEFORE USE (retention 3-7 days; no custom metrics/alarms/dashboards unless verified) |
| AWS CloudFormation / SAM | Deploy and delete | https://aws.amazon.com/cloudformation/pricing/ | VERIFY BEFORE USE (no extensions/hooks) |
| AWS IAM | Permissions | https://aws.amazon.com/iam/pricing/ | VERIFY BEFORE USE |
| AWS Budgets | Alerts | https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/ | VERIFY BEFORE USE (some budget types/actions may cost) |

Estimator: https://calculator.aws/ (use realistic tiny numbers; remember it estimates, it does not cap).

## 4. Decision rule
For each service: if the official page + your account show it is covered for the expected usage -> **Included (cloud mode)**. If not verifiable -> **Excluded**, use the local alternative:
| Excluded service | Local alternative |
|---|---|
| API Gateway (and Function URL) | Cloud mode off for the API; demo cloud via mocked adapter |
| Cognito | Single-user mode with no auth (only if cloud is deployed privately for you; otherwise cloud off) |
| Any of S3/DynamoDB/Lambda | Cloud mode off entirely; local adapter |

## 5. Never in the default design
EC2, RDS, NAT Gateway, load balancers, CloudFront, WAF, Route 53/custom domains, SQS/SNS/EventBridge/Step Functions, Elastic IPs, paid third-party APIs, S3 versioning/replication, DynamoDB backups/global tables, CloudWatch custom dashboards/alarms (unless verified).

## 6. Resource inventory (fill in at deployment; one row per resource)
| Resource type | Name | Region | Created (date) | Cost notes | Deleted? |
|---|---|---|---|---|---|
| CloudFormation stack | simxsphere-dev | | | | |
| S3 bucket | simxsphere-packages-<suffix> | | | | |
| DynamoDB table | simxsphere-packages | | | | |
| Lambda function | simxsphere-api | | | | |
| Cognito user pool | simxsphere-users | | | | |
| API / Function URL | | | | | |
| Log group | /aws/lambda/simxsphere-api | | | | |
| IAM role | simxsphere-api-role | | | | |

## 7. Teardown (test it once before the demo)
1. Empty the S3 bucket (objects and, if any, versions).
2. `aws cloudformation delete-stack --stack-name simxsphere-dev` (or `sam delete`).
3. Confirm stack status DELETE_COMPLETE.
4. Manually confirm in console: no leftover bucket, table, function, user pool, log group, role.
5. Check Billing -> Bills / Cost Explorer the next day and again after a week.
6. Delete deployment access keys; keep root locked.

## 8. No-charge verification checklist (final)
- [ ] Account plan/age/credits recorded; region fixed.
- [ ] Every deployed service has an official-page check dated and saved.
- [ ] Budget alert exists and was tested (notification only).
- [ ] Resource inventory matches console (nothing extra).
- [ ] No excluded services created.
- [ ] S3: public access blocked, no versioning, lifecycle expiry set.
- [ ] Log retention set short.
- [ ] Usage during demo kept tiny; test data deleted after.
- [ ] Teardown rehearsed and completed after submission.

**Limits of this checklist:** it reduces risk; it cannot guarantee zero charges. Data transfer, request counts, forgotten resources, pricing changes, account-plan changes and typos can all cost money. Do not write "guaranteed free" in the report unless your own account conditions were verified and you say exactly which.

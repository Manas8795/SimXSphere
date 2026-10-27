# SimXSphere — Strict AWS Free-Tier-Only Policy & Classification Guide

**Policy Version:** 1.0.0  
**Effective Date:** October 28, 2026  
**Governing Rule:** Zero out-of-pocket AWS cost is a mandatory, non-negotiable requirement.

---

## 1. Core Operating Principles

1. **Local Mode as Default:** SimXSphere is primarily a client-side, local-first scientific modeling platform. Local mode, browser persistence (`simxsphere:experiments`), and portable file exports (`.simxpack`) must remain 100% functional without any AWS dependency.
2. **Zero Out-of-Pocket Cost:** No resource may be provisioned or configured in a way that introduces or risks unexpected cloud charges.
3. **Verification Before Action:** Every AWS service, region, account plan, and usage allowance must be verified against current official AWS documentation and live AWS account Free Tier telemetry before any provisioning action.
4. **No Promotional Credit Reliance:** Promotional credits or temporary trial credits do not classify a service as free.
5. **Prohibited Services:**
   - Amazon EC2 instances
   - Amazon RDS databases
   - NAT Gateways and VPC Endpoints
   - Paid Route 53 hosted zones and custom domains
   - Paid CloudWatch metrics, alarms (>10), or log groups (>5 GB)
   - Provisioned add-ons, WAF, or enterprise support plans.

---

## 2. Resource Classification Matrix

Every AWS resource considered for SimXSphere is strictly classified into one of three tiers:

- **Class A — Eligible within a verified ongoing free allowance ("Always Free")**: The service offers an ongoing monthly free tier that does not expire after 12 months, and SimXSphere workload is projected to stay well within that quota.
- **Class B — Temporarily free (12-Month Free Tier) or promotional**: The service is only free for the first 12 months of a new AWS account, or requires credits.
- **Class C — Paid, ineligible, or uncertain**: The service incurs on-demand or provisioned charges from day one, or after exceeding narrow limits.

### Classification Table for SimXSphere Architecture

| Service / Resource | Proposed Role | Free Tier Category | Classification | Monthly Free Allowance | Expiration Condition | Potential Charges if Exceeded | Action Under Policy |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **AWS Lambda** | REST API Handlers & Function URLs | Always Free | **Class A** | 1,000,000 requests/mo<br>3,200,000 sec compute (128 MB) | Never expires | $0.20 per 1M requests<br>$0.0000166667 / GB-sec | **Approved** (within quota) |
| **DynamoDB (Provisioned)** | Experiment metadata & package index | Always Free | **Class A** | 25 GB storage<br>25 WCU & 25 RCU | Never expires | $0.25/GB/mo storage<br>$0.00065/hour/RCU/WCU | **Approved** (when set to $\le 5$ RCU/WCU) |
| **Cognito User Pools** | User authentication & JWT tokens | Always Free | **Class A** | 50,000 Monthly Active Users (MAUs) | Never expires | $0.0055 per MAU over 50,000 | **Approved** (direct sign-in) |
| **CloudWatch Logs** | Lambda error logging | Always Free | **Class A** | 5 GB ingestion & archive | Never expires | $0.50 per GB ingested | **Approved** (with 7-day retention limit) |
| **AWS Budgets** | Cost threshold alert ($0.01 limit) | Always Free | **Class A** | 2 active budgets | Never expires | $0.02/day per budget over 2 | **Approved** (1 budget used) |
| **Lambda Function URLs** | HTTPS endpoint for API | Always Free | **Class A** | Included with Lambda invocations | Never expires | Standard Lambda invocation pricing | **Approved Alternative** |
| **Amazon S3** | Payload storage for `.simxpack` | 12-Month Free Tier | **Class B / C** | 5 GB standard, 20k GET, 2k PUT | **Expires after 12 months** | $0.023/GB/mo storage<br>$0.005/1k PUT, $0.0004/1k GET | **STOPPED / PROHIBITED** |
| **Amazon API Gateway** | HTTP API endpoint | 12-Month Free Tier | **Class B / C** | 1,000,000 calls/mo | **Expires after 12 months** | $1.00 per 1M requests | **STOPPED / PROHIBITED** |
| **DynamoDB (On-Demand)** | Pay-per-request table | On-Demand Metered | **Class C** | Not eligible for 25 RCU/WCU tier | None | $1.25/M write units<br>$0.25/M read units | **STOPPED / PROHIBITED** |

---

## 3. Immediate Stop Conditions & Enforced Alternatives

Under **Rule 4** of the policy:
> *"If a required service falls into B or C, STOP. Propose a genuinely free alternative or ask for approval to revise the requirement. Do not provision it automatically."*

### Stop Triggers Identified:
1. **Amazon S3 is Class B/C**: S3 Standard storage is limited to 12 months for new accounts and is not an "Always Free" service. In accounts older than 12 months, S3 incurs immediate per-GB storage and per-request fees.
2. **API Gateway is Class B/C**: API Gateway is limited to 12 months and incurs charges of $1.00 per million calls once the 12-month window expires.
3. **DynamoDB BillingMode: PAY_PER_REQUEST is Class C**: On-demand DynamoDB does not benefit from the 25 RCU / 25 WCU Always Free provisioned tier.

### Genuinely Free ("Class A Only") Alternatives:
1. **Default: Pure Local Mode (Zero AWS Footprint)**
   - Maintain client-side persistence in `localStorage` (`simxsphere:experiments`).
   - Use portable `.simxpack` single-package export/import and offline file sharing.
   - Cost: **$0.00 forever**.
2. **Class-A Serverless Cloud Architecture (Zero Cost Architecture)**
   - **Endpoint:** Replace API Gateway with **AWS Lambda Function URLs** (built-in, free of API Gateway surcharge; covered under Lambda's 1M free requests/month).
   - **Storage:** Replace Amazon S3 with **Amazon DynamoDB Provisioned Mode** (5 RCU, 5 WCU, 25 GB storage). Since `.simxpack` files are compact JSON structures (2–50 KB), storing them directly in DynamoDB items (up to 400 KB per item) completely removes the need for S3.
   - **Auth:** Keep Amazon Cognito User Pools (50,000 MAUs Always Free).
   - **Logging:** CloudWatch Logs with 7-day retention ($\le 100$ MB/mo, well below 5 GB free).
   - All components are strictly **Class A ("Always Free")**.

---

## 4. Application-Level Defenses & Guardrails

To prevent accidental resource exhaustion:
1. **Package Size Ceiling:** Hard 5 MiB ceiling on packages client-side (`MAX_SINGLE_PACKAGE_SIZE_BYTES = 5 * 1024 * 1024`).
2. **Rate Limiting:** Debounce export and API operations.
3. **Budget & Billing Alarms:** Configure an AWS Cost Budget with threshold at $0.01 and Free Tier Usage Alerts enabled in AWS Billing Console.
4. **Notice:** Application-level limits protect client performance and avoid quota spikes, but AWS billing alerts and account controls serve as the authoritative financial ceiling.

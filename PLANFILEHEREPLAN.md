# SimXSphere - Master Build and Deployment Plan

> REFERENCE DOCUMENT. Read this before every work session. Last Updated: 2026-10-19

---

## Table of Contents

1. Project Overview
2. What We Are Building
3. Technology Stack
4. Repository Structure (Target)
5. AWS Architecture and Free-Tier Design
6. Data Models
7. Build Milestones
8. AWS Deployment Plan (Milestone 7)
9. Free-Tier Cost Guard
10. Security Plan
11. Testing Strategy
12. Key Rules and Non-Goals
13. Reference Files Map

---

## 1. Project Overview

SimXSphere is an interactive simulation platform for running, saving, packaging, and sharing scientific experiments. It has two run modes:

| Mode | AWS Required? | When Ready |
|---|---|---|
| Local mode (default) | No | After Milestone 6 |
| Cloud mode | Yes (cost-gated) | After Milestone 7 |

Both modes use the same UI and the same StorageAdapter interface - only the adapter switches. The app works fully offline in local mode.

---

## 2. What We Are Building

### 2.1 Core Features (MVP)

| Feature | Description |
|---|---|
| Probability Simulation | Coin/dice rolls - seeded RNG (mulberry32), trial count, histogram, counts, proportions |
| Projectile Motion Simulation | Speed/angle/gravity, SVG trajectory chart, range, flight time, max height (no air resistance) |
| Save/Restore Experiments | Save simulation run to browser storage - reload restores exactly |
| Experiment Collections | Group 2-4 saved experiments into a named collection |
| SimXPack Export | Bundle collection into manifest.json + experiment JSONs + optional CSV into ZIP (DEFLATE lossless) with SHA-256 checksums |
| SimXPack Import | Full validation pipeline: size caps, path allowlist, zip-bomb guard, manifest check, hash verify, schema validate |
| Size Stats | Show original/compressed/saved bytes and percent on export |
| (Cloud) Sign In | Cognito User Pool login |
| (Cloud) Upload/List/Download/Delete | S3 + DynamoDB via Lambda presigned URL flow |

### 2.2 Explicit Non-Goals (Do NOT Add These)

- ML/AI features
- Social features (comments, likes, follows)
- General file sharing
- Extra simulations beyond the 2 MVP ones (future work)
- Public links / permanent share URLs
- Auto-deployment / CI-CD pipelines
- CloudFront, EC2, RDS, load balancers, WAF, NAT Gateway
- Services added only to inflate the AWS service count

---

## 3. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend Framework | Vite + React + TypeScript | Fast dev, type safety, good ecosystem |
| Testing (Unit/Integration) | Vitest + jsdom | Fast, same config as Vite |
| Testing (E2E/UI) | Playwright | Real browser UI automation |
| ZIP library | fflate (MIT) - verify license/API at M5 | Browser-friendly, DEFLATE support |
| Hashing | Web Crypto API (crypto.subtle.digest) | Built into the browser, zero extra deps |
| Charts | Hand-written SVG (no chart library) | No bundle cost, full control |
| PRNG | mulberry32 (custom prng.ts) | Tiny, deterministic, seeded |
| Linting | ESLint | Catch issues early |
| AWS IaC | AWS SAM / CloudFormation (infra/template.yaml) | One-command deploy and teardown |
| AWS Lambda runtime | Node.js current LTS - VERIFY at M7 | Same language as frontend |
| Environment config | .env.local (git-ignored) | Never commit AWS IDs or URLs |


---

## 4. Repository Structure (Target)

`
simxsphere/
+-- README.md
+-- package.json
+-- tsconfig.json
+-- vite.config.ts
+-- playwright.config.ts
+-- .gitignore                  <- node_modules, dist, .env*, *.pem, aws creds
+-- docs/                       <- all 16 spec documents + evidence/
|   +-- evidence/               <- test output, screenshots, timings (M8)
+-- src/
|   +-- main.tsx
|   +-- App.tsx
|   +-- core/
|   |   +-- simulations/
|   |   |   +-- prng.ts         <- mulberry32 PRNG
|   |   |   +-- probability.ts  <- pure sim + input validation
|   |   |   +-- projectile.ts   <- pure sim + input validation
|   |   +-- experiment/
|   |   |   +-- types.ts        <- TypeScript types for Experiment, Collection
|   |   |   +-- schema.ts       <- validators (schemaVersion check, field bounds)
|   |   |   +-- serialize.ts    <- canonical JSON (sorted keys, no whitespace)
|   |   +-- simxpack/
|   |       +-- zip.ts          <- wrapper around fflate (replaceable)
|   |       +-- checksum.ts     <- SHA-256 via Web Crypto
|   |       +-- validate.ts     <- full import validation pipeline
|   |       +-- export.ts       <- build ZIP from experiments
|   |       +-- import.ts       <- decompress + validate + return experiments
|   |       +-- stats.ts        <- compute size stats
|   |       +-- csv.ts          <- optional CSV generation
|   +-- storage/
|   |   +-- StorageAdapter.ts   <- ExperimentStore + PackageStore interfaces
|   |   +-- localAdapter.ts     <- localStorage / IndexedDB implementation
|   |   +-- awsAdapter.ts       <- (M7) calls API only, no secrets
|   +-- ui/
|       +-- pages/
|       |   +-- Home.tsx
|       |   +-- Probability.tsx
|       |   +-- Projectile.tsx
|       |   +-- Experiments.tsx
|       +-- components/
|           +-- Histogram.tsx
|           +-- TrajectoryChart.tsx
|           +-- ParamForm.tsx
|           +-- ExportPanel.tsx
|           +-- ImportPanel.tsx
+-- tests/
|   +-- unit/
|   +-- integration/
|   +-- e2e/
|   +-- fixtures/               <- valid + hostile ZIPs (committed, no secrets)
+-- infra/                      <- created ONLY at M7, never auto-run
    +-- template.yaml           <- SAM/CloudFormation IaC
    +-- lambda/
        +-- handler.ts          <- API logic
        +-- handler.test.ts     <- tests with mocked AWS SDK
`

### Layer Responsibility Rules

| Path | Rule |
|---|---|
| core/* | No React/DOM imports. Pure functions, unit-testable in isolation |
| storage/* | Only layer that knows where data lives |
| ui/* | Rendering and event wiring only - no simulation formulas |
| infra/* | Created ONLY after cost gate; never auto-deployed by agent |
| tests/fixtures | Small committed files; zero secrets |


---

## 5. AWS Architecture and Free-Tier Design

### 5.1 Architecture Overview

`
BROWSER SPA (React + TypeScript, runs locally)
+-- SimCore (pure fns)
+-- SimXPack (ZIP / Hash)
+-- StorageAdapter interface
      |
      +-- LOCAL MODE (default): localStorage / IndexedDB
      |
      +-- CLOUD MODE (VITE_STORAGE_MODE=aws):
            |
            v
        Amazon Cognito User Pool
            | JWT returned on sign-in
            v
        API Entry Point
        (HTTP API Gateway OR Lambda Function URL - choose ONE at cost gate)
            | verified JWT
            v
        AWS Lambda: simxsphere-api (Node.js, 128 MB, tiny router)
            |               |
            v               v
        DynamoDB        Presigned POST / GET URLs
        (metadata)               |
                                 v
                       S3 Private Bucket: packages/{sub}/{id}.zip
                       (Block Public Access ON, SSE-S3)

        CloudWatch Logs (3-7 day retention, no content logged)
`

### 5.2 AWS Services Used (Minimal Set)

| Service | Role | Free-Tier Note | Removal Path |
|---|---|---|---|
| Amazon Cognito User Pool | Identity: ownership via JWT sub | VERIFY: MAU limit, advanced security OFF | Delete pool |
| API Gateway HTTP API OR Lambda Function URL | HTTPS entry + JWT auth - choose ONE | VERIFY before using either | Delete API or disable function URL |
| AWS Lambda (simxsphere-api) | Issue presigned URLs, metadata, enforce ownership | VERIFY: 1M free req/mo, 400K GB-sec | Delete function |
| Amazon DynamoDB (1 table) | Package metadata without scanning S3 | VERIFY: on-demand mode, no backups | Delete table |
| Amazon S3 (1 private bucket) | Store the ZIP packages | VERIFY: 5 GB, requests, data-transfer-out | Empty then delete |
| Amazon CloudWatch Logs | Error-level logs only | VERIFY: set 3-7 day retention | Delete log group |
| AWS IAM (1 role + policy) | Least-privilege for Lambda | Free | Delete role |
| AWS CloudFormation / SAM | One-command deploy and teardown | VERIFY: no hooks/extensions | Delete stack |
| AWS Budgets | Email alert (NOT a spending cap) | VERIFY: 2 free budgets | Keep or delete |

### 5.3 Services Explicitly EXCLUDED - Never Add These

- EC2, ECS, Fargate
- RDS, Aurora
- NAT Gateway
- CloudFront (frontend is served locally, never hosted on AWS)
- Route 53 / custom domains
- WAF
- SQS / SNS / EventBridge / Step Functions
- S3 website hosting / public S3 objects
- DynamoDB backups / PITR / Global Tables
- CloudWatch custom dashboards / alarms (unless verified free)
- Elastic IPs
- AWS Amplify

### 5.4 Cloud Data Flow - Package Upload

`
Step 1: Browser builds ZIP in-browser (SimXPack) and computes SHA-256

Step 2: POST /packages {name, sizeBytes, sha256, experimentCount} + JWT
        -> Lambda validates -> writes PENDING item to DynamoDB
        -> Returns presigned POST URL (content-length-range <= 5MiB, expiry ~5 min)

Step 3: Browser uploads directly to S3 using the presigned POST fields

Step 4: POST /packages/{id}/complete
        -> Lambda does HeadObject (size check) -> sets status = READY
`

### 5.5 Cloud Data Flow - Package Download

`
Step 1: GET /packages/{id}/download-url + JWT
        -> Lambda checks item PK == USER#{sub}  (ownership enforced)
        -> Returns presigned GET URL (expiry ~5 min, single object)

Step 2: Browser downloads directly from S3 via the presigned URL
        (link expires; no permanent public links ever)
`

### 5.6 DynamoDB Schema

`
Table name:  simxsphere-packages
Key schema:  PK (String) + SK (String)

Item example:
{
  "PK": "USER#<cognito-sub>",
  "SK": "PKG#<packageId>",
  "name": "Week 3 runs",
  "createdAt": "2026-10-19T10:00:00Z",
  "sizeBytes": 4210,
  "sha256": "<hex>",
  "experimentCount": 3,
  "status": "READY",
  "s3Key": "packages/<sub>/<packageId>.zip"
}

Access pattern: Query  PK = USER#<sub>  AND begins_with(SK, "PKG#")
                -> No table scans, no GSI needed
`

### 5.7 S3 Bucket Configuration

| Setting | Value |
|---|---|
| Block Public Access | ALL FOUR settings ON |
| Default encryption | SSE-S3 |
| Versioning | OFF (avoids hidden storage costs) |
| Lifecycle rule | Expire objects after N days (set at deploy time) |
| CORS | http://localhost:5173 and http://localhost:4173 only |
| Bucket policy | No public principals; no s3:GetObject for * |
| Website hosting | DISABLED |

### 5.8 API Contract

| Method + Path | Request Body | Response |
|---|---|---|
| POST /packages | {name, sizeBytes, sha256, experimentCount} | {packageId, upload:{url, fields}} |
| POST /packages/{id}/complete | none | {status:"READY"} |
| GET /packages | none | Array of PackageMeta |
| GET /packages/{id}/download-url | none | {url, expiresInSeconds} |
| DELETE /packages/{id} | none | 204 No Content |

### 5.9 Lambda IAM Policy (Least Privilege)

No wildcard (*) actions. No s3:ListBucket on the whole bucket (listing uses DynamoDB only).

S3 actions: s3:PutObject, s3:GetObject, s3:DeleteObject, s3:HeadObject
  Resource: arn:aws:s3:::BUCKET_NAME/packages/*

DynamoDB actions: dynamodb:PutItem, dynamodb:GetItem, dynamodb:Query,
                  dynamodb:UpdateItem, dynamodb:DeleteItem
  Resource: arn:aws:dynamodb:REGION:ACCOUNT_ID:table/simxsphere-packages

CloudWatch actions: logs:CreateLogStream, logs:PutLogEvents
  Resource: arn:aws:logs:REGION:ACCOUNT_ID:log-group:/aws/lambda/simxsphere-api:*

### 5.10 IaC Template Scope (infra/template.yaml)

The SAM template defines ONLY these resource types - nothing else:

1. AWS::S3::Bucket - Block Public Access, SSE-S3, lifecycle, CORS
2. AWS::DynamoDB::Table - PK+SK key, on-demand capacity, no backups/PITR
3. AWS::Lambda::Function - Node.js runtime, 128 MB memory, short timeout
4. AWS::IAM::Role + inline policy - least-privilege per section 5.9
5. AWS::Cognito::UserPool + UserPoolClient - no client secret, no advanced security
6. API entry - AWS::ApiGatewayV2::Api (HTTP API + JWT authorizer) OR Lambda Function URL - NOT BOTH
7. AWS::Logs::LogGroup - retention 3 days


---

## 6. Data Models

### 6.1 Experiment Schema (schemaVersion: 1)

Fields:
  schemaVersion: 1 (must be exactly 1; others rejected)
  id: string (UUID v4)
  type: "probability" or "projectile"
  title: string (1-80 chars)
  description: string (0-500 chars)
  createdAt: string (ISO-8601 UTC)
  appVersion: string (e.g. "0.1.0")
  parameters: ProbabilityParams or ProjectileParams
  results: ProbabilityResults or ProjectileResults
  metadata.notes: string (optional, <= 500 chars)
  metadata.importedFromId: string (optional, set on import-as-copy)

Probability params: { kind: "coin"|"die", sides: 2|4..20, trials: 1..1000000, seed: 0..4294967295 }
Projectile params:  { initialSpeed: (0,500], angleDeg: [0,90], gravity: [0.1,30] }

### 6.2 Canonical JSON Rule

- Object keys sorted recursively
- No insignificant whitespace
- Arrays keep original order
- Implemented in serialize.ts
- Never store NaN or Infinity
- Two experiments are equal iff their canonical JSON strings are identical

### 6.3 SimXPack Layout

`
collection-name.simxpack.zip
+-- manifest.json           <- required; all files listed with sha256 + size
+-- experiments/
|   +-- exp-1-<slug>.json   <- canonical experiment JSON
|   +-- exp-2-<slug>.json
+-- csv/                    <- optional
|   +-- exp-1-<slug>.csv
+-- README.txt              <- optional, human-readable
`

Manifest fields: format, formatVersion:1, createdAt, appVersion,
  collection:{id, name, description},
  experiments:[{id, type, path}],
  files:[{path, sizeBytes, sha256}],
  totals:{fileCount, uncompressedBytes}

---

## 7. Build Milestones

### Build Order Overview

M1 -> M2 -> M3 -> M4 -> M5 -> M6 -> [Cost Gate] -> M7a -> M7b(manual) -> M7c -> M7d -> M8
 |     |     |     |     |     |                      |
Repo  Prob  Proj  Save  ZIP   E2E                  AWS IaC + Deploy
      Sim   Sim   Load  Pack  Polish

---

### Milestone 1 - Repository Setup and UI Shell

Goal: Working project skeleton, routes, empty pages, all CI commands pass.

Tasks:
- Init Vite + React + TypeScript project
- Configure ESLint, Vitest, Playwright
- Create folder structure per section 4
- Pages (layout-only shells): Home, Probability, Projectile, Experiments
- Simple navigation component
- .gitignore: node_modules, dist, .env*, *.pem, aws-creds*
- One trivial passing unit test
- One Playwright test: Home shows exactly 2 simulations

Gate (ALL must pass):
  npm install
  npm run dev       <- http://localhost:5173, no console errors
  npm test          <- all green
  npm run test:e2e  <- Playwright green
  npm run lint      <- no errors
  npm run build     <- dist/ produced without errors

---

### Milestone 2 - Probability Simulation

Goal: Seeded coin/dice simulation with full test suite and working UI page.

Tasks:
- src/core/simulations/prng.ts - mulberry32(seed) PRNG
- src/core/simulations/probability.ts - validation + simulation engine
  - Inputs: kind, sides, trials, seed (bounds from SIMULATIONS.md)
  - Outputs: counts array, total, proportions array, maxDeviation
  - Edge cases: trials=1, trials=max, NaN, negative, sides out of range
- Unit tests P1-P7 in Vitest
- UI: Probability page with inputs, Run, Reset, inline errors, table, SVG histogram

Gate:
  npm test -- probability   <- P1-P7 green
  npm run test:e2e          <- E2, E3 green (same seed = same counts; 0-trials = error)

---

### Milestone 3 - Projectile Motion Simulation

Goal: Physics sim with SVG trajectory chart and full test suite.

Tasks:
- src/core/simulations/projectile.ts - validation + formulas + 101 trajectory points
  - T = 2*v0*sin(theta)/g
  - R = v0^2 * sin(2*theta)/g
  - H = (v0*sin(theta))^2 / (2*g)
  - 101 samples: t=T*i/100, x=v0*cos(theta)*t, y=v0*sin(theta)*t - 0.5*g*t^2
  - Clamp values where |value| < 1e-9 to 0; last y = exactly 0
  - theta=0 => T=R=H=0, show "no flight" message on UI
- Unit tests J1-J9 (tolerances from SIMULATIONS.md)
- UI: gravity presets (Earth 9.81, Moon 1.62, Mars 3.71), SVG chart with axes/units,
  results table, note "Idealized - no air resistance"

Gate:
  npm test -- projectile   <- J1-J9 green; theta=0 and theta=90 no NaN
  npm run test:e2e         <- E4 green (range ~40.77 m visible)

---

### Milestone 4 - Local Save and Restore

Goal: Experiments persist across browser reloads; schema validation enforced everywhere.

Tasks:
- src/core/experiment/types.ts - TypeScript interfaces
- src/core/experiment/schema.ts - validators (reject schemaVersion != 1, unknown fields, bad bounds)
- src/core/experiment/serialize.ts - canonical JSON function
- src/storage/StorageAdapter.ts - ExperimentStore interface
- src/storage/localAdapter.ts - localStorage / IndexedDB implementation
- "Save experiment" dialog on both simulation pages (title + optional description)
- Experiments page: list all saved, open (restores params + results), delete

Tests to pass: U-S1 through U-S4, U-L1

Gate:
  npm test          <- U-S1..S4, U-L1 green
  npm run test:e2e  <- E5 green (save -> reload -> still there; open -> params restored)

---

### Milestone 5 - SimXPack Export and Import

Goal: Full ZIP packaging with every validation, security check, and hostile-archive rejection.

Tasks:
- Choose ZIP library: compare fflate vs JSZip -> record decision in SIMXPACK_SPEC.md section 8
- src/core/simxpack/zip.ts - replaceable wrapper
- src/core/simxpack/checksum.ts - SHA-256 via crypto.subtle.digest
- src/core/simxpack/validate.ts - full 10-step pipeline from SIMXPACK_SPEC.md section 6
- src/core/simxpack/export.ts - build + sign + zip
- src/core/simxpack/import.ts - decompress + validate + return
- src/core/simxpack/stats.ts - original, compressed, saved, percent
- src/core/simxpack/csv.ts - optional CSV generation
- Generate test fixtures: valid ZIPs + hostile ZIPs (zip-slip, bomb, bad ext, bad hash)
- UI: ExportPanel (select 2-4, name collection, export, show stats)
      ImportPanel (file pick, error display, conflict choice: skip/overwrite/copy)

Tests: X1-X14, S1-S9, U-C1, E6-E8

Gate:
  npm test          <- X1-X14 all green; hostile archives rejected
  npm run test:e2e  <- E6-E8 green

---

### Milestone 6 - End-to-End UI Polish

Goal: Consistent UX, no dead buttons, responsive, accessible.

Tasks:
- Consistent layout (header, nav, footer)
- Empty states for all lists
- Error states (inline + toast)
- Loading states for async ops
- Keyboard focus + ARIA labels on all interactive elements
- Responsive at 375px (phone) and 1280px (desktop)
- Verify no console errors during any workflow
- Run full manual checklist from TEST_PLAN.md section 6

Gate:
  npm run test:e2e  <- E1-E10 green
  Manual: every button works; no console errors; offline works

---

### Milestone 7 - AWS Cloud Mode

READ FIRST: Only begin after the Cost Gate (section 9) is signed off in writing.

#### 7a - Cloud Design in Code (NO Deployment)

Tasks:
- infra/template.yaml - SAM/CloudFormation defining ONLY resources from section 5.10
- infra/lambda/handler.ts - implement all 5 API endpoints from section 5.8
  - ALWAYS derive userSub from the verified JWT sub; NEVER trust client-supplied user IDs
  - Presigned POST: include content-length-range condition, ~5 min expiry
  - Presigned GET: ~5 min expiry, single object
  - Logs: request ID, status, sizes, error codes - NEVER log tokens, presigned URLs, or content
- src/storage/awsAdapter.ts - calls the API only (no AWS SDK in frontend)
- Mock tests C1-C5 (mocked AWS SDK clients, no real network calls)
- Validate template syntax offline: sam validate

Gate:
  npm test -- cloud    <- C1-C5 green with no real AWS calls
  sam validate         <- template syntax clean
  local mode works with VITE_STORAGE_MODE unset

#### 7b - Cost Gate (Student does this manually, not the AI agent)

1. Check AWS account: creation date, plan (Free/Paid/Legacy), credits remaining
2. Open Billing -> Free Tier; take screenshot of remaining limits
3. For each service in section 5.2: check official pricing page, confirm free for your account/plan/region, record date
4. Create a zero-spend budget with email alert in AWS Budgets
5. Enable Free Tier usage alerts
6. Create non-root IAM deployer; enable MFA on root account
7. Sign the checklist in AWS_FREE_COST_CHECKLIST.md sections 1-5

#### 7c - Deploy (only after 7b is signed)

  sam build
  sam deploy --guided   <- stack name: simxsphere-dev; review change set before confirming

- Copy stack outputs (API URL, User Pool ID, Client ID, Bucket name) to .env.local
- Set VITE_STORAGE_MODE=aws in .env.local
- Smoke test: sign up -> upload -> list -> download -> wait for expiry -> delete -> verify S3 + DynamoDB item gone
- Fill resource inventory in AWS_FREE_COST_CHECKLIST.md section 6

#### 7d - Teardown Rehearsal

  Step 1: Empty the S3 bucket (console or CLI)
  Step 2: aws cloudformation delete-stack --stack-name simxsphere-dev
  Step 3: Wait for DELETE_COMPLETE status
  Step 4: Console check: no bucket, table, function, user pool, log group, role remaining
  Step 5: Check Billing next day AND after 1 week

---

### Milestone 8 - Security, Regression and Evidence

Goal: All tests green, security tests pass, evidence folder complete, demo rehearsed.

Tasks:
- Implement all missing security tests S1-S14 (cloud ones only if deployed)
- Run full test suite and save output
- Populate docs/evidence/ with:
  - Test run output (text file)
  - Coverage summary
  - Size table: packs of 2, 3, 4 experiments with and without CSV
  - Export/import timings: performance.now(), median of 10 runs
  - Screenshots of each workflow
  - If cloud deployed: console screenshots, budget alert, teardown confirmation
- Secret scan on repo (grep for AKIA, aws_secret, Bearer, private keys)
- Rehearse 8-10 min demo script from ACADEMIC_REPORT_AND_DEMO.md section 3

Gate:
  npm test          <- all green
  npm run test:e2e  <- all green
  npm run build     <- clean build
  No secrets found in repo scan
  docs/evidence/ folder fully populated


---

## 8. AWS Deployment Plan (Milestone 7)

### 8.1 Step-by-Step Deploy Sequence

Step  1: Verify AWS account free eligibility (section 7b above)
Step  2: Create non-root IAM deployer user with MFA enabled
Step  3: Configure AWS CLI with deployer credentials (not root)
Step  4: Install AWS SAM CLI; verify supported Node.js runtimes on AWS docs
Step  5: sam validate -> confirm template syntax ONLY, no resources created
Step  6: sam build
Step  7: sam deploy --guided --no-execute-changeset -> review change set carefully
Step  8: Confirm and execute: sam deploy --guided
Step  9: Copy stack outputs to .env.local (NEVER commit this file)
Step 10: Run smoke test (sign up, upload, list, download, expire, delete, verify clean)
Step 11: Fill resource inventory in AWS_FREE_COST_CHECKLIST.md section 6
Step 12: Check Billing console for unexpected charges
Step 13: After demo -> run Teardown (section 7d above)

### 8.2 Environment Variables (all in .env.local, NEVER committed to Git)

| Variable | Example | Notes |
|---|---|---|
| VITE_STORAGE_MODE | aws | Unset = local mode (safe default) |
| VITE_API_URL | https://abc123.execute-api.us-east-1.amazonaws.com | From stack outputs |
| VITE_USER_POOL_ID | us-east-1_XXXXXXXX | From stack outputs |
| VITE_USER_POOL_CLIENT_ID | xxxxxxxxxxxxxxxxxx | From stack outputs |

### 8.3 Rollback Procedure

| Scenario | Action |
|---|---|
| Deploy failed mid-way | CloudFormation auto-rolls-back; check Events tab |
| Stack stuck in ROLLBACK_FAILED | Manually delete stuck resources, then delete stack |
| App breaks after deploy | Unset VITE_STORAGE_MODE, rebuild; local mode always works |
| Need to re-deploy | Fix template -> sam build -> sam deploy |

---

## 9. Free-Tier Cost Guard

### 9.1 Account Verification Checklist (Sign before M7b)

- [ ] Account creation date and plan (Free / Paid / Legacy) recorded with screenshot
- [ ] Free Tier / Credits console checked and screenshot saved
- [ ] Single region chosen and fixed for all resources
- [ ] Every service in section 5.2 verified on official AWS pricing page for this account
- [ ] Zero-spend budget alert created and tested (notification ONLY, not a spending cap)
- [ ] Free Tier usage alerts enabled
- [ ] Non-root IAM deployer created; MFA on root account enabled
- [ ] Verified no existing resources already incurring cost

### 9.2 Per-Service Free-Tier Guide (MUST VERIFY FOR YOUR ACCOUNT)

| Service | Typical Free Allowance to Verify | Risk Level |
|---|---|---|
| Lambda | 1M requests/mo, 400K GB-sec/mo | LOW for demo scale |
| DynamoDB | 25 GB storage, on-demand per-request pricing | LOW |
| S3 | 5 GB storage, 20K GET, 2K PUT | LOW - delete test data promptly |
| Cognito | MAU-based allowance (verify current limit) | LOW for single user |
| API Gateway HTTP API | 1M calls/mo first 12 months of account | VERIFY account age |
| Lambda Function URL | Included with Lambda pricing | LOWER risk if API GW not eligible |
| CloudWatch Logs | 5 GB ingestion/mo | LOW - use short retention |
| CloudFormation | Free with no hooks/extensions | VERY LOW |
| IAM | Always free | None |

WARNING: Accounts created after 15 July 2025 may be on the "Free Plan" with
- credits that expire after 6 months or when credits run out.
Credits being used does NOT mean the service is permanently free.
Always verify on https://aws.amazon.com/free/

### 9.3 During and After Demo Checklist

- [ ] Upload only test data (small ZIPs, not real data)
- [ ] Delete all uploaded packages after demo
- [ ] Check S3 bucket is empty after demo
- [ ] Run full teardown (section 7d) within days of submission
- [ ] Check Billing console the next day AND again after 1 week

---

## 10. Security Plan

### 10.1 Threat Model

| Asset | Threat | Control |
|---|---|---|
| Experiment data | Tampering / corruption | Schema validation, SHA-256 in manifest |
| User machine | Malicious ZIP (zip-slip, bomb, oversized) | Path allowlist regex, running byte counter, size caps |
| App | XSS via imported titles/descriptions | React text rendering only; never dangerouslySetInnerHTML; length limits |
| App | Code injection via import | Never eval; never execute imported code; JSON parsing only |
| Cloud data | Unauthorized access | Cognito JWT; sub-scoped S3 keys and DynamoDB PK; private bucket |
| Credentials | Leakage into repo | No keys in code or repo; .gitignore for env files; secret scan at M8 |
| Cost | Abuse / request loops | Size limits, short-lived URLs, budgets, small per-user quotas |

### 10.2 ZIP Import Security Rules (enforce in this exact order)

1. File size <= 5 MiB compressed - checked BEFORE reading any content
2. Valid ZIP: central directory must parse without error
3. Entry count <= 20; no duplicate paths (case-insensitive)
4. Every path matches allowlist regex - reject .., leading /, backslashes, drive letters, null bytes, symlinks
5. Declared uncompressed size per entry <= 2 MiB; total <= 5 MiB; ratio per entry <= 100:1
6. Decompress with a running byte counter that aborts when limits exceeded (declared sizes can be forged)
7. manifest.json exists, is valid JSON, format=="simxpack", formatVersion==1
8. Every file in ZIP listed in manifest AND every manifest file exists in ZIP; sizes and SHA-256 match
9. Each experiment JSON parses, has schemaVersion:1, passes shape and parameter bounds validation
10. Return experiments to caller only now; UI handles conflicts (skip / overwrite / copy with new ID)

### 10.3 Cloud Security Rules

- Lambda derives userSub ONLY from the verified Cognito JWT; ignores any client-supplied user IDs
- S3 key format: packages/{sub}/{packageId}.zip - Lambda constructs this; bucket is private
- Presigned POST includes content-length-range condition enforced by S3
- Presigned GET expires in ~5 minutes; no permanent public links ever
- Never log presigned URLs, JWT tokens, or experiment file content
- CORS limited to localhost:5173 and localhost:4173 only
- No root access keys ever created; deployer account has MFA

---

## 11. Testing Strategy

### 11.1 Testing Pyramid

`
       E2E Playwright:  E1-E10 user workflows
  -----------------------------------------------
  Integration Vitest:
  X1-X14 SimXPack, C1-C5 Cloud adapter (mocked)
  -----------------------------------------------
  Unit Vitest:
  P1-P7 probability, J1-J9 projectile,
  U-S1..S4 serialize, U-C1 SHA256, U-L1 adapter
`

### 11.2 Test ID Quick Reference

| Group | IDs | Area |
|---|---|---|
| P1-P7 | Probability | seeded repeatability, sums, proportions, validation errors |
| J1-J9 | Projectile | test vectors (1e-4 tolerance), edge cases theta=0/90, validation |
| U-S1 to U-S4 | Serialization | canonical JSON, unknown fields, schema version |
| U-C1 | Checksum | SHA-256 known-answer test ("abc" -> known hex) |
| U-L1 | Local adapter | save / get / list / remove |
| U-V1 | Validation | each invalid input returns error with field name |
| X1-X14 | SimXPack integration | round-trip, stats, hostile archives |
| S1-S9 | Security import | zip-slip, bomb, bad extension, hash mismatch, XSS title |
| C1-C5 | Cloud adapter mocked | upload flow, ownership, delete, oversize |
| E1-E10 | Playwright UI | all user-facing workflows end-to-end |
| S10-S14 | Cloud security | cross-user access, expired JWT, oversize upload, anon S3, secret scan |

### 11.3 Test Commands

  npm test                   <- all unit + integration (Vitest)
  npm test -- probability    <- filter: probability tests only
  npm test -- projectile     <- filter: projectile tests only
  npm test -- simxpack       <- filter: SimXPack integration tests
  npm test -- cloud          <- filter: cloud adapter tests (mocked, no AWS calls)
  npm run test:e2e           <- Playwright end-to-end suite
  npm run test:coverage      <- optional coverage report

---

## 12. Key Rules and Non-Goals

### Rules - Apply at Every Milestone

1. One milestone at a time. Gate must pass before starting the next.
2. No scaffolding for future modules. Only implement what the current milestone needs.
3. No new dependency without a written reason recorded in the repo.
4. No AWS service without a row in AWS_FREE_COST_CHECKLIST.md.
5. No secrets in code, repo, or frontend. Env files are always in .gitignore.
6. Preserve all working code. Never break a currently-passing test.
7. Local mode must always work, even if cloud mode is configured but broken.
8. core/* has no React/DOM imports. Must be testable with plain Node.js.

### Scope Fence - What NOT to Build

- ML / AI / generative features
- Social features (comments, reactions, sharing feeds)
- General-purpose file upload (only SimXPack ZIPs)
- More than 2 simulations in MVP (probability + projectile only)
- Public share links (cloud = private presigned only, short-lived)
- Auto-deployment or GitHub Actions CI/CD
- CloudFront hosting (frontend stays local in all modes)
- Any service from the excluded list in section 5.3

---

## 13. Reference Files Map

| File | What It Specifies |
|---|---|
| files/README.md | Project overview, two modes, MVP features, quick start |
| files/ARCHITECTURE.md | Full local + AWS architecture, data flows, storage interface |
| files/PROJECT_PLAN.md | Milestones, objectives, risks, scope control rules |
| files/SIMULATIONS.md | Exact formulas, bounds, test vectors for both simulations |
| files/EXPERIMENT_SCHEMA.md | Versioned experiment JSON schema, canonical form |
| files/SIMXPACK_SPEC.md | ZIP layout, manifest, export steps, all 10 import validation rules |
| files/AWS_FREE_COST_CHECKLIST.md | Per-service cost verification, resource inventory, teardown |
| files/SECURITY.md | Threat model, IAM policy, import hardening, test IDs S1-S14 |
| files/TEST_PLAN.md | Full test table, how to run each group, evidence requirements |
| files/IMPLEMENTATION_WORKFLOW.md | Step-by-step build order with gates |
| files/DEPLOYMENT_GUIDE.md | Local preview, AWS deploy steps, rollback, cleanup |
| files/REPOSITORY_STRUCTURE.md | Folder tree and layer rules |
| files/AI_AGENT_PROMPTS.md | One prompt per milestone for use with coding agents |
| files/ACADEMIC_REPORT_AND_DEMO.md | Report outline, evaluation metrics, 8-10 min demo script |
| files/VIVA_QUESTIONS.md | Q&A for likely viva/defense questions with full answers |
| files/PROJECT_WORKFLOW.md | OmniLab component build sequence, phase gates, fallback strategy |

---

## Appendix A - SimXSphere Quick Cheat Sheet

PROJECT NAME  : SimXSphere
STACK         : Vite + React + TypeScript + Vitest + Playwright
SIMULATIONS   : 1) Coin/Dice Probability (seeded mulberry32 PRNG)
                2) Projectile Motion (no air resistance, SVG chart)
PACKAGING     : SimXPack = ZIP (DEFLATE) + manifest.json + SHA-256 checksums
STORAGE LOCAL : localStorage/IndexedDB
STORAGE CLOUD : S3 + DynamoDB (metadata) via Lambda presigned URLs
AUTH (cloud)  : Amazon Cognito User Pool
API (cloud)   : AWS Lambda (Node.js) + HTTP API Gateway OR Lambda Function URL
IaC           : AWS SAM (infra/template.yaml)
AWS EXCLUDED  : EC2, RDS, CloudFront, NAT GW, Route 53, WAF, SQS, SNS, ECS, Amplify
FREE RULE     : Default = NO AWS resources created.
                Deploy ONLY after cost gate signed off in writing.
LOCAL MODE    : Always works. Cloud is an opt-in storage adapter swap.

---

## Appendix B - AWS Resource Inventory (fill in at M7 deploy)

| Resource Type | Name | Region | Created Date | Deleted? |
|---|---|---|---|---|
| CloudFormation stack | simxsphere-dev | | | |
| S3 bucket | simxsphere-packages-{suffix} | | | |
| DynamoDB table | simxsphere-packages | | | |
| Lambda function | simxsphere-api | | | |
| Cognito User Pool | simxsphere-users | | | |
| API Gateway / Function URL | | | | |
| CloudWatch Log Group | /aws/lambda/simxsphere-api | | | |
| IAM Role | simxsphere-api-role | | | |

---

This file is the single source of truth for build planning.
Update it if the plan changes. Reference it before every work session
and before asking an AI agent to implement any milestone.

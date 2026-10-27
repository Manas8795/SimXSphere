# SimXSphere — SimXPack: Compression, Experiment Sharing & AWS Setup Specification

Repository: https://github.com/Manas8795/SimXSphere

## Goal

Build a secure, polished experiment packaging feature integrated into SimXSphere: select experiments from Chemistry, Probability, and Projectile Motion; package them into a `.simxpack`; inspect, compress, export, import, and optionally back them up or share them through AWS.

**Hard constraints:** preserve local-first/offline behavior; keep `VITE_STORAGE_MODE=local` as the default; do not deploy AWS resources until every resource's Free Tier eligibility and projected usage are verified and the user approves the change set.

## 1. Read-only discovery first

Inspect the actual current checkout before editing:
- `README.md`, `package.json`, `.env.example`
- `src/storage/StorageAdapter.ts`, `src/storage/awsAdapter.ts`, local adapter and mode selection
- `src/core/experiment/types.ts`, `src/core/experiment/validate.ts`
- `src/core/simxpack/`, `src/core/crypto/`
- Existing compression/archive/unpacking utilities and security tests
- Navigation/UI patterns, experiment persistence, and cloud tests

Report branch, current commit, Git status, package scripts, relevant code, and existing AWS resources. Do not assume old documentation is current.

Known context to re-verify:
- The app is React + TypeScript + Vite and must remain usable offline.
- `.simxpack` packaging, validation, checksum, and overwrite-protection code may already exist. Reuse it; do not create an incompatible second format.
- The existing AWS adapter has expected endpoints: `POST /packages` returns `{ uploadUrl }`; `POST /packages/{id}/complete`; `GET /packages`; `GET /packages/{id}/download-url` returns `{ downloadUrl }`; `DELETE /packages/{id}`. Verify the current contracts before implementing.
- Individual experiment cloud sync has previously been a no-op/stub. Do not claim it is supported unless it is actually implemented and tested.

## 2. Feature requirements

### Package Builder
- Add a “SimXPack” or “Packages” workspace following existing UI patterns.
- List locally stored experiments, with available filters (module, name, date/type).
- Select one or multiple experiments; show selection count and package preview.
- Enter package name and optional description.
- Build and download a `.simxpack`.
- Handle empty state, validation errors, and success/failure states.

### Compression Analyzer
Show actual measured:
- Original payload size and compressed archive size.
- Bytes saved and percentage saved: `(originalBytes - compressedBytes) / originalBytes * 100`.
- Experiment count and compression method.
- If compression increases size, report that honestly. Handle zero-byte edge cases without divide-by-zero.

### Package Inspector
Before import, show safe metadata, schema version, creation timestamp if present, experiment count/module breakdown, sizes, checksum status, and validation warnings. Render all archive strings as text. Never execute scripts, HTML, or other content from an archive.

### Safe local import/export
- Export `.simxpack` through the browser.
- Import a user-selected file.
- Stage the workflow: read file → archive safety checks → parse → schema validation → checksum verification → duplicate/overwrite decision → commit.
- Do not partially import on failure.
- Preserve overwrite protection and make cancellation non-destructive.
- All local workflows must work offline with AWS settings absent.

### Sharing
- Local-only mode can export a file for the user to share through their own channel. Do not imply the app hosts a link when it does not.
- Optional cloud sharing/backup may be added only after the AWS Free Tier gate passes.
- Initial cloud sharing should be private and authenticated. Do not make S3 objects public or implement “anyone with link” sharing without separate approval and a designed expiry/access model.

## 3. Package safety and integrity

Reuse the existing `.simxpack` format and checksum contract. Do not invent a second incompatible schema.

- Require and verify the existing mandatory SHA-256 checksum and canonicalization rules.
- Validate schema version and all experiment data using existing validators.
- Limit compressed bytes, uncompressed bytes, entry count, nesting depth, and individual entry size.
- Defend against ZIP bombs, path traversal (`../`, absolute paths, drive prefixes), duplicate paths, unexpected entry types, malformed archives, and oversized metadata.
- Never extract directly to arbitrary filesystem paths or execute package contents.
- Reject malformed or contradictory metadata. Do not silently discard unsupported experiment data.
- Validate IDs according to the actual documented format; if code claims UUID validation but only checks non-empty strings, correct it and add tests.
- Ensure invalid packages cannot partially modify local storage.
- A checksum verifies content against a digest; it does not prove author identity or scientific validity.

## 4. Optional AWS architecture

Proposed architecture:

`SimXSphere frontend → Cognito → API Gateway HTTP API (JWT authorizer) → Lambda → DynamoDB metadata + private S3 objects`

### Resources
1. **Cognito User Pool** with a public SPA app client and no client secret. Use authorization code + PKCE. Confirm whether the API requires ID or access tokens; do not assume they are interchangeable.
2. **API Gateway HTTP API** with JWT authorizer and CORS restricted to actual frontend origins.
3. **Lambda** handlers for package initiation, completion, list, download URL, and deletion. Keep archive bytes out of Lambda; upload/download directly to S3 with short-lived presigned URLs.
4. **DynamoDB** package metadata with a user-scoped key design, such as partition key `userSub` and sort key `packageId`, adapted to actual queries.
5. **S3** private bucket with Block Public Access, ACLs disabled, default encryption, TLS enforcement, and backend-generated object keys.
6. **AWS SAM/CloudFormation** templates, least-privilege IAM, tags, basic log retention, and non-secret outputs.

### Endpoint contract (verify current adapter before implementing)

| Method | Route | Purpose |
|---|---|---|
| POST | `/packages` | Validate metadata, create pending record, return presigned upload URL |
| POST | `/packages/{id}/complete` | Verify uploaded object and mark complete |
| GET | `/packages` | List only authenticated user's completed packages |
| GET | `/packages/{id}/download-url` | Verify ownership and return short-lived download URL |
| DELETE | `/packages/{id}` | Verify ownership and delete/mark package and object consistently |

Document request/response shapes, errors, and retry/idempotency. Never trust client-supplied owner IDs. Every route must enforce ownership using verified JWT claims. Do not allow one user to overwrite another user's object by reusing a package ID.

## 5. Strict Free Tier gate

The user requires all AWS resources to stay within the account's verified Free Tier allowances. This is a hard gate.

Before provisioning:
1. Verify the actual account plan, eligibility, account age, region, applicable offer, allowance quantities, expiry, current usage, and pricing in the AWS Billing/Free Tier console and current official documentation.
2. Classify every proposed resource:
   - **A:** verified ongoing free allowance and projected usage stays within it.
   - **B:** temporarily free or covered only by promotional credits.
   - **C:** paid, ineligible, or uncertain.
3. Only A resources may be considered for deployment, and only after the user reviews projected usage and approves the change set.
4. If a required service is B/C or its status cannot be verified, stop and propose a no-AWS alternative or ask the user to revise the scope. Do not deploy automatically.
5. Never assume that “Free Tier active” means all usage is free. Do not promise zero cost.

Avoid EC2, NAT Gateway, RDS, paid domains/CDN, paid observability, unnecessary KMS keys, and services not strictly needed. These are exclusions unless a verified requirement and explicit approval justify them.

### Usage controls
- Configure available Free Tier usage alerts and a conservative AWS Budget with email thresholds where supported.
- Explain that alerts may be delayed and are not a guaranteed hard spending cap.
- Add application-level archive size, per-user package count, and upload-frequency limits.
- Monitor relevant S3 storage/requests/transfer, API requests, Lambda usage, DynamoDB requests/storage, Cognito MAU, and logs.
- Keep logs minimal with short retention.
- Produce a per-resource table before deployment: resource, region, applicable offer, allowance, expected usage, charge triggers, expiration, and verification source.
- Do not create duplicate resources when retrying. Inspect stack/resource state first.

## 6. Credentials and IAM

- Never ask the user to paste access keys, secret keys, session tokens, passwords, or MFA codes into chat, source, or prompts.
- Prefer temporary credentials through an existing AWS CLI profile/IAM Identity Center SSO.
- Verify the active identity with `aws sts get-caller-identity`, reporting only account ID and principal.
- Never use root credentials or request blanket `AdministratorAccess`.
- If permissions are missing, stop and list exact actions/resources needed with a least-privilege proposal.
- Never put AWS secrets in `VITE_*` variables; these are browser-visible.
- `.env.local` may contain only public values such as region, Cognito User Pool ID, public client ID, and API URL.
- Keep `.env.local` ignored by Git. Scan tracked files and build output for accidental secrets.
- Never create, modify, deploy, or delete AWS resources without explicit approval.

## 7. Frontend UX

Provide:
- Local/cloud package distinction.
- Package list and empty state.
- Build package flow with selection count and validation.
- Compression results with actual byte sizes and percentage.
- Package inspector and import preview.
- Clear validation errors and duplicate/overwrite confirmation.
- Upload progress/cancellation where supported.
- Authentication/configuration error states.
- Privacy/access indicator for cloud packages.
- Confirmation before deletion.
- Accessible keyboard controls and responsive layout.

Do not rewrite unrelated simulation engines or UI.

## 8. Environment configuration

Keep `.env.example` safe. Public frontend config may look like:

```dotenv
VITE_STORAGE_MODE=local
VITE_AWS_REGION=
VITE_COGNITO_USER_POOL_ID=
VITE_COGNITO_CLIENT_ID=
VITE_API_GATEWAY_URL=
```

These are public identifiers/URLs, not secrets. Never add AWS keys, Cognito client secrets, or backend secrets. If AWS values are absent, local mode must work. Cloud mode must fail clearly if required configuration is missing.

## 9. Test plan

### Local tests
- Single/multiple experiment package creation.
- Accurate original/compressed sizes and percentage.
- Export/import round trip.
- Missing/malformed/mismatched checksum.
- Unsupported schema and malformed archive.
- ZIP-bomb limits, traversal, absolute paths, duplicate paths, entry count/depth limits.
- Invalid nested experiment fields.
- Duplicate IDs and overwrite cancellation.
- No partial import on failure.
- Offline operation with no AWS config.
- Compression may increase size and must be reported accurately.
- Unicode names, empty descriptions, boundary sizes.

### Cloud tests
- Missing/invalid/expired JWT.
- User A cannot list, download, overwrite, or delete User B's package.
- Upload initialization/completion.
- Missing S3 object and size/checksum mismatch.
- Expired presigned URL and repeated completion.
- Invalid IDs/metadata, size and frequency limits.
- S3 public access blocked.
- No secrets/tokens/presigned URLs in logs.
- Cloud configuration failure does not break local mode.

Run actual test, lint, and build scripts defined by `package.json`. Run `sam validate` and `sam build` if infrastructure is added. Report actual results; do not claim unrun tests passed.

## 10. Deployment phases and approvals

### Phase A — Read-only discovery
Inspect repository, AWS CLI/SAM availability, active identity, region, existing stacks, Free Tier eligibility, and current usage. Deliver architecture, permissions, cost table, and implementation plan. No AWS changes.

### Phase B — Local implementation
Implement package UX, compression, inspector, safe local import/export, tests, and SAM backend/infrastructure. Keep local mode default. Do not deploy.

### Phase C — Review
Show the user account ID, region, each resource, applicable free allowance and evidence, expected usage, possible charges, permissions, CloudFormation change set, retention/deletion behavior, and unresolved risks. Stop for explicit approval. If any resource is paid/uncertain or unverified, do not deploy.

### Phase D — Approved deployment
Only after approval, deploy the reviewed stack, record non-secret outputs, set public `.env.local` values, and smoke-test with a test user and harmless package. Verify local mode, private S3, JWT enforcement, and cross-user isolation.

### Phase E — Report
Report resources/region, verified allowance limits, non-secret outputs, tests run, known risks, usage monitoring, and manual cleanup steps. Never automatically delete resources after testing; deletion requires approval and a data-loss warning.

## 11. Acceptance criteria

- `.simxpack` build, inspection, compression, export, and import work offline.
- Compression statistics are based on measured bytes.
- Existing package schema, checksum, and validation contracts are reused and tested.
- Invalid archives cannot partially modify local storage.
- Cloud mode is optional; local mode remains the default.
- Cloud packages are private by default and every route checks ownership.
- Infrastructure is reproducible from SAM/CloudFormation templates.
- No secrets are shipped to the browser or committed to Git.
- Every provisioned resource was checked against applicable Free Tier limits.
- Deployment occurs only after explicit approval.
- Final report honestly documents tests, resources, limits, and cost risks.

## 12. Antigravity master prompt

You are the implementation agent for the existing SimXSphere repository. Implement SimXPack: experiment packaging, browser-side compression, package inspection, safe local import/export, and optional authenticated AWS cloud package backup/sharing.

Start in read-only discovery. Inspect the actual code, branch, Git status, package scripts, storage interfaces, `.simxpack` implementation, checksum contract, validators, tests, and AWS resources. Do not assume old notes are accurate. Report findings and a staged plan before editing.

Preserve local-first behavior and `VITE_STORAGE_MODE=local` as default. Core packaging, compression, inspection, import, and export must work offline without AWS config. Reuse existing package code. Add size/entry limits, checksum/schema validation, path traversal and ZIP-bomb defenses, and no-partial-import behavior. Never execute package contents.

Optional cloud architecture: Cognito public SPA client without a client secret, API Gateway HTTP API with JWT authorizer, Lambda, DynamoDB, private S3, and short-lived presigned URLs. Verify current adapter contracts first. Enforce owner identity from verified JWT claims on every route. Never make the S3 bucket public by default. Public “anyone with the link” sharing is out of initial scope unless separately approved.

STRICT COST GATE: user requires AWS resources to remain within verified Free Tier allowances. Verify account plan, eligibility, region, offer duration, limits, current usage, and official pricing. Classify each resource as ongoing-free-within-verified-allowance, temporary/promotional-credit-only, or paid/uncertain. Only the first class can be considered for deployment, and only if projected usage stays within allowance. If any required service is temporary, paid, uncertain, or unverified, stop and propose a no-AWS alternative or ask for a scope decision. Never promise zero cost. Budget alerts are not a hard cap.

Never ask for pasted credentials/MFA codes. Prefer temporary credentials via an existing CLI profile/SSO. Never use root credentials or blanket admin access. Never put secrets in Vite variables, source, logs, or Git. Do not create, modify, deploy, or delete AWS resources until the user reviews the account, region, resource list, permissions, free-allowance evidence, cost risks, and change set and explicitly approves. Never auto-approve destructive changes.

Work in small phases. Run actual tests/lint/build and SAM validation/build. Report exact results; do not claim unrun checks passed. Avoid unrelated rewrites. If something is ambiguous or cost eligibility cannot be verified, stop and ask. After approved deployment, report non-secret outputs, resource inventory, monitoring guidance, limitations, and manual cleanup instructions.

## 13. Official references to verify at implementation time

- AWS Free Tier: https://aws.amazon.com/free/
- AWS Free Tier documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html
- IAM best practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- AWS SAM: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html
- AWS Budgets: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html
- S3 security best practices: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html

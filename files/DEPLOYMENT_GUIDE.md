# DEPLOYMENT_GUIDE

## Part A: Local deployment (default, no AWS)
```bash
npm install
npm run build
npm run preview      # serves dist/ at http://localhost:4173
```
Demo from this local server. To share the app itself with others, give them the repo and these commands (hosting it publicly is out of scope).

## Part B: Optional AWS deployment
**Do not start until** AWS_FREE_COST_CHECKLIST.md sections 1-3 are complete, the budget alert exists, and you wrote "go" for each service.

### B1. Prerequisites
AWS CLI configured with a non-root deployer (SSO or IAM user + MFA); SAM CLI (or plain CloudFormation); a fixed region; docs checked for the Lambda runtime currently supported (https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html). **VERIFY BEFORE USE.**

### B2. Template (`infra/template.yaml`) must define only
S3 bucket (Block Public Access, SSE-S3, lifecycle expiry, CORS to `http://localhost:4173` and `http://localhost:5173`), DynamoDB table (key `PK`/`SK`; capacity mode chosen at the cost gate; no backups/PITR unless verified), Lambda function + role (policy from SECURITY.md), Cognito user pool + app client (no client secret for SPA), API entry per cost-gate decision, log group with short retention. **No other resources.**

### B3. Pre-deployment cost checklist (sign before each deploy)
- [ ] Account plan/credits checked today.
- [ ] Template resource list equals inventory table; nothing from the "never" list.
- [ ] `sam validate` / `aws cloudformation validate-template` passes.
- [ ] Review change set before executing.
- [ ] Budget alert active.

### B4. Deploy
```bash
sam build
sam deploy --guided          # review the change set; confirm region and stack name
```
Copy stack outputs (API URL, user pool id, client id, bucket name) into a local `.env.local` (git-ignored). These are identifiers, not secrets; still never commit them blindly. Set `VITE_STORAGE_MODE=aws` to enable the adapter; omit it for local mode.

### B5. Smoke test
Sign up/in -> upload a package -> list -> download via presigned link -> wait for link expiry and confirm it fails -> delete -> confirm S3 object and DynamoDB item are gone.

### B6. Rollback
Failed deploy: CloudFormation rolls back automatically; if a stack is stuck, delete it and fix the template. App-level rollback: set `VITE_STORAGE_MODE=local` (or unset) and rebuild; local mode never depends on AWS.

### B7. Cleanup
Follow AWS_FREE_COST_CHECKLIST.md section 7. Record the date and evidence.

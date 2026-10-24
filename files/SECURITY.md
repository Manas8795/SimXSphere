# SECURITY

## 1. Assets and threats
| Asset | Threat | Control |
|---|---|---|
| Experiment data | Tampering/corruption | Schema validation, SHA-256 in manifest |
| User's machine | Malicious ZIP (zip-slip, bomb, oversized) | Path allowlist, limits, running byte counter |
| App | XSS via titles/descriptions in imported files | Render as text only (React escaping); never `dangerouslySetInnerHTML`; length limits |
| App | Code execution via import | Never `eval`, never run files; JSON only |
| Cloud data | Unauthorized access | Cognito JWT; `sub`-scoped keys; private bucket |
| Credentials | Leakage | No keys in code/repo/frontend; `.gitignore` for env files; secret scan before commit |
| Cost | Abuse/loops | Size limits, short-lived URLs, budgets, small quotas |

## 2. Import hardening
See [SIMXPACK_SPEC.md](SIMXPACK_SPEC.md) section 6. Never write imported file names to disk paths; names are only used as allowlisted keys.

## 3. Local mode privacy
Data stays in the browser (storage per origin) and in files the user downloads. No telemetry. Provide "Delete all local data".

## 4. Cloud mode controls (if deployed)
- **Authentication:** Cognito User Pool; API accepts only a valid JWT (API Gateway JWT authorizer, or in-Lambda verification if a Function URL is used).
- **Authorization/ownership:** Lambda derives `userSub` from the verified token; S3 key = `packages/{userSub}/{packageId}.zip`; DynamoDB `PK = USER#{sub}`. Client-supplied user ids and key paths are ignored. Every get/delete checks the item's PK equals the caller.
- **S3:** Block Public Access (all four) ON; encryption at rest (SSE-S3); no public ACL/policy; CORS to the app origin only; presigned POST with `content-length-range` <= 5 MiB, expiry <= 5 min; presigned GET expiry <= 5 min.
- **Least-privilege Lambda policy (template; replace placeholders):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::BUCKET_NAME/packages/*" },
    { "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:Query", "dynamodb:UpdateItem", "dynamodb:DeleteItem"],
      "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/simxsphere-packages" },
    { "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:REGION:ACCOUNT_ID:log-group:/aws/lambda/simxsphere-api:*" }
  ]
}
```
No `*` actions, no `s3:ListBucket` on the whole bucket (listing uses DynamoDB). Using the S3 key `packages/*` still relies on code deriving the sub, so ownership tests are mandatory.
- **Logging:** log request id, status, sizes, error codes. Never log package contents, tokens, or presigned URLs.
- **Deployment credentials:** short-lived/SSO or a dedicated IAM user with MFA; never root; keys in the AWS CLI profile only.

## Data deletion
Local: delete experiment / delete all. Cloud: `DELETE /packages/{id}` removes S3 object and metadata; account teardown removes everything (see AWS_FREE_COST_CHECKLIST.md).

## 5. Security tests
| ID | Test | Expected |
|---|---|---|
| S1 | ZIP with `../evil.json` | Rejected, nothing stored |
| S2 | ZIP with absolute path / backslash / `C:\` | Rejected |
| S3 | ZIP bomb (small zip, huge declared/actual expansion) | Rejected at limit, memory bounded |
| S4 | 21+ entries | Rejected |
| S5 | Unexpected extension (`.exe`, `.html`) | Rejected |
| S6 | Malformed JSON; wrong types; unknown fields | Rejected with message |
| S7 | `schemaVersion` 2 | "Unsupported schema version" |
| S8 | Manifest hash mismatch | Rejected |
| S9 | Title `<img src=x onerror=alert(1)>` | Displayed as text; no script runs |
| S10 | (cloud) User A requests User B's package id | 404/403, no URL issued |
| S11 | (cloud) No/expired JWT | 401 |
| S12 | (cloud) Upload > 5 MiB | S3 rejects |
| S13 | (cloud) Anonymous access to bucket object URL | Denied |
| S14 | Repo secret scan | No keys found |

## 6. Residual risks / limitations
Local storage is readable by anyone using that browser profile; checksums are not signatures; browser-side validation is advisory for cloud (the Lambda must re-check metadata and S3 enforces size); student-scale testing, no penetration test.

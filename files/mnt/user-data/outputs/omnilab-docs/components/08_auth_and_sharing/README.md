# 08 — Authentication & Sharing

**Depends on:** 07. **Cloud:** YES — **gated**. **Next:** [09 Security Hardening](../09_security_hardening/README.md)

> Add authentication only if sharing genuinely needs identity and the service's free allowance is verified (`VERIFY BEFORE USE`). If not, document a local-only or link-less alternative.

## Purpose
Introduce user identity, ownership, and a clear access model for private, shared, and public experiments and packages.

## Concepts
- **Authentication:** who you are. **Authorization:** what you may do. Both are enforced **server-side**.
- Ownership recorded on every experiment and package.

## Access Model (to be finalized in the spec)
| Visibility | Who can read | Notes |
|-----------|-------------|-------|
| Private | Owner only | Default |
| Shared (link) | Holders of a valid share record | Revocable, optionally expiring |
| Public | Anyone | Only if intentionally designed and safe |

## In Scope
- Sign-up/sign-in via the chosen identity service (or documented alternative).
- Ownership checks on every private operation (read, update, delete, export, share).
- Share records with ID, target experiment/package, creator, expiry, revoked flag.
- Short-lived pre-signed URLs for downloads only if the current service configuration is verified acceptable. Never expose private objects via predictable public URLs.
- Share revocation and expiry enforcement.
- Local fallback so the app still works signed out.

## Out of Scope
Social features, comments, email notifications, paid identity features.

## Tests
- User A cannot read, update, delete, or share user B's private experiment.
- Unauthenticated request to a private resource is rejected.
- Valid share link works; revoked and expired links fail.
- Guessing or altering IDs yields no access.
- Pre-signed URL expires as configured.
- Private data does not appear in logs.

## Acceptance Gate
- [ ] All authorization tests pass.
- [ ] Revocation and expiry verified.
- [ ] No private object reachable without a server-validated permission.
- [ ] Free eligibility of identity service verified and recorded.

## Agent Prompt
`docs/agent-prompts/08_AUTH_AND_SHARING_PROMPT.md`

## Evidence
Authorization test results (A vs B); share/revoke screenshots; sequence diagram for sharing.

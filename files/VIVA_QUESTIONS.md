# VIVA_QUESTIONS

**Q1. Why local-first?**  It keeps the app functional with no cloud, removes cost risk, and makes testing simple. Cloud is an adapter, not a dependency.

**Q2. Which AWS services does the architecture use and why?**  Cognito (identity), Lambda (small private API logic), S3 (package storage), DynamoDB (metadata queries without S3 scans), CloudWatch Logs (short-retention errors), IAM (least privilege), CloudFormation/SAM (repeatable deploy/delete). Each is justified and removable; none added for count.

**Q3. Why not EC2/RDS/CloudFront/etc.?**  They add cost and operational burden without helping the requirements; the browser does the compute and the data is small.

**Q4. Can you guarantee no AWS charges?**  No. Free eligibility depends on account plan/age, region, usage and current offers; budgets only alert. We verify per service for our account, keep resources minimal, and tear down. The only zero-risk option is local-only.

**Q5. Why presigned URLs?**  The browser transfers large bytes directly to/from S3 while Lambda only authorizes; URLs are short-lived and scoped to one object, so the bucket stays private and Lambda handles tiny payloads.

**Q6. How is ownership enforced?**  The Lambda takes the user id from the verified Cognito token (`sub`), builds S3 keys and DynamoDB keys from it, and ignores client-supplied ids. Cross-user access tests exist.

**Q7. Is a presigned URL secure?**  It is a bearer link: anyone with it can use it until expiry. Hence short expiry, HTTPS only, single object, no logging of URLs.

**Q8. Why DynamoDB and not RDS?**  Simple key-based access (list by user), serverless, no instance to run or forget; one table, `Query` only.

**Q9. How do you protect against zip-slip?**  Strict path allowlist regex; reject `..`, absolute paths, backslashes; never use entry names as filesystem paths.

**Q10. How do you handle zip bombs?**  File-size cap before reading, entry count cap, declared-size caps, a per-entry ratio cap, and a running byte counter during decompression that aborts because declared sizes can be forged.

**Q11. What does SHA-256 in the manifest give you?**  Detection of accidental corruption or later edits to a file. It does not authenticate the author or stop someone who rewrites both file and manifest; signing would address that.

**Q12. Is the compression really lossless?**  DEFLATE is lossless. We prove it by round-trip tests comparing canonical JSON before/after and by hashes.

**Q13. What compression ratio do you get?**  Whatever we measure for our test sets; it depends on data (repetitive JSON/CSV compresses more). Tiny packages may even grow slightly because of ZIP headers.

**Q14. Why store counts, not individual trials?**  Compact, exact, and sufficient to reproduce the histogram; with the seed it is also regenerable.

**Q15. Why a seeded PRNG? Is it random?**  Reproducibility for tests/demos. mulberry32 is a deterministic statistical PRNG, not cryptographic.

**Q16. How do you test randomness?**  Seeded determinism tests, sum-to-N checks, and tolerance checks (about 4 sigma) on proportions, plus a large-N chi-square sanity check.

**Q17. What are the physics assumptions?**  Uniform gravity, no drag, flat ground, launch from height 0. Range = v0^2 sin(2 theta)/g.

**Q18. Why canonical JSON?**  So equality and hashing are independent of key order/whitespace.

**Q19. What if the AWS account closes after its free period?**  Reportedly the Free plan ends after 6 months or when credits run out (VERIFY). We deploy near the demo, keep local copies, and the app continues in local mode.

**Q20. What would you do with more time?**  More simulations, package signing, shared collections with access control, accessibility audit, verified-cost frontend hosting.

**Q21. How does this show cloud architecture skill if AWS deployment is optional?**  The design, IAM, data flow, IaC, adapter tests and cost-gate analysis are complete deliverables; deployment is performed when the account verification passes, and the report states the evidence either way.

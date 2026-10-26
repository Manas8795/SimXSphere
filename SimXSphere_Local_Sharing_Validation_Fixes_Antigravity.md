# SimXSphere — Local Sharing Validation & Consistency Fixes
## Follow-up implementation brief for Antigravity / IDE agent

**Goal:** Correct and verify the existing local `.simxpack` export/import/share implementation based on a review of the current repository. This is a focused hardening pass—not a new feature build and not AWS setup.

**Repository:** `Manas8795/SimXSphere`  
**Reviewed commit:** `6078ebe6a24c94a62fbd08ef7b92dd452787e6a6`  
**Relevant areas:** `src/core/simxpack/`, `src/core/experiment/`, `src/core/crypto/`, `src/storage/`, sharing dialogs, simulation views, and `docs/LOCAL_SHARING_AND_PACKAGES.md`.

> The commit hash and paths above are review context. First inspect the current branch and actual files; do not assume the repository has not changed since this review.

---

## 1. Non-negotiable workflow

1. Inspect the current repository, branch, working tree, and latest commits.
2. Read the current implementation and existing tests before editing.
3. Run the current test suite, build, lint, and type checks if available. Record baseline failures before changes.
4. Create a checklist mapping every requirement below to implementation files and tests.
5. Make focused changes only to fix the listed validation, checksum, documentation, and test gaps.
6. Preserve existing user data, UI conventions, file compatibility, and scientific behavior unless a specific bug is proven and separately explained.
7. Do not add AWS services, AWS SDKs, credentials, cloud endpoints, hosted links, or cloud features.
8. Do not claim success for checks that were not actually run.

Avoid broad refactors. Do not “fix” adjacent scientific calculations merely because they appear in changed files; first verify and document any defect.

---

## 2. Deeply validate imported experiment data

Review `src/core/experiment/validate.ts` and all relevant domain validators. An import must not be accepted solely because its outer structure appears plausible.

### General requirements

- Validate the package envelope, experiment envelope, type discriminator, schema versions, IDs, and timestamps.
- Reject unexpected or malformed types; do not coerce arbitrary strings into numbers.
- All numeric values used as scientific inputs or results must be finite. Reject `NaN`, `Infinity`, and `-Infinity`.
- Validate array lengths, tuple/object shape, and every relevant element.
- Reject negative values, invalid counts, out-of-range values, and inconsistent derived results according to the actual domain schema.
- Reuse the same domain validation logic used by normal simulation inputs wherever possible.
- Ensure imported text is treated as untrusted content and safely rendered.
- Do not execute imported code, scripts, markup, serialized functions, or expressions.
- Do not trust imported results blindly. Recompute derived values from validated parameters when the application’s established model requires it.
- Return clear, actionable validation errors. Avoid exposing internal stack traces to users.
- Keep validation pure and testable where practical.

### Probability experiment checks

Inspect the actual `ProbabilityParameters` and `ProbabilityResults` types and the simulation engine. Validate:

- `kind` is exactly a supported value (`coin` or `die`).
- `sides` matches the kind and allowed range defined by the current engine.
- `trials` is a finite integer within the current engine's actual supported bounds.
- `seed` is a valid unsigned 32-bit integer if required by the schema.
- `counts` is an array of the expected length for `sides`.
- Every count is a finite, nonnegative integer.
- `total` is a finite, nonnegative integer and matches the experiment’s trial count when required.
- Sum of counts equals total, without unsafe integer overflow.
- Any additional persisted probability results are validated according to their real types.

Do not copy bounds from old documentation. Use the current source of truth and update documentation accordingly.

### Projectile experiment checks

Inspect the current projectile schema and engine. Validate:

- Input speed, angle, and gravity are finite and within the actual engine limits.
- `trajectory` has the exact expected shape and sample count required by the current schema.
- Every trajectory sample has the correct representation (for example, a numeric tuple if that is what the TypeScript type uses).
- Each coordinate is finite.
- Reject malformed tuple/object samples, extra or missing coordinate values, and non-finite numbers.
- Validate `range`, `flightTime`, and `maxHeight` as finite values with valid nonnegative bounds.
- Where appropriate, compare or recompute saved outputs from the validated input parameters using the established engine. Avoid fragile exact floating-point comparisons; use a documented tolerance.
- Validate special cases such as zero-degree and 90-degree launch angles according to actual engine behavior.

Do not change the scientific assumptions or formulas as part of this hardening task unless a defect is verified and separately reported.

### Chemistry experiment checks

Inspect the current chemistry types, reagent database, and simulation validation. Validate:

- Reactant entries have the required fields and valid reagent identifiers.
- Reagent IDs correspond to supported database entries where applicable.
- Concentrations, volumes, temperature, solvent, and other persisted inputs use the real schema and valid ranges.
- All numeric values are finite and units are correctly represented.
- Results have the expected structure and finite numeric values.
- Stoichiometric/result consistency is checked using the project’s established chemistry logic where feasible.
- Do not accept arbitrary reagent objects that merely contain a name or ID.
- Preserve legitimate existing chemistry scenarios and avoid inventing new scientific constraints.

### Test cases required

Add tests for valid data and for each invalid condition listed above. Include at least:

- Wrong or missing type discriminator
- Invalid/missing nested fields
- `NaN`, `Infinity`, `-Infinity`
- Wrong probability count length
- Fractional or negative probability counts
- Counts sum not equal to total
- Invalid seed/trial/sides bounds
- Projectile tuple with wrong length or nonnumeric coordinates
- Non-finite projectile coordinates
- Invalid chemistry reagent ID
- Invalid or non-finite chemistry numeric inputs
- Invalid result structures
- Valid edge cases that must remain accepted

---

## 3. Make checksum and package integrity behavior consistent

Review `src/core/simxpack/singlePackage.ts`, the canonical serializer, SHA-256 helper, importer, and import dialog.

### Required behavior

1. Establish one explicit checksum contract for schema version 1.
2. Ensure the exporter includes the required checksum and metadata.
3. Ensure the importer requires the checksum if schema v1 defines it as mandatory.
4. Validate checksum presence, encoding, and expected length/format before comparing.
5. Calculate the checksum over exactly the documented canonical payload. Avoid hashing fields that are themselves volatile or recursively include the checksum.
6. Reject a mismatch before persisting or opening the experiment.
7. Use the same canonical serialization algorithm in export and import.
8. Provide a clear user-facing error for a missing, malformed, or mismatched checksum.
9. Do not silently downgrade integrity validation or accept a package with a missing checksum merely because it parses.
10. If backward compatibility requires accepting older checksum-less packages, make that behavior explicit by schema/version, distinguish it in UI, and test it. Do not quietly weaken v1 validation.

### Import dialog error flow

Review `src/ui/components/sharing/ImportDialog.tsx`:

- Make checksum mismatch and other package validation failures reach a visible error state.
- Remove unreachable or contradictory warning branches.
- A rejected package must not be presented as valid or be saved.
- The UI should clearly distinguish “invalid package” from “user cancelled.”
- Do not show a success toast unless import/persistence completed successfully.
- Ensure the file input can be used again after an error, including selecting the same file again.

### Security note

A SHA-256 checksum detects accidental corruption and provides integrity checking against the included digest. It does **not** prove who created the file or prevent a malicious author from creating a new package and matching checksum. Do not describe it as a digital signature, authenticity guarantee, or malware protection.

---

## 4. Correct documentation to match source

Update `docs/LOCAL_SHARING_AND_PACKAGES.md` and any linked docs using the current code as the source of truth.

Review and correct these known inconsistencies:

- Documented localStorage key vs. the actual key used by `LocalStorageAdapter`.
- Projectile trajectory example uses object samples (`x`, `y`, `t`) while the actual TypeScript representation may use `[x, y]` tuples. Document the exact real representation.
- Probability trials maximum documented as 100,000 while the engine currently allows up to 1,000,000. Verify the current implementation before changing the text.
- Projectile gravity maximum documented as 100 m/s² while the current validator may use 30 m/s². Confirm actual source and update.
- The documentation claims checksum verification is mandatory, while the reviewed importer allowed a missing checksum. After fixing behavior, document the exact contract.
- Confirm package schema, checksum payload, maximum file size, duplicate behavior, and import flow against actual code.
- Confirm the documentation’s supported simulation types and exported fields are accurate.

Do not “fix” documentation by changing valid runtime limits without a separate product/scientific justification. Prefer correcting documentation to the established source of truth.

If the code and existing schema docs disagree, identify the canonical source, resolve deliberately, and explain any compatibility implications.

---

## 5. Review duplicate handling and local persistence

Inspect import-to-storage behavior and duplicate-ID handling.

- Import must not overwrite existing data silently.
- If “Replace Existing” is offered, require an explicit user choice and confirmation.
- “Import as New Copy” must generate a unique stable ID and preserve the rest of the validated data appropriately.
- Verify the actual storage adapter and local key are documented accurately.
- Handle storage quota or unavailable storage without reporting success.
- A validation failure must not mutate the local repository.
- A persistence failure must not leave a false success state.
- Keep the current user’s existing records safe.
- Ensure import and export work for each supported domain intended by the application.

Do not create a new competing persistence layer.

---

## 6. Test and quality gates

Use the existing project toolchain and test conventions.

Run and report the real result of:

- Unit tests
- Integration tests, if available
- TypeScript/type checks
- Lint
- Production build

If any command is unavailable, state that clearly and explain why. If a check fails, provide the actual failure and distinguish pre-existing failures from regressions introduced by this patch.

Add regression tests for:

- Export → import round-trip for chemistry, probability, and projectile.
- Missing, malformed, and mismatched checksum.
- Canonical serialization stability.
- Every invalid nested-data case described above.
- Duplicate import behavior.
- Storage write failure and no false success.
- Import rejection leaves existing local records unchanged.
- File size limit and malformed JSON.
- UI displays checksum/validation failures clearly.

Do not weaken or delete existing tests to make the suite pass.

---

## 7. Scope boundaries

This task is a local feature hardening pass.

Do not add:

- AWS SDKs or cloud dependencies
- AWS credentials or secrets
- S3, Lambda, API Gateway, Cognito, DynamoDB resources or deployment files
- Hosted share URLs or upload behavior
- Unrequested account or collaboration systems

Do not make broad visual redesigns or unrelated scientific/model changes.

---

## 8. Required final report

When complete, provide:

1. Summary of the exact issues fixed.
2. File-by-file list of changes.
3. The finalized `.simxpack` schema v1 checksum contract.
4. Validation rules for chemistry, probability, and projectile.
5. Tests added and their results.
6. Actual test, type-check, lint, and build command outputs or concise summaries.
7. Any checks not run and why.
8. Existing failures vs. newly introduced failures.
9. Documentation sections updated.
10. Confirmation that local records are not overwritten silently and failed imports do not mutate storage.
11. Confirmation that no AWS/cloud functionality was added.
12. Manual verification steps:
    - Export one valid simulation from each domain.
    - Import each package on the same app.
    - Import a package on another browser/device if possible.
    - Try malformed JSON, absent checksum, bad checksum, invalid nested data, and duplicate IDs.
    - Verify clear rejection and that local saved data remains unchanged.

**Completion rule:** Do not state that this is fully validated unless the code changes are complete and the applicable checks actually pass. Clearly disclose any remaining gap.

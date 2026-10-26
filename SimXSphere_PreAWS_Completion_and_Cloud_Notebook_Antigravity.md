# SimXSphere — Pre-AWS Completion Plan + Cloud-Value Feature Specification
## Implementation instructions for Antigravity / IDE agent

**Repository:** https://github.com/Manas8795/SimXSphere  
**Product direction:** Chemistry is the primary simulation experience. Probability and Projectile Motion remain independent modules. The local LLM is an optional explanation layer.  
**Scope:** Complete and verify the local application before AWS implementation or deployment. Design a cloud feature that gives AWS meaningful product value—not merely a hosting destination.

---

# 0. Mandatory agent rules

Before editing:

1. Inspect the current repository and branch, including README, package scripts, active project briefs, simulation engines, UI views, data catalogues, storage adapters, local LLM files, infrastructure code, tests, and documentation.
2. Reconcile this brief against current source. Findings below came from repository inspection and may have changed. Verify every item; do not blindly repeat outdated findings.
3. Produce a requirement audit table, marking every item `Already correct`, `Needs correction`, `Partially implemented`, `Not implemented`, or `Not applicable` with evidence.
4. Map requirements to exact files and planned changes. Keep a traceability checklist.
5. Work in small, reviewable stages. Run relevant checks after each stage.
6. Never claim a test, build, lint, UI flow, or runtime integration passed unless actually executed.
7. Do not perform unrelated redesigns or replace functioning architecture without reason.
8. Do not provision AWS resources, deploy, or incur costs during this task.
9. Do not add a hosted AI provider or silently transmit local simulation state externally.
10. If something is unsafe, scientifically unsupported, incompatible, or ambiguous, document it and request a decision instead of inventing behavior.

**Definition of complete:** every applicable item is implemented and verified, or explicitly marked blocked with evidence and a proposed resolution. Do not silently skip items.

# 1. Establish the real baseline

Inspect and report:

- Current branch and commit
- Install/build/test/lint scripts and dependency versions
- Modules, routes, and views
- Chemistry, probability, and projectile engines
- Local persistence/storage contracts
- Local LLM runtime, setup, context builders, and UI
- Cloud adapter and infrastructure template
- Actual tests and coverage
- Stale or conflicting documents

Run supported checks in a clean environment where possible:

```bash
npm ci
npm test
npm run build
npm run lint
```

If a script is absent, do not invent a successful result. Record absence and decide whether to add it or correct docs. Run supported type-check, coverage, and E2E checks if present. Record commands, exit statuses, failures, environment limitations, and commit.

# 2. Scientific correctness and chemistry engine

## 2.1 Result semantics

For each chemistry result distinguish:

- Reviewed/reference data
- Deterministic engine-calculated result
- Approximation/educational estimate
- Illustrative visualization
- Unknown/unsupported result

Represent this distinction in typed data and UI. Do not use generic `verified`, `curated`, `conserved`, `safe`, or “real science” claims unless established for that exact result. Unsupported inputs/reactions must return explicit unsupported/error states, not plausible-looking values.

## 2.2 Aqueous chemistry and mixing

Inspect `src/core/simulations/chemistry.ts` and all callers. Verify any fixed/heuristic outputs for pH, temperature change, reaction classification, and physical properties.

Where applicable:

- Remove hard-coded results presented as general predictions.
- Do not average reagent pH values as a general mixture-pH calculation unless a valid, explicitly scoped model supports it.
- Do not derive enthalpy from temperature-change sign.
- Do not call temperature change a prediction without necessary amounts, concentrations, thermodynamic data, and assumptions.
- Handle dilution, volume, concentration, units, and unsupported chemistry consistently.
- Distinguish educational illustration from quantitative physical simulation.
- Include assumptions and limitations in result/context models.
- Mark unavailable values unavailable instead of fabricating them.

## 2.3 Unify chemistry pathways

Review and reconcile:

- `src/chemistry-engine/workplane-solver.ts`
- `src/chemistry-engine/compound-builder.ts`
- `src/chemistry-engine/stoichiometry-calc.ts`
- `src/core/simulations/chemistry.ts`
- `src/chemistry-data/elements.ts`
- `src/chemistry-data/reagents.ts`
- Chemistry UI and reactor/synthesis components

The workplane, compound builder, equation validator, stoichiometry calculator, and aqueous simulator must use consistent reaction definitions, units, validation, and result semantics. Avoid conflicting duplicate catalogues.

- Maintain one reliable source for reviewed reactions/properties, or document why separate datasets are necessary.
- Validate equations and atom counts before marking a reaction balanced.
- Separate reference-element availability from actual reactor support.
- Distinguish reviewed compounds from heuristic candidates.
- Label valence/electronegativity-generated candidates as unverified educational candidates, not known stable compounds or real products.
- Add provenance/source metadata to reviewed chemistry data.
- Verify reaction preset labels, formulae, and products agree; specifically inspect iron oxide/rust versus iron sulfide presets.
- Unsupported combinations must return explicit messages, not unrelated fallbacks.

## 2.4 Formula parser and atom counting

Inspect formula parser/atom counter for:

- Parentheses and nested groups, e.g. `Ca(OH)2`
- Group multipliers
- Correct element-symbol casing
- Text subscript handling
- Hydrates/adducts only if explicitly supported
- Invalid characters and malformed formulas
- Empty formulas, invalid multipliers, and overflow/limits

Never silently ignore unparsed characters. Return clear parse errors and add tests for supported and rejected syntax.

## 2.5 Stoichiometry validation

Inspect `src/chemistry-engine/stoichiometry-calc.ts`. Reject rather than silently coercing invalid values:

- Negative, zero, non-finite, or missing masses where invalid
- Invalid/zero/non-finite molar masses
- Invalid coefficients
- Missing reagents/products
- Invalid units
- Limiting/excess reagent edge cases
- Zero-yield or zero-input cases

Check dimensional consistency and explicit units. Add tests for invalid inputs, limiting reagent, theoretical yield, and normal valid cases.

## 2.6 Reagent and hazard data

Inspect `src/chemistry-data/reagents.ts` and UI.

- Replace generic “Safe” badges with precise reviewed hazard descriptions and credible sources where possible.
- Do not categorically claim a reagent is safe.
- Do not present concentration/context-dependent hazards as universal.
- Separate reference properties from simulation assumptions.
- Make unavailable hazard data explicit.
- Never imply the simulation is permission or assurance to perform a real reaction.

## 2.7 Molecular/scientific visualization

Review molecule viewer, periodic table, reactor visuals, and animations.

- Mark diagrams illustrative unless geometry/properties are validated.
- Avoid implying precision beyond data.
- Prefer reviewed, documented visual models.
- Check units, labels, subscripts, legends, and accessibility.
- Do not add visual effects before current results are trustworthy.

# 3. Experiment notebook and local persistence

Inspect app shell, experiment types/validation, local adapter, storage interface, and save/load/delete UI. Verify whether app history and typed experiment storage are separate paths; choose one authoritative model.

Required:

1. Chemistry, Probability, and Projectile records preserve full parameters and relevant outputs.
2. Records include stable IDs, timestamps, domain/module ID, schema version, assumptions/model version where useful.
3. Save/list/load/restore/delete/clear behavior is consistent.
4. Refresh does not lose successfully saved records.
5. Validate records when loading, not only when saving.
6. Handle invalid, legacy, corrupt, and incompatible records safely.
7. Handle storage quota/unavailability visibly; never show false success.
8. Demo/example records are identified and never silently treated as user experiments.
9. Decide localStorage vs IndexedDB; evaluate IndexedDB for larger histories/packages rather than base64-heavy local storage.
10. Keep the interface ready for a future cloud adapter without claiming cloud sync exists.

**Acceptance:** run a simulation, save, refresh, reopen exact inputs/results, and delete. Repeat for all three domains.

# 4. Probability verification

Do not add more probability experiments until current ones are reliable.

- Ensure seed + parameters reproduce outcomes where seeded reproducibility is intended.
- Inspect split between seeded batch generation and `Math.random()` single-trial paths; align or document it.
- Verify totals, frequencies, theoretical/empirical probabilities, and charts.
- Make seed, reset, rerun behavior clear.
- Ensure saved record matches displayed state.
- Test zero/invalid trials, limits, maximum trial counts, responsiveness.
- Avoid freezing main thread at supported maxima; use batching/worker only if justified.
- Explainer must distinguish theoretical and empirical results and must not promise fixed-trial convergence.

# 5. Projectile Motion verification

Inspect engine, view, charts, saved schema, and context builder.

- Validate speed, angle, gravity, launch height, and other active inputs.
- Test boundary angles such as 0° and 90° where applicable.
- Independently verify formulas and expected numeric values.
- Keep trajectory, range, flight time, maximum height, chart, units, and explainer values derived from one active state.
- State whether air resistance is included.
- Do not assume equal launch/landing heights unless the model says so.
- Explicitly handle unsupported environmental factors.
- Verify gravity presets and reset behavior.
- Restore exact parameters and assumptions from saved runs.
- Test invalid input, chart responsiveness, and accessible descriptions.

# 6. Local LLM Simulation Explainer

Inspect existing implementation before modifying. Relevant paths include `src/core/explainer/`, `src/ui/components/explainer/`, domain context builders, `docs/LOCAL_LLM_SETUP.md`, and existing Ollama adapter/tests.

## 6.1 Grounding

- Remove unconditional chemistry claims such as `isConserved: true` or `isCurated: true` unless derived from validation/catalogue data for the active reaction.
- Never derive enthalpy from temperature-change sign.
- Include only supported facts, actual engine outputs, units, assumptions, and explicit unknowns.
- Preserve estimated/illustrative status.
- Probability: keep theoretical and empirical values distinct.
- Projectile: include active model assumptions.
- Model cannot replace numeric engine outputs.
- State when data is missing/unsupported.
- Treat user text/stored notes as data, not system instructions.
- Do not claim visual-scene inspection unless state data was provided.

## 6.2 State freshness and UX

- Source context from active simulation and relevant subview.
- Verify state revision/change detection for all domains.
- Cancel request or identify revision when state changes during generation.
- Never present stale output as current.
- Keep “What if?” conceptual unless user explicitly changes inputs through existing controls and engine recomputes.
- Prevent duplicate requests; support cancellation if possible.
- Do not generate on every slider tick; use explicit action or considered debounce.
- Do not freeze simulation controls.
- Make narration/voice opt-in and non-disruptive; do not narrate every small change by default.

## 6.3 Runtime/privacy/failures

- Reuse local runtime integration; if Ollama is selected, document install, model download, endpoint, configuration, and troubleshooting.
- Verify browser-to-local-runtime connectivity across supported platforms.
- Handle runtime unavailable, missing model, refused connection, timeout, cancellation, empty/malformed response, oversized context, and generation errors.
- No hosted fallback.
- Do not transmit simulation context externally.
- No telemetry capturing prompts, questions, notebook contents, or state.
- Avoid full prompt/context logging.
- Safely render model output; no raw untrusted HTML.
- Document local resource requirements and hardware/model-dependent latency/quality.

## 6.4 Tests

Mock local runtime; tests must not require a model download/live Ollama.

Cover context builders for all domains, supported facts/assumptions, missing values, state changes/staleness, runtime failures, timeout/cancellation, no remote fallback, UI states, and proof AI output does not mutate engine results.

# 7. Testing, accessibility, UI readiness

## 7.1 Test suite

Inspect actual setup. Test plan may mention Playwright/E2E/coverage scripts that are absent; verify `package.json` and dependencies.

- Add maintainable E2E if valuable, or correct docs.
- Test user journeys: launch, change inputs, run, explain, save, reload, restore, delete.
- Test malformed/unsupported input, storage failure, AI unavailable/stale state.
- Avoid brittle screenshot tests without a clear benefit.
- Keep commands/results accurate.

## 7.2 Accessibility and responsive design

Verify keyboard navigation, visible focus, accessible control names, chart descriptions/result summaries, scientific symbols, contrast, mobile/narrow layouts, reduced-motion preference, and clear loading/error/empty/unsupported/success states. Preserve the existing scientific visual style; avoid unnecessary redesign.

# 8. Documentation cleanup

Inspect and reconcile README, chemistry docs, project briefs, local LLM guide, roadmap, historical plans, architecture, test plan, and cloud/cost checklist.

- Keep root README as public overview.
- Keep local LLM guide as setup reference.
- Establish one canonical active roadmap.
- Mark overlapping briefs as specs, history, or superseded.
- Preserve useful history unless approval is given to delete it.
- Status labels must reflect evidence: `complete`, `partial`, `pending`, `deferred`.
- Correct stale statements such as “not an AI/ML application” if local AI explainer is present.
- Match test docs to actual scripts/dependencies.
- Mark AWS deferred until local readiness and cloud design review.
- Align scientific accuracy claims with supported models; avoid unqualified “100% Real Science.”

# 9. Cloud-value feature: SimXSphere Cloud Notebook

## Why this feature

Do not make AWS valuable only by hosting the frontend. The most product-aligned feature is a **Cloud Notebook**: a user-owned cloud-backed collection of simulation experiments that can be backed up, restored across devices, and shared.

This gives AWS a real role for Chemistry, Probability, and Projectile Motion while fitting experiment records and SimXPacks.

## 9.1 MVP: personal cloud notebook

- Sign in using a selected identity provider.
- Upload/back up a selected experiment or SimXPack.
- List cloud-saved records/packages.
- Restore on another device.
- Rename and delete cloud records.
- Show upload/download status, timestamp, and version.
- Keep local-only option.
- Explicitly ask consent and indicate exactly what is uploaded.

## 9.2 Next: read-only shareable experiment

- Generate a scoped, revocable share link for one selected experiment/package.
- Recipient opens a read-only view of parameters, outputs, assumptions, and explanation.
- Never expose the entire notebook.
- Share only selected record; exclude unrelated personal data.
- Owner can revoke and optionally set expiry.
- Validate/sanitize imported/shared content.
- Label it a saved snapshot, not a live simulation or authoritative scientific result.

## 9.3 Later collaboration (not first cloud milestone)

Possible later capabilities: class/group notebooks, comments, shared collections, instructor assignments, and collaborative editing. Do not begin with real-time editing; it requires permission management and conflict resolution before basic cloud lifecycle is proven.

## 9.4 Cloud design principles

- Calculations remain client-side and work offline.
- Local LLM remains local; do not upload prompts/explanation history by default.
- Upload only user-selected data.
- Cloud state must not silently overwrite local state.
- Explicit conflict resolution: local, cloud, or duplicate; never silently discard.
- Local-only operation when signed out/offline.
- Version schemas and define migration.
- Adapter must implement storage contract or report unsupported; never fake success.
- Object storage for payloads and metadata database for indexes/ownership/status, as justified by design.
- Server-side ownership enforcement; frontend is not authorization.
- No long-lived AWS credentials in browser.
- Use scoped short-lived access when appropriate.
- Validate size, schema, content type, object key, and ownership.
- Define retention/lifecycle only after product/cost decisions.
- Define deletion including shared links and payload.
- Do not assume Free Tier means zero cost; review region, request, storage, transfer, identity, and other costs.

## 9.5 Candidate AWS responsibilities (design only)

Inspect current infrastructure and choose minimum viable services. Candidates:

- Static frontend hosting/CDN
- Cognito or explicitly selected identity provider
- API Gateway + Lambda for authenticated notebook operations
- DynamoDB for metadata, owner, version/status, share records
- S3 for package payloads/exports
- CloudWatch logs/metrics, configured to avoid prompt or personal-content logging

Do not adopt all automatically. Explain tradeoffs, cost, and complexity. Do not provision during this task.

## 9.6 Cloud Notebook data contract

Design/version the contract before cloud adapter implementation. Include stable experiment/package ID, server-derived owner ID, domain/simulation ID, schema version, timestamps, title/description, parameter snapshot, output snapshot, assumptions/units, engine version, object reference, status, content size/checksum, sharing state/expiry, and deletion state for safe retries.

Do not put large package payloads in DynamoDB if object storage is the payload store. Do not store LLM prompts/chat histories unless separately approved.

## 9.7 Cloud acceptance

- Signed-out local simulations still work.
- User can sign in, back up selected data, list, restore, rename, and delete owned records.
- Cross-device restore verified.
- Interrupted uploads/retries do not corrupt or duplicate records.
- Schema incompatibility gives clear error.
- User cannot read/update/delete/share another user's private data.
- Share links scoped, revocable, and tested against unauthorized access.
- Cloud failures do not corrupt local notebook.
- LLM prompts/context are not uploaded by default.
- Cost and cleanup documented.
- Backend tests cover auth, invalid payloads, object failures, metadata consistency.

# 10. Audit the current cloud prototype; placeholders are not production

Inspect:

- `src/storage/awsAdapter.ts`
- `infra/lambda/api.ts`
- `infra/template.yaml`
- Upload/download/package/share handlers
- AWS checklist and cost docs

Verify whether prior concerns remain:

- Fabricated presigned upload URLs
- Placeholder download URLs
- Empty package listings
- Routes returning success without actually saving/deleting
- No-op individual experiment methods
- Incomplete auth/ownership checks
- Unvalidated content/object keys
- Missing retries/idempotency
- Missing CORS/error handling
- Incomplete template/permissions/tests

For each confirmed gap: implement only after API contract approval, otherwise return explicit unsupported/error; add handler/adapter tests; verify server-side owner scope; review least privilege and deletion; review cost assumptions without guaranteed $0 claims.

**Do not deploy or provision.** Test locally/mocked first and ask for explicit approval before real deployment.

# 11. Implementation order

1. Baseline checks and inventory.
2. Correct chemistry result semantics.
3. Unify chemistry data/engine pathways and validation.
4. Harden formula parser and stoichiometry.
5. Correct reagent provenance/hazards and visualization claims.
6. Standardize local experiment persistence.
7. Verify probability reproducibility and edge cases.
8. Verify projectile formulas, assumptions, units, and edge cases.
9. Ground/test local LLM explanations, freshness, failures, privacy.
10. Complete accessibility/responsive and user-journey tests.
11. Consolidate docs/status.
12. Design Cloud Notebook API/data contract, threat and cost review.
13. Implement cloud notebook behind explicit config/feature flag, with mocks/local tests; do not deploy.
14. Stop and report for review before AWS provisioning.

# 12. Required final report

Provide:

1. Requirement traceability for every section/checklist item.
2. Summary and rationale.
3. Exact changed files and purpose.
4. Scientific result categories: calculated, estimated, illustrative, unsupported.
5. Persistence schema and save/restore/delete behavior.
6. Local LLM runtime/setup, privacy, limitations.
7. Cloud Notebook scope, contract, security choices, deferred work.
8. Exact test/build/lint/type-check commands run and observed results.
9. Known issues and product decisions needed.
10. Explicit confirmation that no AWS resources were provisioned or deployed.

Do not mark the project “AWS-ready” merely because the frontend builds or an infrastructure template exists.

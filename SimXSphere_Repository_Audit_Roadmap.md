# SimXSphere — Repository Audit and Implementation Roadmap

Repository reviewed: https://github.com/Manas8795/SimXSphere  
Review date: 2026-10-24  
Scope: Static review of public source files and documentation. The application and tests were not executed during this review, so findings should be confirmed locally.

## Executive recommendation

Finish the local chemistry simulator before expanding AWS, sharing, cloud persistence, or package bundling. The repository contains useful chemistry components, but its docs and older experiment model still describe probability/projectile simulations. There are correctness risks in chemistry parsing, heuristic synthesis, reaction consistency, and saved-run representation.

## P0 — Align project documentation and scope

- Rewrite root `README.md` to accurately describe the chemistry-focused application.
- Treat `SimXSphere_Chemistry_Project_README.md` as the MVP direction.
- Audit `PLANFILEHEREPLAN.md`, `READMEf.md`, and `files/*.md` for obsolete probability/projectile, SimXPack, and cloud-first instructions. Archive legacy docs or mark them explicitly as legacy/deferred.
- Keep the current Vite + React + TypeScript stack; do not rebuild from scratch.
- Do not provision AWS or add cloud features during the chemistry MVP.

**Acceptance:** Current instructions do not tell agents to build probability/projectile simulations as the core product. The root README accurately distinguishes implemented features from planned or deferred features.

## P1 — Correct formula parsing and equation validation

Primary file: `src/chemistry-engine/atom-counter.ts`

Current concern: a regular expression scans element symbols and digit suffixes but does not parse parentheses; malformed characters may be ignored rather than causing an error.

Tasks:
1. Build a tokenizer/parser supporting element symbols, integer subscripts, nested parentheses up to a documented depth, and leading reaction coefficients.
2. Strip only valid phase labels and accepted arrow forms; reject empty terms, unknown symbols, invalid characters, zero/negative subscripts, overflow, malformed coefficients, and missing equation sides.
3. Ensure every character in every formula is consumed by the parser.
4. Distinguish malformed input from a valid but unbalanced equation.
5. Validate element symbols against the known element dataset.
6. Add tests for `H2O`, `Ca(OH)2`, `Al2(SO4)3`, `Fe2(SO4)3`, coefficients, phase labels, invalid text, missing sides, multiple arrows, and unbalanced equations.

**Acceptance:** Malformed input never reports `Balanced`; grouped formulas produce correct counts; all parser tests pass.

## P1 — Replace broad synthesis claims with reviewed data

Primary file: `src/chemistry-engine/compound-builder.ts`

Current concern: after checking curated compounds, code falls back to an algorithmic binary synthesis engine. It derives bond type, physical state, energy-like values, and exothermic status using simplified heuristics. Such heuristics do not establish whether a compound forms, its actual thermodynamics, state, or molecular geometry.

Tasks:
1. For the MVP, use curated, reviewed compound results only.
2. If a formula heuristic is retained, label its output as a candidate-formula/valence exercise, separate from verified reaction prediction.
3. Remove fabricated energy and state outputs from heuristic paths; show unavailable when values are not verified.
4. Add source/version metadata to catalogue entries for formulas, names, molar masses, states, and formation data where sourced.
5. Mark unreviewed combinations as unsupported.
6. Add tests for all enabled catalogue entries and unsupported combinations.

**Acceptance:** A result described as supported has a curated source; no invented energy values or reaction occurrence claims are presented as facts.

## P1 — Unify reaction simulation pathways

Current paths include:
- `src/chemistry-engine/workplane-solver.ts`
- `src/core/simulations/chemistry.ts`
- `src/chemistry-engine/compound-builder.ts`
- `src/chemistry-engine/atom-counter.ts`
- `src/chemistry-engine/stoichiometry-calc.ts`

Tasks:
1. Define one reviewed reaction catalogue with stable IDs, reactants, products, coefficients, type, assumptions, references, and limitations.
2. Make the workplane and aqueous view use the same core reaction engine/catalogue.
3. Keep calculations in pure modules independent of React and the DOM.
4. Validate equation atom counts for every catalogue entry in tests.
5. Unsupported combinations must return a typed unsupported outcome instead of averaged pH or fabricated products.
6. Distinguish illustrative pH/temperature animation from scientifically calculated values. Do not present fixed values as live physical predictions.
7. Use a small, academically reviewed, lower-risk set of introductory examples for the MVP.

**Acceptance:** The same supported reactants yield consistent results in all views; every reaction is referenced and tested for atom conservation.

## P1 — Fix experiment data model and local save flow

Primary files:
- `src/ui/views/ChemistryView.tsx`
- `src/core/experiment/types.ts`
- `src/core/experiment/validate.ts`
- `src/storage/StorageAdapter.ts`
- `src/storage/localAdapter.ts`
- `src/App.tsx`

Current concern: `ChemistryView.tsx` wraps a chemistry run in the old `probability` schema with coin parameters, trial counts, and results counts. This misrepresents the experiment and means saved records may not faithfully describe chemistry.

Tasks:
1. Create a versioned `ChemistryExperiment` record with run ID, timestamp, catalogue/engine version, reactants and quantities/concentrations where relevant, reaction ID, conditions/assumptions, equation, products, validation status, explanations, and source/reference pointer.
2. Create a chemistry-specific validator instead of forcing chemistry into `ExperimentType = 'probability' | 'projectile'`.
3. Update local save/list/load/delete and notebook UI for chemistry records.
4. Make saved output reproducible from stored inputs, or persist computed outputs with their catalogue/engine version.
5. Start the notebook empty rather than initializing demo records as if the user performed them.
6. Test save/load/refresh/delete and invalid stored JSON.
7. Retire or explicitly quarantine old experiment/SimXPack types; do not silently couple the chemistry app to them.

**Acceptance:** A saved run is a chemistry record, survives reload with its original inputs/results, and is not mislabeled as a probability experiment.

## P1 — Strengthen stoichiometry input validation

Primary file: `src/chemistry-engine/stoichiometry-calc.ts`

Tasks:
- Reject empty reactants, invalid product data, non-finite values, negative masses, non-positive molar masses, invalid coefficients (non-integers or <= 0), and missing/invalid formulas.
- Confirm equation/formula consistency before computing yields.
- Handle zero inputs as explicit validation errors/results rather than silently choosing a zero-mole limiting reagent.
- Test multiple reactants, limiting reagent, exact stoichiometric amounts, excess remainder, invalid inputs, and mass balance with a documented tolerance.
- Do not claim the mass check proves the model's reaction chemistry is correct.

**Acceptance:** Invalid inputs cannot yield plausible result cards; calculations pass tests with independently checked expected values.

## P2 — Fix known data/UI mismatch and reduce MVP scope

- In `src/components/SynthesisReactor.tsx`, the preset labelled `Rust (Iron Oxide)` selects Fe + S, and the catalogue maps Fe:S to FeS (iron sulfide). Rename it to iron sulfide or replace it with a properly reviewed iron oxide example and equation.
- Separate element reference visibility from the `supportedInReactor` flag in `src/chemistry-data/elements.ts`. Only enable elements with actual tested catalogue rules.
- Review reagent hazards, formulas, states, properties, and molecular diagrams in `src/chemistry-data/reagents.ts`. Add provenance and mark simplified drawings.
- In `src/components/Molecule3DViewer.tsx`, prioritize ball-and-stick views for a small number of curated molecules. Do not present orbital/quark/de Broglie-themed visuals as physically accurate without validated models and explanations.
- Simplify navigation around Reaction Lab, Periodic Table, Compound Explorer, and Lab Notebook. Complete one end-to-end route before adding screens.
- Improve keyboard interaction, accessible labels, focus indicators, responsive layout, and unsupported/error states.
- Use functional React state updates or a persistence service to avoid stale history closures during concurrent saves.

## P2 — Testing and quality gates

Before calling the local MVP complete, run and report actual output for:
- `npm test`
- `npm run build`
- `npm run lint`

Do not claim they pass until executed. Add end-to-end coverage for:
1. New local session starts with empty history.
2. Select supported example.
3. Run it.
4. Show equation and atom-validation status.
5. Try unsupported combination.
6. Save, refresh, reload, delete a run.
7. Test malformed formula and invalid numerical inputs.
8. Test narrow layout and keyboard use.

Use independently reviewed expected results, not tests that merely restate heuristic output.

## P3 — AWS work later, not in the chemistry MVP

Files to quarantine/review before future deployment:
- `src/storage/awsAdapter.ts`
- `infra/template.yaml`
- `infra/lambda/api.ts`
- `.env.example`
- `files/AWS_FREE_COST_CHECKLIST.md`
- `files/ARCHITECTURE.md`

The current Lambda code includes placeholder/mock presigned URLs and returns an empty package list. Do not describe it as production-ready or deploy it as functional cloud storage.

Future AWS gate:
1. Finalize the chemistry persistence model first.
2. Document the intended cloud use case rather than automatically reusing the old SimXPack scope.
3. Implement real API/storage adapter behavior and tests against a local mock.
4. Derive caller identity from a verified token and enforce object/metadata ownership server-side.
5. Implement real short-lived presigned URLs and private bucket configuration.
6. Validate payload sizes and metadata; review CORS, error handling, log redaction, and teardown.
7. Check current pricing/free-plan eligibility for the actual account and region. Do not promise unconditional zero cost.
8. Deploy only after explicit approval and a cost review.

Until then, keep local mode usable without AWS credentials and leave infrastructure unprovisioned.

## Recommended milestone order

- **M1:** Documentation and scope alignment.
- **M2:** Formula parser and equation validator.
- **M3:** Curated compound/reaction data and unified engine.
- **M4:** Chemistry-specific local experiment schema and notebook.
- **M5:** UI/accessibility/responsive cleanup and data provenance.
- **M6:** Automated tests, build/lint gates, and academic demo evidence.
- **M7:** Review AWS architecture and costs; implement only after local MVP approval.

## Agent operating rules

- Inspect exact current files before editing.
- Preserve useful chemistry UI and tests; avoid large rewrites.
- Work one milestone at a time.
- Make focused edits and run relevant tests.
- Report changed files and actual test output honestly.
- Do not add AWS/storage/sharing/compression before the local chemistry MVP is approved.
- Do not claim chemistry correctness from generated output alone; catalogue facts need review and provenance.

## Suggested coding-agent prompt

Read `SimXSphere_Chemistry_Project_README.md` and this audit roadmap completely. First inspect the current repository files and summarize the exact conflicts between the old docs and the chemistry MVP. Do not make broad changes or add features yet. Propose a milestone-sized plan for M1 (documentation/scope alignment) and list the files you intend to edit. Preserve the existing chemistry UI, and do not deploy AWS resources or run AWS CLI commands. Wait for approval before making broad edits. When implementation is approved, report actual commands and results; never claim tests passed unless executed.

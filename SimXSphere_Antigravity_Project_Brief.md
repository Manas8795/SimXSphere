# SimXSphere — Repository Audit, Product Direction, and Antigravity Implementation Brief

**Repository:** https://github.com/Manas8795/SimXSphere  
**Purpose:** This document is the implementation brief for Antigravity or another coding agent working in the SimXSphere repository.  
**Review context:** Static review of the public repository source and documentation. The reviewer did not execute the application or test suite. Verify all observations against the current local checkout before editing.

---

## 1. Product direction

SimXSphere should become a locally hosted educational simulation platform with **two clearly separated feature areas**:

1. **Chemistry Simulation Lab** — the primary, focused chemistry learning and reaction-testing experience.
2. **Probability and Projectile Simulations** — a separate educational simulation area containing probability experiments and idealized projectile-motion simulation.

The chemistry simulator must not be merged conceptually with probability or projectile simulations. Each feature area should have its own UI, domain data, engine, validation, and saved-run representation where appropriate. They may share application-level design components, navigation, accessibility utilities, and a generic persistence boundary only when that boundary does not force incompatible domain models together.

The app is currently intended to be **locally hosted**. AWS is a later phase. Do not provision cloud resources, deploy infrastructure, or expand file sharing/cloud storage while implementing the local feature set.

### Product goals

- Offer a compact but useful academic chemistry testing environment.
- Preserve and provide probability and projectile-motion learning simulations as independent modules.
- Keep scientific results transparent, bounded, and testable.
- Use a natural scientific website design—not a generic AI dashboard.
- Build incrementally and retain useful existing code.
- Avoid overstating scientific accuracy or treating simplified educational models as real-world predictions.
- Keep local use fully functional without AWS credentials or network services.

### Out of scope until separately approved

- General-purpose reaction prediction or universal chemistry simulation.
- Quantum chemistry, molecular dynamics, or experimentally predictive molecular modeling.
- Cloud deployment, authentication, remote storage, sharing, and SimXPack/package transfer.
- Broad new simulation types beyond chemistry, probability, and projectile motion.
- Large-scale rewrites without a documented reason.

---

## 2. Required first step for Antigravity

Before changing files:

1. Read this document completely.
2. Inspect the repository's current branch, status, and structure.
3. Read the root README and all current project/architecture/implementation instructions.
4. Specifically inspect and reconcile:
   - `README.md`
   - `SimXSphere_Chemistry_Project_README.md` (if present)
   - `PLANFILEHEREPLAN.md` (if present)
   - `READMEf.md` (if present)
   - `files/` and `docs/` documentation
   - current tests and package scripts
5. Report:
   - Current app architecture and working features.
   - Which code is chemistry-specific, probability-specific, projectile-specific, shared, legacy, or incomplete.
   - Which files and instructions conflict with the updated product direction.
   - The proposed implementation plan and acceptance criteria for the first milestone.
6. **Do not begin broad edits until the user approves the plan.**

Preserve useful code and tests. Do not change unrelated files. Do not add dependencies without explaining why. Do not claim that tests pass unless they have actually been run and their output checked.

---

## 3. Documentation and scope alignment — highest priority

The repository's root README has been described as still reflecting the earlier probability/projectile and SimXPack/cloud-first platform, while chemistry components have already been added.

### Required changes

- Rewrite the root README to describe the current SimXSphere platform and its three bounded simulation modules:
  - Chemistry Simulation Lab
  - Probability Simulations
  - Projectile Motion Simulation
- Describe chemistry as the primary current development focus, while probability and projectile motion are separate feature modules.
- Clearly label unfinished capabilities as planned, prototype, or deferred.
- Review all agent prompts and project plans so they do not direct the agent to rebuild the old app or prioritize AWS/package sharing.
- Preserve historical docs only if they are clearly labeled **legacy / historical / not current implementation instructions**.
- Add or update a concise architecture overview and local setup/testing instructions.

### Documentation acceptance criteria

- No current top-level instruction says probability or projectile simulation is the only product.
- Chemistry is not described as a probability experiment or stored in a probability schema.
- Probability and projectile simulations remain separate feature areas.
- AWS and sharing are explicitly deferred.
- README feature descriptions match what is actually implemented.

---

## 4. Chemistry Simulation Lab

### 4.1 Product scope

Build a bounded educational chemistry testing environment. Users should be able to:

1. Browse a periodic table.
2. Inspect element details.
3. Select supported elements or curated substances.
4. Explore supported compounds.
5. Select a reviewed reaction from a limited catalogue.
6. Run the supported educational simulation.
7. View the balanced equation, reactants/products, atom counts, validation state, explanation, assumptions, and limitations.
8. Optionally view a simple illustrative molecular/particle visualization.
9. Save and reopen chemistry runs locally.

This is not a universal reaction predictor. Unknown combinations should be reported as unsupported instead of generating plausible-looking but unverified chemistry.

### 4.2 Chemistry formula parser and equation validation

**Primary file to inspect:** `src/chemistry-engine/atom-counter.ts`

A previous static review observed a regular-expression-based parser that may not handle grouped formulas such as `Ca(OH)2` and may ignore invalid characters. Confirm this in the current checkout.

#### Tasks

- Implement or improve a proper formula tokenizer/parser.
- Support element symbols, integer subscripts, parentheses and a documented nesting limit.
- Support reaction coefficients and accepted phase labels only where the equation parser explicitly handles them.
- Reject:
  - Unknown element symbols.
  - Invalid characters.
  - Empty formula terms.
  - Missing reactant/product sides.
  - Invalid or non-positive subscripts and coefficients.
  - Malformed parentheses.
  - Multiple or invalid reaction arrows.
  - Unconsumed text after parsing.
- Distinguish a malformed equation from a valid but unbalanced equation.
- Never report malformed input as balanced.

#### Test cases

At minimum test:

- `H2O`
- `Ca(OH)2`
- `Al2(SO4)3`
- `Fe2(SO4)3`
- Reaction coefficients
- Phase labels such as `(s)`, `(l)`, `(g)`, `(aq)` if supported
- Unknown element symbol
- Invalid trailing characters
- Empty equation side
- Incorrect parentheses
- A valid but unbalanced equation

**Acceptance:** grouped formulas have correct atom counts, and malformed formulas/equations never receive a “Balanced” status.

### 4.3 Curated compound and reaction data

**Primary files to inspect:**

- `src/chemistry-engine/compound-builder.ts`
- `src/chemistry-data/elements.ts`
- `src/chemistry-data/reagents.ts`
- `src/core/simulations/chemistry.ts`
- `src/chemistry-engine/workplane-solver.ts`

A prior static review observed an algorithmic binary synthesis fallback using simplified valence/electronegativity heuristics and estimated properties. Verify the exact current behavior.

#### Required direction

- Use a small, reviewed catalogue as the source of truth for supported compounds and reactions.
- Include data provenance where practical: source, data version, and review note.
- Include properties only when supported by a reliable source.
- Do not infer actual reaction occurrence, physical state, enthalpy, exothermicity, pH, or temperature change solely from a simple heuristic.
- If formula generation is retained, label it clearly as a **candidate-formula or valence exercise**, not a verified compound/reaction prediction.
- For unsupported combinations, return a typed “Unsupported” result with a helpful explanation.
- Do not invent missing chemistry facts.

Each reviewed reaction should carry enough information to support the UI and tests, for example:

- Stable reaction ID
- Reactants and coefficients
- Products and coefficients
- Balanced equation
- Reaction category
- Assumptions and limitations
- Source/reference metadata
- Data/catalogue version

Keep the reaction set small and suitable for an academic demonstration. Review safety and avoid giving real-world hazardous mixing instructions.

### 4.4 Unify chemistry engine pathways

The repository has multiple chemistry pathways, including the workplane and aqueous/reaction simulation logic. Multiple pathways can produce inconsistent results.

#### Tasks

- Define a common reaction catalogue and common result type.
- Have all relevant chemistry views call the same tested core engine.
- Keep domain calculations in pure modules independent of React/UI.
- Keep presentation-only animation values separate from actual calculated chemistry.
- Explicitly mark illustrative values as illustrative.
- Validate atom conservation for each supported reaction as part of automated tests.

**Acceptance:** the same supported reactants produce consistent results in every view that offers that reaction.

### 4.5 Stoichiometry validation

**Primary file:** `src/chemistry-engine/stoichiometry-calc.ts`

Review input boundaries and validate:

- Empty/missing reactants or products
- Non-finite numbers
- Negative or zero mass where not explicitly supported
- Invalid or non-positive molar masses
- Invalid or non-positive coefficients
- Formula/equation mismatch
- Zero-amount inputs and limiting-reagent edge cases
- Multiple reactants and excess reactant calculations

Use documented tolerances for numerical conservation checks. A mass-balance check is not proof that a reaction itself is chemically valid.

**Acceptance:** invalid inputs cannot generate plausible-looking results; limiting-reagent and mass calculations have independently checked test expectations.

### 4.6 Chemistry experiment notebook and local persistence

**Files to inspect:**

- `src/ui/views/ChemistryView.tsx`
- `src/core/experiment/types.ts`
- `src/core/experiment/validate.ts`
- `src/storage/StorageAdapter.ts`
- `src/storage/localAdapter.ts`
- `src/App.tsx`

A prior static review observed chemistry runs being mapped into the old probability experiment schema (coin parameters, trial counts, or probability result fields). Confirm and correct this.

#### Required changes

- Define a chemistry-specific, versioned saved-run model.
- A saved run should preserve relevant information such as:
  - Run ID and timestamp
  - Chemistry catalogue/engine version
  - Reaction ID
  - Reactants and amounts/conditions where applicable
  - Equation and products
  - Atom validation status
  - Computed output and explanatory note
  - Assumptions/limitations and source reference
- Do not use `type: "probability"` for chemistry.
- Implement local save/list/load/delete and refresh persistence.
- Start with an empty notebook; do not seed fake experiments as though the user performed them.
- Handle malformed stored data safely.
- Ensure save/reload retains the original chemistry input and output.
- Use functional React state updates or a single persistence service to avoid stale-state data loss.

**Acceptance:** a chemistry record is a chemistry record, is not mislabeled, and can be saved, reloaded, displayed, and deleted.

### 4.7 Periodic table and reagent data

**Files:** `src/chemistry-data/elements.ts`, `src/chemistry-data/reagents.ts`, `src/components/PeriodicTable.tsx`

- Separate “element is available as reference data” from “element is supported by the simulation engine.”
- Do not enable all 118 elements for reaction simulation unless actual rules/data/tests support them.
- Audit names, formulas, states, molar masses, valences, hazards, and geometry data.
- Add provenance for educational facts.
- Show unsupported status clearly.
- Keep the periodic table useful as a reference without implying every element can participate in a supported simulation.

### 4.8 Molecular visualization

**Primary file:** `src/components/Molecule3DViewer.tsx`

- Prioritize a simple ball-and-stick representation for a small number of reviewed molecules.
- Include atom labels, a legend, and a clear note that the visualization is illustrative where appropriate.
- Do not imply that a stylized 3D picture is a quantum-accurate or experimentally verified model.
- Avoid adding advanced orbital, quark, or de Broglie-themed visualizations unless the science and explanatory model are validated and useful for the MVP.

### 4.9 Known data/UI mismatch to check

A previous static review found a preset labeled **“Rust (Iron Oxide)”** that selected iron and sulfur, while the data mapped that pair to iron sulfide (`FeS`).

- Verify this in the current checkout.
- Rename the preset to iron sulfide if that is what it represents, or replace it with a correctly reviewed iron oxide example and equation.
- Add a test so this mismatch cannot return.

---

## 5. Probability simulations — separate feature area

Probability simulations are an independent educational module, not part of the chemistry engine.

### Expected MVP

- Probability simulation landing page or module.
- A clearly defined probability experiment such as coin tosses, dice, or another already implemented experiment.
- User-configurable inputs with validation.
- Run and reset actions.
- Display outcome counts, proportions/empirical probabilities, and an appropriate chart or table.
- Reproducible output when a seed is supported.
- Explanation of theoretical probability versus observed experimental frequency.
- Separate probability experiment record schema if saving is supported.

### Engineering rules

- Keep probability calculations in pure functions, separate from UI.
- Validate number of trials and other parameters.
- Handle zero, invalid, too-large, and non-finite input values.
- Do not couple the probability engine to chemistry-specific models or records.
- Preserve existing working probability code and tests if it is correct.
- Avoid expanding the module beyond its agreed scope during chemistry correctness work.

### Acceptance criteria

- Probability module can be navigated to and used independently.
- Inputs are validated and errors are understandable.
- Counts/proportions are calculated correctly and checked by tests.
- Reproducibility is tested if seeded randomness is used.
- Probability runs are not represented as chemistry experiments.

---

## 6. Projectile-motion simulation — separate feature area

Projectile motion is an independent physics/kinematics learning module, separate from chemistry and probability.

### Expected MVP

- A projectile simulation page/module.
- Inputs such as initial speed, launch angle, and gravity selection/value.
- Run and reset actions.
- Calculated trajectory, flight time, range, and maximum height under the stated model.
- A plotted trajectory with axes and units.
- A visible model limitation, for example: **“Idealized model; air resistance is not included.”**
- Input validation and handling of edge cases such as zero speed and launch angles near 0°/90°.

### Engineering rules

- Keep projectile calculations in pure functions.
- Validate finite and physically meaningful inputs.
- Avoid `NaN`/infinite output.
- Do not imply a real-world prediction when the model omits drag or other forces.
- Preserve existing working projectile code and tests.
- Keep projectile saved-run records distinct from chemistry records.

### Acceptance criteria

- Projectile module can be used independently.
- Results and trajectory use consistent units.
- Edge cases are tested.
- The model assumption is visible in the UI.
- Projectile records are not stored as chemistry or probability records.

---

## 7. Shared application structure and UI

The application may share:

- Navigation and app shell
- Scientific visual design tokens
- Buttons, forms, modal/dialog primitives
- Accessibility utilities
- Error/loading/empty-state components
- General local persistence utilities, provided they preserve domain-specific schemas

Keep separate:

- Chemistry data and engine
- Probability engine and probability experiment model
- Projectile engine and projectile experiment model
- Domain validation and output types

### Recommended navigation

- **Home / Simulation Hub**
  - Chemistry Simulation Lab
  - Probability Simulations
  - Projectile Motion
- **Chemistry**
  - Reaction Testing Lab
  - Periodic Table
  - Compound Explorer
  - Chemistry Notebook
- **Probability**
  - Probability Experiment
  - Probability History/Notebook if implemented
- **Projectile**
  - Projectile Simulator
  - Projectile History/Notebook if implemented

Do not make every subview a top-level nav item if that creates clutter. Prioritize a coherent main workflow.

### Scientific website visual direction

Use a natural scientific, academic, calm visual style:

- Light paper/off-white backgrounds
- Readable dark text
- Restrained teal, green, blue, and mineral-inspired accent colors
- Clear scientific diagrams and data visualizations
- Proper chemical subscripts and superscripts
- Thoughtful spacing and typography
- Periodic-table colors with a clear legend
- Responsive layout and strong keyboard focus states

Avoid:

- Generic AI dashboard layouts
- Excessive neon, glows, gradient panels, or gaming HUD visuals
- Unnecessary 3D decoration
- Visual effects that compete with scientific content

### Accessibility and UX

- Keyboard navigation for tabs, forms, and controls
- Accessible labels and status messages
- Visible focus indicators
- Responsive laptop and phone layouts
- Clear empty, loading, error, unsupported, and success states
- No dead buttons or actions that look functional but do nothing
- No sample data represented as user-generated activity

---

## 8. Testing and quality gates

Inspect `package.json` and use the repository's actual commands. Do not invent commands if scripts differ.

Before calling the local MVP complete, run and report real output for applicable commands such as:

- `npm test`
- `npm run build`
- `npm run lint`
- Existing end-to-end test command, if configured

### Integration journeys

1. Start with empty local history.
2. Open the Chemistry Lab.
3. Select a supported curated reaction.
4. Run it.
5. View equation and atom validation.
6. Try an unsupported combination and confirm it is clearly rejected.
7. Save, refresh, reopen, and delete a chemistry run.
8. Test invalid formulas and invalid numeric values.
9. Open and run a probability simulation independently.
10. Open and run projectile motion independently.
11. Test responsive layout and keyboard interaction.
12. Confirm no unexpected console errors.

Tests should use independently verified expected values, not merely restate the output of a heuristic.

Do not claim test/build/lint success without running the commands.

---

## 9. AWS — future phase only

The app is local-first for now. AWS work must wait until the local chemistry, probability, and projectile experiences are working and the user explicitly approves cloud work.

### Existing AWS prototype review

Files to inspect before any future AWS work:

- `src/storage/awsAdapter.ts`
- `infra/template.yaml`
- `infra/lambda/api.ts`
- `.env.example`
- `files/AWS_FREE_COST_CHECKLIST.md`
- `files/ARCHITECTURE.md`

A previous static review observed that the current Lambda code includes placeholder/mock presigned URLs and an empty package list, and that some AWS adapter methods are no-ops. Confirm these against the current checkout. Do not label the current implementation as production-ready cloud storage.

### AWS readiness requirements, when approved

1. Finalize domain-specific persistence models first.
2. Identify the actual cloud use case and avoid reintroducing deferred package-sharing features without approval.
3. Implement real API and storage behavior.
4. Derive identity from a verified token and enforce ownership server-side.
5. Implement real, short-lived presigned upload/download URLs if required.
6. Keep private bucket settings, validate payloads and metadata, review CORS, errors, log redaction, and teardown.
7. Add tests using mocked AWS clients; no network required for unit tests.
8. Review the actual account, region, eligibility, and current pricing before provisioning.
9. Never claim a guaranteed `$0` cost. Free-tier terms and account eligibility vary.
10. Keep local mode working without AWS credentials.
11. Do not run `aws`, `sam deploy`, or create resources unless the user explicitly authorizes it.

**Until this phase is approved: do not add AWS integration, cloud storage, sharing, or compression to the local MVP.**

---

## 10. Suggested milestone order

### Milestone 1 — Repository and documentation alignment
- Inspect current repo and branch.
- Reconcile README, plans, and agent prompts.
- Confirm the product has chemistry, probability, and projectile as separate areas.
- Present plan and wait for approval before broad edits.

### Milestone 2 — Chemistry parser and validation
- Implement robust formula parsing.
- Add grouped formula and malformed-input tests.
- Ensure malformed input never appears balanced.

### Milestone 3 — Reviewed chemistry catalogue and unified engine
- Curate supported compounds and reactions.
- Remove or relabel unsupported heuristic predictions.
- Unify chemistry UI paths around one engine.
- Test conservation and supported/unsupported behavior.

### Milestone 4 — Chemistry local notebook
- Create chemistry-specific saved-run schema.
- Fix local persistence and empty-history behavior.
- Test save, reload, refresh, and delete.

### Milestone 5 — Separate probability and projectile modules
- Review current implementations.
- Preserve useful code.
- Ensure each has a clear route, own engine/model, validation, and tests.
- Fix any shared schema coupling.

### Milestone 6 — UI and accessibility polish
- Scientific visual direction
- Responsive layouts
- Keyboard accessibility
- Empty/error/loading/unsupported states
- Remove dead controls and misleading sample content

### Milestone 7 — Verification and academic demo
- Run tests, lint, build, and end-to-end checks.
- Record real output.
- Prepare screenshots and a clear explanation of scope and model limitations.
- Document known gaps honestly.

### Milestone 8 — AWS design and implementation (later, with explicit approval)
- Architecture review
- Cost and account eligibility review
- Security and ownership design
- Implementation and tests
- Manual deployment only after approval

---

## 11. Agent operating rules

- Treat this document as the current product direction.
- Inspect exact current files before editing; do not rely on stale repository summaries.
- Preserve useful existing code and tests.
- Avoid broad rewrites and unrelated file changes.
- Work milestone by milestone.
- Explain why a dependency is needed before adding it.
- Never invent chemistry data, physical properties, or test results.
- Make unsupported cases explicit.
- Keep chemistry, probability, and projectile domain models separate.
- Do not provision AWS resources or run deployment commands.
- After each approved milestone, report:
  - Files changed
  - Behavior changed
  - Tests/commands actually run and their results
  - Known limitations
  - Proposed next milestone

**First response required from Antigravity:** summarize the current repository, identify conflicting documentation and legacy code, map existing components to Chemistry / Probability / Projectile / Shared / Deferred, and propose a small Milestone 1 plan. Wait for user approval before editing.

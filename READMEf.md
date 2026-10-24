# SimXSphere — Chemistry Simulation Lab

> **Project-direction update:** This document supersedes the earlier probability-distribution and projectile-motion concept. Refocus SimXSphere as a compact educational chemistry simulation and reaction-testing website. Read this file before changing the existing repository.

## 1. Project overview

**SimXSphere** is a browser-based virtual chemistry learning environment. Students explore a periodic table, select supported elements or predefined substances, try a limited set of compound-building examples and reactions, inspect formulas and balanced equations, and see simple illustrative molecular diagrams.

This is an academic testing simulator, not a professional chemistry package or a substitute for supervised laboratory work. It must only predict outcomes for explicitly supported, reviewed examples. If a combination is unsupported, it must say so rather than inventing a product.

**Suggested academic title:** *SimXSphere: An Interactive Virtual Chemistry Simulation and Reaction Testing Platform*

### Name
- **Sim** — Simulation
- **X** — eXploration (export/transfer may be reconsidered later)
- **Sphere** — One unified environment for chemistry experiments and results

## 2. Main objective

Create a small but expandable application where users can:
1. Browse a visual periodic table.
2. Select an element and inspect basic properties.
3. Build a few supported compounds using guided examples.
4. Choose reactants from a curated reaction catalogue.
5. Run a conceptual reaction simulation and view the supported products.
6. Inspect the chemical formula, balanced equation, atom counts, and a short explanation.
7. See a simple 2D molecular/particle representation where appropriate.
8. Try supported examples, reset the workspace, and optionally keep recent tests in browser-local storage.

The product is the chemistry simulation experience. It is not a management system, a general-purpose file-sharing platform, or an AI/ML application.

## 3. Keep the MVP intentionally small

The project must be achievable by one undergraduate student using an IDE and AI coding agents. Implement a reliable, testable subset rather than claiming to simulate all chemistry.

### Module A — Interactive periodic table
- Display element symbols, names, atomic numbers, and categories.
- Selecting an element opens a detail panel.
- Mark which elements are supported by the simulation engine.
- Other elements may appear as reference-only, clearly marked “not supported for reaction simulation.”
- Use a reviewed, consistent source for element data; document it. Do not invent properties.
- A small initial supported set is acceptable. Candidate elements include H, O, C, N, Na, Cl, Mg, Ca, and S, but only enable elements for which the supported examples and rules are implemented and tested.

### Module B — Guided compound builder
Start with a small curated list, such as:
- Water (H₂O)
- Carbon dioxide (CO₂)
- Sodium chloride (NaCl)
- Magnesium oxide (MgO)
- Calcium chloride (CaCl₂)

These are examples, not a promise that arbitrary selected elements can be combined into a correctly predicted compound.

Requirements:
- Render formulas with proper subscripts.
- Explain the supported rule or example.
- For supported ionic compounds, show charge-balancing logic.
- For covalent compounds, use curated validated formulas rather than claiming a simple valence heuristic predicts full molecular structure.
- Show “unsupported combination” when the engine cannot justify a result.

### Module C — Reaction simulator and reaction testing
- Implement a small curated catalogue of introductory, classroom-level reactions.
- Each supported reaction must include reactant formulas, product formulas, balanced coefficients, reaction type, a short explanation, assumptions/conditions at a high conceptual level, and a trustworthy educational reference.
- Candidate examples may include formation of water, a simple acid-base neutralization, and a carbonate-acid reaction, but include only reactions that are reviewed and tested.
- Do not infer products for arbitrary reactants. If no catalogue entry matches, return “reaction not supported.”
- Do not provide hazardous experimental procedures, real-world mixing instructions, operational quantities, temperatures, pressures, or steps for dangerous reactions. The output is conceptual education only.

### Module D — Equation and atom-count validation
- Show balanced equations for supported reactions.
- Implement a testable atom-count function.
- Confirm each element has the same total atom count on both sides.
- Display a clear status: “Balanced,” “Not balanced,” or “Unsupported reaction.”
- Do not silently label an equation balanced when validation fails.
- A general equation-balancing algorithm is optional and must be separate from the curated reaction catalogue, tested, and documented with limitations.

### Module E — Simple visualization
- Show a simple 2D atom/molecule or particle illustration for supported examples.
- Include a color legend and labels.
- State that the diagram is illustrative and not necessarily an accurate molecular geometry.
- Avoid complex 3D engines, elaborate animation, or high-fidelity molecular dynamics in the MVP.

### Module F — Testing workspace
- Show selected reactants, validation messages, supported products, equation, atom-count status, and explanation.
- Include load-example, run, reset, and clear controls.
- Optional recent-run history may use browser-local storage.
- Every visible button must work. Do not leave placeholder controls.

## 4. What it is and is not

**It is:** a browser-based chemistry learning tool, a guided compound/reaction explorer, and a testable implementation of a finite set of reviewed chemistry rules and examples.

**It is not:** a universal reaction predictor, a quantum-chemistry engine, a molecular-dynamics simulator, a guarantee that a reaction occurs in a real laboratory, or a replacement for a teacher, lab supervisor, or formal safety guidance.

## 5. Website design direction

Use a **natural scientific theme** resembling a modern digital science textbook or a calm virtual laboratory—not an AI dashboard, crypto interface, gaming HUD, or neon sci-fi website.

- Light, paper-like white/off-white background.
- Dark, readable text and restrained natural accents such as teal, green, blue, or mineral tones.
- Clear typography, spacing, labels, units, and accessible contrast.
- Periodic-table cells color-coded by element category with a visible legend.
- Scientific diagrams, formula notation, and structured information panels.
- Subtle transitions are fine; avoid glowing gradients, decorative 3D objects, excessive animation, and “AI-looking” visuals.
- Responsive layout for laptop and tablet, with mobile support where practical.
- Use proper chemical subscripts in formulas.
- Prioritize clarity and correctness over visual effects.

Suggested main views:
1. Home / Lab overview.
2. Periodic Table.
3. Compound Builder.
4. Reaction Lab.
5. Results panel with equation, atom validation, visualization, explanation, and limitations.
6. Optional recent tests.

Complete one working end-to-end flow before adding extra screens.

## 6. Technical approach

Inspect the existing repository and retain its current stack if sensible. Do not rewrite working code without a reason. Keep the architecture simple and separate:
- `chemistry-data/`: reviewed element, compound, and reaction datasets.
- `chemistry-engine/`: pure functions for lookup, formula parsing, atom counting, supported compound rules, reaction matching, and validation.
- `components/`: periodic table, element details, compound builder, reaction selector, equation display, and visualization.
- `pages/` or `app/`: application views/routes.
- `storage/`: optional browser-local history.
- `tests/`: unit and integration tests.

Keep chemistry rules separate from UI components. Do not place all logic in one giant component. Use the existing framework unless there is a clear reason to change it.

If a repository already exists:
1. Inspect its files and current README.
2. Identify reusable code.
3. Present a concise change plan before broad edits.
4. Preserve useful code and tests.
5. Remove or deprecate the old probability/projectile modules only after confirming they are no longer in scope.
6. Update navigation and documentation consistently.
7. Avoid unrelated refactoring.

## 7. AWS and cost policy for this phase

**Do not implement AWS integration in the chemistry MVP.** The user wants no cloud costs and does not want paid AWS services.

- Build and test locally first.
- Do not provision AWS resources, create buckets, deploy APIs, or add cloud SDKs in this phase.
- Do not claim AWS is “free in all conditions.”
- Keep persistence modular so cloud storage can be considered in a later phase, but do not implement it now.
- The application must run without AWS credentials, an AWS account, paid APIs, or external paid services.
- File sharing, cloud storage, ZIP compression, and transfer features are deferred until the chemistry simulator is complete and approved.
- If AWS is considered later, verify account-specific eligibility against current official AWS pricing/free-tier documentation before deployment. If absolutely no possibility of charges is required, do not deploy to AWS.

## 8. Testing requirements

Create automated tests for:
- Element lookup and unsupported elements.
- Formula parsing and atom counting.
- Formula display/subscript formatting.
- Supported compound examples and expected formulas.
- Reaction matching for supported reactants.
- Balanced-equation validation.
- Unsupported combinations.
- Empty/invalid input handling.
- UI flow from choosing an example to seeing the validated result.
- Every curated reaction, including atom conservation.

For every reaction, verify that each element’s total atom count is equal on both sides. Review chemistry content rather than trusting generated output without validation.

Manual test checklist:
1. Open the app.
2. Select a supported element and inspect its details.
3. Open a curated compound example.
4. Run a supported reaction.
5. Verify the equation and atom-count status.
6. Try an unsupported combination and confirm that no product is fabricated.
7. Reset the workspace.
8. Check responsive layout and keyboard navigation.

## 9. Academic requirements

Document the problem statement, objectives, scope/limitations, functional and non-functional requirements, supported chemistry catalogue, data sources, architecture, chemistry rules, test plan, actual test evidence, screenshots, demo script, future work, report outline, and viva questions.

Do not claim that the application predicts all reactions. Academic strength should come from a clear scope, validated data, correct atom balancing, understandable architecture, and thorough testing.

## 10. Implementation milestones

**Milestone 1 — Repository review and UI foundation**
- Inspect the repository and identify the current framework.
- Propose changes before editing.
- Build the natural scientific theme, app shell, navigation, and responsive layout.
- Acceptance: app runs locally and navigation works.

**Milestone 2 — Periodic table**
- Add reviewed element data and selection/detail views.
- Acceptance: displayed properties come from the data source; unsupported elements are marked clearly.

**Milestone 3 — Compound builder**
- Implement a few curated compounds, formula display, and explanation.
- Acceptance: supported examples are covered by tests and display correct formulas.

**Milestone 4 — Reaction simulator**
- Add a small reviewed reaction catalogue and output display.
- Acceptance: every included reaction is balanced, referenced, and tested.

**Milestone 5 — Validation and visualization**
- Implement atom counting and equation validation.
- Add simple illustrative 2D diagrams.
- Acceptance: validation catches deliberately unbalanced equations; visuals are labeled as simplified.

**Milestone 6 — End-to-end testing and polish**
- Complete automated/manual tests, accessibility, responsive layout, empty/error states.
- Acceptance: all tests pass and unsupported inputs fail safely.

**Milestone 7 — Academic documentation**
- Update README, architecture, supported chemistry catalogue, tests, limitations, demo script, and viva notes.
- Acceptance: the student can explain the chemistry model, implementation, and limitations.

Cloud storage, sharing, compression, and AWS deployment are future phases only.

## 11. What the implementation agent must do first

Before coding:
1. Summarize the new chemistry-focused direction.
2. Inspect the existing repository and report its structure if tools permit.
3. Propose the smallest practical MVP and explicitly list deferred features.
4. Propose the component structure and chemistry data model.
5. Explain how element/reaction data will be reviewed and tested.
6. Provide milestones with acceptance criteria.
7. Wait for approval before making broad changes.

When implementation starts, work on one milestone at a time. For each milestone, list changed files, run relevant tests, report actual outcomes, and identify remaining issues. Never fabricate test results or silently expand scope.

**Final instruction:** Treat this README as the updated source of truth. SimXSphere is now a compact educational chemistry simulation and reaction-testing website with a natural scientific visual theme. Do not continue the old probability/projectile concept, and do not add AWS, file storage, sharing, or compression features until the chemistry MVP is complete and approved.

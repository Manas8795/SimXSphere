# AI_AGENT_PROMPTS

Use one prompt at a time, in order. Paste the **common header** first each time. Review the diff and run the gate yourself.

## Common header
```
You are working in the SimXSphere repository. Before editing: list and read the relevant existing files and docs in /docs (README, ARCHITECTURE, SIMULATIONS, EXPERIMENT_SCHEMA, SIMXPACK_SPEC as relevant). Preserve working code. Do not change unrelated files. Do not add dependencies without stating the reason. Never create AWS resources, never run AWS CLI commands, never write credentials. After coding run the listed commands, then summarize: files changed, commands run with real results, remaining issues. Do not claim tests passed unless you ran them.
```

## M1 - Repo setup and UI shell
```
Task: create a Vite + React + TypeScript project with ESLint, Vitest, Playwright. Pages (layout only): Home, Probability, Projectile, Experiments; simple nav. Folder layout per docs/REPOSITORY_STRUCTURE.md (empty core/storage dirs with placeholder index files). Add .gitignore (node_modules, dist, .env*, *.pem). Add one trivial passing unit test and one Playwright test that the home page lists exactly two simulations.
Out of scope: simulation logic, storage, ZIP, AWS.
Commands: npm install; npm run dev; npm test; npm run test:e2e; npm run lint; npm run build.
Acceptance: all commands succeed; home shows exactly 2 simulations.
```

## M2 - Probability simulation
```
Task: implement src/core/simulations/prng.ts (mulberry32) and probability.ts exactly as in docs/SIMULATIONS.md section A: validation, counts, proportions. Write tests P1-P7. Then build the Probability page: inputs, Run, Reset, inline errors, count/proportion table, SVG histogram. No UI imports in core.
Out of scope: saving experiments.
Commands: npm test -- probability; npm run test:e2e.
Acceptance: P1-P7 pass; E2, E3 pass; same seed reproduces output.
```

## M3 - Projectile motion
```
Task: implement src/core/simulations/projectile.ts per SIMULATIONS.md section B: validation, T/R/H, 101 trajectory samples, clamping. Tests J1-J9. Build the page: inputs, gravity presets, Run, Reset, SVG trajectory chart with axes/units, results table, visible note "idealized, no air resistance".
Acceptance: J1-J9 pass; E4 passes; theta 0 and 90 handled without NaN.
```

## M4 - Local save/restore
```
Task: implement Experiment types, validators and canonical JSON (docs/EXPERIMENT_SCHEMA.md); StorageAdapter interfaces and localAdapter (docs/ARCHITECTURE.md section 3). Add "Save experiment" (title, description) to both simulation pages and an Experiments page (list, open, delete). Open restores parameters and results exactly.
Tests: U-S1..S4, U-L1, E5.
Out of scope: ZIP, cloud.
Acceptance: reload preserves experiments; schemaVersion 2 and unknown fields rejected.
```

## M5 - SimXPack
```
Task: first compare ZIP libraries (fflate vs JSZip): license, maintenance, API, bundle-size impact; record the decision in docs/SIMXPACK_SPEC.md section 8, then implement per the spec: checksum (Web Crypto), validate, export, import with every limit and ordering in section 6, stats, optional CSV. UI: select 2-4 experiments, name collection, Export, show stats; Import with error display and conflict choice (skip/overwrite/copy). Generate hostile fixtures in tests/fixtures via a script.
Tests: X1-X14, S1-S9, U-C1, E6-E8.
Acceptance: round trip exact; every hostile archive rejected with a clear message and storage unchanged.
```

## M6 - End-to-end UI polish
```
Task: consistent layout, empty/error/loading states, keyboard focus and labels, no dead buttons, responsive layout at laptop and phone widths. No new features.
Tests: E1-E10; manual checklist in docs/TEST_PLAN.md section 6.
Acceptance: all green; no console errors during workflows.
```

## M7a - Cloud design in code (no deployment)
```
Task: write infra/template.yaml (SAM/CloudFormation) defining ONLY the resources listed in docs/DEPLOYMENT_GUIDE.md B2, the Lambda handler (infra/lambda) implementing the API contract in docs/ARCHITECTURE.md 4.4 with ownership from the verified token sub, size limits, presigned POST/GET, and src/storage/awsAdapter.ts calling the API. Use mocked AWS clients in tests C1-C5. DO NOT deploy, DO NOT run aws or sam deploy. Validate the template syntax offline only.
Acceptance: C1-C5 pass without network; adapter selected only when VITE_STORAGE_MODE=aws; local mode unaffected.
```
**M7b (you, not the agent):** complete the cost gate in AWS_FREE_COST_CHECKLIST.md, then deploy manually following DEPLOYMENT_GUIDE.md Part B, run the smoke test, fill the inventory, rehearse teardown.

## M8 - Security, regression, evidence
```
Task: implement any missing security tests S1-S14 (cloud ones only if deployed), run the full suite, produce docs/evidence/ (test output, size/time measurement script and table per docs/ACADEMIC_REPORT_AND_DEMO.md section 2), run a secret scan on the repo, and list remaining issues. No feature work.
Acceptance: all tests green; evidence files present; no secrets found.
```

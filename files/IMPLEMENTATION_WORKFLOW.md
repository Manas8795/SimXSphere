# IMPLEMENTATION_WORKFLOW

Rule: one milestone at a time; the gate must pass (commands run and output read by you) before moving on. Commit after each green gate.

| Step | Do | Gate |
|---|---|---|
| 0 | Install current Node LTS and Git; create repo; `.gitignore` (node_modules, dist, .env*, *.pem, aws creds) | `node -v`, `git status` |
| 1 | Vite + React + TS; lint; Vitest; Playwright; app shell with nav (Home, Probability, Projectile, Experiments); layout only | dev/test/lint/build pass; empty tests run |
| 2 | `core/simulations/probability.ts` + validation + tests; then UI page | P1-P7 pass; E2/E3 pass |
| 3 | `projectile.ts` + tests; SVG chart; UI page | J1-J9 pass; E4 pass |
| 4 | `schema.ts`, `serialize.ts`, `StorageAdapter`, `localAdapter`; Experiments page (save/open/delete) | U-S*, U-L1, E5 pass |
| 5 | Pick ZIP library (record decision); `checksum.ts`, `validate.ts`, `export.ts`, `import.ts`; UI select/export/import with stats | X1-X14, S1-S9 pass; E6-E8 pass |
| 6 | Polish: consistent layout, error/empty states, accessibility basics, no dead buttons | E1-E10 pass; manual checklist done |
| 7a | **Cost gate**: complete AWS_FREE_COST_CHECKLIST sections 1-3 for *your* account | Written decision per service |
| 7b | Write IaC template + Lambda + `awsAdapter` against mocks; unit tests C1-C5 | Tests green with no AWS calls |
| 7c | Deploy (only after 7a), smoke test, inventory | Manual cloud checklist done |
| 7d | Teardown rehearsal (or immediately after demo) | DELETE_COMPLETE; console clean |
| 8 | Security tests S1-S14, full regression, evidence, demo rehearsal, report | Everything green; evidence folder complete |

## Working agreement with AI coding agents
Give each agent task one milestone prompt from [AI_AGENT_PROMPTS.md](AI_AGENT_PROMPTS.md). The agent must inspect existing files first, change only what the task needs, run tests, and report changed files and open issues. You review the diff and run the gate yourself.

## Definition of done (per milestone)
Code merged, tests written and passing, docs updated if behavior changed, nothing unrelated modified, evidence saved.

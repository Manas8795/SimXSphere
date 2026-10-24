# TEST_PLAN

Tools: **Vitest** (unit/integration), **Playwright** (UI), manual checklist. Record real results in `docs/evidence/` (screenshots, command output); never write results you did not observe.

## 1. How to run
```bash
npm test                         # all unit + integration
npm test -- probability          # filter by name
npm run test:e2e                 # Playwright UI workflows
npm run test:coverage            # optional coverage report
```

## 2. Unit tests
| ID | Area | Input | Expected |
|---|---|---|---|
| U-P1..P7 | Probability | see SIMULATIONS.md | as listed |
| U-J1..J9 | Projectile | see SIMULATIONS.md | as listed |
| U-V1 | Param validation | each invalid value listed in SIMULATIONS.md | error with field name |
| U-S1 | Serialize probability exp | valid object | canonical JSON; parse gives equal object |
| U-S2 | Schema version | `schemaVersion: 2` | "Unsupported schema version" |
| U-S3 | Unknown field | extra top-level key | rejected |
| U-S4 | Canonical order | same object, keys shuffled | identical canonical string |
| U-C1 | SHA-256 | "abc" bytes | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |
| U-L1 | Local adapter | save, get, list, remove | persists; remove -> null |

## 3. SimXPack integration tests
| ID | Scenario | Expected |
|---|---|---|
| X1 | Export 2 experiments, import | canonical equal; manifest checks pass |
| X2 | Export 4 experiments incl. awkward floats/unicode | equal |
| X3 | Export with 1 or 5 experiments | rejected (must be 2-4) |
| X4 | Stats | original, compressed, saved, percent computed; tiny pack may show negative saving |
| X5 | Corrupt ZIP bytes (truncate / flip bytes) | "Invalid or corrupted archive" |
| X6 | Malformed `manifest.json` | rejected |
| X7 | Missing manifest | rejected |
| X8 | File not listed in manifest / listed but missing | rejected |
| X9 | Hash mismatch (edit one byte of an experiment) | rejected |
| X10 | Unsupported formatVersion | rejected |
| X11 | Unsafe names, bad extensions | rejected (SECURITY S1, S2, S5) |
| X12 | 21 entries | rejected |
| X13 | Oversized total / ratio bomb | rejected at limit |
| X14 | Import same id twice | conflict choice offered; no silent overwrite |

## 4. Cloud adapter tests (only if cloud mode enabled)
Unit tests with mocked AWS SDK clients (e.g. a client-mock library, justified in repo): C1 upload flow issues presigned POST with size condition; C2 list returns only caller's items; C3 download-url denied for another user; C4 delete removes both S3 object and DynamoDB item; C5 oversize metadata rejected. Then a manual smoke test against the deployed stack (section 6).

## 5. UI (Playwright) workflows
| ID | Steps | Expected |
|---|---|---|
| E1 | Open home | catalogue shows exactly 2 simulations |
| E2 | Probability: trials 1000, seed 42, run | counts sum 1000; histogram visible; rerun same seed -> same numbers |
| E3 | Invalid trials (0) | inline error; no run |
| E4 | Projectile 20/45/9.81 | range ~40.77 m shown; "no air resistance" note visible |
| E5 | Save experiment, reload page | appears in list; open restores parameters and results |
| E6 | Select 2 experiments, export | file downloads; stats shown |
| E7 | Delete local experiments, import the ZIP | experiments restored equal |
| E8 | Import corrupt file | clear error; storage unchanged |
| E9 | Reset button | form back to defaults |
| E10 | Click every visible button | none is dead |

## 6. Manual checklist (student)
- [ ] Fresh clone: `npm install`, `npm run dev`, app loads.
- [ ] Both simulations run with defaults; reset works.
- [ ] Bad inputs show friendly errors (blank, negative, text, huge).
- [ ] Same seed repeats results; new seed changes them.
- [ ] Save 3 experiments; refresh; still there.
- [ ] Export 3 -> open the ZIP with an unzip tool; see manifest, JSON, CSV.
- [ ] Edit one JSON inside the ZIP, re-zip, import -> rejected (hash mismatch).
- [ ] Import original ZIP -> restored; compare parameters on screen.
- [ ] Browser works offline after load (local mode).
- [ ] (cloud) sign in, upload, list, download link works then expires, delete, teardown.
- [ ] `npm test`, `npm run test:e2e`, `npm run build` all green; screenshots saved.

## 7. Evidence to capture
Test run output, coverage summary, export/import timings (median of 10), package size table (several experiment mixes), screenshots of each workflow, (cloud) console screenshots of resources, budget alert, teardown completion.

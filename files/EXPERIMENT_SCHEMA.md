# EXPERIMENT_SCHEMA (schemaVersion 1)

## 1. Common envelope
| Field | Type | Rule |
|---|---|---|
| schemaVersion | integer | must be `1` (others rejected) |
| id | string | UUID v4 |
| type | string | `probability` or `projectile` |
| title | string | 1-80 chars |
| description | string | 0-500 chars |
| createdAt | string | ISO-8601 UTC |
| appVersion | string | e.g. `0.1.0` |
| parameters | object | per type (below), validated |
| results | object | per type (below) |
| metadata | object | optional; only `notes` (string, <= 500) and `importedFromId` (string) allowed |

No secrets, credentials, user emails or tokens are ever stored in experiment files. Unknown top-level fields are rejected on import.

## 2. Probability
```json
{
  "schemaVersion": 1,
  "id": "5b0c2c9e-3f0a-4c55-9d3e-0c1a7e2f9a10",
  "type": "probability",
  "title": "Fair die, 10k rolls",
  "description": "Seeded run for the demo",
  "createdAt": "2026-10-19T10:00:00.000Z",
  "appVersion": "0.1.0",
  "parameters": { "kind": "die", "sides": 6, "trials": 10000, "seed": 12345 },
  "results": { "counts": [1650, 1702, 1631, 1688, 1665, 1664], "total": 10000 },
  "metadata": {}
}
```
(Counts above are illustrative; real values come from the simulator.) Proportions are *derived* on load (`counts[i]/total`) and not stored, so there is no float drift.

## 3. Projectile
```json
{
  "schemaVersion": 1,
  "id": "8a1f6d12-6e33-45a1-b4c0-2f7b1d9e3c44",
  "type": "projectile",
  "title": "45 degree launch",
  "description": "",
  "createdAt": "2026-10-19T10:05:00.000Z",
  "appVersion": "0.1.0",
  "parameters": { "initialSpeed": 20, "angleDeg": 45, "gravity": 9.81 },
  "results": {
    "range": 40.77472,
    "flightTime": 2.88321,
    "maxHeight": 10.19368,
    "trajectory": [[0, 0], [0.4077, 0.4045], "... 101 points total ...", [40.7747, 0]]
  },
  "metadata": {}
}
```
Numbers are stored as computed (full double precision); the example is shortened for readability.

## 4. Canonical form (for comparison and checksums)
Canonical JSON = UTF-8, object keys sorted recursively, no insignificant whitespace, arrays keep order. Two experiments are "equal" iff their canonical JSON strings are identical. JavaScript's `JSON.stringify` uses the shortest string that round-trips a double, so parse -> stringify is exact for finite numbers. `NaN`/`Infinity` are invalid and rejected.

## 5. Versioning policy
- `schemaVersion` bumps on any breaking change.
- The importer supports exactly the versions it lists; others produce "Unsupported schema version N".
- A future migration is a pure function `migrate_vN_to_vN+1` with its own tests.

## 6. Validation
Validators are hand-written type guards (no extra library) or a small schema library if one is justified in writing. Both parameter validation (same bounds as SIMULATIONS.md) and shape validation run on **save**, **load** and **import**.

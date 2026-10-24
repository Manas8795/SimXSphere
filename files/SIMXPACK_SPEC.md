# SIMXPACK_SPEC (formatVersion 1)

## 1. Purpose
Bundle 2-4 user-selected experiments into **one** ZIP that can be downloaded, shared, imported and verified. Bundling is useful even if compression saves little.

## 2. Layout
```
week3-runs.simxpack.zip
├─ manifest.json
├─ experiments/
│   ├─ exp-1-fair-die.json
│   └─ exp-2-45-degree.json
├─ csv/                    (optional)
│   ├─ exp-1-fair-die.csv
│   └─ exp-2-45-degree.csv
└─ README.txt              (optional, human-readable)
```
Allowed paths (regex, whole-string match, case-sensitive):
`^manifest\.json$`, `^README\.txt$`, `^experiments/[a-z0-9][a-z0-9-]{0,63}\.json$`, `^csv/[a-z0-9][a-z0-9-]{0,63}\.csv$`. Anything else -> reject.

## 3. manifest.json
```json
{
  "format": "simxpack",
  "formatVersion": 1,
  "createdAt": "2026-10-19T10:10:00.000Z",
  "appVersion": "0.1.0",
  "collection": { "id": "c3f4...uuid", "name": "Week 3 runs", "description": "" },
  "experiments": [
    { "id": "5b0c2c9e-...", "type": "probability", "path": "experiments/exp-1-fair-die.json" },
    { "id": "8a1f6d12-...", "type": "projectile",  "path": "experiments/exp-2-45-degree.json" }
  ],
  "files": [
    { "path": "experiments/exp-1-fair-die.json", "sizeBytes": 412, "sha256": "<hex>" },
    { "path": "experiments/exp-2-45-degree.json", "sizeBytes": 3120, "sha256": "<hex>" },
    { "path": "csv/exp-1-fair-die.csv", "sizeBytes": 150, "sha256": "<hex>" }
  ],
  "totals": { "fileCount": 4, "uncompressedBytes": 3900 }
}
```
The manifest does not list itself.

## 4. Export steps
1. User selects 2-4 experiments and names the collection (explicit grouping).
2. Validate each experiment; produce canonical JSON bytes (UTF-8).
3. Optionally produce CSV (probability: outcome,count,proportion; projectile: t,x,y).
4. SHA-256 each file (Web Crypto `crypto.subtle.digest`).
5. Build manifest; ZIP with DEFLATE (library default level, e.g. 6); entry timestamps fixed so output is stable.
6. Compute stats and trigger download.

## 5. Size statistics
- original = sum of uncompressed entry sizes (including manifest)
- compressed = final `.zip` size in bytes
- saved = original - compressed (may be negative for tiny packages because ZIP headers add overhead; display honestly)
- percent saved = saved / original * 100 (show only when original > 0)
JSON/CSV text normally compresses well, but **the ratio depends on the data**; no fixed reduction is promised.

## 6. Import validation (in this order; first failure aborts, nothing is stored)
1. File size <= 5 MiB (compressed) before reading.
2. Is a valid ZIP (central directory parses).
3. Entry count <= 20; no duplicates (case-insensitive); no directory-only surprises.
4. Every path matches the allowlist regex; reject `..`, leading `/`, backslashes, drive letters, null bytes, absolute paths, symlink entries.
5. Declared uncompressed size per entry <= 2 MiB, total <= 5 MiB, and per-entry ratio <= 100:1 (cheap early rejection).
6. Decompress with a **running byte counter** that aborts when limits are exceeded (declared sizes can lie).
7. `manifest.json` exists, is JSON, `format == "simxpack"`, `formatVersion == 1`.
8. Every file in the ZIP is listed in the manifest and vice versa; sizes and SHA-256 match.
9. Each experiment parses, has a supported `schemaVersion`, passes shape and parameter validation; experiment ids in manifest match files; 2-4 experiments.
10. Only now are experiments returned to the caller; conflict handling (same id already exists) is the UI's choice: skip, overwrite, or import as copy (new id, `metadata.importedFromId` set).

## 7. What the checksum proves
SHA-256 detects accidental corruption or edits to individual files after export. It does **not** prove who created the package or stop an attacker who edits a file *and* the manifest together. (Future work: signing.) Validation must never rely on the checksum for safety.

## 8. Library choice (decide at Milestone 5, record in the repo)
Candidate: `fflate` (MIT; browser-friendly, small). Alternative: JSZip. Before adopting, check: current license, maintenance status, streaming/limit support, bundle-size impact (`vite build` report), and works in Vitest/jsdom and Playwright. Wrap it in `core/simxpack/zip.ts` so it can be replaced.

## 9. Round-trip tests
export(E) -> ZIP -> import -> canonical(E') equals canonical(E) for every experiment, plus collection name/description and file checksums. Test sets include awkward floats (0.1+0.2, 1e-7, 123456789.123456789), unicode titles, and the maximum 4 experiments with 1,000,000 trials (counts only, small).

# 05 — OmniPack: Bundle, Compress, Export, Import (Module D)

**Depends on:** 04. **Cloud:** none (browser-only, local download). **Next:** [06 Local Backend](../06_local_backend/README.md)

## Purpose
Let users select an experiment collection, bundle it into one ZIP with losslessly compressed contents, download it, and import it back with identical data.

## Key Distinction
**Bundling** (many files → one package) is useful even when **compression** saves little. Never promise a ratio; already-compressed assets (e.g. PNG) may barely shrink.

## In Scope
- User-selected experiments → package (explicit, not auto-detected).
- Archive layout: `manifest.json`, one versioned JSON per experiment, optional CSV, optional graph assets.
- Safe naming conventions; file count and size limits.
- Manifest format with package version, experiment list, per-file checksum and size.
- Checksums using a browser-supported API; document the algorithm and what it protects against (accidental corruption/tampering detection, not authenticity).
- Size report: original total, compressed size, bytes saved, percent saved (when meaningful).
- Import validation before restoring anything.
- Library choice only after checking browser support, license, maintenance, bundle size, security. Do not assume an API; read its docs.

## Import Must Reject
Path traversal, absolute paths, unsafe filenames, unexpected file types, oversize/too many files, archive-bomb ratios, malformed JSON, missing manifest, checksum mismatch, unsupported schema versions.

## Tests
| Test | Expected |
|------|----------|
| Round trip: export → compress → download → import → compare canonical content | Identical |
| Tampered file (checksum mismatch) | Rejected |
| `../` path entry | Rejected |
| Too many/too large files | Rejected with limit message |
| Malformed JSON / missing manifest | Rejected |
| Unsupported schema version | Rejected |
| Unexpected file type | Rejected |
| Already-compressed asset | Works; savings reported honestly |

## Acceptance Gate
- [ ] Round-trip passes for single and multiple experiments.
- [ ] All negative import tests pass; nothing partially imported on failure.
- [ ] Works with no network.
- [ ] Specification in `OMNIPACK_SPECIFICATION.md` matches implementation.

## Agent Prompt
`docs/agent-prompts/05_OMNIPACK_EXPORT_IMPORT_PROMPT.md`

## Evidence
Sample package listing; size-report screenshot; negative-test results.

## Phase 1 Complete
After this gate, the project is demonstrable entirely locally.

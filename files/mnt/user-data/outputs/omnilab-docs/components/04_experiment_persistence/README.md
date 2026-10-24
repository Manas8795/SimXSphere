# 04 — Experiment Model & Persistence (Module C)

**Depends on:** 03. **Cloud:** none (browser storage only). **Next:** [05 OmniPack](../05_omnipack_export_import/README.md)

## Purpose
Define a versioned, validated experiment format and save/restore experiments locally, so later export and cloud features share one canonical representation.

## In Scope
- Versioned experiment schema: ID, schema version, simulation type, parameters, seed (where relevant), results/data, created/updated timestamps, optional title/description/tags, export metadata, ownership/visibility fields (unused until 08).
- Strict separation of **core data** (parameters, seed, results) from **UI presentation state** (chart colors, panel layout).
- Stable/canonical serialization (fixed key order, defined number handling) so comparisons are reliable.
- Validation on load and save.
- Local persistence in the browser; list, view, rename, delete.
- Experiment collections (user-selected groups).
- Version compatibility and migration strategy (what to do with older and newer versions).

## Storage Boundaries
| Location | Holds |
|----------|-------|
| Browser | Working experiments, collections, UI state |
| Database (later) | Metadata, ownership, share records |
| Object storage (later) | Experiment files and packages |

## Rules
- No secrets or credentials in experiment files.
- Reject unknown/unsupported schema versions rather than guessing.

## Tests
- Schema validation: valid, missing field, wrong type, extra field, bad version.
- Canonical serialization is stable (serialize → parse → serialize is identical).
- Save → reload → restore gives identical core content.
- Migration test with a fixture from an older version.
- Delete removes the experiment and its collection membership.

## Acceptance Gate
- [ ] Schema documented in `EXPERIMENT_DATA_MODEL.md` and implemented.
- [ ] Save/restore round-trip passes with identical canonical content.
- [ ] Invalid files rejected with clear errors.
- [ ] Saved list, detail, and delete work in the UI.

## Agent Prompt
`docs/agent-prompts/04_EXPERIMENT_PERSISTENCE_PROMPT.md`

## Evidence
Example experiment JSON; test output; screenshot of saved list.

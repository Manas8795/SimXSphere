# SimXSphere — Local Download, Import, and Sharing Features
## Implementation Instructions for Antigravity / IDE Agent

> **Purpose:** Implement a complete local-first workflow for saving, downloading, importing, and sharing SimXSphere work before any AWS configuration or cloud integration.
>
> **Important:** This is an implementation brief, not permission to deploy infrastructure. Do not configure AWS, create cloud resources, add cloud dependencies, or claim cloud functionality.

## 1. Goal and scope

Add a dependable local workflow so users can:

1. Save simulation/workspace data locally.
2. Download/export a selected simulation or notebook as a portable file.
3. Import a previously exported file into SimXSphere.
4. Share work by sending the exported file to another person.
5. Open the shared file on another device/browser and restore the work, subject to validation and compatibility checks.

The feature must work without an account, network connection, or AWS service. Preserve the existing architecture and visual identity. Do not redesign unrelated screens.

### Product terminology

- **Save locally** — persist work on the current browser/device using the existing local storage mechanism.
- **Export / Download** — create a portable file on the user's device.
- **Import** — load a supported portable file into the app.
- **Share** — explain that sharing currently means downloading an export and sending it through the user's preferred channel. Do not imply SimXSphere hosts a share link.

Do not call local browser persistence “cloud backup.”

## 2. Mandatory repository-first workflow

Before editing:

1. Inspect the repository structure, README, package/config files, current persistence layer, simulation modules, routing, and UI component conventions.
2. Identify every currently supported simulation/workspace type and the actual data required to restore each.
3. Trace how state is created, updated, saved, and loaded.
4. Identify existing export/import functionality, if any. Reuse and extend it instead of duplicating it.
5. Run the current build, tests, and lint/type checks where available. Record existing failures separately.
6. Create an implementation checklist mapping every requirement below to relevant files and tests.
7. Do not assume a framework, storage library, schema, or filename from this brief. Use what the repository actually contains.

Do not delete or overwrite user data during migration. Do not silently change existing simulation calculations or scientific behavior.

## 3. Portable local file format

Implement a versioned, documented portable format for exported work. Prefer a structured JSON-based format unless the repository already has a suitable portable format.

Suggested extension: `.simxpack`

The export should contain only information required to restore the selected work, for example:

- Format identifier / package type
- Schema version
- Export timestamp in ISO 8601 format
- SimXSphere app/version identifier, if available
- Simulation type identifier
- User-facing title/name
- Relevant simulation inputs and settings
- Required saved results, if valid and safe to persist
- Notebook/workspace metadata and user-authored notes, if applicable
- Optional provenance needed to explain how results were produced

Use actual application data structures discovered during inspection. Do not include arbitrary application state, session tokens, credentials, API keys, browser storage dumps, or unrelated user data.

### Format requirements

- Add a clear schema version and package type.
- Validate required fields and types before importing.
- Reject malformed, unsupported, or incompatible packages with a useful error.
- Handle missing optional fields with safe defaults only where justified.
- Preserve numeric precision and units. Do not convert units implicitly unless explicit and tested.
- Keep export deterministic where practical, excluding volatile fields from comparisons.
- Document the format and compatibility behavior.
- Consider package size and avoid exporting duplicated or unnecessary payloads.

If ZIP is already present or strongly justified, use it only with safe path handling and strict limits. Never extract untrusted paths or permit path traversal.

## 4. Export / Download experience

Add an export/download action in the appropriate existing simulation or notebook UI.

### User flow

1. User opens or selects a saved simulation/workspace.
2. User selects **Export** or **Download**.
3. App builds the portable package from that selected item only.
4. App validates the generated package before triggering download.
5. UI communicates success only after package generation and download initiation succeed.

### Requirements

- Use a descriptive filename, e.g. `simxsphere-<simulation-type>-<safe-title>-<date>.simxpack`.
- Sanitize filenames: remove unsafe characters, handle empty titles, and avoid invalid path separators.
- Do not include private information in filenames unless the user explicitly supplied it as the title.
- Export one selected item unless the existing product clearly supports multi-select.
- If export fails, show a clear error and keep current work intact.
- Avoid duplicate export code across simulation types; use a shared utility/service where appropriate.
- Add progress UI only if the operation is genuinely asynchronous or sufficiently expensive.
- Do not falsely claim the file has been uploaded or shared online.

## 5. Import experience

Add an **Import** action in a logical place, such as the workspace/notebook list or relevant simulation page.

### User flow

1. User chooses a local `.simxpack` file.
2. App checks file size and basic format before parsing.
3. App validates package identifier, schema version, simulation type, and required data.
4. App presents a concise preview/confirmation where useful: item name, simulation type, and what will be added.
5. App imports the item without silently replacing existing work.
6. User can open the imported item and continue editing.

### Requirements

- Reject unsupported file types and malformed content gracefully.
- Set a reasonable maximum file size based on actual app data needs; document it and explain the limit.
- Defend against malformed JSON, unexpected deeply nested structures, oversized values, and invalid numeric inputs.
- Never execute imported code, HTML, scripts, formulas, or arbitrary serialized functions.
- Treat imported text as untrusted user content; render it safely.
- Validate scientifically meaningful inputs and units through the same validation path used by normal UI input.
- Recompute derived values when appropriate rather than trusting unverified imported results.
- Preserve the original file and existing local items on import failure.
- Handle duplicate imports intentionally. Offer a safe choice, such as importing as a copy, or detect duplicates and explain behavior. Never overwrite silently.
- Do not import secrets, credentials, or browser/session data.

## 6. Local persistence and workspace handling

Use the existing persistence system if reliable and appropriate. Do not introduce a second competing source of truth.

Ensure the local workflow supports:

- Creating a new item
- Saving updates
- Listing locally saved items
- Opening/restoring an item
- Renaming an item if supported
- Deleting an item with confirmation when destructive
- Exporting a selected item
- Importing a portable item as a distinct local item

### Reliability

- Handle unavailable storage, quota errors, corrupted records, and version mismatches.
- Do not report “saved” if persistence failed.
- Keep in-memory state usable if local persistence is unavailable, and explain the limitation.
- Use stable IDs rather than array indexes for persisted records.
- Preserve compatibility with existing local data. If migration is needed, make it explicit, safe, and tested.
- Avoid storing large blobs in a mechanism the app cannot safely support. Choose based on repository inspection.

## 7. Share workflow (local file-based; no hosted links)

Add a Share action only if it improves the flow beyond standard export. It may open a small dialog explaining:

> “Sharing is currently file-based. Download an export and send it using your preferred app. The recipient can import the file into SimXSphere.”

If the platform supports a native share sheet and the current stack can use it safely:

- Offer **Share file** using the generated package.
- Keep **Download file** as a fallback.
- Handle cancellation and share errors without losing work.
- Do not require native sharing for the core export workflow.

If native sharing is unsupported, Share should guide the user to download/export the package. Do not create fake share links, fake upload progress, or pretend a file was sent.

### User privacy

- Make clear what is included in the package.
- Export only the selected simulation/workspace.
- Do not include user prompts, local LLM conversations, unrelated notebooks, or analytics unless the user explicitly selects such content and the product already supports it.
- Do not upload anything in this phase.

## 8. UI and UX requirements

Follow existing visual language and component patterns. Avoid a generic AI-generated redesign.

Include:

- Clearly named **Import**, **Export/Download**, and optionally **Share** actions
- Consistent placement across supported simulation types
- Helpful empty states and success/error messages
- Clear confirmation before replacing or deleting anything
- An import preview or summary where useful
- Keyboard-accessible controls, focus handling, and accessible labels
- Responsive behavior for narrow screens
- No dead buttons, placeholders, or unverified success messages

Do not add unrelated features or alter the core simulation interface unnecessarily.

## 9. Tests and acceptance criteria

Add/update automated tests using the project's existing test setup. Cover at least:

### Export
- Valid item produces a package with expected format identifier and schema version.
- Export contains required inputs/settings for each supported simulation type.
- Filename sanitization works for unusual titles.
- Export errors do not alter the saved item.

### Import
- Valid package imports and restores expected data.
- Invalid JSON, wrong package identifier, unsupported schema, missing required fields, invalid values, and oversized files are rejected.
- Import failure does not corrupt or replace existing items.
- Duplicate imports follow documented behavior.
- Imported content is rendered safely.

### Persistence
- Save and reload/restore preserve relevant data.
- Storage errors are handled without false success.
- Existing data remains compatible, or migration behavior is tested.

### Integration
- Import/export controls are available for every supported simulation/workspace type intended to support this feature.
- Exporting and then importing the same file recovers equivalent inputs/settings.
- App builds and existing tests still pass.
- Existing scientific calculations and their tests remain unchanged unless a separately justified bug is discovered. If a calculation bug is found, report it rather than quietly bundling an unrelated change.

## 10. Documentation

Update project documentation to explain:

- How to save locally
- How to export/download a `.simxpack`
- How to import a package
- How file-based sharing works
- What the package includes and excludes
- Supported schema version and compatibility behavior
- Storage limitations and how to handle failed import/export

Clearly state this is local-only and does not yet provide AWS/cloud backup, hosted share links, accounts, or online collaboration.

## 11. Keep implementation AWS-ready without adding AWS now

The local export/import workflow should establish a clean boundary that can later be reused by cloud storage:

- Well-defined package schema
- Shared serializer/deserializer
- Validation separated from UI components
- Persistence interface/service boundary if it fits the existing architecture
- Clear distinction between local storage and future remote storage

Do **not** add AWS SDKs, AWS credentials, cloud endpoints, deployment scripts, S3 buckets, Lambda functions, API Gateway, Cognito, DynamoDB, or cloud claims in this task.

Do not prematurely implement cloud abstractions that add complexity without a current local use case.

## 12. Recommended implementation order

1. Inspect current code and document actual state/data flow.
2. Define portable package schema and validation rules.
3. Implement shared serializer/deserializer and tests.
4. Implement export/download.
5. Implement import with validation, preview, and duplicate handling.
6. Connect local persistence and workspace listing/opening.
7. Add file-based share guidance/native share option if supported.
8. Add UI states, accessibility, and responsive behavior.
9. Update docs.
10. Run build, lint/type checks, and all tests.
11. Review the diff for unrelated changes, unsafe imports, fake success states, and accidental cloud dependencies.

## 13. Required final report from the IDE agent

When finished, report:

- What was implemented
- Which simulation/workspace types support import/export
- Package schema and version
- Files created or modified
- Tests added and results
- Build/lint/type-check results
- Existing failures distinguished from new failures
- Requirements not completed and why
- Confirmation no AWS resources, credentials, or cloud integrations were added
- A short manual test procedure for exporting, importing, and sharing a file

**Do not claim the feature is complete unless the acceptance criteria are verified.**

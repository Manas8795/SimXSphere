# SimXSphere Local Storage, Export, Import & File-Based Sharing Guide

This document specifies the offline, local-first simulation workflow for SimXSphere, including saving experiments locally, downloading portable `.simxpack` packages, importing them safely, and file-based sharing without cloud dependencies.

---

## 1. Local-First Architecture Overview

SimXSphere operates completely offline. Every simulation run, parameter set, and scientific output can be:
- Saved into the browser's persistent `localStorage` repository (`simxsphere:experiments`).
- Exported as a portable, standardized `.simxpack` package.
- Imported from external `.simxpack` files or legacy `.zip` studio bundles.
- Shared peer-to-peer using file transfer (e.g., AirDrop, email, messaging, flash drive).

> **Important Offline Notice:**
> SimXSphere does **not** upload data to cloud servers, hosted share URLs, or AWS services in this phase. All exports, imports, and cryptographic validations run directly within the user's browser client.

---

## 2. Supported Simulation Types

Single-experiment export and import is universally supported across all three core SimXSphere scientific domains:

| Simulation Domain | Export Filename Pattern | Stored Parameters | Validation Rules |
| :--- | :--- | :--- | :--- |
| **Chemistry** (`chemistry`) | `simxsphere-chemistry-<slug>-<yyyy-mm-dd>.simxpack` | Reactants, volumes (0–1000 mL), concentrations (0–20 M), thermal conditions, solvent | Reagent validity against database, finite positive values, stoichiometric conservation |
| **Probability** (`probability`) | `simxsphere-probability-<slug>-<yyyy-mm-dd>.simxpack` | Kind (`coin` \| `die`), face count (coin: 2, die: 4–20), trials (1–1,000,000), seed (uint32) | PRNG reproducibility, count non-negativity, sum of counts equals total ($\sum \text{counts} = \text{total} = \text{trials}$) |
| **Projectile Motion** (`projectile`) | `simxsphere-projectile-<slug>-<yyyy-mm-dd>.simxpack` | Launch speed ($v_0 \in (0, 500]$ m/s), angle ($\theta \in [0, 90]^\circ$), gravity ($g \in [0.1, 30]$ m/s²) | 101 coordinate 2-tuples $[x, y]$, finite non-negative values, physics consistency check with $0.15$ tolerance |

---

## 3. The `.simxpack` Format Specification

A single simulation package is formatted as canonical UTF-8 JSON with the extension `.simxpack`.

### Schema (Version 1)

```json
{
  "format": "simxsphere-single",
  "schemaVersion": 1,
  "exportedAt": "2026-10-26T12:00:00.000Z",
  "appVersion": "1.0.0",
  "experiment": {
    "schemaVersion": 1,
    "id": "c4b37d45-6625-4c09-a1b7-9fa3195f2d01",
    "type": "projectile",
    "title": "45° Launch on Earth (25 m/s)",
    "description": "Maximum range ballistic trajectory",
    "createdAt": "2026-10-26T11:58:30.000Z",
    "appVersion": "1.0.0",
    "parameters": {
      "initialSpeed": 25,
      "angleDeg": 45,
      "gravity": 9.81
    },
    "results": {
      "range": 63.71,
      "flightTime": 3.6,
      "maxHeight": 15.93,
      "trajectory": [
        [0, 0],
        [31.85, 15.93],
        [63.71, 0]
      ]
    }
  },
  "provenance": {
    "engine": "SimXSphere Local Engine",
    "checksum": "a3f5b7468112e431...",
    "notes": "Verified in laboratory run"
  }
}
```

### Checksum & Cryptographic Integrity Contract (Schema v1)

- **Mandatory Field:** `provenance.checksum` is strictly required in schema v1.
- **Format:** Exactly 64-character lowercase hexadecimal string (`/^[a-f0-9]{64}$/`).
- **Digest Payload:** Computed using Web Crypto SHA-256 over the canonical, deterministic JSON serialization (`serializeCanonicalJson`) of the `experiment` object.
- **Verification:** On import, the client independently re-serializes the imported `experiment` to canonical JSON, computes the SHA-256 digest, and requires an exact match.
- **Security Scope Note:** The SHA-256 checksum detects accidental file corruption, truncated downloads, and manual text tampering against the included digest. It does **not** prove authorship, provide a digital signature, or protect against a malicious actor intentionally generating a new package with a recalculating matching checksum.

### Privacy Guarantees: What is Included vs Excluded

- **Included:** Simulation type, title, description, creation timestamp, physical and statistical input parameters, analytical output results, trajectory coordinate tuples, and the SHA-256 cryptographic checksum.
- **Excluded:** Zero user login credentials, zero API tokens, zero AI chat/explainer prompt history, zero browser fingerprints, zero access tokens, and zero unrelated discovery records.

---

## 4. How to Save, Export, and Share

### Saving Locally
1. Run any simulation (e.g., mix chemical reagents, flip coins, or launch a projectile).
2. Click **⭐ Save Discovery** (or **💾 Save Run**).
3. The experiment is committed to `localStorage` under `simxsphere:experiments` and immediately appears in the **My Science Discoveries** shelf at the bottom of the screen.

### Exporting / Downloading a `.simxpack`
- **From Active Simulation View:** Click **📦 Export .simxpack** directly in the simulation banner or control panel.
- **From Saved Discoveries Shelf:** Locate any saved experiment card and click **📦 Export**.
- The browser prompts to save `simxsphere-<type>-<slug>-<date>.simxpack`.

### Sharing Offline
1. Click **🔗 Share** on any simulation view or saved experiment card.
2. A sharing dialog opens displaying a clear notice:
   > *"Sharing is currently file-based. Download an export and send it using your preferred app (AirDrop, email, USB, or chat). The recipient can import the file into SimXSphere."*
3. If your operating system/browser supports native file sharing (via the Web Share API with files), click **Share File** to launch your system share sheet.
4. If native sharing is unavailable, click **Download .simxpack** or **Copy JSON Content**.

---

## 5. How to Import a Simulation Package

1. Click the **📥 Import .simxpack** button in the header of the "My Science Discoveries" drawer.
2. Select a `.simxpack` file (or drag and drop it into the drop zone).
3. SimXSphere performs automated verification:
   - **File Size Verification:** Must be $\le 5\text{ MiB}$.
   - **JSON Format & Schema:** Validates `format: "simxsphere-single"` and `schemaVersion: 1`.
   - **Data Bounds:** Enforces strict domain validation on all parameters and results (finite numbers, trajectory length 101, valid reagent formulas, count sums).
   - **Cryptographic Integrity:** Computes SHA-256 over the canonical JSON of the experiment and verifies against mandatory `provenance.checksum`.
4. **Duplicate Handling:**
   - If an experiment with the same UUID already exists in your local library, SimXSphere flags the collision and offers two choices:
     - **Import as new copy (Recommended):** Generates a fresh UUID, sets `metadata.importedFromId` to the source ID, and appends `(Imported Copy)` to the title, preserving both versions.
     - **Replace existing:** Requires an explicit confirmation checkbox before overwriting the local copy with the imported version.
5. **Immediate Restoration:**
   - Click **Add to Discoveries** to save the record to your local shelf.
   - Or click **Import & Open Simulation** to instantly switch to that simulation tab with all parameters, reagents, and angles fully restored.

---

## 6. Error Handling & Diagnostics

| Error Encountered | Cause | Resolution |
| :--- | :--- | :--- |
| **"Package size exceeds maximum allowed limit of 5 MiB"** | File is excessively large or contains extraneous binary data | Only valid text `.simxpack` packages are accepted |
| **"Missing mandatory SHA-256 checksum in package provenance"** | Package lacks schema v1 checksum | Ensure the package was exported with schemaVersion 1 |
| **"Package SHA-256 checksum mismatch"** | File content was altered or corrupted after export | Re-export from the original source device |
| **"Unsupported schema version"** | Package was produced by an incompatible format version | Ensure SimXSphere is updated to the matching release |
| **"initialSpeed must be between 0.0001 and 500 m/s"** / Range errors | Numerical inputs fall outside realistic physics bounds | Correct parameters in the source simulation |
| **"sum of counts does not equal total"** | Probability results counts array is inconsistent with total | Re-run probability trial to generate valid counts |

---

## 7. Cloud Readiness Boundary

The `.simxpack` single-package export/import service (`src/core/simxpack/singlePackage.ts`) defines an isolated boundary:
- Uses domain-agnostic canonical JSON serialization (`src/core/experiment/serialize.ts`).
- Employs Web Crypto SHA-256 hashing (`src/core/crypto/sha256.ts`).
- When AWS cloud synchronization (e.g., S3 cloud notebooks or DynamoDB user metadata) is enabled in future releases, this exact format and checksum structure will serve as the cloud transport envelope without altering any client logic.

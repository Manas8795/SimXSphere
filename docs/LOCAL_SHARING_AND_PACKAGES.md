# SimXSphere Local Storage, Export, Import & File-Based Sharing Guide

This document specifies the offline, local-first simulation workflow for SimXSphere, including saving experiments locally, downloading portable `.simxpack` packages, importing them safely, and file-based sharing without cloud dependencies.

---

## 1. Local-First Architecture Overview

SimXSphere is designed to operate completely offline. Every simulation run, parameter set, and scientific output can be:
- Saved into the browser's persistent `localStorage` repository (`simxsphere_experiments_v1`).
- Exported as a portable, standardized `.simxpack` file.
- Imported from external `.simxpack` files or legacy `.zip` studio bundles.
- Shared peer-to-peer using file transfer (e.g., AirDrop, email, messaging, flash drive).

> **Important Offline Notice:**
> SimXSphere does **not** upload data to cloud servers, hosted share URLs, or AWS services in this phase. All exports, imports, and cryptographic validations run directly within the user's browser client.

---

## 2. Supported Simulation Types

Single-experiment export and import is universally supported across all three core SimXSphere scientific domains:

| Simulation Domain | Export Filename Pattern | Stored Parameters | Validation Rules |
| :--- | :--- | :--- | :--- |
| **Chemistry** (`chemistry`) | `simxsphere-chemistry-<slug>-<yyyy-mm-dd>.simxpack` | Reactants, volumes (mL), concentrations (M), thermal conditions, solvent | Reagent validity, stoichiometric conservation, volume bounds |
| **Probability** (`probability`) | `simxsphere-probability-<slug>-<yyyy-mm-dd>.simxpack` | Kind (`coin` \| `die`), face count (2–20), trials (1–100,000), seed | PRNG reproducibility, count conservation ($\sum \text{counts} = \text{total}$) |
| **Projectile Motion** (`projectile`) | `simxsphere-projectile-<slug>-<yyyy-mm-dd>.simxpack` | Launch speed ($v_0$), angle ($\theta$), gravity ($g$) | $v_0 \in (0, 500]$ m/s, $\theta \in [0, 90]^\circ$, $g \in (0, 100]$ m/s², 101 trajectory steps |

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
        { "x": 0, "y": 0, "t": 0 },
        "..."
      ]
    }
  },
  "provenance": {
    "engine": "SimXSphere Local Engine",
    "checksum": "a3f5b7...",
    "notes": "Verified in laboratory run"
  }
}
```

### Privacy Guarantees: What is Included vs Excluded

- **Included:** Simulation type, title, description, creation timestamp, physical and statistical input parameters, analytical output results, trajectory data, and a SHA-256 cryptographic checksum.
- **Excluded:** Zero user login credentials, zero API tokens, zero AI chat/explainer prompt history, zero browser fingerprints, zero access tokens, and zero unrelated discovery records.

---

## 4. How to Save, Export, and Share

### Saving Locally
1. Run any simulation (e.g., mix chemical reagents, flip coins, or launch a projectile).
2. Click **⭐ Save Discovery** (or **💾 Save Run**).
3. The experiment is committed to `localStorage` under the active session and immediately appears in the **My Science Discoveries** drawer at the bottom of the screen.

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
   - **Data Bounds:** Enforces strict domain validation on all parameters and results.
   - **Cryptographic Integrity:** Computes SHA-256 over the canonical JSON of the experiment and verifies against `provenance.checksum`.
4. **Duplicate Handling:**
   - If an experiment with the same UUID already exists in your local library, SimXSphere flags the collision and offers two choices:
     - **Import as New Copy:** Generates a fresh UUID and appends `(Imported Copy)` to the title, preserving both versions.
     - **Replace Existing:** Overwrites the local copy with the imported version.
5. **Immediate Restoration:**
   - Click **Add to Discoveries** to save the record to your local shelf.
   - Or click **Import & Open Simulation** to instantly switch to that simulation tab with all parameters, reagents, and angles fully restored.

---

## 6. Error Handling & Diagnostics

| Error Encountered | Cause | Resolution |
| :--- | :--- | :--- |
| **"Package size exceeds maximum allowed limit of 5 MiB"** | File is excessively large or contains extraneous binary data | Only valid text `.simxpack` packages are accepted |
| **"Package SHA-256 checksum mismatch"** | File content was altered or corrupted after export | Re-export from the original device |
| **"Unsupported schema version"** | Package was produced by a newer, incompatible format | Ensure SimXSphere is updated to the matching release |
| **"Initial speed must be positive"** / Range errors | Numerical inputs fall outside realistic physics bounds | Correct parameters in the source simulation |

---

## 7. Cloud Readiness Boundary

The `.simxpack` single-package export/import service (`src/core/simxpack/singlePackage.ts`) defines an isolated boundary:
- Uses domain-agnostic canonical JSON serialization (`src/core/experiment/serialize.ts`).
- Employs Web Crypto SHA-256 hashing (`src/core/crypto/sha256.ts`).
- When AWS cloud synchronization (e.g., S3 cloud notebooks or DynamoDB user metadata) is enabled in future releases, this exact format and checksum structure will serve as the cloud transport envelope without altering any client logic.

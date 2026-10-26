# SimXSphere Cloud Notebook Specification & Data Contract
**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Pre-AWS Design Freeze)  
**Schema Version:** 1  

---

## 1. Executive Summary & Design Principles

The SimXSphere Cloud Notebook is an offline-first, user-owned cloud extension designed to accompany the local educational simulation platform. It enables seamless personal backup and cryptographic, read-only experiment sharing across web clients without requiring continuous cloud connectivity, expensive SaaS infrastructure, or vendor lock-in.

### Core Architectural Axioms
1. **Offline-First Independence:** The local simulation engine, local persistence (`LocalStorageAdapter`), and offline export (`SimXPack`) remain the primary source of truth. SimXSphere is 100% functional without an Internet connection.
2. **Zero Client Secrets:** Client-side bundles never contain AWS SDKs, long-lived AWS IAM credentials, or bucket secrets. All cloud communication is channeled through signed JWTs and short-lived presigned URLs.
3. **Bit-Exact Scientific Integrity:** Every cloud-stored snapshot contains a deterministic SHA-256 digest computed over its canonical JSON serialization, preventing tampering and silent bitrot.
4. **Zero Vendor Lock-In:** Any cloud snapshot can be exported back to the standardized `.zip` SimXPack specification and resumed offline at any time.

---

## 2. User-Owned Cloud Notebook MVP Definition

The Cloud Notebook MVP is scoped to two fundamental capabilities:

### 2.1 Personal Experiment Backup (Private Store)
- Allows authenticated users (via OpenID Connect / Cognito / OAuth2) to synchronize their local `ExperimentRun` records and collections (`SimXPacks`) to their private cloud partition.
- Provides cross-device synchronization: experiments created in a classroom or lab computer can be reopened on a personal laptop.
- Implements monotonic versioning and cryptographic conflict detection.

### 2.2 Read-Only Shareable Experiment Snapshot (Public / Unlisted)
- Generates an immutable, content-addressed snapshot link (e.g., `https://simxsphere.app/s/{snapshotToken}`).
- Any student, instructor, or peer can open the URL in a browser to inspect the complete simulation parameters, observe the trajectory or reaction in real time, and fork the experiment into their local notebook with zero account creation required.

---

## 3. Canonical Cloud Data Contract

### 3.1 Cloud Envelope Schema (`CloudExperimentEnvelope`)
Every experiment uploaded to the Cloud Notebook must conform to the following canonical envelope:

```typescript
export interface CloudExperimentEnvelope {
  /** Envelope format version */
  cloudSchemaVersion: 1;

  /** Globally unique snapshot token (UUIDv4 or base58 cryptographic token) */
  snapshotId: string;

  /** Authenticated user ID of the author/owner */
  ownerId: string;

  /** Visibility permission model */
  permissions: 'private' | 'unlisted' | 'public';

  /** UTC ISO-8601 publication timestamp */
  publishedAt: string;

  /** SHA-256 hex digest of the canonical JSON string of the experiment run */
  canonicalSha256: string;

  /** Canonical ExperimentRun conforming to SimXSphere Schema Version 1 */
  experiment: ExperimentRun;

  /** Optional educational annotations and provenance tags */
  metadata?: {
    authorName?: string;
    institution?: string;
    curriculumTag?: string;
    notes?: string;
  };
}
```

### 3.2 Integrity Verification Algorithm
To verify that an experiment received from the cloud has not been corrupted or tampered with:
1. Extract `envelope.experiment`.
2. Compute `canonicalJson = serializeCanonicalJson(envelope.experiment)` using the deterministic alphabetical key sorting specified in `src/core/experiment/serialize.ts`.
3. Compute `computedHash = crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson))`.
4. Assert `computedHash === envelope.canonicalSha256`. If the hash differs, reject the snapshot as invalid.

---

## 4. S3 Storage Layout & Object Model

Storage in Amazon S3 is partitioned into private user namespaces and public/unlisted snapshot caches:

```
s3://<bucket-name>/
├── users/
│   └── {ownerId}/
│       ├── experiments/
│       │   └── {experimentId}.json        # Private user experiment state
│       └── packages/
│           └── {packageId}.simxpack       # Packaged collection zip archive
└── snapshots/
    └── {snapshotToken}/
        ├── experiment.json                # Immutable CloudExperimentEnvelope
        └── manifest.json                  # Provenance, publisher info, SHA-256
```

### 4.1 Presigned URL Architecture
- **Upload:** The client requests a presigned PUT URL from API Gateway/Lambda (`POST /packages` or `POST /snapshots`). The client streams the compressed bytes directly to S3.
- **Download:** S3 serves read-only snapshots through CloudFront CDN with strict CORS headers (`Access-Control-Allow-Origin: *` for public snapshots).

---

## 5. Security & Privacy Model

- **No Simulation Telemetry to External Clouds:** Simulation parameters and local LLM context remain on the client machine unless the user explicitly clicks "Save to Cloud" or "Share Snapshot".
- **Zero Local LLM Forwarding:** Explainer queries with local Ollama (`127.0.0.1:11434`) are strictly decoupled from cloud synchronization.
- **Quota Envelopes:** Free/student tiers are capped at 50 MB total S3 storage and max 10 MB per individual SimXPack archive.

---

## 6. Offline Fallback Strategy
If an API Gateway request or S3 upload fails due to network disconnection or invalid auth:
1. The operation fails fast with an `AwsConfigurationError` or `NetworkError`.
2. The UI catches the error and persists the experiment to `LocalStorageAdapter`.
3. A non-blocking banner notifies the user: *"Working offline. Experiment saved to local discoveries."*

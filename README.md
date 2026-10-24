# SimXSphere — Dual-Mode Interactive Cloud Simulation Platform

> **Academic Cloud Computing Project**  
> Dual-Mode Architecture (100% Offline Local Mode vs. Serverless AWS Cloud Mode)  
> Zero-Cost Guarantee ($0.00 Free-Tier Gated) | Verifiable SimXPack (.zip) Bundling | 10-Step Security Hardening

---

## 🌟 Overview

**SimXSphere** is a browser-first, dual-mode simulation and experimentation platform. It enables students and researchers to perform deterministic mathematical and physical simulations, analyze live empirical distributions, save runs locally, and package experiment suites into cryptographically verifiable, portable **SimXPacks** (`.simxpack.zip`).

### Key Principles
1. **Local-First Architecture:** Complete functionality runs in the browser using `localStorage`. Cloud deployment is strictly an opt-in enhancement.
2. **Deterministic Reproducibility:** Pure computational simulation engines with seeded PRNG (`mulberry32`) and analytical trajectory solvers.
3. **Cryptographic Integrity:** Canonical JSON serialization (lexicographically sorted keys, no whitespace) and SHA-256 digests.
4. **Defense-in-Depth:** 10-step security pipeline guarding against Zip-Slip, decompression bombs, and script injection.
5. **Strict AWS Free-Tier Adherence:** Serverless architecture (Cognito, HTTP API, 128 MB Lambda, DynamoDB On-Demand, S3 Presigned URLs) strictly designed to incur **$0.00**.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### Installation & Execution
```bash
# Install dependencies
npm install

# Run the test suite (all 39 unit, security, and cloud mock tests)
npm test

# Build for production
npm run build

# Start local interactive development server
npm run dev
```

Open **`http://localhost:5173/`** in your browser.

---

## 🔬 Simulation Engines

Both simulation engines reside in `src/core/simulations/` with **zero UI or DOM dependencies**:

### 1. Probability Simulation (`probability.ts`)
- **Engine:** `mulberry32` PRNG (deterministic 32-bit pseudo-random number generator).
- **Parameters:**
  - Kind: Coin Toss (2 sides) or Dice Roll (4 to 20 sides)
  - Trials ($N$): 1 to 1,000,000
  - Seed: 32-bit unsigned integer ($0$ to $4,294,967,295$)
- **Visualization:** Pure SVG interactive histogram with empirical counts, percentage labels, and theoretical expectation baseline ($1/\text{sides}$).

### 2. Projectile Motion (`projectile.ts`)
- **Model:** Idealized mechanics with constant gravity, flat ground, zero air resistance, and zero wind.
- **Equations:**
  - Range: $R = \frac{v_0^2 \sin(2\theta)}{g}$
  - Flight Time: $T = \frac{2 v_0 \sin\theta}{g}$
  - Peak Height: $H = \frac{(v_0 \sin\theta)^2}{2g}$
- **Trajectory:** Exactly 101 discrete coordinates $(x, y)$ plotted on a responsive SVG canvas with launch, apex, landing markers, and an interactive coordinate scrubber.
- **Presets:** Earth ($9.81\text{ m/s}^2$), Moon ($1.62\text{ m/s}^2$), Mars ($3.71\text{ m/s}^2$), or custom gravity ($0.1$ to $30\text{ m/s}^2$).

---

## 📦 SimXPack Specification (`.simxpack.zip`)

SimXPacks bundle 2 to 4 experiments into a single verifiable ZIP archive:
```
week3-lab.simxpack.zip
├── manifest.json              # Version 1 manifest with SHA-256 digests
├── experiments/
│   ├── exp-1-fair-die.json    # Canonical JSON experiment file
│   └── exp-2-45-degree.json
├── csv/                       # Optional tabular outcome data
│   ├── exp-1-fair-die.csv
│   └── exp-2-45-degree.csv
└── README.txt                 # Human-readable package description
```

### 10-Step Security Pipeline (`src/core/simxpack/import.ts`)
1. **Size check:** File $\le 5\text{ MiB}$ before parsing.
2. **ZIP integrity:** Valid central directory.
3. **Entry limit:** Max 20 entries; no case-insensitive duplicate paths.
4. **Path allowlist (Zip-Slip defense):** Rejects `..`, leading `/`, backslashes `\`, `C:\`, and null bytes.
5. **Entry bounds:** Declared uncompressed size $\le 2\text{ MiB}$ per entry, total $\le 5\text{ MiB}$.
6. **Decompression bomb defense:** Running byte counter aborts on excess memory expansion.
7. **Manifest validation:** Valid JSON, `format === "simxpack"`, `formatVersion === 1`.
8. **Cryptographic verification:** Every file in the archive matches its declared size and SHA-256 hash.
9. **Experiment validation:** Schema version 1, bounds validation, 2 to 4 experiments.
10. **Conflict resolution:** Choice of `Overwrite`, `Skip`, or `Import as Copy`.

---

## ☁️ AWS Cloud Architecture & Free-Tier Strictness

```
[Browser / Client]
   │
   ├─ 1. Auth: AWS Cognito User Pool (JWT issuance, 50,000 MAUs free)
   │
   ├─ 2. Metadata API: API Gateway HTTP API (1,000,000 calls free)
   │     │ (Validates JWT)
   │     ▼
   │   AWS Lambda (128 MB RAM, 10s timeout, 1M invocations free)
   │     │
   │     ▼
   │   Amazon DynamoDB (PAY_PER_REQUEST on-demand billing, 25 GB free)
   │
   └─ 3. Payloads (SimXPack ZIPs):
         Direct Browser ───[Presigned S3 PUT / GET]───► Amazon S3 Private Bucket
         (No ZIP bytes ever traverse Lambda or API Gateway)
```

### Prohibited Services (Cost Safeguards)
The following services are intentionally omitted from our infrastructure:
- ❌ **No EC2 Instances** (No virtual machines)
- ❌ **No RDS Databases** (No relational DB billing traps)
- ❌ **No NAT Gateways** (Heavy hourly charges avoided)
- ❌ **No CloudFront / WAF / Route53** (No auxiliary network fees)

---

## 🧪 Automated Test Suite

Run all tests via Vitest:
```bash
npm test
```

### Test Coverage (39 tests across 6 test suites)
- `tests/unit/canonical-json.test.ts`: Lexicographical sorting, finite number validation, SHA-256 test vectors.
- `tests/unit/probability.test.ts`: Tests `P1` through `P7` (mulberry32 reproducibility, 4-sigma bounds, edge cases).
- `tests/unit/projectile.test.ts`: Tests `J1` through `J9` (analytical formulas, 101 points, symmetry, celestial presets).
- `tests/unit/local-storage.test.ts`: Tests `U-S1` through `U-S4`, `U-L1` (CRUD, schema validation, date sorting).
- `tests/security/simxpack-security.test.ts`: Tests `S1` through `S9` (Zip-Slip, bombs, hash tampering, XSS).
- `tests/cloud/aws-adapter-mock.test.ts`: Tests `C1` through `C3` (presigned URL flow, JWT authorization).

---

## 📁 Repository Structure

```
simxsphere/
├── core/                         # Pure TypeScript. Zero React, zero DOM.
│   ├── experiment/               # Types, schema validator, canonical JSON
│   ├── simulations/              # mulberry32 PRNG, probability, projectile
│   ├── simxpack/                 # ZIP wrapper (fflate), export, secure import, CSV
│   └── crypto/                   # SHA-256 Web Crypto utility
├── storage/                      # Storage abstraction layer
│   ├── StorageAdapter.ts         # Unified interface
│   ├── localAdapter.ts           # Browser localStorage adapter
│   └── awsAdapter.ts             # AWS Cloud adapter (presigned S3 flows)
├── ui/                           # React UI components & views
│   ├── components/               # Navbar, Histogram (SVG), TrajectoryChart (SVG)
│   ├── views/                    # ProbabilityView, ProjectileView, ExperimentsView, PacksView, CostStatusView
│   └── styles/                   # index.css (Dark glassmorphism design system)
├── infra/                        # Serverless Infrastructure as Code
│   ├── template.yaml             # AWS SAM template (Cognito, HTTP API, Lambda, DynamoDB, S3)
│   └── lambda/api.ts             # User-isolated serverless backend handler
└── tests/                        # 39 automated Vitest test cases
```

---

## 📜 Academic Integrity & License
This project was developed for an academic cloud computing curriculum. MIT License.

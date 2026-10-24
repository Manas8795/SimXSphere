# SimXSphere — Interactive Educational Simulation Platform

> **Academic Learning Environment**  
> **Primary Module:** Interactive Virtual Chemistry Simulation Lab  
> **Secondary Modules:** Probability & Distribution Experiments | Idealized Projectile Kinematics  
> **Architecture:** 100% Local-First Offline Web Application (React 19 + TypeScript + Vite) | Cloud Services Deferred

---

## 🌟 Overview

**SimXSphere** is a browser-based, local-first interactive simulation platform designed for academic science and mathematics education. It provides students and educators with bounded, testable, and transparent virtual laboratory environments.

The platform is structured into **three distinct, modular simulation areas**:

1. **Chemistry Simulation Lab (Primary Focus):**  
   An empirical chemistry workspace featuring:
   - **Interactive 3D Workplane:** Blank canvas to drag, drop, and combine elements and compounds into beakers, with animated reaction triggers and molecular representations.
   - **Interactive Periodic Table:** Complete 118-element reference displaying atomic masses, valence configurations, electronegativities, and reaction compatibility indicators.
   - **Synthesis Reactor & Compound Builder:** Controlled combination of chemical elements into reviewed binary and polyatomic substances.
   - **Aqueous Reactions & Titration:** Acid-base neutralization and precipitation reactions with calculated pH and temperature indicators.
   - **Stoichiometry & Equation Validator:** Conservation-of-mass calculator for limiting reagents, theoretical yields, and atom-balance checks.
   - **Chemistry Notebook:** Local session logging for reviewed reaction runs.

2. **Probability & Statistical Experiments (Independent Module):**  
   Deterministic, seedable Bernoulli and discrete uniform trial simulators (coin flips and multi-sided dice) with real-time empirical frequency histograms, theoretical expectation comparisons, and PRNG reproducibility.

3. **Projectile Motion Simulation (Independent Module):**  
   Classical idealized 2D kinematics trajectory solver with customizable launch angles, velocities, and gravitational fields (Earth, Moon, Mars, and custom values) with SVG flight paths.

---

## 🧭 Product Principles & Scientific Boundaries

- **Local-First & Offline:** SimXSphere runs entirely in your browser using standard Web APIs and `localStorage`. No cloud accounts, API keys, or external network connectivity are required for full functionality.
- **Transparent Academic Models:** Simplified educational models are clearly distinguished from professional laboratory or quantum predictions. Assumptions (e.g., zero air resistance in projectile kinematics, or reviewed reaction catalogues in chemistry) are explicitly stated in the UI.
- **Bounded Chemistry:** The chemistry engine operates on a verified, curated catalogue of supported compounds and reactions. Unknown or unsupported combinations are reported as unsupported rather than generating fabricated chemistry or unverified thermodynamics.
- **Independent Domain Architectures:** Chemistry, probability, and projectile motion are kept strictly separate in their domain data models, calculation engines, and persistence layers.
- **Zero-Cloud Local MVP:** AWS integration, authentication, and cloud storage features are strictly deferred to future phases. Local operation does not create or provision cloud resources.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js:** 18.x or 20.x+
- **npm:** 9.x+

### Setup & Local Development
```bash
# Clone the repository
git clone https://github.com/Manas8795/SimXSphere.git
cd SimXSphere

# Install dependencies
npm install

# Start local development server (Vite)
npm run dev
```

Open `http://localhost:5173/` in your browser.

### Quality & Verification Commands
```bash
# Run unit, domain, and simulation tests (Vitest)
npm test

# Build production bundle (TypeScript compiler + Vite)
npm run build

# Run code linter (Oxlint)
npm run lint
```

---

## 🔬 Simulation Modules

### 1. Chemistry Simulation Lab (`src/chemistry-engine/` & `src/components/`)
- **Workplane:** Drag-and-drop workspace supporting multi-component combinations with interactive 3D ball-and-stick molecular models and atomic orbital visualizations.
- **Periodic Table:** All 118 elements categorized by group (alkali, halogens, noble gases, transition metals) with electron configurations and atomic properties.
- **Stoichiometry & Balance Engine:** Evaluates chemical formulas, verifies mass conservation, computes limiting reagents, and parses reactants and products.
- **Safety & Educational Scope:** Bounded to verified educational examples; does not provide hazardous mixing instructions.

### 2. Probability Simulation (`src/core/simulations/probability.ts` & `src/ui/views/ProbabilityView.tsx`)
- **Engine:** Deterministic 32-bit `mulberry32` pseudo-random number generator.
- **Experiments:** Coin toss ($2$ outcomes) and dice rolls ($4$ to $20$ sides) over $1$ to $1,000,000$ trials.
- **Outputs:** Empirical outcome tallies, relative frequencies, and SVG distribution histograms compared against theoretical probability $P(X) = 1/k$.

### 3. Projectile Motion (`src/core/simulations/projectile.ts` & `src/ui/views/ProjectileView.tsx`)
- **Model:** Idealized 2D parabolic flight under uniform gravity with no aerodynamic drag:
  - Range: $R = \frac{v_0^2 \sin(2\theta)}{g}$
  - Flight Time: $T = \frac{2 v_0 \sin\theta}{g}$
  - Peak Height: $H = \frac{(v_0 \sin\theta)^2}{2g}$
- **Outputs:** Responsive SVG trajectory plot with discrete coordinates, launch/apex/impact markers, and planetary gravity presets (Earth $9.81\text{ m/s}^2$, Moon $1.62\text{ m/s}^2$, Mars $3.71\text{ m/s}^2$).

---

## 📁 Repository Structure

```
├── src/
│   ├── chemistry-data/       # Elements (118) and reagent databases
│   ├── chemistry-engine/     # Atom counter, compound builder, stoichiometry solver
│   ├── components/           # Chemistry UI: Workplane, Periodic Table, 3D Molecule, Reactor
│   ├── core/
│   │   ├── crypto/           # Canonical JSON hashing (SHA-256)
│   │   ├── experiment/       # Core experiment schemas and serialization
│   │   ├── simulations/      # Pure simulation engines (probability, projectile, chemistry)
│   │   └── simxpack/         # Pack compression & validation (historical/deferred module)
│   ├── storage/              # Storage adapter (local localStorage vs deferred AWS)
│   ├── ui/
│   │   ├── components/       # Shared UI primitives: Navbar, Histogram, TrajectoryChart
│   │   └── views/            # Module views: Chemistry, Probability, Projectile, Lab Notebook
│   ├── App.tsx               # Main application shell and tab router
│   └── main.tsx              # React DOM root
├── tests/
│   ├── unit/                 # Unit tests for chemistry, probability, projectile, stoichiometry
│   ├── security/             # Archive unpacking security & validation checks
│   └── cloud/                # Mock tests for storage adapters
├── files/                    # Historical design specs & documentation (Legacy archive)
├── package.json              # Project dependencies and npm scripts
└── vite.config.ts            # Vite build configuration
```

---

## ☁️ Cloud & AWS Status (Deferred)

Cloud deployment, AWS Cognito authentication, S3 package synchronization, and DynamoDB cloud persistence are **strictly deferred**. All current features run locally and offline in the browser. Zero cloud resources are provisioned during local development.

---

## 📄 License & Academic Attribution

Developed for educational simulation and scientific experimentation. Bounded educational models — not intended as professional laboratory or safety software.

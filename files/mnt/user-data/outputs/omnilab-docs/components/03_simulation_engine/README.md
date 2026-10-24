# 03 — Simulation Engine (Module B)

**Depends on:** 01, 02. **Cloud:** none. **Next:** [04 Experiment Persistence](../04_experiment_persistence/README.md)

## Purpose
Implement a small, correct, testable set of simulations running in the browser, separate from UI code.

## Phased Catalogue
| Phase | Simulation | Why |
|-------|-----------|-----|
| 3a (MVP) | Coin toss / dice roll; empirical probability vs trial count | Simplest; demonstrates seeded randomness and convergence |
| 3a (MVP) | Bernoulli and binomial; histogram, theoretical vs observed | Core distribution concepts with checkable formulas |
| 3b | Normal and Poisson visualization | Continuous and count distributions; tolerance-based tests |
| 3c | Projectile motion (velocity, angle, gravity; trajectory and range) | Closed-form equations, easy to verify |
| 3c | Simple pendulum (stated small-angle assumption; limitations noted) | Shows model assumptions |
| 3d (optional, later) | Ohm's law (V, R → I) | Trivial equation; only if time permits |

None are presented as high-fidelity laboratory simulators.

## Per-Simulation Requirements
Document and implement: equations, variables and units, assumptions, parameter ranges and validation, edge cases (zero trials, zero resistance, angle bounds, large counts), seeded vs unseeded behavior, outputs, UI controls, explanatory note (including simulation vs analytical calculation).

## Design Rules
- Pure functions in a dedicated module; no UI or DOM imports.
- Seeded pseudo-random generator so runs are reproducible; seed stored with results.
- Output is plain data (experiment-ready), separate from chart presentation.
- Keep workloads light; cap trial counts.

## Tests
- **Deterministic:** same seed + params → identical results.
- **Statistical:** large-N means/variances within stated tolerances of theory (no exact random outcomes).
- **Analytical:** projectile range, pendulum period (small angle), Ohm's law against known values.
- **Validation:** out-of-range, NaN, negative, non-integer inputs rejected with clear messages.
- **Performance:** maximum allowed trials completes in a reasonable time on a typical laptop.

## Acceptance Gate
- [ ] Each implemented simulation has documented formulas and passing tests.
- [ ] Workspace runs, resets, and charts results with real behavior.
- [ ] Invalid inputs show errors, never crash.
- [ ] Reproducibility verified via seed.

## Agent Prompt
`docs/agent-prompts/03_SIMULATION_ENGINE_PROMPT.md` — assign one phase (3a, 3b…) per prompt.

## Evidence
Test report; screenshots of each simulation; one theory-vs-observed comparison.

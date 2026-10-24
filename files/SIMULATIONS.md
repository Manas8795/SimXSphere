# SIMULATIONS

Calculation code lives in `src/core/simulations/` with **no UI imports**. All functions are pure (same input -> same output).

## A. Probability simulation

**Inputs**
| Field | Rule |
|---|---|
| kind | `coin` or `die` |
| sides | coin: fixed 2; die: integer 4-20 (default 6) |
| trials | integer 1-1,000,000 (default 1000) |
| seed | integer 0-4,294,967,295 (default: random, then shown and saved) |

**Algorithm.** PRNG = `mulberry32(seed)` (32-bit, tiny, deterministic). Each trial: `outcome = floor(rand() * sides)`. Keep only `counts[sides]` (no per-trial storage).

**Outputs.** `counts[]`, `total`, `proportions[i] = counts[i]/total`, expected proportion `1/sides`, max absolute deviation.

**Assumptions.** Fair coin/die; independent trials. mulberry32 is not cryptographic; it is only for reproducible demos.

**Edge cases.** trials = 1; trials = max; non-integer, NaN, negative, empty -> validation error; sides outside range -> error; seed 0 allowed.

**Tests (input -> expected)**
| ID | Input | Expected |
|---|---|---|
| P1 | coin, trials 1000, seed 42 run twice | identical `counts` both runs |
| P2 | die 6, trials 1000, seed 1 | `sum(counts) == 1000`, length 6 |
| P3 | coin, trials 100000, seed 7 | proportion of outcome 0 within 0.5 +/- 0.0063 (4 sigma) |
| P4 | die 6, trials 120000, seed 3 | each proportion within 1/6 +/- 0.005 |
| P5 | trials 0, -5, 1.5, NaN, 1e7 | validation errors |
| P6 | sides 3 or 21 (die) | validation error |
| P7 | different seeds, same params | counts differ (almost surely); both sum to trials |

## B. Projectile motion (idealized)

**Model.** Launch from height 0, flat ground, constant gravity, **no air resistance, no spin, no wind**. State this on screen.

**Inputs**
| Field | Rule |
|---|---|
| initialSpeed v0 (m/s) | 0 < v0 <= 500 |
| angleDeg theta | 0 <= theta <= 90 |
| gravity g (m/s^2) | 0.1 <= g <= 30; presets: Earth 9.81, Moon 1.62, Mars 3.71 |

**Formulas** (theta in radians)
- Flight time `T = 2 v0 sin(theta) / g`
- Range `R = v0^2 sin(2 theta) / g`
- Max height `H = (v0 sin(theta))^2 / (2 g)`
- Trajectory samples (101 points, i = 0..100): `t = T*i/100`, `x = v0 cos(theta) t`, `y = v0 sin(theta) t - 0.5 g t^2`. Clamp `|value| < 1e-9` to 0 and the last `y` to exactly 0.

**Edge cases.** theta = 0 -> T = R = H = 0 (degenerate; show message "no flight"). theta = 90 -> R = 0 (clamped), H = v0^2/(2g). Invalid numbers -> validation errors.

**Test vectors** (tolerance 1e-4 absolute)
| ID | v0 | theta | g | R | T | H |
|---|---|---|---|---|---|---|
| J1 | 20 | 45 | 9.81 | 40.7747 | 2.8832 | 10.1937 |
| J2 | 10 | 30 | 9.81 | 8.8280 | 1.0194 | 1.2742 |
| J3 | 20 | 90 | 9.81 | 0 | 4.0775 | 20.3874 |
| J4 | 20 | 0 | 9.81 | 0 | 0 | 0 |

Additional tests: J5 first sample is (0,0), last sample y = 0; J6 R(45 deg) >= R(any other angle) for same v0, g; J7 R(30 deg) ~ R(60 deg) within 1e-9; J8 v0 = 0, 501, theta = -1, 91, g = 0 -> errors; J9 doubling g halves R.

**Display.** SVG axes with units, trajectory polyline, numeric results table.

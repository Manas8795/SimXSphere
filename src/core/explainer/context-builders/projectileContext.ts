import type { ProjectileParameters, ProjectileResults } from '../../experiment/types';
import { EXPLAINER_SCHEMA_VERSION, type SimulationExplainerContext } from '../types';

export function buildProjectileExplainerContext(
  params: ProjectileParameters,
  results: ProjectileResults,
  revision: number = 1
): SimulationExplainerContext {
  const { initialSpeed, angleDeg, gravity } = params;
  const { range, maxHeight, flightTime } = results;

  const thetaRad = (angleDeg * Math.PI) / 180;
  const vx = Number((initialSpeed * Math.cos(thetaRad)).toFixed(2));
  const vyInitial = Number((initialSpeed * Math.sin(thetaRad)).toFixed(2));

  return {
    schemaVersion: EXPLAINER_SCHEMA_VERSION,
    simulationId: 'projectile-motion',
    simulationTitle: `Projectile Motion (${angleDeg}° at ${initialSpeed} m/s)`,
    domain: 'projectile',
    stateRevision: revision,
    timestamp: new Date().toISOString(),
    inputs: {
      initialSpeed,
      launchAngle: angleDeg,
      gravity: Number(gravity.toFixed(2)),
      horizontalVelocityComponent: vx,
      verticalInitialVelocityComponent: vyInitial,
    },
    outputs: {
      rangeMeters: Number(range.toFixed(3)),
      maxHeightMeters: Number(maxHeight.toFixed(3)),
      flightTimeSeconds: Number(flightTime.toFixed(3)),
    },
    units: {
      initialSpeed: 'm/s',
      launchAngle: 'degrees',
      gravity: 'm/s²',
      horizontalVelocityComponent: 'm/s',
      verticalInitialVelocityComponent: 'm/s',
      rangeMeters: 'm',
      maxHeightMeters: 'm',
      flightTimeSeconds: 's',
    },
    assumptions: [
      'Ideal parabolic trajectory (air resistance and atmospheric drag are completely neglected).',
      'Uniform downward gravitational acceleration across the entire flight path.',
      'Launch height equals landing height (y0 = y_final = 0 on flat planar ground).',
      'The projectile is treated as a point mass with no aerodynamic lift, Magnus spin, or Coriolis effects.',
    ],
    knownFacts: [
      'Horizontal range formula: R = v₀² · sin(2θ) / g',
      'Maximum apex height formula: H = (v₀ · sin(θ))² / (2g)',
      'Total flight duration formula: T = 2 · v₀ · sin(θ) / g',
      'Maximum horizontal range occurs at θ = 45° where sin(2θ) = sin(90°) = 1.',
      'Complementary angles θ and (90° - θ) yield identical horizontal ranges with different flight times and peak apex heights.',
      'At 90° launch angle, the horizontal range is 0m and all kinetic energy is converted into maximum vertical potential energy.',
      'At 0° launch angle, the projectile remains on the ground plane (0s flight time, 0m height, 0m range).',
    ],
    unavailableFacts: [
      'Air drag coefficients, cross-sectional aerodynamic area, and wind vectors are not modeled in this idealized simulation.',
    ],
    supportedIntents: [
      'explain_current_state',
      'why_did_this_happen',
      'explain_equations',
      'explain_changes',
      'what_if',
      'ask_question',
    ],
  };
}

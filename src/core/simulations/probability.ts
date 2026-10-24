/**
 * Probability Simulation Engine
 * Strict compliance with SIMULATIONS.md and EXPERIMENT_SCHEMA.md
 * Pure computation. Zero UI / DOM dependencies.
 */

import type { ProbabilityParameters, ProbabilityResults, ValidationResult } from '../experiment/types';
import { createMulberry32 } from './prng';

export const MIN_TRIALS = 1;
export const MAX_TRIALS = 1_000_000;
export const MIN_DIE_SIDES = 4;
export const MAX_DIE_SIDES = 20;

export function validateProbabilityParameters(params: unknown): ValidationResult {
  const errors: string[] = [];

  if (!params || typeof params !== 'object') {
    return { valid: false, errors: ['Parameters must be an object'] };
  }

  const p = params as Partial<ProbabilityParameters>;

  // Validate kind
  if (p.kind !== 'coin' && p.kind !== 'die') {
    errors.push('kind must be either "coin" or "die"');
  }

  // Validate sides
  if (typeof p.sides !== 'number' || !Number.isInteger(p.sides)) {
    errors.push('sides must be an integer');
  } else if (p.kind === 'coin' && p.sides !== 2) {
    errors.push('coin simulation must have exactly 2 sides');
  } else if (p.kind === 'die' && (p.sides < MIN_DIE_SIDES || p.sides > MAX_DIE_SIDES)) {
    errors.push(`die simulation sides must be between ${MIN_DIE_SIDES} and ${MAX_DIE_SIDES}`);
  }

  // Validate trials
  if (typeof p.trials !== 'number' || !Number.isFinite(p.trials) || !Number.isInteger(p.trials)) {
    errors.push('trials must be a finite integer');
  } else if (p.trials < MIN_TRIALS || p.trials > MAX_TRIALS) {
    errors.push(`trials must be between ${MIN_TRIALS} and ${MAX_TRIALS.toLocaleString()}`);
  }

  // Validate seed
  if (typeof p.seed !== 'number' || !Number.isFinite(p.seed) || !Number.isInteger(p.seed)) {
    errors.push('seed must be an integer');
  } else if (p.seed < 0 || p.seed > 4_294_967_295) {
    errors.push('seed must be an unsigned 32-bit integer (0 to 4,294,967,295)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function runProbabilitySimulation(params: ProbabilityParameters): ProbabilityResults {
  const validation = validateProbabilityParameters(params);
  if (!validation.valid) {
    throw new Error(`Invalid probability parameters: ${validation.errors.join('; ')}`);
  }

  const rand = createMulberry32(params.seed);
  const sides = params.sides;
  const trials = params.trials;
  const counts = new Array<number>(sides).fill(0);

  // Fast in-memory loop. Only counts are retained; no per-trial array allocation.
  for (let i = 0; i < trials; i++) {
    const outcome = Math.floor(rand() * sides);
    counts[outcome]++;
  }

  return {
    counts,
    total: trials,
  };
}

export interface DerivedProbabilityMetrics {
  proportions: number[];
  expectedProportion: number;
  deviations: number[];
  maxAbsoluteDeviation: number;
}

/**
 * Proportions and deviations are derived at runtime (never persisted to avoid float drift)
 */
export function calculateDerivedProbabilityMetrics(
  results: ProbabilityResults,
  sides: number
): DerivedProbabilityMetrics {
  const total = results.total;
  const expectedProportion = 1 / sides;
  const proportions = results.counts.map((c) => (total > 0 ? c / total : 0));
  const deviations = proportions.map((p) => Math.abs(p - expectedProportion));
  const maxAbsoluteDeviation = Math.max(...deviations);

  return {
    proportions,
    expectedProportion,
    deviations,
    maxAbsoluteDeviation,
  };
}

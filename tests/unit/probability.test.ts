import { describe, it, expect } from 'vitest';
import {
  runProbabilitySimulation,
  validateProbabilityParameters,
  calculateDerivedProbabilityMetrics,
} from '../../src/core/simulations/probability';
import type { ProbabilityParameters } from '../../src/core/experiment/types';

describe('Probability Simulation Tests (SIMULATIONS.md P1-P7)', () => {
  it('P1: coin, trials 1000, seed 42 run twice produces identical counts', () => {
    const params: ProbabilityParameters = {
      kind: 'coin',
      sides: 2,
      trials: 1000,
      seed: 42,
    };

    const run1 = runProbabilitySimulation(params);
    const run2 = runProbabilitySimulation(params);

    expect(run1.counts).toEqual(run2.counts);
    expect(run1.total).toBe(1000);
    expect(run1.counts[0] + run1.counts[1]).toBe(1000);
  });

  it('P2: die 6, trials 1000, seed 1 produces sum(counts) == 1000 and length 6', () => {
    const params: ProbabilityParameters = {
      kind: 'die',
      sides: 6,
      trials: 1000,
      seed: 1,
    };

    const result = runProbabilitySimulation(params);

    expect(result.counts.length).toBe(6);
    expect(result.total).toBe(1000);
    const sum = result.counts.reduce((a, b) => a + b, 0);
    expect(sum).toBe(1000);
  });

  it('P3: coin, trials 100000, seed 7 produces proportion within 0.5 +/- 0.0063', () => {
    const params: ProbabilityParameters = {
      kind: 'coin',
      sides: 2,
      trials: 100_000,
      seed: 7,
    };

    const result = runProbabilitySimulation(params);
    const metrics = calculateDerivedProbabilityMetrics(result, 2);

    expect(metrics.proportions[0]).toBeGreaterThanOrEqual(0.5 - 0.0063);
    expect(metrics.proportions[0]).toBeLessThanOrEqual(0.5 + 0.0063);
  });

  it('P4: die 6, trials 120000, seed 3 produces each proportion within 1/6 +/- 0.005', () => {
    const params: ProbabilityParameters = {
      kind: 'die',
      sides: 6,
      trials: 120_000,
      seed: 3,
    };

    const result = runProbabilitySimulation(params);
    const metrics = calculateDerivedProbabilityMetrics(result, 6);
    const expected = 1 / 6;

    for (let i = 0; i < 6; i++) {
      expect(metrics.proportions[i]).toBeGreaterThanOrEqual(expected - 0.005);
      expect(metrics.proportions[i]).toBeLessThanOrEqual(expected + 0.005);
    }
  });

  it('P5: trials 0, -5, 1.5, NaN, 1e7 trigger validation errors', () => {
    const invalidTrials = [0, -5, 1.5, NaN, 10_000_000];

    for (const t of invalidTrials) {
      const v = validateProbabilityParameters({
        kind: 'coin',
        sides: 2,
        trials: t,
        seed: 123,
      });
      expect(v.valid).toBe(false);
      expect(v.errors.length).toBeGreaterThan(0);
    }
  });

  it('P6: sides 3 or 21 (die) triggers validation error', () => {
    const invalidSides = [3, 21, 0, 100];

    for (const s of invalidSides) {
      const v = validateProbabilityParameters({
        kind: 'die',
        sides: s,
        trials: 1000,
        seed: 123,
      });
      expect(v.valid).toBe(false);
      expect(v.errors.length).toBeGreaterThan(0);
    }
  });

  it('P7: different seeds with same params produce different counts, both summing to trials', () => {
    const paramsA: ProbabilityParameters = {
      kind: 'die',
      sides: 6,
      trials: 5000,
      seed: 100,
    };
    const paramsB: ProbabilityParameters = {
      kind: 'die',
      sides: 6,
      trials: 5000,
      seed: 99999,
    };

    const resA = runProbabilitySimulation(paramsA);
    const resB = runProbabilitySimulation(paramsB);

    expect(resA.counts).not.toEqual(resB.counts);
    expect(resA.counts.reduce((a, b) => a + b, 0)).toBe(5000);
    expect(resB.counts.reduce((a, b) => a + b, 0)).toBe(5000);
  });
});

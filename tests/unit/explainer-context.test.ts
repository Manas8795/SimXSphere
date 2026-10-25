import { describe, it, expect } from 'vitest';
import { buildProjectileExplainerContext } from '../../src/core/explainer/context-builders/projectileContext';
import { buildProbabilityExplainerContext } from '../../src/core/explainer/context-builders/probabilityContext';
import { buildChemistryExplainerContext } from '../../src/core/explainer/context-builders/chemistryContext';
import { diffExplainerContext } from '../../src/core/explainer/diff';

describe('Simulation Explainer Context Builders & Diff Tests', () => {
  it('builds valid projectile explainer context with units and assumptions', () => {
    const params = { initialSpeed: 25, angleDeg: 45, gravity: 9.81 };
    const results = {
      range: 63.71,
      flightTime: 3.6,
      maxHeight: 15.93,
      trajectory: Array.from({ length: 101 }, () => [0, 0] as [number, number]),
    };

    const ctx = buildProjectileExplainerContext(params, results, 1);

    expect(ctx.schemaVersion).toBe('1.0');
    expect(ctx.domain).toBe('projectile');
    expect(ctx.inputs.initialSpeed).toBe(25);
    expect(ctx.inputs.launchAngle).toBe(45);
    expect(ctx.outputs.rangeMeters).toBe(63.71);
    expect(ctx.units?.rangeMeters).toBe('m');
    expect(ctx.assumptions.length).toBeGreaterThan(0);
    expect(ctx.assumptions[0]).toContain('air resistance');
    expect(ctx.knownFacts?.some((f) => f.includes('R = v₀² · sin(2θ) / g'))).toBe(true);
  });

  it('builds probability explainer context with theoretical vs empirical proportions', () => {
    const params = { kind: 'coin' as const, sides: 2, trials: 1000, seed: 42 };
    const results = { counts: [490, 510], total: 1000 };

    const ctx = buildProbabilityExplainerContext(params, results, 2);

    expect(ctx.domain).toBe('probability');
    expect(ctx.inputs.totalTrials).toBe(1000);
    expect(ctx.outputs.totalSimulated).toBe(1000);
    expect(ctx.outputs.theoreticalExpectedPerOutcome).toBe(500);
    const outcomes = ctx.outputs.outcomes as Array<{ face: string; observedCount: number; empiricalFrequency: number }>;
    expect(outcomes[0].face).toBe('Heads');
    expect(outcomes[0].observedCount).toBe(490);
    expect(outcomes[0].empiricalFrequency).toBe(0.49);
    expect(ctx.knownFacts?.some((f) => f.includes('Law of Large Numbers'))).toBe(true);
  });

  it('builds chemistry explainer context with balanced equations and thermodynamic details', () => {
    const params = {
      mode: 'aqueous' as const,
      reactants: [
        { name: 'Hydrochloric Acid', formula: 'HCl', volumeMl: 50, concentrationM: 1 },
        { name: 'Sodium Hydroxide', formula: 'NaOH', volumeMl: 50, concentrationM: 1 },
      ],
    };
    const results = {
      reactionType: 'Neutralization',
      balancedEquation: 'HCl + NaOH -> NaCl + H2O',
      products: ['NaCl', 'H2O'],
      isConserved: true,
      finalPh: 7.0,
      temperatureChangeC: 6.5,
      enthalpyKj: -57.1,
      isCurated: true,
      provenance: 'Standard NIST Neutralization Benchmark',
    };

    const ctx = buildChemistryExplainerContext(params, results, 3);

    expect(ctx.domain).toBe('chemistry');
    expect(ctx.outputs.reactionType).toBe('Neutralization');
    expect(ctx.outputs.finalPh).toBe(7);
    expect(ctx.outputs.temperatureChangeC).toBe(6.5);
    expect(ctx.outputs.enthalpyKj).toBe(-57.1);
    expect(ctx.knownFacts?.some((f) => f.includes('exothermic'))).toBe(true);
  });

  it('correctly calculates differences between two simulation snapshots', () => {
    const snap1 = buildProjectileExplainerContext(
      { initialSpeed: 20, angleDeg: 30, gravity: 9.81 },
      { range: 35.31, flightTime: 2.04, maxHeight: 5.1, trajectory: [] },
      1
    );
    const snap2 = buildProjectileExplainerContext(
      { initialSpeed: 20, angleDeg: 60, gravity: 9.81 },
      { range: 35.31, flightTime: 3.53, maxHeight: 15.3, trajectory: [] },
      2
    );

    const diff = diffExplainerContext(snap2, snap1);

    expect(diff.hasPriorState).toBe(true);
    expect(diff.domainMatch).toBe(true);
    expect(diff.changedInputs.launchAngle).toEqual({ from: 30, to: 60 });
    expect(diff.changedOutputs.maxHeightMeters).toEqual({ from: 5.1, to: 15.3 });
    expect(diff.changedOutputs.flightTimeSeconds).toEqual({ from: 2.04, to: 3.53 });
  });

  it('handles diff with no prior state or mismatched domain gracefully', () => {
    const snapProj = buildProjectileExplainerContext(
      { initialSpeed: 20, angleDeg: 45, gravity: 9.81 },
      { range: 40.77, flightTime: 2.88, maxHeight: 10.19, trajectory: [] },
      1
    );
    const snapProb = buildProbabilityExplainerContext(
      { kind: 'coin', sides: 2, trials: 100, seed: 1 },
      { counts: [50, 50], total: 100 },
      2
    );

    const noPriorDiff = diffExplainerContext(snapProj, null);
    expect(noPriorDiff.hasPriorState).toBe(false);

    const domainMismatchDiff = diffExplainerContext(snapProj, snapProb);
    expect(domainMismatchDiff.hasPriorState).toBe(true);
    expect(domainMismatchDiff.domainMatch).toBe(false);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '../../src/storage/localAdapter';
import type { ProbabilityExperiment, ProjectileExperiment } from '../../src/core/experiment/types';
import { areCanonicallyEqual } from '../../src/core/experiment/serialize';

describe('Local Storage Run History Tests (U-S1 - U-S4, U-L1)', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    adapter = new LocalStorageAdapter();
  });

  const validProbabilityExp: ProbabilityExperiment = {
    schemaVersion: 1,
    id: '5b0c2c9e-3f0a-4c55-9d3e-0c1a7e2f9a10',
    type: 'probability',
    title: 'Fair die, 10k rolls',
    description: 'Seeded run for the demo',
    createdAt: '2026-10-19T10:00:00.000Z',
    appVersion: '1.0.0',
    parameters: { kind: 'die', sides: 6, trials: 10000, seed: 12345 },
    results: { counts: [1650, 1702, 1631, 1688, 1665, 1664], total: 10000 },
    metadata: {},
  };

  const validProjectileExp: ProjectileExperiment = {
    schemaVersion: 1,
    id: '8a1f6d12-6e33-45a1-b4c0-2f7b1d9e3c44',
    type: 'projectile',
    title: '45 degree launch',
    description: 'Idealized baseline trajectory',
    createdAt: '2026-10-19T10:05:00.000Z',
    appVersion: '1.0.0',
    parameters: { initialSpeed: 20, angleDeg: 45, gravity: 9.81 },
    results: {
      range: 40.7747,
      flightTime: 2.8832,
      maxHeight: 10.1937,
      trajectory: Array.from({ length: 101 }, (_, i) => [i * 0.4077, 0]),
    },
    metadata: {},
  };

  it('U-S1: Save valid probability experiment -> retrieves identical canonical JSON', async () => {
    await adapter.saveExperiment(validProbabilityExp);
    const retrieved = await adapter.getExperiment(validProbabilityExp.id);

    expect(retrieved).not.toBeNull();
    expect(areCanonicallyEqual(validProbabilityExp, retrieved)).toBe(true);
  });

  it('U-S2: Save valid projectile experiment -> retrieves identical canonical JSON', async () => {
    await adapter.saveExperiment(validProjectileExp);
    const retrieved = await adapter.getExperiment(validProjectileExp.id);

    expect(retrieved).not.toBeNull();
    expect(areCanonicallyEqual(validProjectileExp, retrieved)).toBe(true);
  });

  it('U-S3: Reject experiment with invalid schema (e.g. unknown top-level field or wrong version)', async () => {
    // Unknown field test
    const invalidWithExtra = {
      ...validProbabilityExp,
      unknownField: 'malicious payload',
    };
    await expect(adapter.saveExperiment(invalidWithExtra as any)).rejects.toThrow(
      /Unknown top-level field/
    );

    // Unsupported version test
    const invalidVersion = {
      ...validProbabilityExp,
      schemaVersion: 2,
    };
    await expect(adapter.saveExperiment(invalidVersion as any)).rejects.toThrow(
      /Unsupported schema version 2/
    );
  });

  it('U-S4: Delete experiment removes it from list and get returns null', async () => {
    await adapter.saveExperiment(validProbabilityExp);
    expect(await adapter.getExperiment(validProbabilityExp.id)).not.toBeNull();

    await adapter.deleteExperiment(validProbabilityExp.id);
    expect(await adapter.getExperiment(validProbabilityExp.id)).toBeNull();

    const list = await adapter.listExperiments();
    expect(list.some((e) => e.id === validProbabilityExp.id)).toBe(false);
  });

  it('U-L1: List experiments returns items sorted by createdAt descending', async () => {
    const expOlder = {
      ...validProbabilityExp,
      id: 'older-exp-uuid',
      createdAt: '2026-10-19T08:00:00.000Z',
    };
    const expNewer = {
      ...validProjectileExp,
      id: 'newer-exp-uuid',
      createdAt: '2026-10-19T12:00:00.000Z',
    };

    // Save older first, then newer
    await adapter.saveExperiment(expOlder);
    await adapter.saveExperiment(expNewer);

    const list = await adapter.listExperiments();
    expect(list.length).toBe(2);
    expect(list[0].id).toBe(expNewer.id);
    expect(list[1].id).toBe(expOlder.id);
  });

  it('U-S5: Save valid chemistry experiment -> retrieves identical canonical JSON and deletes cleanly', async () => {
    const validChemistryExp: import('../../src/core/experiment/types').ChemistryExperiment = {
      schemaVersion: 1,
      id: '3c8e1a90-8d54-43b2-9d82-9a0d84f721bc',
      type: 'chemistry',
      title: 'Aqueous: Hydrochloric acid + Sodium hydroxide',
      description: 'Acid-Base Neutralization: HCl + NaOH → NaCl + H2O. Final pH: 7.00',
      createdAt: '2026-10-24T12:00:00.000Z',
      appVersion: '1.0.0',
      parameters: {
        mode: 'aqueous',
        reactants: [
          { formula: 'HCl', name: 'Hydrochloric acid', volumeMl: 50, concentrationM: 1.0 },
          { formula: 'NaOH', name: 'Sodium hydroxide', volumeMl: 50, concentrationM: 1.0 },
        ],
        conditions: {
          temperatureC: 25,
          solvent: 'H2O',
        },
      },
      results: {
        reactionType: 'Acid-Base Neutralization',
        balancedEquation: 'HCl + NaOH → NaCl + H2O',
        products: ['NaCl(aq)', 'H2O(l)'],
        isConserved: true,
        finalPh: 7.0,
        temperatureChangeC: 2.4,
        precipitate: null,
        gasEvolved: null,
        enthalpyKj: -57.3,
        isCurated: true,
        provenance: 'SimXSphere Curated Physical Chemistry Engine',
      },
    };

    await adapter.saveExperiment(validChemistryExp);
    const retrieved = await adapter.getExperiment(validChemistryExp.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.type).toBe('chemistry');
    expect(areCanonicallyEqual(validChemistryExp, retrieved!)).toBe(true);

    const list = await adapter.listExperiments();
    expect(list.some((e) => e.id === validChemistryExp.id && e.type === 'chemistry')).toBe(true);

    await adapter.deleteExperiment(validChemistryExp.id);
    expect(await adapter.getExperiment(validChemistryExp.id)).toBeNull();
  });
});

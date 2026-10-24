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
});

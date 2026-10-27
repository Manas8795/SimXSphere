import { describe, it, expect } from 'vitest';
import { exportSimXPack } from '../../src/core/simxpack/export';
import { inspectSimXPack } from '../../src/core/simxpack/import';
import { createZipArchive } from '../../src/core/simxpack/zip';
import type { ProbabilityExperiment, ProjectileExperiment } from '../../src/core/experiment/types';

describe('SimXPack Package Inspector & Compression Analyzer', () => {
  const dummyProbExp: ProbabilityExperiment = {
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

  const dummyProjExp: ProjectileExperiment = {
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

  it('correctly inspects a valid multi-discipline SimXPack archive before import', async () => {
    const { zipBytes } = await exportSimXPack([dummyProbExp, dummyProjExp], {
      collection: {
        name: 'Science Demo Pack',
        description: 'Physics and math simulations',
      },
      includeCsv: true,
    });

    const inspection = await inspectSimXPack(zipBytes);

    expect(inspection.valid).toBe(true);
    expect(inspection.errors).toHaveLength(0);
    expect(inspection.manifest?.collection.name).toBe('Science Demo Pack');
    expect(inspection.experiments).toHaveLength(2);
    expect(inspection.moduleBreakdown).toEqual({
      probability: 1,
      projectile: 1,
    });
    expect(inspection.stats.uncompressedBytes).toBeGreaterThan(0);
    expect(inspection.stats.compressedBytes).toBe(zipBytes.byteLength);
    expect(inspection.sha256Checksum).toHaveLength(64);
  });

  it('rejects an empty or zero-byte archive with a clear error', async () => {
    const emptyBytes = new Uint8Array(0);
    const inspection = await inspectSimXPack(emptyBytes);

    expect(inspection.valid).toBe(false);
    expect(inspection.errors[0]).toMatch(/empty or invalid/i);
  });

  it('rejects an archive with Zip-Slip path traversal attack', async () => {
    const maliciousBytes = createZipArchive([
      {
        path: 'experiments/../../evil.sh',
        data: new TextEncoder().encode('rm -rf /'),
      },
    ]);

    const inspection = await inspectSimXPack(maliciousBytes);
    expect(inspection.valid).toBe(false);
    expect(inspection.errors.some((e) => e.includes('Zip-Slip') || e.includes('Malicious path'))).toBe(true);
  });

  it('rejects an archive missing manifest.json', async () => {
    const noManifestBytes = createZipArchive([
      {
        path: 'README.txt',
        data: new TextEncoder().encode('Hello world'),
      },
    ]);

    const inspection = await inspectSimXPack(noManifestBytes);
    expect(inspection.valid).toBe(false);
    expect(inspection.errors.some((e) => e.includes('manifest.json'))).toBe(true);
  });
});

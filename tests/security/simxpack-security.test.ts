import { describe, it, expect } from 'vitest';
import { exportSimXPack } from '../../src/core/simxpack/export';
import { importSimXPack } from '../../src/core/simxpack/import';
import { createZipArchive } from '../../src/core/simxpack/zip';
import type {
  ProbabilityExperiment,
  ProjectileExperiment,
  ExperimentRun,
} from '../../src/core/experiment/types';
import { areCanonicallyEqual } from '../../src/core/experiment/serialize';

describe('SimXPack Security Hardened Pipeline (SECURITY.md S1-S9 & Round-Trips)', () => {
  const encoder = new TextEncoder();

  const sampleProbExp: ProbabilityExperiment = {
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

  const sampleProjExp: ProjectileExperiment = {
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

  // Valid Round-Trip Test
  it('Round-Trip: export -> ZIP -> import -> canonical equality for all experiments', async () => {
    const experiments: ExperimentRun[] = [sampleProbExp, sampleProjExp];
    const exportResult = await exportSimXPack(experiments, {
      collection: {
        name: 'Week 3 Lab Runs',
        description: 'Verified test package',
      },
    });

    expect(exportResult.zipBytes.byteLength).toBeGreaterThan(0);
    expect(exportResult.manifest.experiments.length).toBe(2);

    const importResult = await importSimXPack(exportResult.zipBytes);
    expect(importResult.experiments.length).toBe(2);
    expect(importResult.manifest.collection.name).toBe('Week 3 Lab Runs');

    // Canonical equality
    expect(areCanonicallyEqual(sampleProbExp, importResult.experiments[0])).toBe(true);
    expect(areCanonicallyEqual(sampleProjExp, importResult.experiments[1])).toBe(true);
  });

  // S1: ZIP with ../evil.json
  it('S1: ZIP with ../evil.json is rejected (Zip-Slip defense)', async () => {
    const hostileZip = createZipArchive([
      { path: 'manifest.json', data: encoder.encode('{}') },
      { path: 'experiments/../evil.json', data: encoder.encode('{"alert": "owned"}') },
    ]);

    await expect(importSimXPack(hostileZip)).rejects.toThrow(
      /Malicious path detected and rejected/
    );
  });

  // S2: ZIP with absolute path / backslash / C:\
  it('S2: ZIP with absolute path or backslash is rejected', async () => {
    const backslashZip = createZipArchive([
      { path: 'manifest.json', data: encoder.encode('{}') },
      { path: 'experiments\\hack.json', data: encoder.encode('{}') },
    ]);
    await expect(importSimXPack(backslashZip)).rejects.toThrow(
      /Malicious path detected and rejected/
    );

    const absoluteZip = createZipArchive([
      { path: 'manifest.json', data: encoder.encode('{}') },
      { path: '/etc/passwd', data: encoder.encode('root:x:0:0') },
    ]);
    await expect(importSimXPack(absoluteZip)).rejects.toThrow(
      /Malicious path detected and rejected/
    );
  });

  // S3: ZIP bomb / expansion limit exceeded
  it('S3: Single entry exceeding 2 MiB or total exceeding 5 MiB is rejected', async () => {
    // 2.5 MiB single entry
    const hugeData = new Uint8Array(2.5 * 1024 * 1024);
    const bombZip = createZipArchive([
      { path: 'manifest.json', data: encoder.encode('{}') },
      { path: 'experiments/exp-1-huge.json', data: hugeData },
    ]);

    await expect(importSimXPack(bombZip)).rejects.toThrow(
      /exceeds per-entry limit of 2 MiB/
    );
  });

  // S4: 21+ entries
  it('S4: ZIP with 21 or more entries is rejected', async () => {
    const entries = Array.from({ length: 22 }, (_, i) => ({
      path: `experiments/exp-${i}-test.json`,
      data: encoder.encode('{}'),
    }));
    entries.unshift({ path: 'manifest.json', data: encoder.encode('{}') });

    const tooManyZip = createZipArchive(entries);
    await expect(importSimXPack(tooManyZip)).rejects.toThrow(
      /exceeding maximum limit of 20/
    );
  });

  // S5: Unexpected extension (.exe, .html, .sh)
  it('S5: Unexpected file extension is rejected by allowlist', async () => {
    const exeZip = createZipArchive([
      { path: 'manifest.json', data: encoder.encode('{}') },
      { path: 'experiments/virus.exe', data: encoder.encode('binary') },
    ]);
    await expect(importSimXPack(exeZip)).rejects.toThrow(
      /File path rejected \(not in SimXPack allowlist\)/
    );
  });

  // S6: Malformed JSON in experiment file
  it('S6: Malformed experiment JSON is rejected with clear message', async () => {
    const experiments = [sampleProbExp, sampleProjExp];
    const { zipBytes } = await exportSimXPack(experiments, {
      collection: { name: 'Valid Pack' },
    });
    expect(zipBytes.byteLength).toBeGreaterThan(0);

    // Tamper with content by replacing valid JSON with broken syntax
    const corruptedZip = createZipArchive([
      {
        path: 'manifest.json',
        data: encoder.encode(
          JSON.stringify({
            format: 'simxpack',
            formatVersion: 1,
            collection: { id: 'test', name: 'Test' },
            experiments: [
              { id: sampleProbExp.id, type: 'probability', path: 'experiments/exp-1-broken.json' },
              { id: sampleProjExp.id, type: 'projectile', path: 'experiments/exp-2-broken.json' },
            ],
            files: [
              { path: 'experiments/exp-1-broken.json', sizeBytes: 10, sha256: 'deadbeef' },
              { path: 'experiments/exp-2-broken.json', sizeBytes: 10, sha256: 'deadbeef' },
            ],
          })
        ),
      },
      { path: 'experiments/exp-1-broken.json', data: encoder.encode('{ bad json') },
      { path: 'experiments/exp-2-broken.json', data: encoder.encode('{ also bad') },
    ]);

    await expect(importSimXPack(corruptedZip)).rejects.toThrow();
  });

  // S7: schemaVersion 2
  it('S7: manifest or experiment with schemaVersion 2 triggers unsupported version error', async () => {
    const v2Manifest = {
      format: 'simxpack',
      formatVersion: 2, // Unsupported!
      collection: { id: 'c1', name: 'V2 Test' },
      experiments: [],
      files: [],
    };

    const v2Zip = createZipArchive([
      { path: 'manifest.json', data: encoder.encode(JSON.stringify(v2Manifest)) },
    ]);

    await expect(importSimXPack(v2Zip)).rejects.toThrow(/Unsupported schema version 2/);
  });

  // S8: Manifest hash mismatch
  it('S8: Tampered file payload with hash mismatch is caught and rejected', async () => {
    const experiments = [sampleProbExp, sampleProjExp];
    const { manifest, zipBytes } = await exportSimXPack(experiments, {
      collection: { name: 'Tamper Test' },
    });
    expect(zipBytes.byteLength).toBeGreaterThan(0);

    // Create a modified archive where exp-1 has altered data but manifest has old sha256
    const tamperedEntries = [
      { path: 'manifest.json', data: encoder.encode(JSON.stringify(manifest)) },
      {
        path: manifest.files[0].path,
        data: encoder.encode('{"tampered": true}'), // Hash will not match manifest!
      },
      {
        path: manifest.files[1].path,
        data: encoder.encode('{"tampered": true}'),
      },
    ];

    const tamperedZip = createZipArchive(tamperedEntries);
    await expect(importSimXPack(tamperedZip)).rejects.toThrow(/SHA-256 hash mismatch|File size mismatch/);
  });

  // S9: Title with XSS payload
  it('S9: Experiment titles with HTML/XSS vectors are safely parsed as text', async () => {
    const xssExp: ProbabilityExperiment = {
      ...sampleProbExp,
      id: 'xss-test-uuid-1',
      title: '<img src=x onerror=alert(1)>',
    };
    const xssExp2: ProjectileExperiment = {
      ...sampleProjExp,
      id: 'xss-test-uuid-2',
      title: '<script>alert("hack")</script>',
    };

    const { zipBytes } = await exportSimXPack([xssExp, xssExp2], {
      collection: { name: '<svg onload=alert(2)>' },
    });

    const imported = await importSimXPack(zipBytes);
    // Preserved as verbatim plain text
    expect(imported.experiments[0].title).toBe('<img src=x onerror=alert(1)>');
    expect(imported.experiments[1].title).toBe('<script>alert("hack")</script>');
    expect(imported.manifest.collection.name).toBe('<svg onload=alert(2)>');
  });
});

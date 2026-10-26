import { describe, it, expect, vi } from 'vitest';
import {
  createSingleSimXPackage,
  parseAndValidateSinglePackage,
  sanitizeExportFilename,
  shareSimXPackage,
  type SimXSinglePackage,
} from '../../src/core/simxpack/singlePackage';
import type { ChemistryExperiment, ProbabilityExperiment, ProjectileExperiment } from '../../src/core/experiment/types';
import { runProjectileSimulation } from '../../src/core/simulations/projectile';

describe('Single SimXPackage (.simxpack) Export and Validation', () => {
  const sampleChemistryExp: ChemistryExperiment = {
    schemaVersion: 1,
    id: '11111111-2222-3333-4444-555555555555',
    type: 'chemistry',
    title: 'Hydrochloric Acid + Sodium Hydroxide',
    description: 'Neutralization titration experiment',
    createdAt: '2026-10-26T12:00:00.000Z',
    appVersion: '1.0.0',
    parameters: {
      mode: 'aqueous',
      reactants: [
        { formula: 'HCl', name: 'Hydrochloric Acid', volumeMl: 50, concentrationM: 1.0 },
        { formula: 'NaOH', name: 'Sodium Hydroxide', volumeMl: 50, concentrationM: 1.0 },
      ],
      conditions: {
        temperatureC: 25,
        solvent: 'Water (aqueous)',
      },
    },
    results: {
      reactionType: 'Neutralization',
      balancedEquation: 'HCl + NaOH -> NaCl + H2O',
      products: ['NaCl(aq)', 'H2O(l)'],
      isConserved: true,
      finalPh: 7.0,
      temperatureChangeC: 0.5,
      precipitate: null,
      gasEvolved: null,
      enthalpyKj: -57.1,
      isCurated: true,
      provenance: 'SimXSphere Stoichiometric Engine',
      notes: 'Equimolar neutral salt solution formed.',
    },
  };

  const sampleProbabilityExp: ProbabilityExperiment = {
    schemaVersion: 1,
    id: '22222222-3333-4444-5555-666666666666',
    type: 'probability',
    title: 'Fair Coin Toss (10,000 flips)',
    description: 'Empirical Law of Large Numbers validation',
    createdAt: '2026-10-26T12:05:00.000Z',
    appVersion: '1.0.0',
    parameters: {
      kind: 'coin',
      sides: 2,
      trials: 10000,
      seed: 12345,
    },
    results: {
      counts: [4980, 5020],
      total: 10000,
    },
  };

  const projectileResults = runProjectileSimulation({ initialSpeed: 25, angleDeg: 45, gravity: 9.81 });
  const sampleProjectileExp: ProjectileExperiment = {
    schemaVersion: 1,
    id: '33333333-4444-5555-6666-777777777777',
    type: 'projectile',
    title: '45° Launch on Earth (25 m/s)',
    description: 'Maximum range ballistic curve',
    createdAt: '2026-10-26T12:10:00.000Z',
    appVersion: '1.0.0',
    parameters: {
      initialSpeed: 25,
      angleDeg: 45,
      gravity: 9.81,
    },
    results: projectileResults,
  };

  describe('sanitizeExportFilename', () => {
    it('creates lowercase hyphen-delimited filenames with date stamp', () => {
      const name = sanitizeExportFilename('chemistry', 'Hydrochloric Acid + Sodium Hydroxide!', '2026-10-26T12:00:00Z');
      expect(name).toBe('simxsphere-chemistry-hydrochloric-acid-sodium-hydroxide-2026-10-26.simxpack');
    });

    it('handles special symbols, spaces, slashes and consecutive hyphens cleanly', () => {
      const name = sanitizeExportFilename('projectile', 'Launch @ 45° / High-Velocity & Fast!', '2026-10-26T00:00:00Z');
      expect(name).toBe('simxsphere-projectile-launch-45-high-velocity-fast-2026-10-26.simxpack');
    });

    it('handles empty or blank titles by defaulting to simulation', () => {
      const name = sanitizeExportFilename('probability', '   ', '2026-10-26T00:00:00Z');
      expect(name).toBe('simxsphere-probability-experiment-2026-10-26.simxpack');
    });
  });

  describe('createSingleSimXPackage', () => {
    it('creates a compliant single package with sha256 checksum and canonical JSON', async () => {
      const result = await createSingleSimXPackage(sampleChemistryExp, 'Verified in lab');
      expect(result.package.format).toBe('simxsphere-single');
      expect(result.package.schemaVersion).toBe(1);
      expect(result.package.experiment.type).toBe('chemistry');
      expect(result.package.experiment.title).toBe(sampleChemistryExp.title);
      expect(result.package.provenance.notes).toBe('Verified in lab');
      expect(result.package.provenance.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(result.filename.endsWith('.simxpack')).toBe(true);

      // JSON string should be parseable and contain canonical keys
      const parsed = JSON.parse(result.jsonString);
      expect(parsed.format).toBe('simxsphere-single');
      expect(parsed.experiment.id).toBe(sampleChemistryExp.id);
    });
  });

  describe('parseAndValidateSinglePackage', () => {
    it('successfully validates a round-trip exported package', async () => {
      const { jsonString } = await createSingleSimXPackage(sampleProjectileExp);
      const validation = await parseAndValidateSinglePackage(jsonString);

      expect(validation.valid).toBe(true);
      expect(validation.package).toBeDefined();
      expect(validation.package?.experiment.id).toBe(sampleProjectileExp.id);
      expect(validation.errors).toHaveLength(0);
    });

    it('rejects input exceeding 5 MiB size ceiling', async () => {
      const giantString = 'x'.repeat(5 * 1024 * 1024 + 10);
      const validation = await parseAndValidateSinglePackage(giantString);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('5 MiB'))).toBe(true);
    });

    it('rejects malformed non-JSON data', async () => {
      const validation = await parseAndValidateSinglePackage('this is not json { [');
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Malformed JSON'))).toBe(true);
    });

    it('rejects packages missing format simxsphere-single', async () => {
      const bad = JSON.stringify({
        format: 'wrong-format',
        schemaVersion: 1,
        experiment: sampleProbabilityExp,
        sha256: 'abc',
      });
      const validation = await parseAndValidateSinglePackage(bad);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('simxsphere-single'))).toBe(true);
    });

    it('rejects packages with unsupported schemaVersion', async () => {
      const bad = JSON.stringify({
        format: 'simxsphere-single',
        schemaVersion: 999,
        experiment: sampleProbabilityExp,
        provenance: { checksum: 'abc' },
      });
      const validation = await parseAndValidateSinglePackage(bad);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Unsupported schema version'))).toBe(true);
    });

    it('rejects packages where experiment data has been tampered with (checksum mismatch)', async () => {
      const { package: validPkg } = await createSingleSimXPackage(sampleProbabilityExp);
      
      // Tamper with the internal seed parameter without updating the SHA-256
      const tamperedPkg: SimXSinglePackage = {
        ...validPkg,
        experiment: {
          ...validPkg.experiment,
          parameters: {
            ...validPkg.experiment.parameters,
            seed: 99999,
          },
        } as ProbabilityExperiment,
      };

      const validation = await parseAndValidateSinglePackage(tamperedPkg);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('checksum mismatch'))).toBe(true);
    });

    it('rejects packages containing invalid experiment parameter ranges', async () => {
      // Modify projectile speed to be negative directly in JSON
      const badExp = {
        ...sampleProjectileExp,
        parameters: {
          ...sampleProjectileExp.parameters,
          initialSpeed: -50,
        },
      };

      const pkgWithBadParams = {
        format: 'simxsphere-single',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        experiment: badExp,
        provenance: {
          engine: 'SimXSphere Local Engine',
          checksum: 'abc',
        },
      };

      const validation = await parseAndValidateSinglePackage(JSON.stringify(pkgWithBadParams));
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('initialSpeed must be between'))).toBe(true);
    });
  });

  describe('shareSimXPackage', () => {
    it('uses Web Share API if supported with files', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      const canShareMock = vi.fn().mockReturnValue(true);

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          share: shareMock,
          canShare: canShareMock,
        },
        writable: true,
        configurable: true,
      });

      const { package: pkg, filename } = await createSingleSimXPackage(sampleChemistryExp);
      const result = await shareSimXPackage(pkg, filename);

      expect(result.success).toBe(true);
      expect(result.method).toBe('native');
      expect(shareMock).toHaveBeenCalled();
    });

    it('falls back cleanly if navigator.share is not available', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const { package: pkg, filename } = await createSingleSimXPackage(sampleChemistryExp);
      const result = await shareSimXPackage(pkg, filename);

      expect(result.success).toBe(true);
      expect(result.method).toBe('download');
    });
  });
});

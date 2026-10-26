import { describe, it, expect } from 'vitest';
import { validateExperimentRun } from '../../src/core/experiment/validate';
import {
  createSingleSimXPackage,
  parseAndValidateSinglePackage,
} from '../../src/core/simxpack/singlePackage';
import type {
  ChemistryExperiment,
  ProbabilityExperiment,
  ProjectileExperiment,
} from '../../src/core/experiment/types';
import { runProjectileSimulation } from '../../src/core/simulations/projectile';

describe('Local Sharing Validation Hardening & Deep Consistency Pass', () => {
  const validChemistryExp: ChemistryExperiment = {
    schemaVersion: 1,
    id: 'c1111111-1111-4111-8111-111111111111',
    type: 'chemistry',
    title: 'Neutralization: HCl + NaOH',
    description: 'Equimolar strong acid and strong base',
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

  const validProbabilityExp: ProbabilityExperiment = {
    schemaVersion: 1,
    id: 'p2222222-2222-4222-8222-222222222222',
    type: 'probability',
    title: 'Fair Die Roll (6,000 rolls)',
    description: 'Uniform discrete probability test',
    createdAt: '2026-10-26T12:00:00.000Z',
    appVersion: '1.0.0',
    parameters: {
      kind: 'die',
      sides: 6,
      trials: 6000,
      seed: 987654321,
    },
    results: {
      counts: [1005, 990, 1012, 988, 1002, 1003],
      total: 6000,
    },
  };

  const projectileResults = runProjectileSimulation({ initialSpeed: 20, angleDeg: 45, gravity: 9.81 });
  const validProjectileExp: ProjectileExperiment = {
    schemaVersion: 1,
    id: 'j3333333-3333-4333-8333-333333333333',
    type: 'projectile',
    title: 'Earth 45° Ballistic Baseline',
    description: 'Parabolic motion test',
    createdAt: '2026-10-26T12:00:00.000Z',
    appVersion: '1.0.0',
    parameters: {
      initialSpeed: 20,
      angleDeg: 45,
      gravity: 9.81,
    },
    results: projectileResults,
  };

  describe('General Envelope & Type Guard Validation', () => {
    it('accepts fully valid baseline experiments', () => {
      expect(validateExperimentRun(validChemistryExp).valid).toBe(true);
      expect(validateExperimentRun(validProbabilityExp).valid).toBe(true);
      expect(validateExperimentRun(validProjectileExp).valid).toBe(true);
    });

    it('rejects missing or wrong type discriminator', () => {
      const bad = { ...validProbabilityExp, type: 'astronomy' as any };
      const res = validateExperimentRun(bad);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('type must be'))).toBe(true);
    });

    it('rejects non-object or null input', () => {
      expect(validateExperimentRun(null).valid).toBe(false);
      expect(validateExperimentRun('not an object').valid).toBe(false);
      expect(validateExperimentRun([]).valid).toBe(false);
    });

    it('rejects unknown top-level keys', () => {
      const bad = { ...validProbabilityExp, maliciousScript: 'alert(1)' };
      const res = validateExperimentRun(bad);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Unknown top-level field'))).toBe(true);
    });

    it('rejects empty, blank, or invalid UUID id', () => {
      const bad = { ...validProjectileExp, id: '   ' };
      const res = validateExperimentRun(bad);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('id must be a non-empty UUID string'))).toBe(true);
    });

    it('rejects invalid timestamps', () => {
      const bad = { ...validChemistryExp, createdAt: 'not-a-date' };
      const res = validateExperimentRun(bad);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('createdAt must be a valid ISO-8601 UTC timestamp'))).toBe(true);
    });
  });

  describe('Probability Experiment Deep Checks', () => {
    it('rejects NaN, Infinity, and -Infinity in trials and seed', () => {
      const badTrials = {
        ...validProbabilityExp,
        parameters: { ...validProbabilityExp.parameters, trials: NaN },
      };
      expect(validateExperimentRun(badTrials).valid).toBe(false);

      const badSeed = {
        ...validProbabilityExp,
        parameters: { ...validProbabilityExp.parameters, seed: Infinity },
      };
      expect(validateExperimentRun(badSeed).valid).toBe(false);
    });

    it('rejects trials exceeding 1,000,000 or less than 1', () => {
      const overMax = {
        ...validProbabilityExp,
        parameters: { ...validProbabilityExp.parameters, trials: 1_000_001 },
      };
      expect(validateExperimentRun(overMax).valid).toBe(false);

      const underMin = {
        ...validProbabilityExp,
        parameters: { ...validProbabilityExp.parameters, trials: 0 },
      };
      expect(validateExperimentRun(underMin).valid).toBe(false);
    });

    it('accepts trials at maximum boundary of 1,000,000', () => {
      const atMax = {
        ...validProbabilityExp,
        parameters: { ...validProbabilityExp.parameters, trials: 1_000_000 },
        results: { counts: [166666, 166666, 166667, 166667, 166667, 166667], total: 1_000_000 },
      };
      expect(validateExperimentRun(atMax).valid).toBe(true);
    });

    it('rejects mismatched counts array length', () => {
      const badLength = {
        ...validProbabilityExp,
        results: { counts: [3000, 3000], total: 6000 }, // 2 counts for 6 sides
      };
      const res = validateExperimentRun(badLength);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('counts length (2) must match sides (6)'))).toBe(true);
    });

    it('rejects negative or fractional probability counts', () => {
      const negCount = {
        ...validProbabilityExp,
        results: { counts: [-10, 1010, 1000, 1000, 1000, 2000], total: 6000 },
      };
      expect(validateExperimentRun(negCount).valid).toBe(false);

      const fracCount = {
        ...validProbabilityExp,
        results: { counts: [1000.5, 999.5, 1000, 1000, 1000, 1000], total: 6000 },
      };
      expect(validateExperimentRun(fracCount).valid).toBe(false);
    });

    it('rejects sum of counts not equal to total', () => {
      const sumMismatch = {
        ...validProbabilityExp,
        results: { counts: [1000, 1000, 1000, 1000, 1000, 999], total: 6000 }, // sum is 5999
      };
      const res = validateExperimentRun(sumMismatch);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('sum of counts (5999) does not equal total (6000)'))).toBe(true);
    });

    it('rejects results total not matching parameter trials', () => {
      const totalMismatch = {
        ...validProbabilityExp,
        results: { counts: [500, 500, 500, 500, 500, 500], total: 3000 }, // trials is 6000
      };
      const res = validateExperimentRun(totalMismatch);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('probability total (3000) must match parameter trials (6000)'))).toBe(true);
    });
  });

  describe('Projectile Experiment Deep Checks', () => {
    it('rejects non-finite speed, angle, or gravity (NaN, Infinity)', () => {
      const badSpeed = {
        ...validProjectileExp,
        parameters: { ...validProjectileExp.parameters, initialSpeed: NaN },
      };
      expect(validateExperimentRun(badSpeed).valid).toBe(false);

      const badAngle = {
        ...validProjectileExp,
        parameters: { ...validProjectileExp.parameters, angleDeg: -1 },
      };
      expect(validateExperimentRun(badAngle).valid).toBe(false);

      const badGrav = {
        ...validProjectileExp,
        parameters: { ...validProjectileExp.parameters, gravity: 31 }, // max is 30
      };
      expect(validateExperimentRun(badGrav).valid).toBe(false);
    });

    it('accepts boundary launch angles 0° and 90° with valid engine outputs', () => {
      const zeroAngleRes = runProjectileSimulation({ initialSpeed: 25, angleDeg: 0, gravity: 9.81 });
      const zeroAngleExp: ProjectileExperiment = {
        ...validProjectileExp,
        parameters: { initialSpeed: 25, angleDeg: 0, gravity: 9.81 },
        results: zeroAngleRes,
      };
      expect(validateExperimentRun(zeroAngleExp).valid).toBe(true);

      const ninetyAngleRes = runProjectileSimulation({ initialSpeed: 25, angleDeg: 90, gravity: 9.81 });
      const ninetyAngleExp: ProjectileExperiment = {
        ...validProjectileExp,
        parameters: { initialSpeed: 25, angleDeg: 90, gravity: 9.81 },
        results: ninetyAngleRes,
      };
      expect(validateExperimentRun(ninetyAngleExp).valid).toBe(true);
    });

    it('rejects trajectory with wrong point count or non-tuple points', () => {
      const badCount = {
        ...validProjectileExp,
        results: { ...validProjectileExp.results, trajectory: validProjectileExp.results.trajectory.slice(0, 100) },
      };
      expect(validateExperimentRun(badCount).valid).toBe(false);

      const nonTuplePoints = {
        ...validProjectileExp,
        results: {
          ...validProjectileExp.results,
          trajectory: Array.from({ length: 101 }, () => ({ x: 10, y: 10 })) as any,
        },
      };
      expect(validateExperimentRun(nonTuplePoints).valid).toBe(false);
    });

    it('rejects non-finite coordinates in trajectory samples', () => {
      const taintedTraj: [number, number][] = validProjectileExp.results.trajectory.map((pt) => [...pt] as [number, number]);
      taintedTraj[50] = [NaN, 10];
      const badPt = {
        ...validProjectileExp,
        results: { ...validProjectileExp.results, trajectory: taintedTraj },
      };
      expect(validateExperimentRun(badPt).valid).toBe(false);
    });

    it('rejects fabricated results that are inconsistent with projectile physics', () => {
      const fabricatedRange = {
        ...validProjectileExp,
        results: {
          ...validProjectileExp.results,
          range: 9999.99, // actual is ~40.77 m
        },
      };
      const res = validateExperimentRun(fabricatedRange);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('projectile range (9999.99) is inconsistent with parameters'))).toBe(true);
    });
  });

  describe('Chemistry Experiment Deep Checks', () => {
    it('rejects unknown arbitrary reagents in aqueous mode', () => {
      const unknownReagent = {
        ...validChemistryExp,
        parameters: {
          mode: 'aqueous' as const,
          reactants: [
            { formula: 'Xyz99', name: 'Unobtainium Solvent', volumeMl: 50, concentrationM: 1.0 },
            { formula: 'Abc11', name: 'Kryptonite Dust', volumeMl: 50, concentrationM: 1.0 },
          ],
        },
      };
      const res = validateExperimentRun(unknownReagent);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('recognizable chemical reagents'))).toBe(true);
    });

    it('rejects non-finite or negative volume and concentration', () => {
      const negVol = {
        ...validChemistryExp,
        parameters: {
          ...validChemistryExp.parameters,
          reactants: [
            { formula: 'HCl', name: 'Hydrochloric Acid', volumeMl: -50, concentrationM: 1.0 },
            { formula: 'NaOH', name: 'Sodium Hydroxide', volumeMl: 50, concentrationM: 1.0 },
          ],
        },
      };
      expect(validateExperimentRun(negVol).valid).toBe(false);

      const nanConc = {
        ...validChemistryExp,
        parameters: {
          ...validChemistryExp.parameters,
          reactants: [
            { formula: 'HCl', name: 'Hydrochloric Acid', volumeMl: 50, concentrationM: NaN },
            { formula: 'NaOH', name: 'Sodium Hydroxide', volumeMl: 50, concentrationM: 1.0 },
          ],
        },
      };
      expect(validateExperimentRun(nanConc).valid).toBe(false);
    });

    it('rejects out-of-range pH (< 0 or > 14)', () => {
      const badPh = {
        ...validChemistryExp,
        results: {
          ...validChemistryExp.results,
          finalPh: 15.5,
        },
      };
      const res = validateExperimentRun(badPh);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('finalPh must be a finite number between 0 and 14'))).toBe(true);
    });

    it('rejects non-finite temperature change or enthalpy', () => {
      const badEnthalpy = {
        ...validChemistryExp,
        results: {
          ...validChemistryExp.results,
          enthalpyKj: Infinity,
        },
      };
      expect(validateExperimentRun(badEnthalpy).valid).toBe(false);
    });
  });

  describe('Checksum & Package Integrity Contract', () => {
    it('rejects packages with missing provenance or missing checksum', async () => {
      const missingChecksum = {
        format: 'simxsphere-single',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        experiment: validChemistryExp,
        provenance: { engine: 'SimXSphere Local Engine' }, // no checksum!
      };
      const res = await parseAndValidateSinglePackage(JSON.stringify(missingChecksum));
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Missing mandatory SHA-256 checksum'))).toBe(true);
    });

    it('rejects malformed checksums (non-hex, wrong length, uppercase)', async () => {
      const badChecksum = {
        format: 'simxsphere-single',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        experiment: validChemistryExp,
        provenance: {
          engine: 'SimXSphere Local Engine',
          checksum: 'not-a-valid-hex-digest-1234',
        },
      };
      const res = await parseAndValidateSinglePackage(JSON.stringify(badChecksum));
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Malformed checksum'))).toBe(true);
    });

    it('rejects modified experiment contents with tampered checksum', async () => {
      const { jsonString } = await createSingleSimXPackage(validProbabilityExp);
      const pkg = JSON.parse(jsonString);

      // Modify trials in the payload
      pkg.experiment.parameters.trials = 3000;
      pkg.experiment.results.total = 3000;
      pkg.experiment.results.counts = [500, 500, 500, 500, 500, 500];

      const res = await parseAndValidateSinglePackage(JSON.stringify(pkg));
      expect(res.valid).toBe(false);
      expect(res.checksumValid).toBe(false);
      expect(res.errors.some((e) => e.includes('Package SHA-256 checksum mismatch'))).toBe(true);
    });

    it('successfully validates round-trip packages across chemistry, probability, and projectile', async () => {
      for (const exp of [validChemistryExp, validProbabilityExp, validProjectileExp]) {
        const { jsonString } = await createSingleSimXPackage(exp);
        const res = await parseAndValidateSinglePackage(jsonString);
        expect(res.valid).toBe(true);
        expect(res.checksumValid).toBe(true);
        expect(res.package?.experiment.id).toBe(exp.id);
      }
    });
  });
});

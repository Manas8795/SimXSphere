/**
 * Experiment Schema Validator (schemaVersion 1)
 * Hand-written type guards and structural validator with zero external dependencies.
 * Rejects unknown top-level fields, ensures schemaVersion === 1, and verifies bounds.
 * STRICT RULE: No UI/DOM imports. Pure computation.
 */

import type {
  ExperimentRun,
  ValidationResult,
  ProbabilityParameters,
  ProjectileParameters,
} from './types';
import { validateProbabilityParameters } from '../simulations/probability';
import { validateProjectileParameters, runProjectileSimulation } from '../simulations/projectile';
import { REAGENTS_DATABASE } from '../simulations/chemistry';
import { LAB_CHEMICALS } from '../../chemistry-data/reagents';

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'schemaVersion',
  'id',
  'type',
  'title',
  'description',
  'createdAt',
  'appVersion',
  'parameters',
  'results',
  'metadata',
]);

const ALLOWED_METADATA_KEYS = new Set(['notes', 'importedFromId']);

function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val);
}

function isNonNegativeFinite(val: unknown): val is number {
  return isFiniteNumber(val) && val >= 0;
}

const KNOWN_REAGENT_IDENTIFIERS = new Set<string>([
  ...REAGENTS_DATABASE.flatMap((r) => [r.id.toLowerCase(), r.formula.toLowerCase(), r.name.toLowerCase()]),
  ...LAB_CHEMICALS.flatMap((c) => [c.id.toLowerCase(), c.formula.toLowerCase(), c.name.toLowerCase()]),
]);

export function validateExperimentRun(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Experiment data must be an object'] };
  }

  const exp = data as Record<string, unknown>;

  // Check for unknown top-level fields per EXPERIMENT_SCHEMA.md
  for (const key of Object.keys(exp)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      errors.push(`Unknown top-level field rejected: "${key}"`);
    }
  }

  // schemaVersion must be 1
  if (exp.schemaVersion !== 1) {
    errors.push(`Unsupported schema version ${exp.schemaVersion}; only version 1 is supported`);
  }

  // id must be non-empty string
  if (typeof exp.id !== 'string' || exp.id.trim().length === 0) {
    errors.push('id must be a non-empty UUID string');
  }

  // type must be chemistry, probability, or projectile
  if (exp.type !== 'probability' && exp.type !== 'projectile' && exp.type !== 'chemistry') {
    errors.push('type must be "chemistry", "probability", or "projectile"');
  }

  // title: 1-80 chars
  if (typeof exp.title !== 'string' || exp.title.length < 1 || exp.title.length > 80) {
    errors.push('title must be a string between 1 and 80 characters');
  }

  // description: 0-500 chars
  if (typeof exp.description !== 'string' || exp.description.length > 500) {
    errors.push('description must be a string up to 500 characters');
  }

  // createdAt: ISO-8601 string
  if (typeof exp.createdAt !== 'string' || isNaN(Date.parse(exp.createdAt))) {
    errors.push('createdAt must be a valid ISO-8601 UTC timestamp');
  }

  // appVersion check
  if (exp.appVersion !== undefined && typeof exp.appVersion !== 'string') {
    errors.push('appVersion must be a string');
  }

  // metadata check (optional)
  if (exp.metadata !== undefined) {
    if (typeof exp.metadata !== 'object' || exp.metadata === null) {
      errors.push('metadata must be an object if present');
    } else {
      const meta = exp.metadata as Record<string, unknown>;
      for (const k of Object.keys(meta)) {
        if (!ALLOWED_METADATA_KEYS.has(k)) {
          errors.push(`Unknown metadata key: "${k}"`);
        }
      }
      if (meta.notes !== undefined && (typeof meta.notes !== 'string' || meta.notes.length > 500)) {
        errors.push('metadata.notes must be a string up to 500 characters');
      }
      if (meta.importedFromId !== undefined && typeof meta.importedFromId !== 'string') {
        errors.push('metadata.importedFromId must be a string');
      }
    }
  }

  // Specific validation per type
  if (exp.type === 'chemistry') {
    if (!exp.parameters || typeof exp.parameters !== 'object') {
      errors.push('chemistry parameters must be an object');
    } else {
      const params = exp.parameters as Record<string, unknown>;
      const validModes = ['synthesis', 'aqueous', 'stoichiometry', 'workplane'];
      if (typeof params.mode !== 'string' || !validModes.includes(params.mode)) {
        errors.push(`chemistry mode must be one of: ${validModes.join(', ')}`);
      }
      if (!Array.isArray(params.reactants) || params.reactants.length === 0) {
        errors.push('chemistry reactants must be a non-empty array');
      } else {
        let hasKnownReagent = false;
        for (let i = 0; i < params.reactants.length; i++) {
          const r = params.reactants[i];
          if (!r || typeof r !== 'object') {
            errors.push(`chemistry reactant at index ${i} must be an object`);
            continue;
          }
          const reactant = r as Record<string, unknown>;
          if (typeof reactant.formula !== 'string' || reactant.formula.trim().length === 0) {
            errors.push(`chemistry reactant[${i}].formula must be a non-empty string`);
          } else {
            const fClean = reactant.formula.trim().toLowerCase();
            const nClean = typeof reactant.name === 'string' ? reactant.name.trim().toLowerCase() : '';
            if (KNOWN_REAGENT_IDENTIFIERS.has(fClean) || (nClean && KNOWN_REAGENT_IDENTIFIERS.has(nClean))) {
              hasKnownReagent = true;
            }
          }
          if (typeof reactant.name !== 'string' || reactant.name.trim().length === 0) {
            errors.push(`chemistry reactant[${i}].name must be a non-empty string`);
          }
          if (reactant.volumeMl !== undefined) {
            if (!isFiniteNumber(reactant.volumeMl) || reactant.volumeMl <= 0 || reactant.volumeMl > 1000) {
              errors.push(`chemistry reactant[${i}].volumeMl must be a finite number between 0 and 1000 mL`);
            }
          }
          if (reactant.concentrationM !== undefined) {
            if (!isFiniteNumber(reactant.concentrationM) || reactant.concentrationM <= 0 || reactant.concentrationM > 20) {
              errors.push(`chemistry reactant[${i}].concentrationM must be a finite number between 0 and 20 M`);
            }
          }
          if (reactant.massGrams !== undefined) {
            if (!isFiniteNumber(reactant.massGrams) || reactant.massGrams <= 0 || reactant.massGrams > 5000) {
              errors.push(`chemistry reactant[${i}].massGrams must be a finite number between 0 and 5000 g`);
            }
          }
          if (reactant.ratio !== undefined) {
            if (!isFiniteNumber(reactant.ratio) || reactant.ratio <= 0) {
              errors.push(`chemistry reactant[${i}].ratio must be a positive finite number`);
            }
          }
        }

        if (params.mode === 'aqueous' && !hasKnownReagent) {
          errors.push('chemistry aqueous mode reactants must contain recognizable chemical reagents from the database');
        }
      }

      if (params.conditions !== undefined) {
        if (!params.conditions || typeof params.conditions !== 'object') {
          errors.push('chemistry conditions must be an object if present');
        } else {
          const cond = params.conditions as Record<string, unknown>;
          if (cond.temperatureC !== undefined) {
            if (!isFiniteNumber(cond.temperatureC) || cond.temperatureC < -273.15 || cond.temperatureC > 2000) {
              errors.push('chemistry conditions.temperatureC must be between -273.15 and 2000 °C');
            }
          }
          if (cond.pressureAtm !== undefined) {
            if (!isFiniteNumber(cond.pressureAtm) || cond.pressureAtm <= 0 || cond.pressureAtm > 1000) {
              errors.push('chemistry conditions.pressureAtm must be a positive number up to 1000 atm');
            }
          }
          if (cond.solvent !== undefined && typeof cond.solvent !== 'string') {
            errors.push('chemistry conditions.solvent must be a string');
          }
        }
      }
    }

    if (!exp.results || typeof exp.results !== 'object') {
      errors.push('chemistry results must be an object');
    } else {
      const res = exp.results as Record<string, unknown>;
      if (typeof res.reactionType !== 'string' || res.reactionType.trim().length === 0) {
        errors.push('chemistry results must specify a non-empty reactionType');
      }
      if (typeof res.balancedEquation !== 'string' || res.balancedEquation.trim().length === 0) {
        errors.push('chemistry results must specify a non-empty balancedEquation');
      }
      if (typeof res.isConserved !== 'boolean') {
        errors.push('chemistry results must specify boolean isConserved');
      }
      if (!Array.isArray(res.products)) {
        errors.push('chemistry results.products must be an array of strings');
      } else {
        for (let i = 0; i < res.products.length; i++) {
          if (typeof res.products[i] !== 'string') {
            errors.push(`chemistry results.products[${i}] must be a string`);
            break;
          }
        }
      }
      if (res.finalPh !== undefined && res.finalPh !== null) {
        if (!isFiniteNumber(res.finalPh) || res.finalPh < 0 || res.finalPh > 14) {
          errors.push('chemistry results.finalPh must be a finite number between 0 and 14 or null');
        }
      }
      if (res.temperatureChangeC !== undefined && res.temperatureChangeC !== null) {
        if (!isFiniteNumber(res.temperatureChangeC) || res.temperatureChangeC < -1000 || res.temperatureChangeC > 1000) {
          errors.push('chemistry results.temperatureChangeC must be a finite number between -1000 and 1000 °C or null');
        }
      }
      if (res.enthalpyKj !== undefined && res.enthalpyKj !== null) {
        if (!isFiniteNumber(res.enthalpyKj) || Math.abs(res.enthalpyKj) > 100000) {
          errors.push('chemistry results.enthalpyKj must be a finite number or null');
        }
      }
      if (res.precipitate !== undefined && res.precipitate !== null && typeof res.precipitate !== 'string') {
        errors.push('chemistry results.precipitate must be a string or null');
      }
      if (res.gasEvolved !== undefined && res.gasEvolved !== null && typeof res.gasEvolved !== 'string') {
        errors.push('chemistry results.gasEvolved must be a string or null');
      }
      if (typeof res.isCurated !== 'boolean') {
        errors.push('chemistry results must specify boolean isCurated');
      }
      if (typeof res.provenance !== 'string' || res.provenance.trim().length === 0) {
        errors.push('chemistry results must specify a non-empty provenance string');
      }
    }
  } else if (exp.type === 'probability') {
    const pValidation = validateProbabilityParameters(exp.parameters);
    if (!pValidation.valid) {
      errors.push(...pValidation.errors);
    }
    const params = exp.parameters as Partial<ProbabilityParameters> | undefined;

    if (!exp.results || typeof exp.results !== 'object') {
      errors.push('probability results must be an object');
    } else {
      const res = exp.results as Record<string, unknown>;
      if (!Array.isArray(res.counts)) {
        errors.push('probability results.counts must be an array');
      } else {
        const expectedSides = params?.sides;
        if (typeof expectedSides === 'number' && res.counts.length !== expectedSides) {
          errors.push(`probability counts length (${res.counts.length}) must match sides (${expectedSides})`);
        }
        let countSum = 0;
        let countsValid = true;
        for (let i = 0; i < res.counts.length; i++) {
          const c = res.counts[i];
          if (typeof c !== 'number' || !Number.isInteger(c) || c < 0) {
            errors.push(`probability count at index ${i} must be a non-negative integer`);
            countsValid = false;
            break;
          }
          countSum += c;
        }

        if (typeof res.total !== 'number' || !Number.isInteger(res.total) || res.total < 0) {
          errors.push('probability results.total must be a non-negative integer');
        } else {
          if (typeof params?.trials === 'number' && res.total !== params.trials) {
            errors.push(`probability total (${res.total}) must match parameter trials (${params.trials})`);
          }
          if (countsValid && countSum !== res.total) {
            errors.push(`sum of counts (${countSum}) does not equal total (${res.total})`);
          }
        }
      }
    }
  } else if (exp.type === 'projectile') {
    const pValidation = validateProjectileParameters(exp.parameters);
    if (!pValidation.valid) {
      errors.push(...pValidation.errors);
    }
    const params = exp.parameters as Partial<ProjectileParameters> | undefined;

    if (!exp.results || typeof exp.results !== 'object') {
      errors.push('projectile results must be an object');
    } else {
      const res = exp.results as Record<string, unknown>;
      if (!isNonNegativeFinite(res.range)) {
        errors.push('projectile results.range must be a finite, non-negative number');
      }
      if (!isNonNegativeFinite(res.flightTime)) {
        errors.push('projectile results.flightTime must be a finite, non-negative number');
      }
      if (!isNonNegativeFinite(res.maxHeight)) {
        errors.push('projectile results.maxHeight must be a finite, non-negative number');
      }

      if (!Array.isArray(res.trajectory)) {
        errors.push('projectile results.trajectory must be an array');
      } else if (res.trajectory.length !== 101) {
        errors.push(`projectile trajectory must contain exactly 101 points (got ${res.trajectory.length})`);
      } else {
        let trajectoryValid = true;
        for (let i = 0; i < res.trajectory.length; i++) {
          const pt = res.trajectory[i];
          if (!Array.isArray(pt) || pt.length !== 2 || !isFiniteNumber(pt[0]) || !isFiniteNumber(pt[1]) || pt[0] < 0 || pt[1] < 0) {
            errors.push(`projectile trajectory point at index ${i} must be a 2-tuple [x, y] of non-negative finite numbers`);
            trajectoryValid = false;
            break;
          }
        }

        // If parameters are valid and trajectory points are valid, verify physics consistency
        if (pValidation.valid && trajectoryValid && params && isFiniteNumber(res.range) && isFiniteNumber(res.flightTime) && isFiniteNumber(res.maxHeight)) {
          try {
            const expected = runProjectileSimulation(params as ProjectileParameters);
            const TOLERANCE = 0.15; // 0.15 m or s tolerance for floating point rounding differences
            if (Math.abs(res.range - expected.range) > TOLERANCE) {
              errors.push(`projectile range (${res.range}) is inconsistent with parameters (expected ~${expected.range.toFixed(2)})`);
            }
            if (Math.abs(res.flightTime - expected.flightTime) > TOLERANCE) {
              errors.push(`projectile flightTime (${res.flightTime}) is inconsistent with parameters (expected ~${expected.flightTime.toFixed(2)})`);
            }
            if (Math.abs(res.maxHeight - expected.maxHeight) > TOLERANCE) {
              errors.push(`projectile maxHeight (${res.maxHeight}) is inconsistent with parameters (expected ~${expected.maxHeight.toFixed(2)})`);
            }
          } catch {
            // parameter execution failure handled by validateProjectileParameters
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isExperimentRun(data: unknown): data is ExperimentRun {
  return validateExperimentRun(data).valid;
}

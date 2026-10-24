/**
 * Experiment Schema Validator (schemaVersion 1)
 * Hand-written type guards and structural validator with zero external dependencies.
 * Rejects unknown top-level fields, ensures schemaVersion === 1, and verifies bounds.
 * STRICT RULE: No UI/DOM imports. Pure computation.
 */

import type {
  ExperimentRun,
  ValidationResult,
} from './types';
import { validateProbabilityParameters } from '../simulations/probability';
import { validateProjectileParameters } from '../simulations/projectile';

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
      }
    }

    if (!exp.results || typeof exp.results !== 'object') {
      errors.push('chemistry results must be an object');
    } else {
      const res = exp.results as Record<string, unknown>;
      if (typeof res.reactionType !== 'string' || !res.reactionType) {
        errors.push('chemistry results must specify a valid reactionType');
      }
      if (typeof res.balancedEquation !== 'string' || !res.balancedEquation) {
        errors.push('chemistry results must specify a valid balancedEquation');
      }
      if (typeof res.isConserved !== 'boolean') {
        errors.push('chemistry results must specify boolean isConserved');
      }
    }
  } else if (exp.type === 'probability') {
    const pValidation = validateProbabilityParameters(exp.parameters);
    if (!pValidation.valid) {
      errors.push(...pValidation.errors);
    }

    if (!exp.results || typeof exp.results !== 'object') {
      errors.push('probability results must be an object');
    } else {
      const res = exp.results as Record<string, unknown>;
      if (!Array.isArray(res.counts) || typeof res.total !== 'number') {
        errors.push('probability results must have counts array and numeric total');
      } else {
        const sum = res.counts.reduce((a: number, b: number) => a + b, 0);
        if (sum !== res.total) {
          errors.push(`sum of counts (${sum}) does not equal total (${res.total})`);
        }
      }
    }
  } else if (exp.type === 'projectile') {
    const pValidation = validateProjectileParameters(exp.parameters);
    if (!pValidation.valid) {
      errors.push(...pValidation.errors);
    }

    if (!exp.results || typeof exp.results !== 'object') {
      errors.push('projectile results must be an object');
    } else {
      const res = exp.results as Record<string, unknown>;
      if (
        typeof res.range !== 'number' ||
        typeof res.flightTime !== 'number' ||
        typeof res.maxHeight !== 'number' ||
        !Array.isArray(res.trajectory)
      ) {
        errors.push('projectile results must have numeric range, flightTime, maxHeight, and trajectory array');
      } else if (res.trajectory.length !== 101) {
        errors.push(`projectile trajectory must contain exactly 101 points (got ${res.trajectory.length})`);
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

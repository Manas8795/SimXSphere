/**
 * SimXSphere Single-Experiment Portable Package Module (.simxpack)
 * Strict compliance with SimXSphere_Local_Export_Import_Sharing_Antigravity.md.
 * Pure local computation with zero external network or cloud dependencies.
 */

import type { ExperimentRun } from '../experiment/types';
import { serializeCanonicalJson } from '../experiment/serialize';
import { computeSha256 } from '../crypto/sha256';
import { validateExperimentRun } from '../experiment/validate';

export const SIMXPACK_SINGLE_FORMAT = 'simxsphere-single';
export const SIMXPACK_SCHEMA_VERSION = 1;
export const MAX_SINGLE_PACKAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB

export interface SimXSinglePackage {
  format: 'simxsphere-single';
  schemaVersion: 1;
  exportedAt: string; // ISO 8601
  appVersion: string;
  experiment: ExperimentRun;
  provenance: {
    engine: string;
    checksum: string; // SHA-256 of canonical JSON of experiment
    notes?: string;
  };
}

/**
 * Generates a clean, sanitized, descriptive filename:
 * simxsphere-<type>-<safe-title>-<yyyy-mm-dd>.simxpack
 */
export function sanitizeExportFilename(type: string, title: string, dateInput: Date | string = new Date()): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : (dateInput || new Date());
  const safeType = (type || 'simulation').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanTitle = (title || 'experiment')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const safeTitle = cleanTitle || 'experiment';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `simxsphere-${safeType}-${safeTitle}-${yyyy}-${mm}-${dd}.simxpack`;
}

/**
 * Creates a validated, checksummed portable .simxpack package from an experiment.
 */
export async function createSingleSimXPackage(
  experiment: ExperimentRun,
  notes?: string
): Promise<{ package: SimXSinglePackage; jsonString: string; filename: string }> {
  const validation = validateExperimentRun(experiment);
  if (!validation.valid) {
    throw new Error(`Cannot export invalid experiment: ${validation.errors.join('; ')}`);
  }

  const canonicalJson = serializeCanonicalJson(experiment);
  const checksum = await computeSha256(canonicalJson);

  const pkg: SimXSinglePackage = {
    format: SIMXPACK_SINGLE_FORMAT,
    schemaVersion: SIMXPACK_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: experiment.appVersion || '1.0.0',
    experiment,
    provenance: {
      engine: 'SimXSphere Local Engine',
      checksum,
      notes,
    },
  };

  const jsonString = JSON.stringify(pkg, null, 2);
  const filename = sanitizeExportFilename(experiment.type, experiment.title, new Date(pkg.exportedAt));

  return { package: pkg, jsonString, filename };
}

export interface ParseSinglePackageResult {
  valid: boolean;
  package?: SimXSinglePackage;
  errors: string[];
  checksumValid?: boolean;
}

/**
 * Parses and validates an imported .simxpack package.
 * Defends against oversized payloads, malformed JSON, unsupported schemas, and tampered checksums.
 */
export async function parseAndValidateSinglePackage(
  input: string | unknown
): Promise<ParseSinglePackageResult> {
  const errors: string[] = [];
  let parsed: unknown;

  if (typeof input === 'string') {
    if (new TextEncoder().encode(input).byteLength > MAX_SINGLE_PACKAGE_SIZE_BYTES) {
      return {
        valid: false,
        errors: [`Package size exceeds maximum allowed limit of 5 MiB`],
      };
    }
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      return {
        valid: false,
        errors: [`Malformed JSON: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  } else {
    parsed = input;
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Package must be an object'] };
  }

  const record = parsed as Record<string, unknown>;

  // Check format: must strictly be 'simxsphere-single'
  if (record.format !== SIMXPACK_SINGLE_FORMAT) {
    errors.push(`Invalid format identifier "${String(record.format)}"; expected "${SIMXPACK_SINGLE_FORMAT}"`);
  }

  // Schema version must be 1
  if (record.schemaVersion !== SIMXPACK_SCHEMA_VERSION) {
    errors.push(`Unsupported schema version "${String(record.schemaVersion)}"; expected 1`);
  }

  // Provenance and SHA-256 Checksum contract for schema v1
  if (!record.provenance || typeof record.provenance !== 'object') {
    errors.push('Missing mandatory provenance metadata in package');
  } else {
    const prov = record.provenance as Record<string, unknown>;
    if (typeof prov.checksum !== 'string' || prov.checksum.trim().length === 0) {
      errors.push('Missing mandatory SHA-256 checksum in package provenance');
    } else if (!/^[a-f0-9]{64}$/.test(prov.checksum)) {
      errors.push('Malformed checksum: expected 64-character lowercase hexadecimal SHA-256 digest');
    }
  }

  // Experiment payload
  if (!record.experiment || typeof record.experiment !== 'object') {
    errors.push('Missing experiment payload in package');
  } else {
    const expValidation = validateExperimentRun(record.experiment);
    if (!expValidation.valid) {
      errors.push(...expValidation.errors);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, checksumValid: false };
  }

  const validPkg = record as unknown as SimXSinglePackage;

  // Cryptographic integrity verification: recompute digest over canonical JSON of experiment
  const canonical = serializeCanonicalJson(validPkg.experiment);
  const computed = await computeSha256(canonical);
  const checksumMatches = computed.toLowerCase() === validPkg.provenance.checksum.toLowerCase();

  if (!checksumMatches) {
    errors.push('Package SHA-256 checksum mismatch (file may have been modified or corrupted)');
    return {
      valid: false,
      errors,
      checksumValid: false,
    };
  }

  return {
    valid: true,
    package: validPkg,
    errors: [],
    checksumValid: true,
  };
}

/**
 * Triggers a native browser file download safely.
 */
export function triggerFileDownload(filename: string, content: string | Blob): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = typeof content === 'string' ? new Blob([content], { type: 'application/json' }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * File-based share helper:
 * Uses Web Share API with file attachment if supported; otherwise downloads the file.
 */
export async function shareSimXPackage(
  pkg: SimXSinglePackage,
  filename: string
): Promise<{ success: boolean; method: 'native' | 'download'; error?: string }> {
  const json = JSON.stringify(pkg, null, 2);

  // Check if native Web Share API with files is supported
  if (
    typeof navigator !== 'undefined' &&
    typeof File !== 'undefined' &&
    navigator.canShare
  ) {
    try {
      const file = new File([json], filename, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `SimXSphere: ${pkg.experiment.title}`,
          text: `Portable simulation experiment: ${pkg.experiment.title} (${pkg.experiment.type}). Open in SimXSphere to reproduce and explore.`,
          files: [file],
        });
        return { success: true, method: 'native' };
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, method: 'native', error: 'Share was canceled' };
      }
      // Fall through to download fallback
    }
  }

  // Fallback: trigger download
  triggerFileDownload(filename, json);
  return { success: true, method: 'download' };
}

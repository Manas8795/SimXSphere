/**
 * SimXPack Security-Hardened Import Pipeline
 * Strict compliance with SIMXPACK_SPEC.md (Section 6) and SECURITY.md (Section 5)
 * Pure computation. Zero UI / DOM dependencies.
 */

import type {
  ExperimentRun,
  SimXPackManifest,
  PackageMetadata,
} from '../experiment/types';
import { extractZipArchive } from './zip';
import { computeSha256 } from '../crypto/sha256';
import { validateExperimentRun } from '../experiment/validate';

export const MAX_COMPRESSED_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB
export const MAX_ENTRY_UNCOMPRESSED_BYTES = 2 * 1024 * 1024; // 2 MiB
export const MAX_TOTAL_UNCOMPRESSED_BYTES = 5 * 1024 * 1024; // 5 MiB
export const MAX_ENTRY_COUNT = 20;

// Allowlist regex patterns per SIMXPACK_SPEC.md section 2
const ALLOWED_PATH_PATTERNS = [
  /^manifest\.json$/,
  /^README\.txt$/,
  /^experiments\/[a-z0-9][a-z0-9-]{0,63}\.json$/,
  /^csv\/[a-z0-9][a-z0-9-]{0,63}\.csv$/,
];

export interface ImportSimXPackResult {
  manifest: SimXPackManifest;
  experiments: ExperimentRun[];
  metadata: PackageMetadata;
}

export async function importSimXPack(
  zipBytes: Uint8Array,
  conflictStrategy: 'overwrite' | 'skip' | 'copy' = 'overwrite',
  existingExperimentIds: string[] = []
): Promise<ImportSimXPackResult> {
  // Step 1: File size <= 5 MiB before reading
  if (!zipBytes || zipBytes.byteLength === 0) {
    throw new Error('ZIP archive is empty or invalid');
  }
  if (zipBytes.byteLength > MAX_COMPRESSED_SIZE_BYTES) {
    throw new Error(
      `ZIP file exceeds maximum allowed size of 5 MiB (got ${(zipBytes.byteLength / 1024 / 1024).toFixed(2)} MiB)`
    );
  }

  // Step 2: Valid ZIP central directory parses
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = extractZipArchive(zipBytes);
  } catch (err) {
    throw new Error(`Failed to parse ZIP archive: ${err instanceof Error ? err.message : String(err)}`);
  }

  const entryPaths = Object.keys(unzipped);

  // Step 3: Entry count <= 20; no duplicates (case-insensitive)
  if (entryPaths.length === 0) {
    throw new Error('ZIP archive contains no entries');
  }
  if (entryPaths.length > MAX_ENTRY_COUNT) {
    throw new Error(
      `ZIP archive contains ${entryPaths.length} entries, exceeding maximum limit of ${MAX_ENTRY_COUNT}`
    );
  }

  const seenLower = new Set<string>();
  for (const path of entryPaths) {
    const lower = path.toLowerCase();
    if (seenLower.has(lower)) {
      throw new Error(`Duplicate entry in ZIP archive detected (case-insensitive): "${path}"`);
    }
    seenLower.add(lower);
  }

  // Step 4: Every path matches the allowlist regex; reject zip-slip, absolute paths, backslashes
  for (const path of entryPaths) {
    // Check for malicious path sequences
    if (
      path.includes('..') ||
      path.startsWith('/') ||
      path.includes('\\') ||
      path.includes('\0') ||
      /^[a-zA-Z]:/.test(path)
    ) {
      throw new Error(`Malicious path detected and rejected (Zip-Slip defense): "${path}"`);
    }

    const isAllowed = ALLOWED_PATH_PATTERNS.some((pattern) => pattern.test(path));
    if (!isAllowed) {
      throw new Error(`File path rejected (not in SimXPack allowlist): "${path}"`);
    }
  }

  // Step 5 & 6: Running byte counter and size limit enforcement (Decompression Bomb defense)
  let totalDecompressedBytes = 0;
  for (const path of entryPaths) {
    const entryData = unzipped[path];
    const entrySize = entryData.byteLength;

    if (entrySize > MAX_ENTRY_UNCOMPRESSED_BYTES) {
      throw new Error(
        `Entry "${path}" size exceeds per-entry limit of 2 MiB (got ${(entrySize / 1024 / 1024).toFixed(2)} MiB)`
      );
    }

    totalDecompressedBytes += entrySize;
    if (totalDecompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error(
        `Total uncompressed size exceeds maximum 5 MiB expansion limit (ZIP bomb protection)`
      );
    }
  }

  // Step 7: manifest.json exists, is JSON, format == "simxpack", formatVersion == 1
  const manifestData = unzipped['manifest.json'];
  if (!manifestData) {
    throw new Error('Missing required "manifest.json" in archive root');
  }

  const decoder = new TextDecoder('utf-8');
  let manifest: SimXPackManifest;
  try {
    const manifestJsonStr = decoder.decode(manifestData);
    manifest = JSON.parse(manifestJsonStr);
  } catch (err) {
    throw new Error(`Malformed manifest.json: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (manifest.format !== 'simxpack') {
    throw new Error(`Invalid manifest format "${manifest.format}"; expected "simxpack"`);
  }
  if (manifest.formatVersion !== 1) {
    throw new Error(`Unsupported schema version ${manifest.formatVersion}; expected 1`);
  }

  // Step 8: Every file in ZIP is listed in manifest and vice versa; sizes and SHA-256 match
  const manifestFilesMap = new Map<string, { sizeBytes: number; sha256: string }>();
  for (const fileEntry of manifest.files) {
    manifestFilesMap.set(fileEntry.path, fileEntry);
  }

  // All files in ZIP except manifest.json must be listed in manifest
  for (const path of entryPaths) {
    if (path === 'manifest.json') continue;
    const declared = manifestFilesMap.get(path);
    if (!declared) {
      throw new Error(`Unlisted file in ZIP archive not present in manifest: "${path}"`);
    }

    const actualData = unzipped[path];
    if (actualData.byteLength !== declared.sizeBytes) {
      throw new Error(
        `File size mismatch for "${path}": manifest declared ${declared.sizeBytes} B, actual ${actualData.byteLength} B`
      );
    }

    const actualHash = await computeSha256(actualData);
    if (actualHash.toLowerCase() !== declared.sha256.toLowerCase()) {
      throw new Error(`SHA-256 hash mismatch for file: "${path}" (tampering or corruption detected)`);
    }
  }

  // Manifest files must all exist in ZIP
  for (const [path] of manifestFilesMap) {
    if (!unzipped[path]) {
      throw new Error(`File listed in manifest is missing from ZIP archive: "${path}"`);
    }
  }

  // Step 9: Parse and validate each experiment; 2-4 experiments required
  if (
    !Array.isArray(manifest.experiments) ||
    manifest.experiments.length < 2 ||
    manifest.experiments.length > 4
  ) {
    throw new Error(
      `SimXPack must contain between 2 and 4 experiments (manifest lists ${manifest.experiments?.length ?? 0})`
    );
  }

  const extractedExperiments: ExperimentRun[] = [];
  const existingSet = new Set(existingExperimentIds);

  for (const expEntry of manifest.experiments) {
    const fileBytes = unzipped[expEntry.path];
    if (!fileBytes) {
      throw new Error(`Experiment file missing at path: "${expEntry.path}"`);
    }

    let parsedExp: Record<string, unknown>;
    try {
      parsedExp = JSON.parse(decoder.decode(fileBytes));
    } catch {
      throw new Error(`Malformed experiment JSON in "${expEntry.path}"`);
    }

    // Validate experiment schema
    const valResult = validateExperimentRun(parsedExp);
    if (!valResult.valid) {
      throw new Error(
        `Invalid experiment in "${expEntry.path}": ${valResult.errors.join('; ')}`
      );
    }

    const typedExp = parsedExp as unknown as ExperimentRun;

    if (typedExp.id !== expEntry.id) {
      throw new Error(
        `Experiment ID mismatch in "${expEntry.path}": manifest lists "${expEntry.id}", file contains "${typedExp.id}"`
      );
    }

    // Step 10: Conflict handling
    if (existingSet.has(typedExp.id)) {
      if (conflictStrategy === 'skip') {
        continue;
      } else if (conflictStrategy === 'copy') {
        const copyExp: ExperimentRun = {
          ...typedExp,
          id: crypto.randomUUID(),
          title: `${typedExp.title} (Copy)`,
          metadata: {
            ...typedExp.metadata,
            importedFromId: typedExp.id,
          },
        };
        extractedExperiments.push(copyExp);
        continue;
      }
      // 'overwrite' proceeds normally
    }

    extractedExperiments.push(typedExp);
  }

  const zipHash = await computeSha256(zipBytes);
  const metadata: PackageMetadata = {
    id: manifest.collection.id || crypto.randomUUID(),
    name: manifest.collection.name,
    description: manifest.collection.description,
    createdAt: manifest.createdAt,
    experimentCount: extractedExperiments.length,
    experimentIds: extractedExperiments.map((e) => e.id),
    uncompressedBytes: totalDecompressedBytes,
    compressedBytes: zipBytes.byteLength,
    sha256: zipHash,
    storageLocation: 'local',
  };

  return {
    manifest,
    experiments: extractedExperiments,
    metadata,
  };
}

export interface PackageInspectionResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest: SimXPackManifest | null;
  experiments: Array<{
    id: string;
    title: string;
    type: string;
    timestamp?: string;
  }>;
  moduleBreakdown: Record<string, number>;
  stats: {
    uncompressedBytes: number;
    compressedBytes: number;
    savedBytes: number;
    percentSaved: number;
    entryCount: number;
  };
  sha256Checksum: string;
  schemaVersion: number;
}

/**
 * Inspects a SimXPack archive before import.
 * Parses and verifies security bounds, schema, manifest, and checksums
 * without committing anything to local storage.
 */
export async function inspectSimXPack(zipBytes: Uint8Array): Promise<PackageInspectionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!zipBytes || zipBytes.byteLength === 0) {
    return {
      valid: false,
      errors: ['ZIP archive is empty or invalid'],
      warnings: [],
      manifest: null,
      experiments: [],
      moduleBreakdown: {},
      stats: { uncompressedBytes: 0, compressedBytes: 0, savedBytes: 0, percentSaved: 0, entryCount: 0 },
      sha256Checksum: '',
      schemaVersion: 0,
    };
  }

  const zipHash = await computeSha256(zipBytes);
  const compressedBytes = zipBytes.byteLength;

  if (compressedBytes > MAX_COMPRESSED_SIZE_BYTES) {
    errors.push(
      `ZIP file exceeds maximum allowed size of 5 MiB (got ${(compressedBytes / 1024 / 1024).toFixed(2)} MiB)`
    );
  }

  let unzipped: Record<string, Uint8Array> = {};
  try {
    unzipped = extractZipArchive(zipBytes);
  } catch (err) {
    return {
      valid: false,
      errors: [`Failed to parse ZIP archive: ${err instanceof Error ? err.message : String(err)}`],
      warnings: [],
      manifest: null,
      experiments: [],
      moduleBreakdown: {},
      stats: { uncompressedBytes: 0, compressedBytes, savedBytes: 0, percentSaved: 0, entryCount: 0 },
      sha256Checksum: zipHash,
      schemaVersion: 0,
    };
  }

  const entryPaths = Object.keys(unzipped);
  if (entryPaths.length === 0) {
    errors.push('ZIP archive contains no entries');
  }
  if (entryPaths.length > MAX_ENTRY_COUNT) {
    errors.push(`Archive contains ${entryPaths.length} entries, exceeding limit of ${MAX_ENTRY_COUNT}`);
  }

  let totalUncompressedBytes = 0;
  for (const path of entryPaths) {
    if (
      path.includes('..') ||
      path.startsWith('/') ||
      path.includes('\\') ||
      path.includes('\0') ||
      /^[a-zA-Z]:/.test(path)
    ) {
      errors.push(`Malicious path detected (Zip-Slip defense): "${path}"`);
    }
    const isAllowed = ALLOWED_PATH_PATTERNS.some((p) => p.test(path));
    if (!isAllowed) {
      errors.push(`File path rejected (not in allowlist): "${path}"`);
    }

    const size = unzipped[path].byteLength;
    if (size > MAX_ENTRY_UNCOMPRESSED_BYTES) {
      errors.push(`Entry "${path}" exceeds 2 MiB limit`);
    }
    totalUncompressedBytes += size;
  }

  if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
    errors.push('Total uncompressed size exceeds 5 MiB (ZIP bomb defense)');
  }

  let manifest: SimXPackManifest | null = null;
  const manifestData = unzipped['manifest.json'];
  if (!manifestData) {
    errors.push('Missing required "manifest.json" in archive root');
  } else {
    try {
      const jsonStr = new TextDecoder('utf-8').decode(manifestData);
      manifest = JSON.parse(jsonStr);
      if (manifest?.format !== 'simxpack') {
        errors.push(`Invalid format "${manifest?.format}"; expected "simxpack"`);
      }
      if (manifest?.formatVersion !== 1) {
        errors.push(`Unsupported schema version ${manifest?.formatVersion}; expected 1`);
      }
    } catch (err) {
      errors.push(`Malformed manifest.json: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const experimentsSummary: Array<{ id: string; title: string; type: string; timestamp?: string }> = [];
  const moduleBreakdown: Record<string, number> = {};

  if (manifest && Array.isArray(manifest.experiments)) {
    for (const expEntry of manifest.experiments) {
      const fileData = unzipped[expEntry.path];
      if (!fileData) {
        errors.push(`Manifest references missing file "${expEntry.path}"`);
        continue;
      }
      try {
        const expJson = JSON.parse(new TextDecoder('utf-8').decode(fileData));
        const expTitle = String(expJson.title || expEntry.id);
        const validation = validateExperimentRun(expJson);
        if (!validation.valid) {
          warnings.push(`Experiment "${expTitle}" has validation warnings: ${validation.errors.join('; ')}`);
        }
        const type = expJson.type || expEntry.type || 'unknown';
        moduleBreakdown[type] = (moduleBreakdown[type] || 0) + 1;
        experimentsSummary.push({
          id: String(expJson.id || expEntry.id),
          title: expTitle,
          type,
          timestamp: expJson.timestamp,
        });
      } catch {
        errors.push(`Failed to parse experiment data in "${expEntry.path}"`);
      }
    }
  }

  const savedBytes = totalUncompressedBytes - compressedBytes;
  const percentSaved = totalUncompressedBytes > 0 ? (savedBytes / totalUncompressedBytes) * 100 : 0;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest,
    experiments: experimentsSummary,
    moduleBreakdown,
    stats: {
      uncompressedBytes: totalUncompressedBytes,
      compressedBytes,
      savedBytes,
      percentSaved,
      entryCount: entryPaths.length,
    },
    sha256Checksum: zipHash,
    schemaVersion: manifest?.formatVersion || 1,
  };
}

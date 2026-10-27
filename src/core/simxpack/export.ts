/**
 * SimXPack Export Module
 * Strict compliance with SIMXPACK_SPEC.md formatVersion 1.
 * Bundles 2-4 experiments into a verifiable ZIP archive with manifest and SHA-256 checksums.
 * Pure computation. Zero UI / DOM dependencies.
 */

import type {
  ExperimentRun,
  SimXPackManifest,
  PackageMetadata,
  ManifestExperimentEntry,
  ManifestFileEntry,
  ProbabilityExperiment,
  ProjectileExperiment,
} from '../experiment/types';
import { serializeCanonicalJson } from '../experiment/serialize';
import { computeSha256 } from '../crypto/sha256';
import { exportProbabilityCsv, exportProjectileCsv } from './csv';
import { createZipArchive, type ZipFileEntry } from './zip';
import { validateExperimentRun } from '../experiment/validate';

export interface ExportSimXPackOptions {
  collection: {
    id?: string;
    name: string;
    description?: string;
  };
  includeCsv?: boolean;
}

export interface ExportSimXPackResult {
  manifest: SimXPackManifest;
  zipBytes: Uint8Array;
  metadata: PackageMetadata;
  stats: {
    uncompressedBytes: number;
    compressedBytes: number;
    savedBytes: number;
    percentSaved: number;
  };
}

function sanitizeSlug(str: string, fallback: string): string {
  const cleaned = str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const finalSlug = cleaned.slice(0, 40);
  return finalSlug.length > 0 && /^[a-z0-9]/.test(finalSlug) ? finalSlug : fallback;
}

export async function exportSimXPack(
  experiments: ExperimentRun[],
  options: ExportSimXPackOptions
): Promise<ExportSimXPackResult> {
  // Support 1 to 10 experiments per pack
  if (!Array.isArray(experiments) || experiments.length < 1 || experiments.length > 10) {
    throw new Error(
      `SimXPack requires between 1 and 10 experiments (got ${experiments?.length ?? 0})`
    );
  }

  // Validate each experiment before bundling
  for (const exp of experiments) {
    const val = validateExperimentRun(exp);
    if (!val.valid) {
      throw new Error(`Cannot export invalid experiment (${exp.id}): ${val.errors.join('; ')}`);
    }
  }

  const collectionId = options.collection.id || crypto.randomUUID();
  const collectionName = (options.collection.name || 'SimXPack Collection').trim().slice(0, 80);
  const collectionDesc = (options.collection.description || '').trim().slice(0, 500);

  const manifestExperiments: ManifestExperimentEntry[] = [];
  const manifestFiles: ManifestFileEntry[] = [];
  const zipEntries: ZipFileEntry[] = [];

  const encoder = new TextEncoder();
  let totalUncompressedBytes = 0;

  // Process each experiment file
  for (let i = 0; i < experiments.length; i++) {
    const exp = experiments[i];
    const slug = sanitizeSlug(exp.title, `exp-${i + 1}`);
    const expPath = `experiments/exp-${i + 1}-${slug}.json`;

    // Canonical JSON bytes
    const canonicalJson = serializeCanonicalJson(exp);
    const expBytes = encoder.encode(canonicalJson);
    const expHash = await computeSha256(expBytes);

    manifestExperiments.push({
      id: exp.id,
      type: exp.type,
      path: expPath,
    });

    manifestFiles.push({
      path: expPath,
      sizeBytes: expBytes.byteLength,
      sha256: expHash,
    });

    zipEntries.push({
      path: expPath,
      data: expBytes,
    });

    totalUncompressedBytes += expBytes.byteLength;

    // Optional CSV inclusion
    if (options.includeCsv !== false) {
      const csvStr =
        exp.type === 'probability'
          ? exportProbabilityCsv(exp as ProbabilityExperiment)
          : exportProjectileCsv(exp as ProjectileExperiment);
      const csvBytes = encoder.encode(csvStr);
      const csvPath = `csv/exp-${i + 1}-${slug}.csv`;
      const csvHash = await computeSha256(csvBytes);

      manifestFiles.push({
        path: csvPath,
        sizeBytes: csvBytes.byteLength,
        sha256: csvHash,
      });

      zipEntries.push({
        path: csvPath,
        data: csvBytes,
      });

      totalUncompressedBytes += csvBytes.byteLength;
    }
  }

  // Optional human-readable README.txt
  const readmeText = [
    `SimXSphere Experiment Collection: ${collectionName}`,
    `Created: ${new Date().toISOString()}`,
    `Experiments: ${experiments.length}`,
    collectionDesc ? `Description: ${collectionDesc}` : '',
    '',
    'This archive contains verified scientific simulations.',
    'manifest.json contains SHA-256 digests of all enclosed files.',
  ].filter(Boolean).join('\n');

  const readmeBytes = encoder.encode(readmeText);
  const readmePath = 'README.txt';
  const readmeHash = await computeSha256(readmeBytes);

  manifestFiles.push({
    path: readmePath,
    sizeBytes: readmeBytes.byteLength,
    sha256: readmeHash,
  });

  zipEntries.push({
    path: readmePath,
    data: readmeBytes,
  });

  totalUncompressedBytes += readmeBytes.byteLength;

  // Build manifest.json (manifest does not list itself)
  const manifest: SimXPackManifest = {
    format: 'simxpack',
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    appVersion: '1.0.0',
    collection: {
      id: collectionId,
      name: collectionName,
      description: collectionDesc,
    },
    experiments: manifestExperiments,
    files: manifestFiles,
    totals: {
      fileCount: manifestFiles.length + 1, // includes manifest.json
      uncompressedBytes: totalUncompressedBytes,
    },
  };

  const manifestCanonical = serializeCanonicalJson(manifest);
  const manifestBytes = encoder.encode(manifestCanonical);
  totalUncompressedBytes += manifestBytes.byteLength;
  manifest.totals.uncompressedBytes = totalUncompressedBytes;

  // Re-encode with updated total bytes
  const finalManifestBytes = encoder.encode(serializeCanonicalJson(manifest));

  // Add manifest.json as first entry in ZIP
  const fullZipEntries: ZipFileEntry[] = [
    { path: 'manifest.json', data: finalManifestBytes },
    ...zipEntries,
  ];

  // Create ZIP archive
  const zipBytes = createZipArchive(fullZipEntries);
  const zipHash = await computeSha256(zipBytes);

  const compressedBytes = zipBytes.byteLength;
  const savedBytes = totalUncompressedBytes - compressedBytes;
  const percentSaved =
    totalUncompressedBytes > 0 ? (savedBytes / totalUncompressedBytes) * 100 : 0;

  const metadata: PackageMetadata = {
    id: collectionId,
    name: collectionName,
    description: collectionDesc,
    createdAt: manifest.createdAt,
    experimentCount: experiments.length,
    experimentIds: experiments.map((e) => e.id),
    uncompressedBytes: totalUncompressedBytes,
    compressedBytes,
    sha256: zipHash,
    storageLocation: 'local',
  };

  return {
    manifest,
    zipBytes,
    metadata,
    stats: {
      uncompressedBytes: totalUncompressedBytes,
      compressedBytes,
      savedBytes,
      percentSaved,
    },
  };
}

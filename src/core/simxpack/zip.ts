/**
 * ZIP Abstraction Wrapper over fflate
 * Isolates ZIP library operations per SIMXPACK_SPEC.md section 8.
 * Pure computation. Zero UI / DOM dependencies.
 */

import { zipSync, unzipSync, type AsyncZippable, type Unzipped } from 'fflate';

export interface ZipFileEntry {
  path: string;
  data: Uint8Array;
}

/**
 * Synchronous in-memory ZIP creation with normalized timestamps for stable output
 */
export function createZipArchive(entries: ZipFileEntry[]): Uint8Array {
  const zippable: AsyncZippable = {};

  // Fixed UTC timestamp so hashes of identical content remain reproducible
  const fixedDate = new Date('2026-10-19T10:00:00.000Z');

  for (const entry of entries) {
    zippable[entry.path] = [entry.data, { mtime: fixedDate, level: 6 }];
  }

  return zipSync(zippable);
}

/**
 * Synchronous in-memory ZIP extraction
 */
export function extractZipArchive(zipBytes: Uint8Array): Record<string, Uint8Array> {
  const unzipped: Unzipped = unzipSync(zipBytes);
  return unzipped;
}

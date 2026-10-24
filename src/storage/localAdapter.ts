/**
 * LocalStorageAdapter
 * Offline-first, browser-local implementation of StorageAdapter.
 * Pure client-side persistence with fallback in-memory store for Node / Vitest environments.
 */

import type { StorageAdapter, StoragePackageItem } from './StorageAdapter';
import type { ExperimentRun, PackageMetadata } from '../core/experiment/types';
import { validateExperimentRun } from '../core/experiment/validate';

const EXPERIMENTS_KEY = 'simxsphere:experiments';
const PACKAGES_KEY = 'simxsphere:packages';
const PAYLOAD_PREFIX = 'simxsphere:pkg_payload:';

export class LocalStorageAdapter implements StorageAdapter {
  readonly mode = 'local' as const;

  // In-memory fallback map when localStorage is not available (e.g. Node tests)
  private memoryStore: Map<string, string> = new Map();

  private isLocalStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__simxsphere_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private getItem(key: string): string | null {
    if (this.isLocalStorageAvailable()) {
      return window.localStorage.getItem(key);
    }
    return this.memoryStore.get(key) ?? null;
  }

  private setItem(key: string, value: string): void {
    if (this.isLocalStorageAvailable()) {
      window.localStorage.setItem(key, value);
    } else {
      this.memoryStore.set(key, value);
    }
  }

  private removeItem(key: string): void {
    if (this.isLocalStorageAvailable()) {
      window.localStorage.removeItem(key);
    } else {
      this.memoryStore.delete(key);
    }
  }

  // --- Experiment Operations ---

  async saveExperiment(experiment: ExperimentRun): Promise<void> {
    const validation = validateExperimentRun(experiment);
    if (!validation.valid) {
      throw new Error(`Invalid experiment: ${validation.errors.join('; ')}`);
    }

    const experiments = await this.listExperiments();
    // Overwrite or append
    const updated = [experiment, ...experiments.filter((e) => e.id !== experiment.id)];
    this.setItem(EXPERIMENTS_KEY, JSON.stringify(updated));
  }

  async listExperiments(): Promise<ExperimentRun[]> {
    const raw = this.getItem(EXPERIMENTS_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as ExperimentRun[];
      // Sort by createdAt descending
      return parsed.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch {
      return [];
    }
  }

  async getExperiment(id: string): Promise<ExperimentRun | null> {
    const list = await this.listExperiments();
    return list.find((e) => e.id === id) ?? null;
  }

  async deleteExperiment(id: string): Promise<void> {
    const list = await this.listExperiments();
    const filtered = list.filter((e) => e.id !== id);
    this.setItem(EXPERIMENTS_KEY, JSON.stringify(filtered));
  }

  async clearAllExperiments(): Promise<void> {
    this.removeItem(EXPERIMENTS_KEY);
  }

  // --- Package (SimXPack) Operations ---

  async savePackage(metadata: PackageMetadata, zipBytes: Uint8Array): Promise<void> {
    const packages = await this.listPackages();
    const updated = [metadata, ...packages.filter((p) => p.id !== metadata.id)];
    this.setItem(PACKAGES_KEY, JSON.stringify(updated));

    // Save binary payload as base64 string
    const base64 = uint8ArrayToBase64(zipBytes);
    this.setItem(`${PAYLOAD_PREFIX}${metadata.id}`, base64);
  }

  async listPackages(): Promise<PackageMetadata[]> {
    const raw = this.getItem(PACKAGES_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as PackageMetadata[];
      return parsed.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch {
      return [];
    }
  }

  async getPackage(id: string): Promise<StoragePackageItem | null> {
    const packages = await this.listPackages();
    const meta = packages.find((p) => p.id === id);
    if (!meta) return null;

    const rawPayload = this.getItem(`${PAYLOAD_PREFIX}${id}`);
    if (!rawPayload) return null;

    const zipBytes = base64ToUint8Array(rawPayload);
    return {
      metadata: meta,
      zipBytes,
    };
  }

  async getPackageDownloadUrl(id: string): Promise<string | null> {
    const pkg = await this.getPackage(id);
    if (!pkg) return null;

    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      const blob = new Blob([pkg.zipBytes as unknown as BlobPart], { type: 'application/zip' });
      return URL.createObjectURL(blob);
    }
    return null;
  }

  async deletePackage(id: string): Promise<void> {
    const packages = await this.listPackages();
    const filtered = packages.filter((p) => p.id !== id);
    this.setItem(PACKAGES_KEY, JSON.stringify(filtered));
    this.removeItem(`${PAYLOAD_PREFIX}${id}`);
  }
}

// Helper: Uint8Array <-> Base64 conversion without external libraries
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

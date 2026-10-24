/**
 * StorageAdapter Interface
 * Defines the unified contract for both Local Storage (offline-first)
 * and AWS Cloud Storage (serverless).
 */

import type { ExperimentRun, PackageMetadata } from '../core/experiment/types';

export interface StoragePackageItem {
  metadata: PackageMetadata;
  zipBytes: Uint8Array;
}

export interface StorageAdapter {
  readonly mode: 'local' | 'cloud';

  // --- Experiment Management ---
  saveExperiment(experiment: ExperimentRun): Promise<void>;
  listExperiments(): Promise<ExperimentRun[]>;
  getExperiment(id: string): Promise<ExperimentRun | null>;
  deleteExperiment(id: string): Promise<void>;
  clearAllExperiments(): Promise<void>;

  // --- SimXPack Package Management ---
  savePackage(metadata: PackageMetadata, zipBytes: Uint8Array): Promise<void>;
  listPackages(): Promise<PackageMetadata[]>;
  getPackage(id: string): Promise<StoragePackageItem | null>;
  getPackageDownloadUrl(id: string): Promise<string | null>;
  deletePackage(id: string): Promise<void>;
}

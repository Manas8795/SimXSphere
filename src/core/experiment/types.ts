/**
 * SimXSphere Core Types
 * Schema Version 1 Specification
 * STRICT RULE: No React or DOM imports allowed in core.
 */

export const SCHEMA_VERSION = 1;
export const APP_VERSION = '1.0.0';
export const SIMXPACK_FORMAT_VERSION = 1;

export type ExperimentType = 'chemistry' | 'probability' | 'projectile';

export interface BaseExperiment {
  schemaVersion: 1;
  id: string; // UUID v4
  type: ExperimentType;
  title: string; // 1-80 chars
  description: string; // 0-500 chars
  createdAt: string; // ISO-8601 UTC
  appVersion: string; // e.g. "1.0.0"
  metadata?: {
    notes?: string; // <= 500 chars
    importedFromId?: string; // previous id if imported as copy
  };
}

export interface ChemistryReagentInput {
  formula: string;
  name: string;
  volumeMl?: number;
  concentrationM?: number;
  massGrams?: number;
  ratio?: number;
}

export interface ChemistryParameters {
  mode: 'synthesis' | 'aqueous' | 'stoichiometry' | 'workplane';
  reactants: ChemistryReagentInput[];
  reactionId?: string;
  conditions?: {
    temperatureC?: number;
    pressureAtm?: number;
    solvent?: string;
  };
}

export interface ChemistryResults {
  reactionType: string;
  balancedEquation: string;
  products: string[];
  isConserved: boolean;
  finalPh?: number | null;
  temperatureChangeC?: number | null;
  precipitate?: string | null;
  gasEvolved?: string | null;
  enthalpyKj?: number | null;
  isCurated: boolean;
  provenance: string;
  notes?: string;
}

export interface ChemistryExperiment extends BaseExperiment {
  type: 'chemistry';
  parameters: ChemistryParameters;
  results: ChemistryResults;
}

export interface ProbabilityParameters {
  kind: 'coin' | 'die';
  sides: number; // coin: 2, die: 4-20 (default 6)
  trials: number; // 1 - 1,000,000
  seed: number; // 0 - 4,294,967,295 (uint32)
}

export interface ProbabilityResults {
  counts: number[];
  total: number;
}

export interface ProbabilityExperiment extends BaseExperiment {
  type: 'probability';
  parameters: ProbabilityParameters;
  results: ProbabilityResults;
}

export interface ProjectileParameters {
  initialSpeed: number; // 0 < v0 <= 500 (m/s)
  angleDeg: number; // 0 <= angle <= 90
  gravity: number; // 0.1 <= g <= 30 (m/s^2)
}

export interface ProjectileResults {
  range: number;
  flightTime: number;
  maxHeight: number;
  trajectory: [number, number][]; // 101 points: [x, y]
}

export interface ProjectileExperiment extends BaseExperiment {
  type: 'projectile';
  parameters: ProjectileParameters;
  results: ProjectileResults;
}

export type ExperimentRun = ChemistryExperiment | ProbabilityExperiment | ProjectileExperiment;

/**
 * SimXPack Manifest Types (SIMXPACK_SPEC formatVersion 1)
 */
export interface ManifestExperimentEntry {
  id: string;
  type: ExperimentType;
  path: string; // e.g. "experiments/exp-1-fair-die.json"
}

export interface ManifestFileEntry {
  path: string;
  sizeBytes: number;
  sha256: string; // lowercase hex
}

export interface SimXPackManifest {
  format: 'simxpack';
  formatVersion: 1;
  createdAt: string; // ISO-8601 UTC
  appVersion: string;
  collection: {
    id: string;
    name: string; // 1-80 chars
    description: string; // 0-500 chars
  };
  experiments: ManifestExperimentEntry[];
  files: ManifestFileEntry[];
  totals: {
    fileCount: number;
    uncompressedBytes: number;
  };
}

export interface PackageMetadata {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  experimentCount: number;
  experimentIds: string[];
  uncompressedBytes: number;
  compressedBytes: number;
  sha256: string;
  storageLocation: 'local' | 'cloud';
  s3Key?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

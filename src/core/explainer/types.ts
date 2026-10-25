/**
 * Simulation Explainer Core Contract Types
 * Schema Version 1.0 Specification
 * STRICT RULE: Pure computation & serialization. No React or DOM imports in core.
 */

export const EXPLAINER_SCHEMA_VERSION = '1.0';

export type ExplainerDomain = 'chemistry' | 'probability' | 'projectile' | string;

export type ExplainerIntent =
  | 'explain_current_state'
  | 'why_did_this_happen'
  | 'explain_equations'
  | 'explain_changes'
  | 'what_if'
  | 'ask_question';

export interface SimulationExplainerContext {
  schemaVersion: string;
  simulationId: string;
  simulationTitle: string;
  domain: ExplainerDomain;
  stateRevision: number;
  timestamp: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  assumptions: string[];
  units?: Record<string, string>;
  knownFacts?: string[];
  unavailableFacts?: string[];
  supportedIntents: ExplainerIntent[];
}

export interface ExplainerContextDiff {
  hasPriorState: boolean;
  priorRevision?: number;
  domainMatch: boolean;
  changedInputs: Record<string, { from: unknown; to: unknown }>;
  changedOutputs: Record<string, { from: unknown; to: unknown }>;
  summary: string;
}

export interface ExplainerConfig {
  endpoint: string; // e.g. "http://localhost:11434"
  model: string; // e.g. "llama3.2", "phi3", "mistral"
  timeoutMs: number; // default 30000 (30s)
  maxTokens?: number;
  temperature?: number;
}

export const DEFAULT_EXPLAINER_CONFIG: ExplainerConfig = {
  endpoint: 'http://localhost:11434',
  model: 'llama3.2',
  timeoutMs: 30000,
  maxTokens: 500,
  temperature: 0.3, // Low temperature for factual, grounded scientific explanations
};

export type RuntimeConnectionStatus =
  | 'idle'
  | 'checking'
  | 'connected'
  | 'offline'
  | 'model_missing'
  | 'error';

export interface ExplainerResponse {
  id: string;
  text: string;
  intent: ExplainerIntent;
  stateRevision: number;
  timestamp: string;
  model: string;
  durationMs: number;
  isStale?: boolean;
}

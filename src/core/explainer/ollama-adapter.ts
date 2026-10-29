import {
  type SimulationExplainerContext,
  type ExplainerIntent,
  type ExplainerConfig,
  type ExplainerResponse,
  type ExplainerContextDiff,
  DEFAULT_EXPLAINER_CONFIG,
} from './types';
import { SYSTEM_GROUNDING_PROMPT, buildPromptForIntent } from './prompts';
import { safeRandomUUID } from '../crypto/uuid';

export interface OllamaHealthResult {
  isOnline: boolean;
  models: string[];
  error?: string;
}

/**
 * Check if the local Ollama runtime is running and list downloaded models.
 */
export async function checkOllamaHealth(
  endpoint: string = DEFAULT_EXPLAINER_CONFIG.endpoint
): Promise<OllamaHealthResult> {
  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`${cleanEndpoint}/api/tags`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        isOnline: false,
        models: [],
        error: `Ollama returned HTTP status ${res.status}: ${res.statusText}`,
      };
    }

    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const modelNames = (data.models || []).map((m) => m.name);
    return {
      isOnline: true,
      models: modelNames,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMsg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Connection check timed out.'
          : err.message
        : 'Failed to connect to local Ollama server.';

    return {
      isOnline: false,
      models: [],
      error: errorMsg,
    };
  }
}

export interface GenerateExplanationOptions {
  context: SimulationExplainerContext;
  intent: ExplainerIntent;
  userQuestion?: string;
  diff?: ExplainerContextDiff;
  config?: Partial<ExplainerConfig>;
  abortSignal?: AbortSignal;
}

/**
 * Generate a grounded explanation from the local Ollama instance.
 */
export async function generateExplanation({
  context,
  intent,
  userQuestion,
  diff,
  config = {},
  abortSignal,
}: GenerateExplanationOptions): Promise<ExplainerResponse> {
  const fullConfig: ExplainerConfig = {
    ...DEFAULT_EXPLAINER_CONFIG,
    ...config,
  };

  const startTime = Date.now();
  const prompt = buildPromptForIntent(context, intent, userQuestion, diff);
  const cleanEndpoint = fullConfig.endpoint.replace(/\/+$/, '');

  // Setup timeout and merge abort signals
  const internalController = new AbortController();
  const timeoutTimer = setTimeout(() => {
    internalController.abort(new Error('TIMEOUT'));
  }, fullConfig.timeoutMs);

  // If external signal fires, abort internal
  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      internalController.abort(new Error('USER_ABORT'));
    });
  }

  try {
    const response = await fetch(`${cleanEndpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: fullConfig.model,
        prompt,
        system: SYSTEM_GROUNDING_PROMPT,
        stream: false,
        options: {
          temperature: fullConfig.temperature ?? 0.3,
          num_predict: fullConfig.maxTokens ?? 500,
        },
      }),
      signal: internalController.signal,
    });

    clearTimeout(timeoutTimer);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `Model "${fullConfig.model}" was not found in your local Ollama library. Run "ollama pull ${fullConfig.model}" in your terminal to download it.`
        );
      }
      const errorText = await response.text().catch(() => '');
      throw new Error(`Ollama generation failed (HTTP ${response.status}): ${errorText || response.statusText}`);
    }

    const data = (await response.json()) as { response?: string };
    const text = (data.response || '').trim();

    if (!text) {
      throw new Error('Local Ollama returned an empty explanation. Please check your model resources and try again.');
    }

    return {
      id: safeRandomUUID(),
      text,
      intent,
      stateRevision: context.stateRevision,
      timestamp: new Date().toISOString(),
      model: fullConfig.model,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutTimer);

    if (err instanceof Error) {
      if (err.name === 'AbortError' || err.message === 'USER_ABORT') {
        throw new Error('Generation cancelled by user or simulation update.');
      }
      if (err.message === 'TIMEOUT') {
        throw new Error(`Explanation request timed out after ${fullConfig.timeoutMs / 1000}s. Your local hardware may need a lighter model (e.g. llama3.2:1b).`);
      }
      // Network fetch failure (e.g., connection refused when Ollama is not launched)
      if (err.message.includes('Failed to fetch') || err.message.includes('ECONNREFUSED')) {
        throw new Error(
          `Local Ollama is offline or unreachable at ${cleanEndpoint}. Please ensure Ollama is installed and running.`
        );
      }
      throw err;
    }

    throw new Error('An unexpected error occurred while communicating with the local LLM.');
  }
}

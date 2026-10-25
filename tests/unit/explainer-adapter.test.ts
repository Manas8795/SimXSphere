import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkOllamaHealth, generateExplanation } from '../../src/core/explainer/ollama-adapter';
import { buildProjectileExplainerContext } from '../../src/core/explainer/context-builders/projectileContext';

describe('Ollama Local LLM Adapter Tests (Mocked Runtime)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockContext = buildProjectileExplainerContext(
    { initialSpeed: 20, angleDeg: 45, gravity: 9.81 },
    { range: 40.77, flightTime: 2.88, maxHeight: 10.19, trajectory: [] },
    1
  );

  it('checks health successfully and lists downloaded models', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: 'llama3.2:latest' }, { name: 'phi3:latest' }],
      }),
    } as unknown as Response);

    const health = await checkOllamaHealth('http://localhost:11434');

    expect(health.isOnline).toBe(true);
    expect(health.models).toContain('llama3.2:latest');
    expect(health.models).toContain('phi3:latest');
  });

  it('reports offline when connection is refused or fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const health = await checkOllamaHealth('http://localhost:11434');

    expect(health.isOnline).toBe(false);
    expect(health.models.length).toBe(0);
    expect(health.error).toBeDefined();
  });

  it('generates grounded explanation successfully from local runtime', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response:
          'At 45 degrees, the projectile achieves its maximum possible horizontal range of 40.77 meters.\n\n- Horizontal velocity vx = 14.14 m/s remains constant.\n- Initial vertical velocity vy = 14.14 m/s is decelerated by gravity.\n\nAssumptions: Air resistance is completely neglected.',
      }),
    } as unknown as Response);

    const res = await generateExplanation({
      context: mockContext,
      intent: 'explain_current_state',
    });

    expect(res.text).toContain('40.77 meters');
    expect(res.intent).toBe('explain_current_state');
    expect(res.model).toBe('llama3.2');
    expect(res.stateRevision).toBe(1);
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('handles model missing 404 with helpful download message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'model not found',
    } as unknown as Response);

    await expect(
      generateExplanation({
        context: mockContext,
        intent: 'explain_current_state',
        config: { model: 'nonexistent-model' },
      })
    ).rejects.toThrow(/was not found in your local Ollama library/);
  });

  it('handles user cancellation via AbortSignal', async () => {
    const abortController = new AbortController();

    globalThis.fetch = vi.fn().mockImplementation((_url, opts) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const err = new Error('USER_ABORT');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const promise = generateExplanation({
      context: mockContext,
      intent: 'explain_current_state',
      abortSignal: abortController.signal,
    });

    abortController.abort();

    await expect(promise).rejects.toThrow(/cancelled/i);
  });

  it('rejects empty string responses from model', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: '   ',
      }),
    } as unknown as Response);

    await expect(
      generateExplanation({
        context: mockContext,
        intent: 'explain_current_state',
      })
    ).rejects.toThrow(/empty explanation/i);
  });
});

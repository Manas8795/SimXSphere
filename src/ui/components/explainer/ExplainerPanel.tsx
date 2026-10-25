import React, { useState, useEffect, useRef } from 'react';
import type {
  SimulationExplainerContext,
  ExplainerIntent,
  ExplainerConfig,
  ExplainerResponse,
  RuntimeConnectionStatus,
  ExplainerContextDiff,
} from '../../../core/explainer/types';
import { DEFAULT_EXPLAINER_CONFIG } from '../../../core/explainer/types';
import { generateExplanation, checkOllamaHealth } from '../../../core/explainer/ollama-adapter';
import { diffExplainerContext } from '../../../core/explainer/diff';

interface ExplainerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeContext: SimulationExplainerContext;
  priorContext?: SimulationExplainerContext | null;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onStatusChange?: (status: RuntimeConnectionStatus) => void;
}

export const ExplainerPanel: React.FC<ExplainerPanelProps> = ({
  isOpen,
  onClose,
  activeContext,
  priorContext,
  onSpeakingChange,
  onStatusChange,
}) => {
  // Runtime configuration state
  const [config, setConfig] = useState<ExplainerConfig>(() => {
    try {
      const saved = localStorage.getItem('simxsphere_ollama_config');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_EXPLAINER_CONFIG;
  });

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [status, setStatus] = useState<RuntimeConnectionStatus>('idle');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Active generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [response, setResponse] = useState<ExplainerResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState<string>('');

  // Audio voice narration state
  const [isSpeakingAudio, setIsSpeakingAudio] = useState<boolean>(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Abort controller ref for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync speaking status to parent (so the top-right bubble moves!)
  useEffect(() => {
    const isSpeaking = isGenerating || isSpeakingAudio;
    onSpeakingChange?.(isSpeaking);
  }, [isGenerating, isSpeakingAudio, onSpeakingChange]);

  // Sync connection status to parent
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Check Ollama connectivity on mount or when endpoint changes
  const checkHealth = async () => {
    setStatus('checking');
    setStatusError(null);
    const health = await checkOllamaHealth(config.endpoint);
    if (health.isOnline) {
      setStatus('connected');
      setAvailableModels(health.models);
      if (health.models.length > 0 && !health.models.some((m) => m.startsWith(config.model))) {
        // Model not yet in list, but ollama is running
      }
    } else {
      setStatus('offline');
      setStatusError(health.error || 'Could not connect to Ollama');
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkHealth();
    }
  }, [isOpen, config.endpoint]);

  // Stop speech synthesis if panel closes or unmounts
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Save config to localStorage
  const handleSaveConfig = (newCfg: ExplainerConfig) => {
    setConfig(newCfg);
    try {
      localStorage.setItem('simxsphere_ollama_config', JSON.stringify(newCfg));
    } catch {
      // ignore
    }
    setShowSettings(false);
  };

  // Trigger explanation for an intent
  const handleTriggerExplanation = async (intent: ExplainerIntent, customQuestion?: string) => {
    // Cancel any ongoing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Stop audio narration
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingAudio(false);
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsGenerating(true);
    setErrorMessage(null);

    // Compute diff if intent is explain_changes
    const diff: ExplainerContextDiff | undefined =
      intent === 'explain_changes' ? diffExplainerContext(activeContext, priorContext) : undefined;

    try {
      const res = await generateExplanation({
        context: activeContext,
        intent,
        userQuestion: customQuestion,
        diff,
        config,
        abortSignal: abortController.signal,
      });

      setResponse(res);
      setIsGenerating(false);

      // Auto-narrate if user has voice narration active or clicks speak
    } catch (err: unknown) {
      if (err instanceof Error) {
        // If aborted by user, don't show an error card
        if (err.message.includes('cancelled')) {
          setIsGenerating(false);
          return;
        }
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to generate explanation.');
      }
      setIsGenerating(false);
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  // Text-To-Speech audio player
  const handleToggleAudioNarration = () => {
    if (!('speechSynthesis' in window) || !response) return;

    if (isSpeakingAudio) {
      window.speechSynthesis.cancel();
      setIsSpeakingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown symbols for cleaner voice reading
    const cleanSpeechText = response.text
      .replace(/[#*_`]/g, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    utterance.onstart = () => setIsSpeakingAudio(true);
    utterance.onend = () => setIsSpeakingAudio(false);
    utterance.onerror = () => setIsSpeakingAudio(false);

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  // Stale state detection: did the simulation update after this explanation was generated?
  const isStale = response && response.stateRevision !== activeContext.stateRevision;

  return (
    <>
      {/* Background backdrop click to close */}
      <div className="explainer-panel-backdrop" onClick={onClose} />

      {/* Popover panel attached to top-right */}
      <div className="explainer-popover-panel" id="explainer-popover-panel" role="dialog" aria-modal="true">
        {/* Header with Title, Status Pill, Settings & Close */}
        <div className="explainer-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 24 }}>🧠</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                Science Companion
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{activeContext.simulationTitle}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Status Pill */}
            <span
              className="lab-badge"
              style={{
                fontSize: 10,
                padding: '2px 8px',
                background: status === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: status === 'connected' ? '#10b981' : '#f59e0b',
                border: `1px solid ${status === 'connected' ? '#10b981' : '#f59e0b'}`,
              }}
              title={status === 'connected' ? `Model: ${config.model}` : statusError || 'Ollama offline'}
            >
              {status === 'checking'
                ? '⏳ Checking...'
                : status === 'connected'
                ? `● ${config.model}`
                : '⚠️ Ollama Offline'}
            </span>

            {/* Settings button */}
            <button
              type="button"
              className="lab-btn lab-btn-secondary"
              style={{ padding: '3px 8px', fontSize: 12 }}
              onClick={() => setShowSettings(!showSettings)}
              title="Configure local Ollama endpoint or model"
            >
              ⚙️
            </button>

            {/* Close button */}
            <button
              type="button"
              className="lab-btn lab-btn-secondary"
              style={{ padding: '3px 8px', fontSize: 13 }}
              onClick={onClose}
              title="Close companion"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Optional Settings Drawer */}
        {showSettings && (
          <div style={{ padding: '12px 18px', background: 'var(--lab-surface-subtle)', borderBottom: '1.5px solid var(--wood-frame)', fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Local LLM Configuration</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                  Ollama Base URL:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={config.endpoint}
                  onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                  style={{ width: '100%', fontSize: 12, padding: '4px 8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                  Model Name:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="e.g. llama3.2, phi3, mistral"
                  style={{ width: '100%', fontSize: 12, padding: '4px 8px' }}
                />
              </div>

              {availableModels.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Detected local models:{' '}
                  {availableModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: '0 4px',
                      }}
                      onClick={() => setConfig({ ...config, model: m.replace(':latest', '') })}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={() => handleSaveConfig(config)}
                >
                  Save & Recheck
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={checkHealth}
                >
                  Ping Ollama
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel Main Body */}
        <div className="explainer-panel-body">
          {/* Stale State Banner if simulation parameters changed after generation */}
          {isStale && (
            <div className="explainer-stale-alert">
              <span>⚡ Simulation inputs changed since this explanation.</span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={() => response && handleTriggerExplanation(response.intent)}
              >
                Refresh
              </button>
            </div>
          )}

          {/* Quick Action Prompt Chips */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Ask Science Companion:
            </div>
            <div className="intent-chips-grid">
              <button
                type="button"
                className="intent-chip-btn"
                disabled={isGenerating}
                onClick={() => handleTriggerExplanation('explain_current_state')}
              >
                📖 Explain State
              </button>
              <button
                type="button"
                className="intent-chip-btn"
                disabled={isGenerating}
                onClick={() => handleTriggerExplanation('why_did_this_happen')}
              >
                🔬 Why did this happen?
              </button>
              <button
                type="button"
                className="intent-chip-btn"
                disabled={isGenerating}
                onClick={() => handleTriggerExplanation('explain_equations')}
              >
                ⚖️ Explain the Math
              </button>
              <button
                type="button"
                className="intent-chip-btn"
                disabled={isGenerating}
                onClick={() => handleTriggerExplanation('explain_changes')}
              >
                🔄 Explain Changes
              </button>
              <button
                type="button"
                className="intent-chip-btn"
                disabled={isGenerating}
                onClick={() => handleTriggerExplanation('what_if', 'What if I increase the inputs?')}
              >
                ❓ What if...?
              </button>
            </div>
          </div>

          {/* Custom Question Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (userQuestion.trim()) {
                handleTriggerExplanation('ask_question', userQuestion.trim());
              }
            }}
            style={{ display: 'flex', gap: 6 }}
          >
            <input
              type="text"
              className="form-input"
              placeholder="Ask anything about this simulation..."
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              disabled={isGenerating}
              style={{ flex: 1, fontSize: 12, padding: '8px 12px' }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isGenerating || !userQuestion.trim()}
              style={{ padding: '8px 14px', fontSize: 12 }}
            >
              Ask
            </button>
          </form>

          {/* Active Generation Indicator & Stop Button */}
          {isGenerating && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1.5px solid #38bdf8',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, animation: 'spin 1s infinite linear' }}>⚙️</span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                  Science companion is reasoning with local LLM...
                </span>
              </div>
              <button
                type="button"
                className="btn btn-danger"
                style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={handleCancelGeneration}
              >
                ⏹ Stop
              </button>
            </div>
          )}

          {/* Error Message Card */}
          {errorMessage && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Unable to Generate Explanation</div>
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Offline Ollama Setup Guidance Card */}
          {status === 'offline' && !response && !isGenerating && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1.5px solid #f59e0b',
                color: 'var(--text-primary)',
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13, color: '#fcd34d', marginBottom: 6 }}>
                💡 Activate Your 100% Private Local Science Companion
              </div>
              <p style={{ margin: '0 0 8px 0' }}>
                SimXSphere uses your machine's private local Ollama runtime—no telemetry, no accounts, and no data leaves your computer.
              </p>
              <ol style={{ margin: '0 0 10px 18px', padding: 0 }}>
                <li>Install Ollama from <strong>ollama.com</strong> (if not installed).</li>
                <li>In your terminal, run: <code style={{ color: '#38bdf8' }}>ollama run {config.model}</code></li>
                <li>Click the button below once Ollama starts.</li>
              </ol>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: 11, padding: '4px 12px' }}
                  onClick={checkHealth}
                >
                  🔄 Retry Connection
                </button>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  (Simulations remain fully usable without AI!)
                </span>
              </div>
            </div>
          )}

          {/* Formatted Explanation Response Card */}
          {response && (
            <div className="explainer-response-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                  }}
                >
                  {response.intent.replace(/_/g, ' ')}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Read Aloud Text-to-Speech Toggle */}
                  {'speechSynthesis' in window && (
                    <button
                      type="button"
                      className="lab-btn lab-btn-secondary"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={handleToggleAudioNarration}
                      title={isSpeakingAudio ? 'Stop speaking' : 'Read explanation aloud with voice'}
                    >
                      {isSpeakingAudio ? '⏹ Stop Voice' : '🔊 Listen'}
                    </button>
                  )}

                  {/* Copy Button */}
                  <button
                    type="button"
                    className="lab-btn lab-btn-secondary"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => navigator.clipboard.writeText(response.text)}
                    title="Copy explanation text"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              {/* Rendered Markdown Paragraphs & Bullets safely */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {response.text.split('\n\n').map((block, i) => {
                  const trimmed = block.trim();
                  if (!trimmed) return null;

                  // Check if this block is a bullet list
                  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    const items = trimmed.split('\n').filter((l) => l.trim().startsWith('- ') || l.trim().startsWith('* '));
                    return (
                      <ul key={i} style={{ margin: '4px 0 6px 18px', padding: 0 }}>
                        {items.map((item, j) => (
                          <li key={j} style={{ marginBottom: 4 }}>
                            {item.replace(/^[-*]\s+/, '')}
                          </li>
                        ))}
                      </ul>
                    );
                  }

                  return <p key={i} style={{ margin: 0 }}>{trimmed}</p>;
                })}
              </div>

              <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>Local Model: {response.model}</span>
                <span>{response.durationMs}ms</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

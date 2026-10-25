import React from 'react';
import type { RuntimeConnectionStatus } from '../../../core/explainer/types';

interface ExplainerBubbleProps {
  isOpen: boolean;
  onToggle: () => void;
  status: RuntimeConnectionStatus;
  isGenerating: boolean;
  isSpeakingAudio: boolean;
  simulationTitle: string;
}

export const ExplainerBubble: React.FC<ExplainerBubbleProps> = ({
  isOpen,
  onToggle,
  status,
  isGenerating,
  isSpeakingAudio,
  simulationTitle,
}) => {
  // It moves when it speaks: either when actively generating an explanation or when reading voice narration!
  const isSpeaking = isGenerating || isSpeakingAudio;

  return (
    <div className="explainer-bubble-anchor" id="explainer-bubble-anchor">
      {/* Soundwaves indicator when speaking */}
      {isSpeaking && (
        <div className="companion-soundwaves" title="Science Companion is speaking">
          <div className="companion-soundwave-bar" />
          <div className="companion-soundwave-bar" />
          <div className="companion-soundwave-bar" />
          <div className="companion-soundwave-bar" />
        </div>
      )}

      {/* Circular floating companion bubble button */}
      <button
        type="button"
        id="explainer-bubble-btn"
        className={`explainer-bubble-btn ${isSpeaking ? 'is-speaking' : ''}`}
        onClick={onToggle}
        title={
          isSpeaking
            ? 'Science Companion is explaining...'
            : `Science Companion (Local AI Explainer) — Active: ${simulationTitle}`
        }
        aria-label="Toggle Science Companion Explainer"
        aria-expanded={isOpen}
      >
        <div className="explainer-bubble-avatar">
          {isSpeakingAudio ? '🗣️' : isGenerating ? '🧠' : '🤖'}
        </div>

        {/* Runtime Connection Status Dot */}
        <span
          className={`bubble-status-dot ${
            isGenerating ? 'generating' : status === 'connected' ? 'online' : 'offline'
          }`}
          title={
            status === 'connected'
              ? 'Local Ollama is Connected & Ready'
              : 'Ollama is Offline (Click for setup instructions)'
          }
        />
      </button>
    </div>
  );
};

import React from 'react';
import type { RuntimeConnectionStatus } from '../../../core/explainer/types';

interface ExplainerBubbleProps {
  isOpen: boolean;
  onToggle: () => void;
  status: RuntimeConnectionStatus;
  isSpeaking: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  simulationTitle: string;
}

export const ExplainerBubble: React.FC<ExplainerBubbleProps> = ({
  isOpen,
  onToggle,
  status,
  isSpeaking,
  isMuted,
  onToggleMute,
  simulationTitle,
}) => {
  return (
    <div className="explainer-bubble-anchor" id="explainer-bubble-anchor">
      {/* Soundwaves indicator when speaking */}
      {isSpeaking && (
        <div className="companion-soundwaves" title="Science Bubble is speaking live audio">
          <div className="companion-soundwave-bar" />
          <div className="companion-soundwave-bar" />
          <div className="companion-soundwave-bar" />
          <div className="companion-soundwave-bar" />
        </div>
      )}

      {/* Iridescent Glass Science Bubble Sphere */}
      <button
        type="button"
        id="science-bubble-btn"
        className={`science-bubble-sphere ${isSpeaking ? 'is-speaking' : ''}`}
        onClick={onToggle}
        title={`Science Bubble (Active Voice Narrator) — ${isMuted ? 'Muted' : 'Voice ON'} • ${simulationTitle}`}
        aria-label="Science Bubble Simulation Narrator"
        aria-expanded={isOpen}
      >
        {/* Inner floating shimmer */}
        <div className="bubble-inner-shimmer" />

        {/* Center icon: small sound speaker or wave indicator */}
        <span style={{ fontSize: 18, zIndex: 1 }}>
          {isMuted ? '🔇' : isSpeaking ? '🫧' : '🫧'}
        </span>

        {/* Runtime / Voice Status Indicator Dot */}
        <span
          className={`bubble-status-dot ${
            isSpeaking ? 'speaking' : status === 'connected' ? 'online' : 'offline'
          }`}
          title={
            isSpeaking
              ? 'Speaking 2-line simulation info...'
              : status === 'connected'
              ? 'Local AI Voice Narrator Active'
              : 'Voice Mode Active (Offline deterministic)'
          }
        />
      </button>

      {/* Quick Mute Toggle Pill right next to bubble */}
      <button
        type="button"
        className="lab-btn lab-btn-secondary"
        style={{
          padding: '4px 8px',
          fontSize: 11,
          borderRadius: 14,
          background: 'var(--lab-surface)',
          border: '1.5px solid var(--wood-frame)',
        }}
        onClick={onToggleMute}
        title={isMuted ? 'Unmute voice narrator' : 'Mute voice narrator'}
      >
        {isMuted ? '🔇 Muted' : '🔊 Voice'}
      </button>
    </div>
  );
};

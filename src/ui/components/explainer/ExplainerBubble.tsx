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
  isDragging?: boolean;
  positionStyle?: React.CSSProperties;
  onBubblePointerDown?: (e: React.PointerEvent) => void;
}

export const ExplainerBubble: React.FC<ExplainerBubbleProps> = ({
  isOpen,
  onToggle,
  status,
  isSpeaking,
  isMuted,
  onToggleMute,
  simulationTitle,
  isDragging = false,
  positionStyle,
  onBubblePointerDown,
}) => {
  return (
    <div
      className={`explainer-bubble-anchor ${isDragging ? 'is-dragging' : ''}`}
      id="explainer-bubble-anchor"
      style={positionStyle}
    >
      {/* Soundwaves indicator when speaking */}
      {isSpeaking && (
        <div className="companion-soundwaves" title="Science Bubble is speaking live audio">
          <div className="companion-soundwave-bar" />
          <div className="companion-soundwave-bar" />
          <div className="companion-soundwave-bar" />
          <div className="companion-soundwave-bar" />
        </div>
      )}

      {/* Iridescent Glass Science Bubble Sphere (Draggable anywhere on screen!) */}
      <button
        type="button"
        id="science-bubble-btn"
        className={`science-bubble-sphere ${isSpeaking ? 'is-speaking' : ''} ${isDragging ? 'is-dragging' : ''}`}
        onClick={onToggle}
        onPointerDown={onBubblePointerDown}
        title={`🫧 Science Bubble (Drag anywhere • Click to view notes) — ${isMuted ? 'Muted' : 'Voice ON'} • ${simulationTitle}`}
        aria-label="Science Bubble Simulation Narrator — Drag anywhere on screen"
        aria-expanded={isOpen}
      >
        {/* Inner floating shimmer */}
        <div className="bubble-inner-shimmer" />

        {/* Center icon: small sound speaker or wave indicator */}
        <span style={{ fontSize: 18, zIndex: 1, pointerEvents: 'none' }}>
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
          cursor: 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        title={isMuted ? 'Unmute voice narrator' : 'Mute voice narrator'}
      >
        {isMuted ? '🔇 Muted' : '🔊 Voice'}
      </button>
    </div>
  );
};

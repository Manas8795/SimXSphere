import React, { useState, useEffect, useRef } from 'react';
import type { SimulationExplainerContext, RuntimeConnectionStatus } from '../../../core/explainer/types';
import { ExplainerBubble } from './ExplainerBubble';
import { generateAutoNarration } from '../../../core/explainer/autoNarrator';
import { checkOllamaHealth } from '../../../core/explainer/ollama-adapter';

interface ExplainerManagerProps {
  activeContext: SimulationExplainerContext;
  priorContext?: SimulationExplainerContext | null;
}

interface Position {
  x: number;
  y: number;
}

export const ExplainerManager: React.FC<ExplainerManagerProps> = ({ activeContext }) => {
  // Voice Mute Preference saved in localStorage
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('simxsphere_bubble_muted') === 'true';
    } catch {
      return false;
    }
  });

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showCallout, setShowCallout] = useState<boolean>(true);
  const [status, setStatus] = useState<RuntimeConnectionStatus>('idle');

  // Draggable Bubble Position (persisted to localStorage)
  const [position, setPosition] = useState<Position>(() => {
    try {
      const saved = localStorage.getItem('simxsphere_bubble_position');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          const maxX = typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 70) : 1200;
          const maxY = typeof window !== 'undefined' ? Math.max(10, window.innerHeight - 70) : 800;
          return {
            x: Math.min(Math.max(10, parsed.x), maxX),
            y: Math.min(Math.max(10, parsed.y), maxY),
          };
        }
      }
    } catch {
      // ignore
    }
    const defaultX = typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 180) : 1000;
    return { x: defaultX, y: 14 };
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    hasMoved: boolean;
  } | null>(null);

  // Keep bubble within viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, Math.max(10, window.innerWidth - 70)),
        y: Math.min(prev.y, Math.max(10, window.innerHeight - 70)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pointer drag handlers: enables dragging the science bubble anywhere on screen
  const handleBubblePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only primary mouse button or touch

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y,
      hasMoved: false,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.startX;
      const dy = moveEvent.clientY - dragStartRef.current.startY;

      if (!dragStartRef.current.hasMoved && Math.hypot(dx, dy) > 4) {
        dragStartRef.current.hasMoved = true;
        setIsDragging(true);
      }

      if (dragStartRef.current.hasMoved) {
        const maxX = Math.max(10, window.innerWidth - 70);
        const maxY = Math.max(10, window.innerHeight - 70);
        const newX = Math.min(Math.max(10, dragStartRef.current.initialPosX + dx), maxX);
        const newY = Math.min(Math.max(10, dragStartRef.current.initialPosY + dy), maxY);
        setPosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      if (dragStartRef.current?.hasMoved) {
        setIsDragging(false);
        try {
          setPosition((latest) => {
            localStorage.setItem('simxsphere_bubble_position', JSON.stringify(latest));
            return latest;
          });
        } catch {
          // ignore
        }
      }
      dragStartRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleToggleCallout = () => {
    if (dragStartRef.current?.hasMoved) return;
    setShowCallout((prev) => !prev);
  };

  // Active 2-line brief explanation state
  const [narration, setNarration] = useState(() => generateAutoNarration(activeContext));

  const debounceTimerRef = useRef<number | null>(null);
  const lastSpokenTextRef = useRef<string>('');
  const safetyTimeoutRef = useRef<number | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check Ollama health periodically in background
  useEffect(() => {
    checkOllamaHealth().then((h) => {
      setStatus(h.isOnline ? 'connected' : 'offline');
    });
  }, []);

  // Autonomous Speech Narrator:
  // When ANY simulation changes on the platform, automatically produce the 2-line brief info
  // and speak it aloud via voice synthesis EXACTLY ONCE!
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce by 450ms so rapid slider adjustments settle before speaking
    debounceTimerRef.current = window.setTimeout(() => {
      const newNarration = generateAutoNarration(activeContext);
      setNarration(newNarration);
      setShowCallout(true);

      // CRITICAL: Speak ONLY ONCE per topic / simulation state!
      // If this exact narration text was already spoken, do not repeat!
      if (lastSpokenTextRef.current === newNarration.spokenText) {
        return;
      }

      // Stop previous utterance immediately
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }

      // If voice mode is not muted, speak the 2 lines once!
      if (!isMuted && 'speechSynthesis' in window) {
        lastSpokenTextRef.current = newNarration.spokenText;

        const utterance = new SpeechSynthesisUtterance(newNarration.spokenText);
        utterance.rate = 1.05;
        utterance.pitch = 1.05;

        const handleSpeechDone = () => {
          setIsSpeaking(false);
          if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
          }
        };

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = handleSpeechDone;
        utterance.onerror = handleSpeechDone;

        currentUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);

        // Safety fallback timer:
        // Chromium on Windows has a known issue where `utterance.onend` is occasionally dropped.
        // Guarantee isSpeaking turns off so the bubble stops wobbling after speech finishes!
        const estimatedDurationMs = Math.max(3500, Math.ceil((newNarration.spokenText.length / 10) * 1000) + 2500);
        safetyTimeoutRef.current = window.setTimeout(() => {
          setIsSpeaking(false);
        }, estimatedDurationMs);
      }
    }, 450);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [activeContext, isMuted]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      localStorage.setItem('simxsphere_bubble_muted', String(nextMuted));
    } catch {
      // ignore
    }

    if (nextMuted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    } else if (!nextMuted && narration) {
      // Speak current 2 lines if unmuting explicitly
      handleReplaySpeech();
    }
  };

  const handleReplaySpeech = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

    // Explicit user action: allow speaking on manual replay
    lastSpokenTextRef.current = narration.spokenText;

    const utterance = new SpeechSynthesisUtterance(narration.spokenText);
    utterance.rate = 1.05;
    utterance.pitch = 1.05;

    const handleSpeechDone = () => {
      setIsSpeaking(false);
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = handleSpeechDone;
    utterance.onerror = handleSpeechDone;

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setShowCallout(true);

    const estimatedDurationMs = Math.max(3500, Math.ceil((narration.spokenText.length / 10) * 1000) + 2500);
    safetyTimeoutRef.current = window.setTimeout(() => {
      setIsSpeaking(false);
    }, estimatedDurationMs);
  };

  // Dynamic Callout Positioning (follows the dragged bubble smoothly)
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const calloutWidth = Math.min(360, windowWidth - 24);

  // If bubble is placed in the bottom 250px of the screen, flip callout ABOVE bubble
  const isNearBottom = position.y + 60 + 220 > windowHeight;
  const calloutPlacement: 'top' | 'bottom' = isNearBottom ? 'top' : 'bottom';
  const calloutY = isNearBottom ? Math.max(12, position.y - 195) : position.y + 64;

  // Horizontal alignment: anchor to bubble, clamp inside viewport
  const rawCalloutX =
    position.x + 360 > windowWidth - 12 ? position.x + 52 - calloutWidth : position.x - 10;
  const calloutX = Math.max(12, Math.min(rawCalloutX, windowWidth - calloutWidth - 12));

  // Pointer arrow aligns with bubble center
  const bubbleCenterX = position.x + 26;
  const arrowOffset = Math.max(16, Math.min(calloutWidth - 28, bubbleCenterX - calloutX - 7));

  return (
    <>
      {/* Iridescent Glass Science Bubble (Draggable anywhere on screen!) */}
      <ExplainerBubble
        isOpen={showCallout}
        onToggle={handleToggleCallout}
        status={status}
        isSpeaking={isSpeaking}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        simulationTitle={activeContext.simulationTitle}
        isDragging={isDragging}
        positionStyle={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onBubblePointerDown={handleBubblePointerDown}
      />

      {/* Autonomous 2-Line Voice Callout Speech Bubble (anchored relative to the dragged bubble) */}
      {showCallout && (
        <div
          className={`bubble-speech-callout arrow-${calloutPlacement}`}
          id="bubble-speech-callout"
          role="status"
          aria-live="polite"
          style={{
            left: `${calloutX}px`,
            top: `${calloutY}px`,
            width: `${calloutWidth}px`,
            ['--arrow-left' as any]: `${arrowOffset}px`,
          }}
        >
          {/* Header */}
          <div className="callout-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>🫧</span>
              <strong style={{ fontSize: 12, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                {narration.headline}
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Soundwaves indicator when speaking */}
              {isSpeaking && (
                <div className="companion-soundwaves">
                  <div className="companion-soundwave-bar" />
                  <div className="companion-soundwave-bar" />
                  <div className="companion-soundwave-bar" />
                  <div className="companion-soundwave-bar" />
                </div>
              )}

              {/* Replay Voice button */}
              <button
                type="button"
                className="lab-btn lab-btn-secondary"
                style={{ padding: '2px 6px', fontSize: 11 }}
                onClick={handleReplaySpeech}
                title="Replay 2-line voice explanation"
              >
                🔄 Replay
              </button>

              {/* Close / Dismiss button */}
              <button
                type="button"
                className="lab-btn lab-btn-secondary"
                style={{ padding: '2px 6px', fontSize: 11 }}
                onClick={() => setShowCallout(false)}
                title="Dismiss speech bubble"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 2-Line Educational Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="callout-body-line1">
              {narration.line1}
            </div>
            <div className="callout-body-line2">
              {narration.line2}
            </div>
          </div>

          {/* Footer mode indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: 5 }}>
            <span>
              {isMuted ? '🔇 Voice Muted' : isSpeaking ? '🗣️ Speaking live...' : '🔊 Voice Mode Active'}
            </span>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
              Autonomous Science Narrator
            </span>
          </div>
        </div>
      )}
    </>
  );
};

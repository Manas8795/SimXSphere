import React, { useState, useEffect, useRef } from 'react';
import type { SimulationExplainerContext, RuntimeConnectionStatus } from '../../../core/explainer/types';
import { ExplainerBubble } from './ExplainerBubble';
import { generateAutoNarration } from '../../../core/explainer/autoNarrator';
import { checkOllamaHealth } from '../../../core/explainer/ollama-adapter';

interface ExplainerManagerProps {
  activeContext: SimulationExplainerContext;
  priorContext?: SimulationExplainerContext | null;
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

  return (
    <>
      {/* Iridescent Glass Science Bubble in top right corner (moves when speaking!) */}
      <ExplainerBubble
        isOpen={showCallout}
        onToggle={() => setShowCallout((prev) => !prev)}
        status={status}
        isSpeaking={isSpeaking}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        simulationTitle={activeContext.simulationTitle}
      />

      {/* Autonomous 2-Line Voice Callout Speech Bubble (anchored beneath the bubble) */}
      {showCallout && (
        <div className="bubble-speech-callout" id="bubble-speech-callout" role="status" aria-live="polite">
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

import React, { useState, useEffect, useRef } from 'react';
import type { ProbabilityExperiment, ProbabilityParameters } from '../../core/experiment/types';
import {
  runProbabilitySimulation,
  calculateDerivedProbabilityMetrics,
  validateProbabilityParameters,
} from '../../core/simulations/probability';
import { generateRandomSeed, createMulberry32 } from '../../core/simulations/prng';
import { Histogram } from '../components/Histogram';
import { exportProbabilityCsv } from '../../core/simxpack/csv';
import { serializeCanonicalJson } from '../../core/experiment/serialize';
import { buildProbabilityExplainerContext } from '../../core/explainer/context-builders/probabilityContext';
import type { SimulationExplainerContext } from '../../core/explainer/types';

interface ProbabilityViewProps {
  onSaveExperiment: (experiment: ProbabilityExperiment) => void;
  onContextChange?: (context: SimulationExplainerContext) => void;
}

export const ProbabilityView: React.FC<ProbabilityViewProps> = ({ onSaveExperiment, onContextChange }) => {
  const [kind, setKind] = useState<'coin' | 'die'>('coin');
  const [sides, setSides] = useState<number>(2);
  const [trials, setTrials] = useState<number>(1000);
  const [seed, setSeed] = useState<number>(() => generateRandomSeed());
  const [title, setTitle] = useState<string>('Fair Coin Toss (1,000 flips)');
  const [description, setDescription] = useState<string>('Standard 50/50 probability test');

  // Animation states
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [lastOutcome, setLastOutcome] = useState<number>(0);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);
  const streamIntervalRef = useRef<number | null>(null);

  // Active experiment state
  const [experiment, setExperiment] = useState<ProbabilityExperiment>(() => {
    const initialParams: ProbabilityParameters = {
      kind: 'coin',
      sides: 2,
      trials: 1000,
      seed: 42,
    };
    const results = runProbabilitySimulation(initialParams);
    return {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      type: 'probability',
      title: 'Fair Coin Toss (1,000 flips)',
      description: 'Standard 50/50 probability test',
      createdAt: new Date().toISOString(),
      appVersion: '1.0.0',
      parameters: initialParams,
      results,
    };
  });

  const [execTimeMs, setExecTimeMs] = useState<number>(0);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Notify companion of active context
  useEffect(() => {
    const ctx = buildProbabilityExplainerContext(experiment.parameters, experiment.results, Date.now());
    onContextChange?.(ctx);
  }, [experiment, onContextChange]);

  // Stop live streaming on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, []);

  const handleKindChange = (newKind: 'coin' | 'die') => {
    setKind(newKind);
    if (newKind === 'coin') {
      setSides(2);
      setTitle(`Fair Coin Toss (${trials.toLocaleString()} flips)`);
    } else {
      setSides(6);
      setTitle(`6-Sided Die Roll (${trials.toLocaleString()} rolls)`);
    }
  };

  const handleTrialsChange = (val: number) => {
    setTrials(val);
    setTitle(`${kind === 'coin' ? 'Coin Toss' : `${sides}-Sided Die`} (${val.toLocaleString()} trials)`);
  };

  const handleNewSeed = () => {
    setSeed(generateRandomSeed());
  };

  // Perform a single visual flip or roll
  const handleSingleTrial = () => {
    setIsFlipping(true);
    const rand = createMulberry32(Math.floor(Math.random() * 4294967296));
    const outcome = Math.floor(rand() * sides);

    setTimeout(() => {
      setLastOutcome(outcome);
      setIsFlipping(false);

      // Add 1 to counts
      setExperiment((prev) => {
        const newCounts = [...prev.results.counts];
        newCounts[outcome] = (newCounts[outcome] || 0) + 1;
        return {
          ...prev,
          results: {
            counts: newCounts,
            total: prev.results.total + 1,
          },
        };
      });
    }, 400);
  };

  // Live streaming accumulator
  const handleToggleStream = () => {
    if (isLiveStreaming) {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      setIsLiveStreaming(false);
      return;
    }

    setIsLiveStreaming(true);
    const rand = createMulberry32(seed);

    streamIntervalRef.current = window.setInterval(() => {
      setExperiment((prev) => {
        const batchSize = 10;
        const newCounts = [...prev.results.counts];
        let lastOne = 0;
        for (let b = 0; b < batchSize; b++) {
          lastOne = Math.floor(rand() * sides);
          newCounts[lastOne] = (newCounts[lastOne] || 0) + 1;
        }
        setLastOutcome(lastOne);
        return {
          ...prev,
          results: {
            counts: newCounts,
            total: prev.results.total + batchSize,
          },
        };
      });
    }, 50);
  };

  // Run full batch simulation
  const handleRun = () => {
    if (isLiveStreaming) {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      setIsLiveStreaming(false);
    }

    const params: ProbabilityParameters = {
      kind,
      sides,
      trials,
      seed,
    };

    const validation = validateProbabilityParameters(params);
    if (!validation.valid) {
      setValidationError(validation.errors.join(', '));
      return;
    }
    setValidationError(null);

    // Trigger visual flip animation
    setIsFlipping(true);

    setTimeout(() => {
      const t0 = performance.now();
      const results = runProbabilitySimulation(params);
      const t1 = performance.now();
      setExecTimeMs(t1 - t0);
      setIsFlipping(false);

      // Pick a representative outcome to show on coin/die
      setLastOutcome(Math.floor(Math.random() * sides));

      const newExp: ProbabilityExperiment = {
        schemaVersion: 1,
        id: crypto.randomUUID(),
        type: 'probability',
        title: title.trim() || `${kind === 'coin' ? 'Coin' : 'Die'} Simulation`,
        description: description.trim(),
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        parameters: params,
        results,
      };

      setExperiment(newExp);
      setSaveSuccess(false);
    }, 300);
  };

  const handleSave = () => {
    onSaveExperiment(experiment);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDownloadCsv = () => {
    const csvContent = exportProbabilityCsv(experiment);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `probability-${experiment.parameters.kind}-${experiment.parameters.trials}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonContent = serializeCanonicalJson(experiment);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiment-${experiment.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const metrics = calculateDerivedProbabilityMetrics(experiment.results, experiment.parameters.sides);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Visual Animated Stage */}
      <div className="glass-panel" style={{ padding: 24, textAlign: 'center', background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
          {/* Animated Coin / Die Object */}
          <div style={{ perspective: 800 }}>
            {kind === 'coin' ? (
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #fde047 30%, #ca8a04 100%)',
                  boxShadow: '0 0 25px rgba(250, 204, 21, 0.5), inset 0 0 10px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  fontWeight: 900,
                  color: '#713f12',
                  cursor: 'pointer',
                  transform: isFlipping ? 'rotateY(720deg) scale(1.15)' : 'rotateY(0deg)',
                  transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  userSelect: 'none',
                  border: '3px solid #fef08a',
                }}
                onClick={handleSingleTrial}
                title="Click to Flip Coin!"
              >
                {lastOutcome === 0 ? 'H' : 'T'}
              </div>
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                  boxShadow: '0 0 25px rgba(99, 102, 241, 0.5), inset 0 0 10px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 34,
                  fontWeight: 900,
                  color: '#ffffff',
                  cursor: 'pointer',
                  transform: isFlipping ? 'rotate(360deg) scale(1.15)' : 'rotate(0deg)',
                  transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  userSelect: 'none',
                  border: '2px solid rgba(255, 255, 255, 0.25)',
                }}
                onClick={handleSingleTrial}
                title="Click to Roll Die!"
              >
                {lastOutcome + 1}
              </div>
            )}
          </div>

          {/* Quick Outcome Text & Action Buttons */}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>LAST RESULT:</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', marginBottom: 8 }}>
              {kind === 'coin'
                ? lastOutcome === 0
                  ? '🪙 Heads (Outcome 0)'
                  : '🪙 Tails (Outcome 1)'
                : `🎲 Face ${lastOutcome + 1}`}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                id="single-trial-btn"
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '13px' }}
                onClick={handleSingleTrial}
              >
                {kind === 'coin' ? '🪙 Flip Once' : '🎲 Roll Once'}
              </button>

              <button
                type="button"
                id="toggle-stream-btn"
                className={`btn ${isLiveStreaming ? 'btn-danger' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '13px' }}
                onClick={handleToggleStream}
              >
                {isLiveStreaming ? '⏹ Stop Live Ticker' : '🔴 Stream Live (100/s)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Parameters Form Panel */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>Simulation Parameters</h2>
            <span className="badge badge-indigo">mulberry32 PRNG</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Kind Selector */}
            <div className="form-group">
              <label className="form-label">Simulation Kind</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  id="kind-coin-btn"
                  className={`btn ${kind === 'coin' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleKindChange('coin')}
                >
                  🪙 Coin Toss (2 sides)
                </button>
                <button
                  type="button"
                  id="kind-die-btn"
                  className={`btn ${kind === 'die' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleKindChange('die')}
                >
                  🎲 Dice Roll (4–20 sides)
                </button>
              </div>
            </div>

            {/* Sides Slider (for die) */}
            {kind === 'die' && (
              <div className="form-group">
                <div className="form-label">
                  <span>Number of Faces</span>
                  <strong style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{sides} sides</strong>
                </div>
                <input
                  type="range"
                  id="die-sides-slider"
                  min="4"
                  max="20"
                  step="1"
                  value={sides}
                  onChange={(e) => setSides(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: '#6366f1' }}
                />
              </div>
            )}

            {/* Trials Chips & Input */}
            <div className="form-group">
              <div className="form-label">
                <span>Number of Trials (N)</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Max: 1,000,000</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {[100, 1000, 10000, 100000, 1000000].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`btn ${trials === num ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', fontSize: '11px', borderRadius: 4 }}
                    onClick={() => handleTrialsChange(num)}
                  >
                    {num.toLocaleString()}
                  </button>
                ))}
              </div>
              <input
                type="number"
                id="trials-input"
                className="form-input"
                min="1"
                max="1000000"
                value={trials}
                onChange={(e) => handleTrialsChange(Math.max(1, Math.min(1000000, parseInt(e.target.value || '1', 10))))}
              />
            </div>

            {/* Seed Control */}
            <div className="form-group">
              <div className="form-label">
                <span>Deterministic PRNG Seed</span>
                <button
                  type="button"
                  id="random-seed-btn"
                  onClick={handleNewSeed}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 12, cursor: 'pointer' }}
                >
                  ⚡ Generate New Seed
                </button>
              </div>
              <input
                type="number"
                id="seed-input"
                className="form-input"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value || '0', 10) >>> 0)}
              />
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">Experiment Title</label>
              <input
                type="text"
                id="experiment-title-input"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />
            </div>

            {validationError && (
              <div style={{ color: '#fda4af', background: 'rgba(244, 63, 94, 0.1)', padding: 10, borderRadius: 6, fontSize: 12 }}>
                ⚠️ {validationError}
              </div>
            )}

            {/* Run Button */}
            <button
              type="button"
              id="run-simulation-btn"
              className="btn btn-primary"
              style={{ padding: '12px 20px', fontSize: 15 }}
              onClick={handleRun}
            >
              ▶ Run All {trials.toLocaleString()} Trials
            </button>
          </div>
        </div>

        {/* Experiment Meta & Export Panel */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>Active Experiment Record</h2>
              <span className="badge badge-emerald">Schema v1</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>UUID: </span>
                <code style={{ color: '#a5b4fc', fontSize: 12 }}>{experiment.id}</code>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Created At: </span>
                <span style={{ color: 'var(--text-main)' }}>{new Date(experiment.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Total Executed: </span>
                <strong style={{ color: '#34d399', fontSize: 16, fontFamily: 'var(--font-mono)' }}>
                  {experiment.results.total.toLocaleString()} trials
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Parameters: </span>
                <span style={{ color: '#38bdf8' }}>
                  {experiment.parameters.kind.toUpperCase()} | {experiment.parameters.sides} Sides | Seed {experiment.parameters.seed}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Compute Latency: </span>
                <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)' }}>{execTimeMs.toFixed(2)} ms</span>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <label className="form-label" style={{ marginBottom: 6 }}>Notes / Hypothesis</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Optional experiment observations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                style={{ width: '100%', resize: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            <button
              type="button"
              id="save-experiment-btn"
              className="btn btn-primary"
              onClick={handleSave}
            >
              {saveSuccess ? '✓ Saved!' : '💾 Save Run'}
            </button>
            <button
              type="button"
              id="download-csv-btn"
              className="btn btn-secondary"
              onClick={handleDownloadCsv}
            >
              📊 Export CSV
            </button>
            <button
              type="button"
              id="download-json-btn"
              className="btn btn-secondary"
              onClick={handleDownloadJson}
            >
              📋 Canonical JSON
            </button>
          </div>
        </div>
      </div>

      {/* Outcome Visualization */}
      <Histogram
        kind={experiment.parameters.kind}
        sides={experiment.parameters.sides}
        results={experiment.results}
      />

      {/* Detailed Frequency Breakdown Table */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Empirical vs. Theoretical Breakdown</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 14px' }}>Outcome</th>
                <th style={{ padding: '10px 14px' }}>Count</th>
                <th style={{ padding: '10px 14px' }}>Empirical Proportion</th>
                <th style={{ padding: '10px 14px' }}>Expected Probability</th>
                <th style={{ padding: '10px 14px' }}>Absolute Deviation</th>
              </tr>
            </thead>
            <tbody>
              {experiment.results.counts.map((cnt, idx) => {
                const prop = metrics.proportions[idx];
                const exp = metrics.expectedProportion;
                const dev = metrics.deviations[idx];
                const label = experiment.parameters.kind === 'coin' ? (idx === 0 ? 'Heads (H)' : 'Tails (T)') : `Face ${idx + 1}`;

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-main)' }}>{label}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: '#a5b4fc' }}>{cnt.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>{(prop * 100).toFixed(3)}%</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: '#fcd34d' }}>{(exp * 100).toFixed(3)}%</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: dev > 0.01 ? '#fda4af' : '#34d399' }}>
                      {(dev * 100).toFixed(4)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

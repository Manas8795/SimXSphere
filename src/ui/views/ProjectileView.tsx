import React, { useState, useEffect } from 'react';
import type { ProjectileExperiment, ProjectileParameters } from '../../core/experiment/types';
import {
  runProjectileSimulation,
  validateProjectileParameters,
  GRAVITY_PRESETS,
} from '../../core/simulations/projectile';
import { TrajectoryChart } from '../components/TrajectoryChart';
import { exportProjectileCsv } from '../../core/simxpack/csv';
import { serializeCanonicalJson } from '../../core/experiment/serialize';

interface ProjectileViewProps {
  onSaveExperiment: (experiment: ProjectileExperiment) => void;
}

export const ProjectileView: React.FC<ProjectileViewProps> = ({ onSaveExperiment }) => {
  const [initialSpeed, setInitialSpeed] = useState<number>(20);
  const [angleDeg, setAngleDeg] = useState<number>(45);
  const [gravity, setGravity] = useState<number>(9.81);
  const [activePreset, setActivePreset] = useState<string>('Earth');
  const [title, setTitle] = useState<string>('45° Launch at 20 m/s (Earth)');
  const [description, setDescription] = useState<string>('Idealized parabolic trajectory baseline');

  // Active experiment state initialized with default run
  const [experiment, setExperiment] = useState<ProjectileExperiment>(() => {
    const initialParams: ProjectileParameters = {
      initialSpeed: 20,
      angleDeg: 45,
      gravity: 9.81,
    };
    const results = runProjectileSimulation(initialParams);
    return {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      type: 'projectile',
      title: '45° Launch at 20 m/s (Earth)',
      description: 'Idealized parabolic trajectory baseline',
      createdAt: new Date().toISOString(),
      appVersion: '1.0.0',
      parameters: initialParams,
      results,
    };
  });

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // REAL-TIME SYNCHRONIZATION:
  // Whenever initialSpeed, angleDeg, or gravity changes (via slider or buttons),
  // immediately recompute the physics simulation and update the diagram & metrics!
  useEffect(() => {
    const params: ProjectileParameters = {
      initialSpeed,
      angleDeg,
      gravity,
    };

    const validation = validateProjectileParameters(params);
    if (!validation.valid) {
      setValidationError(validation.errors.join(', '));
      return;
    }
    setValidationError(null);

    try {
      const results = runProjectileSimulation(params);
      setExperiment((prev) => ({
        ...prev,
        parameters: params,
        results,
      }));
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : 'Simulation computation failed');
    }
  }, [initialSpeed, angleDeg, gravity]);

  const handlePresetSelect = (name: 'Earth' | 'Moon' | 'Mars') => {
    const val = GRAVITY_PRESETS[name];
    setGravity(val);
    setActivePreset(name);
    setTitle(`${angleDeg}° Launch at ${initialSpeed} m/s (${name})`);
  };

  const handleCustomGravityChange = (val: number) => {
    setGravity(val);
    setActivePreset('Custom');
    setTitle(`${angleDeg}° Launch at ${initialSpeed} m/s (g=${val.toFixed(2)})`);
  };

  const handleRun = () => {
    const params: ProjectileParameters = {
      initialSpeed,
      angleDeg,
      gravity,
    };

    const validation = validateProjectileParameters(params);
    if (!validation.valid) {
      setValidationError(validation.errors.join(', '));
      return;
    }
    setValidationError(null);

    const results = runProjectileSimulation(params);

    const newExp: ProjectileExperiment = {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      type: 'projectile',
      title: title.trim() || `Projectile: ${initialSpeed}m/s at ${angleDeg}°`,
      description: description.trim(),
      createdAt: new Date().toISOString(),
      appVersion: '1.0.0',
      parameters: params,
      results,
    };

    setExperiment(newExp);
    setSaveSuccess(false);
  };

  const handleSave = () => {
    onSaveExperiment(experiment);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDownloadCsv = () => {
    const csvContent = exportProjectileCsv(experiment);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projectile-${experiment.parameters.initialSpeed}ms-${experiment.parameters.angleDeg}deg.csv`;
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

  // Complementary angle partner (e.g. 30° -> 60°, 15° -> 75°)
  const complementaryAngle = 90 - angleDeg;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Metrics Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="glass-panel" style={{ padding: '18px 22px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Horizontal Range (R)
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            {experiment.results.range.toFixed(3)} m
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Landing impact distance</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Flight Time (T)
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            {experiment.results.flightTime.toFixed(3)} s
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Time elapsed to touchdown</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Maximum Apex Height (H)
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fcd34d', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            {experiment.results.maxHeight.toFixed(3)} m
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Peak altitude at T/2</div>
        </div>
      </div>

      {/* Trajectory Canvas with Dynamic Scaling & Angle Visibility */}
      <TrajectoryChart
        results={experiment.results}
        v0={experiment.parameters.initialSpeed}
        angleDeg={experiment.parameters.angleDeg}
        gravity={experiment.parameters.gravity}
      />

      {/* Educational Insight Banner on Angle Physics */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1.5px solid var(--wood-frame)',
          borderRadius: 10,
        }}
      >
        <div style={{ fontSize: 24 }}>💡</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)' }}>
          <strong>Physics Discovery:</strong> Launching at <strong>{angleDeg}°</strong> gives a range of <strong>{experiment.results.range.toFixed(1)}m</strong>.
          {angleDeg === 45 ? (
            <span> 🏆 <strong>45° provides the absolute maximum range possible</strong> because sin(2 × 45°) = sin(90°) = 1!</span>
          ) : angleDeg === 90 ? (
            <span> 🚀 <strong>90° sends the rocket straight up to its highest possible altitude ({experiment.results.maxHeight.toFixed(1)}m)</strong> with zero horizontal flight distance.</span>
          ) : angleDeg === 0 ? (
            <span> 📐 <strong>0° is flat along the ground</strong> with no vertical lift or airtime.</span>
          ) : (
            <span> Did you know? Its complementary angle <strong>{complementaryAngle}°</strong> (90° − {angleDeg}°) achieves the <em>exact same horizontal landing distance</em>, but with a different flight arc!</span>
          )}
        </div>
      </div>

      {/* Controls & Details Form Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Parameters Form Panel */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Launch Parameters</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Launch Angle (θ) */}
            <div className="form-group">
              <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Launch Angle (θ)</span>
                <strong style={{ color: '#fcd34d', fontFamily: 'var(--font-mono)', fontSize: 16 }}>{angleDeg}°</strong>
              </div>

              {/* Quick Angle Presets */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
                {[
                  { deg: 15, label: '15° Shallow' },
                  { deg: 30, label: '30° Medium' },
                  { deg: 45, label: '45° Max Range 🏆' },
                  { deg: 60, label: '60° High Lob' },
                  { deg: 75, label: '75° Steep' },
                  { deg: 90, label: '90° Vertical' },
                ].map(({ deg, label }) => (
                  <button
                    key={deg}
                    type="button"
                    className={`btn ${angleDeg === deg ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 8px', fontSize: '11px', flex: 1, minWidth: '70px' }}
                    onClick={() => setAngleDeg(deg)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <input
                type="range"
                id="angle-slider"
                min="0"
                max="90"
                value={angleDeg}
                onChange={(e) => setAngleDeg(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#f59e0b' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>0° (Ground Flat)</span>
                <span>45° (Max Range)</span>
                <span>90° (Straight Up)</span>
              </div>
            </div>

            {/* Speed v0 */}
            <div className="form-group">
              <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Initial Velocity (v₀)</span>
                <strong style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', fontSize: 16 }}>{initialSpeed} m/s</strong>
              </div>

              {/* Quick Speed Presets */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {[10, 20, 35, 50].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn ${initialSpeed === s ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 8px', fontSize: '11px', flex: 1 }}
                    onClick={() => setInitialSpeed(s)}
                  >
                    {s} m/s
                  </button>
                ))}
              </div>

              <input
                type="range"
                id="speed-slider"
                min="1"
                max="100"
                value={initialSpeed}
                onChange={(e) => setInitialSpeed(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>1 m/s (Toss)</span>
                <span>50 m/s (Rocket)</span>
                <span>100 m/s (Sonic)</span>
              </div>
            </div>

            {/* Gravity & Presets */}
            <div className="form-group">
              <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Gravitational Acceleration (g)</span>
                <strong style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontSize: 16 }}>{gravity.toFixed(2)} m/s²</strong>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {(['Earth', 'Moon', 'Mars'] as const).map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`btn ${activePreset === name ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 10px', fontSize: '12px', flex: 1 }}
                    onClick={() => handlePresetSelect(name)}
                  >
                    {name} ({GRAVITY_PRESETS[name]}m/s²)
                  </button>
                ))}
              </div>
              <input
                type="range"
                id="gravity-slider"
                min="0.1"
                max="30"
                step="0.01"
                value={gravity}
                onChange={(e) => handleCustomGravityChange(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Experiment Title</label>
              <input
                type="text"
                id="projectile-title-input"
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

            <button
              type="button"
              id="run-projectile-btn"
              className="btn btn-primary"
              style={{ padding: '12px 20px', fontSize: 15 }}
              onClick={handleRun}
            >
              🚀 Fire Rocket / Replay Launch
            </button>
          </div>
        </div>

        {/* Experiment Meta & Export Panel */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>Experiment Record</h2>
              <span className="badge badge-indigo">Analytical Mechanics</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>UUID: </span>
                <code style={{ color: '#a5b4fc', fontSize: 12 }}>{experiment.id}</code>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Governing Formulas: </span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.7 }}>
                  <div>Horizontal Range: R = v₀² · sin(2θ) / g</div>
                  <div>Flight Duration: T = 2 · v₀ · sin(θ) / g</div>
                  <div>Maximum Altitude: H = (v₀ · sin(θ))² / (2g)</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <label className="form-label" style={{ marginBottom: 6, fontWeight: 700 }}>Notes / Observations</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Optional experiment notes..."
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
              id="save-projectile-btn"
              className="btn btn-primary"
              onClick={handleSave}
            >
              {saveSuccess ? '✓ Saved!' : '💾 Save Run'}
            </button>
            <button
              type="button"
              id="download-projectile-csv-btn"
              className="btn btn-secondary"
              onClick={handleDownloadCsv}
            >
              📊 Export CSV
            </button>
            <button
              type="button"
              id="download-projectile-json-btn"
              className="btn btn-secondary"
              onClick={handleDownloadJson}
            >
              📋 Canonical JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

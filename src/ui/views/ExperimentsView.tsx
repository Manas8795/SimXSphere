import React, { useState } from 'react';
import type { ExperimentRun, ProbabilityExperiment, ProjectileExperiment } from '../../core/experiment/types';
import { serializeCanonicalJson } from '../../core/experiment/serialize';
import { exportExperimentCsv } from '../../core/simxpack/csv';

interface ExperimentsViewProps {
  experiments: ExperimentRun[];
  onDeleteExperiment: (id: string) => void;
  onClearAll: () => void;
  onSelectForPack?: (selectedIds: string[]) => void;
  onLoadExperiment: (exp: ExperimentRun) => void;
}

export const ExperimentsView: React.FC<ExperimentsViewProps> = ({
  experiments,
  onDeleteExperiment,
  onClearAll,
  onSelectForPack,
  onLoadExperiment,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'probability' | 'projectile'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Filter and search
  const filtered = experiments.filter((exp) => {
    if (filterType !== 'all' && exp.type !== filterType) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchTitle = exp.title.toLowerCase().includes(q);
      const matchId = exp.id.toLowerCase().includes(q);
      const matchDesc = (exp.description || '').toLowerCase().includes(q);
      return matchTitle || matchId || matchDesc;
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDownloadJson = (exp: ExperimentRun) => {
    const jsonStr = serializeCanonicalJson(exp);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exp.type}-${exp.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = (exp: ExperimentRun) => {
    const csvContent = exportExperimentCsv(exp);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exp.type}-${exp.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBuildPack = () => {
    if (onSelectForPack && selectedIds.length >= 2 && selectedIds.length <= 4) {
      onSelectForPack(selectedIds);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header & Actions Strip */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge badge-emerald">Storage: Local Browser</span>
              <span className="badge badge-indigo">{experiments.length} Total Runs</span>
            </div>
            <h1 style={{ fontSize: 24 }}>Saved Experiment Runs</h1>
            <p style={{ fontSize: 14 }}>
              Persisted with canonical schema validation. Select 2 to 4 experiments to build a portable SimXPack bundle.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {selectedIds.length >= 2 && selectedIds.length <= 4 && onSelectForPack && (
              <button
                id="bundle-selected-btn"
                className="btn btn-primary"
                onClick={handleBuildPack}
              >
                📦 Bundle {selectedIds.length} into SimXPack
              </button>
            )}

            {experiments.length > 0 && (
              <button
                id="clear-all-data-btn"
                className="btn btn-danger"
                onClick={() => setShowClearConfirm(true)}
              >
                🗑 Delete All Local Data
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, background: 'rgba(0, 0, 0, 0.3)', padding: 4, borderRadius: 8 }}>
            <button
              className={`nav-tab-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({experiments.length})
            </button>
            <button
              className={`nav-tab-btn ${filterType === 'probability' ? 'active' : ''}`}
              onClick={() => setFilterType('probability')}
            >
              Probability ({experiments.filter((e) => e.type === 'probability').length})
            </button>
            <button
              className={`nav-tab-btn ${filterType === 'projectile' ? 'active' : ''}`}
              onClick={() => setFilterType('projectile')}
            >
              Projectile ({experiments.filter((e) => e.type === 'projectile').length})
            </button>
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <input
              type="text"
              id="search-experiments-input"
              className="form-input"
              placeholder="Search by title, UUID, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Experiment List */}
      {filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧪</div>
          <h3 style={{ fontSize: 18, marginBottom: 6 }}>
            {experiments.length === 0 ? 'No Saved Experiments Yet' : 'No Experiments Match Filter'}
          </h3>
          <p style={{ fontSize: 14 }}>
            {experiments.length === 0
              ? 'Run simulations in Probability or Projectile tabs and click "Save Run" to record your findings.'
              : 'Try clearing your search query or switching category filters.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((exp) => {
            const isSelected = selectedIds.includes(exp.id);
            const isProb = exp.type === 'probability';
            const probExp = exp as ProbabilityExperiment;
            const projExp = exp as ProjectileExperiment;

            return (
              <div
                key={exp.id}
                className="glass-panel"
                style={{
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                  borderLeft: isProb ? '4px solid #6366f1' : '4px solid #38bdf8',
                  background: isSelected ? 'rgba(99, 102, 241, 0.12)' : undefined,
                }}
              >
                {/* Checkbox and Info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 280 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(exp.id)}
                    style={{ marginTop: 5, width: 18, height: 18, accentColor: '#6366f1', cursor: 'pointer' }}
                    title="Select to bundle into SimXPack (2 to 4)"
                  />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className={isProb ? 'badge badge-indigo' : 'badge badge-emerald'}>
                        {isProb ? '🎲 PROBABILITY' : '🚀 PROJECTILE'}
                      </span>
                      <h3 style={{ fontSize: 16 }}>{exp.title}</h3>
                    </div>

                    <p style={{ fontSize: 13, marginTop: 4 }}>{exp.description || 'No description provided'}</p>

                    <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>🕒 {new Date(exp.createdAt).toLocaleString()}</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>ID: {exp.id.slice(0, 8)}...</span>
                      {isProb ? (
                        <span style={{ color: '#a5b4fc' }}>
                          {probExp.parameters.kind.toUpperCase()} | {probExp.parameters.sides} Sides | {probExp.parameters.trials.toLocaleString()} Trials | Seed {probExp.parameters.seed}
                        </span>
                      ) : (
                        <span style={{ color: '#38bdf8' }}>
                          v₀={projExp.parameters.initialSpeed}m/s | θ={projExp.parameters.angleDeg}° | g={projExp.parameters.gravity}m/s² | R={projExp.results.range.toFixed(2)}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => onLoadExperiment(exp)}
                    title="Load these exact parameters into the simulator"
                  >
                    🔄 Re-Run
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => handleDownloadCsv(exp)}
                    title="Export CSV data"
                  >
                    CSV
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => handleDownloadJson(exp)}
                    title="Export Canonical JSON"
                  >
                    JSON
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => onDeleteExperiment(exp.id)}
                    title="Delete experiment from local storage"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showClearConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20,
        }}>
          <div className="glass-panel" style={{ maxWidth: 480, width: '100%', padding: 28, border: '1px solid rgba(244, 63, 94, 0.4)' }}>
            <span className="badge badge-rose" style={{ marginBottom: 10 }}>Privacy & Data Reset</span>
            <h3 style={{ fontSize: 20, marginBottom: 8, color: '#fda4af' }}>Delete All Local Data?</h3>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              This will permanently delete all {experiments.length} saved experiment runs from this browser session. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onClearAll();
                  setSelectedIds([]);
                  setShowClearConfirm(false);
                }}
              >
                Yes, Delete All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

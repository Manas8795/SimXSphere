import React, { useState } from 'react';
import { Navbar, type ActiveTab } from './ui/components/Navbar';
import { WorkplaneLab } from './components/WorkplaneLab';
import { PeriodicTable } from './components/PeriodicTable';
import { SynthesisReactor } from './components/SynthesisReactor';
import { ChemistryView } from './ui/views/ChemistryView';
import { EquationValidatorView } from './components/EquationValidator';
import { PERIODIC_TABLE, type ChemicalElement } from './chemistry-data/elements';

export interface SavedExperimentRun {
  id: string;
  title: string;
  timestamp: string;
  details: string;
  tag: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('workplane');
  const [selectedElement, setSelectedElement] = useState<ChemicalElement | null>(() => PERIODIC_TABLE[0]); // Hydrogen default

  // Lab experiment history stored in browser state / localStorage
  const [labRuns, setLabRuns] = useState<SavedExperimentRun[]>(() => {
    try {
      const saved = localStorage.getItem('simxsphere_lab_runs');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [
      {
        id: 'run-init-1',
        title: 'Synthesis: H2O (Water)',
        details: '2H₂(g) + O₂(g) → 2H₂O(l) • Covalent Polar Bond • ΔH = -285.8 kJ/mol',
        timestamp: new Date().toLocaleTimeString(),
        tag: 'Synthesis',
      },
      {
        id: 'run-init-2',
        title: 'Aqueous: HCl + NaOH Neutralization',
        details: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l) • Final pH: 7.00 • ΔT: +2.4°C',
        timestamp: new Date().toLocaleTimeString(),
        tag: 'Aqueous',
      },
    ];
  });

  const handleSaveRun = (title: string, details: string, tag: string) => {
    const newRun: SavedExperimentRun = {
      id: crypto.randomUUID(),
      title,
      details,
      timestamp: new Date().toLocaleTimeString(),
      tag,
    };
    const updated = [newRun, ...labRuns];
    setLabRuns(updated);
    try {
      localStorage.setItem('simxsphere_lab_runs', JSON.stringify(updated));
    } catch {
      // localStorage may be disabled
    }
  };

  const handleDeleteRun = (id: string) => {
    const updated = labRuns.filter((r) => r.id !== id);
    setLabRuns(updated);
    try {
      localStorage.setItem('simxsphere_lab_runs', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleClearAllRuns = () => {
    setLabRuns([]);
    try {
      localStorage.removeItem('simxsphere_lab_runs');
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--lab-bg)' }}>
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        runCount={labRuns.length}
      />

      <main className="main-content" id="main-lab-viewport" style={{ padding: activeTab === 'workplane' ? 0 : '1.5rem', maxWidth: activeTab === 'workplane' ? '100%' : '1400px' }}>
        {/* Tab 0: Interactive Drag-and-Drop Workplane */}
        {activeTab === 'workplane' && (
          <WorkplaneLab
            onSaveRun={(title, details, tag) => {
              handleSaveRun(title, details, tag);
            }}
          />
        )}

        {/* Tab 1: Interactive Periodic Table */}
        {activeTab === 'table' && (
          <PeriodicTable
            selectedElement={selectedElement}
            onSelectElement={(el) => setSelectedElement(el)}
            onAddToReactor={(_el) => {
              setActiveTab('reactor');
            }}
          />
        )}

        {/* Tab 2: Elemental Synthesis Reactor */}
        {activeTab === 'reactor' && (
          <SynthesisReactor
            onSaveCompoundExperiment={(title, eq, _formula) => {
              handleSaveRun(title, eq, 'Synthesis');
            }}
          />
        )}

        {/* Tab 3: Aqueous Reaction & Titration Vessel */}
        {activeTab === 'aqueous' && (
          <ChemistryView
            onSaveExperiment={(exp) => {
              handleSaveRun(exp.title, exp.description || '', 'Aqueous');
            }}
          />
        )}

        {/* Tab 4: Chemical Equation Validator */}
        {activeTab === 'validator' && <EquationValidatorView />}

        {/* Tab 5: Lab Experiment History */}
        {activeTab === 'runs' && (
          <div className="lab-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 20 }}>Saved Laboratory Runs ({labRuns.length})</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  All verified synthesis and reaction experiments recorded in this local session.
                </p>
              </div>

              {labRuns.length > 0 && (
                <button
                  type="button"
                  className="lab-btn lab-btn-danger"
                  onClick={handleClearAllRuns}
                >
                  Clear All History
                </button>
              )}
            </div>

            {labRuns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
                No experiments recorded yet. Use the Compound Synthesizer or Aqueous Vessel to test and save reactions.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {labRuns.map((run) => (
                  <div
                    key={run.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          className="lab-badge"
                          style={{
                            background: run.tag === 'Synthesis' ? '#eff6ff' : '#ecfdf5',
                            color: run.tag === 'Synthesis' ? '#1d4ed8' : '#065f46',
                            border: `1px solid ${run.tag === 'Synthesis' ? '#bfdbfe' : '#a7f3d0'}`,
                          }}
                        >
                          {run.tag}
                        </span>
                        <strong style={{ fontSize: 15, color: '#0f172a' }}>{run.title}</strong>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{run.timestamp}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                        {run.details}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="lab-btn lab-btn-secondary"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => handleDeleteRun(run.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

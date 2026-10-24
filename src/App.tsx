import React, { useState, useEffect } from 'react';
import { Navbar, type ActiveTab, type ThemeMode } from './ui/components/Navbar';
import { WorkplaneLab } from './components/WorkplaneLab';
import { PeriodicTable } from './components/PeriodicTable';
import { SynthesisReactor } from './components/SynthesisReactor';
import { ChemistryView } from './ui/views/ChemistryView';
import { EquationValidatorView } from './components/EquationValidator';
import { PERIODIC_TABLE, type ChemicalElement } from './chemistry-data/elements';

import { ProbabilityView } from './ui/views/ProbabilityView';
import { ProjectileView } from './ui/views/ProjectileView';

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

  // Playful Green-Black default theme with user toggle support
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('simxsphere_theme');
      if (saved === 'green-black' || saved === 'meadow-green') return saved;
    } catch {
      // ignore
    }
    return 'green-black';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'green-black' ? 'meadow-green' : 'green-black';
      try {
        localStorage.setItem('simxsphere_theme', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Lab experiment history stored in browser state / localStorage (empty on fresh session)
  const [labRuns, setLabRuns] = useState<SavedExperimentRun[]>(() => {
    try {
      const saved = localStorage.getItem('simxsphere_lab_runs');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  const handleSaveRun = (title: string, details: string, tag: string) => {
    const newRun: SavedExperimentRun = {
      id: crypto.randomUUID(),
      title,
      details,
      timestamp: new Date().toLocaleTimeString(),
      tag,
    };
    setLabRuns((prev) => {
      const updated = [newRun, ...prev];
      try {
        localStorage.setItem('simxsphere_lab_runs', JSON.stringify(updated));
      } catch {
        // localStorage may be disabled or full
      }
      return updated;
    });
  };

  const handleDeleteRun = (id: string) => {
    setLabRuns((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem('simxsphere_lab_runs', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearAllRuns = () => {
    setLabRuns(() => {
      try {
        localStorage.removeItem('simxsphere_lab_runs');
      } catch {
        // ignore
      }
      return [];
    });
  };

  return (
    <div
      data-theme={theme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--lab-bg)',
        color: 'var(--text-primary)',
        transition: 'background 0.25s ease, color 0.25s ease',
      }}
    >
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        runCount={labRuns.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
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
                <h2 style={{ fontSize: 22, fontFamily: 'var(--font-display)' }}>📓 My Science Discoveries ({labRuns.length})</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 700 }}>
                  All the wonderful compounds and colorful reactions you have discovered!
                </p>
              </div>

              {labRuns.length > 0 && (
                <button
                  type="button"
                  className="lab-btn lab-btn-danger"
                  onClick={handleClearAllRuns}
                >
                  Clear All Discoveries
                </button>
              )}
            </div>

            {labRuns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '44px 16px', color: '#166534', fontFamily: 'var(--font-display)', fontSize: 16 }}>
                🎈 No discoveries recorded yet! Try mixing elements in the <strong>Mix & React Lab</strong> or pouring colorful solutions in <strong>Color Titration</strong> to save your first experiment!
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
                            background:
                              run.tag === 'Synthesis'
                                ? '#eff6ff'
                                : run.tag === 'Probability'
                                ? '#fdf2f8'
                                : run.tag === 'Projectile'
                                ? '#f5f3ff'
                                : '#ecfdf5',
                            color:
                              run.tag === 'Synthesis'
                                ? '#1d4ed8'
                                : run.tag === 'Probability'
                                ? '#9d174d'
                                : run.tag === 'Projectile'
                                ? '#6d28d9'
                                : '#065f46',
                            border: `1px solid ${
                              run.tag === 'Synthesis'
                                ? '#bfdbfe'
                                : run.tag === 'Probability'
                                ? '#fbcfe8'
                                : run.tag === 'Projectile'
                                ? '#ddd6fe'
                                : '#a7f3d0'
                            }`,
                          }}
                        >
                          {run.tag}
                        </span>
                        <strong style={{ fontSize: 15, color: '#ffffff' }}>{run.title}</strong>
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

        {/* Tab 6: Independent Probability Simulations */}
        {activeTab === 'probability' && (
          <ProbabilityView
            onSaveExperiment={(exp) => {
              handleSaveRun(
                exp.title,
                `${exp.description || 'Probability test'} • Trials: ${exp.parameters.trials.toLocaleString()} • Seed: ${exp.parameters.seed}`,
                'Probability'
              );
            }}
          />
        )}

        {/* Tab 7: Independent Projectile Kinematics */}
        {activeTab === 'projectile' && (
          <ProjectileView
            onSaveExperiment={(exp) => {
              handleSaveRun(
                exp.title,
                `Launch: ${exp.parameters.initialSpeed} m/s @ ${exp.parameters.angleDeg}° • g = ${exp.parameters.gravity} m/s² • Range: ${exp.results.range.toFixed(1)}m`,
                'Projectile'
              );
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;

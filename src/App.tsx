import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar, type DisciplineTab, type ThemeMode } from './ui/components/Navbar';
import { WorkplaneLab } from './components/WorkplaneLab';
import { PeriodicTable } from './components/PeriodicTable';
import { SynthesisReactor } from './components/SynthesisReactor';
import { ChemistryView } from './ui/views/ChemistryView';
import { EquationValidatorView } from './components/EquationValidator';
import { PERIODIC_TABLE, type ChemicalElement } from './chemistry-data/elements';

import { ProbabilityView } from './ui/views/ProbabilityView';
import { ProjectileView } from './ui/views/ProjectileView';
import { ExplainerManager } from './ui/components/explainer/ExplainerManager';
import {
  buildWorkplaneExplainerContext,
  buildChemistryDiscoveriesExplainerContext,
} from './core/explainer/context-builders/chemistryContext';
import { createSingleSimXPackage, triggerFileDownload } from './core/simxpack/singlePackage';
import { ShareDialog } from './ui/components/sharing/ShareDialog';
import { ImportDialog } from './ui/components/sharing/ImportDialog';
import type { SimulationExplainerContext } from './core/explainer/types';
import type { ExperimentRun } from './core/experiment/types';
import { LocalStorageAdapter } from './storage/localAdapter';

export interface SavedExperimentRun {
  id: string;
  title: string;
  timestamp: string;
  details: string;
  tag: string;
}

export type ChemistrySubTab = 'workplane' | 'table' | 'reactor' | 'aqueous' | 'validator' | 'runs';

export const App: React.FC = () => {
  // 3 Primary Disciplines: Chemistry | Probability | Physics
  const [activeDiscipline, setActiveDiscipline] = useState<DisciplineTab>('chemistry');
  // Secondary sub-navigation within Chemistry
  const [chemistrySubTab, setChemistrySubTab] = useState<ChemistrySubTab>('workplane');
  const [selectedElement, setSelectedElement] = useState<ChemicalElement | null>(() => PERIODIC_TABLE[0]); // Hydrogen default

  // Explainer Context State: tracks current and previous simulation snapshots for local AI explanations
  // Default to Mix & React Chemistry Workplane (the initial active tab)
  const [activeExplainerContext, setActiveExplainerContext] = useState<SimulationExplainerContext>(() =>
    buildWorkplaneExplainerContext(
      {
        hasBeaker: false,
        beakerElements: [],
        workplaneElementsCount: 0,
        synthesisResult: null,
      },
      1
    )
  );
  const [priorExplainerContext, setPriorExplainerContext] = useState<SimulationExplainerContext | null>(null);

  const handleExplainerContextChange = useCallback((newCtx: SimulationExplainerContext) => {
    setActiveExplainerContext((currentActive) => {
      // Keep previous snapshot if revision changed
      if (currentActive && currentActive.stateRevision !== newCtx.stateRevision) {
        setPriorExplainerContext(currentActive);
      }
      return newCtx;
    });
  }, []);

  // Themes: chalkboard (classroom dark green) | scientist-dark (slate & cyan) | scientist-light (academic paper)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('simxsphere_theme') as ThemeMode;
      if (saved === 'chalkboard' || saved === 'scientist-dark' || saved === 'scientist-light') return saved;
    } catch {
      // ignore
    }
    return 'chalkboard';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const handleSelectTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('simxsphere_theme', newTheme);
    } catch {
      // ignore
    }
  };

  // Unified LocalStorageAdapter for canonical ExperimentRun persistence
  const storageAdapter = useMemo(() => new LocalStorageAdapter(), []);
  const [savedExperiments, setSavedExperiments] = useState<ExperimentRun[]>([]);
  const [restoredExperiment, setRestoredExperiment] = useState<ExperimentRun | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Sharing & Portable Export/Import State
  const [shareTargetExperiment, setShareTargetExperiment] = useState<ExperimentRun | null>(null);
  const [showImportDialog, setShowImportDialog] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Load experiments on initial mount
  useEffect(() => {
    storageAdapter.listExperiments().then((list) => {
      setSavedExperiments(list);
    }).catch((err) => {
      console.warn('Failed to load local experiments:', err);
    });
  }, [storageAdapter]);

  const handleSaveExperiment = useCallback(async (exp: ExperimentRun) => {
    try {
      await storageAdapter.saveExperiment(exp);
      const updated = await storageAdapter.listExperiments();
      setSavedExperiments(updated);
      setStorageError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Storage error';
      console.error('Failed to save experiment:', err);
      setStorageError(msg);
      alert(`Could not save experiment: ${msg}`);
    }
  }, [storageAdapter]);

  const handleExportExperiment = useCallback(async (exp: ExperimentRun) => {
    try {
      const { filename, jsonString } = await createSingleSimXPackage(exp);
      triggerFileDownload(filename, jsonString);
      setActionNotice(`✓ Exported ${filename}`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Could not export experiment: ${msg}`);
    }
  }, []);

  const handleImportComplete = useCallback(async (importedList: ExperimentRun[], restoreTarget?: ExperimentRun) => {
    try {
      for (const exp of importedList) {
        await storageAdapter.saveExperiment(exp);
      }
      const updated = await storageAdapter.listExperiments();
      setSavedExperiments(updated);
      setActionNotice(`✓ Successfully imported ${importedList.length} experiment(s)`);
      setTimeout(() => setActionNotice(null), 3500);

      if (restoreTarget) {
        setRestoredExperiment(restoreTarget);
        if (restoreTarget.type === 'chemistry') {
          setActiveDiscipline('chemistry');
          if (restoreTarget.parameters.mode === 'workplane') {
            setChemistrySubTab('workplane');
          } else if (restoreTarget.parameters.mode === 'synthesis') {
            setChemistrySubTab('reactor');
          } else {
            setChemistrySubTab('aqueous');
          }
        } else if (restoreTarget.type === 'probability') {
          setActiveDiscipline('probability');
        } else if (restoreTarget.type === 'projectile') {
          setActiveDiscipline('physics');
        }
      }
    } catch (err) {
      console.error('Failed to save imported experiments:', err);
      alert('Could not save imported experiments to local storage.');
    }
  }, [storageAdapter]);

  const handleDeleteExperiment = useCallback(async (id: string) => {
    try {
      await storageAdapter.deleteExperiment(id);
      const updated = await storageAdapter.listExperiments();
      setSavedExperiments(updated);
    } catch (err) {
      console.error('Failed to delete experiment:', err);
    }
  }, [storageAdapter]);

  const handleClearAllExperiments = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete all saved discoveries?')) return;
    try {
      await storageAdapter.clearAllExperiments();
      setSavedExperiments([]);
    } catch (err) {
      console.error('Failed to clear experiments:', err);
    }
  }, [storageAdapter]);

  const handleRestoreExperiment = useCallback((exp: ExperimentRun) => {
    setRestoredExperiment(exp);
    if (exp.type === 'chemistry') {
      setActiveDiscipline('chemistry');
      if (exp.parameters.mode === 'workplane') {
        setChemistrySubTab('workplane');
      } else if (exp.parameters.mode === 'synthesis') {
        setChemistrySubTab('reactor');
      } else {
        setChemistrySubTab('aqueous');
      }
    } else if (exp.type === 'probability') {
      setActiveDiscipline('probability');
    } else if (exp.type === 'projectile') {
      setActiveDiscipline('physics');
    }
  }, []);

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
        activeDiscipline={activeDiscipline}
        onSelectDiscipline={(disc) => {
          if (disc !== activeDiscipline) {
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            setActiveDiscipline(disc);
            if (disc === 'chemistry' && chemistrySubTab === 'runs') {
              handleExplainerContextChange(
                buildChemistryDiscoveriesExplainerContext(savedExperiments.length, Date.now())
              );
            }
          }
        }}
        runCount={savedExperiments.length}
        theme={theme}
        onSelectTheme={handleSelectTheme}
      />

      {/* Chemistry Sub-Navigation Pill Bar (visible when Chemistry discipline is selected) */}
      {activeDiscipline === 'chemistry' && (
        <nav className="chemistry-subnav" aria-label="Chemistry Sub Navigation">
          <button
            type="button"
            className={`subnav-pill ${chemistrySubTab === 'workplane' ? 'active' : ''}`}
            onClick={() => {
              if (chemistrySubTab !== 'workplane') {
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setChemistrySubTab('workplane');
              }
            }}
            id="subnav-workplane"
          >
            <span>🧪</span> Mix & React
          </button>
          <button
            type="button"
            className={`subnav-pill ${chemistrySubTab === 'table' ? 'active' : ''}`}
            onClick={() => {
              if (chemistrySubTab !== 'table') {
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setChemistrySubTab('table');
              }
            }}
            id="subnav-table"
          >
            <span>🧱</span> Element Blocks
          </button>
          <button
            type="button"
            className={`subnav-pill ${chemistrySubTab === 'reactor' ? 'active' : ''}`}
            onClick={() => {
              if (chemistrySubTab !== 'reactor') {
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setChemistrySubTab('reactor');
              }
            }}
            id="subnav-reactor"
          >
            <span>🔮</span> Magic Reactor
          </button>
          <button
            type="button"
            className={`subnav-pill ${chemistrySubTab === 'aqueous' ? 'active' : ''}`}
            onClick={() => {
              if (chemistrySubTab !== 'aqueous') {
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setChemistrySubTab('aqueous');
              }
            }}
            id="subnav-aqueous"
          >
            <span>💧</span> Color Titration
          </button>
          <button
            type="button"
            className={`subnav-pill ${chemistrySubTab === 'validator' ? 'active' : ''}`}
            onClick={() => {
              if (chemistrySubTab !== 'validator') {
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setChemistrySubTab('validator');
              }
            }}
            id="subnav-validator"
          >
            <span>⚖️</span> Equation Balancer
          </button>
          <button
            type="button"
            className={`subnav-pill ${chemistrySubTab === 'runs' ? 'active' : ''}`}
            onClick={() => {
              if (chemistrySubTab !== 'runs') {
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setChemistrySubTab('runs');
                handleExplainerContextChange(
                  buildChemistryDiscoveriesExplainerContext(savedExperiments.length, Date.now())
                );
              }
            }}
            id="subnav-runs"
          >
            <span>📓</span> My Discoveries
            {savedExperiments.length > 0 && (
              <span
                style={{
                  background: 'var(--sticky-yellow)',
                  color: 'var(--sticky-yellow-text)',
                  border: '1px solid var(--wood-frame)',
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 900,
                  marginLeft: 4,
                }}
              >
                {savedExperiments.length}
              </span>
            )}
          </button>
        </nav>
      )}

      <main
        className="main-content"
        id="main-lab-viewport"
        style={{
          padding: activeDiscipline === 'chemistry' && chemistrySubTab === 'workplane' ? 0 : '1.5rem',
          maxWidth: activeDiscipline === 'chemistry' && chemistrySubTab === 'workplane' ? '100%' : '1400px',
        }}
      >
        {/* ===================================================================
            1. CHEMISTRY DISCIPLINE (Contains Workplane, Periodic Table, Reactor, Aqueous, Balancer, Discoveries)
            =================================================================== */}
        {activeDiscipline === 'chemistry' && (
          <>
            {/* Sub-Tab 0: Interactive Drag-and-Drop Workplane */}
            {chemistrySubTab === 'workplane' && (
              <WorkplaneLab
                onSaveExperiment={handleSaveExperiment}
                restoredExperiment={restoredExperiment?.type === 'chemistry' && restoredExperiment.parameters.mode === 'workplane' ? restoredExperiment : null}
                onContextChange={handleExplainerContextChange}
              />
            )}

            {/* Sub-Tab 1: Interactive Periodic Table */}
            {chemistrySubTab === 'table' && (
              <PeriodicTable
                selectedElement={selectedElement}
                onSelectElement={(el) => setSelectedElement(el)}
                onAddToReactor={(_el) => {
                  setChemistrySubTab('reactor');
                }}
                onContextChange={handleExplainerContextChange}
              />
            )}

            {/* Sub-Tab 2: Elemental Synthesis Reactor */}
            {chemistrySubTab === 'reactor' && (
              <SynthesisReactor
                onSaveExperiment={handleSaveExperiment}
                restoredExperiment={restoredExperiment?.type === 'chemistry' && restoredExperiment.parameters.mode === 'synthesis' ? restoredExperiment : null}
                onContextChange={handleExplainerContextChange}
              />
            )}

            {/* Sub-Tab 3: Aqueous Reaction & Titration Vessel */}
            {chemistrySubTab === 'aqueous' && (
              <ChemistryView
                onSaveExperiment={handleSaveExperiment}
                restoredExperiment={restoredExperiment?.type === 'chemistry' && restoredExperiment.parameters.mode === 'aqueous' ? restoredExperiment : null}
                onContextChange={handleExplainerContextChange}
              />
            )}

            {/* Sub-Tab 4: Chemical Equation Validator */}
            {chemistrySubTab === 'validator' && (
              <EquationValidatorView onContextChange={handleExplainerContextChange} />
            )}

            {/* Sub-Tab 5: Lab Experiment History */}
            {chemistrySubTab === 'runs' && (
              <div className="lab-card" style={{ padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>📓 My Science Discoveries ({savedExperiments.length})</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 700 }}>
                      All canonical experiments saved to offline-first local storage. Click "Restore" to reload parameters and re-simulate!
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="lab-btn lab-btn-primary"
                      onClick={() => setShowImportDialog(true)}
                      id="btn-import-simxpack"
                      title="Import a .simxpack portable simulation package"
                    >
                      📥 Import .simxpack
                    </button>
                    {savedExperiments.length > 0 && (
                      <button
                        type="button"
                        className="lab-btn lab-btn-danger"
                        onClick={handleClearAllExperiments}
                      >
                        Clear All Discoveries
                      </button>
                    )}
                  </div>
                </div>

                {actionNotice && (
                  <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1.5px solid #22c55e', color: '#4ade80', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 700 }}>
                    {actionNotice}
                  </div>
                )}

                {storageError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '10px 14px', borderRadius: 8, color: '#fca5a5', marginBottom: 14, fontSize: 13 }}>
                    ⚠️ Storage Notice: {storageError}
                  </div>
                )}

                {savedExperiments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '44px 16px', color: 'var(--status-neutral)', fontFamily: 'var(--font-display)', fontSize: 16 }}>
                    🎈 No discoveries recorded yet! Try simulating in <strong>Mix & React</strong>, <strong>Color Titration</strong>, <strong>Probability</strong>, or <strong>Projectile</strong> to save your first experiment!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {savedExperiments.map((run) => {
                      const tagLabel = run.type === 'chemistry'
                        ? (run.parameters.mode === 'workplane' ? 'Synthesis' : (run.parameters.mode === 'synthesis' ? 'Synthesis' : 'Aqueous'))
                        : run.type === 'probability'
                        ? 'Probability'
                        : 'Physics';

                      return (
                        <div
                          key={run.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            borderRadius: 6,
                            background: 'var(--lab-surface)',
                            border: '1.5px solid var(--wood-frame)',
                            flexWrap: 'wrap',
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span
                                className="lab-badge"
                                style={{
                                  background:
                                    tagLabel === 'Synthesis'
                                      ? '#eff6ff'
                                      : tagLabel === 'Probability'
                                      ? '#fdf2f8'
                                      : tagLabel === 'Physics'
                                      ? '#f5f3ff'
                                      : '#ecfdf5',
                                  color:
                                    tagLabel === 'Synthesis'
                                      ? '#1d4ed8'
                                      : tagLabel === 'Probability'
                                      ? '#9d174d'
                                      : tagLabel === 'Physics'
                                      ? '#6d28d9'
                                      : '#065f46',
                                  border: `1px solid ${
                                    tagLabel === 'Synthesis'
                                      ? '#bfdbfe'
                                      : tagLabel === 'Probability'
                                      ? '#fbcfe8'
                                      : tagLabel === 'Physics'
                                      ? '#ddd6fe'
                                      : '#a7f3d0'
                                  }`,
                                }}
                              >
                                {tagLabel}
                              </span>
                              <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{run.title}</strong>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                              {run.description}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="lab-btn lab-btn-primary"
                              style={{ fontSize: 12, padding: '5px 12px' }}
                              onClick={() => handleRestoreExperiment(run)}
                              title="Reload parameters into active simulation"
                            >
                              ▶ Restore
                            </button>
                            <button
                              type="button"
                              className="lab-btn lab-btn-secondary"
                              style={{ fontSize: 12, padding: '5px 10px' }}
                              onClick={() => handleExportExperiment(run)}
                              title="Download portable .simxpack package"
                            >
                              📦 Export
                            </button>
                            <button
                              type="button"
                              className="lab-btn lab-btn-secondary"
                              style={{ fontSize: 12, padding: '5px 10px' }}
                              onClick={() => setShareTargetExperiment(run)}
                              title="Share file with colleagues"
                            >
                              🔗 Share
                            </button>
                            <button
                              type="button"
                              className="lab-btn lab-btn-danger"
                              style={{ fontSize: 12, padding: '5px 10px' }}
                              onClick={() => handleDeleteExperiment(run.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal Dialogs for Local Sharing & Import */}
        {shareTargetExperiment && (
          <ShareDialog
            experiment={shareTargetExperiment}
            onClose={() => setShareTargetExperiment(null)}
          />
        )}

        {showImportDialog && (
          <ImportDialog
            existingExperiments={savedExperiments}
            onImportComplete={handleImportComplete}
            onClose={() => setShowImportDialog(false)}
          />
        )}

        {/* ===================================================================
            2. PROBABILITY DISCIPLINE (Independent Probability Experiments)
            =================================================================== */}
        {activeDiscipline === 'probability' && (
          <ProbabilityView
            onSaveExperiment={handleSaveExperiment}
            restoredExperiment={restoredExperiment?.type === 'probability' ? restoredExperiment : null}
            onContextChange={handleExplainerContextChange}
          />
        )}

        {/* ===================================================================
            3. PHYSICS DISCIPLINE (Independent Physics Kinematics & Rocket Launch)
            =================================================================== */}
        {activeDiscipline === 'physics' && (
          <ProjectileView
            onSaveExperiment={handleSaveExperiment}
            restoredExperiment={restoredExperiment?.type === 'projectile' ? restoredExperiment : null}
            onContextChange={handleExplainerContextChange}
          />
        )}
      </main>

      {/* Floating Science Companion in top right corner (moves when speaking) */}
      <ExplainerManager
        activeContext={activeExplainerContext}
        priorContext={priorExplainerContext}
      />
    </div>
  );
};

export default App;

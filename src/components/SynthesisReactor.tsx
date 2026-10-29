import React, { useState, useEffect } from 'react';
import {
  synthesizeCompoundFromElements,
  type SynthesisResult,
} from '../chemistry-engine/compound-builder';
import { PERIODIC_TABLE } from '../chemistry-data/elements';
import type { ChemistryExperiment } from '../core/experiment/types';
import { buildSynthesisReactorExplainerContext } from '../core/explainer/context-builders/chemistryContext';
import type { SimulationExplainerContext } from '../core/explainer/types';
import { safeRandomUUID } from '../core/crypto/uuid';

export interface ReactorElementSlot {
  symbol: string;
  ratio: number;
}

interface SynthesisReactorProps {
  onSaveCompoundExperiment?: (title: string, equation: string, formula: string) => void;
  onSaveExperiment?: (exp: ChemistryExperiment) => void;
  restoredExperiment?: ChemistryExperiment | null;
  externalActiveElements?: string[];
  onContextChange?: (context: SimulationExplainerContext) => void;
}

export const SynthesisReactor: React.FC<SynthesisReactorProps> = ({
  onSaveCompoundExperiment,
  onSaveExperiment,
  restoredExperiment,
  onContextChange,
}) => {
  // Elements placed in the reactor
  const [slots, setSlots] = useState<ReactorElementSlot[]>([
    { symbol: 'H', ratio: 2 },
    { symbol: 'O', ratio: 1 },
  ]);

  const [synthesisOutput, setSynthesisOutput] = useState<SynthesisResult>(() =>
    synthesizeCompoundFromElements([
      { symbol: 'H', ratio: 2 },
      { symbol: 'O', ratio: 1 },
    ])
  );

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    onContextChange?.(buildSynthesisReactorExplainerContext(slots, synthesisOutput, Date.now()));
  }, [slots, synthesisOutput, onContextChange]);

  // Restore experiment when restoredExperiment prop changes
  useEffect(() => {
    if (restoredExperiment && restoredExperiment.type === 'chemistry' && restoredExperiment.parameters.mode === 'synthesis') {
      const reactants = restoredExperiment.parameters.reactants || [];
      if (reactants.length > 0) {
        queueMicrotask(() => {
          const restoredSlots = reactants.map((r) => ({ symbol: r.formula, ratio: r.ratio || 1 }));
          setSlots(restoredSlots);
          setSynthesisOutput(synthesizeCompoundFromElements(restoredSlots));
        });
      }
    }
  }, [restoredExperiment]);

  // Quick preset loader
  const presets = [
    { label: 'Water (H₂O)', items: [{ symbol: 'H', ratio: 2 }, { symbol: 'O', ratio: 1 }] },
    { label: 'Table Salt (NaCl)', items: [{ symbol: 'Na', ratio: 1 }, { symbol: 'Cl', ratio: 1 }] },
    { label: 'Carbon Dioxide (CO₂)', items: [{ symbol: 'C', ratio: 1 }, { symbol: 'O', ratio: 2 }] },
    { label: 'Methane (CH₄)', items: [{ symbol: 'C', ratio: 1 }, { symbol: 'H', ratio: 4 }] },
    { label: 'Ammonia (NH₃)', items: [{ symbol: 'N', ratio: 1 }, { symbol: 'H', ratio: 3 }] },
    { label: 'Iron(II) Sulfide (FeS)', items: [{ symbol: 'Fe', ratio: 1 }, { symbol: 'S', ratio: 1 }] },
    { label: 'Rust / Iron(III) Oxide (Fe₂O₃)', items: [{ symbol: 'Fe', ratio: 2 }, { symbol: 'O', ratio: 3 }] },
    { label: 'Calcium Chloride (CaCl₂)', items: [{ symbol: 'Ca', ratio: 1 }, { symbol: 'Cl', ratio: 2 }] },
    { label: 'Alumina (Al₂O₃)', items: [{ symbol: 'Al', ratio: 2 }, { symbol: 'O', ratio: 3 }] },
  ];

  const handleApplyPreset = (items: ReactorElementSlot[]) => {
    setSlots(items);
    triggerReaction(items);
  };

  const handleAddSlot = () => {
    if (slots.length >= 4) return;
    // Find first supported element not already present
    const available = PERIODIC_TABLE.find(
      (el) => el.supportedInReactor && !slots.some((s) => s.symbol === el.symbol)
    );
    if (available) {
      const next = [...slots, { symbol: available.symbol, ratio: 1 }];
      setSlots(next);
      triggerReaction(next);
    }
  };

  const handleRemoveSlot = (index: number) => {
    if (slots.length <= 1) return;
    const next = slots.filter((_, i) => i !== index);
    setSlots(next);
    triggerReaction(next);
  };

  const handleSymbolChange = (index: number, newSymbol: string) => {
    const next = [...slots];
    next[index].symbol = newSymbol;
    setSlots(next);
    triggerReaction(next);
  };

  const handleRatioChange = (index: number, newRatio: number) => {
    const next = [...slots];
    next[index].ratio = Math.max(1, Math.min(8, newRatio));
    setSlots(next);
    triggerReaction(next);
  };

  const triggerReaction = (currentSlots: ReactorElementSlot[]) => {
    setIsSimulating(true);
    setTimeout(() => {
      const res = synthesizeCompoundFromElements(currentSlots);
      setSynthesisOutput(res);
      setIsSimulating(false);
    }, 250);
  };

  const handleSave = () => {
    if (!synthesisOutput.success || !synthesisOutput.compound) return;
    const compound = synthesisOutput.compound;
    if (onSaveExperiment) {
      const exp: ChemistryExperiment = {
        schemaVersion: 1,
        id: safeRandomUUID(),
        type: 'chemistry',
        title: `Synthesis: ${compound.formula} (${compound.commonName})`,
        description: `${compound.synthesisEquation} • ${compound.bondType} Bond`,
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        parameters: {
          mode: 'synthesis',
          reactants: (compound.constituentAtoms || []).map((a) => ({
            formula: a.symbol,
            name: a.symbol,
            ratio: a.count,
          })),
        },
        results: {
          reactionType: 'Synthesis Reaction',
          balancedEquation: compound.synthesisEquation,
          products: [compound.formula],
          isConserved: true,
          enthalpyKj: compound.energyChangeKj ?? null,
          isCurated: true,
          provenance: 'SimXSphere Synthesis Engine',
          notes: compound.description,
        },
      };
      onSaveExperiment(exp);
    }
    if (onSaveCompoundExperiment) {
      onSaveCompoundExperiment(
        `Synthesis: ${synthesisOutput.compound.formula} (${synthesisOutput.compound.commonName})`,
        synthesisOutput.compound.synthesisEquation,
        synthesisOutput.compound.formula
      );
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const compound = synthesisOutput.compound;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Top Banner & Quick Presets Strip */}
      <div className="lab-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="lab-badge" style={{ background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' }}>
                ✨ Magic Chemistry Mixer
              </span>
              <span className="lab-badge" style={{ background: '#fef08a', color: '#854d0e', border: '1.5px solid #facc15' }}>
                🌟 100% Real Science
              </span>
            </div>
            <h2 style={{ fontSize: 22, marginTop: 4, fontFamily: 'var(--font-display)' }}>⚗️ Magic Compound Synthesizer!</h2>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="lab-btn lab-btn-secondary"
              onClick={() => handleApplyPreset([{ symbol: 'H', ratio: 2 }, { symbol: 'O', ratio: 1 }])}
            >
              💧 Water (H₂O)
            </button>
            {compound && onSaveCompoundExperiment && (
              <button
                type="button"
                className="lab-btn lab-btn-primary"
                onClick={handleSave}
              >
                {saveSuccess ? '🎉 Saved to Discoveries!' : '⭐ Save Discovery'}
              </button>
            )}
          </div>
        </div>

        {/* Quick Presets Buttons */}
        <div>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#166534', fontFamily: 'var(--font-display)' }}>
            🎈 Fun Compound Recipes (Click any recipe to mix!):
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className="lab-btn lab-btn-secondary"
                style={{ fontSize: 12, padding: '5px 12px' }}
                onClick={() => handleApplyPreset(p.items)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Synthesis Workspace Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Reactor Input Chamber */}
        <div className="lab-card">
          <div className="lab-card-header">
            <h3 style={{ fontSize: 16 }}>1. Stoichiometric Reactor Chamber</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{slots.length} Elements Mixed</span>
          </div>

          <div className="lab-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Select fundamental elements from the periodic catalogue and specify their integer proportions to test bond formation and stoichiometric yields.
            </p>

            {/* Element Slots */}
            {slots.map((slot, index) => {
              const elData = PERIODIC_TABLE.find((e) => e.symbol === slot.symbol);

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1px solid var(--border-medium)',
                    background: '#ffffff',
                  }}
                >
                  {/* Elemental Symbol Badge */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 6,
                      background: elData?.color || '#cbd5e1',
                      border: '1px solid rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 16,
                      color: '#0f172a',
                    }}
                  >
                    {slot.symbol}
                  </div>

                  {/* Element Dropdown */}
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Element {index + 1}</label>
                    <select
                      className="lab-select"
                      style={{ width: '100%', padding: '6px 10px' }}
                      value={slot.symbol}
                      onChange={(e) => handleSymbolChange(index, e.target.value)}
                    >
                      {PERIODIC_TABLE.filter((e) => e.supportedInReactor).map((e) => (
                        <option key={e.symbol} value={e.symbol}>
                          {e.name} ({e.symbol}) — Z={e.atomicNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ratio Slider / Input */}
                  <div style={{ width: 110 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Ratio:</span>
                      <strong style={{ color: '#1d4ed8', fontFamily: 'var(--font-mono)' }}>{slot.ratio}</strong>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="1"
                      value={slot.ratio}
                      onChange={(e) => handleRatioChange(index, parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: '#1d4ed8' }}
                    />
                  </div>

                  {/* Remove Button */}
                  {slots.length > 2 && (
                    <button
                      type="button"
                      className="lab-btn lab-btn-danger"
                      style={{ padding: '6px 10px', fontSize: 12 }}
                      onClick={() => handleRemoveSlot(index)}
                      title="Remove from reactor"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            {slots.length < 4 && (
              <button
                type="button"
                className="lab-btn lab-btn-secondary"
                style={{ width: '100%', borderStyle: 'dashed' }}
                onClick={handleAddSlot}
              >
                + Add Another Element (Max 4)
              </button>
            )}

            <button
              type="button"
              className="lab-btn lab-btn-primary"
              style={{ padding: '10px 16px', fontSize: 14, marginTop: 4 }}
              onClick={() => triggerReaction(slots)}
              disabled={isSimulating}
            >
              {isSimulating ? '🔬 Synthesizing Compound...' : '⚡ Initiate Reaction & Synthesize'}
            </button>
          </div>
        </div>

        {/* Reaction Output & Compound Visualizer */}
        <div className="lab-card">
          <div className="lab-card-header">
            <h3 style={{ fontSize: 16 }}>2. Reaction Output & Compound Analysis</h3>
            <span
              className="lab-badge"
              style={{
                background: synthesisOutput.success ? '#ecfdf5' : '#f1f5f9',
                color: synthesisOutput.success ? '#065f46' : '#64748b',
                border: `1px solid ${synthesisOutput.success ? '#a7f3d0' : '#cbd5e1'}`,
              }}
            >
              {synthesisOutput.success ? 'Reaction Verified' : 'Unsupported Ratio/Mix'}
            </span>
          </div>

          <div className="lab-card-body">
            {synthesisOutput.success && compound ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Visual Particle / Molecular Display */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 8,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 140,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                    {compound.constituentAtoms.map((atom, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: atom.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: '#0f172a',
                            border: '2px solid rgba(0,0,0,0.15)',
                            fontSize: 14,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                          }}
                        >
                          {atom.symbol}
                        </div>
                        {atom.count > 1 && (
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#1d4ed8' }}>×{atom.count}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Simplified 2D representation • Geometry: <strong>{compound.molecularGeometry || 'Molecular unit'}</strong>
                  </div>
                </div>

                {/* Synthesis Overview */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: 28, color: '#ffffff' }} dangerouslySetInnerHTML={{ __html: compound.formulaHtml }} />
                    <span style={{ fontSize: 18, color: 'var(--text-secondary)', fontWeight: 700 }}>
                      {compound.commonName}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      (IUPAC: {compound.iupacName})
                    </span>
                  </div>

                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-secondary)', fontWeight: 700, marginTop: 4 }}>
                    {compound.synthesisEquation}
                  </div>
                </div>

                {/* Compound Properties Table */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                  <div style={{ background: 'var(--lab-surface-subtle)', padding: 10, borderRadius: 8, border: '1.5px solid var(--wood-frame)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Bond Classification</span>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>{compound.bondType} Bonding</div>
                  </div>

                  <div style={{ background: 'var(--lab-surface-subtle)', padding: 10, borderRadius: 8, border: '1.5px solid var(--wood-frame)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Standard Physical State</span>
                    <div style={{ fontWeight: 700, color: '#ffffff', textTransform: 'capitalize' }}>{compound.physicalState}</div>
                  </div>

                  <div style={{ background: 'var(--lab-surface-subtle)', padding: 10, borderRadius: 8, border: '1.5px solid var(--wood-frame)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Molar Mass</span>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{compound.molarMass} g/mol</div>
                  </div>

                  <div style={{ background: 'var(--lab-surface-subtle)', padding: 10, borderRadius: 8, border: '1.5px solid var(--wood-frame)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Standard Enthalpy (ΔH)</span>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: compound.isExothermic ? '#fde047' : '#86efac' }}>
                      {compound.energyChangeKj !== null
                        ? `${compound.energyChangeKj} kJ/mol (${compound.isExothermic ? 'Exothermic' : 'Endothermic'})`
                        : 'Unmeasured (Candidate model)'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
                  {compound.isCurated ? (
                    <span className="lab-badge" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: 11 }}>
                      ✓ Verified Curated Data ({compound.provenance || 'NIST'})
                    </span>
                  ) : (
                    <span className="lab-badge" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontSize: 11 }}>
                      Valence-Model Candidate Exercise
                    </span>
                  )}
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, background: '#f1f5f9', padding: 12, borderRadius: 6 }}>
                  {compound.description}
                </p>
              </div>
            ) : (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
                <h4 style={{ fontSize: 16, color: '#475569', marginBottom: 6 }}>Unsupported Combination</h4>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
                  {synthesisOutput.unsupportedReason}
                </p>
                <div style={{ marginTop: 16, fontSize: 12, color: '#1d4ed8' }}>
                  💡 Tip: Try clicking one of the curated presets above (e.g. Water, NaCl, or CO₂).
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

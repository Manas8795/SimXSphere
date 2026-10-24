import React, { useState } from 'react';
import {
  REAGENTS_DATABASE,
  simulateChemicalMixing,
  type ReactionOutput,
} from '../../core/simulations/chemistry';
import type { ChemistryExperiment } from '../../core/experiment/types';

interface ChemistryViewProps {
  onSaveExperiment: (exp: ChemistryExperiment) => void;
}

export const ChemistryView: React.FC<ChemistryViewProps> = ({ onSaveExperiment }) => {
  const [reagentAId, setReagentAId] = useState<string>('hcl');
  const [volumeAMl, setVolumeAMl] = useState<number>(50);
  const [concAM, setConcAM] = useState<number>(1.0);

  const [reagentBId, setReagentBId] = useState<string>('naoh');
  const [volumeBMl, setVolumeBMl] = useState<number>(50);
  const [concBM, setConcBM] = useState<number>(1.0);

  const [isReacting, setIsReacting] = useState<boolean>(false);
  const [reactionResult, setReactionResult] = useState<ReactionOutput>(() =>
    simulateChemicalMixing('hcl', 50, 1.0, 'naoh', 50, 1.0)
  );

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const reagentA = REAGENTS_DATABASE.find((r) => r.id === reagentAId) || REAGENTS_DATABASE[0];
  const reagentB = REAGENTS_DATABASE.find((r) => r.id === reagentBId) || REAGENTS_DATABASE[1];

  const handleMixReaction = () => {
    setIsReacting(true);
    setTimeout(() => {
      const res = simulateChemicalMixing(
        reagentAId,
        volumeAMl,
        concAM,
        reagentBId,
        volumeBMl,
        concBM
      );
      setReactionResult(res);
      setIsReacting(false);
    }, 450);
  };

  const handleSave = () => {
    // Generate valid ChemistryExperiment record with authentic domain schema
    const expRecord: ChemistryExperiment = {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      type: 'chemistry',
      title: `Aqueous: ${reagentA.name} + ${reagentB.name}`,
      description: `${reactionResult.reactionType}: ${reactionResult.balancedEquation}. Final pH: ${reactionResult.finalPh.toFixed(2)}`,
      createdAt: new Date().toISOString(),
      appVersion: '1.0.0',
      parameters: {
        mode: 'aqueous',
        reactants: [
          { formula: reagentA.formula, name: reagentA.name, volumeMl: volumeAMl, concentrationM: concAM },
          { formula: reagentB.formula, name: reagentB.name, volumeMl: volumeBMl, concentrationM: concBM },
        ],
        conditions: {
          temperatureC: 25,
          solvent: 'Water (aqueous)',
        },
      },
      results: {
        reactionType: reactionResult.reactionType,
        balancedEquation: reactionResult.balancedEquation,
        products: [reactionResult.precipitateFormed || '', reactionResult.gasEvolved || ''].filter(Boolean),
        isConserved: true,
        finalPh: reactionResult.finalPh,
        temperatureChangeC: reactionResult.temperatureChangeC,
        precipitate: reactionResult.precipitateFormed,
        gasEvolved: reactionResult.gasEvolved,
        enthalpyKj: null,
        isCurated: true,
        provenance: 'SimXSphere Curated Physical Chemistry Engine',
        notes: reactionResult.description,
      },
    };

    onSaveExperiment(expRecord);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const getPhColor = (ph: number) => {
    if (ph < 3) return '#ef4444'; // Strong acid (Red)
    if (ph < 6) return '#f59e0b'; // Weak acid (Orange/Yellow)
    if (ph <= 8) return '#10b981'; // Neutral (Green)
    if (ph <= 11) return '#06b6d4'; // Weak base (Cyan)
    return '#3b82f6'; // Strong base (Blue/Purple)
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Academic Banner */}
      <div className="glass-panel" style={{ padding: 24, borderLeft: '6px solid #22c55e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge badge-emerald">💧 Rainbow Color Science</span>
              <span className="badge badge-indigo">✨ Acids, Bases & Magic Indicators</span>
            </div>
            <h1 style={{ fontSize: 24, color: '#ffffff', fontFamily: 'var(--font-display)' }}>💧 Colorful Solution & Titration Lab!</h1>
            <p style={{ maxWidth: 850, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 700 }}>
              Pour liquids from Flask A and Flask B to watch magical rainbow color shifts, bubbly gas clouds, and sparkling precipitates!
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              id="mix-chemicals-btn"
              type="button"
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '15px', fontWeight: 800 }}
              disabled={isReacting}
              onClick={handleMixReaction}
            >
              {isReacting ? '✨ Mixing Rainbows...' : '⚗️ Pour & Mix Colors!'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSave}
            >
              {saveSuccess ? '🎉 Saved to Discoveries!' : '⭐ Save Discovery'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage: Reagent A + Reagent B -> Reaction Vessel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {/* Reagent A Vessel */}
        <div className="glass-panel" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16 }}>Reagent Vessel A</h3>
            <span className="badge badge-indigo">Acid / Salt</span>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 18 }}>
            {/* Visual Mini Flask */}
            <div style={{
              width: 70,
              height: 95,
              border: '3px solid var(--wood-frame)',
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              position: 'relative',
              overflow: 'hidden',
              background: 'var(--lab-surface-subtle)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            }}>
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${Math.min(100, (volumeAMl / 100) * 85)}%`,
                background: reagentA.color,
                borderTop: '1px solid rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease',
              }} />
            </div>

            <div style={{ flex: 1 }}>
              <label className="form-label">Select Chemical Reagent</label>
              <select
                id="select-reagent-a"
                className="form-select"
                value={reagentAId}
                onChange={(e) => setReagentAId(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
              >
                {REAGENTS_DATABASE.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.formula})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                pH: <strong>{reagentA.ph}</strong> | Type: {reagentA.category}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Volume: {volumeAMl} mL</label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={volumeAMl}
                onChange={(e) => setVolumeAMl(parseInt(e.target.value, 10))}
                style={{ accentColor: '#1d4ed8' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Concentration: {concAM.toFixed(2)} M</label>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={concAM}
                onChange={(e) => setConcAM(parseFloat(e.target.value))}
                style={{ accentColor: '#1d4ed8' }}
              />
            </div>
          </div>
        </div>

        {/* Reagent B Vessel */}
        <div className="glass-panel" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16 }}>Reagent Vessel B</h3>
            <span className="badge badge-emerald">Base / Salt</span>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 18 }}>
            {/* Visual Mini Flask */}
            <div style={{
              width: 70,
              height: 95,
              border: '3px solid var(--wood-frame)',
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              position: 'relative',
              overflow: 'hidden',
              background: 'var(--lab-surface-subtle)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            }}>
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${Math.min(100, (volumeBMl / 100) * 85)}%`,
                background: reagentB.color,
                borderTop: '1px solid rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease',
              }} />
            </div>

            <div style={{ flex: 1 }}>
              <label className="form-label">Select Chemical Reagent</label>
              <select
                id="select-reagent-b"
                className="form-select"
                value={reagentBId}
                onChange={(e) => setReagentBId(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
              >
                {REAGENTS_DATABASE.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.formula})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                pH: <strong>{reagentB.ph}</strong> | Type: {reagentB.category}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Volume: {volumeBMl} mL</label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={volumeBMl}
                onChange={(e) => setVolumeBMl(parseInt(e.target.value, 10))}
                style={{ accentColor: '#1d4ed8' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Concentration: {concBM.toFixed(2)} M</label>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={concBM}
                onChange={(e) => setConcBM(parseFloat(e.target.value))}
                style={{ accentColor: '#1d4ed8' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chemical Reaction Chamber / Main Beaker */}
      <div className="glass-panel" style={{ padding: 28, background: 'var(--lab-surface)', border: '4px solid var(--wood-frame)', boxShadow: '0 6px 0 var(--wood-bevel), inset 0 0 25px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
          {/* Reaction Beaker Graphic */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>
              MIXING BEAKER ({volumeAMl + volumeBMl} mL Total)
            </div>

            <div className="beaker-container">
              {/* Liquid */}
              <div
                className="beaker-liquid"
                style={{
                  height: `${Math.min(92, ((volumeAMl + volumeBMl) / 200) * 85 + 10)}%`,
                  background: reactionResult.finalColor,
                  borderTop: '2px solid rgba(255,255,255,0.3)',
                }}
              >
                {/* Precipitate layer at bottom if formed */}
                {reactionResult.precipitateFormed && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 24,
                    background: '#ffffff',
                    borderTop: '2px dashed #94a3b8',
                    opacity: 0.95,
                  }} />
                )}

                {/* Bubbles if gas is evolved */}
                {reactionResult.gasEvolved && (
                  <>
                    <div className="beaker-bubble" style={{ left: '20%', width: 8, height: 8 }} />
                    <div className="beaker-bubble" style={{ left: '50%', width: 12, height: 12, animationDelay: '0.4s' }} />
                    <div className="beaker-bubble" style={{ left: '75%', width: 9, height: 9, animationDelay: '0.8s' }} />
                  </>
                )}
              </div>
            </div>

            {/* pH Meter Badge below beaker */}
            <div style={{
              marginTop: 14,
              padding: '6px 14px',
              borderRadius: 8,
              background: getPhColor(reactionResult.finalPh),
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              border: '1.5px solid var(--wood-frame)',
            }}>
              pH {reactionResult.finalPh.toFixed(2)}
            </div>
          </div>

          {/* Reaction Chemical Details & Spectroscopy */}
          <div style={{ flex: 1, minWidth: 320 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="badge badge-indigo">{reactionResult.reactionType}</span>
              {reactionResult.temperatureChangeC > 0 && (
                <span className="badge badge-amber">ΔT = +{reactionResult.temperatureChangeC}°C (Exothermic)</span>
              )}
            </div>

            <h2 style={{ fontSize: 22, color: '#ffffff', fontWeight: 800, marginBottom: 6 }}>
              {reactionResult.balancedEquation}
            </h2>

            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {reactionResult.description}
            </p>

            {/* Observable Phenomena Alert Boxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reactionResult.precipitateFormed && (
                <div style={{ background: 'var(--lab-surface-subtle)', border: '1.5px solid var(--wood-frame)', padding: 12, borderRadius: 8, fontSize: 13 }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>🧪 Precipitate Detected: </strong>
                  <span style={{ color: '#ffffff' }}>{reactionResult.precipitateFormed}</span>
                </div>
              )}

              {reactionResult.gasEvolved && (
                <div style={{ background: 'rgba(20, 56, 40, 0.85)', border: '1.5px solid #34d399', padding: 12, borderRadius: 8, fontSize: 13 }}>
                  <strong style={{ color: '#bbf7d0' }}>💨 Gas Evolution / Effervescence: </strong>
                  <span style={{ color: '#ffffff' }}>{reactionResult.gasEvolved}</span>
                </div>
              )}

              <div style={{ background: 'var(--lab-surface-subtle)', border: '1.5px solid var(--wood-frame)', padding: 12, borderRadius: 8, fontSize: 13 }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Solvated Ionic Species: </strong>
                <code style={{ color: '#38bdf8', marginLeft: 6, fontWeight: 700 }}>
                  {reactionResult.ionicSpecies.join('  +  ')}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

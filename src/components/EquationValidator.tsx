import React, { useState } from 'react';
import { validateBalancedEquation, type EquationValidationResult } from '../chemistry-engine/atom-counter';

export const EquationValidatorView: React.FC = () => {
  const [equationInput, setEquationInput] = useState<string>('2H2 + O2 → 2H2O');
  const [validation, setValidation] = useState<EquationValidationResult>(() =>
    validateBalancedEquation('2H2 + O2 → 2H2O')
  );

  const sampleEquations = [
    { label: 'Water Synthesis', eq: '2H2 + O2 → 2H2O' },
    { label: 'Methane Combustion', eq: 'CH4 + 2O2 → CO2 + 2H2O' },
    { label: 'Slaked Lime Neutralization', eq: 'Ca(OH)2 + 2HCl → CaCl2 + 2H2O' },
    { label: 'Aluminum Sulfate Precipitate', eq: 'Al2(SO4)3 + 3BaCl2 → 3BaSO4 + 2AlCl3' },
    { label: 'Unbalanced Example', eq: 'H2 + O2 → H2O' },
    { label: 'Neutralization', eq: 'HCl + NaOH → NaCl + H2O' },
    { label: 'Ammonia Synthesis', eq: 'N2 + 3H2 → 2NH3' },
    { label: 'Iron(III) Sulfate', eq: '2Fe(OH)3 + 3H2SO4 → Fe2(SO4)3 + 6H2O' },
  ];

  const handleValidate = (text: string) => {
    setEquationInput(text);
    const res = validateBalancedEquation(text);
    setValidation(res);
  };

  const isMalformed = validation.statusText === 'Malformed Equation';
  const allElements = Array.from(
    new Set([...Object.keys(validation.reactantCounts), ...Object.keys(validation.productCounts)])
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overview Banner */}
      <div className="lab-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="lab-badge" style={{ background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' }}>
            ⚖️ Balanced Scale Lab
          </span>
          <span className="lab-badge" style={{ background: '#fef08a', color: '#854d0e', border: '1.5px solid #facc15' }}>
            ✨ No Atoms Lost!
          </span>
        </div>
        <h2 style={{ fontSize: 22, fontFamily: 'var(--font-display)' }}>⚖️ Chemical Equation Balancer!</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 700 }}>
          Make sure every single atom on the left side matches the right side! Tap a fun challenge below to test.
        </p>
      </div>

      {/* Editor & Presets */}
      <div className="lab-card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
            🎈 Click a challenge equation to test:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
            {sampleEquations.map((s) => (
              <button
                key={s.label}
                type="button"
                className="lab-btn lab-btn-secondary"
                style={{ fontSize: 12, padding: '5px 12px' }}
                onClick={() => handleValidate(s.eq)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <span>Equation Formula</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Use →, {'->'}, or = between sides</span>
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              className="lab-input"
              value={equationInput}
              onChange={(e) => handleValidate(e.target.value)}
              placeholder="e.g. Ca(OH)2 + 2HCl → CaCl2 + 2H2O"
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 15 }}
            />
            <button
              type="button"
              className="lab-btn lab-btn-primary"
              onClick={() => handleValidate(equationInput)}
            >
              <span>🔍</span> Check Balance!
            </button>
          </div>
        </div>
      </div>

      {/* Validation Status Card */}
      <div className="lab-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, color: '#ffffff' }}>Stoichiometric Audit Results</h3>
          <span
            className="lab-badge"
            style={{
              fontSize: 13,
              padding: '6px 12px',
              background: isMalformed ? 'rgba(180, 83, 9, 0.3)' : validation.isBalanced ? 'rgba(20, 56, 40, 0.9)' : 'rgba(69, 10, 10, 0.9)',
              color: isMalformed ? '#fde047' : validation.isBalanced ? '#86efac' : '#fca5a5',
              border: `1.5px solid ${isMalformed ? '#fcd34d' : validation.isBalanced ? '#34d399' : '#ef4444'}`,
            }}
          >
            {isMalformed
              ? '⚠️ Malformed Equation'
              : validation.isBalanced
              ? '✓ Equation Perfectly Balanced'
              : '✕ Atoms Not Conserved'}
          </span>
        </div>

        {isMalformed && validation.errorMessage && (
          <div
            style={{
              background: 'rgba(180, 83, 9, 0.35)',
              border: '1.5px solid #fde68a',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#fef08a',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 800 }}>Syntax Issue:</span>
            <span>{validation.errorMessage}</span>
          </div>
        )}

        {/* Atom Count Comparison Table */}
        {allElements.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--wood-frame)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 14px' }}>Element</th>
                  <th style={{ padding: '10px 14px' }}>Reactant Atom Count</th>
                  <th style={{ padding: '10px 14px' }}>Product Atom Count</th>
                  <th style={{ padding: '10px 14px' }}>Conservation Status</th>
                </tr>
              </thead>
              <tbody>
                {allElements.map((el) => {
                  const rCount = validation.reactantCounts[el] || 0;
                  const pCount = validation.productCounts[el] || 0;
                  const matches = rCount === pCount;

                  return (
                    <tr key={el} style={{ background: matches ? 'var(--lab-surface-subtle)' : 'rgba(69, 10, 10, 0.65)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{el}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{rCount}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{pCount}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {matches ? (
                          <span style={{ color: '#86efac', fontWeight: 700 }}>✓ Conserved ({rCount} = {pCount})</span>
                        ) : (
                          <span style={{ color: '#fca5a5', fontWeight: 700 }}>✕ Mismatch (Δ = {pCount - rCount})</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          !isMalformed && (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)' }}>
              Enter a chemical equation above to verify stoichiometric conservation.
            </div>
          )
        )}
      </div>
    </div>
  );
};

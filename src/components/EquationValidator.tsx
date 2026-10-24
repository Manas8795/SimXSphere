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
    { label: 'Unbalanced Example', eq: 'H2 + O2 → H2O' },
    { label: 'Neutralization', eq: 'HCl + NaOH → NaCl + H2O' },
    { label: 'Ammonia Synthesis', eq: 'N2 + 3H2 → 2NH3' },
    { label: 'Magnesium Oxidation', eq: '2Mg + O2 → 2MgO' },
  ];

  const handleValidate = (text: string) => {
    setEquationInput(text);
    const res = validateBalancedEquation(text);
    setValidation(res);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overview Banner */}
      <div className="lab-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="lab-badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
            Stoichiometric Law of Conservation of Mass
          </span>
          <span className="lab-badge" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
            Atom Conservation Inspector
          </span>
        </div>
        <h2 style={{ fontSize: 20 }}>Chemical Equation & Atom Count Validator</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Verify that every atom present on the reactant side is conserved on the product side.
        </p>
      </div>

      {/* Editor & Presets */}
      <div className="lab-card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Click sample to test:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {sampleEquations.map((s) => (
              <button
                key={s.label}
                type="button"
                className="lab-btn lab-btn-secondary"
                style={{ fontSize: 11, padding: '4px 9px' }}
                onClick={() => handleValidate(s.eq)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <span>Equation Input</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Use → or = between reactants and products</span>
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              className="lab-input"
              value={equationInput}
              onChange={(e) => handleValidate(e.target.value)}
              placeholder="e.g. 2H2 + O2 → 2H2O"
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 15 }}
            />
            <button
              type="button"
              className="lab-btn lab-btn-primary"
              onClick={() => handleValidate(equationInput)}
            >
              Verify Conservation
            </button>
          </div>
        </div>
      </div>

      {/* Validation Status Card */}
      <div className="lab-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16 }}>Stoichiometric Audit Results</h3>
          <span
            className="lab-badge"
            style={{
              fontSize: 13,
              padding: '6px 12px',
              background: validation.isBalanced ? '#ecfdf5' : '#fef2f2',
              color: validation.isBalanced ? '#065f46' : '#991b1b',
              border: `1px solid ${validation.isBalanced ? '#a7f3d0' : '#fecaca'}`,
            }}
          >
            {validation.isBalanced ? '✓ Equation Perfectly Balanced' : '✕ Atoms Not Conserved'}
          </span>
        </div>

        {/* Atom Count Comparison Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px' }}>Element</th>
                <th style={{ padding: '10px 14px' }}>Reactant Atom Count</th>
                <th style={{ padding: '10px 14px' }}>Product Atom Count</th>
                <th style={{ padding: '10px 14px' }}>Conservation Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(new Set([...Object.keys(validation.reactantCounts), ...Object.keys(validation.productCounts)])).map((el) => {
                const rCount = validation.reactantCounts[el] || 0;
                const pCount = validation.productCounts[el] || 0;
                const matches = rCount === pCount;

                return (
                  <tr key={el} style={{ background: matches ? '#ffffff' : '#fef2f2' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{el}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>{rCount}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>{pCount}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {matches ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>✓ Conserved ({rCount} = {pCount})</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>✕ Mismatch (Δ = {pCount - rCount})</span>
                      )}
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

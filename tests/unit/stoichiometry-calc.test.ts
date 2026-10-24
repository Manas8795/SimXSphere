import { describe, it, expect } from 'vitest';
import { calculateLimitingReagent } from '../../src/chemistry-engine/stoichiometry-calc';

describe('calculateLimitingReagent', () => {
  it('correctly identifies limiting reagent for 2H2 + O2 -> 2H2O', () => {
    // 2 H2 (g) + 1 O2 (g) -> 2 H2O (l)
    // 4.032 g H2 (2.0 mol H2) + 16.0 g O2 (0.5 mol O2)
    // 0.5 mol O2 requires 1.0 mol H2. So O2 is limiting!
    const reactants = [
      {
        symbol: 'H2',
        name: 'Hydrogen Gas',
        coefficient: 2,
        molarMass: 2.016,
        massGrams: 4.032,
      },
      {
        symbol: 'O2',
        name: 'Oxygen Gas',
        coefficient: 1,
        molarMass: 32.0,
        massGrams: 16.0,
      },
    ];

    const product = {
      formula: 'H2O',
      coefficient: 2,
      molarMass: 18.015,
    };

    const res = calculateLimitingReagent(reactants, product);
    expect(res).not.toBeNull();
    expect(res?.limitingReagentSymbol).toBe('O2');
    expect(res?.limitingReagentName).toBe('Oxygen Gas');
    // 0.5 mol O2 gives 1.0 mol H2O -> 18.015 g H2O
    expect(res?.theoreticalYieldMoles).toBeCloseTo(1.0, 2);
    expect(res?.theoreticalYieldGrams).toBeCloseTo(18.015, 1);
    
    // Remaining excess H2: 4.032 - (1.0 * 2.016) = 2.016 g remaining
    const h2Excess = res?.excessReagents.find(r => r.symbol === 'H2');
    expect(h2Excess?.remainingGrams).toBeCloseTo(2.016, 2);

    // Conservation of mass check
    expect(res?.conservationOfMassCheck.isConserved).toBe(true);
  });

  it('handles stoichiometric exact amounts with zero excess remaining', () => {
    // 2Na + Cl2 -> 2NaCl
    // 45.98 g Na (2 mol) + 70.90 g Cl2 (1 mol) -> 116.88 g NaCl
    const reactants = [
      { symbol: 'Na', name: 'Sodium', coefficient: 2, molarMass: 22.99, massGrams: 45.98 },
      { symbol: 'Cl2', name: 'Chlorine Gas', coefficient: 1, molarMass: 70.90, massGrams: 70.90 },
    ];
    const product = { formula: 'NaCl', coefficient: 2, molarMass: 58.44 };

    const res = calculateLimitingReagent(reactants, product);
    expect(res?.theoreticalYieldMoles).toBeCloseTo(2.0, 2);
    expect(res?.theoreticalYieldGrams).toBeCloseTo(116.88, 1);
    expect(res?.conservationOfMassCheck.isConserved).toBe(true);
  });
});

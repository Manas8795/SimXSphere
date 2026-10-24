import { describe, it, expect } from 'vitest';
import { synthesizeCompoundFromElements } from '../../src/chemistry-engine/compound-builder';
import { validateBalancedEquation } from '../../src/chemistry-engine/atom-counter';
import { getElementBySymbol, PERIODIC_TABLE } from '../../src/chemistry-data/elements';

describe('Fundamental Chemistry Simulation Tests', () => {
  it('correctly retrieves elemental data from periodic table', () => {
    const oxygen = getElementBySymbol('O');
    expect(oxygen).toBeDefined();
    expect(oxygen?.atomicNumber).toBe(8);
    expect(oxygen?.category).toBe('reactive-nonmetal');

    const iron = getElementBySymbol('Fe');
    expect(iron).toBeDefined();
    expect(iron?.atomicNumber).toBe(26);
    expect(PERIODIC_TABLE.length).toBeGreaterThan(20);
    expect(iron?.commonValences).toContain(2);
  });

  it('synthesizes Water (H2O) when mixing Hydrogen (2) and Oxygen (1)', () => {
    const res = synthesizeCompoundFromElements([
      { symbol: 'H', ratio: 2 },
      { symbol: 'O', ratio: 1 },
    ]);

    expect(res.success).toBe(true);
    expect(res.compound?.formula).toBe('H2O');
    expect(res.compound?.bondType).toBe('Covalent');
    expect(res.compound?.isExothermic).toBe(true);
  });

  it('synthesizes Table Salt (NaCl) when combining Na (1) and Cl (1)', () => {
    const res = synthesizeCompoundFromElements([
      { symbol: 'Na', ratio: 1 },
      { symbol: 'Cl', ratio: 1 },
    ]);

    expect(res.success).toBe(true);
    expect(res.compound?.formula).toBe('NaCl');
    expect(res.compound?.bondType).toBe('Ionic');
  });

  it('synthesizes Methane (CH4) when combining C (1) and H (4)', () => {
    const res = synthesizeCompoundFromElements([
      { symbol: 'C', ratio: 1 },
      { symbol: 'H', ratio: 4 },
    ]);

    expect(res.success).toBe(true);
    expect(res.compound?.formula).toBe('CH4');
    expect(res.compound?.commonName).toBe('Methane');
  });

  it('safely rejects unsupported element combinations without fabricating reactions', () => {
    const res = synthesizeCompoundFromElements([
      { symbol: 'He', ratio: 1 },
      { symbol: 'Ne', ratio: 1 },
    ]);

    expect(res.success).toBe(false);
    expect(res.unsupportedReason).toContain('Unsupported chemical combination');
  });

  it('verifies that balanced chemical equations conserve mass and atom count', () => {
    const balancedRes = validateBalancedEquation('2H2 + O2 → 2H2O');
    expect(balancedRes.isBalanced).toBe(true);
    expect(balancedRes.statusText).toBe('Balanced');
    expect(balancedRes.reactantCounts['H']).toBe(4);
    expect(balancedRes.productCounts['H']).toBe(4);
    expect(balancedRes.reactantCounts['O']).toBe(2);
    expect(balancedRes.productCounts['O']).toBe(2);

    const unbalancedRes = validateBalancedEquation('H2 + O2 → H2O');
    expect(unbalancedRes.isBalanced).toBe(false);
    expect(unbalancedRes.statusText).toBe('Not balanced');
  });

  it('correctly provides quantum electron shells for 3D atomic diagrams', async () => {
    const { getElementShells } = await import('../../src/chemistry-data/elements');
    expect(getElementShells(1)).toEqual([1]); // Hydrogen
    expect(getElementShells(6)).toEqual([2, 4]); // Carbon
    expect(getElementShells(11)).toEqual([2, 8, 1]); // Sodium
    expect(getElementShells(26)).toEqual([2, 8, 14, 2]); // Iron
    expect(getElementShells(79)).toEqual([2, 8, 18, 32, 18, 1]); // Gold
  });

  it('synthesizes compounds algorithmically across the 118 elements matrix', () => {
    // Titanium(IV) Chloride
    const tiCl = synthesizeCompoundFromElements([
      { symbol: 'Ti', ratio: 1 },
      { symbol: 'Cl', ratio: 4 },
    ]);
    expect(tiCl.success).toBe(true);
    expect(tiCl.compound?.formula).toBe('TiCl4');
    expect(tiCl.compound?.commonName).toContain('chloride');
    expect(tiCl.compound?.isCurated).toBe(false);
    expect(tiCl.compound?.energyChangeKj).toBeNull();
    expect(tiCl.compound?.description).toContain('Candidate-formula valence exercise');

    // Calcium Nitride Ca3N2
    const caN = synthesizeCompoundFromElements([
      { symbol: 'Ca', ratio: 3 },
      { symbol: 'N', ratio: 2 },
    ]);
    expect(caN.success).toBe(true);
    expect(caN.compound?.formula).toBe('Ca3N2');

    // Potassium Bromide KBr
    const kBr = synthesizeCompoundFromElements([
      { symbol: 'K', ratio: 1 },
      { symbol: 'Br', ratio: 1 },
    ]);
    expect(kBr.success).toBe(true);
    expect(kBr.compound?.formula).toBe('KBr');
    expect(kBr.compound?.bondType).toBe('Ionic');

    // Zinc Sulfide ZnS
    const znS = synthesizeCompoundFromElements([
      { symbol: 'Zn', ratio: 1 },
      { symbol: 'S', ratio: 1 },
    ]);
    expect(znS.success).toBe(true);
    expect(znS.compound?.formula).toBe('ZnS');

    // Intermetallic alloy rejection
    const alloy = synthesizeCompoundFromElements([
      { symbol: 'Na', ratio: 1 },
      { symbol: 'K', ratio: 1 },
    ]);
    expect(alloy.success).toBe(false);
    expect(alloy.unsupportedReason).toContain('Metallic combination');

    // Non-stoichiometric ratio returns valid suggestion
    const invalidRatio = synthesizeCompoundFromElements([
      { symbol: 'Ca', ratio: 1 },
      { symbol: 'N', ratio: 1 },
    ]);
    expect(invalidRatio.success).toBe(false);
    expect(invalidRatio.unsupportedReason).toContain('Ca3N2');
  });

  it('correctly distinguishes Iron(II) Sulfide (FeS) from Iron(III) Oxide (Fe2O3 / Rust)', () => {
    // Fe + S (1:1) -> FeS (Iron Sulfide)
    const feS = synthesizeCompoundFromElements([
      { symbol: 'Fe', ratio: 1 },
      { symbol: 'S', ratio: 1 },
    ]);
    expect(feS.success).toBe(true);
    expect(feS.compound?.formula).toBe('FeS');
    expect(feS.compound?.commonName).toBe('Iron Sulfide');
    expect(feS.compound?.isCurated).toBe(true);
    expect(feS.compound?.energyChangeKj).toBe(-100.0);

    // Fe + O (2:3) -> Fe2O3 (Rust / Iron(III) Oxide)
    const fe2O3 = synthesizeCompoundFromElements([
      { symbol: 'Fe', ratio: 2 },
      { symbol: 'O', ratio: 3 },
    ]);
    expect(fe2O3.success).toBe(true);
    expect(fe2O3.compound?.formula).toBe('Fe2O3');
    expect(fe2O3.compound?.commonName).toContain('Rust');
    expect(fe2O3.compound?.isCurated).toBe(true);
    expect(fe2O3.compound?.energyChangeKj).toBe(-824.2);
  });
});

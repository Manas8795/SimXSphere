import { describe, it, expect } from 'vitest';
import { simulateChemicalMixing } from '../../src/core/simulations/chemistry';

describe('Chemical Reaction Simulation Engine Tests', () => {
  it('neutralizes HCl + NaOH producing NaCl and exothermic heat release', () => {
    const res = simulateChemicalMixing('hcl', 50, 1.0, 'naoh', 50, 1.0);
    expect(res.reactionType).toBe('Acid-Base Neutralization');
    expect(res.semantic).toBe('engine_calculated');
    expect(res.finalPh).toBe(7.0);
    expect(res.enthalpyKj).toBe(-57.1);
    expect(res.temperatureChangeC).toBeGreaterThan(0);
    expect(res.precipitateFormed).toBeNull();
    expect(res.assumptions.length).toBeGreaterThan(0);
  });

  it('forms AgCl white precipitate when mixing HCl + AgNO3', () => {
    const res = simulateChemicalMixing('hcl', 50, 1.0, 'agno3', 50, 0.5);
    expect(res.reactionType).toBe('Precipitation');
    expect(res.semantic).toBe('engine_calculated');
    expect(res.enthalpyKj).toBe(-65.5);
    expect(res.precipitateFormed).toContain('AgCl');
  });

  it('evolves CO2 gas when mixing acid HCl with Sodium Carbonate Na2CO3', () => {
    const res = simulateChemicalMixing('hcl', 50, 1.0, 'na2co3', 50, 0.5);
    expect(res.reactionType).toBe('Gas Evolution / Effervescence');
    expect(res.semantic).toBe('engine_calculated');
    expect(res.gasEvolved).toContain('CO2');
  });

  it('forms deep royal blue tetraamminecopper(II) complex when mixing CuSO4 + NH3', () => {
    const res = simulateChemicalMixing('cuso4', 40, 0.5, 'nh3', 40, 1.0);
    expect(res.reactionType).toBe('Complexation');
    expect(res.semantic).toBe('engine_calculated');
    expect(res.finalColor).toBe('#1e3a8a');
  });

  it('does NOT average pH or fabricate temperature for uncharacterized mixtures', () => {
    // AgNO3 + Na2CO3: unreviewed pair in standard aqueous mixing
    const res = simulateChemicalMixing('agno3', 50, 0.5, 'nh3', 50, 1.0);
    expect(res.reactionType).toBe('No Reaction (Dilution)');
    expect(res.semantic).toBe('educational_approximation');
    expect(res.finalPh).toBeNull();
    expect(res.temperatureChangeC).toBeNull();
    expect(res.enthalpyKj).toBeNull();
    expect(res.limitations.length).toBeGreaterThan(0);
  });
});

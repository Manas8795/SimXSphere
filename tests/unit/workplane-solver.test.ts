import { describe, it, expect } from 'vitest';
import { solveWorkplaneReaction, type DroppedReagentItem } from '../../src/chemistry-engine/workplane-solver';
import { LAB_CHEMICALS } from '../../src/chemistry-data/reagents';

function createDroppedItem(id: string, overrides: Partial<DroppedReagentItem> = {}): DroppedReagentItem {
  const chem = LAB_CHEMICALS.find((c) => c.id === id);
  if (!chem) throw new Error(`Chemical not found: ${id}`);
  return {
    instanceId: `inst-${id}`,
    chemical: chem,
    quantityCount: 1,
    volumeMl: 50,
    molarityM: chem.defaultMolarity || 1.0,
    massGrams: chem.defaultGrams || 5.0,
    ...overrides,
  };
}

describe('Workplane Reaction Solver Unit Tests', () => {
  it('returns empty idle state when beaker has zero reagents', () => {
    const outcome = solveWorkplaneReaction([]);
    expect(outcome.status).toBe('idle');
    expect(outcome.hasReacted).toBe(false);
    expect(outcome.finalColor).toBe('transparent');
    expect(outcome.finalPh).toBe(7.0);
  });

  it('handles single reagent in vessel without false reaction', () => {
    const hcl = createDroppedItem('hcl', { volumeMl: 60, molarityM: 1.0 });
    const outcome = solveWorkplaneReaction([hcl]);
    expect(outcome.status).toBe('single');
    expect(outcome.hasReacted).toBe(false);
    expect(outcome.finalPh).toBe(1.0);
    expect(outcome.bubbling.active).toBe(false);
  });

  it('simulates Golden Rain precipitation between Pb(NO3)2 and KI', () => {
    const lead = createDroppedItem('pbno32');
    const ki = createDroppedItem('ki');
    const outcome = solveWorkplaneReaction([lead, ki]);

    expect(outcome.hasReacted).toBe(true);
    expect(outcome.reactionType).toBe('Precipitation');
    expect(outcome.precipitate.formed).toBe(true);
    expect(outcome.precipitate.formula).toBe('PbI₂');
    expect(outcome.finalColor).toBe('#facc15'); // Yellow
    expect(outcome.equation).toContain('PbI₂');
  });

  it('simulates Silver Chloride curdy white precipitation', () => {
    const agno3 = createDroppedItem('agno3');
    const hcl = createDroppedItem('hcl');
    const outcome = solveWorkplaneReaction([agno3, hcl]);

    expect(outcome.hasReacted).toBe(true);
    expect(outcome.reactionType).toBe('Precipitation');
    expect(outcome.precipitate.formed).toBe(true);
    expect(outcome.precipitate.formula).toBe('AgCl');
  });

  it('simulates vigorous effervescence of CO2 from carbonate + acid', () => {
    const na2co3 = createDroppedItem('na2co3');
    const hcl = createDroppedItem('hcl');
    const outcome = solveWorkplaneReaction([na2co3, hcl]);

    expect(outcome.hasReacted).toBe(true);
    expect(outcome.reactionType).toBe('Effervescence (Gas)');
    expect(outcome.bubbling.active).toBe(true);
    expect(outcome.bubbling.gasFormula).toBe('CO₂');
    expect(outcome.bubbling.intensity).toBeGreaterThan(80);
  });

  it('simulates single displacement hydrogen gas evolution for Zn + HCl', () => {
    const zn = createDroppedItem('zn');
    const hcl = createDroppedItem('hcl');
    const outcome = solveWorkplaneReaction([zn, hcl]);

    expect(outcome.hasReacted).toBe(true);
    expect(outcome.bubbling.active).toBe(true);
    expect(outcome.bubbling.gasFormula).toBe('H₂');
    expect(outcome.deltaTC).toBeGreaterThan(0);
  });

  it('simulates deep azure blue tetraamminecopper(II) complexation', () => {
    const cuso4 = createDroppedItem('cuso4');
    const nh3 = createDroppedItem('nh3');
    const outcome = solveWorkplaneReaction([cuso4, nh3]);

    expect(outcome.hasReacted).toBe(true);
    expect(outcome.reactionType).toBe('Complexation');
    expect(outcome.finalColor).toBe('#1e3a8a');
    expect(outcome.equation).toContain('[Cu(NH₃)₄]');
  });

  it('simulates acid-base neutralization with phenolphthalein indicator', () => {
    // Equal 50mL @ 1M HCl + 50mL @ 1M NaOH = neutral
    const hcl = createDroppedItem('hcl', { volumeMl: 50, molarityM: 1.0 });
    const naoh = createDroppedItem('naoh', { volumeMl: 50, molarityM: 1.0 });
    const phenol = createDroppedItem('phenolphthalein');

    const outcome = solveWorkplaneReaction([hcl, naoh, phenol]);
    expect(outcome.hasReacted).toBe(true);
    expect(outcome.reactionType).toBe('Neutralization');
    expect(outcome.finalPh).toBe(7.0);
    // At pH 7.0 (< 8.2), phenolphthalein is clear colorless
    expect(outcome.finalColor).toBe('#f8fafc');

    // Excess base: 100mL @ 1M NaOH + 50mL @ 1M HCl = basic pH > 12 -> turns vibrant pink!
    const excessNaoh = createDroppedItem('naoh', { volumeMl: 100, molarityM: 1.0 });
    const basicOutcome = solveWorkplaneReaction([hcl, excessNaoh, phenol]);
    expect(basicOutcome.finalPh).toBeGreaterThan(8.2);
    expect(basicOutcome.finalColor).toBe('#ec4899'); // Bright magenta pink!
  });
});

import { describe, it, expect } from 'vitest';
import { generateAutoNarration } from '../../src/core/explainer/autoNarrator';
import { buildProjectileExplainerContext } from '../../src/core/explainer/context-builders/projectileContext';
import { buildProbabilityExplainerContext } from '../../src/core/explainer/context-builders/probabilityContext';
import { buildChemistryExplainerContext } from '../../src/core/explainer/context-builders/chemistryContext';

describe('Autonomous 2-Line Voice Narrator Tests', () => {
  it('generates 2-line optimal range narration for 45° projectile launch', () => {
    const ctx = buildProjectileExplainerContext(
      { initialSpeed: 20, angleDeg: 45, gravity: 9.81 },
      { range: 40.77, flightTime: 2.88, maxHeight: 10.19, trajectory: [] },
      1
    );

    const narration = generateAutoNarration(ctx);

    expect(narration.headline).toContain('45°');
    expect(narration.line1).toContain('maximum possible range');
    expect(narration.line1).toContain('40.8 meters');
    expect(narration.line2).toContain('airborne for 2.9 seconds');
    expect(narration.spokenText.length).toBeGreaterThan(20);
  });

  it('generates 2-line vertical launch narration for 90° projectile launch', () => {
    const ctx = buildProjectileExplainerContext(
      { initialSpeed: 20, angleDeg: 90, gravity: 9.81 },
      { range: 0, flightTime: 4.08, maxHeight: 20.39, trajectory: [] },
      2
    );

    const narration = generateAutoNarration(ctx);

    expect(narration.headline).toContain('Vertical');
    expect(narration.line1).toContain('highest possible apex');
    expect(narration.line2).toContain('0 meters horizontal flight');
  });

  it('generates 2-line complementary angle info for standard angles', () => {
    const ctx = buildProjectileExplainerContext(
      { initialSpeed: 20, angleDeg: 30, gravity: 9.81 },
      { range: 35.31, flightTime: 2.04, maxHeight: 5.1, trajectory: [] },
      3
    );

    const narration = generateAutoNarration(ctx);

    expect(narration.headline).toContain('30°');
    expect(narration.line2).toContain('complementary angle 60°');
  });

  it('generates 2-line probability narration contrasting observed vs theoretical', () => {
    const ctx = buildProbabilityExplainerContext(
      { kind: 'coin', sides: 2, trials: 1000, seed: 123 },
      { counts: [512, 488], total: 1000 },
      4
    );

    const narration = generateAutoNarration(ctx);

    expect(narration.headline).toContain('Coin Toss');
    expect(narration.line1).toContain('1,000 coin flips');
    expect(narration.line1).toContain('Heads landed 512 times');
    expect(narration.line2).toContain('Law of Large Numbers');
  });

  it('generates 2-line chemistry narration with pH and reaction classification', () => {
    const ctx = buildChemistryExplainerContext(
      {
        mode: 'aqueous',
        reactants: [
          { name: 'Hydrochloric Acid', formula: 'HCl', volumeMl: 50, concentrationM: 1 },
          { name: 'Sodium Hydroxide', formula: 'NaOH', volumeMl: 50, concentrationM: 1 },
        ],
      },
      {
        reactionType: 'Acid-Base Neutralization',
        balancedEquation: 'HCl + NaOH -> NaCl + H2O',
        products: ['NaCl', 'H2O'],
        isConserved: true,
        finalPh: 7.0,
        temperatureChangeC: 6.5,
        isCurated: true,
        provenance: 'NIST',
      },
      5
    );

    const narration = generateAutoNarration(ctx);

    expect(narration.headline).toBe('Acid-Base Neutralization');
    expect(narration.line1).toContain('HCl + NaOH -> NaCl + H2O');
    expect(narration.line2).toContain('exothermic process');
    expect(narration.line2).toContain('pH of 7.0');
  });
});

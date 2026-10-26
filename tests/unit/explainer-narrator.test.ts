import { describe, it, expect } from 'vitest';
import { generateAutoNarration } from '../../src/core/explainer/autoNarrator';
import { buildProjectileExplainerContext } from '../../src/core/explainer/context-builders/projectileContext';
import { buildProbabilityExplainerContext } from '../../src/core/explainer/context-builders/probabilityContext';
import {
  buildChemistryExplainerContext,
  buildWorkplaneExplainerContext,
  buildPeriodicTableExplainerContext,
  buildSynthesisReactorExplainerContext,
  buildEquationValidatorExplainerContext,
  buildChemistryDiscoveriesExplainerContext,
} from '../../src/core/explainer/context-builders/chemistryContext';
import { synthesizeCompoundFromElements } from '../../src/chemistry-engine/compound-builder';
import { validateBalancedEquation } from '../../src/chemistry-engine/atom-counter';

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

  it('generates 2-line chemistry workplane (Mix & React) narration across states', () => {

    // 1. Initial blank workplane
    const blankCtx = buildWorkplaneExplainerContext({
      hasBeaker: false,
      beakerElements: [],
      workplaneElementsCount: 0,
      synthesisResult: null,
    });
    const blankNarration = generateAutoNarration(blankCtx);
    expect(blankNarration.headline).toBe('Mix & React Lab');
    expect(blankNarration.line1).toContain('Drag a beaker');
    expect(blankNarration.spokenText).toContain('observe atomic bonding');

    // 2. Beaker with elements ready to react
    const readyCtx = buildWorkplaneExplainerContext({
      hasBeaker: true,
      beakerElements: [
        { symbol: 'H', name: 'Hydrogen', count: 2 },
        { symbol: 'O', name: 'Oxygen', count: 1 },
      ],
      workplaneElementsCount: 0,
      synthesisResult: null,
    });
    const readyNarration = generateAutoNarration(readyCtx);
    expect(readyNarration.headline).toContain('Hydrogen');
    expect(readyNarration.line1).toContain('Beaker currently holds 3 atom(s)');
    expect(readyNarration.line2).toContain('React & Combine');

    // 3. Synthesized compound
    const synthCtx = buildWorkplaneExplainerContext({
      hasBeaker: true,
      beakerElements: [
        { symbol: 'H', name: 'Hydrogen', count: 2 },
        { symbol: 'O', name: 'Oxygen', count: 1 },
      ],
      workplaneElementsCount: 0,
      synthesisResult: {
        success: true,
        compound: {
          formula: 'H2O',
          commonName: 'Water',
          synthesisEquation: '2H2 + O2 → 2H2O',
          bondType: 'Covalent',
          energyChangeKj: -285.8,
        },
      },
    });
    const synthNarration = generateAutoNarration(synthCtx);
    expect(synthNarration.headline).toContain('Water');
    expect(synthNarration.line1).toContain('2H2 + O2 → 2H2O');
    expect(synthNarration.line2).toContain('Covalent bonds');

    // 4. Periodic Table Element block narration
    const ptCtx = buildPeriodicTableExplainerContext({
      name: 'Carbon',
      symbol: 'C',
      atomicNumber: 6,
      category: 'reactive-nonmetal',
      atomicMass: 12.011,
      period: 2,
      group: 14,
      commonValences: [-4, 2, 4],
      electronConfiguration: '[He] 2s² 2p²',
      standardState: 'solid',
      color: '#334155',
      electronegativity: 2.55,
      supportedInReactor: true,
      description: 'The chemical basis of all known organic life.',
    });
    const ptNarration = generateAutoNarration(ptCtx);
    expect(ptNarration.headline).toBe('Carbon (C)');
    expect(ptNarration.line1).toContain('Carbon (C, Atomic #6)');
    expect(ptNarration.line2).toContain('[He] 2s² 2p²');

    // 5. Synthesis Reactor narration
    const saltResult = synthesizeCompoundFromElements([{ symbol: 'Na', ratio: 1 }, { symbol: 'Cl', ratio: 1 }]);
    const reactorCtx = buildSynthesisReactorExplainerContext(
      [{ symbol: 'Na', ratio: 1 }, { symbol: 'Cl', ratio: 1 }],
      saltResult
    );
    const reactorNarration = generateAutoNarration(reactorCtx);
    expect(reactorNarration.headline).toContain('Table Salt');
    expect(reactorNarration.line1).toContain('2NaCl');
    expect(reactorNarration.line2).toContain('Ionic bonds');

    // 6. Equation Balancer narration
    const valResult = validateBalancedEquation('2H2 + O2 → 2H2O');
    const valCtx = buildEquationValidatorExplainerContext('2H2 + O2 → 2H2O', valResult);
    const valNarration = generateAutoNarration(valCtx);
    expect(valNarration.headline).toContain('Balanced');
    expect(valNarration.line1).toContain('exact parity');
    expect(valNarration.line2).toContain('Law of Conservation of Mass');

    // 7. Discoveries narration
    const runsCtx = buildChemistryDiscoveriesExplainerContext(3);
    const runsNarration = generateAutoNarration(runsCtx);
    expect(runsNarration.headline).toContain('Science Discoveries (3)');
    expect(runsNarration.line1).toContain('3 verified laboratory experiment(s)');
  });
});

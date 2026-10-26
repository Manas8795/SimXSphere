import type { ChemistryParameters, ChemistryResults } from '../../experiment/types';
import { EXPLAINER_SCHEMA_VERSION, type SimulationExplainerContext } from '../types';
import type { ChemicalElement } from '../../../chemistry-data/elements';
import type { SynthesisResult } from '../../../chemistry-engine/compound-builder';
import type { EquationValidationResult } from '../../../chemistry-engine/atom-counter';

export function buildChemistryExplainerContext(
  params: ChemistryParameters,
  results: ChemistryResults,
  revision: number = 1
): SimulationExplainerContext {
  const { mode, reactants } = params;
  const {
    reactionType,
    balancedEquation,
    products,
    finalPh,
    temperatureChangeC,
    precipitate,
    gasEvolved,
    enthalpyKj,
    isConserved,
    isCurated,
  } = results;

  const reactantSummary = reactants.map((r) => ({
    name: r.name,
    formula: r.formula,
    volumeMl: r.volumeMl,
    concentrationM: r.concentrationM,
    massGrams: r.massGrams,
  }));

  const knownFacts: string[] = [
    `Reaction classification: ${reactionType}.`,
    `Stoichiometrically balanced equation: ${balancedEquation}.`,
    `Chemical mass and atoms are conserved across the reaction: ${isConserved ? 'Yes' : 'No'}.`,
  ];

  if (finalPh !== undefined && finalPh !== null) {
    const phNature = finalPh < 7 ? 'acidic' : finalPh > 7 ? 'basic' : 'neutral';
    knownFacts.push(`Final solution pH is ${finalPh.toFixed(2)} (${phNature} nature).`);
  }

  if (temperatureChangeC !== undefined && temperatureChangeC !== null) {
    const thermic = temperatureChangeC > 0 ? 'exothermic (releases heat)' : temperatureChangeC < 0 ? 'endothermic (absorbs heat)' : 'isothermal';
    knownFacts.push(`Observed temperature shift: ${temperatureChangeC > 0 ? '+' : ''}${temperatureChangeC.toFixed(1)}°C (${thermic}).`);
  }

  if (precipitate) {
    knownFacts.push(`Solid precipitate formed: ${precipitate}.`);
  }

  if (gasEvolved) {
    knownFacts.push(`Gas evolution detected: ${gasEvolved}.`);
  }

  if (enthalpyKj !== undefined && enthalpyKj !== null) {
    knownFacts.push(`Calculated enthalpy change (ΔH): ${enthalpyKj} kJ/mol.`);
  }

  return {
    schemaVersion: EXPLAINER_SCHEMA_VERSION,
    simulationId: `chemistry-${mode}`,
    simulationTitle: `Chemistry Simulation: ${reactionType}`,
    domain: 'chemistry',
    stateRevision: revision,
    timestamp: new Date().toISOString(),
    inputs: {
      reactionMode: mode,
      reactants: reactantSummary,
    },
    outputs: {
      reactionType,
      balancedEquation,
      products,
      finalPh: finalPh !== undefined && finalPh !== null ? Number(finalPh.toFixed(2)) : undefined,
      temperatureChangeC: temperatureChangeC !== undefined && temperatureChangeC !== null ? Number(temperatureChangeC.toFixed(1)) : undefined,
      precipitate: precipitate || undefined,
      gasEvolved: gasEvolved || undefined,
      enthalpyKj: enthalpyKj || undefined,
      isMassConserved: isConserved,
      isCuratedReaction: isCurated,
    },
    units: {
      volumeMl: 'mL',
      concentrationM: 'mol/L',
      massGrams: 'g',
      finalPh: 'pH scale (0-14)',
      temperatureChangeC: '°C',
      enthalpyKj: 'kJ/mol',
    },
    assumptions: [
      'Standard ambient temperature and pressure (25°C, 1 atm) unless specifically configured.',
      'Aqueous reactions assume fully dissolved and dissociated electrolytes at low to moderate concentrations.',
      'Zero heat loss to the surrounding environment during thermal measurement (calorimeter assumption).',
      'Side reactions, impurities, and container catalytic interference are assumed negligible.',
    ],
    knownFacts,
    unavailableFacts: [
      'Quantum electron orbital wavefunctions, sub-microsecond transition states, and micro-scale agitation turbulence are not computed by this macroscopic simulation engine.',
    ],
    supportedIntents: [
      'explain_current_state',
      'why_did_this_happen',
      'explain_equations',
      'explain_changes',
      'what_if',
      'ask_question',
    ],
  };
}

export interface WorkplaneExplainerData {
  hasBeaker: boolean;
  beakerElements: Array<{ symbol: string; name: string; count: number }>;
  workplaneElementsCount: number;
  synthesisResult: {
    success: boolean;
    compound?: {
      formula: string;
      commonName: string;
      synthesisEquation: string;
      bondType: string;
      energyChangeKj: number | null;
      description?: string;
    };
    message?: string;
  } | null;
}

export function buildWorkplaneExplainerContext(
  data: WorkplaneExplainerData,
  revision: number = 1
): SimulationExplainerContext {
  const { hasBeaker, beakerElements, workplaneElementsCount, synthesisResult } = data;

  const totalBeakerAtoms = beakerElements.reduce((acc, el) => acc + el.count, 0);
  const elementsSummary = beakerElements
    .map((el) => `${el.count}x ${el.name} (${el.symbol})`)
    .join(', ');

  const isSynthesized = !!(synthesisResult && synthesisResult.success && synthesisResult.compound);
  const compound = synthesisResult?.compound;

  const knownFacts: string[] = [
    'Matter is neither created nor destroyed in chemical reactions (Law of Conservation of Mass).',
    'Atoms combine in whole-number ratios to satisfy stable electron valence configurations (Octet Rule).',
  ];

  if (isSynthesized && compound) {
    knownFacts.push(`Successfully synthesized compound: ${compound.commonName} (${compound.formula}).`);
    knownFacts.push(`Synthesis reaction equation: ${compound.synthesisEquation}.`);
    knownFacts.push(`Chemical bond character: ${compound.bondType} bonding.`);
    if (compound.energyChangeKj !== null) {
      knownFacts.push(`Reaction energy change (ΔH): ${compound.energyChangeKj} kJ/mol.`);
    }
  } else if (synthesisResult && !synthesisResult.success) {
    knownFacts.push(`The combination of ${elementsSummary || 'selected elements'} did not form a stable chemical compound.`);
  } else if (totalBeakerAtoms > 0) {
    knownFacts.push(`Beaker currently contains ${totalBeakerAtoms} atom(s): ${elementsSummary}.`);
  }

  return {
    schemaVersion: EXPLAINER_SCHEMA_VERSION,
    simulationId: 'chemistry-workplane',
    simulationTitle: isSynthesized && compound ? `Mix & React: ${compound.commonName}` : 'Mix & React Lab',
    domain: 'chemistry',
    stateRevision: revision,
    timestamp: new Date().toISOString(),
    inputs: {
      hasBeaker,
      totalBeakerAtoms,
      workplaneElementsCount,
      beakerElements: beakerElements.map((el) => ({ symbol: el.symbol, name: el.name, count: el.count })),
    },
    outputs: {
      status: isSynthesized
        ? 'synthesized'
        : synthesisResult && !synthesisResult.success
        ? 'incompatible'
        : totalBeakerAtoms > 0
        ? 'ready_to_react'
        : hasBeaker
        ? 'beaker_empty'
        : 'workspace_empty',
      isSynthesized,
      formula: compound?.formula,
      compoundName: compound?.commonName,
      synthesisEquation: compound?.synthesisEquation,
      bondType: compound?.bondType,
      energyChangeKj: compound?.energyChangeKj ?? undefined,
      elementsSummary: elementsSummary || undefined,
    },
    assumptions: [
      'Pure elemental reactants with zero contaminating impurities.',
      'Reaction proceeds to completion under standard classroom laboratory conditions.',
      'Valence electrons conform to idealized Lewis-octet and covalent/ionic bonding mechanics.',
    ],
    knownFacts,
    unavailableFacts: [
      'Sub-picosecond transition kinetics and solvent friction are abstracted by the discrete synthesis engine.',
    ],
    supportedIntents: [
      'explain_current_state',
      'why_did_this_happen',
      'explain_equations',
      'explain_changes',
      'what_if',
      'ask_question',
    ],
  };
}

export function buildPeriodicTableExplainerContext(
  element: ChemicalElement | null,
  revision: number = 1
): SimulationExplainerContext {
  const knownFacts: string[] = [
    'The Periodic Table organizes all 118 chemical elements in order of increasing atomic number (nuclear proton count).',
    'Elements in the same column (group) share identical valence electron counts and exhibit similar chemical reactivity.',
  ];

  if (element) {
    knownFacts.push(`Element: ${element.name} (${element.symbol}), Atomic Number: ${element.atomicNumber}.`);
    knownFacts.push(`Standard Atomic Mass: ${element.atomicMass.toFixed(2)} u.`);
    knownFacts.push(`Chemical Classification: ${element.category.replace(/-/g, ' ')}.`);
    knownFacts.push(`Standard Phase of Matter at STP: ${element.standardState}.`);
    if (element.commonValences && element.commonValences.length > 0) {
      knownFacts.push(`Common Valence States: ${element.commonValences.join(', ')}.`);
    }
    if (element.electronConfiguration) {
      knownFacts.push(`Electron Configuration: ${element.electronConfiguration}.`);
    }
  }

  return {
    schemaVersion: EXPLAINER_SCHEMA_VERSION,
    simulationId: 'chemistry-table',
    simulationTitle: element ? `Element: ${element.name} (${element.symbol})` : 'Periodic Table of Elements',
    domain: 'chemistry',
    stateRevision: revision,
    timestamp: new Date().toISOString(),
    inputs: {
      selectedElement: element
        ? {
            name: element.name,
            symbol: element.symbol,
            atomicNumber: element.atomicNumber,
            category: element.category,
            atomicMass: element.atomicMass,
            commonValences: element.commonValences,
            electronConfiguration: element.electronConfiguration,
            standardState: element.standardState,
          }
        : null,
    },
    outputs: {
      elementName: element?.name,
      symbol: element?.symbol,
      atomicNumber: element?.atomicNumber,
      category: element?.category,
      atomicMass: element?.atomicMass,
      commonValences: element?.commonValences,
      electronConfiguration: element?.electronConfiguration,
    },
    assumptions: [
      'Standard ambient temperature and pressure (25°C, 1 atm) for physical state designation.',
      'Ground-state electron configurations according to Aufbau principle and Hund\'s rule.',
    ],
    knownFacts,
    unavailableFacts: [
      'Relativistic quantum orbital contractions for transactinide elements are simplified.',
    ],
    supportedIntents: [
      'explain_current_state',
      'why_did_this_happen',
      'explain_equations',
      'ask_question',
    ],
  };
}

export function buildSynthesisReactorExplainerContext(
  slots: Array<{ symbol: string; ratio: number }>,
  synthesisResult: SynthesisResult,
  revision: number = 1
): SimulationExplainerContext {
  const isSynthesized = !!(synthesisResult && synthesisResult.success && synthesisResult.compound);
  const compound = synthesisResult?.compound;
  const slotsSummary = slots.map((s) => `${s.ratio}x ${s.symbol}`).join(' + ');

  const knownFacts: string[] = [
    'Stoichiometric elemental synthesis requires specific whole-number atom ratios to complete outer electron shells.',
    'Total mass and atomic quantities are conserved throughout chemical synthesis reactions.',
  ];

  if (isSynthesized && compound) {
    knownFacts.push(`Synthesized compound: ${compound.commonName} (${compound.formula}).`);
    knownFacts.push(`Balanced reaction equation: ${compound.synthesisEquation}.`);
    knownFacts.push(`Chemical bonding character: ${compound.bondType} bonding.`);
    if (compound.energyChangeKj !== null) {
      knownFacts.push(`Calculated enthalpy change: ${compound.energyChangeKj} kJ/mol.`);
    }
  } else if (!synthesisResult.success) {
    knownFacts.push(`The combination ${slotsSummary} does not satisfy stable electron configurations.`);
  }

  return {
    schemaVersion: EXPLAINER_SCHEMA_VERSION,
    simulationId: 'chemistry-reactor',
    simulationTitle: isSynthesized && compound ? `Magic Reactor: ${compound.commonName}` : 'Magic Synthesis Reactor',
    domain: 'chemistry',
    stateRevision: revision,
    timestamp: new Date().toISOString(),
    inputs: {
      slots,
      slotsSummary,
    },
    outputs: {
      status: isSynthesized ? 'synthesized' : 'incompatible',
      isSynthesized,
      formula: compound?.formula,
      compoundName: compound?.commonName,
      synthesisEquation: compound?.synthesisEquation,
      bondType: compound?.bondType,
      energyChangeKj: compound?.energyChangeKj ?? undefined,
      slotsSummary,
    },
    assumptions: [
      'Direct elemental combination under idealized catalytic conditions.',
      'Complete stoichiometric conversion with 100% reaction yield.',
    ],
    knownFacts,
    unavailableFacts: [
      'Reaction pathway kinetics and activation energies are abstracted.',
    ],
    supportedIntents: [
      'explain_current_state',
      'why_did_this_happen',
      'explain_equations',
      'what_if',
      'ask_question',
    ],
  };
}

export function buildEquationValidatorExplainerContext(
  equation: string,
  validation: EquationValidationResult,
  revision: number = 1
): SimulationExplainerContext {
  const isMalformed = validation.statusText === 'Malformed Equation';
  const isBalanced = validation.isBalanced;

  const knownFacts: string[] = [
    'The Law of Conservation of Mass states that atoms cannot be created or destroyed in chemical reactions.',
    'A chemical equation is balanced if and only if the count of each atom type is identical on both sides.',
  ];

  if (isBalanced) {
    knownFacts.push(`Equation ${equation} is fully balanced.`);
  } else if (!isMalformed) {
    knownFacts.push(`Equation ${equation} is unbalanced: atom quantities do not match between reactants and products.`);
  }

  return {
    schemaVersion: EXPLAINER_SCHEMA_VERSION,
    simulationId: 'chemistry-validator',
    simulationTitle: 'Chemical Equation Balancer',
    domain: 'chemistry',
    stateRevision: revision,
    timestamp: new Date().toISOString(),
    inputs: {
      equation,
    },
    outputs: {
      isBalanced,
      isMalformed,
      statusText: validation.statusText,
      reactantCounts: validation.reactantCounts,
      productCounts: validation.productCounts,
    },
    assumptions: [
      'Chemical formulas follow IUPAC nomenclature and standard ASCII formatting.',
    ],
    knownFacts,
    unavailableFacts: [
      'Equilibrium constants and reaction reversibility are not evaluated by the atom balancer.',
    ],
    supportedIntents: [
      'explain_current_state',
      'why_did_this_happen',
      'explain_equations',
      'ask_question',
    ],
  };
}

export function buildChemistryDiscoveriesExplainerContext(
  count: number,
  revision: number = 1
): SimulationExplainerContext {
  return {
    schemaVersion: EXPLAINER_SCHEMA_VERSION,
    simulationId: 'chemistry-runs',
    simulationTitle: `Science Discoveries (${count})`,
    domain: 'chemistry',
    stateRevision: revision,
    timestamp: new Date().toISOString(),
    inputs: {
      savedCount: count,
    },
    outputs: {
      savedCount: count,
    },
    assumptions: [
      'Saved runs represent verified stoichiometric or physical simulations stored offline.',
    ],
    knownFacts: [
      `Local offline storage contains ${count} verified laboratory run(s).`,
      'Restoring any discovery populates the simulation with canonical inputs for re-simulation.',
    ],
    unavailableFacts: [],
    supportedIntents: ['explain_current_state', 'ask_question'],
  };
}



import type { ChemistryParameters, ChemistryResults } from '../../experiment/types';
import { EXPLAINER_SCHEMA_VERSION, type SimulationExplainerContext } from '../types';

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


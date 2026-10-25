import type { ProbabilityParameters, ProbabilityResults } from '../../experiment/types';
import { EXPLAINER_SCHEMA_VERSION, type SimulationExplainerContext } from '../types';

export function buildProbabilityExplainerContext(
  params: ProbabilityParameters,
  results: ProbabilityResults,
  revision: number = 1
): SimulationExplainerContext {
  const { kind, sides, trials, seed } = params;
  const { counts, total } = results;

  const theoreticalProbability = 1 / sides;
  const theoreticalExpectedCount = Number((trials * theoreticalProbability).toFixed(2));

  // Compute empirical frequencies per face
  const empiricalOutcomes = counts.map((count, index) => {
    const faceLabel = kind === 'coin' ? (index === 0 ? 'Heads' : 'Tails') : `Face ${index + 1}`;
    const frequency = total > 0 ? Number((count / total).toFixed(4)) : 0;
    const deviationFromExpected = Number((count - theoreticalExpectedCount).toFixed(2));
    return {
      face: faceLabel,
      observedCount: count,
      empiricalFrequency: frequency,
      theoreticalProbability: Number(theoreticalProbability.toFixed(4)),
      deviation: deviationFromExpected,
    };
  });

  return {
    schemaVersion: EXPLAINER_SCHEMA_VERSION,
    simulationId: `probability-${kind}`,
    simulationTitle: `${kind === 'coin' ? 'Coin Flip' : `${sides}-Sided Die`} Simulation (${trials.toLocaleString()} trials)`,
    domain: 'probability',
    stateRevision: revision,
    timestamp: new Date().toISOString(),
    inputs: {
      trialKind: kind,
      numberOfSides: sides,
      totalTrials: trials,
      prngSeed: seed,
    },
    outputs: {
      totalSimulated: total,
      theoreticalExpectedPerOutcome: theoreticalExpectedCount,
      outcomes: empiricalOutcomes,
    },
    units: {
      totalTrials: 'trials',
      numberOfSides: 'outcomes',
      theoreticalExpectedPerOutcome: 'counts',
    },
    assumptions: [
      `Fair, perfectly balanced ${kind === 'coin' ? 'coin' : `${sides}-sided die`} with equal theoretical probability for each outcome (P = 1/${sides}).`,
      'Each trial is independent (past outcomes exert zero physical or statistical influence on future rolls/tosses).',
      'Pseudo-random generation uses a deterministic Mulberry32 algorithm initialized with the specified 32-bit unsigned integer seed.',
      'Finite sample sizes exhibit natural statistical variance; exact theoretical proportions are not guaranteed for finite N.',
    ],
    knownFacts: [
      'Law of Large Numbers: As the number of trials N grows arbitrarily large, the observed empirical relative frequency converges toward theoretical probability with high probability.',
      'Gambler\'s Fallacy: The belief that a streak of one outcome makes an alternative outcome "due" is mathematically false for independent trials.',
      `Theoretical probability for any single face: 1/${sides} ≈ ${(theoreticalProbability * 100).toFixed(2)}%.`,
      'Statistical variance scales inversely with the square root of trial count (1 / √N).',
    ],
    unavailableFacts: [
      'Physical aerodynamics of flipping (torque, air turbulence, surface rebound) are not simulated; purely mathematical discrete sampling is performed.',
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

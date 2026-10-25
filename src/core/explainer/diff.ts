import type { SimulationExplainerContext, ExplainerContextDiff } from './types';

export function diffExplainerContext(
  current: SimulationExplainerContext,
  prior?: SimulationExplainerContext | null
): ExplainerContextDiff {
  if (!prior) {
    return {
      hasPriorState: false,
      domainMatch: false,
      changedInputs: {},
      changedOutputs: {},
      summary: 'No previous simulation state recorded in this session to compare against.',
    };
  }

  if (current.domain !== prior.domain) {
    return {
      hasPriorState: true,
      priorRevision: prior.stateRevision,
      domainMatch: false,
      changedInputs: {},
      changedOutputs: {},
      summary: `Previous state was from a different domain (${prior.domain}) compared to current (${current.domain}). Direct comparison is unavailable.`,
    };
  }

  const changedInputs: Record<string, { from: unknown; to: unknown }> = {};
  const changedOutputs: Record<string, { from: unknown; to: unknown }> = {};

  // Check inputs diff
  const allInputKeys = Array.from(new Set([...Object.keys(current.inputs), ...Object.keys(prior.inputs)]));
  for (const key of allInputKeys) {
    const valCurr = current.inputs[key];
    const valPrior = prior.inputs[key];
    if (JSON.stringify(valCurr) !== JSON.stringify(valPrior)) {
      changedInputs[key] = { from: valPrior, to: valCurr };
    }
  }

  // Check outputs diff
  const allOutputKeys = Array.from(new Set([...Object.keys(current.outputs), ...Object.keys(prior.outputs)]));
  for (const key of allOutputKeys) {
    const valCurr = current.outputs[key];
    const valPrior = prior.outputs[key];
    if (JSON.stringify(valCurr) !== JSON.stringify(valPrior)) {
      changedOutputs[key] = { from: valPrior, to: valCurr };
    }
  }

  const inputChangeCount = Object.keys(changedInputs).length;
  const outputChangeCount = Object.keys(changedOutputs).length;

  let summary = '';
  if (inputChangeCount === 0 && outputChangeCount === 0) {
    summary = 'No parameters have changed between the two states.';
  } else {
    const inputNames = Object.keys(changedInputs).join(', ');
    summary = `${inputChangeCount} input(s) modified (${inputNames || 'none'}), resulting in ${outputChangeCount} output metric change(s).`;
  }

  return {
    hasPriorState: true,
    priorRevision: prior.stateRevision,
    domainMatch: true,
    changedInputs,
    changedOutputs,
    summary,
  };
}

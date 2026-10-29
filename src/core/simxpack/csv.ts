/**
 * CSV Exporters for All SimXSphere Experiment Types (Chemistry, Probability, Physics)
 * Pure computation. Zero UI / DOM dependencies.
 */

import type {
  ExperimentRun,
  ChemistryExperiment,
  ProbabilityExperiment,
  ProjectileExperiment,
} from '../experiment/types';

export function exportProbabilityCsv(exp: ProbabilityExperiment): string {
  const lines: string[] = ['outcome,count,proportion'];
  const total = exp.results?.total ?? 0;
  const isCoin = exp.parameters?.kind === 'coin';
  const counts = Array.isArray(exp.results?.counts) ? exp.results.counts : [];

  counts.forEach((count, i) => {
    const outcomeLabel = isCoin ? (i === 0 ? 'Heads' : 'Tails') : `Face_${i + 1}`;
    const prop = total > 0 ? (count / total).toFixed(6) : '0';
    lines.push(`${outcomeLabel},${count},${prop}`);
  });

  return lines.join('\n');
}

export function exportProjectileCsv(exp: ProjectileExperiment): string {
  const lines: string[] = ['index,time_sec,x_meters,y_meters'];
  const flightTime = exp.results?.flightTime ?? 0;
  const trajectory = Array.isArray(exp.results?.trajectory) ? exp.results.trajectory : [];

  trajectory.forEach(([x, y], i) => {
    const t = trajectory.length > 1 ? (flightTime * i) / (trajectory.length - 1) : 0;
    lines.push(`${i},${t.toFixed(4)},${x.toFixed(4)},${y.toFixed(4)}`);
  });

  return lines.join('\n');
}

export function exportChemistryCsv(exp: ChemistryExperiment): string {
  const lines: string[] = ['property,value'];
  const params = exp.parameters || ({} as Partial<ChemistryExperiment['parameters']>);
  const results = exp.results || ({} as Partial<ChemistryExperiment['results']>);

  lines.push(`mode,${params.mode || 'synthesis'}`);
  lines.push(`reaction_type,${results.reactionType || 'Synthesis'}`);
  lines.push(`balanced_equation,"${(results.balancedEquation || '').replace(/"/g, '""')}"`);
  lines.push(`products,"${(Array.isArray(results.products) ? results.products.join('; ') : '').replace(/"/g, '""')}"`);
  lines.push(`is_conserved,${results.isConserved ?? true}`);

  if (results.finalPh !== undefined && results.finalPh !== null) {
    lines.push(`final_ph,${results.finalPh.toFixed(2)}`);
  }
  if (results.temperatureChangeC !== undefined && results.temperatureChangeC !== null) {
    lines.push(`temperature_change_c,${results.temperatureChangeC}`);
  }
  if (results.precipitate) {
    lines.push(`precipitate,"${results.precipitate.replace(/"/g, '""')}"`);
  }
  if (results.gasEvolved) {
    lines.push(`gas_evolved,"${results.gasEvolved.replace(/"/g, '""')}"`);
  }

  // Reactants breakdown
  const reactants = Array.isArray(params.reactants) ? params.reactants : [];
  reactants.forEach((r, idx) => {
    const label = r.formula || r.name || `Reactant_${idx + 1}`;
    const amount = r.ratio ?? r.volumeMl ?? r.massGrams ?? 1;
    lines.push(`reactant_${idx + 1},"${label}" (amount: ${amount})`);
  });

  return lines.join('\n');
}

export function exportExperimentCsv(exp: ExperimentRun): string {
  switch (exp.type) {
    case 'probability':
      return exportProbabilityCsv(exp);
    case 'projectile':
      return exportProjectileCsv(exp);
    case 'chemistry':
      return exportChemistryCsv(exp);
    default: {
      const fallback = exp as { title?: string };
      return 'property,value\ntitle,"' + (fallback.title || '').replace(/"/g, '""') + '"';
    }
  }
}

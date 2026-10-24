/**
 * CSV Exporters for Probability and Projectile Experiments
 * Pure computation. Zero UI / DOM dependencies.
 */

import type { ProbabilityExperiment, ProjectileExperiment } from '../experiment/types';

export function exportProbabilityCsv(exp: ProbabilityExperiment): string {
  const lines: string[] = ['outcome,count,proportion'];
  const total = exp.results.total;
  const isCoin = exp.parameters.kind === 'coin';

  exp.results.counts.forEach((count, i) => {
    const outcomeLabel = isCoin ? (i === 0 ? 'Heads' : 'Tails') : `Face_${i + 1}`;
    const prop = total > 0 ? (count / total).toFixed(6) : '0';
    lines.push(`${outcomeLabel},${count},${prop}`);
  });

  return lines.join('\n');
}

export function exportProjectileCsv(exp: ProjectileExperiment): string {
  const lines: string[] = ['index,time_sec,x_meters,y_meters'];
  const flightTime = exp.results.flightTime;
  const trajectory = exp.results.trajectory;

  trajectory.forEach(([x, y], i) => {
    const t = trajectory.length > 1 ? (flightTime * i) / (trajectory.length - 1) : 0;
    lines.push(`${i},${t.toFixed(4)},${x.toFixed(4)},${y.toFixed(4)}`);
  });

  return lines.join('\n');
}

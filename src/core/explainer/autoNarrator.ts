import type { SimulationExplainerContext } from './types';

/**
 * Autonomous 2-Line Simulation Narrator
 * Automatically produces a crisp, 2-line educational takeaway from authoritative
 * simulation state with zero latency, grounded in exact numbers and laws.
 */
export function generateAutoNarration(context: SimulationExplainerContext): {
  headline: string;
  line1: string;
  line2: string;
  spokenText: string;
} {
  const { domain, inputs, outputs } = context;

  if (domain === 'projectile') {
    const angle = Number(inputs.launchAngle ?? 45);
    const speed = Number(inputs.initialSpeed ?? 20);
    const range = Number(outputs.rangeMeters ?? 0);
    const height = Number(outputs.maxHeightMeters ?? 0);
    const time = Number(outputs.flightTimeSeconds ?? 0);
    const compAngle = 90 - angle;

    if (angle === 0) {
      const line1 = `At 0°, the projectile sits flat on the ground plane with zero vertical lift.`;
      const line2 = `Tilt the launch angle above 0° to launch the rocket into the sky!`;
      return {
        headline: `Ground Flat (0°)`,
        line1,
        line2,
        spokenText: `${line1} ${line2}`,
      };
    }

    if (angle === 45) {
      const line1 = `45° achieves the maximum possible range of ${range.toFixed(1)} meters at ${speed} m/s!`;
      const line2 = `The rocket stays airborne for ${time.toFixed(1)} seconds, reaching a peak altitude of ${height.toFixed(1)} meters.`;
      return {
        headline: `Optimal Range Launch (45°)`,
        line1,
        line2,
        spokenText: `${line1} ${line2}`,
      };
    }

    if (angle === 90) {
      const line1 = `90° launches vertically straight up to the highest possible apex of ${height.toFixed(1)} meters.`;
      const line2 = `The rocket achieves 0 meters horizontal flight, dropping straight back down to the launch pad in ${time.toFixed(1)} seconds.`;
      return {
        headline: `Vertical Launch (90°)`,
        line1,
        line2,
        spokenText: `${line1} ${line2}`,
      };
    }

    const line1 = `Launching at ${angle}° propels the projectile to a landing distance of ${range.toFixed(1)}m and apex of ${height.toFixed(1)}m.`;
    const line2 = `Notice that complementary angle ${compAngle}° lands at the exact same distance with a different flight arc!`;
    return {
      headline: `${angle}° Launch Trajectory`,
      line1,
      line2,
      spokenText: `${line1} ${line2}`,
    };
  }

  if (domain === 'probability') {
    const kind = String(inputs.trialKind ?? 'coin');
    const total = Number(outputs.totalSimulated ?? inputs.totalTrials ?? 0);
    const outcomes = (outputs.outcomes as Array<{ face: string; observedCount: number; empiricalFrequency: number }>) || [];

    if (kind === 'coin') {
      const heads = outcomes.find((o) => o.face === 'Heads')?.observedCount ?? 0;
      const headsPct = total > 0 ? ((heads / total) * 100).toFixed(1) : '50.0';
      const line1 = `Across ${total.toLocaleString()} coin flips, Heads landed ${heads.toLocaleString()} times (${headsPct}%).`;
      const line2 = `As trial counts grow, the Law of Large Numbers pulls the empirical frequency toward the 50% theoretical expectation.`;
      return {
        headline: `Coin Toss Probability (${total.toLocaleString()} trials)`,
        line1,
        line2,
        spokenText: `${line1} ${line2}`,
      };
    }

    const sides = Number(inputs.numberOfSides ?? 6);
    const expectedFreq = ((1 / sides) * 100).toFixed(1);
    const line1 = `Rolled a ${sides}-sided die ${total.toLocaleString()} times with independent PRNG sampling.`;
    const line2 = `Each face has a theoretical chance of ${expectedFreq}%, with natural statistical variation smoothing out over large samples.`;
    return {
      headline: `${sides}-Sided Die Simulation`,
      line1,
      line2,
      spokenText: `${line1} ${line2}`,
    };
  }

  if (domain === 'chemistry') {
    if (context.simulationId === 'chemistry-workplane') {
      const isSynthesized = outputs.isSynthesized === true;
      const compoundName = String(outputs.compoundName || '');
      const formula = String(outputs.formula || '');
      const equation = String(outputs.synthesisEquation || '');
      const bondType = String(outputs.bondType || 'chemical');
      const status = String(outputs.status || '');
      const elementsSummary = String(outputs.elementsSummary || '');
      const totalAtoms = Number(inputs.totalBeakerAtoms ?? 0);
      const hasBeaker = inputs.hasBeaker === true;

      if (isSynthesized) {
        const line1 = `Synthesis successful! ${equation || `${formula} was created`}.`;
        const line2 = `${compoundName} is held together by ${bondType} bonds with 100% conservation of mass and atoms.`;
        return {
          headline: `Synthesized: ${compoundName} (${formula})`,
          line1,
          line2,
          spokenText: `${line1} ${line2}`,
        };
      }

      if (status === 'incompatible') {
        const line1 = `These elements could not synthesize into a stable molecule under standard octet rules.`;
        const line2 = `Try adjusting the atom ratios in the beaker or combining elements with complementary valence electrons.`;
        return {
          headline: `Reaction Incompatible`,
          line1,
          line2,
          spokenText: `${line1} ${line2}`,
        };
      }

      if (totalAtoms > 0) {
        const line1 = `Beaker currently holds ${totalAtoms} atom(s): ${elementsSummary}.`;
        const line2 =
          totalAtoms >= 2
            ? `Click "React & Combine" to ignite the reaction and synthesize a new compound!`
            : `Add another complementary element into the beaker to discover a compound!`;
        return {
          headline: `Beaker: ${elementsSummary}`,
          line1,
          line2,
          spokenText: `${line1} ${line2}`,
        };
      }

      if (hasBeaker) {
        const line1 = `Reaction beaker is ready on the workplane for elemental mixing!`;
        const line2 = `Drag element blocks from the shelf into the beaker to explore compound synthesis.`;
        return {
          headline: `Mix & React Beaker Ready`,
          line1,
          line2,
          spokenText: `${line1} ${line2}`,
        };
      }

      const line1 = `Welcome to the Mix & React Lab! Drag a beaker onto the workplane to begin.`;
      const line2 = `Combine different elements to observe atomic bonding and synthesize molecules!`;
      return {
        headline: `Mix & React Lab`,
        line1,
        line2,
        spokenText: `${line1} ${line2}`,
      };
    }

    const rxnType = String(outputs.reactionType ?? 'Chemical Reaction');
    const equation = String(outputs.balancedEquation ?? '');
    const ph = outputs.finalPh !== undefined && outputs.finalPh !== null ? Number(outputs.finalPh) : null;
    const tempChange = outputs.temperatureChangeC !== undefined && outputs.temperatureChangeC !== null ? Number(outputs.temperatureChangeC) : null;

    let line1 = `${rxnType}: ${equation || 'Balanced reaction complete'}.`;
    let line2 = `Mass and atomic stoichiometry are fully conserved in this closed reaction vessel.`;

    if (ph !== null && tempChange !== null) {
      const thermic = tempChange > 0 ? 'an exothermic' : tempChange < 0 ? 'an endothermic' : 'a neutral';
      line2 = `This is ${thermic} process yielding a final solution pH of ${ph.toFixed(1)} with a ${Math.abs(tempChange).toFixed(1)}°C temperature shift.`;
    } else if (ph !== null) {
      line2 = `The resulting aqueous solution settles at a final pH of ${ph.toFixed(1)}.`;
    }

    return {
      headline: rxnType,
      line1,
      line2,
      spokenText: `${line1} ${line2}`,
    };
  }

  return {
    headline: `Simulation Active`,
    line1: `Simulation state updated with authentic engine calculations.`,
    line2: `All parameters and outputs are synchronized and ready for analysis.`,
    spokenText: `Simulation state updated with authentic engine calculations.`,
  };
}

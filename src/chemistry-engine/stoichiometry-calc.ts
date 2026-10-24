/**
 * Quantitative Stoichiometry & Limiting Reagent Calculator
 * Computes molar ratios, limiting reagents, theoretical yields,
 * and excess reagent remaining unreacted.
 * 100% pure computation, zero UI dependencies.
 */

export interface ReactantInput {
  symbol: string;
  name: string;
  coefficient: number;     // Stoichiometric coefficient in balanced equation, e.g. 2 for 2H₂
  molarMass: number;       // g/mol
  massGrams: number;       // Mass input in grams
}

export interface StoichiometryResult {
  balancedEquation: string;
  productFormula: string;
  productMolarMass: number;
  totalReactantMassGrams: number;
  limitingReagentSymbol: string;
  limitingReagentName: string;
  theoreticalYieldMoles: number;
  theoreticalYieldGrams: number;
  excessReagents: {
    symbol: string;
    name: string;
    initialGrams: number;
    consumedGrams: number;
    remainingGrams: number;
  }[];
  conservationOfMassCheck: {
    totalInputGrams: number;
    totalOutputGrams: number;
    isConserved: boolean; // Math.abs(input - output) < 1e-4
  };
}

/**
 * Calculates limiting reagent and product yield for a reaction
 * a A + b B -> c C
 */
export function calculateLimitingReagent(
  reactants: ReactantInput[],
  product: {
    formula: string;
    coefficient: number;
    molarMass: number;
  }
): StoichiometryResult | null {
  if (!reactants || reactants.length === 0 || !product) {
    return null;
  }

  // Calculate moles of each reactant available
  const reactantData = reactants.map((r) => {
    const molesAvailable = r.molarMass > 0 ? r.massGrams / r.molarMass : 0;
    // Moles of reaction batches possible = molesAvailable / coefficient
    const reactionBatches = r.coefficient > 0 ? molesAvailable / r.coefficient : 0;
    return {
      ...r,
      molesAvailable,
      reactionBatches,
    };
  });

  // Find limiting reagent (the one with minimum reaction batches)
  let limiting = reactantData[0];
  for (const r of reactantData) {
    if (r.reactionBatches < limiting.reactionBatches) {
      limiting = r;
    }
  }

  const maxBatches = limiting.reactionBatches;
  const theoreticalYieldMoles = maxBatches * product.coefficient;
  const theoreticalYieldGrams = theoreticalYieldMoles * product.molarMass;

  // Calculate consumed and excess for each reactant
  const excessReagents = reactantData.map((r) => {
    const molesConsumed = maxBatches * r.coefficient;
    const consumedGrams = molesConsumed * r.molarMass;
    const remainingGrams = Math.max(0, r.massGrams - consumedGrams);
    return {
      symbol: r.symbol,
      name: r.name,
      initialGrams: Number(r.massGrams.toFixed(3)),
      consumedGrams: Number(consumedGrams.toFixed(3)),
      remainingGrams: Number(remainingGrams.toFixed(3)),
    };
  });

  const totalInputGrams = reactants.reduce((sum, r) => sum + r.massGrams, 0);
  const totalRemainingExcess = excessReagents.reduce((sum, r) => sum + r.remainingGrams, 0);
  const totalOutputGrams = theoreticalYieldGrams + totalRemainingExcess;

  // Balanced equation string
  const eqLeft = reactants.map((r) => `${r.coefficient > 1 ? r.coefficient : ''}${r.symbol}`).join(' + ');
  const eqRight = `${product.coefficient > 1 ? product.coefficient : ''}${product.formula}`;
  const balancedEquation = `${eqLeft} → ${eqRight}`;

  return {
    balancedEquation,
    productFormula: product.formula,
    productMolarMass: Number(product.molarMass.toFixed(3)),
    totalReactantMassGrams: Number(totalInputGrams.toFixed(3)),
    limitingReagentSymbol: limiting.symbol,
    limitingReagentName: limiting.name,
    theoreticalYieldMoles: Number(theoreticalYieldMoles.toFixed(4)),
    theoreticalYieldGrams: Number(theoreticalYieldGrams.toFixed(3)),
    excessReagents,
    conservationOfMassCheck: {
      totalInputGrams: Number(totalInputGrams.toFixed(3)),
      totalOutputGrams: Number(totalOutputGrams.toFixed(3)),
      isConserved: Math.abs(totalInputGrams - totalOutputGrams) < 0.01,
    },
  };
}

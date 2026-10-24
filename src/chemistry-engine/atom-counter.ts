/**
 * Atom Counter and Equation Conservation Validator
 * Parses chemical formulas and verifies atom conservation between reactants and products.
 * Returns balance status and exact element-by-element counts.
 * Pure computation. Zero UI / DOM dependencies.
 */

export interface AtomCountMap {
  [elementSymbol: string]: number;
}

export interface EquationValidationResult {
  isBalanced: boolean;
  statusText: 'Balanced' | 'Not balanced' | 'Malformed Equation';
  reactantCounts: AtomCountMap;
  productCounts: AtomCountMap;
  mismatches: { element: string; reactantCount: number; productCount: number }[];
}

/**
 * Parses a single chemical formula term with coefficient, e.g. "2H2O", "3Ca(OH)2", "NaCl"
 */
export function parseChemicalTerm(term: string): AtomCountMap {
  const counts: AtomCountMap = {};
  const trimmed = term.trim();
  if (!trimmed) return counts;

  // Extract leading coefficient, e.g. "2" in "2H2O"
  const coeffMatch = trimmed.match(/^(\d+)/);
  const coefficient = coeffMatch ? parseInt(coeffMatch[1], 10) : 1;
  const formulaPart = coeffMatch ? trimmed.slice(coeffMatch[1].length) : trimmed;

  // Remove state indicators like (aq), (s), (l), (g), ↑, ↓
  const cleanFormula = formulaPart
    .replace(/\((aq|s|l|g)\)/gi, '')
    .replace(/[↑↓]/g, '')
    .trim();

  // Regex to match: Group 1: Element Symbol (e.g. "H", "Na", "Cl"), Group 2: Subscript Count (e.g. "2", "3")
  const elementRegex = /([A-Z][a-z]?)(\d*)/g;
  let match: RegExpExecArray | null;

  while ((match = elementRegex.exec(cleanFormula)) !== null) {
    const symbol = match[1];
    const count = match[2] ? parseInt(match[2], 10) : 1;
    counts[symbol] = (counts[symbol] || 0) + count * coefficient;
  }

  return counts;
}

/**
 * Parses an entire side of a chemical equation (e.g. "2H2 + O2" or "CH4 + 2O2")
 */
export function parseEquationSide(sideStr: string): AtomCountMap {
  const totalCounts: AtomCountMap = {};
  // Split terms by "+"
  const terms = sideStr.split('+');

  for (const term of terms) {
    const termCounts = parseChemicalTerm(term);
    for (const [sym, count] of Object.entries(termCounts)) {
      totalCounts[sym] = (totalCounts[sym] || 0) + count;
    }
  }

  return totalCounts;
}

/**
 * Validates whether an equation (e.g. "2H2 + O2 → 2H2O") satisfies the Law of Conservation of Mass
 */
export function validateBalancedEquation(equationStr: string): EquationValidationResult {
  // Split by "→", "->", "⇌", "="
  const separatorRegex = /→|->|⇌|=/;
  const parts = equationStr.split(separatorRegex);

  if (parts.length !== 2) {
    return {
      isBalanced: false,
      statusText: 'Malformed Equation',
      reactantCounts: {},
      productCounts: {},
      mismatches: []
    };
  }

  const reactantCounts = parseEquationSide(parts[0]);
  const productCounts = parseEquationSide(parts[1]);

  const allElements = new Set([
    ...Object.keys(reactantCounts),
    ...Object.keys(productCounts)
  ]);

  const mismatches: { element: string; reactantCount: number; productCount: number }[] = [];

  for (const el of allElements) {
    const rCount = reactantCounts[el] || 0;
    const pCount = productCounts[el] || 0;
    if (rCount !== pCount) {
      mismatches.push({
        element: el,
        reactantCount: rCount,
        productCount: pCount
      });
    }
  }

  const isBalanced = mismatches.length === 0 && allElements.size > 0;

  return {
    isBalanced,
    statusText: isBalanced ? 'Balanced' : 'Not balanced',
    reactantCounts,
    productCounts,
    mismatches
  };
}

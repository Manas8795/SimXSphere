/**
 * Atom Counter and Equation Conservation Validator
 * Robust tokenizer/parser supporting:
 * - 118 IUPAC elements from the periodic table
 * - Integer subscripts (> 0)
 * - Grouped formulas with nested parentheses up to depth 5 (e.g., Ca(OH)2, Al2(SO4)3, Fe2(SO4)3)
 * - Reaction coefficients (e.g., 2H2O, 3Ca(OH)2)
 * - Accepted phase labels at term end: (s), (l), (g), (aq), ↑, ↓
 * - Strict rejection of invalid characters, unknown symbols, malformed parentheses, empty sides
 * - Distinction between 'Balanced', 'Not balanced', and 'Malformed Equation'
 *
 * Pure computation. Zero UI / DOM dependencies.
 */

import { PERIODIC_TABLE } from '../chemistry-data/elements';

const VALID_ELEMENTS = new Set<string>(PERIODIC_TABLE.map((e) => e.symbol));

export interface AtomCountMap {
  [elementSymbol: string]: number;
}

export interface EquationValidationResult {
  isBalanced: boolean;
  statusText: 'Balanced' | 'Not balanced' | 'Malformed Equation';
  reactantCounts: AtomCountMap;
  productCounts: AtomCountMap;
  mismatches: { element: string; reactantCount: number; productCount: number }[];
  errorMessage?: string;
}

/**
 * Parses a single chemical formula term with an optional leading coefficient,
 * grouped parentheses, subscripts, and optional phase label.
 *
 * Examples: "2H2O", "Ca(OH)2", "Al2(SO4)3", "3Fe2(SO4)3(aq)"
 * Throws Error on malformed syntax, unknown elements, or invalid characters.
 */
export function parseChemicalTerm(term: string): AtomCountMap {
  const trimmed = term.trim();
  if (!trimmed) {
    return {};
  }

  // 1. Extract leading coefficient if present
  let coefficient = 1;
  let pos = 0;
  const coeffMatch = trimmed.match(/^(\d+)/);
  if (coeffMatch) {
    const coeffVal = parseInt(coeffMatch[1], 10);
    if (coeffVal <= 0) {
      throw new Error(`Invalid non-positive reaction coefficient "${coeffMatch[1]}"`);
    }
    coefficient = coeffVal;
    pos = coeffMatch[1].length;
  }

  if (pos >= trimmed.length) {
    throw new Error(`Missing chemical formula after coefficient "${coeffMatch?.[1]}"`);
  }

  // 2. Extract and strip optional trailing phase indicator from the strict end of the term
  let formulaPart = trimmed.slice(pos).trim();
  const phaseMatch = formulaPart.match(/\s*(\((aq|s|l|g)\)|[↑↓])\s*$/i);
  if (phaseMatch) {
    formulaPart = formulaPart.slice(0, formulaPart.length - phaseMatch[0].length).trim();
  }

  if (!formulaPart) {
    throw new Error('Missing chemical formula body');
  }

  // 3. Parse formula body recursively
  const bodyCounts = parseFormulaBody(formulaPart, 0);

  // 4. Apply the leading coefficient
  const totalCounts: AtomCountMap = {};
  for (const [sym, count] of Object.entries(bodyCounts)) {
    totalCounts[sym] = count * coefficient;
  }

  return totalCounts;
}

/**
 * Recursive descent parser for formula expressions with parentheses and subscripts.
 * Max nesting depth: 5.
 */
function parseFormulaBody(input: string, depth: number): AtomCountMap {
  if (depth > 5) {
    throw new Error('Chemical formula exceeds maximum supported nesting depth (5)');
  }

  let i = 0;
  const len = input.length;
  const counts: AtomCountMap = {};

  while (i < len) {
    const ch = input[i];

    if (ch === '(') {
      // Find matching closing parenthesis
      let openParen = 1;
      let j = i + 1;
      while (j < len && openParen > 0) {
        if (input[j] === '(') openParen++;
        else if (input[j] === ')') openParen--;
        j++;
      }

      if (openParen !== 0) {
        throw new Error('Unclosed parenthesis "(" in chemical formula');
      }

      const innerStr = input.slice(i + 1, j - 1);
      if (!innerStr.trim()) {
        throw new Error('Empty parentheses "()" in chemical formula');
      }

      i = j;

      // Parse optional subscript following the closing parenthesis
      let subscript = 1;
      let numStr = '';
      while (i < len && /\d/.test(input[i])) {
        numStr += input[i];
        i++;
      }

      if (numStr.length > 0) {
        subscript = parseInt(numStr, 10);
        if (subscript <= 0) {
          throw new Error(`Invalid non-positive subscript "${numStr}"`);
        }
      }

      // Recursively parse the contents within parentheses
      const innerCounts = parseFormulaBody(innerStr, depth + 1);
      for (const [sym, c] of Object.entries(innerCounts)) {
        counts[sym] = (counts[sym] || 0) + c * subscript;
      }
    } else if (ch === ')') {
      throw new Error('Unexpected closing parenthesis ")" without matching opening parenthesis');
    } else if (/[A-Z]/.test(ch)) {
      // Element symbol starts with an uppercase letter
      let sym = ch;
      i++;
      if (i < len && /[a-z]/.test(input[i])) {
        sym += input[i];
        i++;
      }

      if (!VALID_ELEMENTS.has(sym)) {
        throw new Error(`Unknown element symbol "${sym}" in formula`);
      }

      // Parse optional subscript
      let subscript = 1;
      let numStr = '';
      while (i < len && /\d/.test(input[i])) {
        numStr += input[i];
        i++;
      }

      if (numStr.length > 0) {
        subscript = parseInt(numStr, 10);
        if (subscript <= 0) {
          throw new Error(`Invalid non-positive subscript "${numStr}" for element ${sym}`);
        }
      }

      counts[sym] = (counts[sym] || 0) + subscript;
    } else if (/\s/.test(ch)) {
      // Skip inner whitespace
      i++;
    } else {
      throw new Error(`Invalid character "${ch}" in chemical formula`);
    }
  }

  return counts;
}

/**
 * Parses one side of a chemical equation (reactants or products).
 * Expects formula terms separated by '+'.
 * Throws on malformed terms, empty sides, or misplaced operators.
 */
export function parseEquationSide(sideStr: string): AtomCountMap {
  const trimmed = sideStr.trim();
  if (!trimmed) {
    throw new Error('Equation side is empty');
  }

  if (trimmed.startsWith('+') || trimmed.endsWith('+')) {
    throw new Error('Malformed "+" operator with missing reactant or product term');
  }

  const rawTerms = trimmed.split('+');
  const totalCounts: AtomCountMap = {};

  for (const rawTerm of rawTerms) {
    const term = rawTerm.trim();
    if (!term) {
      throw new Error('Empty formula term found (consecutive "+" operators)');
    }
    const termCounts = parseChemicalTerm(term);
    for (const [sym, count] of Object.entries(termCounts)) {
      totalCounts[sym] = (totalCounts[sym] || 0) + count;
    }
  }

  return totalCounts;
}

/**
 * Validates whether a chemical equation satisfies the Law of Conservation of Mass.
 * Evaluates equation structure, parses both sides, counts atoms, and returns detailed audit results.
 */
export function validateBalancedEquation(equationStr: string): EquationValidationResult {
  const trimmed = (equationStr || '').trim();
  if (!trimmed) {
    return {
      isBalanced: false,
      statusText: 'Malformed Equation',
      reactantCounts: {},
      productCounts: {},
      mismatches: [],
      errorMessage: 'Equation string is empty',
    };
  }

  // Accepted arrows: →, ->, ⇌, =
  // Match standalone arrow tokens
  const arrowRegex = /→|->|⇌|=/g;
  const arrows = trimmed.match(arrowRegex);

  if (!arrows || arrows.length !== 1) {
    return {
      isBalanced: false,
      statusText: 'Malformed Equation',
      reactantCounts: {},
      productCounts: {},
      mismatches: [],
      errorMessage: !arrows
        ? 'Missing reaction arrow (expected "->", "→", "⇌", or "=")'
        : 'Multiple reaction arrows found in equation',
    };
  }

  const arrowIndex = trimmed.search(arrowRegex);
  const arrowLen = arrows[0].length;
  const leftSide = trimmed.slice(0, arrowIndex).trim();
  const rightSide = trimmed.slice(arrowIndex + arrowLen).trim();

  if (!leftSide || !rightSide) {
    return {
      isBalanced: false,
      statusText: 'Malformed Equation',
      reactantCounts: {},
      productCounts: {},
      mismatches: [],
      errorMessage: !leftSide ? 'Missing reactant side' : 'Missing product side',
    };
  }

  let reactantCounts: AtomCountMap;
  let productCounts: AtomCountMap;

  try {
    reactantCounts = parseEquationSide(leftSide);
  } catch (err) {
    return {
      isBalanced: false,
      statusText: 'Malformed Equation',
      reactantCounts: {},
      productCounts: {},
      mismatches: [],
      errorMessage: `Reactant error: ${(err as Error).message}`,
    };
  }

  try {
    productCounts = parseEquationSide(rightSide);
  } catch (err) {
    return {
      isBalanced: false,
      statusText: 'Malformed Equation',
      reactantCounts,
      productCounts: {},
      mismatches: [],
      errorMessage: `Product error: ${(err as Error).message}`,
    };
  }

  const allElements = new Set<string>([
    ...Object.keys(reactantCounts),
    ...Object.keys(productCounts),
  ]);

  if (allElements.size === 0) {
    return {
      isBalanced: false,
      statusText: 'Malformed Equation',
      reactantCounts,
      productCounts,
      mismatches: [],
      errorMessage: 'No chemical elements detected in equation',
    };
  }

  const mismatches: { element: string; reactantCount: number; productCount: number }[] = [];

  for (const el of allElements) {
    const rCount = reactantCounts[el] || 0;
    const pCount = productCounts[el] || 0;
    if (rCount !== pCount) {
      mismatches.push({
        element: el,
        reactantCount: rCount,
        productCount: pCount,
      });
    }
  }

  const isBalanced = mismatches.length === 0;

  return {
    isBalanced,
    statusText: isBalanced ? 'Balanced' : 'Not balanced',
    reactantCounts,
    productCounts,
    mismatches,
  };
}

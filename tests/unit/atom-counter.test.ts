import { describe, it, expect } from 'vitest';
import {
  parseChemicalTerm,
  parseEquationSide,
  validateBalancedEquation,
} from '../../src/chemistry-engine/atom-counter';

describe('Chemical Formula Parser & Conservation Validator (Milestone 2)', () => {
  describe('parseChemicalTerm', () => {
    it('parses simple binary formulas correctly', () => {
      expect(parseChemicalTerm('H2O')).toEqual({ H: 2, O: 1 });
      expect(parseChemicalTerm('NaCl')).toEqual({ Na: 1, Cl: 1 });
      expect(parseChemicalTerm('CO2')).toEqual({ C: 1, O: 2 });
      expect(parseChemicalTerm('CH4')).toEqual({ C: 1, H: 4 });
      expect(parseChemicalTerm('NH3')).toEqual({ N: 1, H: 3 });
    });

    it('parses grouped formulas with parentheses correctly', () => {
      // Ca(OH)2 -> Ca: 1, O: 2, H: 2
      expect(parseChemicalTerm('Ca(OH)2')).toEqual({ Ca: 1, O: 2, H: 2 });

      // Al2(SO4)3 -> Al: 2, S: 3, O: 12
      expect(parseChemicalTerm('Al2(SO4)3')).toEqual({ Al: 2, S: 3, O: 12 });

      // Fe2(SO4)3 -> Fe: 2, S: 3, O: 12
      expect(parseChemicalTerm('Fe2(SO4)3')).toEqual({ Fe: 2, S: 3, O: 12 });

      // Ba(NO3)2 -> Ba: 1, N: 2, O: 6
      expect(parseChemicalTerm('Ba(NO3)2')).toEqual({ Ba: 1, N: 2, O: 6 });

      // (NH4)2SO4 -> N: 2, H: 8, S: 1, O: 4
      expect(parseChemicalTerm('(NH4)2SO4')).toEqual({ N: 2, H: 8, S: 1, O: 4 });
    });

    it('multiplies atom counts by leading reaction coefficients', () => {
      expect(parseChemicalTerm('2H2O')).toEqual({ H: 4, O: 2 });
      expect(parseChemicalTerm('3Ca(OH)2')).toEqual({ Ca: 3, O: 6, H: 6 });
      expect(parseChemicalTerm('4Al2(SO4)3')).toEqual({ Al: 8, S: 12, O: 48 });
    });

    it('ignores and strips valid phase labels at the end of formulas', () => {
      expect(parseChemicalTerm('H2O(l)')).toEqual({ H: 2, O: 1 });
      expect(parseChemicalTerm('NaCl(aq)')).toEqual({ Na: 1, Cl: 1 });
      expect(parseChemicalTerm('Ca(OH)2(s)')).toEqual({ Ca: 1, O: 2, H: 2 });
      expect(parseChemicalTerm('CO2(g)')).toEqual({ C: 1, O: 2 });
      expect(parseChemicalTerm('AgCl↓')).toEqual({ Ag: 1, Cl: 1 });
      expect(parseChemicalTerm('H2↑')).toEqual({ H: 2 });
    });

    it('rejects unknown or invalid element symbols', () => {
      expect(() => parseChemicalTerm('Xx2O')).toThrow(/Unknown element symbol "Xx"/);
      expect(() => parseChemicalTerm('Zz')).toThrow(/Unknown element symbol "Zz"/);
      expect(() => parseChemicalTerm('h2o')).toThrow(/Invalid character "h"/);
    });

    it('rejects invalid characters and trailing unconsumed text', () => {
      expect(() => parseChemicalTerm('H2O!')).toThrow(/Invalid character "!"/);
      expect(() => parseChemicalTerm('H2O$')).toThrow(/Invalid character "\$"/);
      expect(() => parseChemicalTerm('H2-O')).toThrow(/Invalid character "-"/);
    });

    it('rejects malformed parentheses', () => {
      // Unclosed
      expect(() => parseChemicalTerm('Ca(OH')).toThrow(/Unclosed parenthesis/);
      // Unexpected closing
      expect(() => parseChemicalTerm('Ca)OH(')).toThrow(/Unexpected closing parenthesis/);
      // Empty parentheses
      expect(() => parseChemicalTerm('Ca()2')).toThrow(/Empty parentheses/);
    });

    it('rejects non-positive coefficients and subscripts', () => {
      expect(() => parseChemicalTerm('0H2O')).toThrow(/Invalid non-positive reaction coefficient/);
      expect(() => parseChemicalTerm('H0')).toThrow(/Invalid non-positive subscript/);
      expect(() => parseChemicalTerm('Ca(OH)0')).toThrow(/Invalid non-positive subscript/);
    });
  });

  describe('parseEquationSide', () => {
    it('parses multi-term sides correctly', () => {
      const counts = parseEquationSide('2H2 + O2');
      expect(counts).toEqual({ H: 4, O: 2 });
    });

    it('parses sides with grouped formulas and coefficients', () => {
      const counts = parseEquationSide('Ca(OH)2 + 2HCl');
      expect(counts).toEqual({ Ca: 1, O: 2, H: 4, Cl: 2 });
    });

    it('rejects empty sides, leading +, trailing +, and consecutive ++', () => {
      expect(() => parseEquationSide('')).toThrow(/Equation side is empty/);
      expect(() => parseEquationSide('+ H2O')).toThrow(/Malformed "\+" operator/);
      expect(() => parseEquationSide('H2O +')).toThrow(/Malformed "\+" operator/);
      expect(() => parseEquationSide('H2 + + O2')).toThrow(/Empty formula term/);
    });
  });

  describe('validateBalancedEquation', () => {
    it('validates simple balanced equations', () => {
      const res = validateBalancedEquation('2H2 + O2 → 2H2O');
      expect(res.isBalanced).toBe(true);
      expect(res.statusText).toBe('Balanced');
      expect(res.mismatches).toHaveLength(0);
      expect(res.reactantCounts).toEqual({ H: 4, O: 2 });
      expect(res.productCounts).toEqual({ H: 4, O: 2 });
    });

    it('supports ascii arrow -> and equilibrium = / ⇌', () => {
      expect(validateBalancedEquation('2H2 + O2 -> 2H2O').isBalanced).toBe(true);
      expect(validateBalancedEquation('CH4 + 2O2 = CO2 + 2H2O').isBalanced).toBe(true);
      expect(validateBalancedEquation('N2 + 3H2 ⇌ 2NH3').isBalanced).toBe(true);
    });

    it('validates polyatomic grouped equations correctly', () => {
      // Slaked Lime Neutralization
      const res1 = validateBalancedEquation('Ca(OH)2 + 2HCl -> CaCl2 + 2H2O');
      expect(res1.isBalanced).toBe(true);
      expect(res1.statusText).toBe('Balanced');
      expect(res1.reactantCounts).toEqual({ Ca: 1, O: 2, H: 4, Cl: 2 });
      expect(res1.productCounts).toEqual({ Ca: 1, Cl: 2, H: 4, O: 2 });

      // Aluminum Sulfate Precipitation
      const res2 = validateBalancedEquation('Al2(SO4)3 + 3BaCl2 -> 3BaSO4 + 2AlCl3');
      expect(res2.isBalanced).toBe(true);
      expect(res2.statusText).toBe('Balanced');
      expect(res2.reactantCounts).toEqual({ Al: 2, S: 3, O: 12, Ba: 3, Cl: 6 });
      expect(res2.productCounts).toEqual({ Ba: 3, S: 3, O: 12, Al: 2, Cl: 6 });

      // Iron(III) Sulfate Neutralization
      const res3 = validateBalancedEquation('2Fe(OH)3 + 3H2SO4 -> Fe2(SO4)3 + 6H2O');
      expect(res3.isBalanced).toBe(true);
      expect(res3.statusText).toBe('Balanced');
      expect(res3.reactantCounts).toEqual({ Fe: 2, O: 18, H: 12, S: 3 });
      expect(res3.productCounts).toEqual({ Fe: 2, S: 3, O: 18, H: 12 });
    });

    it('correctly reports valid but unbalanced equations as Not balanced', () => {
      const res = validateBalancedEquation('H2 + O2 -> H2O');
      expect(res.isBalanced).toBe(false);
      expect(res.statusText).toBe('Not balanced');
      expect(res.mismatches).toEqual([
        { element: 'O', reactantCount: 2, productCount: 1 },
      ]);
    });

    it('rejects malformed equations and never reports them as Balanced', () => {
      // Empty input
      const emptyRes = validateBalancedEquation('');
      expect(emptyRes.isBalanced).toBe(false);
      expect(emptyRes.statusText).toBe('Malformed Equation');

      // Missing reactant side
      const missingReactant = validateBalancedEquation('-> 2H2O');
      expect(missingReactant.isBalanced).toBe(false);
      expect(missingReactant.statusText).toBe('Malformed Equation');

      // Missing product side
      const missingProduct = validateBalancedEquation('2H2 + O2 ->');
      expect(missingProduct.isBalanced).toBe(false);
      expect(missingProduct.statusText).toBe('Malformed Equation');

      // Missing arrow
      const missingArrow = validateBalancedEquation('2H2 + O2 + 2H2O');
      expect(missingArrow.isBalanced).toBe(false);
      expect(missingArrow.statusText).toBe('Malformed Equation');

      // Multiple arrows
      const multiArrow = validateBalancedEquation('2H2 -> O2 -> 2H2O');
      expect(multiArrow.isBalanced).toBe(false);
      expect(multiArrow.statusText).toBe('Malformed Equation');

      // Unknown element
      const unknownEl = validateBalancedEquation('Xx2O -> 2Xx + O');
      expect(unknownEl.isBalanced).toBe(false);
      expect(unknownEl.statusText).toBe('Malformed Equation');
      expect(unknownEl.errorMessage).toContain('Unknown element');

      // Trailing invalid characters
      const invalidChars = validateBalancedEquation('2H2 + O2 -> 2H2O!!');
      expect(invalidChars.isBalanced).toBe(false);
      expect(invalidChars.statusText).toBe('Malformed Equation');

      // Malformed parentheses
      const badParen = validateBalancedEquation('Ca(OH + HCl -> CaCl2 + H2O');
      expect(badParen.isBalanced).toBe(false);
      expect(badParen.statusText).toBe('Malformed Equation');
    });
  });
});

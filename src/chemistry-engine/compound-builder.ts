/**
 * Synthesis & Compound Formation Engine
 * Simulates combining fundamental elements in stoichiometric proportions
 * to form chemical compounds, predicting bond types, visual states, and formulas.
 * Pure computation. Zero UI / DOM dependencies.
 */

import { getElementBySymbol, type ChemicalElement } from '../chemistry-data/elements';

export interface ElementProportion {
  element: ChemicalElement;
  ratio: number; // Stoichiometric integer ratio, e.g. 2 for H in H2O
  gramsOrMoles?: number;
}

export interface SynthesizedCompound {
  formula: string;               // e.g. "H2O", "NaCl", "CO2"
  formulaHtml: string;           // Formatted with <sub> tags: "H<sub>2</sub>O"
  commonName: string;            // e.g. "Water", "Table Salt"
  iupacName: string;             // e.g. "Oxidane", "Sodium chloride"
  bondType: 'Ionic' | 'Covalent' | 'Metallic' | 'Unsupported Combination';
  physicalState: 'gas' | 'liquid' | 'solid' | 'aqueous';
  appearanceColor: string;       // Color hex for visualization
  molarMass: number;             // g/mol
  synthesisEquation: string;     // e.g. "2H₂ + O₂ → 2H₂O"
  isExothermic: boolean;
  energyChangeKj: number;        // Enthalpy of formation ΔHf° (kJ/mol)
  description: string;
  molecularGeometry?: string;    // e.g. "Bent (104.5°)", "Linear (180°)", "Face-centered cubic"
  constituentAtoms: { symbol: string; count: number; color: string }[];
}

export interface SynthesisResult {
  success: boolean;
  compound?: SynthesizedCompound;
  unsupportedReason?: string;
  matchedRule?: string;
}

/**
 * Curated knowledge base of verified fundamental binary and ternary compounds.
 * If user mixes elements in matching or simplified ratios, produces exact chemical output.
 */
interface CuratedCompoundDefinition {
  elements: string[]; // Sorted symbols, e.g. ['H', 'O']
  ratios: number[];   // Matching ratios, e.g. [2, 1]
  compound: Omit<SynthesizedCompound, 'constituentAtoms'>;
}

const CURATED_SYNTHESIS_DATABASE: CuratedCompoundDefinition[] = [
  // H + O -> H2O (Water)
  {
    elements: ['H', 'O'],
    ratios: [2, 1],
    compound: {
      formula: 'H2O',
      formulaHtml: 'H<sub>2</sub>O',
      commonName: 'Water',
      iupacName: 'Oxidane',
      bondType: 'Covalent',
      physicalState: 'liquid',
      appearanceColor: '#38bdf8',
      molarMass: 18.015,
      synthesisEquation: '2H₂(g) + O₂(g) → 2H₂O(l)',
      isExothermic: true,
      energyChangeKj: -285.8,
      description: 'Universal polar solvent. Two hydrogen atoms form polar covalent bonds with one central oxygen atom.',
      molecularGeometry: 'Bent (104.5°)'
    }
  },
  // H + O -> H2O2 (Hydrogen Peroxide)
  {
    elements: ['H', 'O'],
    ratios: [1, 1],
    compound: {
      formula: 'H2O2',
      formulaHtml: 'H<sub>2</sub>O<sub>2</sub>',
      commonName: 'Hydrogen Peroxide',
      iupacName: 'Dioxidane',
      bondType: 'Covalent',
      physicalState: 'liquid',
      appearanceColor: '#e0f2fe',
      molarMass: 34.014,
      synthesisEquation: 'H₂(g) + O₂(g) → H₂O₂(l)',
      isExothermic: true,
      energyChangeKj: -187.8,
      description: 'Strong oxidizer with single O-O peroxide bond.',
      molecularGeometry: 'Non-planar skewed'
    }
  },
  // C + O -> CO2 (Carbon Dioxide)
  {
    elements: ['C', 'O'],
    ratios: [1, 2],
    compound: {
      formula: 'CO2',
      formulaHtml: 'CO<sub>2</sub>',
      commonName: 'Carbon Dioxide',
      iupacName: 'Carbon dioxide',
      bondType: 'Covalent',
      physicalState: 'gas',
      appearanceColor: '#f1f5f9',
      molarMass: 44.01,
      synthesisEquation: 'C(s) + O₂(g) → CO₂(g)',
      isExothermic: true,
      energyChangeKj: -393.5,
      description: 'Linear molecule with two C=O double bonds. Colorless, odorless greenhouse gas.',
      molecularGeometry: 'Linear (180°)'
    }
  },
  // C + O -> CO (Carbon Monoxide)
  {
    elements: ['C', 'O'],
    ratios: [1, 1],
    compound: {
      formula: 'CO',
      formulaHtml: 'CO',
      commonName: 'Carbon Monoxide',
      iupacName: 'Carbon monoxide',
      bondType: 'Covalent',
      physicalState: 'gas',
      appearanceColor: '#f8fafc',
      molarMass: 28.01,
      synthesisEquation: '2C(s) + O₂(g) → 2CO(g)',
      isExothermic: true,
      energyChangeKj: -110.5,
      description: 'Toxic, flammable gas containing a triple bond between carbon and oxygen.',
      molecularGeometry: 'Linear (180°)'
    }
  },
  // C + H -> CH4 (Methane)
  {
    elements: ['C', 'H'],
    ratios: [1, 4],
    compound: {
      formula: 'CH4',
      formulaHtml: 'CH<sub>4</sub>',
      commonName: 'Methane',
      iupacName: 'Methane',
      bondType: 'Covalent',
      physicalState: 'gas',
      appearanceColor: '#f8fafc',
      molarMass: 16.04,
      synthesisEquation: 'C(s) + 2H₂(g) → CH₄(g)',
      isExothermic: true,
      energyChangeKj: -74.8,
      description: 'Simplest alkane and primary component of natural gas. Four covalent C-H single bonds in tetrahedral geometry.',
      molecularGeometry: 'Tetrahedral (109.5°)'
    }
  },
  // N + H -> NH3 (Ammonia)
  {
    elements: ['H', 'N'],
    ratios: [3, 1],
    compound: {
      formula: 'NH3',
      formulaHtml: 'NH<sub>3</sub>',
      commonName: 'Ammonia',
      iupacName: 'Azane',
      bondType: 'Covalent',
      physicalState: 'gas',
      appearanceColor: '#eff6ff',
      molarMass: 17.031,
      synthesisEquation: 'N₂(g) + 3H₂(g) ⇌ 2NH₃(g) [Haber-Bosch]',
      isExothermic: true,
      energyChangeKj: -45.9,
      description: 'Pungent alkaline gas with a lone electron pair on nitrogen, imparting basic and nucleophilic character.',
      molecularGeometry: 'Trigonal pyramidal (107°)'
    }
  },
  // Na + Cl -> NaCl (Sodium Chloride)
  {
    elements: ['Cl', 'Na'],
    ratios: [1, 1],
    compound: {
      formula: 'NaCl',
      formulaHtml: 'NaCl',
      commonName: 'Table Salt',
      iupacName: 'Sodium chloride',
      bondType: 'Ionic',
      physicalState: 'solid',
      appearanceColor: '#ffffff',
      molarMass: 58.44,
      synthesisEquation: '2Na(s) + Cl₂(g) → 2NaCl(s)',
      isExothermic: true,
      energyChangeKj: -411.2,
      description: 'Face-centered cubic crystalline lattice formed by complete electron transfer from sodium to chlorine.',
      molecularGeometry: 'Face-Centered Cubic (Lattice)'
    }
  },
  // Mg + O -> MgO (Magnesium Oxide)
  {
    elements: ['Mg', 'O'],
    ratios: [1, 1],
    compound: {
      formula: 'MgO',
      formulaHtml: 'MgO',
      commonName: 'Magnesia',
      iupacName: 'Magnesium oxide',
      bondType: 'Ionic',
      physicalState: 'solid',
      appearanceColor: '#f8fafc',
      molarMass: 40.304,
      synthesisEquation: '2Mg(s) + O₂(g) → 2MgO(s)',
      isExothermic: true,
      energyChangeKj: -601.6,
      description: 'High-temperature refractory white powder formed by highly exothermic combustion of magnesium.',
      molecularGeometry: 'Rock-Salt Cubic Lattice'
    }
  },
  // Ca + Cl -> CaCl2 (Calcium Chloride)
  {
    elements: ['Ca', 'Cl'],
    ratios: [1, 2],
    compound: {
      formula: 'CaCl2',
      formulaHtml: 'CaCl<sub>2</sub>',
      commonName: 'Calcium Chloride',
      iupacName: 'Calcium chloride',
      bondType: 'Ionic',
      physicalState: 'solid',
      appearanceColor: '#f1f5f9',
      molarMass: 110.98,
      synthesisEquation: 'Ca(s) + Cl₂(g) → CaCl₂(s)',
      isExothermic: true,
      energyChangeKj: -795.8,
      description: 'Hygroscopic white salt forming Ca²⁺ and two Cl⁻ ions. Widely used for de-icing.',
      molecularGeometry: 'Orthorhombic Lattice'
    }
  },
  // Fe + S -> FeS (Iron(II) Sulfide)
  {
    elements: ['Fe', 'S'],
    ratios: [1, 1],
    compound: {
      formula: 'FeS',
      formulaHtml: 'FeS',
      commonName: 'Iron Sulfide',
      iupacName: 'Iron(II) sulfide',
      bondType: 'Ionic',
      physicalState: 'solid',
      appearanceColor: '#334155', // Dark slate black
      molarMass: 87.91,
      synthesisEquation: 'Fe(s) + S(s) → FeS(s) + Heat',
      isExothermic: true,
      energyChangeKj: -100.0,
      description: 'Black mineral formed by direct heating of iron filings and sulfur powder.',
      molecularGeometry: 'Hexagonal NiAs-type'
    }
  },
  // Cu + O -> CuO (Copper(II) Oxide)
  {
    elements: ['Cu', 'O'],
    ratios: [1, 1],
    compound: {
      formula: 'CuO',
      formulaHtml: 'CuO',
      commonName: 'Black Copper Oxide',
      iupacName: 'Copper(II) oxide',
      bondType: 'Ionic',
      physicalState: 'solid',
      appearanceColor: '#1e293b',
      molarMass: 79.545,
      synthesisEquation: '2Cu(s) + O₂(g) → 2CuO(s)',
      isExothermic: true,
      energyChangeKj: -157.3,
      description: 'Black solid oxide of copper used as a precursor in ceramics and pigments.',
      molecularGeometry: 'Monoclinic crystal'
    }
  },
  // H + Cl -> HCl (Hydrogen Chloride)
  {
    elements: ['Cl', 'H'],
    ratios: [1, 1],
    compound: {
      formula: 'HCl',
      formulaHtml: 'HCl',
      commonName: 'Hydrogen Chloride',
      iupacName: 'Chlorane',
      bondType: 'Covalent',
      physicalState: 'gas',
      appearanceColor: '#e0f2fe',
      molarMass: 36.46,
      synthesisEquation: 'H₂(g) + Cl₂(g) → 2HCl(g)',
      isExothermic: true,
      energyChangeKj: -92.3,
      description: 'Diatomic polar covalent gas that rapidly dissolves in water to form Hydrochloric acid.',
      molecularGeometry: 'Linear (180°)'
    }
  },
  // Al + O -> Al2O3 (Aluminium Oxide)
  {
    elements: ['Al', 'O'],
    ratios: [2, 3],
    compound: {
      formula: 'Al2O3',
      formulaHtml: 'Al<sub>2</sub>O<sub>3</sub>',
      commonName: 'Alumina',
      iupacName: 'Aluminium oxide',
      bondType: 'Ionic',
      physicalState: 'solid',
      appearanceColor: '#ffffff',
      molarMass: 101.96,
      synthesisEquation: '4Al(s) + 3O₂(g) → 2Al₂O₃(s)',
      isExothermic: true,
      energyChangeKj: -1675.7,
      description: 'Extremely durable, wear-resistant corundum mineral formed by oxidation of aluminium.',
      molecularGeometry: 'Trigonal Corundum'
    }
  }
];

// ---------------------------------------------------------------------------
// Algorithmic Stoichiometric Combination Engine
// ---------------------------------------------------------------------------

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function toRoman(num: number): string {
  const map: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
  return map[num] || String(num);
}

function getAnionRoot(symbol: string, defaultName: string): string {
  const stems: Record<string, string> = {
    F: 'fluoride',
    Cl: 'chloride',
    Br: 'bromide',
    I: 'iodide',
    At: 'astatide',
    O: 'oxide',
    S: 'sulfide',
    Se: 'selenide',
    Te: 'telluride',
    N: 'nitride',
    P: 'phosphide',
    As: 'arsenide',
    Sb: 'antimonide',
    C: 'carbide',
    Si: 'silicide',
    H: 'hydride',
  };
  return stems[symbol] || `${defaultName.toLowerCase()}ide`;
}

function resolveAlgorithmicBinarySynthesis(
  symA: string,
  ratioA: number,
  symB: string,
  ratioB: number
): SynthesisResult {
  const elA = getElementBySymbol(symA);
  const elB = getElementBySymbol(symB);
  if (!elA || !elB) {
    return { success: false, unsupportedReason: 'One or more selected elements are unknown.' };
  }

  // Handle noble gas inertness (except Xe + F)
  const isANoble = elA.category === 'noble-gas';
  const isBNoble = elB.category === 'noble-gas';
  if (isANoble || isBNoble) {
    const noble = isANoble ? elA : elB;
    const other = isANoble ? elB : elA;
    if (noble.symbol === 'Xe' && other.symbol === 'F') {
      const fRatio = isANoble ? ratioB : ratioA;
      const xeRatio = isANoble ? ratioA : ratioB;
      if (xeRatio === 1 && (fRatio === 2 || fRatio === 4 || fRatio === 6)) {
        const formula = `XeF${fRatio}`;
        return {
          success: true,
          compound: {
            formula,
            formulaHtml: `XeF<sub>${fRatio}</sub>`,
            commonName: `Xenon ${fRatio === 2 ? 'difluoride' : fRatio === 4 ? 'tetrafluoride' : 'hexafluoride'}`,
            iupacName: `Xenon ${fRatio === 2 ? 'difluoride' : fRatio === 4 ? 'tetrafluoride' : 'hexafluoride'}`,
            bondType: 'Covalent',
            physicalState: 'solid',
            appearanceColor: '#ffffff',
            molarMass: Number((elA.atomicMass * ratioA + elB.atomicMass * ratioB).toFixed(3)),
            synthesisEquation: `Xe(g) + ${fRatio / 2}F₂(g) → ${formula}(s)`,
            isExothermic: true,
            energyChangeKj: -164.0,
            description: `Noble gas fluoride synthesized under UV irradiation or high temperature.`,
            molecularGeometry: fRatio === 2 ? 'Linear' : fRatio === 4 ? 'Square planar' : 'Distorted octahedral',
            constituentAtoms: [
              { symbol: 'Xe', count: xeRatio, color: '#a855f7' },
              { symbol: 'F', count: fRatio, color: '#fed7aa' },
            ],
          },
          matchedRule: `Hypervalent noble gas synthesis for ${formula}`,
        };
      }
      return {
        success: false,
        unsupportedReason: `Non-stoichiometric ratio for Xe + F. Known valid xenon fluorides: XeF₂ (1:2), XeF₄ (1:4), or XeF₆ (1:6).`,
      };
    }
    return {
      success: false,
      unsupportedReason: `Unsupported chemical combination: Inert noble gas ${noble.name} (${noble.symbol}) possesses a full valence shell and does not form spontaneous bonds under standard conditions.`,
    };
  }

  // Handle metal-metal mixtures (intermetallic/alloys)
  const isMetalA = ['alkali-metal', 'alkaline-earth', 'transition-metal', 'lanthanide', 'actinide'].includes(elA.category);
  const isMetalB = ['alkali-metal', 'alkaline-earth', 'transition-metal', 'lanthanide', 'actinide'].includes(elB.category);
  if (isMetalA && isMetalB) {
    return {
      success: false,
      unsupportedReason: `Unsupported chemical combination: Metallic combination (${elA.name} + ${elB.name}) forms a solid-solution metallic alloy rather than a discrete stoichiometric chemical compound at STP.`,
    };
  }

  // Determine Cation (more electropositive, lower electronegativity) vs Anion (more electronegative)
  const enA = elA.electronegativity ?? 1.5;
  const enB = elB.electronegativity ?? 1.5;

  let cation = elA;
  let anion = elB;
  let cationRatio = ratioA;
  let anionRatio = ratioB;

  if (enA > enB) {
    cation = elB;
    anion = elA;
    cationRatio = ratioB;
    anionRatio = ratioA;
  } else if (enA === enB) {
    if (elA.group > elB.group) {
      cation = elB;
      anion = elA;
      cationRatio = ratioB;
      anionRatio = ratioA;
    }
  }

  // Collect positive valences for cation
  let posValences = cation.commonValences.filter(v => v > 0);
  if (posValences.length === 0) {
    if (cation.group === 1) posValences = [1];
    else if (cation.group === 2) posValences = [2];
    else if (cation.group === 13) posValences = [3];
    else if (cation.group === 14) posValences = [4];
    else posValences = [2];
  }

  // Collect negative valences for anion
  let negValences = anion.commonValences.filter(v => v < 0).map(v => Math.abs(v));
  if (negValences.length === 0) {
    if (anion.group === 17) negValences = [1];
    else if (anion.group === 16) negValences = [2];
    else if (anion.group === 15) negValences = [3];
    else if (anion.group === 14) negValences = [4];
    else if (anion.symbol === 'H') negValences = [1];
    else negValences = [1];
  }

  // Compute all valid (rc, ra) pairs
  const validPairs: { rc: number; ra: number; cationValence: number; anionValence: number }[] = [];
  for (const vc of posValences) {
    for (const va of negValences) {
      const g = gcd(vc, va);
      const rc = va / g;
      const ra = vc / g;
      if (!validPairs.some(p => p.rc === rc && p.ra === ra)) {
        validPairs.push({ rc, ra, cationValence: vc, anionValence: va });
      }
    }
  }

  // Simplify user ratio by gcd
  const userG = gcd(cationRatio, anionRatio);
  const userRc = cationRatio / userG;
  const userRa = anionRatio / userG;

  const matchedPair = validPairs.find(p => p.rc === userRc && p.ra === userRa);

  if (matchedPair) {
    const rc = matchedPair.rc;
    const ra = matchedPair.ra;
    const formula = `${cation.symbol}${rc > 1 ? rc : ''}${anion.symbol}${ra > 1 ? ra : ''}`;
    const formulaHtml = `${cation.symbol}${rc > 1 ? `<sub>${rc}</sub>` : ''}${anion.symbol}${ra > 1 ? `<sub>${ra}</sub>` : ''}`;
    
    // Name construction
    const hasMultipleStates = posValences.length > 1;
    const roman = hasMultipleStates ? `(${toRoman(matchedPair.cationValence)})` : '';
    const anionRoot = getAnionRoot(anion.symbol, anion.name);
    const iupacName = `${cation.name}${roman ? ' ' + roman : ''} ${anionRoot}`;
    const commonName = `${cation.name} ${anionRoot}`;

    // Bond type
    const deltaEn = Math.abs(enA - enB);
    const isMetalCation = ['alkali-metal', 'alkaline-earth', 'transition-metal', 'post-transition-metal', 'lanthanide', 'actinide'].includes(cation.category);
    const bondType: 'Ionic' | 'Covalent' = (deltaEn >= 1.7 || isMetalCation) ? 'Ionic' : 'Covalent';

    const molarMass = Number((rc * cation.atomicMass + ra * anion.atomicMass).toFixed(3));
    const physicalState: 'gas' | 'liquid' | 'solid' | 'aqueous' = bondType === 'Ionic' ? 'solid' : (molarMass < 50 ? 'gas' : 'solid');
    const energyChangeKj = Number((-110 * Math.max(0.5, deltaEn) * (rc + ra)).toFixed(1));

    const stateSymbol = (sym: string, st: string) => st === 'gas' ? `${sym}₂(g)` : (st === 'liquid' && sym === 'Br' ? 'Br₂(l)' : `${sym}(s)`);
    const eqLeft = `${rc > 1 ? rc : ''}${stateSymbol(cation.symbol, cation.standardState)} + ${ra > 1 ? ra : ''}${stateSymbol(anion.symbol, anion.standardState)}`;
    const stateSuffix = physicalState === 'solid' ? 's' : (physicalState === 'gas' ? 'g' : 'l');
    const synthesisEquation = `${eqLeft} → ${formula}(${stateSuffix})`;

    return {
      success: true,
      compound: {
        formula,
        formulaHtml,
        commonName,
        iupacName,
        bondType,
        physicalState,
        appearanceColor: cation.color || '#e2e8f0',
        molarMass,
        synthesisEquation,
        isExothermic: true,
        energyChangeKj,
        description: `${iupacName} is formed by stoichiometric combination of ${cation.name} and ${anion.name}. Oxidation states: ${cation.symbol}(+${matchedPair.cationValence}), ${anion.symbol}(-${matchedPair.anionValence}). Electronegativity difference Δχ = ${deltaEn.toFixed(2)}.`,
        molecularGeometry: bondType === 'Ionic' ? 'Ionic Crystal Lattice' : (rc === 1 && ra === 1 ? 'Linear' : rc === 1 && ra === 2 ? 'Bent' : 'Molecular polyhedral'),
        constituentAtoms: [
          { symbol: cation.symbol, count: rc, color: cation.color },
          { symbol: anion.symbol, count: ra, color: anion.color },
        ],
      },
      matchedRule: `Algorithmic stoichiometric valence balance for ${formula}`,
    };
  }

  // Not matched: suggest valid ratios
  const suggestions = validPairs.map(p => {
    const f = `${cation.symbol}${p.rc > 1 ? p.rc : ''}${anion.symbol}${p.ra > 1 ? p.ra : ''}`;
    return `${f} (${cation.symbol}:${p.rc}, ${anion.symbol}:${p.ra})`;
  }).join(' or ');

  return {
    success: false,
    unsupportedReason: `Non-stoichiometric ratio for ${cation.symbol} + ${anion.symbol}. Known valid stoichiometric compounds: ${suggestions}.`,
  };
}

/**
 * Synthesizes a compound from a selection of elements and their stoichiometric proportions.
 * Checks the curated knowledge base first; if not present, falls back to the algorithmic
 * stoichiometric valence engine across all 118 elements.
 */
export function synthesizeCompoundFromElements(
  selectedElements: { symbol: string; ratio: number }[]
): SynthesisResult {
  if (!selectedElements || selectedElements.length < 2) {
    return {
      success: false,
      unsupportedReason: 'A compound requires at least 2 distinct chemical elements.'
    };
  }

  // Filter out zero ratio elements and sort alphabetically by symbol
  const active = selectedElements
    .filter(e => e.ratio > 0)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

  if (active.length < 2) {
    return {
      success: false,
      unsupportedReason: 'Please select at least 2 active elements with non-zero ratios.'
    };
  }

  // 1. Try curated database first
  const match = CURATED_SYNTHESIS_DATABASE.find(def => {
    if (def.elements.length !== active.length) return false;
    for (let i = 0; i < def.elements.length; i++) {
      if (def.elements[i] !== active[i].symbol) return false;
      if (def.ratios[i] !== active[i].ratio) return false;
    }
    return true;
  });

  if (match) {
    const constituentAtoms = active.map(item => {
      const el = getElementBySymbol(item.symbol);
      return {
        symbol: item.symbol,
        count: item.ratio,
        color: el?.color || '#cbd5e1'
      };
    });

    return {
      success: true,
      compound: {
        ...match.compound,
        constituentAtoms
      },
      matchedRule: `Curated stoichiometric synthesis for ${match.compound.formula}`
    };
  }

  // 2. Check if in curated database with non-matching ratio
  const matchingElementPairs = CURATED_SYNTHESIS_DATABASE.filter(def => {
    if (def.elements.length !== active.length) return false;
    return def.elements.every((el, idx) => el === active[idx].symbol);
  });

  if (matchingElementPairs.length > 0) {
    const suggestions = matchingElementPairs.map(
      p => `${p.compound.formula} (${p.elements.map((el, i) => `${el}:${p.ratios[i]}`).join(', ')})`
    ).join(' or ');

    return {
      success: false,
      unsupportedReason: `Non-stoichiometric ratio for ${active.map(a => a.symbol).join(' + ')}. Known valid ratios: ${suggestions}.`
    };
  }

  // 3. If binary (2 elements), execute Algorithmic Stoichiometric Valence Resolver
  if (active.length === 2) {
    return resolveAlgorithmicBinarySynthesis(
      active[0].symbol,
      active[0].ratio,
      active[1].symbol,
      active[1].ratio
    );
  }

  return {
    success: false,
    unsupportedReason: `Unsupported chemical combination: The ternary reaction between ${active.map(a => a.symbol).join(', ')} is not currently modeled in this verified educational catalogue.`
  };
}

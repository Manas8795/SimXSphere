/**
 * Expanded Chemical Reagents & Compounds Database
 * Includes elements, acids, bases, salts, organics, indicators, and reagents
 * with physical states, color hex, molar mass, safety/hazard codes, and 3D atom ball representations.
 */

export interface ParticleAtom3D {
  symbol: string;
  name: string;
  color: string;
  radius: number; // For 3D ball radius
  x: number;      // 3D local coordinate
  y: number;
  z: number;
}

export interface LabChemicalItem {
  id: string;
  name: string;
  formula: string;
  formulaHtml: string;
  category: 'acid' | 'base' | 'salt' | 'metal' | 'nonmetal' | 'indicator' | 'solvent';
  state: 'liquid' | 'solid' | 'gas' | 'powder';
  color: string;           // Physical liquid/powder appearance hex
  defaultMolarity?: number;// Default M (if aqueous)
  defaultGrams?: number;   // Default grams (if solid)
  molarMass: number;       // g/mol
  ph: number;
  hazardBadge: 'Corrosive' | 'Flammable' | 'Oxidizer' | 'Irritant' | 'Safe';
  description: string;
  molecular3D: {
    geometryName: string;
    atoms: ParticleAtom3D[];
    bonds: [number, number][]; // Index pairs for bonds
  };
}

export const LAB_CHEMICALS: LabChemicalItem[] = [
  // 1. Hydrochloric Acid
  {
    id: 'hcl',
    name: 'Hydrochloric Acid',
    formula: 'HCl',
    formulaHtml: 'HCl',
    category: 'acid',
    state: 'liquid',
    color: '#e0f2fe',
    defaultMolarity: 1.0,
    molarMass: 36.46,
    ph: 1.0,
    hazardBadge: 'Corrosive',
    description: 'Strong aqueous acid. Completely dissociates into H⁺ and Cl⁻ ions.',
    molecular3D: {
      geometryName: 'Linear',
      atoms: [
        { symbol: 'H', name: 'Hydrogen', color: '#e2e8f0', radius: 14, x: -16, y: 0, z: 0 },
        { symbol: 'Cl', name: 'Chlorine', color: '#22c55e', radius: 24, x: 18, y: 0, z: 0 },
      ],
      bonds: [[0, 1]],
    },
  },

  // 2. Sodium Hydroxide
  {
    id: 'naoh',
    name: 'Sodium Hydroxide',
    formula: 'NaOH',
    formulaHtml: 'NaOH',
    category: 'base',
    state: 'liquid',
    color: '#f0fdf4',
    defaultMolarity: 1.0,
    molarMass: 40.00,
    ph: 14.0,
    hazardBadge: 'Corrosive',
    description: 'Strong alkaline caustic soda. Completely dissociates into Na⁺ and OH⁻.',
    molecular3D: {
      geometryName: 'Ionic Pair',
      atoms: [
        { symbol: 'Na', name: 'Sodium', color: '#a855f7', radius: 22, x: -25, y: 0, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 18, x: 10, y: 0, z: 0 },
        { symbol: 'H', name: 'Hydrogen', color: '#f8fafc', radius: 12, x: 26, y: 12, z: 0 },
      ],
      bonds: [[1, 2]],
    },
  },

  // 3. Sulfuric Acid
  {
    id: 'h2so4',
    name: 'Sulfuric Acid',
    formula: 'H2SO4',
    formulaHtml: 'H<sub>2</sub>SO<sub>4</sub>',
    category: 'acid',
    state: 'liquid',
    color: '#fef3c7',
    defaultMolarity: 1.0,
    molarMass: 98.08,
    ph: 0.5,
    hazardBadge: 'Corrosive',
    description: 'Dense diprotic mineral acid. Strongly exothermic when diluted in water.',
    molecular3D: {
      geometryName: 'Tetrahedral',
      atoms: [
        { symbol: 'S', name: 'Sulfur', color: '#eab308', radius: 24, x: 0, y: 0, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: 0, y: -26, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: 0, y: 26, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: -26, y: 0, z: 10 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: 26, y: 0, z: -10 },
        { symbol: 'H', name: 'Hydrogen', color: '#f8fafc', radius: 10, x: -38, y: 0, z: 18 },
        { symbol: 'H', name: 'Hydrogen', color: '#f8fafc', radius: 10, x: 38, y: 0, z: -18 },
      ],
      bonds: [[0, 1], [0, 2], [0, 3], [0, 4], [3, 5], [4, 6]],
    },
  },

  // 4. Copper(II) Sulfate
  {
    id: 'cuso4',
    name: 'Copper(II) Sulfate',
    formula: 'CuSO4',
    formulaHtml: 'CuSO<sub>4</sub>',
    category: 'salt',
    state: 'liquid',
    color: '#0284c7', // Radiant bright lab blue
    defaultMolarity: 0.5,
    molarMass: 159.61,
    ph: 4.5,
    hazardBadge: 'Irritant',
    description: 'Deep royal blue aqueous solution containing hydrated Cu²⁺ and SO₄²⁻ ions.',
    molecular3D: {
      geometryName: 'Coordination Octahedron',
      atoms: [
        { symbol: 'Cu', name: 'Copper', color: '#f97316', radius: 24, x: 0, y: 0, z: 0 },
        { symbol: 'S', name: 'Sulfur', color: '#eab308', radius: 20, x: 40, y: 0, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 14, x: 40, y: -20, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 14, x: 40, y: 20, z: 0 },
      ],
      bonds: [[0, 1], [1, 2], [1, 3]],
    },
  },

  // 5. Silver Nitrate
  {
    id: 'agno3',
    name: 'Silver Nitrate',
    formula: 'AgNO3',
    formulaHtml: 'AgNO<sub>3</sub>',
    category: 'salt',
    state: 'liquid',
    color: '#f8fafc',
    defaultMolarity: 0.5,
    molarMass: 169.87,
    ph: 6.2,
    hazardBadge: 'Oxidizer',
    description: 'Soluble silver salt. Reacts with chlorides to form instant white precipitate AgCl↓.',
    molecular3D: {
      geometryName: 'Trigonal Planar',
      atoms: [
        { symbol: 'Ag', name: 'Silver', color: '#cbd5e1', radius: 24, x: -30, y: 0, z: 0 },
        { symbol: 'N', name: 'Nitrogen', color: '#3b82f6', radius: 18, x: 15, y: 0, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 14, x: 30, y: -18, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 14, x: 30, y: 18, z: 0 },
      ],
      bonds: [[1, 2], [1, 3]],
    },
  },

  // 6. Sodium Carbonate
  {
    id: 'na2co3',
    name: 'Sodium Carbonate',
    formula: 'Na2CO3',
    formulaHtml: 'Na<sub>2</sub>CO<sub>3</sub>',
    category: 'base',
    state: 'powder',
    color: '#f1f5f9',
    defaultMolarity: 0.5,
    molarMass: 105.99,
    ph: 11.5,
    hazardBadge: 'Irritant',
    description: 'Washing soda. Evolves vigorous CO₂ gas bubbles upon acid addition.',
    molecular3D: {
      geometryName: 'Trigonal Carbonate',
      atoms: [
        { symbol: 'C', name: 'Carbon', color: '#475569', radius: 18, x: 0, y: 0, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: 0, y: -25, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: -22, y: 14, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: 22, y: 14, z: 0 },
      ],
      bonds: [[0, 1], [0, 2], [0, 3]],
    },
  },

  // 7. Aqueous Ammonia
  {
    id: 'nh3',
    name: 'Aqueous Ammonia',
    formula: 'NH3(aq)',
    formulaHtml: 'NH<sub>3</sub>',
    category: 'base',
    state: 'liquid',
    color: '#f8fafc',
    defaultMolarity: 1.0,
    molarMass: 17.03,
    ph: 11.2,
    hazardBadge: 'Corrosive',
    description: 'Weak alkaline base. Displaces ligands to form deep azure tetraamminecopper(II).',
    molecular3D: {
      geometryName: 'Trigonal Pyramidal',
      atoms: [
        { symbol: 'N', name: 'Nitrogen', color: '#3b82f6', radius: 20, x: 0, y: -8, z: 0 },
        { symbol: 'H', name: 'Hydrogen', color: '#f8fafc', radius: 12, x: -18, y: 12, z: 8 },
        { symbol: 'H', name: 'Hydrogen', color: '#f8fafc', radius: 12, x: 18, y: 12, z: 8 },
        { symbol: 'H', name: 'Hydrogen', color: '#f8fafc', radius: 12, x: 0, y: 12, z: -16 },
      ],
      bonds: [[0, 1], [0, 2], [0, 3]],
    },
  },

  // 8. Iron Powder / Filings
  {
    id: 'fe',
    name: 'Iron Metal (Fe)',
    formula: 'Fe',
    formulaHtml: 'Fe',
    category: 'metal',
    state: 'powder',
    color: '#64748b',
    defaultGrams: 5.0,
    molarMass: 55.85,
    ph: 7.0,
    hazardBadge: 'Safe',
    description: 'Transition metal powder. Reacts with sulfur powder on heating to form FeS.',
    molecular3D: {
      geometryName: 'Metallic Sphere',
      atoms: [
        { symbol: 'Fe', name: 'Iron', color: '#64748b', radius: 26, x: 0, y: 0, z: 0 },
      ],
      bonds: [],
    },
  },

  // 9. Sulfur Powder
  {
    id: 's',
    name: 'Sulfur Powder (S8)',
    formula: 'S',
    formulaHtml: 'S',
    category: 'nonmetal',
    state: 'powder',
    color: '#facc15', // Vibrant yellow
    defaultGrams: 5.0,
    molarMass: 32.06,
    ph: 7.0,
    hazardBadge: 'Safe',
    description: 'Bright yellow crystalline non-metal powder. Direct synthesis with iron forms black FeS.',
    molecular3D: {
      geometryName: 'Crown Octasulfur',
      atoms: [
        { symbol: 'S', name: 'Sulfur', color: '#facc15', radius: 20, x: -18, y: -18, z: 0 },
        { symbol: 'S', name: 'Sulfur', color: '#facc15', radius: 20, x: 18, y: -18, z: 0 },
        { symbol: 'S', name: 'Sulfur', color: '#facc15', radius: 20, x: 26, y: 10, z: 0 },
        { symbol: 'S', name: 'Sulfur', color: '#facc15', radius: 20, x: -26, y: 10, z: 0 },
      ],
      bonds: [[0, 1], [1, 2], [2, 3], [3, 0]],
    },
  },

  // 10. Zinc Metal Strips
  {
    id: 'zn',
    name: 'Zinc Metal (Zn)',
    formula: 'Zn',
    formulaHtml: 'Zn',
    category: 'metal',
    state: 'solid',
    color: '#cbd5e1',
    defaultGrams: 5.0,
    molarMass: 65.38,
    ph: 7.0,
    hazardBadge: 'Safe',
    description: 'Silvery active metal. Reacts briskly with hydrochloric acid evolving flammable H₂ gas.',
    molecular3D: {
      geometryName: 'Hexagonal Close Packed',
      atoms: [
        { symbol: 'Zn', name: 'Zinc', color: '#94a3b8', radius: 24, x: 0, y: 0, z: 0 },
      ],
      bonds: [],
    },
  },

  // 11. Phenolphthalein Indicator
  {
    id: 'phenolphthalein',
    name: 'Phenolphthalein Indicator',
    formula: 'C20H14O4',
    formulaHtml: 'C<sub>20</sub>H<sub>14</sub>O<sub>4</sub>',
    category: 'indicator',
    state: 'liquid',
    color: '#ffffff',
    defaultMolarity: 0.05,
    molarMass: 318.32,
    ph: 7.0,
    hazardBadge: 'Flammable',
    description: 'Acid-base indicator. Colorless in acidic solution (pH < 8.2), turns intense vibrant magenta in basic solution (pH > 8.2).',
    molecular3D: {
      geometryName: 'Aromatic Triaryl Methane',
      atoms: [
        { symbol: 'C', name: 'Core', color: '#475569', radius: 18, x: 0, y: 0, z: 0 },
        { symbol: 'O', name: 'Lactone', color: '#ec4899', radius: 16, x: 22, y: 0, z: 0 },
      ],
      bonds: [[0, 1]],
    },
  },

  // 12. Distilled Water
  {
    id: 'h2o',
    name: 'Distilled Water (H2O)',
    formula: 'H2O',
    formulaHtml: 'H<sub>2</sub>O',
    category: 'solvent',
    state: 'liquid',
    color: '#f8fafc',
    defaultMolarity: 55.5,
    molarMass: 18.015,
    ph: 7.0,
    hazardBadge: 'Safe',
    description: 'Pure neutral laboratory solvent. Serves as aqueous reaction medium.',
    molecular3D: {
      geometryName: 'Bent (104.5°)',
      atoms: [
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 20, x: 0, y: -6, z: 0 },
        { symbol: 'H', name: 'Hydrogen', color: '#f8fafc', radius: 12, x: -18, y: 12, z: 0 },
        { symbol: 'H', name: 'Hydrogen', color: '#f8fafc', radius: 12, x: 18, y: 12, z: 0 },
      ],
      bonds: [[0, 1], [0, 2]],
    },
  },

  // 13. Nitric Acid
  {
    id: 'hno3',
    name: 'Nitric Acid',
    formula: 'HNO3',
    formulaHtml: 'HNO<sub>3</sub>',
    category: 'acid',
    state: 'liquid',
    color: '#fef9c3',
    defaultMolarity: 1.0,
    molarMass: 63.01,
    ph: 1.0,
    hazardBadge: 'Oxidizer',
    description: 'Strong mineral oxidizing acid used in nitration and metal dissolution.',
    molecular3D: {
      geometryName: 'Planar',
      atoms: [
        { symbol: 'N', name: 'Nitrogen', color: '#3b82f6', radius: 18, x: 0, y: 0, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: 0, y: -24, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: -22, y: 14, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: 22, y: 14, z: 0 },
        { symbol: 'H', name: 'Hydrogen', color: '#f8fafc', radius: 10, x: -35, y: 22, z: 0 },
      ],
      bonds: [[0, 1], [0, 2], [0, 3], [2, 4]],
    },
  },

  // 14. Acetic Acid
  {
    id: 'ch3cooh',
    name: 'Acetic Acid (Ethanoic Acid)',
    formula: 'CH3COOH',
    formulaHtml: 'CH<sub>3</sub>COOH',
    category: 'acid',
    state: 'liquid',
    color: '#f8fafc',
    defaultMolarity: 1.0,
    molarMass: 60.05,
    ph: 2.8,
    hazardBadge: 'Corrosive',
    description: 'Weak organic carboxylic acid. Dissociates partially with vinegar-like aroma.',
    molecular3D: {
      geometryName: 'Planar Carboxyl',
      atoms: [
        { symbol: 'C', name: 'Methyl C', color: '#475569', radius: 18, x: -22, y: 0, z: 0 },
        { symbol: 'C', name: 'Carbonyl C', color: '#475569', radius: 18, x: 14, y: 0, z: 0 },
        { symbol: 'O', name: 'Carbonyl O', color: '#ef4444', radius: 16, x: 25, y: -20, z: 0 },
        { symbol: 'O', name: 'Hydroxyl O', color: '#ef4444', radius: 16, x: 25, y: 20, z: 0 },
        { symbol: 'H', name: 'Hydroxyl H', color: '#f8fafc', radius: 10, x: 42, y: 18, z: 0 },
      ],
      bonds: [[0, 1], [1, 2], [1, 3], [3, 4]],
    },
  },

  // 15. Potassium Hydroxide
  {
    id: 'koh',
    name: 'Potassium Hydroxide',
    formula: 'KOH',
    formulaHtml: 'KOH',
    category: 'base',
    state: 'liquid',
    color: '#f0fdf4',
    defaultMolarity: 1.0,
    molarMass: 56.11,
    ph: 14.0,
    hazardBadge: 'Corrosive',
    description: 'Strong caustic alkali. Dissociates into K⁺ and OH⁻.',
    molecular3D: {
      geometryName: 'Ionic Pair',
      atoms: [
        { symbol: 'K', name: 'Potassium', color: '#8b5cf6', radius: 24, x: -24, y: 0, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 18, x: 12, y: 0, z: 0 },
        { symbol: 'H', name: 'Hydrogen', color: '#f8fafc', radius: 12, x: 28, y: 10, z: 0 },
      ],
      bonds: [[1, 2]],
    },
  },

  // 16. Sodium Bicarbonate
  {
    id: 'nahco3',
    name: 'Sodium Bicarbonate',
    formula: 'NaHCO3',
    formulaHtml: 'NaHCO<sub>3</sub>',
    category: 'salt',
    state: 'powder',
    color: '#f8fafc',
    defaultGrams: 5.0,
    molarMass: 84.01,
    ph: 8.3,
    hazardBadge: 'Safe',
    description: 'Baking soda. Rapidly releases fizzy CO₂ gas when combined with acids.',
    molecular3D: {
      geometryName: 'Trigonal Bicarbonate',
      atoms: [
        { symbol: 'Na', name: 'Sodium', color: '#a855f7', radius: 20, x: -34, y: 0, z: 0 },
        { symbol: 'C', name: 'Carbon', color: '#475569', radius: 18, x: 0, y: 0, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: 0, y: -24, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: 22, y: 14, z: 0 },
        { symbol: 'O', name: 'Oxygen', color: '#ef4444', radius: 16, x: -16, y: 18, z: 0 },
        { symbol: 'H', name: 'Hydrogen', color: '#f8fafc', radius: 10, x: 36, y: 18, z: 0 },
      ],
      bonds: [[1, 2], [1, 3], [1, 4], [3, 5]],
    },
  },

  // 17. Potassium Iodide
  {
    id: 'ki',
    name: 'Potassium Iodide',
    formula: 'KI',
    formulaHtml: 'KI',
    category: 'salt',
    state: 'liquid',
    color: '#f8fafc',
    defaultMolarity: 0.5,
    molarMass: 166.0,
    ph: 7.0,
    hazardBadge: 'Safe',
    description: 'Clear iodide solution. Yields radiant canary-yellow PbI₂ precipitate with lead salts.',
    molecular3D: {
      geometryName: 'Diatomic Ionic',
      atoms: [
        { symbol: 'K', name: 'Potassium', color: '#8b5cf6', radius: 22, x: -18, y: 0, z: 0 },
        { symbol: 'I', name: 'Iodine', color: '#7c3aed', radius: 26, x: 20, y: 0, z: 0 },
      ],
      bonds: [[0, 1]],
    },
  },

  // 18. Lead(II) Nitrate
  {
    id: 'pbno32',
    name: 'Lead(II) Nitrate',
    formula: 'Pb(NO3)2',
    formulaHtml: 'Pb(NO<sub>3</sub>)<sub>2</sub>',
    category: 'salt',
    state: 'liquid',
    color: '#f8fafc',
    defaultMolarity: 0.5,
    molarMass: 331.2,
    ph: 4.2,
    hazardBadge: 'Corrosive',
    description: 'Clear lead solution. Forms legendary "Golden Rain" crystalline yellow precipitate with KI.',
    molecular3D: {
      geometryName: 'Linear Nitrate Complex',
      atoms: [
        { symbol: 'Pb', name: 'Lead', color: '#64748b', radius: 28, x: 0, y: 0, z: 0 },
        { symbol: 'N', name: 'Nitrogen', color: '#3b82f6', radius: 18, x: -35, y: 0, z: 0 },
        { symbol: 'N', name: 'Nitrogen', color: '#3b82f6', radius: 18, x: 35, y: 0, z: 0 },
      ],
      bonds: [[0, 1], [0, 2]],
    },
  },

  // 19. Barium Chloride
  {
    id: 'bacl2',
    name: 'Barium Chloride',
    formula: 'BaCl2',
    formulaHtml: 'BaCl<sub>2</sub>',
    category: 'salt',
    state: 'liquid',
    color: '#f8fafc',
    defaultMolarity: 0.5,
    molarMass: 208.23,
    ph: 6.5,
    hazardBadge: 'Corrosive',
    description: 'Standard reagent for sulfate detection. Forms insoluble dense white BaSO₄ precipitate.',
    molecular3D: {
      geometryName: 'Linear Triatomic',
      atoms: [
        { symbol: 'Ba', name: 'Barium', color: '#0284c7', radius: 28, x: 0, y: 0, z: 0 },
        { symbol: 'Cl', name: 'Chlorine', color: '#22c55e', radius: 22, x: -32, y: 0, z: 0 },
        { symbol: 'Cl', name: 'Chlorine', color: '#22c55e', radius: 22, x: 32, y: 0, z: 0 },
      ],
      bonds: [[0, 1], [0, 2]],
    },
  },

  // 20. Magnesium Metal
  {
    id: 'mg',
    name: 'Magnesium Ribbon (Mg)',
    formula: 'Mg',
    formulaHtml: 'Mg',
    category: 'metal',
    state: 'solid',
    color: '#94a3b8',
    defaultGrams: 2.0,
    molarMass: 24.305,
    ph: 7.0,
    hazardBadge: 'Flammable',
    description: 'Lightweight reactive alkaline earth metal ribbon. Vigorous effervescence with acids.',
    molecular3D: {
      geometryName: 'Metallic Lattice',
      atoms: [
        { symbol: 'Mg', name: 'Magnesium', color: '#94a3b8', radius: 24, x: 0, y: 0, z: 0 },
      ],
      bonds: [],
    },
  },

  // 21. Universal Indicator
  {
    id: 'universal_indicator',
    name: 'Universal Indicator',
    formula: 'Universal Ind.',
    formulaHtml: 'Univ. Ind.',
    category: 'indicator',
    state: 'liquid',
    color: '#22c55e', // Neutral green at pH 7
    defaultMolarity: 0.02,
    molarMass: 200.0,
    ph: 7.0,
    hazardBadge: 'Safe',
    description: 'Broad-spectrum indicator solution: Red in strong acids, green at pH 7, purple in strong bases.',
    molecular3D: {
      geometryName: 'Conjugated Dye System',
      atoms: [
        { symbol: 'C', name: 'Dye Nucleus', color: '#22c55e', radius: 22, x: 0, y: 0, z: 0 },
        { symbol: 'O', name: 'Chromophore', color: '#ef4444', radius: 16, x: 20, y: 0, z: 0 },
      ],
      bonds: [[0, 1]],
    },
  },
];


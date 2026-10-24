import type { LabChemicalItem } from '../chemistry-data/reagents';

export interface DroppedReagentItem {
  instanceId: string;
  chemical: LabChemicalItem;
  quantityCount: number; // e.g. 1x, 2x, 3x dropped
  volumeMl: number;      // Liquid volume in mL
  molarityM: number;     // Concentration M
  massGrams: number;     // Mass in grams (if solid/powder)
}

export interface ReactionOutcome {
  hasReacted: boolean;
  status: 'idle' | 'single' | 'reaction' | 'mixture' | 'unsupported';
  reactionTitle: string;
  equation: string;
  reactionType: 'Neutralization' | 'Precipitation' | 'Effervescence (Gas)' | 'Complexation' | 'Redox Synthesis' | 'Dilution' | 'None';
  finalColor: string; // CSS color or gradient
  secondaryColor?: string;
  finalPh: number;
  finalTempC: number;
  deltaTC: number;
  bubbling: {
    active: boolean;
    gasFormula: string;
    intensity: number; // 0 to 100
    description: string;
  };
  precipitate: {
    formed: boolean;
    name: string;
    formula: string;
    color: string;
    massGrams: number;
  };
  explanation: string;
  spectatorIons: string[];
  reactingIons: string[];
  productFormula?: string;
  product3DRefId?: string; // Links to 3D representation
}

/**
 * Multi-reagent reaction solver for the drag-and-drop Workplane
 */
export function solveWorkplaneReaction(items: DroppedReagentItem[]): ReactionOutcome {
  if (!items || items.length === 0) {
    return {
      hasReacted: false,
      status: 'idle',
      reactionTitle: 'Workplane Beaker Empty',
      equation: 'Empty Glass Beaker (0 mL)',
      reactionType: 'None',
      finalColor: 'transparent',
      finalPh: 7.0,
      finalTempC: 22.0,
      deltaTC: 0,
      bubbling: { active: false, gasFormula: '', intensity: 0, description: '' },
      precipitate: { formed: false, name: '', formula: '', color: '', massGrams: 0 },
      explanation: 'The workspace reaction beaker is currently empty. Drag chemical reagents from the sidebar shelf and drop them into the beaker to begin.',
      spectatorIons: [],
      reactingIons: [],
    };
  }

  // If only 1 reagent in beaker
  if (items.length === 1) {
    const single = items[0];
    return {
      hasReacted: false,
      status: 'single',
      reactionTitle: `${single.chemical.name} Solution`,
      equation: `${single.chemical.formula} (Single Reagent - ${single.volumeMl.toFixed(0)} mL @ ${single.molarityM.toFixed(2)} M)`,
      reactionType: 'Dilution',
      finalColor: single.chemical.color,
      finalPh: single.chemical.ph,
      finalTempC: 22.0,
      deltaTC: 0,
      bubbling: { active: false, gasFormula: '', intensity: 0, description: 'No gas evolution' },
      precipitate: { formed: false, name: '', formula: '', color: '', massGrams: 0 },
      explanation: `${single.chemical.name} (${single.chemical.formula}) is resting in the beaker. Drag another compound into the beaker to trigger a chemical reaction.`,
      spectatorIons: [],
      reactingIons: [],
      product3DRefId: single.chemical.id,
    };
  }

  // Extract quick lookup map
  const chemMap = new Map<string, DroppedReagentItem>();
  for (const it of items) {
    chemMap.set(it.chemical.id, it);
  }

  const has = (id: string) => chemMap.has(id);
  const get = (id: string) => chemMap.get(id)!;

  const hasPhenol = has('phenolphthalein');
  const hasUnivInd = has('universal_indicator');

  // Helper for computing indicator color from pH
  const resolveIndicatorColor = (ph: number, baseColor: string) => {
    if (hasUnivInd) {
      if (ph < 3.0) return '#ef4444'; // Red
      if (ph < 6.0) return '#f59e0b'; // Orange
      if (ph <= 7.5) return '#22c55e'; // Green
      if (ph <= 9.5) return '#06b6d4'; // Blue
      return '#8b5cf6'; // Violet
    }
    if (hasPhenol) {
      if (ph >= 8.2) return '#ec4899'; // Vibrant magenta pink
      return '#f8fafc'; // Clear colorless
    }
    return baseColor;
  };

  // 1. Precipitation: Lead(II) Nitrate + Potassium Iodide (Golden Rain)
  if (has('pbno32') && has('ki')) {
    const lead = get('pbno32');
    const ki = get('ki');
    const molesLead = (lead.volumeMl * lead.molarityM) / 1000;
    const molesKi = (ki.volumeMl * ki.molarityM) / 1000;
    const limitingMoles = Math.min(molesLead, molesKi / 2);
    const pptGrams = Number((limitingMoles * 461.0).toFixed(2)); // PbI2 molar mass: 461 g/mol

    return {
      hasReacted: true,
      status: 'reaction',
      reactionTitle: 'Golden Rain Precipitation (Lead(II) Iodide)',
      equation: 'Pb(NO₃)₂(aq) + 2KI(aq) → PbI₂↓ (s) + 2KNO₃(aq)',
      reactionType: 'Precipitation',
      finalColor: '#facc15', // Vibrant golden canary yellow
      finalPh: 5.8,
      finalTempC: 23.2,
      deltaTC: 1.2,
      bubbling: { active: false, gasFormula: '', intensity: 0, description: '' },
      precipitate: {
        formed: true,
        name: 'Lead(II) Iodide',
        formula: 'PbI₂',
        color: '#facc15',
        massGrams: Math.max(0.2, pptGrams),
      },
      explanation: 'A classic precipitation reaction. Soluble aqueous Pb²⁺ cations encounter I⁻ anions, forming bright crystalline canary-yellow Lead(II) Iodide PbI₂ precipitate.',
      spectatorIons: ['K⁺', 'NO₃⁻'],
      reactingIons: ['Pb²⁺', '2I⁻'],
      productFormula: 'PbI2',
      product3DRefId: 'pbno32',
    };
  }

  // 2. Precipitation: Silver Nitrate + Hydrochloric Acid (or BaCl2)
  if (has('agno3') && (has('hcl') || has('bacl2'))) {
    const ag = get('agno3');
    const clReagent = has('hcl') ? get('hcl') : get('bacl2');
    const molesAg = (ag.volumeMl * ag.molarityM) / 1000;
    const molesCl = (clReagent.volumeMl * clReagent.molarityM * (has('bacl2') ? 2 : 1)) / 1000;
    const limiting = Math.min(molesAg, molesCl);
    const pptMass = Number((limiting * 143.32).toFixed(2)); // AgCl 143.32 g/mol

    return {
      hasReacted: true,
      status: 'reaction',
      reactionTitle: 'Silver Chloride Curdy Precipitation',
      equation: has('hcl') 
        ? 'AgNO₃(aq) + HCl(aq) → AgCl↓ (s) + HNO₃(aq)'
        : '2AgNO₃(aq) + BaCl₂(aq) → 2AgCl↓ (s) + Ba(NO₃)₂(aq)',
      reactionType: 'Precipitation',
      finalColor: '#f1f5f9', // Milky curdy white
      secondaryColor: '#ffffff',
      finalPh: has('hcl') ? 1.4 : 6.0,
      finalTempC: 22.8,
      deltaTC: 0.8,
      bubbling: { active: false, gasFormula: '', intensity: 0, description: '' },
      precipitate: {
        formed: true,
        name: 'Silver Chloride',
        formula: 'AgCl',
        color: '#f8fafc',
        massGrams: Math.max(0.5, pptMass),
      },
      explanation: 'Silver cations Ag⁺ instantaneously cross-link with chloride anions Cl⁻ to form dense, insoluble, milky-white silver chloride precipitate (Ksp = 1.8 × 10⁻¹⁰).',
      spectatorIons: ['NO₃⁻', has('hcl') ? 'H⁺' : 'Ba²⁺'],
      reactingIons: ['Ag⁺', 'Cl⁻'],
      productFormula: 'AgCl',
      product3DRefId: 'agno3',
    };
  }

  // 3. Precipitation: Barium Chloride + Sulfuric Acid (or CuSO4)
  if (has('bacl2') && (has('h2so4') || has('cuso4'))) {
    const isSulfuric = has('h2so4');
    return {
      hasReacted: true,
      status: 'reaction',
      reactionTitle: 'Barium Sulfate Heavy Precipitation',
      equation: isSulfuric
        ? 'BaCl₂(aq) + H₂SO₄(aq) → BaSO₄↓ (s) + 2HCl(aq)'
        : 'BaCl₂(aq) + CuSO₄(aq) → BaSO₄↓ (s) + CuCl₂(aq)',
      reactionType: 'Precipitation',
      finalColor: isSulfuric ? '#f8fafc' : '#bae6fd',
      finalPh: isSulfuric ? 1.0 : 4.8,
      finalTempC: 23.4,
      deltaTC: 1.4,
      bubbling: { active: false, gasFormula: '', intensity: 0, description: '' },
      precipitate: {
        formed: true,
        name: 'Barium Sulfate',
        formula: 'BaSO₄',
        color: '#ffffff',
        massGrams: 2.1,
      },
      explanation: 'Barium ions react with sulfate ions to produce barium sulfate BaSO₄, an exceptionally insoluble white crystalline salt insoluble even in concentrated mineral acids.',
      spectatorIons: isSulfuric ? ['Cl⁻', 'H⁺'] : ['Cl⁻', 'Cu²⁺'],
      reactingIons: ['Ba²⁺', 'SO₄²⁻'],
      productFormula: 'BaSO4',
      product3DRefId: 'bacl2',
    };
  }

  // 4. Complexation: Copper(II) Sulfate + Aqueous Ammonia
  if (has('cuso4') && has('nh3')) {
    return {
      hasReacted: true,
      status: 'reaction',
      reactionTitle: 'Tetraamminecopper(II) Complexation',
      equation: 'CuSO₄(aq) + 4NH₃(aq) → [Cu(NH₃)₄]SO₄(aq)',
      reactionType: 'Complexation',
      finalColor: '#1e3a8a', // Deep royal azure navy blue
      secondaryColor: '#1d4ed8',
      finalPh: 9.8,
      finalTempC: 24.5,
      deltaTC: 2.5,
      bubbling: { active: false, gasFormula: '', intensity: 0, description: '' },
      precipitate: { formed: false, name: '', formula: '', color: '', massGrams: 0 },
      explanation: 'Copper(II) ions undergo ligand exchange: four neutral ammonia molecules coordinate to the central copper ion, yielding the radiant deep royal azure [Cu(NH₃)₄]²⁺ complex.',
      spectatorIons: ['SO₄²⁻'],
      reactingIons: ['Cu²⁺', '4NH₃'],
      productFormula: '[Cu(NH3)4]SO4',
      product3DRefId: 'cuso4',
    };
  }

  // 5. Precipitation: Copper(II) Sulfate + Sodium Hydroxide (or KOH)
  if (has('cuso4') && (has('naoh') || has('koh'))) {
    const isNa = has('naoh');
    return {
      hasReacted: true,
      status: 'reaction',
      reactionTitle: 'Copper(II) Hydroxide Gelatinous Precipitation',
      equation: isNa
        ? 'CuSO₄(aq) + 2NaOH(aq) → Cu(OH)₂↓ (s) + Na₂SO₄(aq)'
        : 'CuSO₄(aq) + 2KOH(aq) → Cu(OH)₂↓ (s) + K₂SO₄(aq)',
      reactionType: 'Precipitation',
      finalColor: '#38bdf8', // Light sky blue gelatinous
      finalPh: 11.2,
      finalTempC: 24.0,
      deltaTC: 2.0,
      bubbling: { active: false, gasFormula: '', intensity: 0, description: '' },
      precipitate: {
        formed: true,
        name: 'Copper(II) Hydroxide',
        formula: 'Cu(OH)₂',
        color: '#38bdf8',
        massGrams: 1.8,
      },
      explanation: 'Addition of hydroxide ions to hydrated Cu²⁺ precipitates gelatinous pale-blue copper(II) hydroxide Cu(OH)₂.',
      spectatorIons: [isNa ? 'Na⁺' : 'K⁺', 'SO₄²⁻'],
      reactingIons: ['Cu²⁺', '2OH⁻'],
      productFormula: 'Cu(OH)2',
      product3DRefId: 'cuso4',
    };
  }

  // 6. Effervescence: Carbonates + Acids (Na2CO3 or NaHCO3 + HCl/H2SO4/HNO3/CH3COOH)
  const isCarbonate = has('na2co3') || has('nahco3');
  const isAcid = has('hcl') || has('h2so4') || has('hno3') || has('ch3cooh');
  if (isCarbonate && isAcid) {
    const carbId = has('na2co3') ? 'na2co3' : 'nahco3';
    const acidId = has('hcl') ? 'hcl' : (has('h2so4') ? 'h2so4' : (has('hno3') ? 'hno3' : 'ch3cooh'));
    const eqStr = carbId === 'na2co3'
      ? (acidId === 'hcl' ? 'Na₂CO₃(s) + 2HCl(aq) → 2NaCl(aq) + H₂O(l) + CO₂↑ (g)' : 'Na₂CO₃(s) + H₂SO₄(aq) → Na₂SO₄(aq) + H₂O(l) + CO₂↑ (g)')
      : 'NaHCO₃(s) + HCl(aq) → NaCl(aq) + H₂O(l) + CO₂↑ (g)';

    const calculatedPh = 5.5;
    const finalClr = resolveIndicatorColor(calculatedPh, '#f1f5f9');

    return {
      hasReacted: true,
      status: 'reaction',
      reactionTitle: 'Carbonate Acid Effervescence (CO₂ Evolution)',
      equation: eqStr,
      reactionType: 'Effervescence (Gas)',
      finalColor: finalClr,
      finalPh: calculatedPh,
      finalTempC: 20.8, // Endothermic gas evolution
      deltaTC: -1.2,
      bubbling: {
        active: true,
        gasFormula: 'CO₂',
        intensity: 95,
        description: 'Vigorous effervescence of carbon dioxide bubbles erupting to liquid surface.',
      },
      precipitate: { formed: false, name: '', formula: '', color: '', massGrams: 0 },
      explanation: 'Protons from the acid attack the carbonate/bicarbonate anion, instantly generating unstable carbonic acid H₂CO₃ which decomposes into water and effervescent gaseous CO₂.',
      spectatorIons: ['Na⁺', acidId === 'hcl' ? 'Cl⁻' : 'SO₄²⁻'],
      reactingIons: ['CO₃²⁻', '2H⁺'],
      productFormula: 'CO2',
      product3DRefId: 'na2co3',
    };
  }

  // 7. Effervescence & Single Displacement: Active Metal (Zn, Mg) + Acid (HCl, H2SO4)
  const isMetal = has('zn') || has('mg');
  if (isMetal && (has('hcl') || has('h2so4'))) {
    const metalId = has('zn') ? 'zn' : 'mg';
    const acidId = has('hcl') ? 'hcl' : 'h2so4';
    const metalName = metalId === 'zn' ? 'Zinc' : 'Magnesium';
    const eq = metalId === 'zn'
      ? (acidId === 'hcl' ? 'Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂↑ (g)' : 'Zn(s) + H₂SO₄(aq) → ZnSO₄(aq) + H₂↑ (g)')
      : 'Mg(s) + 2HCl(aq) → MgCl₂(aq) + H₂↑ (g)';

    const deltaT = metalId === 'mg' ? 14.5 : 5.8;
    const calculatedPh = 2.1;
    const finalClr = resolveIndicatorColor(calculatedPh, '#f8fafc');

    return {
      hasReacted: true,
      status: 'reaction',
      reactionTitle: `${metalName} Metal Acid Displacement (H₂ Evolution)`,
      equation: eq,
      reactionType: 'Effervescence (Gas)',
      finalColor: finalClr,
      finalPh: calculatedPh,
      finalTempC: 22.0 + deltaT,
      deltaTC: deltaT,
      bubbling: {
        active: true,
        gasFormula: 'H₂',
        intensity: metalId === 'mg' ? 95 : 80,
        description: `Rapid evolution of flammable hydrogen gas bubbles around ${metalName} surface.`,
      },
      precipitate: { formed: false, name: '', formula: '', color: '', massGrams: 0 },
      explanation: `Active ${metalName} metal reduces hydrogen protons (2H⁺ + 2e⁻ → H₂↑) while being oxidized to divalent cations in solution. Highly exothermic.`,
      spectatorIons: [acidId === 'hcl' ? 'Cl⁻' : 'SO₄²⁻'],
      reactingIons: [metalId === 'zn' ? 'Zn' : 'Mg', '2H⁺'],
      productFormula: 'H2',
      product3DRefId: metalId,
    };
  }

  // 8. Direct Solid Synthesis: Iron + Sulfur
  if (has('fe') && has('s')) {
    return {
      hasReacted: true,
      status: 'reaction',
      reactionTitle: 'Iron(II) Sulfide Solid Synthesis',
      equation: 'Fe(s) + S(s) → FeS(s)  [ΔH = -100 kJ/mol]',
      reactionType: 'Redox Synthesis',
      finalColor: '#1e293b', // Black iron sulfide
      finalPh: 7.0,
      finalTempC: 38.0,
      deltaTC: 16.0,
      bubbling: { active: false, gasFormula: '', intensity: 0, description: '' },
      precipitate: {
        formed: true,
        name: 'Iron(II) Sulfide',
        formula: 'FeS',
        color: '#1e293b',
        massGrams: 8.5,
      },
      explanation: 'Stoichiometric synthesis between elemental iron and sulfur powders, forming non-magnetic black iron(II) sulfide FeS.',
      spectatorIons: [],
      reactingIons: ['Fe', 'S'],
      productFormula: 'FeS',
      product3DRefId: 'fe',
    };
  }

  // 9. Acid-Base Neutralization: (HCl, H2SO4, HNO3, CH3COOH) + (NaOH, KOH, NH3)
  const isAnyAcid = has('hcl') || has('h2so4') || has('hno3') || has('ch3cooh');
  const isAnyBase = has('naoh') || has('koh') || has('nh3');

  if (isAnyAcid && isAnyBase) {
    const acidId = has('hcl') ? 'hcl' : (has('h2so4') ? 'h2so4' : (has('hno3') ? 'hno3' : 'ch3cooh'));
    const baseId = has('naoh') ? 'naoh' : (has('koh') ? 'koh' : 'nh3');

    const acid = get(acidId);
    const base = get(baseId);

    // Calculate moles of H+ and OH-
    const proticFactor = acidId === 'h2so4' ? 2 : 1;
    const molesH = ((acid.volumeMl * acid.molarityM) / 1000) * proticFactor;
    const molesOH = (base.volumeMl * base.molarityM) / 1000;
    const totalVolumeL = (acid.volumeMl + base.volumeMl) / 1000;

    let computedPh = 7.0;
    let netMoles = 0;
    if (molesH > molesOH) {
      netMoles = molesH - molesOH;
      const concH = netMoles / totalVolumeL;
      computedPh = Math.max(0.2, Number((-Math.log10(concH)).toFixed(2)));
    } else if (molesOH > molesH) {
      netMoles = molesOH - molesH;
      const concOH = netMoles / totalVolumeL;
      const pOH = -Math.log10(concOH);
      computedPh = Math.min(13.9, Number((14 - pOH).toFixed(2)));
    } else {
      computedPh = 7.00;
    }

    const deltaT = Number((Math.min(molesH, molesOH) * 57.3 / (totalVolumeL * 4.184)).toFixed(1));
    const eq = `${acid.chemical.formula}(aq) + ${base.chemical.formula}(aq) → ${acidId === 'hcl' && baseId === 'naoh' ? 'NaCl(aq) + H₂O(l)' : 'Salt(aq) + H₂O(l)'}  [ΔH = -57.3 kJ/mol]`;

    const finalClr = resolveIndicatorColor(computedPh, '#f8fafc');

    return {
      hasReacted: true,
      status: 'reaction',
      reactionTitle: 'Acid-Base Neutralization',
      equation: eq,
      reactionType: 'Neutralization',
      finalColor: finalClr,
      finalPh: computedPh,
      finalTempC: 22.0 + deltaT,
      deltaTC: deltaT,
      bubbling: { active: false, gasFormula: '', intensity: 0, description: '' },
      precipitate: { formed: false, name: '', formula: '', color: '', massGrams: 0 },
      explanation: `H⁺ protons and OH⁻ hydroxide ions combine exothermically to yield neutral water molecules. Calculated final pH is ${computedPh.toFixed(2)}${hasPhenol ? (computedPh >= 8.2 ? ' (Phenolphthalein turns vibrant pink)' : ' (Phenolphthalein remains colorless)') : ''}.`,
      spectatorIons: [baseId === 'naoh' ? 'Na⁺' : 'K⁺', acidId === 'hcl' ? 'Cl⁻' : 'NO₃⁻'],
      reactingIons: ['H⁺', 'OH⁻'],
      productFormula: 'H2O',
      product3DRefId: 'h2o',
    };
  }

  // 10. Default / Non-reactive mixture (e.g. adding water to something, or unreactive salts)
  const names = items.map((i) => i.chemical.name).join(' + ');
  const avgPh = Number((items.reduce((acc, curr) => acc + curr.chemical.ph, 0) / items.length).toFixed(2));
  const finalClr = resolveIndicatorColor(avgPh, items[0].chemical.color || '#f8fafc');

  return {
    hasReacted: false,
    status: 'mixture',
    reactionTitle: 'Homogeneous Mixture / Dilution',
    equation: `${names} (No spontaneous chemical reaction under STP)`,
    reactionType: 'Dilution',
    finalColor: finalClr,
    finalPh: avgPh,
    finalTempC: 22.0,
    deltaTC: 0,
    bubbling: { active: false, gasFormula: '', intensity: 0, description: '' },
    precipitate: { formed: false, name: '', formula: '', color: '', massGrams: 0 },
    explanation: 'The added substances coexist without undergoing a spontaneous chemical transformation. Ions remain solvated by water molecules.',
    spectatorIons: items.map((i) => i.chemical.formula),
    reactingIons: [],
  };
}

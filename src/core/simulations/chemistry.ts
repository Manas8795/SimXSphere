/**
 * Chemical Reactions & Aqueous Solution Dynamics Engine
 * Simulates Acid-Base Neutralization, Precipitation, Gas Evolution,
 * and Chemical Equilibrium (pH, temperature change, precipitates).
 * Pure computation. Zero UI / DOM dependencies.
 */

export interface ChemicalReagent {
  id: string;
  name: string;
  formula: string;
  category: 'acid' | 'base' | 'salt' | 'indicator';
  color: string;           // Visual liquid hex
  ph: number;              // Pure pH (0 to 14)
  concentrationM: number;  // Default Molarity (mol/L)
  description: string;
}

export const REAGENTS_DATABASE: ChemicalReagent[] = [
  {
    id: 'hcl',
    name: 'Hydrochloric Acid',
    formula: 'HCl',
    category: 'acid',
    color: '#e0f2fe',      // Clear pale cyan
    ph: 1.0,
    concentrationM: 1.0,
    description: 'Strong monoprotic acid. Completely dissociates in aqueous solution into H+ and Cl-.'
  },
  {
    id: 'naoh',
    name: 'Sodium Hydroxide',
    formula: 'NaOH',
    category: 'base',
    color: '#f0fdf4',      // Clear pale emerald
    ph: 14.0,
    concentrationM: 1.0,
    description: 'Strong alkaline base. Dissociates into Na+ and OH-.'
  },
  {
    id: 'h2so4',
    name: 'Sulfuric Acid',
    formula: 'H2SO4',
    category: 'acid',
    color: '#fef3c7',      // Slight warm tint
    ph: 0.5,
    concentrationM: 1.0,
    description: 'Strong diprotic acid. Highly exothermic neutralization.'
  },
  {
    id: 'agno3',
    name: 'Silver Nitrate',
    formula: 'AgNO3',
    category: 'salt',
    color: '#f8fafc',      // Clear solution
    ph: 6.5,
    concentrationM: 0.5,
    description: 'Soluble silver salt. Reacts with chlorides to form dense white precipitate AgCl.'
  },
  {
    id: 'cuso4',
    name: 'Copper(II) Sulfate',
    formula: 'CuSO4',
    category: 'salt',
    color: '#0284c7',      // Deep royal azure blue
    ph: 4.5,
    concentrationM: 0.5,
    description: 'Hydrated Cu2+ ions produce characteristic blue aqueous solution.'
  },
  {
    id: 'na2co3',
    name: 'Sodium Carbonate',
    formula: 'Na2CO3',
    category: 'base',
    color: '#f1f5f9',      // Clear
    ph: 11.5,
    concentrationM: 0.5,
    description: 'Weak base. Reacts with acids to evolve Carbon Dioxide gas (CO2 effervescence).'
  },
  {
    id: 'nh3',
    name: 'Aqueous Ammonia',
    formula: 'NH3(aq)',
    category: 'base',
    color: '#f8fafc',      // Clear pungent solution
    ph: 11.2,
    concentrationM: 1.0,
    description: 'Weak base. Forms deep azure tetraamminecopper(II) complex with Cu2+.'
  }
];

export type ChemistryResultSemantic =
  | 'reviewed_reference'          // Established empirical or curated literature data
  | 'engine_calculated'           // Deterministically calculated from stoichiometric/equilibrium formulas
  | 'educational_approximation'   // Scoped classroom approximation model
  | 'illustrative_visualization'  // Qualitative visual representation
  | 'unsupported';                // Combination or input not modeled by engine

export interface ReactionOutput {
  balancedEquation: string;
  reactionType: 'Acid-Base Neutralization' | 'Precipitation' | 'Gas Evolution / Effervescence' | 'Complexation' | 'No Reaction (Dilution)' | 'Unsupported Combination';
  finalPh: number | null;
  temperatureChangeC: number | null; // Calculated temperature shift (°C), or null if unmodeled
  enthalpyKj: number | null;         // Standard enthalpy change ΔH° (kJ/mol), or null if uncharacterized
  finalColor: string;
  precipitateFormed: string | null;  // e.g. "AgCl(s) (White precipitate)"
  gasEvolved: string | null;         // e.g. "CO2(g) bubbles"
  description: string;
  ionicSpecies: string[];
  semantic: ChemistryResultSemantic;
  assumptions: string[];
  limitations: string[];
}

export function simulateChemicalMixing(
  reagentAId: string,
  volumeAMl: number,
  concentrationAM: number,
  reagentBId: string,
  volumeBMl: number,
  concentrationBM: number
): ReactionOutput {
  const regA = REAGENTS_DATABASE.find((r) => r.id === reagentAId) || REAGENTS_DATABASE[0];
  const regB = REAGENTS_DATABASE.find((r) => r.id === reagentBId) || REAGENTS_DATABASE[1];

  const molesA = Math.max(0, (volumeAMl / 1000) * concentrationAM);
  const molesB = Math.max(0, (volumeBMl / 1000) * concentrationBM);
  const totalVolumeL = (Math.max(0.1, volumeAMl) + Math.max(0.1, volumeBMl)) / 1000;
  const massWaterGrams = totalVolumeL * 1000; // Assuming solution density ≈ 1.00 g/mL

  // Case 1: Same reagent (simple dilution)
  if (reagentAId === reagentBId) {
    const totalMoles = molesA + molesB;
    const finalConc = totalVolumeL > 0 ? totalMoles / totalVolumeL : 1.0;
    return {
      balancedEquation: `${regA.formula} + ${regB.formula} → Homogeneous Solution`,
      reactionType: 'No Reaction (Dilution)',
      finalPh: regA.ph,
      temperatureChangeC: 0.0,
      enthalpyKj: 0.0,
      finalColor: regA.color,
      precipitateFormed: null,
      gasEvolved: null,
      description: `Mixing identical reagents yields a uniform ${finalConc.toFixed(2)} M solution with unchanged pH (${regA.ph}).`,
      ionicSpecies: [regA.formula],
      semantic: 'engine_calculated',
      assumptions: ['Ideal solution dilution', 'Zero excess enthalpy of mixing', 'Constant ambient temperature (25°C)'],
      limitations: ['Non-ideal ion pairing at high molarity (> 3 M) is not modeled'],
    };
  }

  const ids = new Set([reagentAId, reagentBId]);

  // Case 2: HCl + NaOH -> NaCl + H2O (Acid-Base Neutralization)
  if (ids.has('hcl') && ids.has('naoh')) {
    const molesH = reagentAId === 'hcl' ? molesA : molesB;
    const molesOH = reagentAId === 'naoh' ? molesA : molesB;
    const limiting = Math.min(molesH, molesOH);
    const excessH = molesH - limiting;
    const excessOH = molesOH - limiting;

    let finalPh = 7.0;
    if (excessH > 1e-7) {
      const concH = excessH / totalVolumeL;
      finalPh = Math.max(0, -Math.log10(concH));
    } else if (excessOH > 1e-7) {
      const concOH = excessOH / totalVolumeL;
      finalPh = Math.min(14, 14 - (-Math.log10(concOH)));
    }

    // Heat of neutralization ΔH° = -57.1 kJ/mol (standard strong acid - strong base value)
    const heatJoules = limiting * 57100;
    const deltaT = massWaterGrams > 0 ? heatJoules / (massWaterGrams * 4.184) : 0;

    return {
      balancedEquation: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l)',
      reactionType: 'Acid-Base Neutralization',
      finalPh: parseFloat(finalPh.toFixed(2)),
      temperatureChangeC: parseFloat(deltaT.toFixed(1)),
      enthalpyKj: -57.1,
      finalColor: finalPh < 6 ? '#fef3c7' : finalPh > 8 ? '#ecfdf5' : '#f8fafc',
      precipitateFormed: null,
      gasEvolved: null,
      description: `Exothermic neutralization of strong acid and strong base produces aqueous Sodium Chloride (table salt) and water. Heat released: +${deltaT.toFixed(1)}°C.`,
      ionicSpecies: ['Na+(aq)', 'Cl-(aq)', 'H2O(l)'],
      semantic: 'engine_calculated',
      assumptions: [
        'Complete dissociation of HCl and NaOH into constituent ions',
        'Neutralization enthalpy ΔH° = -57.1 kJ/mol',
        'Aqueous solution density = 1.00 g/mL, specific heat capacity = 4.184 J/(g·°C)',
        'Zero calorimeter heat loss to the ambient environment',
      ],
      limitations: ['Activity coefficients assume dilute limit (γ± ≈ 1.0)'],
    };
  }

  // Case 3: HCl + AgNO3 -> AgCl(s) (Precipitation)
  if (ids.has('hcl') && ids.has('agno3')) {
    const molesCl = reagentAId === 'hcl' ? molesA : molesB;
    const molesAg = reagentAId === 'agno3' ? molesA : molesB;
    const precipitateMoles = Math.min(molesCl, molesAg);

    // Remaining [H+] from HCl in solution
    const concH = molesCl / totalVolumeL;
    const finalPh = Math.max(0, -Math.log10(concH));

    // Precipitation enthalpy ΔH°(AgCl) ≈ -65.5 kJ/mol
    const heatJoules = precipitateMoles * 65500;
    const deltaT = massWaterGrams > 0 ? heatJoules / (massWaterGrams * 4.184) : 0;

    return {
      balancedEquation: 'HCl(aq) + AgNO3(aq) → AgCl(s)↓ + HNO3(aq)',
      reactionType: 'Precipitation',
      finalPh: parseFloat(finalPh.toFixed(2)),
      temperatureChangeC: parseFloat(deltaT.toFixed(1)),
      enthalpyKj: -65.5,
      finalColor: '#ffffff', // Milky white cloudy suspension
      precipitateFormed: `AgCl (Silver Chloride) — ${(precipitateMoles * 143.32).toFixed(2)} g White Precipitate`,
      gasEvolved: null,
      description: `Insoluble Silver Chloride (AgCl) immediately precipitates as an opaque white curdy solid (Ksp = 1.8 × 10^-10). Nitric acid remains dissolved.`,
      ionicSpecies: ['AgCl(s) [Solid]', 'H+(aq)', 'NO3-(aq)'],
      semantic: 'engine_calculated',
      assumptions: [
        'Precipitation completes quantitatively due to very low solubility product (Ksp = 1.8 × 10^-10)',
        'Precipitation enthalpy ΔH° = -65.5 kJ/mol',
        'Specific heat capacity cp = 4.184 J/(g·°C)',
      ],
      limitations: ['Colloidal light scattering and coagulation kinetics are simplified to immediate precipitate mass'],
    };
  }

  // Case 4: HCl + Na2CO3 -> CO2(g) (Gas Evolution)
  if (ids.has('hcl') && ids.has('na2co3')) {
    const molesHCl = reagentAId === 'hcl' ? molesA : molesB;
    const molesCO3 = reagentAId === 'na2co3' ? molesA : molesB;
    const co2Moles = Math.min(molesHCl / 2, molesCO3);
    const co2Liters = co2Moles * 24.45; // At 25°C, 1 atm

    // Excess acid or base determines pH
    let finalPh = 8.3; // Default basic bicarbonate buffer
    if (molesHCl > 2 * molesCO3) {
      const excessH = (molesHCl - 2 * molesCO3) / totalVolumeL;
      finalPh = Math.max(0, -Math.log10(excessH));
    } else if (molesHCl === 2 * molesCO3) {
      finalPh = 5.2; // Saturated dissolved carbonic acid
    }

    // Reaction enthalpy ΔH° ≈ -12.5 kJ/mol
    const heatJoules = co2Moles * 12500;
    const deltaT = massWaterGrams > 0 ? heatJoules / (massWaterGrams * 4.184) : 0;

    return {
      balancedEquation: '2HCl(aq) + Na2CO3(aq) → 2NaCl(aq) + H2O(l) + CO2(g)↑',
      reactionType: 'Gas Evolution / Effervescence',
      finalPh: parseFloat(finalPh.toFixed(2)),
      temperatureChangeC: parseFloat(deltaT.toFixed(1)),
      enthalpyKj: -12.5,
      finalColor: '#f1f5f9',
      precipitateFormed: null,
      gasEvolved: `Carbon Dioxide (CO2) — ${(co2Liters * 1000).toFixed(0)} mL Gas Evolved`,
      description: `Rapid effervescence! Acid protonates carbonate ions to form unstable carbonic acid (H2CO3), which decomposes into water and vigorous CO2 bubbles.`,
      ionicSpecies: ['Na+(aq)', 'Cl-(aq)', 'CO2(g) [Bubbles]'],
      semantic: 'engine_calculated',
      assumptions: [
        'Molar gas volume Vm = 24.45 L/mol under STP conditions (25°C, 1 atm)',
        'Carbonic acid decomposes completely into gaseous CO2 and liquid H2O',
      ],
      limitations: ['CO2 dissolved solubility equilibrium at varying headspace pressure is not modeled'],
    };
  }

  // Case 5: CuSO4 + NaOH -> Cu(OH)2(s) (Precipitation of pale blue gel)
  if (ids.has('cuso4') && ids.has('naoh')) {
    const molesCu = reagentAId === 'cuso4' ? molesA : molesB;
    const molesOH = reagentAId === 'naoh' ? molesA : molesB;
    const pptMoles = Math.min(molesCu, molesOH / 2);

    let finalPh = 6.0;
    if (molesOH > 2 * molesCu) {
      const excessOH = (molesOH - 2 * molesCu) / totalVolumeL;
      finalPh = Math.min(14, 14 - (-Math.log10(excessOH)));
    }

    // Precipitation enthalpy ΔH° ≈ -45.0 kJ/mol
    const heatJoules = pptMoles * 45000;
    const deltaT = massWaterGrams > 0 ? heatJoules / (massWaterGrams * 4.184) : 0;

    return {
      balancedEquation: 'CuSO4(aq) + 2NaOH(aq) → Cu(OH)2(s)↓ + Na2SO4(aq)',
      reactionType: 'Precipitation',
      finalPh: parseFloat(finalPh.toFixed(2)),
      temperatureChangeC: parseFloat(deltaT.toFixed(1)),
      enthalpyKj: -45.0,
      finalColor: '#38bdf8', // Light sky blue gelatinous
      precipitateFormed: `Cu(OH)2 (Copper(II) Hydroxide) — ${(pptMoles * 97.56).toFixed(2)} g Light Blue Gel`,
      gasEvolved: null,
      description: `Copper ions react with hydroxide to form an insoluble, gelatinous light blue precipitate of Copper(II) hydroxide.`,
      ionicSpecies: ['Cu(OH)2(s)', 'Na+(aq)', 'SO4^2-(aq)'],
      semantic: 'engine_calculated',
      assumptions: [
        'Ksp of Cu(OH)2 = 2.2 × 10^-20 ensures rapid, quantitative precipitation',
        'ΔH° = -45.0 kJ/mol per mole of Cu(OH)2 precipitated',
      ],
      limitations: ['Secondary deprotonation to cuprate [Cu(OH)4]^2- at extreme pH (> 13.5) is excluded'],
    };
  }

  // Case 6: CuSO4 + NH3 -> [Cu(NH3)4]^2+ (Deep Royal Blue Complexation)
  if (ids.has('cuso4') && ids.has('nh3')) {
    const molesCu = reagentAId === 'cuso4' ? molesA : molesB;
    const molesNH3 = reagentAId === 'nh3' ? molesA : molesB;
    const complexMoles = Math.min(molesCu, molesNH3 / 4);

    // Excess ammonia establishes weak base equilibrium pH
    let finalPh = 9.8;
    if (molesNH3 > 4 * molesCu) {
      const excessNH3 = (molesNH3 - 4 * molesCu) / totalVolumeL;
      const concOH = Math.sqrt(1.8e-5 * excessNH3);
      finalPh = Math.min(13, 14 - (-Math.log10(Math.max(1e-7, concOH))));
    }

    // Complexation enthalpy ΔH° ≈ -88.0 kJ/mol
    const heatJoules = complexMoles * 88000;
    const deltaT = massWaterGrams > 0 ? heatJoules / (massWaterGrams * 4.184) : 0;

    return {
      balancedEquation: 'CuSO4(aq) + 4NH3(aq) → [Cu(NH3)4]SO4(aq)',
      reactionType: 'Complexation',
      finalPh: parseFloat(finalPh.toFixed(2)),
      temperatureChangeC: parseFloat(deltaT.toFixed(1)),
      enthalpyKj: -88.0,
      finalColor: '#1e3a8a', // Deep royal navy blue
      precipitateFormed: null,
      gasEvolved: null,
      description: `Ligand substitution: Ammonia molecules displace water ligands around Cu2+ to form the striking, deep royal blue tetraamminecopper(II) complex ion [Cu(NH3)4]2+.`,
      ionicSpecies: ['[Cu(NH3)4]^2+(aq)', 'SO4^2-(aq)'],
      semantic: 'engine_calculated',
      assumptions: [
        'Stepwise formation constants β4 = 2.1 × 10^13 drives complete coordination to [Cu(NH3)4]2+',
        'Stepwise heat of coordination ΔH° = -88.0 kJ/mol',
      ],
      limitations: ['Intermediate mono-, di-, and tri-ammine species in sub-stoichiometric ratios are abstracted'],
    };
  }

  // Default: General aqueous mixture (no active reaction model)
  // CRITICAL SCIENTIFIC RULE: Do NOT average pH or fabricate temperature change!
  return {
    balancedEquation: `${regA.formula}(aq) + ${regB.formula}(aq) → Aqueous Solution`,
    reactionType: 'No Reaction (Dilution)',
    finalPh: null,
    temperatureChangeC: null,
    enthalpyKj: null,
    finalColor: regA.color !== '#f8fafc' ? regA.color : regB.color,
    precipitateFormed: null,
    gasEvolved: null,
    description: `The two solutions mix without an active reviewed transformation in this engine. Ions remain fully solvated.`,
    ionicSpecies: [regA.formula, regB.formula],
    semantic: 'educational_approximation',
    assumptions: ['Assumes no spontaneous net chemical reaction occurs under ambient standard conditions (25°C, 1 atm)'],
    limitations: ['Multi-ion equilibrium pH and ionic strength activity deviations are not modeled for unreviewed combinations'],
  };
}

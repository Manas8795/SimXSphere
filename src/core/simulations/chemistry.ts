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

export interface ReactionOutput {
  balancedEquation: string;
  reactionType: 'Acid-Base Neutralization' | 'Precipitation' | 'Gas Evolution / Effervescence' | 'Complexation' | 'No Reaction (Dilution)';
  finalPh: number;
  temperatureChangeC: number;  // Exothermic (+) or Endothermic (-)
  finalColor: string;
  precipitateFormed: string | null; // e.g. "AgCl(s) (White precipitate)"
  gasEvolved: string | null;        // e.g. "CO2(g) bubbles"
  description: string;
  ionicSpecies: string[];
}

export function simulateChemicalMixing(
  reagentAId: string,
  volumeAMl: number,
  concentrationAM: number,
  reagentBId: string,
  volumeBMl: number,
  concentrationBM: number
): ReactionOutput {
  const regA = REAGENTS_DATABASE.find(r => r.id === reagentAId) || REAGENTS_DATABASE[0];
  const regB = REAGENTS_DATABASE.find(r => r.id === reagentBId) || REAGENTS_DATABASE[1];

  const molesA = (volumeAMl / 1000) * concentrationAM;
  const molesB = (volumeBMl / 1000) * concentrationBM;
  const totalVolumeL = (volumeAMl + volumeBMl) / 1000;

  // Case 1: Same reagent (simple dilution)
  if (reagentAId === reagentBId) {
    const totalMoles = molesA + molesB;
    const finalConc = totalVolumeL > 0 ? totalMoles / totalVolumeL : 1.0;
    return {
      balancedEquation: `${regA.formula} + ${regB.formula} → Homogeneous Solution`,
      reactionType: 'No Reaction (Dilution)',
      finalPh: regA.ph,
      temperatureChangeC: 0.0,
      finalColor: regA.color,
      precipitateFormed: null,
      gasEvolved: null,
      description: `Mixing identical reagents yields a uniform ${finalConc.toFixed(2)} M solution with unchanged pH (${regA.ph}).`,
      ionicSpecies: [regA.formula]
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

    // Heat of neutralization = 57.1 kJ/mol
    const heatJoules = limiting * 57100;
    const massWaterGrams = totalVolumeL * 1000;
    const deltaT = massWaterGrams > 0 ? heatJoules / (massWaterGrams * 4.184) : 0;

    return {
      balancedEquation: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l)',
      reactionType: 'Acid-Base Neutralization',
      finalPh: parseFloat(finalPh.toFixed(2)),
      temperatureChangeC: parseFloat(deltaT.toFixed(1)),
      finalColor: finalPh < 6 ? '#fef3c7' : finalPh > 8 ? '#ecfdf5' : '#f8fafc',
      precipitateFormed: null,
      gasEvolved: null,
      description: `Exothermic neutralization of strong acid and strong base produces aqueous Sodium Chloride (table salt) and water. Heat released: +${deltaT.toFixed(1)}°C.`,
      ionicSpecies: ['Na+(aq)', 'Cl-(aq)', 'H2O(l)']
    };
  }

  // Case 3: HCl + AgNO3 -> AgCl(s) (Precipitation)
  if (ids.has('hcl') && ids.has('agno3')) {
    const molesCl = reagentAId === 'hcl' ? molesA : molesB;
    const molesAg = reagentAId === 'agno3' ? molesA : molesB;
    const precipitateMoles = Math.min(molesCl, molesAg);

    return {
      balancedEquation: 'HCl(aq) + AgNO3(aq) → AgCl(s)↓ + HNO3(aq)',
      reactionType: 'Precipitation',
      finalPh: 1.2,
      temperatureChangeC: 0.8,
      finalColor: '#ffffff', // Milky white cloudy suspension
      precipitateFormed: `AgCl (Silver Chloride) — ${(precipitateMoles * 143.32).toFixed(2)} g White Precipitate`,
      gasEvolved: null,
      description: `Insoluble Silver Chloride (AgCl) immediately precipitates as an opaque white curdy solid (Ksp = 1.8 × 10^-10). Nitric acid remains dissolved.`,
      ionicSpecies: ['AgCl(s) [Solid]', 'H+(aq)', 'NO3-(aq)']
    };
  }

  // Case 4: HCl + Na2CO3 -> CO2(g) (Gas Evolution)
  if (ids.has('hcl') && ids.has('na2co3')) {
    const molesHCl = reagentAId === 'hcl' ? molesA : molesB;
    const molesCO3 = reagentAId === 'na2co3' ? molesA : molesB;
    const co2Moles = Math.min(molesHCl / 2, molesCO3);
    const co2Liters = co2Moles * 24.45; // At 25°C 1 atm

    return {
      balancedEquation: '2HCl(aq) + Na2CO3(aq) → 2NaCl(aq) + H2O(l) + CO2(g)↑',
      reactionType: 'Gas Evolution / Effervescence',
      finalPh: molesHCl > 2 * molesCO3 ? 1.5 : 8.2,
      temperatureChangeC: 1.5,
      finalColor: '#f1f5f9',
      precipitateFormed: null,
      gasEvolved: `Carbon Dioxide (CO2) — ${(co2Liters * 1000).toFixed(0)} mL Gas Evolved`,
      description: `Rapid effervescence! Acid protonates carbonate ions to form unstable carbonic acid (H2CO3), which instantly decomposes into water and vigorous CO2 bubbles.`,
      ionicSpecies: ['Na+(aq)', 'Cl-(aq)', 'CO2(g) [Bubbles]']
    };
  }

  // Case 5: CuSO4 + NaOH -> Cu(OH)2(s) (Precipitation of pale blue gel)
  if (ids.has('cuso4') && ids.has('naoh')) {
    const molesCu = reagentAId === 'cuso4' ? molesA : molesB;
    const molesOH = reagentAId === 'naoh' ? molesA : molesB;
    const pptMoles = Math.min(molesCu, molesOH / 2);

    return {
      balancedEquation: 'CuSO4(aq) + 2NaOH(aq) → Cu(OH)2(s)↓ + Na2SO4(aq)',
      reactionType: 'Precipitation',
      finalPh: molesOH > 2 * molesCu ? 12.0 : 6.0,
      temperatureChangeC: 2.1,
      finalColor: '#38bdf8', // Light sky blue gelatinous
      precipitateFormed: `Cu(OH)2 (Copper(II) Hydroxide) — ${(pptMoles * 97.56).toFixed(2)} g Light Blue Gel`,
      gasEvolved: null,
      description: `Copper ions react with hydroxide to form an insoluble, gelatinous light blue precipitate of Copper(II) hydroxide.`,
      ionicSpecies: ['Cu(OH)2(s)', 'Na+(aq)', 'SO4^2-(aq)']
    };
  }

  // Case 6: CuSO4 + NH3 -> [Cu(NH3)4]^2+ (Deep Royal Blue Complexation)
  if (ids.has('cuso4') && ids.has('nh3')) {
    return {
      balancedEquation: 'CuSO4(aq) + 4NH3(aq) → [Cu(NH3)4]SO4(aq)',
      reactionType: 'Complexation',
      finalPh: 10.5,
      temperatureChangeC: 1.2,
      finalColor: '#1e3a8a', // Deep royal navy blue
      precipitateFormed: null,
      gasEvolved: null,
      description: `Ligand substitution: Ammonia molecules displace water ligands around Cu2+ to form the striking, deep royal blue tetraamminecopper(II) complex ion [Cu(NH3)4]2+.`,
      ionicSpecies: ['[Cu(NH3)4]^2+(aq)', 'SO4^2-(aq)']
    };
  }

  // Default: General aqueous mixture
  const avgPh = (regA.ph + regB.ph) / 2;
  return {
    balancedEquation: `${regA.formula}(aq) + ${regB.formula}(aq) → Aqueous Solution`,
    reactionType: 'No Reaction (Dilution)',
    finalPh: parseFloat(avgPh.toFixed(2)),
    temperatureChangeC: 0.1,
    finalColor: regA.color !== '#f8fafc' ? regA.color : regB.color,
    precipitateFormed: null,
    gasEvolved: null,
    description: `The two solutions mix without chemical transformation. Ions remain fully solvated in solution.`,
    ionicSpecies: [regA.formula, regB.formula]
  };
}

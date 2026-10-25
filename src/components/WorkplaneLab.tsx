import React, { useState, useEffect } from 'react';
import { PERIODIC_TABLE, type ChemicalElement } from '../chemistry-data/elements';
import { LAB_CHEMICALS, type LabChemicalItem, type ParticleAtom3D } from '../chemistry-data/reagents';
import {
  synthesizeCompoundFromElements,
  type SynthesizedCompound,
  type SynthesisResult,
} from '../chemistry-engine/compound-builder';
import { calculateLimitingReagent, type StoichiometryResult } from '../chemistry-engine/stoichiometry-calc';
import { Molecule3DViewer } from './Molecule3DViewer';
import { buildWorkplaneExplainerContext } from '../core/explainer/context-builders/chemistryContext';
import type { SimulationExplainerContext } from '../core/explainer/types';

interface WorkplaneLabProps {
  onSaveRun?: (title: string, details: string, tag: string) => void;
  onContextChange?: (context: SimulationExplainerContext) => void;
}

export interface PlacedElementSphere {
  instanceId: string;
  element: ChemicalElement;
  count: number;
  inBeaker: boolean;
  x: number;
  y: number;
}

export const WorkplaneLab: React.FC<WorkplaneLabProps> = ({ onSaveRun, onContextChange }) => {
  // Sidebar tab: 'elements' or 'compounds'
  const [sidebarTab, setSidebarTab] = useState<'elements' | 'compounds'>('elements');
  const [elementCategory, setElementCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // The Workplane canvas state: initially COMPLETELY BLANK!
  const [hasBeaker, setHasBeaker] = useState<boolean>(false);
  const [placedSpheres, setPlacedSpheres] = useState<PlacedElementSphere[]>([]);

  // Reaction simulation state inside beaker
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [synthesisResult, setSynthesisResult] = useState<SynthesisResult | null>(null);
  const [resultingCompoundSphere, setResultingCompoundSphere] = useState<SynthesizedCompound | null>(null);
  const [showStoichiometry, setShowStoichiometry] = useState<boolean>(false);
  const [massInputs, setMassInputs] = useState<Record<string, number>>({});

  // 3D Atomic & Molecular Inspector target
  const [inspectElement, setInspectElement] = useState<ChemicalElement | null>(null);
  const [inspectChemical, setInspectChemical] = useState<LabChemicalItem | null>(null);

  // Right-click context menu for tuning sphere count
  const [activeContextMenu, setActiveContextMenu] = useState<{
    instanceId: string;
    x: number;
    y: number;
  } | null>(null);

  // Drag over states
  const [isDragOverWorkplane, setIsDragOverWorkplane] = useState<boolean>(false);
  const [isDragOverBeaker, setIsDragOverBeaker] = useState<boolean>(false);

  // Filter elements for sidebar
  const filteredElements = PERIODIC_TABLE.filter((el) => {
    const matchesCategory =
      elementCategory === 'all' ||
      (elementCategory === 'nonmetal' && (el.category === 'reactive-nonmetal' || el.category === 'noble-gas')) ||
      (elementCategory === 'metal' && (el.category === 'alkali-metal' || el.category === 'alkaline-earth' || el.category === 'transition-metal' || el.category === 'post-transition-metal')) ||
      (elementCategory === 'metalloid' && el.category === 'metalloid');
    const matchesSearch =
      el.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Spheres currently inside the beaker
  const beakerSpheres = placedSpheres.filter((s) => s.inBeaker);
  // Spheres resting freely on the canvas staging bench
  const canvasSpheres = placedSpheres.filter((s) => !s.inBeaker);

  // Notify Science Explainer Companion whenever beaker, elements, or reaction simulation updates!
  useEffect(() => {
    const beakerElements = beakerSpheres.map((s) => ({
      symbol: s.element.symbol,
      name: s.element.name,
      count: s.count,
    }));
    const workplaneElementsCount = canvasSpheres.reduce((acc, s) => acc + s.count, 0);

    const ctx = buildWorkplaneExplainerContext(
      {
        hasBeaker,
        beakerElements,
        workplaneElementsCount,
        synthesisResult,
      },
      Date.now()
    );
    onContextChange?.(ctx);
  }, [hasBeaker, placedSpheres, synthesisResult, onContextChange]);

  // Add an element sphere (either onto workplane or into beaker)
  const addElementSphere = (element: ChemicalElement, targetBeaker: boolean = false) => {
    // If targeted to beaker but beaker is not placed yet, place the beaker first!
    if (targetBeaker && !hasBeaker) {
      setHasBeaker(true);
    }

    setPlacedSpheres((prev) => {
      // Check if this element already exists in the same zone: increment count!
      const existingIdx = prev.findIndex((s) => s.element.symbol === element.symbol && s.inBeaker === targetBeaker);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          count: updated[existingIdx].count + 1,
        };
        return updated;
      }

      // Create new sphere
      const newSphere: PlacedElementSphere = {
        instanceId: `sphere-${element.symbol}-${Date.now()}-${Math.random()}`,
        element,
        count: 1,
        inBeaker: targetBeaker,
        x: targetBeaker ? 0 : 50 + (prev.length * 40) % 200,
        y: targetBeaker ? 0 : 50 + (prev.length * 30) % 180,
      };
      return [...prev, newSphere];
    });

    // Reset previous simulation when contents change
    setSynthesisResult(null);
    setResultingCompoundSphere(null);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, elementSymbol: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'element', symbol: elementSymbol }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverWorkplane(false);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.type === 'element') {
          const el = PERIODIC_TABLE.find((item) => item.symbol === data.symbol);
          if (el) {
            addElementSphere(el, false);
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse dropped element:', err);
    }
  };

  const handleDropOnBeaker = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverBeaker(false);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.type === 'element') {
          const el = PERIODIC_TABLE.find((item) => item.symbol === data.symbol);
          if (el) {
            addElementSphere(el, true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse dropped element on beaker:', err);
    }
  };

  // Move a canvas sphere into the beaker
  const moveSphereToBeaker = (instanceId: string) => {
    if (!hasBeaker) setHasBeaker(true);
    setPlacedSpheres((prev) =>
      prev.map((s) => (s.instanceId === instanceId ? { ...s, inBeaker: true } : s))
    );
    setSynthesisResult(null);
    setResultingCompoundSphere(null);
  };

  // Remove a sphere
  const removeSphere = (instanceId: string) => {
    setPlacedSpheres((prev) => prev.filter((s) => s.instanceId !== instanceId));
    setSynthesisResult(null);
    setResultingCompoundSphere(null);
    if (activeContextMenu?.instanceId === instanceId) setActiveContextMenu(null);
  };

  // Update sphere count (right-click popover)
  const updateSphereCount = (instanceId: string, delta: number) => {
    setPlacedSpheres((prev) =>
      prev.map((s) => {
        if (s.instanceId === instanceId) {
          const newCount = Math.max(1, s.count + delta);
          return { ...s, count: newCount };
        }
        return s;
      })
    );
    setSynthesisResult(null);
    setResultingCompoundSphere(null);
  };

  // Set explicit count
  const setExplicitCount = (instanceId: string, count: number) => {
    setPlacedSpheres((prev) =>
      prev.map((s) => (s.instanceId === instanceId ? { ...s, count: Math.max(1, count) } : s))
    );
    setSynthesisResult(null);
    setResultingCompoundSphere(null);
  };

  // SIMULATE COMBINATION / REACTION INSIDE BEAKER
  const handleSimulateReaction = () => {
    if (beakerSpheres.length < 2) return;

    setIsSimulating(true);

    setTimeout(() => {
      // Calculate combination
      const proportions = beakerSpheres.map((s) => ({
        symbol: s.element.symbol,
        ratio: s.count,
      }));

      const res = synthesizeCompoundFromElements(proportions);
      setSynthesisResult(res);
      setIsSimulating(false);

      if (res.success && res.compound) {
        setResultingCompoundSphere(res.compound);
        if (onSaveRun) {
          onSaveRun(
            `Synthesis: ${res.compound.formula} (${res.compound.commonName})`,
            `${res.compound.synthesisEquation} • ${res.compound.bondType} Bond • ${res.compound.energyChangeKj !== null ? `ΔH = ${res.compound.energyChangeKj} kJ/mol` : 'ΔH = Unmeasured (Candidate model)'}`,
            'Synthesis'
          );
        }
      }
    }, 1350);
  };

  const getStoichiometryResult = (): StoichiometryResult | null => {
    if (!resultingCompoundSphere || beakerSpheres.length < 2) return null;

    const reactants = beakerSpheres.map((s) => {
      const defaultMass = massInputs[s.element.symbol] ?? Number((s.count * s.element.atomicMass).toFixed(2));
      return {
        symbol: s.element.symbol,
        name: s.element.name,
        coefficient: s.count,
        molarMass: s.element.atomicMass,
        massGrams: Math.max(0.01, defaultMass),
      };
    });

    const product = {
      formula: resultingCompoundSphere.formula,
      coefficient: 1,
      molarMass: resultingCompoundSphere.molarMass,
    };

    return calculateLimitingReagent(reactants, product);
  };

  const open3DViewerForCompound = (compound: SynthesizedCompound) => {
    const matchingReagent = LAB_CHEMICALS.find(
      (c) => c.formula.toLowerCase() === compound.formula.toLowerCase()
    );
    if (matchingReagent) {
      setInspectChemical(matchingReagent);
      return;
    }

    // Build dynamic 3D ball-and-stick model
    const atoms: ParticleAtom3D[] = [];
    const bonds: [number, number][] = [];
    const constituents = compound.constituentAtoms || [];
    const flatAtoms: { symbol: string; color: string }[] = [];
    for (const c of constituents) {
      for (let i = 0; i < c.count; i++) {
        flatAtoms.push({ symbol: c.symbol, color: c.color });
      }
    }

    if (flatAtoms.length === 2) {
      atoms.push({ symbol: flatAtoms[0].symbol, name: flatAtoms[0].symbol, color: flatAtoms[0].color, radius: 22, x: -28, y: 0, z: 0 });
      atoms.push({ symbol: flatAtoms[1].symbol, name: flatAtoms[1].symbol, color: flatAtoms[1].color, radius: 22, x: 28, y: 0, z: 0 });
      bonds.push([0, 1]);
    } else if (flatAtoms.length > 2) {
      atoms.push({ symbol: flatAtoms[0].symbol, name: flatAtoms[0].symbol, color: flatAtoms[0].color, radius: 24, x: 0, y: 0, z: 0 });
      const ligands = flatAtoms.slice(1);
      ligands.forEach((l, lIdx) => {
        const angle = (2 * Math.PI * lIdx) / ligands.length;
        const r = 42;
        atoms.push({
          symbol: l.symbol,
          name: l.symbol,
          color: l.color,
          radius: 17,
          x: Number((r * Math.cos(angle)).toFixed(1)),
          y: Number((r * Math.sin(angle)).toFixed(1)),
          z: 0,
        });
        bonds.push([0, lIdx + 1]);
      });
    } else if (flatAtoms.length === 1) {
      atoms.push({ symbol: flatAtoms[0].symbol, name: flatAtoms[0].symbol, color: flatAtoms[0].color, radius: 26, x: 0, y: 0, z: 0 });
    }

    const dynamicChemical: LabChemicalItem = {
      id: `dynamic-${compound.formula.toLowerCase()}`,
      name: compound.commonName,
      formula: compound.formula,
      formulaHtml: compound.formulaHtml,
      category: 'salt',
      state: compound.physicalState === 'aqueous' ? 'liquid' : compound.physicalState,
      color: compound.appearanceColor,
      molarMass: compound.molarMass,
      ph: 7.0,
      hazardBadge: 'Safe',
      description: compound.description,
      molecular3D: {
        geometryName: compound.molecularGeometry || 'Coordination Geometry',
        atoms,
        bonds,
      },
    };
    setInspectChemical(dynamicChemical);
  };

  // Reset workplane to completely blank state
  const handleClearWorkplane = () => {
    setHasBeaker(false);
    setPlacedSpheres([]);
    setSynthesisResult(null);
    setResultingCompoundSphere(null);
    setActiveContextMenu(null);
  };

  const activeSphereInMenu = placedSpheres.find((s) => s.instanceId === activeContextMenu?.instanceId);

  return (
    <div className="workplane-container" style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 65px)', background: 'var(--lab-bg)' }}>
      {/* 3D Atomic & Molecular Inspector Modal */}
      {(inspectElement || inspectChemical) && (
        <Molecule3DViewer
          element={inspectElement}
          chemical={inspectChemical}
          onClose={() => {
            setInspectElement(null);
            setInspectChemical(null);
          }}
        />
      )}

      {/* LEFT SIDEBAR: PERIODIC ELEMENTS & REAGENTS */}
      <aside
        className="reagents-sidebar"
        style={{
          width: '340px',
          minWidth: '340px',
          background: 'var(--lab-surface)',
          borderRight: '3px solid var(--wood-frame)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
        }}
      >
        <div style={{ padding: '1.25rem 1rem 0.75rem', borderBottom: '2px solid var(--wood-frame)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--wood-frame)" strokeWidth="2.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3a9 9 0 0 1 9 9" />
              </svg>
              Elements Shelf
            </h2>
            <span className="lab-badge" style={{ background: 'var(--sticky-yellow)', color: 'var(--sticky-yellow-text)', fontWeight: 800 }}>
              {filteredElements.length} Elements
            </span>
          </div>

          {/* Tab Selector: Periodic Elements vs Reagents */}
          <div style={{ display: 'flex', background: 'var(--lab-surface-subtle)', padding: 3, borderRadius: 10, border: '1.5px solid var(--wood-frame)', marginBottom: '0.75rem' }}>
            <button
              type="button"
              className={`lab-btn ${sidebarTab === 'elements' ? 'lab-btn-primary' : 'lab-btn-ghost'}`}
              style={{ flex: 1, padding: '5px 8px', fontSize: '0.8rem' }}
              onClick={() => setSidebarTab('elements')}
            >
              Element Blocks
            </button>
            <button
              type="button"
              className={`lab-btn ${sidebarTab === 'compounds' ? 'lab-btn-primary' : 'lab-btn-ghost'}`}
              style={{ flex: 1, padding: '5px 8px', fontSize: '0.8rem' }}
              onClick={() => setSidebarTab('compounds')}
            >
              Reagents
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
            <input
              type="text"
              className="lab-input"
              placeholder={sidebarTab === 'elements' ? 'Search element (H, O, Fe, Na)...' : 'Search reagent (HCl, NaOH)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem' }}
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--wood-frame)"
              strokeWidth="2.5"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          {/* Element Category Filters */}
          {sidebarTab === 'elements' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {['all', 'nonmetal', 'metal', 'metalloid'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`lab-btn ${elementCategory === cat ? 'lab-btn-primary' : 'lab-btn-secondary'}`}
                  style={{ padding: '3px 9px', fontSize: '0.75rem', textTransform: 'capitalize' }}
                  onClick={() => setElementCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ELEMENTS LIST (Rendered as 3D SPHERES with names written on them) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {sidebarTab === 'elements' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem' }}>
              {filteredElements.map((el) => (
                <div
                  key={el.symbol}
                  draggable
                  onDragStart={(e) => handleDragStart(e, el.symbol)}
                  className="lab-card element-sphere-card"
                  style={{
                    padding: '0.75rem',
                    borderRadius: '14px',
                    background: 'var(--lab-surface-subtle)',
                    border: '2px solid var(--wood-frame)',
                    cursor: 'grab',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 3px 0 var(--wood-shadow)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  {/* 3D ELEMENT SPHERE with Symbol & Name Written on it */}
                  <div
                    className="element-3d-sphere"
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${el.color} 50%, #0f172a 100%)`,
                      boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset -2px -2px 5px rgba(0,0,0,0.5)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                      userSelect: 'none',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 900,
                        lineHeight: 1,
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                      }}
                    >
                      {el.symbol}
                    </span>
                    <span
                      style={{
                        fontSize: '0.52rem',
                        fontWeight: 700,
                        opacity: 0.9,
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                      }}
                    >
                      #{el.atomicNumber}
                    </span>
                  </div>

                  {/* Element Description & Actions */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff' }}>
                        {el.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--lab-font-mono)', fontWeight: 800 }}>
                        {el.atomicMass.toFixed(2)} u
                      </span>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2, fontWeight: 700 }}>
                      {el.category.replace(/-/g, ' ')} • {el.standardState}
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {/* 3D Atomic Internal Structure Viewer Button */}
                      <button
                        type="button"
                        className="lab-btn lab-btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.7rem', gap: 4 }}
                        title="View internal quantum orbitals, quarks, and electron shells"
                        onClick={() => setInspectElement(el)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                        </svg>
                        3D Orbit
                      </button>

                      {/* Add Sphere to Canvas */}
                      <button
                        type="button"
                        className="lab-btn lab-btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                        title="Place element on staging canvas"
                        onClick={() => addElementSphere(el, false)}
                      >
                        Stage
                      </button>

                      {/* Add Sphere to Beaker */}
                      <button
                        type="button"
                        className="lab-btn lab-btn-primary"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                        title="Add directly to reaction beaker"
                        onClick={() => addElementSphere(el, true)}
                      >
                        To Beaker
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Chemical Reagents Shelf */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {LAB_CHEMICALS.map((chem) => (
                <div
                  key={chem.id}
                  className="lab-card"
                  style={{
                    padding: '0.75rem',
                    borderRadius: '12px',
                    background: 'var(--lab-surface-subtle)',
                    border: '2px solid var(--wood-frame)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{ fontFamily: 'var(--lab-font-mono)', fontWeight: 800, color: 'var(--text-secondary)' }}
                      dangerouslySetInnerHTML={{ __html: chem.formulaHtml }}
                    />
                    <button
                      type="button"
                      className="lab-btn lab-btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                      onClick={() => setInspectChemical(chem)}
                    >
                      3D
                    </button>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#ffffff', fontWeight: 700, marginTop: 4 }}>
                    {chem.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* CENTER WORKPLANE: INITIALLY BLANK, BEAKER POSITIONED ON THE LEFT SIDE */}
      <section
        className="workplane-stage"
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDragOverWorkplane) setIsDragOverWorkplane(true);
        }}
        onDragLeave={() => setIsDragOverWorkplane(false)}
        onDrop={handleDropOnCanvas}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--lab-surface)',
          border: '8px solid var(--wood-frame)',
          borderRadius: '24px',
          boxShadow: '0 8px 0 var(--wood-bevel), 0 16px 36px rgba(0,0,0,0.45), inset 0 0 35px rgba(0,0,0,0.3)',
          position: 'relative',
          overflowY: 'auto',
          padding: '1.25rem 1.5rem',
        }}
        onClick={() => {
          if (activeContextMenu) setActiveContextMenu(null);
        }}
      >
        {/* Workspace Toolbar styled with chalkboard wood & sticky notes */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            background: 'var(--lab-surface-subtle)',
            padding: '0.85rem 1.25rem',
            borderRadius: '16px',
            border: '2.5px solid var(--wood-frame)',
            boxShadow: '0 4px 0 var(--wood-shadow)',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', margin: 0, fontFamily: 'var(--font-display)' }}>
              🧪 Kids Mix & React Lab!
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', fontWeight: 700 }}>
              {hasBeaker
                ? '✨ Drag element spheres into the beaker, then hit "Mix & React" to watch magic happen!'
                : '🌱 Play bench is ready! Place the reaction beaker or drop colorful element spheres to get started.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {/* Add / Toggle Beaker on Left Side */}
            {!hasBeaker ? (
              <button
                type="button"
                className="lab-btn lab-btn-primary"
                onClick={() => setHasBeaker(true)}
                style={{ gap: 6, fontWeight: 800 }}
              >
                <span>⚗️</span>
                Place Magic Beaker
              </button>
            ) : (
              <button
                type="button"
                className="lab-btn lab-btn-secondary"
                onClick={() => {
                  setHasBeaker(false);
                  setPlacedSpheres((prev) => prev.filter((s) => !s.inBeaker));
                  setSynthesisResult(null);
                  setResultingCompoundSphere(null);
                }}
                style={{ gap: 6 }}
              >
                Put Away Beaker
              </button>
            )}

            <button
              type="button"
              className="lab-btn lab-btn-secondary"
              onClick={handleClearWorkplane}
              style={{ gap: 6 }}
            >
              <span>🧹</span>
              Clear Bench
            </button>
          </div>
        </div>

        {/* WORKPLANE INTERIOR: SIDE-BY-SIDE LAYOUT WHEN BEAKER IS ACTIVE */}
        {hasBeaker ? (
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'minmax(350px, 420px) 1fr',
              gap: '1.25rem',
              alignItems: 'stretch',
            }}
          >
            {/* LEFT SIDE: THE REACTION BEAKER VESSEL */}
            <div
              className={`lab-card beaker-drop-zone ${isDragOverBeaker ? 'beaker-drag-hover' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isDragOverBeaker) setIsDragOverBeaker(true);
              }}
              onDragLeave={() => setIsDragOverBeaker(false)}
              onDrop={handleDropOnBeaker}
              style={{
                background: 'var(--lab-surface)',
                borderRadius: '18px',
                border: isDragOverBeaker ? '3.5px dashed var(--border-focus)' : '3.5px solid var(--wood-frame)',
                boxShadow: '0 5px 0 var(--wood-bevel), 0 10px 24px rgba(0,0,0,0.35)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {/* Beaker Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid var(--wood-frame)',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                    🧪 Magic Reaction Beaker
                  </span>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    ✨ 500 mL Borosilicate • Room Temp (25°C)
                  </div>
                </div>

                {/* Simulate Combination Button */}
                <button
                  type="button"
                  className="lab-btn lab-btn-primary"
                  onClick={handleSimulateReaction}
                  disabled={beakerSpheres.length < 2 || isSimulating}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    gap: 6,
                  }}
                >
                  <span>🎉</span>
                  {isSimulating ? 'Mixing...' : 'Mix & React!'}
                </button>
              </div>

              {/* BEAKER GRAPHIC VESSEL */}
              <div
                className={isSimulating ? 'beaker-mixing-rumble' : ''}
                style={{
                  position: 'relative',
                  width: '230px',
                  height: '270px',
                  margin: '0 auto 1rem',
                  transition: 'transform 0.15s ease',
                }}
              >
                {/* Steam / Vapor Wisps when mixing */}
                {isSimulating && (
                  <>
                    <div className="steam-wisp" style={{ left: '46px', animationDelay: '0s' }} />
                    <div className="steam-wisp" style={{ left: '106px', animationDelay: '0.4s' }} />
                    <div className="steam-wisp" style={{ left: '166px', animationDelay: '0.8s' }} />
                  </>
                )}

                {/* Pyrex Beaker Glass Outline */}
                <svg
                  width="230"
                  height="270"
                  viewBox="0 0 240 280"
                  style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}
                >
                  <path
                    d="M 20 20 L 32 30 L 208 30 L 220 20"
                    fill="none"
                    stroke="#86efac"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 32 30 L 32 250 Q 32 265 48 265 L 192 265 Q 208 265 208 250 L 208 30"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="3.5"
                  />
                  {/* Graduated Ticks */}
                  {[
                    { y: 65, label: '500 mL' },
                    { y: 110, label: '400 mL' },
                    { y: 155, label: '300 mL' },
                    { y: 200, label: '200 mL' },
                    { y: 240, label: '100 mL' },
                  ].map((tick) => (
                    <g key={tick.label}>
                      <line x1="175" y1={tick.y} x2="200" y2={tick.y} stroke="#15803d" strokeWidth="2" />
                      <text x="170" y={tick.y + 3.5} textAnchor="end" fill="#15803d" fontSize="9" fontWeight="700" fontFamily="var(--font-display)">
                        {tick.label}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* ACTIVE MIXING LIQUID VORTEX & STIR BAR */}
                {isSimulating && (
                  <>
                    <div className="liquid-vortex-active">
                      <div className="vortex-meniscus" />
                    </div>
                    <div className="magnetic-stir-bar" />
                    {[
                      { left: '26%', size: 7, delay: '0s' },
                      { left: '44%', size: 10, delay: '0.2s' },
                      { left: '62%', size: 6, delay: '0.45s' },
                      { left: '34%', size: 8, delay: '0.15s' },
                      { left: '72%', size: 5, delay: '0.35s' },
                      { left: '52%', size: 9, delay: '0.55s' },
                      { left: '28%', size: 6, delay: '0.7s' },
                      { left: '66%', size: 8, delay: '0.8s' },
                    ].map((b, i) => (
                      <div
                        key={i}
                        className="fizzy-bubble"
                        style={{
                          left: b.left,
                          width: b.size,
                          height: b.size,
                          animationDelay: b.delay,
                        }}
                      />
                    ))}
                  </>
                )}

                {/* LIQUID FILL (When reacted or hydrated) */}
                {resultingCompoundSphere && !isSimulating && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '16px',
                      left: '32px',
                      width: '166px',
                      height: '140px',
                      backgroundColor: resultingCompoundSphere.appearanceColor,
                      opacity: 0.65,
                      borderRadius: '0 0 16px 16px',
                      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      zIndex: 2,
                    }}
                  />
                )}

                {/* INSIDE BEAKER CONTENTS */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem 1.5rem',
                  }}
                >
                  {/* 1. MIXING IN PROGRESS ANIMATION STATE */}
                  {isSimulating ? (
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* Central Reaction Energy Plasma Core */}
                      <div className="reaction-energy-core" />

                      {/* Energetic Sparks Flying */}
                      {[
                        { tx: '36px', ty: '-32px', icon: '✨', delay: '0s' },
                        { tx: '-38px', ty: '-26px', icon: '⚡', delay: '0.12s' },
                        { tx: '32px', ty: '30px', icon: '💥', delay: '0.25s' },
                        { tx: '-32px', ty: '32px', icon: '✨', delay: '0.35s' },
                        { tx: '0px', ty: '-42px', icon: '⚡', delay: '0.18s' },
                      ].map((spark, i) => (
                        <div
                          key={i}
                          className="reaction-spark"
                          style={{
                            ['--tx' as string]: spark.tx,
                            ['--ty' as string]: spark.ty,
                            animationDelay: spark.delay,
                          }}
                        >
                          {spark.icon}
                        </div>
                      ))}

                      {/* Swirling Element Spheres Orbiting Vortex */}
                      <div
                        style={{
                          position: 'relative',
                          width: '130px',
                          height: '130px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {beakerSpheres.map((sphere, idx) => (
                          <div
                            key={sphere.instanceId}
                            className={idx % 2 === 0 ? 'mixing-sphere-orbit-cw' : 'mixing-sphere-orbit-ccw'}
                            style={{
                              position: 'absolute',
                              animationDelay: `${idx * -0.22}s`,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              filter: 'drop-shadow(0 0 8px rgba(254, 240, 138, 0.85))',
                            }}
                          >
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${sphere.element.color} 50%, #0f172a 100%)`,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontWeight: 900,
                                fontSize: '0.85rem',
                              }}
                            >
                              {sphere.element.symbol}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Active Status Badge */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          zIndex: 6,
                          background: 'rgba(0,0,0,0.75)',
                          color: '#fef08a',
                          padding: '3px 12px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          border: '1.5px solid var(--wood-frame)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        }}
                      >
                        ⚗️ Atoms reacting...
                      </div>
                    </div>
                  ) : resultingCompoundSphere ? (
                    /* 2. REACTION COMPLETE: RENDER COMPOUND SPHERE WITH FUSION BLOOM */
                    <div
                      className="compound-fusion-pop"
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      {/* Shockwave expanding ring */}
                      <div className="fusion-shockwave-ring" />

                      <div
                        onClick={() => open3DViewerForCompound(resultingCompoundSphere)}
                        style={{
                          width: '84px',
                          height: '84px',
                          borderRadius: '50%',
                          background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${resultingCompoundSphere.appearanceColor} 50%, #0f172a 100%)`,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 0 25px rgba(254, 240, 138, 0.7)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transform: 'scale(1.05)',
                          transition: 'transform 0.2s ease',
                          zIndex: 5,
                        }}
                        title="Click to view 3D Molecular Model"
                      >
                        <span
                          style={{
                            fontSize: '1.2rem',
                            fontWeight: 900,
                            textShadow: '0 2px 4px rgba(0,0,0,0.85)',
                          }}
                        >
                          {resultingCompoundSphere.formula}
                        </span>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            textShadow: '0 1px 2px rgba(0,0,0,0.85)',
                            marginTop: 2,
                          }}
                        >
                          {resultingCompoundSphere.commonName}
                        </span>
                      </div>

                      <span style={{ fontSize: '0.72rem', color: '#ffffff', background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '10px', marginTop: 8, border: '1px solid var(--wood-frame)', zIndex: 5 }}>
                        Click sphere for 3D
                      </span>
                    </div>
                  ) : beakerSpheres.length === 0 ? (
                    /* 3. EMPTY BEAKER STATE */
                    <div style={{ textAlign: 'center', color: '#86efac', fontSize: '0.84rem', fontWeight: 700, padding: '0 10px', fontFamily: 'var(--font-display)' }}>
                      ✨ Drop colorful element spheres here to mix!
                    </div>
                  ) : (
                    /* 4. UNREACTED ELEMENT SPHERES INSIDE BEAKER */
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: '170px' }}>
                      {beakerSpheres.map((sphere) => (
                        <div
                          key={sphere.instanceId}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setActiveContextMenu({ instanceId: sphere.instanceId, x: e.clientX, y: e.clientY });
                          }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${sphere.element.color} 50%, #0f172a 100%)`,
                              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              userSelect: 'none',
                              border: '1.5px solid rgba(255,255,255,0.4)',
                            }}
                          >
                            <span style={{ fontSize: '0.9rem', fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                              {sphere.element.symbol}
                            </span>
                            <span style={{ fontSize: '0.52rem', fontWeight: 800 }}>
                              {sphere.count}x
                            </span>
                          </div>

                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ffffff', marginTop: 2 }}>
                            {sphere.element.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* BEAKER REACTANTS TRAY */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>
                    Spheres in Beaker ({beakerSpheres.length})
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Right-click to tune
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {beakerSpheres.map((sphere) => (
                    <div
                      key={sphere.instanceId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'var(--lab-surface-subtle)',
                        border: '1.5px solid var(--wood-frame)',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                      }}
                    >
                      <span style={{ fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        {sphere.element.symbol}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#ffffff', fontWeight: 600 }}>
                        {sphere.count}x
                      </span>

                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          type="button"
                          className="lab-btn lab-btn-secondary"
                          style={{ padding: '0px 4px', fontSize: '0.65rem' }}
                          onClick={() => updateSphereCount(sphere.instanceId, -1)}
                        >
                          -
                        </button>
                        <button
                          type="button"
                          className="lab-btn lab-btn-secondary"
                          style={{ padding: '0px 4px', fontSize: '0.65rem' }}
                          onClick={() => updateSphereCount(sphere.instanceId, 1)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="lab-btn lab-btn-danger"
                        style={{ padding: '0px 4px', fontSize: '0.65rem' }}
                        onClick={() => removeSphere(sphere.instanceId)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SYNTHESIS RESULT BANNER */}
              {synthesisResult && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    background: synthesisResult.success ? 'rgba(20, 56, 40, 0.95)' : 'rgba(69, 10, 10, 0.95)',
                    border: synthesisResult.success ? '2px solid #34d399' : '2px solid #ef4444',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                  }}
                >
                  {synthesisResult.success && synthesisResult.compound ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          Formed: {synthesisResult.compound.commonName}
                        </span>
                        <span className="lab-badge" style={{ background: '#166534', color: '#bbf7d0', border: '1px solid #34d399', fontSize: '0.7rem' }}>
                          {synthesisResult.compound.bondType}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--lab-font-mono)', fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>
                        {synthesisResult.compound.synthesisEquation}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ΔH: {synthesisResult.compound.energyChangeKj !== null ? `${synthesisResult.compound.energyChangeKj} kJ/mol` : 'Unmeasured (Candidate model)'} • {synthesisResult.compound.molarMass} g/mol
                      </div>

                      <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="lab-btn lab-btn-primary"
                            style={{
                              flex: 1,
                              fontSize: '0.72rem',
                              padding: '5px 8px',
                              fontWeight: 700,
                              gap: 4,
                              justifyContent: 'center',
                            }}
                            onClick={() => synthesisResult.compound && open3DViewerForCompound(synthesisResult.compound)}
                          >
                            🔬 3D Orbit Model
                          </button>

                          <button
                            type="button"
                            className="lab-btn"
                            style={{
                              flex: 1.2,
                              background: showStoichiometry ? '#15803d' : 'var(--wood-frame)',
                              color: showStoichiometry ? '#ffffff' : '#331f0a',
                              border: '1px solid var(--wood-bevel)',
                              fontSize: '0.72rem',
                              padding: '5px 8px',
                              fontWeight: 800,
                              gap: 4,
                              justifyContent: 'center',
                            }}
                            onClick={() => setShowStoichiometry((prev) => !prev)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <path d="M7 12h10" />
                              <path d="M12 7v10" />
                            </svg>
                            {showStoichiometry ? 'Hide Yield' : 'Limiting Reagents'}
                          </button>
                        </div>

                        {showStoichiometry && (() => {
                          const stoich = getStoichiometryResult();
                          if (!stoich) return null;
                          return (
                            <div style={{ marginTop: '0.75rem', background: 'var(--lab-surface)', borderRadius: '10px', padding: '0.75rem', border: '2px solid var(--wood-frame)', boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                Quantitative Mass Inputs (grams)
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                                {beakerSpheres.map((s) => (
                                  <div key={s.instanceId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                    <span style={{ fontWeight: 700, color: '#ffffff' }}>
                                      {s.element.symbol} ({s.element.name}):
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <input
                                        type="number"
                                        min="0.1"
                                        step="0.5"
                                        value={massInputs[s.element.symbol] ?? Number((s.count * s.element.atomicMass).toFixed(2))}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0.1;
                                          setMassInputs((prev) => ({ ...prev, [s.element.symbol]: val }));
                                        }}
                                        style={{
                                          width: '75px',
                                          padding: '3px 6px',
                                          fontFamily: 'var(--lab-font-mono)',
                                          fontSize: '0.75rem',
                                          background: 'var(--lab-surface-subtle)',
                                          color: '#ffffff',
                                          border: '1.5px solid var(--wood-frame)',
                                          borderRadius: '6px',
                                          textAlign: 'right',
                                        }}
                                      />
                                      <span style={{ color: 'var(--text-muted)' }}>g</span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Limiting Reagent Callout */}
                              <div style={{ background: 'rgba(90, 20, 20, 0.85)', border: '1.5px solid #ef4444', borderRadius: '8px', padding: '6px 8px', marginBottom: 6 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                                  Limiting Reactant: {stoich.limitingReagentName} ({stoich.limitingReagentSymbol})
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>
                                  This reactant is completely consumed first, restricting maximum theoretical yield.
                                </div>
                              </div>

                              {/* Yield Output */}
                              <div style={{ fontSize: '0.75rem', color: '#ffffff', marginBottom: 4 }}>
                                <span style={{ fontWeight: 700 }}>Theoretical Yield: </span>
                                <span style={{ fontFamily: 'var(--lab-font-mono)', fontWeight: 800, color: '#34d399' }}>
                                  {stoich.theoreticalYieldGrams} g
                                </span>{' '}
                                ({stoich.theoreticalYieldMoles} mol {stoich.productFormula})
                              </div>

                              {/* Excess Remaining */}
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                                <span style={{ fontWeight: 700 }}>Excess Remaining: </span>
                                {stoich.excessReagents
                                  .filter((r) => r.symbol !== stoich.limitingReagentSymbol)
                                  .map((r) => `${r.symbol}: ${r.remainingGrams} g unreacted`)
                                  .join(', ') || 'None (Stoichiometrically exact)'}
                              </div>

                              {/* Mass Conservation */}
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--lab-font-mono)' }}>
                                Mass Conservation: {stoich.conservationOfMassCheck.totalInputGrams} g in = {stoich.conservationOfMassCheck.totalOutputGrams} g out ✓
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fecaca' }}>
                        Unsupported Combination
                      </span>
                      <p style={{ fontSize: '0.75rem', color: '#fca5a5', margin: '2px 0 0 0' }}>
                        {synthesisResult.unsupportedReason || 'No reaction under standard STP conditions.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT SIDE: THE OPEN WORKPLANE CANVAS & STAGING BENCH */}
            <div
              style={{
                background: 'var(--lab-surface)',
                borderRadius: '16px',
                border: isDragOverWorkplane ? '3px dashed var(--wood-frame)' : '4px solid var(--wood-frame)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1.2px, transparent 1.2px)',
                backgroundSize: '24px 24px',
                position: 'relative',
                boxShadow: '0 6px 0 var(--wood-bevel), inset 0 0 25px rgba(0,0,0,0.35)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                    Workplane Staging Bench ({canvasSpheres.length} Elements)
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Drag element spheres here from the sidebar shelf. Click "+ Put in Beaker" to transfer them to the left side!
                  </div>
                </div>
              </div>

              {canvasSpheres.length === 0 ? (
                <div
                  style={{
                    margin: 'auto',
                    textAlign: 'center',
                    padding: '2.5rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-muted)' }}>
                    Workplane bench is empty. Drag element spheres from the sidebar shelf into this area or into the beaker on the left!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {canvasSpheres.map((sphere) => (
                    <div
                      key={sphere.instanceId}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setActiveContextMenu({ instanceId: sphere.instanceId, x: e.clientX, y: e.clientY });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'var(--lab-surface-subtle)',
                        border: '2px solid var(--wood-frame)',
                        borderRadius: '30px',
                        padding: '6px 14px 6px 8px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                      }}
                    >
                      {/* 3D Sphere */}
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${sphere.element.color} 50%, #0f172a 100%)`,
                          boxShadow: '0 3px 8px rgba(0,0,0,0.35)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                        }}
                      >
                        <span style={{ fontSize: '0.9rem', fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                          {sphere.element.symbol}
                        </span>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                          {sphere.element.name} ({sphere.count}x)
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                          <button
                            type="button"
                            className="lab-btn lab-btn-primary"
                            style={{ padding: '2px 8px', fontSize: '0.68rem', gap: 4 }}
                            onClick={() => moveSphereToBeaker(sphere.instanceId)}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Move to Beaker
                          </button>
                          <button
                            type="button"
                            className="lab-btn lab-btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.68rem', gap: 4 }}
                            onClick={() => setInspectElement(sphere.element)}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <circle cx="12" cy="12" r="3" />
                              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                            </svg>
                            Substructure
                          </button>
                          <button
                            type="button"
                            className="lab-btn lab-btn-danger"
                            style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                            onClick={() => removeSphere(sphere.instanceId)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* FULL WIDTH BLANK WORKPLANE CANVAS (When beaker has not yet been placed) */
          <div
            style={{
              flex: 1,
              minHeight: '480px',
              background: 'var(--lab-surface)',
              borderRadius: '24px',
              border: isDragOverWorkplane ? '4px dashed var(--wood-frame)' : '6px solid var(--wood-frame)',
              position: 'relative',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 0 var(--wood-bevel), 0 16px 36px rgba(0,0,0,0.45), inset 0 0 35px rgba(0,0,0,0.35)',
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1.2px, transparent 1.2px)',
              backgroundSize: '24px 24px',
            }}
          >
            {placedSpheres.length === 0 ? (
              <div
                style={{
                  margin: 'auto',
                  textAlign: 'center',
                  maxWidth: '460px',
                  padding: '2.5rem',
                  color: 'var(--text-muted)',
                }}
              >
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: 'var(--lab-surface-subtle)',
                    border: '2px dashed var(--wood-frame)',
                    margin: '0 auto 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0' }}>
                  Chalkboard Workplane
                </h3>
                <p style={{ fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.25rem 0', color: 'var(--text-muted)' }}>
                  Drag element spheres from the sidebar onto this chalkboard, or click <strong style={{ color: 'var(--text-secondary)' }}>"Place reaction beaker"</strong> to stage the vessel on the left side of the workplane.
                </p>
                <button
                  type="button"
                  className="lab-btn lab-btn-primary"
                  onClick={() => setHasBeaker(true)}
                  style={{ margin: '0 auto', gap: 6 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
                    <path d="M8.5 2h7" />
                    <path d="M7 16h10" />
                  </svg>
                  Place Reaction Beaker on Left
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
                    Element Spheres on Workplane ({placedSpheres.length})
                  </div>
                  <button
                    type="button"
                    className="lab-btn lab-btn-primary"
                    onClick={() => setHasBeaker(true)}
                    style={{ gap: 6 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
                      <path d="M8.5 2h7" />
                      <path d="M7 16h10" />
                    </svg>
                    Place Beaker on Left to Combine
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {placedSpheres.map((sphere) => (
                    <div
                      key={sphere.instanceId}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setActiveContextMenu({ instanceId: sphere.instanceId, x: e.clientX, y: e.clientY });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'var(--lab-surface-subtle)',
                        border: '2px solid var(--wood-frame)',
                        borderRadius: '30px',
                        padding: '6px 14px 6px 8px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${sphere.element.color} 50%, #0f172a 100%)`,
                          boxShadow: '0 3px 8px rgba(0,0,0,0.35)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                        }}
                      >
                        <span style={{ fontSize: '0.9rem', fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                          {sphere.element.symbol}
                        </span>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                          {sphere.element.name} ({sphere.count}x)
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                          <button
                            type="button"
                            className="lab-btn lab-btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.68rem', gap: 4 }}
                            onClick={() => setInspectElement(sphere.element)}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <circle cx="12" cy="12" r="3" />
                              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                            </svg>
                            Substructure
                          </button>
                          <button
                            type="button"
                            className="lab-btn lab-btn-danger"
                            style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                            onClick={() => removeSphere(sphere.instanceId)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT-CLICK SPHERE QUANTITY POPUP */}
        {activeContextMenu && activeSphereInMenu && (
          <div
            style={{
              position: 'fixed',
              top: Math.min(window.innerHeight - 200, activeContextMenu.y),
              left: Math.min(window.innerWidth - 240, activeContextMenu.x),
              width: '230px',
              background: 'var(--lab-surface)',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
              border: '3px solid var(--wood-frame)',
              zIndex: 100,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#ffffff' }}>
                {activeSphereInMenu.element.name} ({activeSphereInMenu.element.symbol})
              </span>
              <button
                type="button"
                onClick={() => setActiveContextMenu(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Set Proportion / Count:
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`lab-btn ${activeSphereInMenu.count === count ? 'lab-btn-primary' : 'lab-btn-secondary'}`}
                  style={{ flex: 1, padding: '4px', fontSize: '0.75rem', fontWeight: 700 }}
                  onClick={() => setExplicitCount(activeSphereInMenu.instanceId, count)}
                >
                  {count}x
                </button>
              ))}
            </div>

            <button
              type="button"
              className="lab-btn lab-btn-primary"
              style={{ width: '100%', padding: '6px', fontSize: '0.78rem' }}
              onClick={() => setActiveContextMenu(null)}
            >
              Done
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

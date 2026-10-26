import React, { useState, useEffect, useRef } from 'react';
import type { LabChemicalItem, ParticleAtom3D } from '../chemistry-data/reagents';
import { getElementShells, type ChemicalElement } from '../chemistry-data/elements';

interface Molecule3DViewerProps {
  chemical?: LabChemicalItem | null;
  element?: ChemicalElement | null;
  onClose?: () => void;
}

export type InternalStructureLayer = 'quantum_orbitals' | 'nucleus_quarks' | 'bohr_shells' | 'de_broglie_waves';
export type ViewerTheme = 'vivid_cosmic' | 'vivid_lab';

// Vivid Atom Color Palettes for High-Impact 3D Ball-and-Stick Rendering
const VIVID_ATOM_PALETTE: Record<string, { base: string; highlight: string; shadow: string; glow: string }> = {
  H: { base: '#00d2ff', highlight: '#e0f7ff', shadow: '#0077b6', glow: 'rgba(0, 210, 255, 0.7)' }, // Electric Cyan
  C: { base: '#6366f1', highlight: '#c7d2fe', shadow: '#312e81', glow: 'rgba(99, 102, 241, 0.7)' }, // Vivid Indigo
  O: { base: '#ff1744', highlight: '#ffe4e6', shadow: '#9f1239', glow: 'rgba(255, 23, 68, 0.75)' }, // Radiant Ruby
  N: { base: '#2563eb', highlight: '#bfdbfe', shadow: '#1e3a8a', glow: 'rgba(37, 99, 235, 0.7)' },  // Cobalt Blue
  Cl: { base: '#00e676', highlight: '#bbf7d0', shadow: '#047857', glow: 'rgba(0, 230, 118, 0.7)' }, // Neon Lime
  F: { base: '#a855f7', highlight: '#f3e8ff', shadow: '#6b21a8', glow: 'rgba(168, 85, 247, 0.7)' }, // Electric Violet
  Br: { base: '#e11d48', highlight: '#ffe4e6', shadow: '#881337', glow: 'rgba(225, 29, 72, 0.7)' }, // Vivid Crimson
  I: { base: '#7c3aed', highlight: '#ede9fe', shadow: '#4c1d95', glow: 'rgba(124, 58, 237, 0.7)' }, // Royal Amethyst
  Na: { base: '#f59e0b', highlight: '#fef3c7', shadow: '#92400e', glow: 'rgba(245, 158, 11, 0.7)' }, // Radiant Amber
  K: { base: '#d946ef', highlight: '#fae8ff', shadow: '#86198f', glow: 'rgba(217, 70, 239, 0.7)' }, // Laser Magenta
  Mg: { base: '#14b8a6', highlight: '#ccfbf1', shadow: '#0f766e', glow: 'rgba(20, 184, 166, 0.7)' }, // Bright Teal
  Ca: { base: '#38bdf8', highlight: '#e0f2fe', shadow: '#0369a1', glow: 'rgba(56, 189, 248, 0.7)' }, // Sky Luster
  Fe: { base: '#ea580c', highlight: '#ffedd5', shadow: '#9a3412', glow: 'rgba(234, 88, 12, 0.7)' }, // Molten Flame
  Cu: { base: '#f97316', highlight: '#ffedd5', shadow: '#c2410c', glow: 'rgba(249, 115, 22, 0.7)' }, // Lustrous Copper
  Zn: { base: '#06b6d4', highlight: '#cffafe', shadow: '#0e7490', glow: 'rgba(6, 182, 212, 0.7)' }, // Vivid Aqua
  Pb: { base: '#64748b', highlight: '#e2e8f0', shadow: '#1e293b', glow: 'rgba(100, 116, 139, 0.7)' }, // Platinum Luster
  Ba: { base: '#10b981', highlight: '#d1fae5', shadow: '#065f46', glow: 'rgba(16, 185, 129, 0.7)' }, // Emerald Luster
  S: { base: '#eab308', highlight: '#fef9c3', shadow: '#854d0e', glow: 'rgba(234, 179, 8, 0.75)' }, // Solar Gold
  P: { base: '#fb923c', highlight: '#ffedd5', shadow: '#9a3412', glow: 'rgba(251, 146, 60, 0.7)' }, // Neon Tangerine
};

// Bohr Shell Spectral Colors (n = 1..7)
const SHELL_SPECTRAL_COLORS = [
  '#c084fc', // n=1: Luminous Violet
  '#60a5fa', // n=2: Electric Blue
  '#34d399', // n=3: Vivid Emerald
  '#facc15', // n=4: Radiant Amber
  '#fb923c', // n=5: Neon Orange
  '#f43f5e', // n=6: Hot Rose
  '#38bdf8', // n=7: Vivid Cyan
];

export const Molecule3DViewer: React.FC<Molecule3DViewerProps> = ({
  chemical,
  element,
  onClose,
}) => {
  // 3-Axis Rotation Angles (Eulerian: rotX = pitch, rotY = yaw, rotZ = roll)
  const [rotX, setRotX] = useState<number>(0.35);
  const [rotY, setRotY] = useState<number>(0.6);
  const [rotZ, setRotZ] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.2);

  // Dragging & Touch Tracking
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pinchDist, setPinchDist] = useState<number | null>(null);
  const [pinchStartZoom, setPinchStartZoom] = useState<number>(1.2);

  // Animation & Theme State
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [spinSpeed, setSpinSpeed] = useState<number>(1.0);
  const [themeMode, setThemeMode] = useState<ViewerTheme>('vivid_cosmic');
  const [elementLayer, setElementLayer] = useState<InternalStructureLayer>('quantum_orbitals');
  const [time, setTime] = useState<number>(0);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Animation and Auto-rotation loop
  useEffect(() => {
    let animId: number;
    const updateLoop = () => {
      setTime((prev) => prev + 0.035);
      if (autoRotate && !isDragging && pinchDist === null) {
        setRotY((prev) => (prev + 0.01 * spinSpeed) % (Math.PI * 2));
      }
      animId = requestAnimationFrame(updateLoop);
    };
    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [autoRotate, isDragging, pinchDist, spinSpeed]);

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;

    if (e.shiftKey) {
      // Shift + Drag: Roll (rotZ)
      setRotZ((prev) => prev + dx * 0.015);
    } else {
      // Standard Drag: Yaw (rotY) & Pitch (rotX)
      setRotY((prev) => prev + dx * 0.015);
      setRotX((prev) => Math.max(-Math.PI * 0.85, Math.min(Math.PI * 0.85, prev + dy * 0.015)));
    }
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Drag & Pinch Handlers (Mobile & Touch Screen)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setPinchDist(dist);
      setPinchStartZoom(zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - lastPos.x;
      const dy = e.touches[0].clientY - lastPos.y;
      setRotY((prev) => prev + dx * 0.018);
      setRotX((prev) => Math.max(-Math.PI * 0.85, Math.min(Math.PI * 0.85, prev + dy * 0.018)));
      setLastPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && pinchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / pinchDist;
      setZoom(Math.max(0.5, Math.min(3.2, pinchStartZoom * scaleFactor)));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setPinchDist(null);
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(3.2, z - e.deltaY * 0.0015)));
  };

  // Camera Presets
  const setCameraPreset = (preset: 'isometric' | 'top' | 'front' | 'side') => {
    if (preset === 'isometric') {
      setRotX(0.35);
      setRotY(0.6);
      setRotZ(0);
    } else if (preset === 'top') {
      setRotX(Math.PI / 2);
      setRotY(0);
      setRotZ(0);
    } else if (preset === 'front') {
      setRotX(0);
      setRotY(0);
      setRotZ(0);
    } else if (preset === 'side') {
      setRotX(0);
      setRotY(Math.PI / 2);
      setRotZ(0);
    }
  };

  // 3D Eulerian Projection Helper (Roll Z -> Yaw Y -> Pitch X -> Perspective)
  const project3D = (x: number, y: number, z: number, scaleMultiplier: number = 2.4) => {
    const scale = scaleMultiplier * zoom;
    const rawX = x * scale;
    const rawY = y * scale;
    const rawZ = z * scale;

    // 1. Roll (rotZ)
    const cosZ = Math.cos(rotZ);
    const sinZ = Math.sin(rotZ);
    const x0 = rawX * cosZ - rawY * sinZ;
    const y0 = rawX * sinZ + rawY * cosZ;
    const z0 = rawZ;

    // 2. Yaw (rotY)
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = x0 * cosY - z0 * sinY;
    const z1 = x0 * sinY + z0 * cosY;

    // 3. Pitch (rotX)
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y2 = y0 * cosX - z1 * sinX;
    const z2 = y0 * sinX + z1 * cosX;

    const centerX = 200;
    const centerY = 190;
    const perspective = 400 / (400 - Math.min(280, z2));

    return {
      screenX: centerX + x1 * perspective,
      screenY: centerY + y2 * perspective,
      depthZ: z2,
      perspective,
    };
  };

  // Target Metadata
  const isElementMode = Boolean(element);
  const title = element ? `${element.name} (${element.symbol})` : chemical?.name || 'Chemical Structure';
  const subtitle = element
    ? `Atomic Number: ${element.atomicNumber} • Atomic Mass: ${element.atomicMass} u • Group ${element.group}, Period ${element.period}`
    : `Formula: ${chemical?.formula} • Molar Mass: ${chemical?.molarMass} g/mol`;

  const atomicNumber = element?.atomicNumber || 1;
  const atomicMass = element?.atomicMass || 1;
  const numProtons = atomicNumber;
  const numNeutrons = Math.max(0, Math.round(atomicMass) - numProtons);
  const shells = element ? getElementShells(element.atomicNumber) : [];

  const hasPOorbitals = atomicNumber >= 5;
  const hasDorbitals = atomicNumber >= 21;

  // 1. BOHR SHELL ELECTRONS WITH TRAILING TRAILS
  const orbitingElectrons: {
    id: string;
    shellIdx: number;
    color: string;
    screenX: number;
    screenY: number;
    depthZ: number;
    radius: number;
    trailCoords: { x: number; y: number; opacity: number }[];
  }[] = [];

  if (isElementMode) {
    shells.forEach((electronCount, shellIdx) => {
      const shellRadius = 45 + shellIdx * 28;
      const speed = 1.6 / (shellIdx + 1);
      const shellTilt = shellIdx * 0.45;
      const shellColor = SHELL_SPECTRAL_COLORS[shellIdx % SHELL_SPECTRAL_COLORS.length];

      for (let eIdx = 0; eIdx < electronCount; eIdx++) {
        const baseAngle = (2 * Math.PI * eIdx) / electronCount;
        const currentAngle = baseAngle + time * speed;

        const localX = shellRadius * Math.cos(currentAngle);
        const localZ = shellRadius * Math.sin(currentAngle);
        const localY = localZ * Math.sin(shellTilt);

        const proj = project3D(localX, localY, localZ * Math.cos(shellTilt));

        // Generate 3 glowing comet trail points
        const trailCoords = [1, 2, 3].map((step) => {
          const tAngle = currentAngle - step * 0.12;
          const tx = shellRadius * Math.cos(tAngle);
          const tz = shellRadius * Math.sin(tAngle);
          const ty = tz * Math.sin(shellTilt);
          const tProj = project3D(tx, ty, tz * Math.cos(shellTilt));
          return { x: tProj.screenX, y: tProj.screenY, opacity: 0.6 / step };
        });

        orbitingElectrons.push({
          id: `elec-${shellIdx}-${eIdx}`,
          shellIdx,
          color: shellColor,
          screenX: proj.screenX,
          screenY: proj.screenY,
          depthZ: proj.depthZ,
          radius: Math.max(4.5, 6 * proj.perspective * zoom),
          trailCoords,
        });
      }
    });
  }

  // 2. NUCLEUS PARTICLES (Vivid Protons & Neutrons in 3D Lattice)
  const nucleusParticles = [];
  const maxNucleons = Math.min(28, numProtons + numNeutrons);
  for (let i = 0; i < maxNucleons; i++) {
    const phi = Math.acos(-1 + (2 * i) / maxNucleons);
    const theta = Math.sqrt(maxNucleons * Math.PI) * phi;
    const r = 24;
    const isProton = i % 2 === 0 && i / 2 < numProtons;
    const proj = project3D(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
      3.2
    );
    nucleusParticles.push({
      id: `nucleon-${i}`,
      type: isProton ? 'Proton' : 'Neutron',
      symbol: isProton ? 'p⁺' : 'n⁰',
      color: isProton ? '#ff1744' : '#2563eb', // Vivid Ruby vs Vivid Sapphire
      screenX: proj.screenX,
      screenY: proj.screenY,
      depthZ: proj.depthZ,
      radius: Math.max(10, 14 * proj.perspective),
    });
  }

  // 3. QUARKS (Up-Up-Down with Dynamic Quantum Chromodynamics Gluon String Arcs)
  const quarkParticles = [
    { name: 'Up Quark (u)', symbol: 'u', charge: '+2/3e', colorName: 'Red Color Charge', color: '#ff1744', angle: 0 },
    { name: 'Up Quark (u)', symbol: 'u', charge: '+2/3e', colorName: 'Green Color Charge', color: '#00e676', angle: (2 * Math.PI) / 3 },
    { name: 'Down Quark (d)', symbol: 'd', charge: '-1/3e', colorName: 'Blue Color Charge', color: '#2979ff', angle: (4 * Math.PI) / 3 },
  ].map((q, qIdx) => {
    const r = 40;
    const localX = r * Math.cos(q.angle + time * 1.6);
    const localY = r * Math.sin(q.angle + time * 1.6);
    const proj = project3D(localX, localY, 0, 2.8);
    return {
      ...q,
      id: `quark-${qIdx}`,
      screenX: proj.screenX,
      screenY: proj.screenY,
      depthZ: proj.depthZ,
      radius: Math.max(12, 16 * proj.perspective),
    };
  });

  // 4. QUANTUM ORBITAL LOBES (Vivid Phase Wave surfaces)
  const orbitalLobes = [];
  // Spherical 1s orbital
  const sProj = project3D(0, 0, 0);
  orbitalLobes.push({
    id: 'orbital-1s',
    name: '1s Spherical Wave Orbital (l=0, m=0)',
    type: 's',
    screenX: sProj.screenX,
    screenY: sProj.screenY,
    depthZ: sProj.depthZ,
    radius: 38 * zoom,
    color: '#00d2ff',
    opacity: 0.38,
  });

  if (hasPOorbitals) {
    // 2px lobes along X axis (+ and - wave phases)
    const pxPos = project3D(50, 0, 0);
    const pxNeg = project3D(-50, 0, 0);
    orbitalLobes.push({
      id: 'orbital-px-pos',
      name: '2px Wave Lobe (Positive Phase ψ+)',
      type: 'p',
      screenX: pxPos.screenX,
      screenY: pxPos.screenY,
      depthZ: pxPos.depthZ,
      radius: 30 * pxPos.perspective * zoom,
      color: '#00f5d4', // Radiant Neon Aqua
      opacity: 0.72,
    });
    orbitalLobes.push({
      id: 'orbital-px-neg',
      name: '2px Wave Lobe (Negative Phase ψ-)',
      type: 'p',
      screenX: pxNeg.screenX,
      screenY: pxNeg.screenY,
      depthZ: pxNeg.depthZ,
      radius: 30 * pxNeg.perspective * zoom,
      color: '#ff007f', // Radiant Neon Magenta
      opacity: 0.72,
    });

    // 2py lobes along Y axis (+ and - wave phases)
    const pyPos = project3D(0, 50, 0);
    const pyNeg = project3D(0, -50, 0);
    orbitalLobes.push({
      id: 'orbital-py-pos',
      name: '2py Wave Lobe (Positive Phase ψ+)',
      type: 'p',
      screenX: pyPos.screenX,
      screenY: pyPos.screenY,
      depthZ: pyPos.depthZ,
      radius: 30 * pyPos.perspective * zoom,
      color: '#00f5d4',
      opacity: 0.72,
    });
    orbitalLobes.push({
      id: 'orbital-py-neg',
      name: '2py Wave Lobe (Negative Phase ψ-)',
      type: 'p',
      screenX: pyNeg.screenX,
      screenY: pyNeg.screenY,
      depthZ: pyNeg.depthZ,
      radius: 30 * pyNeg.perspective * zoom,
      color: '#ff007f',
      opacity: 0.72,
    });

    // 2pz lobes along Z axis (+ and - wave phases)
    const pzPos = project3D(0, 0, 50);
    const pzNeg = project3D(0, 0, -50);
    orbitalLobes.push({
      id: 'orbital-pz-pos',
      name: '2pz Wave Lobe (Positive Phase ψ+)',
      type: 'p',
      screenX: pzPos.screenX,
      screenY: pzPos.screenY,
      depthZ: pzPos.depthZ,
      radius: 30 * pzPos.perspective * zoom,
      color: '#00f5d4',
      opacity: 0.72,
    });
    orbitalLobes.push({
      id: 'orbital-pz-neg',
      name: '2pz Wave Lobe (Negative Phase ψ-)',
      type: 'p',
      screenX: pzNeg.screenX,
      screenY: pzNeg.screenY,
      depthZ: pzNeg.depthZ,
      radius: 30 * pzNeg.perspective * zoom,
      color: '#ff007f',
      opacity: 0.72,
    });
  }

  // 3d Cloverleaf Lobes for Transition Metals
  if (hasDorbitals) {
    const d1 = project3D(38, 38, 0);
    const d2 = project3D(-38, 38, 0);
    const d3 = project3D(-38, -38, 0);
    const d4 = project3D(38, -38, 0);
    orbitalLobes.push(
      { id: 'orbital-d1', name: '3dxy Clover Lobe (+)', type: 'd', screenX: d1.screenX, screenY: d1.screenY, depthZ: d1.depthZ, radius: 24 * d1.perspective * zoom, color: '#f59e0b', opacity: 0.7 },
      { id: 'orbital-d2', name: '3dxy Clover Lobe (-)', type: 'd', screenX: d2.screenX, screenY: d2.screenY, depthZ: d2.depthZ, radius: 24 * d2.perspective * zoom, color: '#8b5cf6', opacity: 0.7 },
      { id: 'orbital-d3', name: '3dxy Clover Lobe (+)', type: 'd', screenX: d3.screenX, screenY: d3.screenY, depthZ: d3.depthZ, radius: 24 * d3.perspective * zoom, color: '#f59e0b', opacity: 0.7 },
      { id: 'orbital-d4', name: '3dxy Clover Lobe (-)', type: 'd', screenX: d4.screenX, screenY: d4.screenY, depthZ: d4.depthZ, radius: 24 * d4.perspective * zoom, color: '#8b5cf6', opacity: 0.7 }
    );
  }

  // 5. CHEMICAL COMPOUND BALL & STICK PROJECTION WITH VIVID CPK COLORS
  let projectedAtoms: {
    id: string;
    originalIndex: number;
    symbol: string;
    name: string;
    baseColor: string;
    lightColor: string;
    darkColor: string;
    glowColor: string;
    screenX: number;
    screenY: number;
    depthZ: number;
    radius: number;
  }[] = [];
  let bondsToRender: [number, number][] = [];

  if (chemical) {
    const atomsToRender: ParticleAtom3D[] = chemical.molecular3D.atoms;
    bondsToRender = chemical.molecular3D.bonds;

    projectedAtoms = atomsToRender.map((atom, idx) => {
      const proj = project3D(atom.x, atom.y, atom.z);
      const palette = VIVID_ATOM_PALETTE[atom.symbol] || {
        base: atom.color,
        highlight: '#ffffff',
        shadow: '#1e293b',
        glow: 'rgba(56, 189, 248, 0.5)',
      };

      return {
        id: `${atom.symbol}-${idx}`,
        originalIndex: idx,
        symbol: atom.symbol,
        name: atom.name,
        baseColor: palette.base,
        lightColor: palette.highlight,
        darkColor: palette.shadow,
        glowColor: palette.glow,
        screenX: proj.screenX,
        screenY: proj.screenY,
        depthZ: proj.depthZ,
        radius: Math.max(10, atom.radius * proj.perspective * zoom),
      };
    });
  }

  const isCosmic = themeMode === 'vivid_cosmic';

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.25rem',
      }}
      onClick={onClose}
    >
      <div
        className="lab-card"
        style={{
          width: '100%',
          maxWidth: '890px',
          background: isCosmic ? '#0b1120' : 'var(--lab-surface)',
          borderRadius: '18px',
          boxShadow: isCosmic ? '0 25px 60px rgba(0, 210, 255, 0.2)' : '0 20px 45px rgba(0,0,0,0.5), 0 6px 0 var(--wood-bevel)',
          border: isCosmic ? '1px solid rgba(56, 189, 248, 0.3)' : '3px solid var(--wood-frame)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          transition: 'background 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER BAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.1rem 1.75rem',
            borderBottom: isCosmic ? '1px solid rgba(56, 189, 248, 0.2)' : '2px solid var(--wood-frame)',
            background: isCosmic ? 'linear-gradient(90deg, #0f172a 0%, #1e1b4b 100%)' : 'var(--lab-surface-subtle)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #00d2ff 0%, #7928ca 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0, 210, 255, 0.4)',
                }}
              >
                {element ? element.symbol : chemical?.formula}
              </span>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {title}
              </h2>
              {element && (
                <span
                  style={{
                    background: isCosmic ? 'rgba(0, 230, 118, 0.15)' : '#166534',
                    color: isCosmic ? '#00e676' : '#bbf7d0',
                    border: isCosmic ? '1px solid rgba(0, 230, 118, 0.4)' : '1px solid #34d399',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  Element # {element.atomicNumber} • {element.category}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: isCosmic ? '#94a3b8' : 'var(--text-secondary)', marginTop: 4 }}>
              {subtitle}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Theme Toggle Button */}
            <button
              type="button"
              className="lab-btn"
              onClick={() => setThemeMode(isCosmic ? 'vivid_lab' : 'vivid_cosmic')}
              style={{
                background: isCosmic ? 'rgba(56, 189, 248, 0.15)' : 'var(--lab-surface)',
                color: isCosmic ? '#38bdf8' : '#ffffff',
                border: isCosmic ? '1px solid rgba(56, 189, 248, 0.4)' : '1.5px solid var(--wood-frame)',
                fontSize: '0.75rem',
                padding: '5px 10px',
                fontWeight: 700,
              }}
            >
              {isCosmic ? '✨ Cosmic Neon' : '🔬 Chalkboard Lab'}
            </button>

            {/* Close Button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: isCosmic ? 'rgba(255, 255, 255, 0.1)' : 'var(--lab-surface)',
                  border: '1.5px solid var(--wood-frame)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  color: isCosmic ? '#f8fafc' : 'var(--text-secondary)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* SUBSTRUCTURE LAYER TABS (When viewing periodic element) */}
        {isElementMode && (
          <div
            style={{
              display: 'flex',
              background: isCosmic ? '#060a14' : '#f8fafc',
              padding: '8px 1.75rem',
              borderBottom: isCosmic ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid var(--lab-border)',
              gap: '6px',
              overflowX: 'auto',
            }}
          >
            {[
              { id: 'quantum_orbitals', label: '⚛️ 1. Quantum Orbitals (s, p, d)' },
              { id: 'nucleus_quarks', label: '🔬 2. Nucleus & Quarks (u, d)' },
              { id: 'bohr_shells', label: `🪐 3. Bohr Energy Shells (${shells.length})` },
              { id: 'de_broglie_waves', label: '🌊 4. de Broglie Matter Waves' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`lab-btn ${elementLayer === tab.id ? 'lab-btn-primary' : 'lab-btn-secondary'}`}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  gap: 6,
                  background:
                    elementLayer === tab.id
                      ? 'linear-gradient(135deg, #00d2ff 0%, #0072ff 100%)'
                      : isCosmic
                      ? 'rgba(255, 255, 255, 0.05)'
                      : undefined,
                  color: elementLayer === tab.id ? '#ffffff' : isCosmic ? '#94a3b8' : undefined,
                  border: isCosmic && elementLayer !== tab.id ? '1px solid rgba(255,255,255,0.1)' : undefined,
                }}
                onClick={() => setElementLayer(tab.id as InternalStructureLayer)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* INTERACTIVE 3D STAGE (Touch + Mouse Drag-to-Rotate + Wheel Zoom) */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onWheel={handleWheel}
          style={{
            position: 'relative',
            height: '420px',
            background: isCosmic
              ? 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #0a0e1a 100%)'
              : 'radial-gradient(circle at 50% 50%, #ffffff 0%, #f1f5f9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            overflow: 'hidden',
            touchAction: 'none', // Prevents browser scroll on touch devices during drag
          }}
        >
          {/* Cosmic Background Nebula & Stardust Grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: isCosmic
                ? 'radial-gradient(rgba(56, 189, 248, 0.25) 1.5px, transparent 1.5px)'
                : 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
              backgroundSize: '24px 24px',
              opacity: isCosmic ? 0.45 : 0.6,
            }}
          />

          <svg width="400" height="400" viewBox="0 0 400 400" style={{ overflow: 'visible' }}>
            <defs>
              {/* Glowing Filters */}
              <filter id="vivid-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="orbital-halo" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Dynamic 3D Spherical Gradients for Ball-and-Stick */}
              {projectedAtoms.map((atom) => (
                <radialGradient key={`grad-${atom.id}`} id={`grad-${atom.id}`} cx="32%" cy="30%" r="68%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="35%" stopColor={atom.lightColor} />
                  <stop offset="65%" stopColor={atom.baseColor} />
                  <stop offset="100%" stopColor={atom.darkColor} />
                </radialGradient>
              ))}

              {/* Nuclear Protons & Neutrons Gradients */}
              <radialGradient id="vivid-proton" cx="32%" cy="30%" r="68%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="40%" stopColor="#ff1744" />
                <stop offset="100%" stopColor="#881337" />
              </radialGradient>

              <radialGradient id="vivid-neutron" cx="32%" cy="30%" r="68%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="40%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </radialGradient>

              {/* Quark QCD Color Charge Gradients */}
              <radialGradient id="quark-red" cx="32%" cy="30%" r="68%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#ff0055" />
                <stop offset="100%" stopColor="#880022" />
              </radialGradient>
              <radialGradient id="quark-green" cx="32%" cy="30%" r="68%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#00e676" />
                <stop offset="100%" stopColor="#006935" />
              </radialGradient>
              <radialGradient id="quark-blue" cx="32%" cy="30%" r="68%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#2979ff" />
                <stop offset="100%" stopColor="#0d47a1" />
              </radialGradient>

              {/* Tubular Bond Gradient */}
              <linearGradient id="bond-tube" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="45%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
            </defs>

            {/* 1. QUANTUM ORBITALS VIEW (s, px, py, pz, d wave surfaces in 3D) */}
            {isElementMode && elementLayer === 'quantum_orbitals' && (
              <g id="quantum-orbitals-scene">
                {/* 3D Coordinate Reference Axes (Vivid RGB: X=Red, Y=Green, Z=Blue) */}
                <g opacity={isCosmic ? 0.75 : 0.5}>
                  <line
                    x1={project3D(-85, 0, 0).screenX}
                    y1={project3D(-85, 0, 0).screenY}
                    x2={project3D(85, 0, 0).screenX}
                    y2={project3D(85, 0, 0).screenY}
                    stroke="#ff1744"
                    strokeWidth="1.8"
                    strokeDasharray="4 3"
                  />
                  <line
                    x1={project3D(0, -85, 0).screenX}
                    y1={project3D(0, -85, 0).screenY}
                    x2={project3D(0, 85, 0).screenX}
                    y2={project3D(0, 85, 0).screenY}
                    stroke="#00e676"
                    strokeWidth="1.8"
                    strokeDasharray="4 3"
                  />
                  <line
                    x1={project3D(0, 0, -85).screenX}
                    y1={project3D(0, 0, -85).screenY}
                    x2={project3D(0, 0, 85).screenX}
                    y2={project3D(0, 0, 85).screenY}
                    stroke="#2979ff"
                    strokeWidth="1.8"
                    strokeDasharray="4 3"
                  />
                </g>

                {/* Depth-Sorted 3D Wave Orbital Lobes */}
                {orbitalLobes
                  .sort((a, b) => a.depthZ - b.depthZ)
                  .map((lobe) => (
                    <g
                      key={lobe.id}
                      onMouseEnter={() => setHoveredEntity(lobe.name)}
                      onMouseLeave={() => setHoveredEntity(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={lobe.screenX}
                        cy={lobe.screenY}
                        r={lobe.radius}
                        fill={lobe.color}
                        opacity={lobe.opacity}
                        stroke="#ffffff"
                        strokeWidth="1.6"
                        filter="url(#orbital-halo)"
                      />
                    </g>
                  ))}

                {/* Central Glowing Atomic Core */}
                <circle
                  cx="200"
                  cy="190"
                  r="15"
                  fill="url(#vivid-proton)"
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter="url(#vivid-glow)"
                />
                <text x="200" y="195" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900">
                  {element?.symbol}
                </text>
              </g>
            )}

            {/* 2. NUCLEUS & QUARK SUBSTRUCTURE (Zoom into Protons, Neutrons & QCD Quarks) */}
            {isElementMode && elementLayer === 'nucleus_quarks' && (
              <g id="nucleus-quarks-scene">
                {/* Nuclear Strong Force Bag Boundary */}
                <circle
                  cx="200"
                  cy="190"
                  r="115"
                  fill="none"
                  stroke={isCosmic ? '#00e676' : '#10b981'}
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  opacity="0.6"
                  filter="url(#vivid-glow)"
                />
                <text
                  x="200"
                  y="62"
                  textAnchor="middle"
                  fill={isCosmic ? '#00e676' : '#166534'}
                  fontSize="11"
                  fontWeight="800"
                  fontFamily="var(--lab-font-mono)"
                >
                  Nuclear Strong Force Radius (r ≈ 1.2 × 10⁻¹⁵ m)
                </text>

                {/* Nucleon Cluster (Depth-Sorted) */}
                {nucleusParticles
                  .sort((a, b) => a.depthZ - b.depthZ)
                  .map((p) => (
                    <g
                      key={p.id}
                      onMouseEnter={() => setHoveredEntity(`${p.type} (${p.symbol}) - Nuclear Constituent`)}
                      onMouseLeave={() => setHoveredEntity(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={p.screenX}
                        cy={p.screenY}
                        r={p.radius}
                        fill={p.type === 'Proton' ? 'url(#vivid-proton)' : 'url(#vivid-neutron)'}
                        stroke="#ffffff"
                        strokeWidth="1.4"
                        filter="url(#vivid-glow)"
                      />
                      <text
                        x={p.screenX}
                        y={p.screenY + 4}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize={Math.max(9, p.radius * 0.7)}
                        fontWeight="800"
                      >
                        {p.symbol}
                      </text>
                    </g>
                  ))}

                {/* Subatomic Proton Magnification with Triad Quarks */}
                <g id="quark-triad" transform="translate(0, 0)">
                  {/* Gluon Color Exchange Strings (Vivid Electric Flux Waves) */}
                  <line
                    x1={quarkParticles[0].screenX}
                    y1={quarkParticles[0].screenY}
                    x2={quarkParticles[1].screenX}
                    y2={quarkParticles[1].screenY}
                    stroke="#facc15"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    filter="url(#vivid-glow)"
                  />
                  <line
                    x1={quarkParticles[1].screenX}
                    y1={quarkParticles[1].screenY}
                    x2={quarkParticles[2].screenX}
                    y2={quarkParticles[2].screenY}
                    stroke="#facc15"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    filter="url(#vivid-glow)"
                  />
                  <line
                    x1={quarkParticles[2].screenX}
                    y1={quarkParticles[2].screenY}
                    x2={quarkParticles[0].screenX}
                    y2={quarkParticles[0].screenY}
                    stroke="#facc15"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    filter="url(#vivid-glow)"
                  />

                  {/* 3 Quarks */}
                  {quarkParticles.map((q, idx) => {
                    const qGrad = idx === 0 ? 'url(#quark-red)' : idx === 1 ? 'url(#quark-green)' : 'url(#quark-blue)';
                    return (
                      <g
                        key={q.id}
                        onMouseEnter={() => setHoveredEntity(`${q.name} • Charge: ${q.charge} • ${q.colorName}`)}
                        onMouseLeave={() => setHoveredEntity(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={q.screenX}
                          cy={q.screenY}
                          r={q.radius}
                          fill={qGrad}
                          stroke="#ffffff"
                          strokeWidth="2"
                          filter="url(#vivid-glow)"
                        />
                        <text
                          x={q.screenX}
                          y={q.screenY + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="900"
                        >
                          {q.symbol}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </g>
            )}

            {/* 3. BOHR ENERGY SHELLS & RAINBOW ELECTRON ORBITS */}
            {isElementMode && elementLayer === 'bohr_shells' && (
              <g id="bohr-shells-scene">
                {/* Concentric Quantum Shell Tracks */}
                {shells.map((_count, sIdx) => {
                  const sRadius = (45 + sIdx * 28) * zoom;
                  const shellColor = SHELL_SPECTRAL_COLORS[sIdx % SHELL_SPECTRAL_COLORS.length];
                  return (
                    <g key={`shell-ring-${sIdx}`}>
                      <ellipse
                        cx="200"
                        cy="190"
                        rx={sRadius}
                        ry={sRadius * 0.45}
                        fill="none"
                        stroke={shellColor}
                        strokeWidth="1.8"
                        strokeDasharray="4 4"
                        opacity={isCosmic ? 0.75 : 0.6}
                      />
                      <text
                        x={200 + sRadius + 8}
                        y={194}
                        fill={shellColor}
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="var(--lab-font-mono)"
                      >
                        n={sIdx + 1} ({['K', 'L', 'M', 'N', 'O', 'P', 'Q'][sIdx]})
                      </text>
                    </g>
                  );
                })}

                {/* Revolving Electrons with Glowing Comet Trails */}
                {orbitingElectrons
                  .sort((a, b) => a.depthZ - b.depthZ)
                  .map((e) => (
                    <g
                      key={e.id}
                      onMouseEnter={() => setHoveredEntity(`Electron in Shell n=${e.shellIdx + 1} (K, L, M...)`)}
                      onMouseLeave={() => setHoveredEntity(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Comet Sparks */}
                      {e.trailCoords.map((pt, pIdx) => (
                        <circle
                          key={`trail-${pIdx}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={e.radius * (0.8 - pIdx * 0.2)}
                          fill={e.color}
                          opacity={pt.opacity}
                        />
                      ))}

                      {/* Main Glowing Electron */}
                      <circle
                        cx={e.screenX}
                        cy={e.screenY}
                        r={e.radius}
                        fill={e.color}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        filter="url(#vivid-glow)"
                      />
                    </g>
                  ))}

                {/* Nucleus Core */}
                <circle
                  cx="200"
                  cy="190"
                  r="16"
                  fill="url(#vivid-proton)"
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter="url(#vivid-glow)"
                />
                <text x="200" y="195" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">
                  {element?.symbol}
                </text>
              </g>
            )}

            {/* 4. DE BROGLIE MATTER WAVES */}
            {isElementMode && elementLayer === 'de_broglie_waves' && (
              <g id="de-broglie-scene">
                {/* Harmonic Standing Wave Resonances */}
                {[1, 2, 3, 4].map((harmonic) => {
                  const ringR = harmonic * 34 * zoom;
                  const waveAmp = 5 * Math.sin(time * 2 + harmonic);
                  const waveColor = SHELL_SPECTRAL_COLORS[harmonic % SHELL_SPECTRAL_COLORS.length];
                  return (
                    <circle
                      key={`matter-wave-${harmonic}`}
                      cx="200"
                      cy="190"
                      r={ringR + waveAmp}
                      fill="none"
                      stroke={waveColor}
                      strokeWidth="2.2"
                      opacity={0.75}
                      strokeDasharray="6 3"
                      filter="url(#orbital-halo)"
                    />
                  );
                })}

                <circle
                  cx="200"
                  cy="190"
                  r="16"
                  fill="url(#vivid-proton)"
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter="url(#vivid-glow)"
                />
                <text x="200" y="195" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">
                  {element?.symbol}
                </text>
              </g>
            )}

            {/* 5. CHEMICAL COMPOUND BALL & STICK (Vivid Glossy 3D Model) */}
            {!isElementMode && chemical && (
              <g id="molecule-ball-and-stick">
                {/* 3D Tubular Bonds */}
                {bondsToRender.map(([idxA, idxB], bIdx) => {
                  const atomA = projectedAtoms[idxA];
                  const atomB = projectedAtoms[idxB];
                  if (!atomA || !atomB) return null;
                  const avgDepth = (atomA.depthZ + atomB.depthZ) / 2;
                  const bondWidth = Math.max(4, 6 * (400 / (400 - Math.min(280, avgDepth))) * zoom);

                  return (
                    <g key={`bond-${bIdx}`}>
                      {/* Dual-tone shaded cylindrical bond */}
                      <line
                        x1={atomA.screenX}
                        y1={atomA.screenY}
                        x2={atomB.screenX}
                        y2={atomB.screenY}
                        stroke="url(#bond-tube)"
                        strokeWidth={bondWidth}
                        strokeLinecap="round"
                        opacity={0.92}
                      />
                      {/* Specular highlight strip on bond */}
                      <line
                        x1={atomA.screenX}
                        y1={atomA.screenY}
                        x2={atomB.screenX}
                        y2={atomB.screenY}
                        stroke="#ffffff"
                        strokeWidth={bondWidth * 0.28}
                        strokeLinecap="round"
                        opacity={0.5}
                      />
                    </g>
                  );
                })}

                {/* 3D Glossy Atom Spheres (Depth-Sorted) */}
                {projectedAtoms
                  .sort((a, b) => a.depthZ - b.depthZ)
                  .map((atom) => (
                    <g
                      key={atom.id}
                      onMouseEnter={() => setHoveredEntity(`${atom.name} (${atom.symbol})`)}
                      onMouseLeave={() => setHoveredEntity(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Outer Glow Aura */}
                      <circle
                        cx={atom.screenX}
                        cy={atom.screenY}
                        r={atom.radius * 1.08}
                        fill={atom.glowColor}
                        opacity={0.5}
                        filter="url(#vivid-glow)"
                      />

                      {/* Main 3D Glossy Sphere */}
                      <circle
                        cx={atom.screenX}
                        cy={atom.screenY}
                        r={atom.radius}
                        fill={`url(#grad-${atom.id})`}
                        stroke="#ffffff"
                        strokeWidth="1.8"
                      />

                      {/* Chemical Symbol Label */}
                      <text
                        x={atom.screenX}
                        y={atom.screenY + Math.max(4, atom.radius * 0.35)}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize={Math.max(10, atom.radius * 0.68)}
                        fontWeight="900"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                      >
                        {atom.symbol}
                      </text>
                    </g>
                  ))}
              </g>
            )}
          </svg>

          {/* TOUCH & MOUSE INTERACTION BADGE */}
          <div
            style={{
              position: 'absolute',
              bottom: 14,
              left: 16,
              background: isCosmic ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: '24px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: isCosmic ? '#f8fafc' : 'var(--lab-text)',
              border: isCosmic ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--lab-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            <span>👆 Touch / Drag to Rotate 360° • Pinch / Wheel to Zoom</span>
            {hoveredEntity && (
              <span style={{ color: '#00d2ff', fontWeight: 800 }}>
                • {hoveredEntity}
              </span>
            )}
          </div>

          {/* 3D CAMERA & SPIN CONTROLS TOOLBAR */}
          <div
            style={{
              position: 'absolute',
              bottom: 14,
              right: 16,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            {/* Camera Presets Menu */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className="lab-btn lab-btn-secondary"
                style={{ padding: '5px 8px', fontSize: '0.72rem' }}
                onClick={() => setCameraPreset('isometric')}
                title="Isometric View"
              >
                📐 3D
              </button>
              <button
                type="button"
                className="lab-btn lab-btn-secondary"
                style={{ padding: '5px 8px', fontSize: '0.72rem' }}
                onClick={() => setCameraPreset('top')}
                title="Top View"
              >
                ⬆ Top
              </button>
              <button
                type="button"
                className="lab-btn lab-btn-secondary"
                style={{ padding: '5px 8px', fontSize: '0.72rem' }}
                onClick={() => setCameraPreset('front')}
                title="Front View"
              >
                👁 Front
              </button>
            </div>

            {/* Auto-Spin Toggle */}
            <button
              type="button"
              className="lab-btn"
              style={{
                padding: '5px 10px',
                fontSize: '0.75rem',
                background: autoRotate ? 'linear-gradient(135deg, #00d2ff 0%, #0072ff 100%)' : 'var(--lab-surface-subtle)',
                color: '#ffffff',
                border: '1.5px solid var(--wood-frame)',
                fontWeight: 700,
              }}
              onClick={() => setAutoRotate(!autoRotate)}
            >
              {autoRotate ? '⏸ Pause' : '▶ Spin'}
            </button>

            {/* Spin Speed Switcher */}
            <button
              type="button"
              className="lab-btn lab-btn-secondary"
              style={{ padding: '5px 8px', fontSize: '0.72rem' }}
              onClick={() => setSpinSpeed((s) => (s === 1.0 ? 2.0 : s === 2.0 ? 0.5 : 1.0))}
              title="Spin Speed"
            >
              {spinSpeed}x
            </button>

            {/* Zoom In / Out */}
            <button
              type="button"
              className="lab-btn lab-btn-secondary"
              style={{ padding: '5px 8px', fontSize: '0.75rem' }}
              onClick={() => setZoom((z) => Math.min(3.0, z + 0.2))}
              title="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              className="lab-btn lab-btn-secondary"
              style={{ padding: '5px 8px', fontSize: '0.75rem' }}
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              title="Zoom Out"
            >
              -
            </button>

            {/* Reset Camera */}
            <button
              type="button"
              className="lab-btn lab-btn-secondary"
              style={{ padding: '5px 8px', fontSize: '0.72rem' }}
              onClick={() => {
                setRotX(0.35);
                setRotY(0.6);
                setRotZ(0);
                setZoom(1.2);
              }}
              title="Reset View"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* SCIENTIFIC METADATA DASHBOARD */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            background: isCosmic ? '#0f172a' : 'var(--lab-surface)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.25rem',
            borderTop: isCosmic ? '1px solid rgba(56, 189, 248, 0.2)' : '2px solid var(--wood-frame)',
            fontSize: '0.85rem',
            color: '#ffffff',
          }}
        >
          {isElementMode && element ? (
            <>
              <div>
                <div style={{ color: isCosmic ? '#94a3b8' : 'var(--lab-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  Nucleus Composition
                </div>
                <div style={{ fontWeight: 800, marginTop: 2 }}>
                  {numProtons} Protons (uud) • {numNeutrons} Neutrons (udd)
                </div>
              </div>

              <div>
                <div style={{ color: isCosmic ? '#94a3b8' : 'var(--lab-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  Electron Configuration
                </div>
                <div style={{ fontWeight: 800, fontFamily: 'var(--lab-font-mono)', color: '#00d2ff', marginTop: 2 }}>
                  {element.electronConfiguration}
                </div>
              </div>

              <div>
                <div style={{ color: isCosmic ? '#94a3b8' : 'var(--lab-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  Active Orbitals
                </div>
                <div style={{ fontWeight: 800, marginTop: 2 }}>
                  1s, {hasPOorbitals ? '2s, 2p (px, py, pz)' : '1s only'} {hasDorbitals ? ', 3d clover' : ''}
                </div>
              </div>

              <div>
                <div style={{ color: isCosmic ? '#94a3b8' : 'var(--lab-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  Electronegativity
                </div>
                <div style={{ fontWeight: 800, marginTop: 2 }}>
                  {element.electronegativity ? `${element.electronegativity} (Pauling Scale)` : 'Noble / Inert'}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ color: isCosmic ? '#94a3b8' : 'var(--lab-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  Molecular Geometry
                </div>
                <div style={{ fontWeight: 800, marginTop: 2, color: '#00d2ff' }}>
                  {chemical?.molecular3D.geometryName}
                </div>
              </div>

              <div>
                <div style={{ color: isCosmic ? '#94a3b8' : 'var(--lab-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  Constituent Atoms ({chemical?.molecular3D.atoms.length})
                </div>
                <div style={{ fontWeight: 800, marginTop: 2 }}>
                  {chemical?.molecular3D.atoms.map((a) => a.symbol).join(', ')}
                </div>
              </div>

              <div>
                <div style={{ color: isCosmic ? '#94a3b8' : 'var(--lab-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  Hazard Rating
                </div>
                <div style={{ marginTop: 2 }}>
                  <span className={`hazard-badge hazard-${chemical?.hazardBadge.toLowerCase().replace(/\s+/g, '-')}`}>
                    {chemical?.hazardBadge}
                  </span>
                </div>
                <div style={{ color: isCosmic ? '#94a3b8' : 'var(--lab-text-muted)', fontSize: '0.68rem', marginTop: 3 }}>
                  Academic reference model. Consult official SDS for physical handling.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

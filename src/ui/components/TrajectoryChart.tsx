import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ProjectileResults } from '../../core/experiment/types';

interface TrajectoryChartProps {
  results: ProjectileResults;
  v0: number;
  angleDeg: number;
  gravity: number;
}

export type ViewScaleMode = 'envelope' | 'isometric' | 'fit';

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({
  results,
  v0,
  angleDeg,
  gravity,
}) => {
  const { range, maxHeight, flightTime, trajectory } = results;

  // View Mode: 'envelope' (default, reveals angle variation relative to max possible launch)
  // 'isometric' (1:1 physical aspect ratio, launch slope matches angle degree)
  // 'fit' (zoomed to active arc)
  const [viewMode, setViewMode] = useState<ViewScaleMode>('envelope');

  // Animation & Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animIndex, setAnimIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showVectors, setShowVectors] = useState<boolean>(true);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // SVG Chart Dimensions
  const svgWidth = 760;
  const svgHeight = 400;
  const paddingLeft = 70;
  const paddingRight = 45;
  const paddingTop = 45;
  const paddingBottom = 65;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Reset animation when parameters change
  useEffect(() => {
    lastTimeRef.current = null;
    const frameId = requestAnimationFrame(() => {
      setAnimIndex(0);
      setIsPlaying(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, [results, v0, angleDeg, gravity]);

  // RequestAnimationFrame Loop for smooth, physical motion
  useEffect(() => {
    if (!isPlaying || flightTime === 0 || trajectory.length === 0) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const durationMs = (flightTime * 1000) / playbackSpeed;

    const animate = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }

      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      setAnimIndex((prev) => {
        const step = (delta / durationMs) * 100;
        const next = prev + step;
        if (next >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return next;
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, flightTime, playbackSpeed, trajectory.length]);

  // Theoretical limits for the active launch speed & gravity:
  // Maximum possible range is achieved at theta = 45 deg: R_max = v0^2 / g
  // Maximum possible height is achieved at theta = 90 deg: H_max = v0^2 / (2g)
  const maxTheorRange = useMemo(() => Math.max((v0 * v0) / gravity, 1), [v0, gravity]);
  const maxTheorHeight = useMemo(() => Math.max((v0 * v0) / (2 * gravity), 1), [v0, gravity]);

  // Coordinate Domain Scaling Calculations based on ViewMode
  const { scaleX, scaleY, maxX, maxY } = useMemo(() => {
    if (viewMode === 'fit') {
      // Auto-fit to active trajectory bounds
      const mX = Math.max(range * 1.08, 1);
      const mY = Math.max(maxHeight * 1.25, 1);
      return {
        maxX: mX,
        maxY: mY,
        scaleX: (x: number) => paddingLeft + (x / mX) * chartWidth,
        scaleY: (y: number) => paddingTop + chartHeight - (y / mY) * chartHeight,
      };
    }

    if (viewMode === 'isometric') {
      // True 1:1 physical meter-to-pixel ratio
      const reqMetersX = Math.max(maxTheorRange * 1.05, range * 1.05, 1);
      const reqMetersY = Math.max(maxTheorHeight * 1.1, maxHeight * 1.1, 1);
      const pxPerMeter = Math.min(chartWidth / reqMetersX, chartHeight / reqMetersY);
      const mX = chartWidth / pxPerMeter;
      const mY = chartHeight / pxPerMeter;
      return {
        maxX: mX,
        maxY: mY,
        scaleX: (x: number) => paddingLeft + x * pxPerMeter,
        scaleY: (y: number) => paddingTop + chartHeight - y * pxPerMeter,
      };
    }

    // Default: 'envelope' (Physics Launch Envelope)
    // Anchored to the maximum capability of this launch velocity so angle changes visibly reshape the curve
    const mX = Math.max(maxTheorRange * 1.08, range * 1.08, 1);
    const mY = Math.max(maxTheorHeight * 1.15, maxHeight * 1.15, 1);
    return {
      maxX: mX,
      maxY: mY,
      scaleX: (x: number) => paddingLeft + (x / mX) * chartWidth,
      scaleY: (y: number) => paddingTop + chartHeight - (y / mY) * chartHeight,
    };
  }, [viewMode, range, maxHeight, maxTheorRange, maxTheorHeight, chartWidth, chartHeight]);

  // Launch angle in radians
  const thetaRad = (angleDeg * Math.PI) / 180;

  // Path data for the full curve
  const pathData = useMemo(() => {
    if (angleDeg === 0 || trajectory.length === 0) return '';
    return trajectory.reduce((acc, [x, y], idx) => {
      const sx = scaleX(x);
      const sy = scaleY(y);
      return idx === 0 ? `M ${sx} ${sy}` : `${acc} L ${sx} ${sy}`;
    }, '');
  }, [trajectory, scaleX, scaleY, angleDeg]);

  // Current interpolated simulation point
  const currentFloatIndex = Math.min(100, Math.max(0, animIndex));
  const baseIdx = Math.floor(currentFloatIndex);
  const frac = currentFloatIndex - baseIdx;
  const p1 = trajectory[baseIdx] || [0, 0];
  const p2 = trajectory[Math.min(100, baseIdx + 1)] || p1;

  const currentX = p1[0] + (p2[0] - p1[0]) * frac;
  const currentY = Math.max(0, p1[1] + (p2[1] - p1[1]) * frac);
  const currentTime = (flightTime * currentFloatIndex) / 100;

  // Current velocity vector
  const vx = v0 * Math.cos(thetaRad);
  const vy = v0 * Math.sin(thetaRad) - gravity * currentTime;
  const currentSpeed = Math.sqrt(vx * vx + vy * vy);

  // Instantaneous flight angle in SVG screen degrees (SVG Y is inverted)
  const screenAngleDeg = useMemo(() => {
    if (angleDeg === 0) return 0;
    if (angleDeg === 90) return vy >= 0 ? -90 : 90;
    // vy > 0 is climbing, in SVG that is negative rotation
    return (-Math.atan2(vy, vx) * 180) / Math.PI;
  }, [angleDeg, vy, vx]);

  // Path traversed so far
  const traversedPath = useMemo(() => {
    if (angleDeg === 0 || trajectory.length === 0) return '';
    const traversedPoints = trajectory.slice(0, baseIdx + 1);
    return traversedPoints.reduce((acc, [x, y], idx) => {
      const sx = scaleX(x);
      const sy = scaleY(y);
      return idx === 0 ? `M ${sx} ${sy}` : `${acc} L ${sx} ${sy}`;
    }, '');
  }, [trajectory, baseIdx, scaleX, scaleY, angleDeg]);

  const apexX = scaleX(range > 0 ? range / 2 : 0);
  const apexY = scaleY(maxHeight);
  const impactX = scaleX(range);
  const impactY = scaleY(0);

  const handleLaunchOrReplay = () => {
    setAnimIndex(0);
    setIsPlaying(true);
    lastTimeRef.current = null;
  };

  const handleTogglePlay = () => {
    if (animIndex >= 100) {
      handleLaunchOrReplay();
    } else {
      setIsPlaying(!isPlaying);
      lastTimeRef.current = null;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: 20 }}>
      {/* Header with Parameters, View Mode Switcher, & Live Telemetry HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 17, margin: 0 }}>Interactive Trajectory Diagram</h3>
            <span className="badge badge-emerald" style={{ animation: isPlaying && angleDeg > 0 ? 'pulse-dot 1s infinite' : 'none' }}>
              {angleDeg === 0 ? '⚓ READY ON PAD' : isPlaying ? '● SIMULATING LIVE' : animIndex >= 100 ? '✓ TOUCHDOWN' : '⏸ PAUSED'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            <span className="badge badge-amber" style={{ fontSize: 12, fontWeight: 800 }}>
              📐 Angle θ = {angleDeg}°
            </span>
            <span className="badge badge-indigo" style={{ fontSize: 12 }}>v₀ = {v0} m/s</span>
            <span className="badge badge-emerald" style={{ fontSize: 12 }}>g = {gravity.toFixed(2)} m/s²</span>

            {/* View Mode Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: 6, marginLeft: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 2 }}>Scale:</span>
              <button
                type="button"
                className={`btn ${viewMode === 'envelope' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '2px 8px', fontSize: 11, borderRadius: 4 }}
                onClick={() => setViewMode('envelope')}
                title="Physics Envelope: Shows how angle affects height & range relative to maximum possible launch distance"
              >
                🚀 Physics Envelope
              </button>
              <button
                type="button"
                className={`btn ${viewMode === 'isometric' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '2px 8px', fontSize: 11, borderRadius: 4 }}
                onClick={() => setViewMode('isometric')}
                title="1:1 Isometric: True physical aspect ratio where angle on screen matches angle in degrees"
              >
                📏 1:1 Scale
              </button>
              <button
                type="button"
                className={`btn ${viewMode === 'fit' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '2px 8px', fontSize: 11, borderRadius: 4 }}
                onClick={() => setViewMode('fit')}
                title="Auto-Fit: Zoom to fit current curve"
              >
                🔍 Auto-Fit
              </button>
            </div>
          </div>
        </div>

        {/* Live Flight Telemetry HUD */}
        <div style={{
          display: 'flex',
          gap: 12,
          background: 'rgba(0, 0, 0, 0.45)',
          padding: '8px 16px',
          borderRadius: 8,
          border: '1.5px solid var(--wood-frame)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>TIME: </span>
            <strong style={{ color: '#38bdf8' }}>{currentTime.toFixed(2)} s</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>DIST: </span>
            <strong style={{ color: '#34d399' }}>{currentX.toFixed(2)} m</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>ALT: </span>
            <strong style={{ color: '#fcd34d' }}>{currentY.toFixed(2)} m</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>SPEED: </span>
            <strong style={{ color: '#a855f7' }}>{currentSpeed.toFixed(1)} m/s</strong>
          </div>
        </div>
      </div>

      {/* SVG Trajectory Canvas */}
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', height: 'auto', maxHeight: 420, overflow: 'visible', userSelect: 'none' }}
        id="projectile-trajectory-svg"
      >
        <defs>
          <linearGradient id="fullPathGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.35)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0.35)" />
          </linearGradient>
          <linearGradient id="activePathGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="glowEffect" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sky / Grid Background Canvas Area */}
        <rect
          x={paddingLeft}
          y={paddingTop}
          width={chartWidth}
          height={chartHeight}
          fill="rgba(0, 0, 0, 0.2)"
          rx="4"
        />

        {/* Y-Axis Grid Lines & Tick Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const val = maxY * pct;
          const yPos = scaleY(val);
          return (
            <g key={pct}>
              <line
                x1={paddingLeft}
                y1={yPos}
                x2={paddingLeft + chartWidth}
                y2={yPos}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="3 3"
              />
              <text
                x={paddingLeft - 10}
                y={yPos + 4}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="11"
                fontFamily="var(--font-mono)"
                fontWeight="600"
              >
                {val.toFixed(1)}m
              </text>
            </g>
          );
        })}

        {/* X-Axis Grid Lines & Tick Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const val = maxX * pct;
          const xPos = scaleX(val);
          return (
            <g key={pct}>
              <line
                x1={xPos}
                y1={paddingTop}
                x2={xPos}
                y2={paddingTop + chartHeight}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="3 3"
              />
              <text
                x={xPos}
                y={paddingTop + chartHeight + 20}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="11"
                fontFamily="var(--font-mono)"
                fontWeight="600"
              >
                {val.toFixed(1)}m
              </text>
            </g>
          );
        })}

        {/* Ground Terrain Baseline (Heavy line with tactile grass / stone styling) */}
        <line
          x1={paddingLeft - 10}
          y1={scaleY(0)}
          x2={paddingLeft + chartWidth + 10}
          y2={scaleY(0)}
          stroke="#10b981"
          strokeWidth="3"
        />

        {/* Flat Ground Launch Note if angle is 0 */}
        {angleDeg === 0 && (
          <g>
            <text
              x={paddingLeft + chartWidth / 2}
              y={paddingTop + chartHeight / 2}
              textAnchor="middle"
              fill="#fcd34d"
              fontSize="14"
              fontWeight="bold"
              fontFamily="var(--font-display)"
            >
              📐 Launch Angle is 0° (Level with ground)
            </text>
            <text
              x={paddingLeft + chartWidth / 2}
              y={paddingTop + chartHeight / 2 + 24}
              textAnchor="middle"
              fill="var(--text-muted)"
              fontSize="12"
            >
              Tilt the Launch Angle slider above 0° to launch into the sky!
            </text>
          </g>
        )}

        {/* Full Predicted Parabolic Trajectory (Dashed Background Arc) */}
        {pathData && (
          <path
            d={pathData}
            fill="none"
            stroke="url(#fullPathGradient)"
            strokeWidth="2.5"
            strokeDasharray="5 4"
          />
        )}

        {/* Active Traversed Trajectory (Solid Glowing Foreground Arc) */}
        {traversedPath && (
          <path
            d={`${traversedPath} L ${scaleX(currentX)} ${scaleY(currentY)}`}
            fill="none"
            stroke="url(#activePathGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Launch Cannon Base & Aiming Protractor */}
        <g transform={`translate(${scaleX(0)}, ${scaleY(0)})`}>
          {/* Ground Launch Pad */}
          <rect x="-26" y="-3" width="52" height="6" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1" />

          {/* Angle Protractor Arc (showing angle theta visually at the cannon) */}
          {angleDeg > 0 && angleDeg < 90 && (
            <g>
              <path
                d={`M 36 0 A 36 36 0 0 0 ${36 * Math.cos(thetaRad)} ${-36 * Math.sin(thetaRad)}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="3 2"
              />
              <text
                x={46 * Math.cos(thetaRad / 2)}
                y={-46 * Math.sin(thetaRad / 2)}
                fill="#fcd34d"
                fontSize="11"
                fontWeight="800"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {angleDeg}°
              </text>
            </g>
          )}

          {/* Cannon Stand Mounting */}
          <polygon points="-12,0 0,-14 12,0" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="0" cy="-14" r="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />

          {/* Cannon Barrel pivoted dynamically at angle theta */}
          <g transform={`translate(0, -14) rotate(${-angleDeg})`}>
            {/* Barrel tube */}
            <rect x="0" y="-6" width="30" height="12" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
            <rect x="26" y="-7" width="5" height="14" rx="1" fill="#7dd3fc" />
          </g>
        </g>

        {/* Apex Height Marker */}
        {maxHeight > 0 && angleDeg > 0 && (
          <g>
            <circle cx={apexX} cy={apexY} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
            <line
              x1={apexX}
              y1={apexY}
              x2={apexX}
              y2={scaleY(0)}
              stroke="rgba(245, 158, 11, 0.45)"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
            <text
              x={apexX}
              y={apexY - 12}
              textAnchor="middle"
              fill="#fcd34d"
              fontSize="12"
              fontWeight="bold"
              fontFamily="var(--font-mono)"
            >
              Apex: {maxHeight.toFixed(2)}m
            </text>
          </g>
        )}

        {/* Landing Target Marker / Flag */}
        {range > 0 && (
          <g transform={`translate(${impactX}, ${impactY})`}>
            <circle r="6" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="0" y1="0" x2="0" y2="-22" stroke="#10b981" strokeWidth="2" />
            <polygon points="0,-22 14,-17 0,-12" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
            <text
              x="0"
              y="-28"
              textAnchor="middle"
              fill="#34d399"
              fontSize="12"
              fontWeight="bold"
              fontFamily="var(--font-mono)"
            >
              Range: {range.toFixed(2)}m
            </text>
          </g>
        )}

        {/* 90° Vertical Touchdown Notice */}
        {angleDeg === 90 && maxHeight > 0 && (
          <text
            x={scaleX(0) + 16}
            y={scaleY(0) - 20}
            fill="#a7f3d0"
            fontSize="11"
            fontFamily="var(--font-mono)"
          >
            🎯 Launch Pad (0.00m)
          </text>
        )}

        {/* Animated Rocket Projectile */}
        <g
          transform={`translate(${scaleX(currentX)}, ${scaleY(currentY)}) rotate(${screenAngleDeg})`}
          filter="url(#glowEffect)"
        >
          {/* Thruster exhaust flame plume when flying */}
          {isPlaying && animIndex < 99 && angleDeg > 0 && (
            <g transform="translate(-10, 0)">
              <polygon
                points="-12,0 -4,-4 -4,4"
                fill="#f59e0b"
                opacity="0.9"
              >
                <animate
                  attributeName="points"
                  values="-14,0 -4,-4 -4,4; -9,0 -4,-3 -4,3; -14,0 -4,-4 -4,4"
                  dur="0.15s"
                  repeatCount="indefinite"
                />
              </polygon>
              <polygon
                points="-8,0 -3,-2 -3,2"
                fill="#fde047"
              />
            </g>
          )}

          {/* Rocket Fuselage */}
          <path
            d="M 12 0 L 2 -4 L -6 -4 L -8 -3 L -8 3 L -6 4 L 2 4 Z"
            fill="#ec4899"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          {/* Nosecone */}
          <path
            d="M 12 0 L 4 -3 L 4 3 Z"
            fill="#f43f5e"
          />
          {/* Tail fins */}
          <polygon
            points="-8,-3 -12,-7 -6,-4"
            fill="#8b5cf6"
          />
          <polygon
            points="-8,3 -12,7 -6,4"
            fill="#8b5cf6"
          />
          {/* Cabin window */}
          <circle cx="2" cy="0" r="1.8" fill="#38bdf8" />
        </g>

        {/* Velocity Vector Arrows (if enabled) */}
        {showVectors && angleDeg > 0 && (
          <g transform={`translate(${scaleX(currentX)}, ${scaleY(currentY)})`} opacity="0.9">
            {/* Horizontal velocity vector vx (Cyan) */}
            <line
              x1="0"
              y1="0"
              x2={Math.min(45, vx * 0.9)}
              y2="0"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Vertical velocity vector vy (Amber) */}
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={-Math.max(-45, Math.min(45, vy * 0.9))}
              stroke="#fcd34d"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>

      {/* Interactive Controls & Playback Bar */}
      <div style={{
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '12px 18px',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
      }}>
        {/* Playback Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            id="launch-projectile-btn"
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
            onClick={handleTogglePlay}
          >
            {animIndex >= 100 ? '🔄 Re-Launch' : isPlaying ? '⏸ Pause' : '▶ Resume'}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '13px' }}
            onClick={handleLaunchOrReplay}
          >
            ⏮ Reset
          </button>
        </div>

        {/* Scrubber Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200, maxWidth: 380 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Scrub:</span>
          <input
            type="range"
            id="trajectory-scrubber"
            min="0"
            max="100"
            step="0.5"
            value={animIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setAnimIndex(parseFloat(e.target.value));
            }}
            style={{ flex: 1, accentColor: '#ec4899' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#ec4899', minWidth: 38 }}>
            {animIndex.toFixed(0)}%
          </span>
        </div>

        {/* Speed Controls & Vectors Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Speed:</span>
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                type="button"
                className={`btn ${playbackSpeed === s ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: 4 }}
                onClick={() => setPlaybackSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={showVectors}
              onChange={(e) => setShowVectors(e.target.checked)}
              style={{ accentColor: '#38bdf8' }}
            />
            Vectors (vx, vy)
          </label>
        </div>
      </div>
    </div>
  );
};

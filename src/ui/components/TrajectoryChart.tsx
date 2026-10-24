import React, { useState, useEffect, useRef } from 'react';
import type { ProjectileResults } from '../../core/experiment/types';

interface TrajectoryChartProps {
  results: ProjectileResults;
  v0: number;
  angleDeg: number;
  gravity: number;
}

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({
  results,
  v0,
  angleDeg,
  gravity,
}) => {
  const { range, maxHeight, flightTime, trajectory } = results;

  // Animation & Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animIndex, setAnimIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showVectors, setShowVectors] = useState<boolean>(true);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // SVG Chart Dimensions
  const svgWidth = 760;
  const svgHeight = 380;
  const paddingLeft = 70;
  const paddingRight = 45;
  const paddingTop = 45;
  const paddingBottom = 65;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Reset animation when parameters change
  useEffect(() => {
    setAnimIndex(0);
    setIsPlaying(true);
    lastTimeRef.current = null;
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

  // Handle edge case of no flight (theta = 0)
  if (range === 0 && maxHeight === 0) {
    return (
      <div className="glass-panel" style={{ padding: 24, textAlign: 'center' }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Trajectory Visualization</h3>
        <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: 48, borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📐</div>
          <h4 style={{ color: '#fcd34d', fontSize: 16, marginBottom: 6 }}>Degenerate Flight Condition</h4>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Launch angle is 0°. The projectile is launched directly along the flat ground with no vertical lift. Flight time, range, and height are 0.
          </p>
        </div>
      </div>
    );
  }

  // Scales
  const maxX = Math.max(range * 1.08, 1);
  const maxY = Math.max(maxHeight * 1.25, 1);

  const scaleX = (x: number) => paddingLeft + (x / maxX) * chartWidth;
  const scaleY = (y: number) => paddingTop + chartHeight - (y / maxY) * chartHeight;

  // Path data for the full curve
  const pathData = trajectory.reduce((acc, [x, y], idx) => {
    const sx = scaleX(x);
    const sy = scaleY(y);
    return idx === 0 ? `M ${sx} ${sy}` : `${acc} L ${sx} ${sy}`;
  }, '');

  // Current interpolated point
  const currentFloatIndex = Math.min(100, Math.max(0, animIndex));
  const baseIdx = Math.floor(currentFloatIndex);
  const frac = currentFloatIndex - baseIdx;
  const p1 = trajectory[baseIdx] || [0, 0];
  const p2 = trajectory[Math.min(100, baseIdx + 1)] || p1;

  const currentX = p1[0] + (p2[0] - p1[0]) * frac;
  const currentY = Math.max(0, p1[1] + (p2[1] - p1[1]) * frac);
  const currentTime = (flightTime * currentFloatIndex) / 100;

  // Current velocity vector
  const thetaRad = (angleDeg * Math.PI) / 180;
  const vx = v0 * Math.cos(thetaRad);
  const vy = v0 * Math.sin(thetaRad) - gravity * currentTime;
  const currentSpeed = Math.sqrt(vx * vx + vy * vy);

  // Path traversed so far
  const traversedPoints = trajectory.slice(0, baseIdx + 1);
  const traversedPath = traversedPoints.reduce((acc, [x, y], idx) => {
    const sx = scaleX(x);
    const sy = scaleY(y);
    return idx === 0 ? `M ${sx} ${sy}` : `${acc} L ${sx} ${sy}`;
  }, '');

  const apexX = scaleX(range / 2);
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
      {/* Header with Parameters & Live HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: 17 }}>Interactive Flight Simulation</h3>
            <span className="badge badge-emerald" style={{ animation: isPlaying ? 'pulse-dot 1s infinite' : 'none' }}>
              {isPlaying ? '● SIMULATING LIVE' : animIndex >= 100 ? '✓ TOUCHDOWN' : '⏸ PAUSED'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            <span className="badge badge-indigo">v₀ = {v0} m/s</span>
            <span className="badge badge-amber">θ = {angleDeg}°</span>
            <span className="badge badge-emerald">g = {gravity.toFixed(2)} m/s²</span>
            <span style={{ fontSize: 11, color: '#fcd34d' }}>
              (No air drag, constant gravity)
            </span>
          </div>
        </div>

        {/* Live Flight Telemetry HUD */}
        <div style={{
          display: 'flex',
          gap: 12,
          background: 'rgba(0, 0, 0, 0.45)',
          padding: '8px 16px',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
        style={{ width: '100%', height: 'auto', maxHeight: 400, overflow: 'visible' }}
        id="projectile-trajectory-svg"
      >
        <defs>
          <linearGradient id="fullPathGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.3)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0.3)" />
          </linearGradient>
          <linearGradient id="activePathGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="glowEffect" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Y-Axis Grid Lines */}
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
                fill="#64748b"
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                {val.toFixed(1)}m
              </text>
            </g>
          );
        })}

        {/* X-Axis Grid Lines */}
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
                fill="#64748b"
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                {val.toFixed(1)}m
              </text>
            </g>
          );
        })}

        {/* Axes Baselines */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={paddingLeft + chartWidth}
          y2={paddingTop + chartHeight}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="1.5"
        />
        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={paddingTop + chartHeight}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="1.5"
        />

        {/* Full Predicted Trajectory (Dashed Background) */}
        <path
          d={pathData}
          fill="none"
          stroke="url(#fullPathGradient)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />

        {/* Traversed Trajectory (Solid Glowing Foreground) */}
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

        {/* Launch Cannon Base */}
        <g transform={`translate(${scaleX(0)}, ${scaleY(0)})`}>
          <circle r="7" fill="#38bdf8" />
          <line
            x1="0"
            y1="0"
            x2={18 * Math.cos(thetaRad)}
            y2={-18 * Math.sin(thetaRad)}
            stroke="#38bdf8"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>

        {/* Apex Marker */}
        {maxHeight > 0 && (
          <g>
            <circle cx={apexX} cy={apexY} r="5" fill="#f59e0b" />
            <line x1={apexX} y1={apexY} x2={apexX} y2={scaleY(0)} stroke="rgba(245, 158, 11, 0.3)" strokeDasharray="2 2" />
            <text x={apexX} y={apexY - 10} textAnchor="middle" fill="#fcd34d" fontSize="11" fontFamily="var(--font-mono)">
              Apex: {maxHeight.toFixed(2)}m
            </text>
          </g>
        )}

        {/* Landing Target Marker */}
        {range > 0 && (
          <g>
            <circle cx={impactX} cy={impactY} r="5" fill="#10b981" />
            <text x={impactX} y={impactY - 10} textAnchor="middle" fill="#34d399" fontSize="11" fontFamily="var(--font-mono)">
              Range: {range.toFixed(2)}m
            </text>
          </g>
        )}

        {/* The Animated Projectile Ball */}
        <g transform={`translate(${scaleX(currentX)}, ${scaleY(currentY)})`} filter="url(#glowEffect)">
          {/* Outer glowing halo */}
          <circle r="12" fill="rgba(236, 72, 153, 0.25)" />
          {/* Inner solid ball */}
          <circle r="6" fill="#ec4899" stroke="#ffffff" strokeWidth="2" />

          {/* Velocity Vector Arrows (if enabled) */}
          {showVectors && (
            <g opacity="0.85">
              {/* Horizontal velocity vector vx */}
              <line
                x1="0"
                y1="0"
                x2={Math.min(35, vx * 0.8)}
                y2="0"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Vertical velocity vector vy */}
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={-Math.max(-35, Math.min(35, vy * 0.8))}
                stroke="#fcd34d"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          )}
        </g>
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
            Vectors
          </label>
        </div>
      </div>
    </div>
  );
};

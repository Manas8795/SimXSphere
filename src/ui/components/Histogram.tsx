import React from 'react';
import type { ProbabilityResults } from '../../core/experiment/types';
import { calculateDerivedProbabilityMetrics } from '../../core/simulations/probability';

interface HistogramProps {
  kind: 'coin' | 'die';
  sides: number;
  results: ProbabilityResults;
}

export const Histogram: React.FC<HistogramProps> = ({ kind, sides, results }) => {
  const metrics = calculateDerivedProbabilityMetrics(results, sides);
  const total = results.total;

  const getLabel = (index: number) => {
    if (kind === 'coin') {
      return index === 0 ? 'Heads (H)' : 'Tails (T)';
    }
    return `Face ${index + 1}`;
  };

  // SVG Chart Dimensions
  const svgWidth = 680;
  const svgHeight = 320;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 40;
  const paddingBottom = 55;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Find max proportion to scale the Y-axis
  const maxProp = Math.max(...metrics.proportions, metrics.expectedProportion * 1.25, 0.05);
  const yAxisMax = Math.min(1, Math.ceil(maxProp * 10) / 10);

  const barSlotWidth = chartWidth / sides;
  const barWidth = Math.max(14, Math.min(54, barSlotWidth * 0.7));

  // Compute Y coordinate for a given proportion
  const getY = (proportion: number) => {
    return paddingTop + chartHeight - (proportion / yAxisMax) * chartHeight;
  };

  // Expected line Y coordinate
  const expectedY = getY(metrics.expectedProportion);

  return (
    <div className="glass-panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16 }}>Outcome Frequency Distribution</h3>
        <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, background: 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)', borderRadius: 2 }} />
            <span style={{ color: 'var(--text-secondary)' }}>Empirical Count</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 2, borderTop: '2px dashed #f59e0b' }} />
            <span style={{ color: '#fcd34d' }}>Expected: {(metrics.expectedProportion * 100).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', height: 'auto', maxHeight: 340, overflow: 'visible' }}
        id="probability-histogram-svg"
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
          <linearGradient id="barHoverGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
        </defs>

        {/* Y Axis Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((factor) => {
          const val = yAxisMax * factor;
          const y = getY(val);
          return (
            <g key={factor}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + chartWidth}
                y2={y}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="3 3"
              />
              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                fill="#64748b"
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                {(val * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Expected Proportion Baseline */}
        <line
          x1={paddingLeft}
          y1={expectedY}
          x2={paddingLeft + chartWidth}
          y2={expectedY}
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="4 4"
        />

        {/* Bars */}
        {results.counts.map((count, index) => {
          const prop = metrics.proportions[index];
          const barHeight = (prop / yAxisMax) * chartHeight;
          const x = paddingLeft + index * barSlotWidth + (barSlotWidth - barWidth) / 2;
          const y = paddingTop + chartHeight - barHeight;

          return (
            <g key={index} className="histogram-bar-group">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, barHeight)}
                rx="4"
                fill="url(#barGradient)"
                stroke="rgba(99, 102, 241, 0.6)"
                strokeWidth="1"
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <title>
                  {`${getLabel(index)}: ${count.toLocaleString()} (${(prop * 100).toFixed(2)}%)`}
                </title>
              </rect>

              {/* Count label above bar (for <= 10 sides) */}
              {sides <= 10 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                >
                  {(prop * 100).toFixed(1)}%
                </text>
              )}

              {/* X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={paddingTop + chartHeight + 20}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize={sides > 12 ? '10' : '12'}
                fontFamily="var(--font-sans)"
              >
                {kind === 'coin' ? (index === 0 ? 'Heads' : 'Tails') : `${index + 1}`}
              </text>
            </g>
          );
        })}

        {/* X Axis Baseline */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={paddingLeft + chartWidth}
          y2={paddingTop + chartHeight}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.5"
        />
      </svg>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
        Total Trials: <strong style={{ color: '#f8fafc' }}>{total.toLocaleString()}</strong> | Max Absolute Deviation: <strong style={{ color: '#fcd34d' }}>{(metrics.maxAbsoluteDeviation * 100).toFixed(3)}%</strong>
      </div>
    </div>
  );
};

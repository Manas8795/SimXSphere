import React from 'react';
import { PERIODIC_TABLE, type ChemicalElement, type ElementCategory } from '../chemistry-data/elements';

interface PeriodicTableProps {
  selectedElement: ChemicalElement | null;
  onSelectElement: (element: ChemicalElement) => void;
  onAddToReactor?: (element: ChemicalElement) => void;
  activeReactorSymbols?: string[];
}

export const PeriodicTable: React.FC<PeriodicTableProps> = ({
  selectedElement,
  onSelectElement,
  onAddToReactor,
  activeReactorSymbols = [],
}) => {
  // Category legend mappings
  const categories: { key: ElementCategory; label: string; bg: string; text: string }[] = [
    { key: 'alkali-metal', label: 'Alkali Metals', bg: 'var(--cat-alkali)', text: 'var(--cat-alkali-text)' },
    { key: 'alkaline-earth', label: 'Alkaline Earth', bg: 'var(--cat-alkaline)', text: 'var(--cat-alkaline-text)' },
    { key: 'transition-metal', label: 'Transition Metals', bg: 'var(--cat-transition)', text: 'var(--cat-transition-text)' },
    { key: 'post-transition-metal', label: 'Post-Transition', bg: 'var(--cat-post-transition)', text: 'var(--cat-post-transition-text)' },
    { key: 'metalloid', label: 'Metalloids', bg: 'var(--cat-metalloid)', text: 'var(--cat-metalloid-text)' },
    { key: 'reactive-nonmetal', label: 'Reactive Nonmetals', bg: 'var(--cat-reactive-nonmetal)', text: 'var(--cat-reactive-nonmetal-text)' },
    { key: 'noble-gas', label: 'Noble Gases', bg: 'var(--cat-noble-gas)', text: 'var(--cat-noble-gas-text)' },
  ];

  const getCategoryStyles = (category: ElementCategory) => {
    switch (category) {
      case 'alkali-metal': return { background: 'var(--cat-alkali)', color: 'var(--cat-alkali-text)' };
      case 'alkaline-earth': return { background: 'var(--cat-alkaline)', color: 'var(--cat-alkaline-text)' };
      case 'transition-metal': return { background: 'var(--cat-transition)', color: 'var(--cat-transition-text)' };
      case 'post-transition-metal': return { background: 'var(--cat-post-transition)', color: 'var(--cat-post-transition-text)' };
      case 'metalloid': return { background: 'var(--cat-metalloid)', color: 'var(--cat-metalloid-text)' };
      case 'reactive-nonmetal': return { background: 'var(--cat-reactive-nonmetal)', color: 'var(--cat-reactive-nonmetal-text)' };
      case 'noble-gas': return { background: 'var(--cat-noble-gas)', color: 'var(--cat-noble-gas-text)' };
      default: return { background: '#f1f5f9', color: '#0f172a' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Category Legend Bar */}
      <div className="lab-card" style={{ padding: '14px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#166534', marginBottom: 10, fontFamily: 'var(--font-display)' }}>
          🧱 Element Super-Families (Tap any block to inspect!)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((cat) => (
            <div
              key={cat.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 8,
                background: cat.bg,
                color: cat.text,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.text }} />
              {cat.label}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#166534' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #16a34a', background: '#dcfce7' }} />
            ✨ Green Border = Ready to Mix in Magic Reactor!
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="lab-card" style={{ padding: 18 }}>
        <div className="ptable-container">
          <div className="ptable-grid">
            {PERIODIC_TABLE.map((el) => {
              const styles = getCategoryStyles(el.category);
              const isSelected = selectedElement?.atomicNumber === el.atomicNumber;
              const isInReactor = activeReactorSymbols.includes(el.symbol);

              // Grid positioning based on period and group
              const gridRow = el.period;
              const gridCol = el.group;

              return (
                <div
                  key={el.atomicNumber}
                  className={`ptable-cell ${isSelected ? 'selected' : ''} ${isInReactor ? 'active-reactor' : ''}`}
                  style={{
                    gridRow,
                    gridColumn: gridCol,
                    ...styles,
                  }}
                  onClick={() => onSelectElement(el)}
                  title={`${el.name} (${el.symbol})\nAtomic Number: ${el.atomicNumber}\nAtomic Mass: ${el.atomicMass}\nCategory: ${el.category}\n${el.supportedInReactor ? '✓ Ready for Synthesis Reactor' : 'Reference Only'}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="ptable-number">{el.atomicNumber}</span>
                    {el.supportedInReactor && (
                      <span style={{ fontSize: 8, color: '#059669', fontWeight: 800 }}>●</span>
                    )}
                  </div>
                  <div className="ptable-symbol">{el.symbol}</div>
                  <div className="ptable-name">{el.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Element Property Inspector */}
      {selectedElement && (
        <div className="lab-card">
          <div className="lab-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: getCategoryStyles(selectedElement.category).background,
                color: getCategoryStyles(selectedElement.category).color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 900,
                border: '1px solid var(--border-medium)',
              }}>
                {selectedElement.symbol}
              </div>
              <div>
                <h3 style={{ fontSize: 18 }}>{selectedElement.name} (Z = {selectedElement.atomicNumber})</h3>
                <span className="lab-badge" style={{ ...getCategoryStyles(selectedElement.category), marginTop: 2 }}>
                  {selectedElement.category.replace(/-/g, ' ')}
                </span>
              </div>
            </div>

            {onAddToReactor && selectedElement.supportedInReactor && (
              <button
                type="button"
                className="lab-btn lab-btn-primary"
                onClick={() => onAddToReactor(selectedElement)}
              >
                <span>✨</span> Add {selectedElement.symbol} to Magic Reactor!
              </button>
            )}
          </div>

          <div className="lab-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Standard Atomic Mass</span>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{selectedElement.atomicMass} u</div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Common Oxidation States</span>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {selectedElement.commonValences.map(v => (v > 0 ? `+${v}` : v)).join(', ')}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Electronegativity (Pauling)</span>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {selectedElement.electronegativity !== null ? selectedElement.electronegativity : 'N/A (Inert)'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Electron Configuration</span>
                <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{selectedElement.electronConfiguration}</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {selectedElement.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

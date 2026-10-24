import React from 'react';

export type DisciplineTab = 'chemistry' | 'probability' | 'physics';
export type ActiveTab = DisciplineTab; // Backward compatibility
export type ThemeMode = 'chalkboard' | 'scientist-dark' | 'scientist-light' | 'green-black';

interface NavbarProps {
  activeDiscipline: DisciplineTab;
  onSelectDiscipline: (discipline: DisciplineTab) => void;
  runCount: number;
  theme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeDiscipline,
  onSelectDiscipline,
  runCount,
  theme = 'chalkboard',
  onSelectTheme,
}) => {
  const isChalkboard = theme === 'chalkboard' || theme === 'green-black';
  const isScientistDark = theme === 'scientist-dark';
  const isScientistLight = theme === 'scientist-light';

  return (
    <header className="lab-navbar" id="app-header">
      <div
        className="lab-brand"
        onClick={() => onSelectDiscipline('chemistry')}
        id="brand-logo"
        style={{ cursor: 'pointer' }}
      >
        <div className="lab-brand-icon">
          {isChalkboard ? '🏫' : isScientistDark ? '🔬' : '☀️'}
        </div>
        <div>
          <span className="lab-brand-title">SimXSphere</span>
          <span className="lab-badge brand-theme-badge" style={{ marginLeft: 8, fontSize: '11px', fontWeight: 800 }}>
            {isChalkboard
              ? '🏫 Classroom Chalkboard'
              : isScientistDark
              ? '🔬 Scientist Dark Lab'
              : '☀️ Scientist Light Lab'}
          </span>
        </div>
      </div>

      {/* ONLY 3 DISCIPLINE TABS: CHEMISTRY | PROBABILITY | PHYSICS */}
      <nav className="lab-nav-tabs" aria-label="Main Navigation">
        <button
          id="nav-tab-chemistry"
          className={`lab-nav-tab ${activeDiscipline === 'chemistry' ? 'active' : ''}`}
          onClick={() => onSelectDiscipline('chemistry')}
          title="Chemistry Laboratory Projects"
        >
          <span>🧪</span>
          Chemistry
          {runCount > 0 && (
            <span
              className="lab-badge"
              style={{
                background: 'var(--sticky-yellow)',
                color: 'var(--sticky-yellow-text)',
                border: '1px solid var(--wood-frame)',
                padding: '1px 6px',
                fontSize: 10,
                borderRadius: 10,
                fontWeight: 900,
                marginLeft: 4,
              }}
            >
              {runCount}
            </span>
          )}
        </button>

        <button
          id="nav-tab-probability"
          className={`lab-nav-tab ${activeDiscipline === 'probability' ? 'active' : ''}`}
          onClick={() => onSelectDiscipline('probability')}
          title="Independent Probability Experiments"
        >
          <span>🎲</span>
          Probability
        </button>

        <button
          id="nav-tab-physics"
          className={`lab-nav-tab ${activeDiscipline === 'physics' ? 'active' : ''}`}
          onClick={() => onSelectDiscipline('physics')}
          title="Independent Physics Kinematics & Rocket Launch"
        >
          <span>🚀</span>
          Physics
        </button>
      </nav>

      {/* THEME SELECTOR: CHALKBOARD | SCIENTIST DARK | SCIENTIST LIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--lab-surface-subtle)',
            padding: '3px',
            borderRadius: '24px',
            border: '1.5px solid var(--wood-frame)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}
        >
          <button
            type="button"
            className={`theme-pill ${isChalkboard ? 'active' : ''}`}
            onClick={() => onSelectTheme('chalkboard')}
            title="Classroom Chalkboard Theme (Dark Green Blackboard & Honey Wood Frame)"
          >
            🏫 Chalkboard
          </button>
          <button
            type="button"
            className={`theme-pill ${isScientistDark ? 'active' : ''}`}
            onClick={() => onSelectTheme('scientist-dark')}
            title="Scientist Dark Theme (High-Tech Observatory Slate & Cyan)"
          >
            🔬 Scientist Dark
          </button>
          <button
            type="button"
            className={`theme-pill ${isScientistLight ? 'active' : ''}`}
            onClick={() => onSelectTheme('scientist-light')}
            title="Scientist Light Theme (Clean Academic Laboratory Paper)"
          >
            ☀️ Scientist Light
          </button>
        </div>
      </div>
    </header>
  );
};

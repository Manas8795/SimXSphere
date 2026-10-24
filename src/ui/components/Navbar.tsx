import React from 'react';

export type ActiveTab =
  | 'workplane'
  | 'table'
  | 'reactor'
  | 'aqueous'
  | 'validator'
  | 'runs'
  | 'probability'
  | 'projectile';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  runCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  runCount,
}) => {
  return (
    <header className="lab-navbar" id="app-header">
      <div className="lab-brand" onClick={() => onSelectTab('workplane')} id="brand-logo" style={{ cursor: 'pointer' }}>
        <div className="lab-brand-icon">
          🌱
        </div>
        <div>
          <span className="lab-brand-title">SimXSphere</span>
          <span className="lab-badge" style={{ background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac', marginLeft: 8, fontSize: '12px', fontWeight: 800 }}>
            🧪 Kids Chemistry Fun Lab!
          </span>
        </div>
      </div>

      <nav className="lab-nav-tabs" aria-label="Main Navigation" style={{ flexWrap: 'wrap' }}>
        <button
          id="nav-tab-workplane"
          className={`lab-nav-tab ${activeTab === 'workplane' ? 'active' : ''}`}
          onClick={() => onSelectTab('workplane')}
          title="Interactive Chemistry Workplane"
        >
          <span>🧪</span>
          Mix & React
        </button>

        <button
          id="nav-tab-table"
          className={`lab-nav-tab ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => onSelectTab('table')}
          title="118-Element Periodic Table"
        >
          <span>🧱</span>
          Element Blocks
        </button>

        <button
          id="nav-tab-reactor"
          className={`lab-nav-tab ${activeTab === 'reactor' ? 'active' : ''}`}
          onClick={() => onSelectTab('reactor')}
          title="Compound Synthesis Reactor"
        >
          <span>⚗️</span>
          Magic Reactor
        </button>

        <button
          id="nav-tab-aqueous"
          className={`lab-nav-tab ${activeTab === 'aqueous' ? 'active' : ''}`}
          onClick={() => onSelectTab('aqueous')}
          title="Aqueous Solutions and Titration"
        >
          <span>💧</span>
          Color Titration
        </button>

        <button
          id="nav-tab-validator"
          className={`lab-nav-tab ${activeTab === 'validator' ? 'active' : ''}`}
          onClick={() => onSelectTab('validator')}
          title="Stoichiometry & Equation Balance"
        >
          <span>⚖️</span>
          Equation Balancer
        </button>

        <button
          id="nav-tab-runs"
          className={`lab-nav-tab ${activeTab === 'runs' ? 'active' : ''}`}
          onClick={() => onSelectTab('runs')}
          title="Chemistry Laboratory Notebook"
        >
          <span>📓</span>
          My Discoveries
          {runCount > 0 && (
            <span className="lab-badge" style={{ background: '#fef08a', color: '#854d0e', border: '1px solid #facc15', padding: '1px 7px', fontSize: 11, borderRadius: 10 }}>
              {runCount}
            </span>
          )}
        </button>

        <div style={{ width: 2, background: 'var(--border-medium)', margin: '4px 6px', borderRadius: 2 }} aria-hidden="true" />

        {/* Secondary Independent Modules */}
        <button
          id="nav-tab-probability"
          className={`lab-nav-tab ${activeTab === 'probability' ? 'active' : ''}`}
          onClick={() => onSelectTab('probability')}
          title="Independent Probability Experiments"
        >
          <span>🎲</span>
          Lucky Dice Lab
        </button>

        <button
          id="nav-tab-projectile"
          className={`lab-nav-tab ${activeTab === 'projectile' ? 'active' : ''}`}
          onClick={() => onSelectTab('projectile')}
          title="Independent Projectile Kinematics"
        >
          <span>🚀</span>
          Rocket Launch
        </button>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="lab-badge" style={{ background: '#dcfce7', color: '#14532d', border: '1.5px solid #86efac' }}>
          🎈 100% Free Fun Lab
        </span>
      </div>
    </header>
  );
};

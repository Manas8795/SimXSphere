import React from 'react';

export type ActiveTab = 'workplane' | 'table' | 'reactor' | 'aqueous' | 'validator' | 'runs';

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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
            <path d="M8.5 2h7" />
            <path d="M7 16h10" />
          </svg>
        </div>
        <div>
          <span className="lab-brand-title">SimXSphere</span>
          <span className="lab-badge" style={{ background: '#f1f5f9', color: '#1e3a8a', border: '1px solid #cbd5e1', marginLeft: 8, fontSize: '11px', fontWeight: 600 }}>
            Empirical Chemistry Workstation
          </span>
        </div>
      </div>

      <nav className="lab-nav-tabs" aria-label="Main Navigation">
        <button
          id="nav-tab-workplane"
          className={`lab-nav-tab ${activeTab === 'workplane' ? 'active' : ''}`}
          onClick={() => onSelectTab('workplane')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
            <path d="M8.5 2h7" />
            <path d="M7 16h10" />
          </svg>
          Reaction Workplane
        </button>

        <button
          id="nav-tab-table"
          className={`lab-nav-tab ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => onSelectTab('table')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
            <path d="M15 3v18" />
          </svg>
          Periodic Table
        </button>

        <button
          id="nav-tab-reactor"
          className={`lab-nav-tab ${activeTab === 'reactor' ? 'active' : ''}`}
          onClick={() => onSelectTab('reactor')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
          Synthesis Reactor
        </button>

        <button
          id="nav-tab-aqueous"
          className={`lab-nav-tab ${activeTab === 'aqueous' ? 'active' : ''}`}
          onClick={() => onSelectTab('aqueous')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
          </svg>
          Aqueous Titration
        </button>

        <button
          id="nav-tab-validator"
          className={`lab-nav-tab ${activeTab === 'validator' ? 'active' : ''}`}
          onClick={() => onSelectTab('validator')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 12 2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          Stoichiometry Check
        </button>

        <button
          id="nav-tab-runs"
          className={`lab-nav-tab ${activeTab === 'runs' ? 'active' : ''}`}
          onClick={() => onSelectTab('runs')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Notebook Log
          {runCount > 0 && (
            <span className="lab-badge" style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '1px 5px', fontSize: 10 }}>
              {runCount}
            </span>
          )}
        </button>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="lab-badge" style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' }}>
          Mode: Offline Local Lab
        </span>
      </div>
    </header>
  );
};

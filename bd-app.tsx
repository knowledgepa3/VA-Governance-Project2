/**
 * BD App - Standalone entry point for BD Dashboard
 *
 * This is a SEPARATE app from the main ACE workflow app.
 * It's specifically for the Business Development RFP Pipeline.
 *
 * To use this:
 * 1. Update index.html to point to this file instead of index.tsx
 * 2. Or create a separate HTML file (bd.html) for this app
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BDDashboard } from './components/BDDashboard';
import './styles/BDDashboard.css';

/**
 * Simple wrapper with header
 */
const BDApp: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="logo">GIA</h1>
            <span className="logo-subtitle">BD Pipeline</span>
          </div>
          <div className="header-nav">
            <span className="version">Governed</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <BDDashboard />
      </main>

      <footer className="app-footer">
        <p>
          GIA Platform &middot; Governed Intelligence Architecture &middot;
          <a href="/"> Back to Platform</a>
        </p>
      </footer>
    </div>
  );
};

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<BDApp />);
}

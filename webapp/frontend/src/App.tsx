import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import PlayerList from './components/PlayerList';
import TeamList from './components/TeamList';
import SearchBar from './components/SearchBar';
import Filters, { type FilterState } from './components/Filters';
import PlayerProfile from './pages/PlayerProfile';
import SimilarPlayers from './pages/SimilarPlayers';
import SearchByAttribute from './pages/SearchByAttribute';
import Home from './pages/Home';
import Glossary from './pages/Glossary';

// ── Nav link that highlights when active ──────────────────────────────────────

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== '/' && pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`font-semibold text-xs sm:text-sm uppercase tracking-wider transition-colors ${
        active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
      }`}
    >
      {children}
    </Link>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)]">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--accent)] focus:text-white focus:font-semibold focus:text-sm"
      >
        Skip to main content
      </a>

      {/* Nav */}
      <header role="banner">
        <nav
          aria-label="Main navigation"
          className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-white/92 backdrop-blur-xl"
        >
          <div className="flex items-center gap-4 sm:gap-6">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/players">Search by Player</NavLink>
            <NavLink to="/search">Search by Attribute</NavLink>
            <NavLink to="/glossary">Glossary</NavLink>
          </div>

          <a
              href="https://github.com/ArMat-Analytics/Contextual-Football-Scouting"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost text-[12px] py-1.5 px-3.5 gap-1.5"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </a>
        </nav>
      </header>

      <main id="main-content" className="flex-1 flex flex-col">
        {children}
      </main>

      <footer
        role="contentinfo"
        className="border-t border-[var(--border)] py-6 px-6 mt-auto bg-[var(--surface)]"
      >
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
          <p>© 2026 ArMat Analytics — Contextual Football Scouting</p>
          <div>
            {'Authors: '}
            <a
              href="https://www.linkedin.com/in/matteo-vezzoli83"
              target="_blank"
              rel="noreferrer"
              className="inline-inline-flex items-center gap-1 font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors underline underline-offset-2 decoration-[var(--border)] hover:decoration-[var(--accent)]"
            >
              Matteo Vezzoli
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden className="inline ml-0.5 opacity-50"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>
            </a>
            {' & '}
            <a
              href="https://www.linkedin.com/in/armando-mio"
              target="_blank"
              rel="noreferrer"
              className="inline-inline-flex items-center gap-1 font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors underline underline-offset-2 decoration-[var(--border)] hover:decoration-[var(--accent)]"
            >
              Armando Mio
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden className="inline ml-0.5 opacity-50"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Search by Player page ─────────────────────────────────────────────────────
function SearchByPlayer() {
  const [searchTerm, setSearchTerm]       = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    ageMin: '', ageMax: '', macroRole: '', role: '', foot: '',
    vPreMin: '', vPreMax: '', vPostMin: '', vPostMax: '', vDiffMin: '', vDiffMax: '',
  });

  return (
    <div className="pb-12">
      {/* Hero strip */}
      <div className="border-b border-[var(--border)] px-6 pt-10 pb-8 bg-[var(--surface)]">
        <div className="max-w-[1200px] mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <li><Link to="/" className="hover:text-[var(--accent)] transition-colors font-semibold">Home</Link></li>
              <li aria-hidden>/</li>
              <li className="font-semibold text-[var(--text)]" aria-current="page">Search by Player</li>
            </ol>
          </nav>
          <p className="font-mono text-xs tracking-widest mb-2 text-[var(--accent)]">
            UEFA EURO 2024 · PLAYER DATABASE
          </p>
          <h1 className="font-display font-black text-5xl sm:text-6xl leading-none tracking-tight text-[var(--text)]">
            Search by Player
          </h1>
          <p className="mt-3 text-base max-w-xl text-[var(--text-muted)]">
            272 players with full stats, market values, space-control indices, and value delta. Click any name to open the full profile.
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="max-w-[1200px] mx-auto w-full px-6 pt-6 pb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} /></div>
        <Filters filters={filters} setFilters={setFilters} />
      </div>

      <div className="max-w-[1200px] mx-auto w-full px-6" aria-label="Player list">
        <PlayerList searchTerm={searchTerm} selectedTeams={selectedTeams} filters={filters} />
      </div>

      <TeamList selectedTeams={selectedTeams} setSelectedTeams={setSelectedTeams} />
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/"                 element={<Home />} />
          <Route path="/players"          element={<SearchByPlayer />} />
          <Route path="/player/:playerId" element={<PlayerProfile />} />
          <Route path="/similar"          element={<SimilarPlayers />} />
          <Route path="/search"           element={<SearchByAttribute />} />
          <Route path="/glossary"         element={<Glossary />} />
        </Routes>
      </Layout>
    </Router>
  );
}
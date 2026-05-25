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
          <Link
            to="/"
            className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
          >
            {/* Logo mark */}
            <span
              aria-hidden
              className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-sm bg-[var(--accent)] text-white"
            >
              AM
            </span>
            <span className="font-display font-extrabold text-base tracking-tight text-[var(--text)] hidden sm:block">
              ArMat Analytics
            </span>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/players">Search by Player</NavLink>
            <NavLink to="/search">Search by Attribute</NavLink>
            <NavLink to="/glossary">Glossary</NavLink>
          </div>
        </nav>
      </header>

      <main id="main-content" className="flex-1 flex flex-col">
        {children}
      </main>

      <footer
        role="contentinfo"
        className="border-t border-[var(--border)] py-6 px-6 mt-auto bg-[var(--surface)]"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
          <p>© 2026 ArMat Analytics — Contextual Football Scouting</p>
          <p className="text-[var(--text-dim)]">UEFA Euro 2024 · StatsBomb 360°</p>
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
        <div className="max-w-7xl mx-auto">
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
      <div className="max-w-7xl mx-auto w-full px-6 pt-6 pb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} /></div>
        <Filters filters={filters} setFilters={setFilters} />
      </div>

      <div className="max-w-7xl mx-auto w-full px-6" aria-label="Player list">
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
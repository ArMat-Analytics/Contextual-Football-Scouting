import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PlayerList from './components/PlayerList';
import TeamList from './components/TeamList';
import SearchBar from './components/SearchBar';
import Filters, { type FilterState } from './components/Filters';
import PlayerProfile from './pages/PlayerProfile';
import SimilarPlayers from './pages/SimilarPlayers';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen relative z-10">
      {/* Nav */}
      <header role="banner">
        <nav
          aria-label="Main navigation"
          className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b"
          style={{
            background: 'rgba(13,15,20,0.92)',
            backdropFilter: 'blur(16px)',
            borderColor: 'var(--border)',
          }}
        >
          <Link to="/" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent] rounded">
            {/* Logo mark */}
            <span
              aria-hidden
              className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-900 text-sm"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            >
              AM
            </span>
            <span className="font-display font-800 text-base tracking-tight text-[--text] hidden sm:block">
              ArMat Analytics
            </span>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6" role="list">
            <a className="text-[--text-muted] hover:text-[--text] transition-colors font-600 text-xs sm:text-sm uppercase tracking-wider" href="https://github.com/armat-analytics/Contextual-Football-Scouting" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </nav>
      </header>

      <main id="main-content" className="flex-1 flex flex-col">
        {children}
      </main>

      <footer
        role="contentinfo"
        className="border-t py-6 px-6 mt-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-mono"
          style={{ color: 'var(--text-muted)' }}>
          <p>© 2026 ArMat Analytics — Contextual Football Scouting</p>
          <p style={{ color: 'var(--text-dim)' }}>UEFA Euro 2024 · StatsBomb 360°</p>
        </div>
      </footer>
    </div>
  );
}

function Dashboard() {
  const [searchTerm, setSearchTerm]     = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    ageMin: '', ageMax: '', role: '', foot: '',
    vPreMin: '', vPreMax: '', vPostMin: '', vPostMax: '', vDiffMin: '', vDiffMax: '',
  });

  return (
    <div className="pb-12">
      {/* Hero strip */}
      <div
        className="border-b px-6 pt-10 pb-8"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="max-w-7xl mx-auto">
          <p className="font-mono text-xs tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
            UEFA EURO 2024 · PLAYER DATABASE
          </p>
          <h1 className="font-display font-900 text-5xl sm:text-6xl leading-none tracking-tight" style={{ color: 'var(--text)' }}>
            Player Intelligence
          </h1>
          <p className="mt-3 text-base max-w-xl" style={{ color: 'var(--text-muted)' }}>
            Contextual performance data powered by 360° spatial tracking, EPV grids, and Voronoi analysis.
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-6 pb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
        <Filters filters={filters} setFilters={setFilters} />
      </div>

      <main className="max-w-7xl mx-auto w-full px-6" aria-label="Player list">
        <PlayerList searchTerm={searchTerm} selectedTeams={selectedTeams} filters={filters} />
      </main>

      <TeamList selectedTeams={selectedTeams} setSelectedTeams={setSelectedTeams} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/"                element={<Dashboard />} />
          <Route path="/player/:playerId" element={<PlayerProfile />} />
          <Route path="/similar"         element={<SimilarPlayers />} />
        </Routes>
      </Layout>
    </Router>
  );
}
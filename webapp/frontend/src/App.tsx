import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import PlayerList from './components/PlayerList';
import TeamList from './components/TeamList';
import SearchBar from './components/SearchBar';
import Filters, { type FilterState } from './components/Filters';
import Comparator from './pages/Comparator';

// Wrapper to keep Navbar and Footer consistent across pages
function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans">
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl font-extrabold tracking-tight text-slate-900 hidden sm:block">
            ArMat Analytics
          </span>
        </div>
        <div className="flex gap-8 font-semibold text-sm">
          <Link 
            to="/" 
            className={`transition-colors py-2 ${location.pathname === '/' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-blue-600'}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/compare" 
            className={`transition-colors py-2 ${location.pathname === '/compare' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-blue-600'}`}
          >
            Comparator
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex flex-col">
        {children}
      </div>

      <footer className="bg-white py-8 px-6 border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto flex justify-center items-center text-sm text-slate-400 font-medium">
          <p>© 2026 ArMat Analytics - Contextual Football Scouting</p>
        </div>
      </footer>
    </div>
  );
}

// Main Dashboard Page
function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  
  // Initial state for advanced filters
  const [filters, setFilters] = useState<FilterState>({
    ageMin: "", ageMax: "", role: "", foot: "",
    vPreMin: "", vPreMax: "", vPostMin: "", vPostMax: "", vDiffMin: "", vDiffMax: ""
  });

  return (
    <div className="pb-12">
      <div className="max-w-7xl mx-auto w-full px-6 pt-8 pb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
        {/* Pass advanced filters */}
        <Filters filters={filters} setFilters={setFilters} />
      </div>
      
      <main className="max-w-7xl mx-auto w-full px-6">
        {/* Pass everything to PlayerList */}
        <PlayerList searchTerm={searchTerm} selectedTeams={selectedTeams} filters={filters} />
      </main>
      
      {/* TeamList manages selected teams */}
      <TeamList selectedTeams={selectedTeams} setSelectedTeams={setSelectedTeams} />
    </div>
  );
}

// Main App Component
export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/compare" element={<Comparator />} />
        </Routes>
      </Layout>
    </Router>
  );
}
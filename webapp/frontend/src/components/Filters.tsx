import { useState, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface FilterState {
  ageMin: string; ageMax: string;
  role: string; foot: string;
  vPreMin: string; vPreMax: string;
  vPostMin: string; vPostMax: string;
  vDiffMin: string; vDiffMax: string;
}

interface FiltersProps {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
}

export default function Filters({ filters, setFilters }: FiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

  // Fetch true roles from the database
  useEffect(() => {
    fetch(`${API_BASE_URL}/roles/`)
      .then(res => res.json())
      .then(data => setAvailableRoles(data))
      .catch(err => console.error("Error fetching roles:", err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const resetFilters = () => {
    setFilters({
      ageMin: "", ageMax: "", role: "", foot: "",
      vPreMin: "", vPreMax: "", vPostMin: "", vPostMax: "", vDiffMin: "", vDiffMax: ""
    });
  };

  const hasActiveFilters = Object.values(filters).some(val => val !== "");

  return (
    <div className="relative h-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`h-full border rounded-xl px-6 py-3 flex items-center justify-center gap-2 font-bold transition-all w-full md:w-auto shadow-sm ${hasActiveFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
      >
        <span className="text-lg">⚙️</span> 
        {hasActiveFilters ? 'Filters Active' : 'Advanced Filters'}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-full md:w-[420px] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-extrabold text-xl text-slate-800">Set Filters</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors">✕</button>
          </div>

          {/* Age & Physical */}
          <div className="space-y-4 mb-8">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">General Attributes</h4>
            <div className="flex gap-3">
              <input type="number" name="ageMin" value={filters.ageMin} onChange={handleChange} placeholder="Min Age" className="w-1/2 border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
              <input type="number" name="ageMax" value={filters.ageMax} onChange={handleChange} placeholder="Max Age" className="w-1/2 border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
            </div>
            <div className="flex gap-3">
              <select name="role" value={filters.role} onChange={handleChange} className="w-1/2 border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium text-slate-700 capitalize">
                <option value="">All Roles</option>
                {/* Dynamically generating real roles from the DB */}
                {availableRoles.map(r => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select name="foot" value={filters.foot} onChange={handleChange} className="w-1/2 border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium text-slate-700">
                <option value="">Preferred Foot</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          {/* Market Values (in Millions) */}
          <div className="space-y-4 mb-8">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Market Values (in €)</h4>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">Value BEFORE Euro 2024</label>
              <div className="flex gap-3">
                <input type="number" name="vPreMin" value={filters.vPreMin} onChange={handleChange} placeholder="Min" className="w-1/2 border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                <input type="number" name="vPreMax" value={filters.vPreMax} onChange={handleChange} placeholder="Max" className="w-1/2 border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 mt-4 block">Value AFTER Euro 2024</label>
              <div className="flex gap-3">
                <input type="number" name="vPostMin" value={filters.vPostMin} onChange={handleChange} placeholder="Min" className="w-1/2 border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                <input type="number" name="vPostMax" value={filters.vPostMax} onChange={handleChange} placeholder="Max" className="w-1/2 border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 mt-4 block">Value Difference</label>
              <div className="flex gap-3">
                <input type="number" name="vDiffMin" value={filters.vDiffMin} onChange={handleChange} placeholder="Min Diff" className="w-1/2 border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                <input type="number" name="vDiffMax" value={filters.vDiffMax} onChange={handleChange} placeholder="Max Diff" className="w-1/2 border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
              </div>
            </div>
          </div>

          <button onClick={resetFilters} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
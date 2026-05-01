import { useState, useEffect, useRef } from 'react';

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
  const [isOpen, setIsOpen]           = useState(false);
  const [availableRoles, setRoles]    = useState<string[]>([]);
  const panelRef                      = useRef<HTMLDivElement>(null);
  const btnRef                        = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/roles/`)
      .then(r => r.json())
      .then(d => setRoles(d))
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current   && !btnRef.current.contains(e.target as Node)
      ) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const reset = () => {
    setFilters({ ageMin:'',ageMax:'',role:'',foot:'',vPreMin:'',vPreMax:'',vPostMin:'',vPostMax:'',vDiffMin:'',vDiffMax:'' });
  };

  const active = Object.values(filters).some(v => v !== '');
  const activeCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
        aria-controls="filters-panel"
        aria-label={`Advanced filters${active ? ` (${activeCount} active)` : ''}`}
        className="btn btn-ghost h-full whitespace-nowrap"
        style={active ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2M13 16h-2" />
        </svg>
        {active ? `Filters (${activeCount})` : 'Filters'}
      </button>

      {isOpen && (
        <div
          id="filters-panel"
          ref={panelRef}
          role="dialog"
          aria-label="Advanced filters"
          className="absolute right-0 top-full mt-2 w-[480px] max-sm:w-screen max-sm:right-0 z-50 p-6 max-h-[80vh] overflow-y-auto shadow-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)' }}
        >
          <div className="flex justify-between items-center mb-8 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-display font-800 text-2xl tracking-tight" style={{ color: 'var(--text)' }}>
              Advanced Filters
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close filters panel"
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]"
              style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            <fieldset className="border p-4 rounded-xl" style={{ borderColor: 'var(--border2)' }}>
              <legend className="text-xs font-mono font-700 tracking-widest uppercase px-2" style={{ color: 'var(--accent)' }}>
                General Attributes
              </legend>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label htmlFor="ageMin" className="block text-xs font-600 mb-1" style={{ color: 'var(--text-muted)' }}>Min Age</label>
                  <input id="ageMin" type="number" name="ageMin" value={filters.ageMin} onChange={handleChange} placeholder="e.g. 18" className="input" min={15} max={50} />
                </div>
                <div>
                  <label htmlFor="ageMax" className="block text-xs font-600 mb-1" style={{ color: 'var(--text-muted)' }}>Max Age</label>
                  <input id="ageMax" type="number" name="ageMax" value={filters.ageMax} onChange={handleChange} placeholder="e.g. 35" className="input" min={15} max={50} />
                </div>
                <div>
                  <label htmlFor="role" className="block text-xs font-600 mb-1" style={{ color: 'var(--text-muted)' }}>Role</label>
                  <select id="role" name="role" value={filters.role} onChange={handleChange} className="input">
                    <option value="">All Roles</option>
                    {availableRoles.map(r => (
                      <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="foot" className="block text-xs font-600 mb-1" style={{ color: 'var(--text-muted)' }}>Preferred Foot</label>
                  <select id="foot" name="foot" value={filters.foot} onChange={handleChange} className="input">
                    <option value="">Any Foot</option>
                    <option value="right">Right</option>
                    <option value="left">Left</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="border p-4 rounded-xl" style={{ borderColor: 'var(--border2)' }}>
              <legend className="text-xs font-mono font-700 tracking-widest uppercase px-2" style={{ color: 'var(--blue)' }}>
                Market Value (€)
              </legend>
              <div className="space-y-4 mt-2">
                {[
                  { label: 'Value BEFORE Euro 2024', minKey: 'vPreMin', maxKey: 'vPreMax' },
                  { label: 'Value AFTER Euro 2024',  minKey: 'vPostMin', maxKey: 'vPostMax' },
                  { label: 'Value Difference',       minKey: 'vDiffMin', maxKey: 'vDiffMax' },
                ].map(({ label, minKey, maxKey }) => (
                  <div key={minKey} className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={minKey} className="block text-[10px] font-600 mb-1" style={{ color: 'var(--text-muted)' }}>Min {label}</label>
                      <input id={minKey} type="number" name={minKey} value={(filters as any)[minKey]} onChange={handleChange} placeholder="Min €" className="input" />
                    </div>
                    <div>
                      <label htmlFor={maxKey} className="block text-[10px] font-600 mb-1" style={{ color: 'var(--text-muted)' }}>Max {label}</label>
                      <input id={maxKey} type="number" name={maxKey} value={(filters as any)[maxKey]} onChange={handleChange} placeholder="Max €" className="input" />
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-8">
            <button onClick={reset} className="btn btn-ghost w-full justify-center" aria-label="Clear all filters">
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
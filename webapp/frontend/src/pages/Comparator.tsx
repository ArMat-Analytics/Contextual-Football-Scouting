import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Small component to handle player search in the comparator
function PlayerSelectDropdown({ onSelect, index }: { onSelect: (id: number) => void, index: number }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (query.length > 2) {
      fetch(`${API_BASE_URL}/players/?search=${query}`)
        .then(res => res.json())
        .then(data => setResults(data.slice(0, 5))); // Show max 5 suggestions
    } else {
      setResults([]);
    }
  }, [query]);

  return (
    <div className="relative w-full">
      <input 
        type="text" 
        placeholder={`Search Player ${index + 1}...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all placeholder-slate-400 font-medium"
      />
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {results.map(p => (
            <div 
              key={p.player_id} 
              onClick={() => { onSelect(p.player_id); setQuery(""); setResults([]); }}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm font-semibold text-slate-700 border-b border-slate-100 last:border-0 transition-colors flex justify-between items-center"
            >
              <span>{p.player_name}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{p.source_team_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Single player stats column component
function PlayerStatColumn({ playerId }: { playerId: number | null }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (playerId) {
      fetch(`${API_BASE_URL}/players/${playerId}/stats`)
        .then(res => res.json())
        .then(data => setStats(data));
    } else {
      setStats(null);
    }
  }, [playerId]);

  if (!stats) return (
    <div className="h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-white rounded-3xl text-slate-400 shadow-sm">
      <span className="text-4xl mb-2">👤</span>
      <p className="font-medium">No player selected</p>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
      <div className="text-center border-b border-slate-100 pb-6 mb-2">
        <h2 className="text-2xl font-black text-slate-900">{stats.player_name}</h2>
        <p className="text-blue-600 font-bold tracking-wide uppercase text-sm mt-1">{stats.source_team_name}</p>
        <p className="text-xs text-slate-500 capitalize mt-1 font-medium bg-slate-100 inline-block px-3 py-1 rounded-full">{stats.primary_role?.replace(/_/g, ' ')}</p>
      </div>

      {/* Verified Stats Mapping */}
      <div className="space-y-2">
        <StatRow label="Minutes Played" value={stats.minutes_played} />
        <StatRow label="Goals" value={stats.goals} highlight={true} />
        <StatRow label="Expected Goals (xG)" value={stats.xg_total} />
        <StatRow label="Assists" value={stats.assists} highlight={true} />
        <StatRow label="Key Passes" value={stats.key_passes} />
        <StatRow label="Pass Completion" value={stats.pass_completion_pct ? `${stats.pass_completion_pct}%` : null} />
        <StatRow label="Touches" value={stats.total_touches} />
        <StatRow label="Successful Dribbles" value={stats.dribbles_successful} />
        <StatRow label="Ball Recoveries" value={stats.ball_recoveries} />
        <StatRow label="Interceptions" value={stats.interceptions} />
        <StatRow label="Aerial Duels Won" value={stats.aerials_won} />
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight = false }: { label: string, value: any, highlight?: boolean }) {
  // Use ?? '0' to ensure a number is always shown even if falsey, but handle truly missing data
  const displayValue = (value !== null && value !== undefined) ? value : '0';
  
  return (
    <div className={`flex justify-between items-center p-3 rounded-xl transition-colors ${highlight ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
      <span className={`text-xs font-bold uppercase tracking-wider ${highlight ? 'text-blue-700' : 'text-slate-500'}`}>
        {label}
      </span>
      <span className={`font-bold font-mono text-sm ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>
        {displayValue}
      </span>
    </div>
  );
}

export default function Comparator() {
  const [selectedPlayers, setSelectedPlayers] = useState<[number | null, number | null, number | null]>([null, null, null]);

  const handleSelect = (index: number, id: number) => {
    const newSelected = [...selectedPlayers] as [number | null, number | null, number | null];
    newSelected[index] = id;
    setSelectedPlayers(newSelected);
  };

  return (
    <div className="w-full pt-10 pb-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 mb-10 text-center">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Player Comparator</h1>
        <p className="text-slate-500 mt-3 font-medium">Compare detailed match statistics side by side</p>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex flex-col gap-5">
            <PlayerSelectDropdown onSelect={(id) => handleSelect(i, id)} index={i} />
            <PlayerStatColumn playerId={selectedPlayers[i]} />
          </div>
        ))}
      </div>
    </div>
  );
}
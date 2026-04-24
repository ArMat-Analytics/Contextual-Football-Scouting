import { useEffect, useState } from 'react';
import type { FilterState } from './Filters';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Player {
  player_id: number;
  player_name: string;
  primary_role?: string;
  market_value_before_euros?: string;
  market_value_after_euros?: string;
  age?: number;
  source_team_name?: string;
  preferred_foot?: string;
}

interface PlayerListProps {
  searchTerm: string;
  selectedTeams: string[]; 
  filters: FilterState;
}

type SortCol = "player_name" | "primary_role" | "age" | "source_team_name" | "preferred_foot" | "market_value_before_euros" | "market_value_after_euros";

export default function PlayerList({ searchTerm, selectedTeams, filters }: PlayerListProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [sortCol, setSortCol] = useState<SortCol>("player_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setLoading(true);
    
    const params = new URLSearchParams({
      search: searchTerm,
      sort_by: sortCol,
      sort_order: sortOrder
    });
    
    selectedTeams.forEach(team => params.append('teams', team));
    
    // Add filters if they exist
    if (filters.ageMin) params.append('age_min', filters.ageMin);
    if (filters.ageMax) params.append('age_max', filters.ageMax);
    if (filters.role) params.append('role', filters.role);
    if (filters.foot) params.append('foot', filters.foot);
    if (filters.vPreMin) params.append('val_pre_min', filters.vPreMin);
    if (filters.vPreMax) params.append('val_pre_max', filters.vPreMax);
    if (filters.vPostMin) params.append('val_post_min', filters.vPostMin);
    if (filters.vPostMax) params.append('val_post_max', filters.vPostMax);
    if (filters.vDiffMin) params.append('val_diff_min', filters.vDiffMin);
    if (filters.vDiffMax) params.append('val_diff_max', filters.vDiffMax);

    fetch(`${API_BASE_URL}/players/?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setPlayers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading players:", err);
        setLoading(false);
      });
  }, [searchTerm, sortCol, sortOrder, selectedTeams, filters]);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortOrder('desc'); // Default to descending for new columns
    }
  };

  const getSortIcon = (col: SortCol) => {
    if (sortCol !== col) return "↕️";
    return sortOrder === 'asc' ? "🔼" : "🔽";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center">
        <h2 className="font-extrabold text-lg text-slate-800">Player Database</h2>
        <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
          {players.length} results
        </span>
      </div>
      
      <div className="overflow-auto max-h-[600px] relative">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-sm">
              <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("player_name")}>Player {getSortIcon("player_name")}</th>
              <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("primary_role")}>Role {getSortIcon("primary_role")}</th>
              <th className="p-4 font-bold text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("age")}>Age {getSortIcon("age")}</th>
              <th className="p-4 font-bold text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("source_team_name")}>National Team {getSortIcon("source_team_name")}</th>
              <th className="p-4 font-bold text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("preferred_foot")}>Foot {getSortIcon("preferred_foot")}</th>
              <th className="p-4 font-bold text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("market_value_before_euros")}>Pre Value {getSortIcon("market_value_before_euros")}</th>
              <th className="p-4 font-bold text-right cursor-pointer hover:bg-blue-50 transition-colors bg-blue-50/30 text-blue-800" onClick={() => handleSort("market_value_after_euros")}>Post Value {getSortIcon("market_value_after_euros")}</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr 
                key={`player-${player.player_id || 'null'}-${index}`} 
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="p-4 font-semibold text-slate-800">{player.player_name || '-'}</td>
                <td className="p-4 text-sm text-slate-500 capitalize">{player.primary_role?.replace(/_/g, ' ') || '-'}</td>
                <td className="p-4 text-sm text-center text-slate-600">{player.age || '-'}</td>
                <td className="p-4 text-sm text-center font-medium text-slate-700">{player.source_team_name || '-'}</td>
                <td className="p-4 text-sm text-center capitalize text-slate-600">{player.preferred_foot || '-'}</td>
                <td className="p-4 text-sm font-mono text-slate-500 font-bold text-right">
                  {player.market_value_before_euros || '-'}
                </td>
                <td className="p-4 text-sm font-mono text-blue-600 font-bold text-right bg-blue-50/10">
                  {player.market_value_after_euros || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {loading && (
          <div className="text-center py-10 text-blue-600 font-semibold animate-pulse">
            Loading players data...
          </div>
        )}
        
        {!loading && players.length === 0 && (
          <div className="text-center py-16 text-slate-400 font-medium">
            No players found matching the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
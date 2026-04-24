import { useEffect, useState } from 'react';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Team {
  team_id: number;
  team_name: string;
  logo_url?: string; 
}

interface TeamListProps {
  selectedTeams: string[];
  setSelectedTeams: (teams: string[]) => void;
}

export default function TeamList({ selectedTeams, setSelectedTeams }: TeamListProps) {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/teams/`)
      .then(res => res.json())
      .then(data => setTeams(data))
      .catch(err => console.error("Teams fetch error:", err));
  }, []);

  const toggleTeam = (teamName: string) => {
    if (!teamName) return;
    if (selectedTeams.includes(teamName)) {
      setSelectedTeams(selectedTeams.filter(t => t !== teamName));
    } else {
      setSelectedTeams([...selectedTeams, teamName]);
    }
  };

  return (
    <section className="w-full bg-white border-t border-slate-200 py-8 mt-12 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
          <p className="text-sm font-extrabold uppercase text-slate-400 tracking-widest">Filter by National Team</p>
          {selectedTeams.length > 0 && (
            <button 
              onClick={() => setSelectedTeams([])} 
              className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1 rounded-full transition-colors"
            >
              Clear Team Filters
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-y-8 gap-x-2 place-items-center">
          {teams.map((team, index) => {
            const safeName = team?.team_name || "N/A";
            const isSelected = selectedTeams.includes(safeName);
            
            return (
              <div 
                key={`team-${team.team_id || index}`} 
                onClick={() => toggleTeam(safeName)}
                className={`flex flex-col items-center gap-3 transition-all cursor-pointer ${isSelected ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-100 grayscale hover:grayscale-0'}`}
              >
                <div className={`w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border-4 transition-all shadow-sm ${isSelected ? 'border-blue-500 shadow-blue-200 grayscale-0' : 'border-transparent'}`}>
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={safeName} className="w-full h-full object-cover p-1" />
                  ) : (
                    String(safeName).length >= 3 ? String(safeName).substring(0, 3).toUpperCase() : String(safeName).toUpperCase()
                  )}
                </div>
                <span className={`text-[10px] uppercase tracking-wider text-center max-w-[80px] truncate ${isSelected ? 'font-black text-blue-700' : 'font-semibold text-slate-500'}`} title={safeName}>
                  {safeName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
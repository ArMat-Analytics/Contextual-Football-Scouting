import { useEffect, useState } from 'react';
import { getFlagUrl } from '../utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Team { team_id: number; team_name: string; logo_url?: string; }
interface TeamListProps {
  selectedTeams: string[];
  setSelectedTeams: (teams: string[]) => void;
}

export default function TeamList({ selectedTeams, setSelectedTeams }: TeamListProps) {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/teams/`)
      .then(r => r.json())
      .then(d => setTeams(d))
      .catch(() => {});
  }, []);

  const toggleTeam = (name: string) => {
    if (!name) return;
    setSelectedTeams(
      selectedTeams.includes(name)
        ? selectedTeams.filter(t => t !== name)
        : [...selectedTeams, name]
    );
  };

  return (
    <section
      className="w-full border-t mt-10 py-8"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      aria-label="Filter by national team"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>
            Filter by National Team
          </p>
          {selectedTeams.length > 0 && (
            <button
              onClick={() => setSelectedTeams([])}
              className="btn btn-ghost text-xs py-1.5 px-3"
              style={{ color: 'var(--red)' }}
              aria-label="Clear all team filters"
            >
              Clear ({selectedTeams.length})
            </button>
          )}
        </div>

        <ul
          className="flex sm:grid sm:grid-cols-[repeat(auto-fill,minmax(72px,1fr))] overflow-x-auto sm:overflow-visible gap-4 sm:gap-y-6 sm:gap-x-2 pb-4 sm:pb-0 snap-x"
          role="list"
          aria-label="National teams"
        >
          {teams.map((team, idx) => {
            const name     = team?.team_name || 'N/A';
            const selected = selectedTeams.includes(name);
            const flagUrl  = getFlagUrl(name);

            return (
              <li key={`team-${team.team_id ?? idx}`} role="listitem" className="snap-start shrink-0">
                <button
                  onClick={() => toggleTeam(name)}
                  aria-pressed={selected}
                  aria-label={`${selected ? 'Deselect' : 'Select'} ${name}`}
                  className="flex flex-col items-center gap-2 w-20 sm:w-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--blue] rounded-lg p-1 cursor-pointer"
                  style={{ opacity: selected ? 1 : 0.6 }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-mono font-700 overflow-hidden shrink-0 transition-all bg-[--surface2]"
                    style={{
                      border: selected ? '2px solid var(--blue)' : '2px solid transparent',
                      boxShadow: selected ? '0 4px 12px rgba(77,166,255,0.4)' : 'none',
                    }}
                  >
                    {flagUrl ? (
                      <img src={flagUrl} alt={name} className="w-full h-full object-cover" />
                    ) : team.logo_url ? (
                      <img src={team.logo_url} alt={name} className="w-8 h-8 object-contain" />
                    ) : (
                      <span style={{ color: selected ? '#fff' : 'var(--text-muted)' }}>
                        {name.substring(0,3).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-display font-700 tracking-wide uppercase text-center w-full truncate leading-tight"
                    style={{ color: selected ? 'var(--blue)' : 'var(--text-muted)' }}
                    title={name}
                  >
                    {name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
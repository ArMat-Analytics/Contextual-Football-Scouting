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
      className="w-full border-t mt-10 py-8 bg-[var(--surface)] border-[var(--border)]"
      aria-label="Filter by national team"
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--border)]">
          <p className="font-mono text-[10px] tracking-widest uppercase text-[var(--text-dim)]">
            Filter by National Team
          </p>
          {selectedTeams.length > 0 && (
            <button
              onClick={() => setSelectedTeams([])}
              className="btn btn-ghost text-xs py-1.5 px-3 text-[var(--red)]"
              aria-label="Clear all team filters"
            >
              Clear ({selectedTeams.length})
            </button>
          )}
        </div>

        <ul
          className="flex flex-wrap justify-center gap-x-1 gap-y-4"
          role="list"
          aria-label="National teams"
        >
          {teams.map((team, idx) => {
            const name     = team?.team_name || 'N/A';
            const selected = selectedTeams.includes(name);
            const flagUrl  = getFlagUrl(name);

            return (
              <li key={`team-${team.team_id ?? idx}`} role="listitem">
                <button
                  onClick={() => toggleTeam(name)}
                  aria-pressed={selected}
                  aria-label={`${selected ? 'Deselect' : 'Select'} ${name}`}
                  className="flex flex-col items-center gap-1.5 w-[76px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg p-1 cursor-pointer"
                  style={{ opacity: selected ? 1 : 0.6 }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-mono font-bold overflow-hidden shrink-0 transition-all bg-[var(--surface2)]"
                    style={{
                      border: selected ? '2px solid var(--accent)' : '2px solid transparent',
                      boxShadow: selected ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
                    }}
                  >
                    {flagUrl ? (
                      <img src={flagUrl} alt={name} className="w-full h-full object-cover" />
                    ) : team.logo_url ? (
                      <img src={team.logo_url} alt={name} className="w-8 h-8 object-contain" />
                    ) : (
                      <span className={selected ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}>
                        {name.substring(0,3).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[9px] font-display font-bold tracking-wide uppercase text-center w-full truncate leading-tight"
                    style={{ color: selected ? 'var(--accent)' : 'var(--text-muted)' }}
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
import { useEffect, useState, useId } from 'react';
import { Link } from 'react-router-dom';
import type { FilterState } from './Filters';
import { getFlagUrl } from '../utils';

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

type SortCol =
  | 'player_name' | 'primary_role' | 'age'
  | 'source_team_name' | 'preferred_foot'
  | 'market_value_before_euros' | 'market_value_after_euros';

const COLS: { key: SortCol; label: string; align?: string }[] = [
  { key: 'player_name',              label: 'Player' },
  { key: 'primary_role',             label: 'Role' },
  { key: 'age',                      label: 'Age',    align: 'center' },
  { key: 'source_team_name',         label: 'Nation', align: 'center' },
  { key: 'preferred_foot',           label: 'Foot',   align: 'center' },
  { key: 'market_value_before_euros',label: 'Pre €',  align: 'right'  },
  { key: 'market_value_after_euros', label: 'Post €', align: 'right'  },
];

const SKELETON_ROWS = 12;

function SkeletonRow() {
  return (
    <tr aria-hidden="true">
      {COLS.map((c) => (
        <td key={c.key} className="px-4 py-3">
          <div className="skeleton h-4 rounded" style={{ width: c.key === 'player_name' ? '140px' : '64px' }} />
        </td>
      ))}
    </tr>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return (
    <svg className="w-3 h-3 inline ml-1 opacity-30" aria-hidden viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 2l3 4H3zM6 10L3 6h6z"/>
    </svg>
  );
  return dir === 'asc' ? (
    <svg className="w-3 h-3 inline ml-1" aria-hidden viewBox="0 0 12 12" fill="currentColor" style={{ color: 'var(--accent)' }}>
      <path d="M6 2l3 4H3z"/>
    </svg>
  ) : (
    <svg className="w-3 h-3 inline ml-1" aria-hidden viewBox="0 0 12 12" fill="currentColor" style={{ color: 'var(--accent)' }}>
      <path d="M6 10L3 6h6z"/>
    </svg>
  );
}

function FootBadge({ foot }: { foot?: string }) {
  if (!foot) return <span style={{ color: 'var(--text-dim)' }}>—</span>;
  const map: Record<string, string> = { right: 'R', left: 'L', both: 'B' };
  const colors: Record<string, string> = { right: '#4da6ff', left: '#ffc947', both: '#39ff14' };
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono font-700"
      style={{ background: `${colors[foot] ?? '#fff'}22`, color: colors[foot] ?? 'var(--text)' }}
    >
      {map[foot] ?? foot[0].toUpperCase()}
    </span>
  );
}

export default function PlayerList({ searchTerm, selectedTeams, filters }: PlayerListProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>('player_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const captionId = useId();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ search: searchTerm, sort_by: sortCol, sort_order: sortOrder });
    selectedTeams.forEach(t => params.append('teams', t));
    if (filters.ageMin)  params.append('age_min',    filters.ageMin);
    if (filters.ageMax)  params.append('age_max',    filters.ageMax);
    if (filters.role)    params.append('role',       filters.role);
    if (filters.foot)    params.append('foot',       filters.foot);
    if (filters.vPreMin) params.append('val_pre_min', filters.vPreMin);
    if (filters.vPreMax) params.append('val_pre_max', filters.vPreMax);
    if (filters.vPostMin)params.append('val_post_min',filters.vPostMin);
    if (filters.vPostMax)params.append('val_post_max',filters.vPostMax);
    if (filters.vDiffMin)params.append('val_diff_min',filters.vDiffMin);
    if (filters.vDiffMax)params.append('val_diff_max',filters.vDiffMax);

    fetch(`${API_BASE_URL}/players/?${params}`)
      .then(r => r.json())
      .then(d => { setPlayers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [searchTerm, sortCol, sortOrder, selectedTeams, filters]);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortOrder('desc'); }
  };

  return (
    <section
      className="rounded-2xl overflow-hidden border"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      aria-label="Player database"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <h2 className="font-display font-800 text-lg tracking-tight" style={{ color: 'var(--text)' }}>
          Player Database
        </h2>
        <span
          className="tag font-mono"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          aria-live="polite"
          aria-atomic="true"
        >
          {loading ? '…' : `${players.length} players`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto" style={{ maxHeight: '640px' }}>
        <table
          className="w-full border-collapse text-sm whitespace-nowrap"
          aria-labelledby={captionId}
          aria-busy={loading}
        >
          <caption id={captionId} className="sr-only">
            Sortable player statistics table. {players.length} players shown.
          </caption>
          <thead className="sticky top-0 z-10" style={{ background: 'var(--surface)' }}>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {COLS.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 font-mono text-[10px] tracking-widest uppercase cursor-pointer select-none transition-colors hover:bg-[--surface2] ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                  style={{ color: sortCol === col.key ? 'var(--accent)' : 'var(--text-dim)' }}
                  onClick={() => handleSort(col.key)}
                  aria-sort={sortCol === col.key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon active={sortCol === col.key} dir={sortOrder} />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading
              ? Array.from({ length: SKELETON_ROWS }).map((_, i) => <SkeletonRow key={i} />)
              : players.map((player, idx) => {
                  const flagUrl = getFlagUrl(player.source_team_name);
                  return (
                    <tr
                      key={`${player.player_id}-${idx}`}
                      className="border-b transition-colors hover:bg-[--surface2] fade-up"
                      style={{ borderColor: 'var(--border)', animationDelay: `${Math.min(idx * 18, 300)}ms` }}
                    >
                      <td className="px-4 py-3 font-600" style={{ color: 'var(--text)' }}>
                        {player.player_id ? (
                          <Link
                            to={`/player/${player.player_id}`}
                            className="hover:text-[--accent] transition-colors focus-visible:outline-none focus-visible:underline"
                          >
                            {player.player_name || '—'}
                          </Link>
                        ) : (
                          player.player_name || '—'
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize text-xs" style={{ color: 'var(--text-muted)' }}>
                        {player.primary_role?.replace(/_/g, ' ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                        {player.age || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center gap-2 font-600 text-xs" style={{ color: 'var(--text)' }}>
                          {flagUrl ? (
                            <img src={flagUrl} alt="" className="w-5 h-3.5 object-cover rounded-sm shadow-sm" aria-hidden />
                          ) : (
                            <span className="font-mono text-[10px] bg-[--surface2] px-1.5 py-0.5 rounded text-[--text-muted]" aria-hidden>
                              {player.source_team_name?.substring(0,3).toUpperCase()}
                            </span>
                          )}
                          <span>{player.source_team_name || '—'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <FootBadge foot={player.preferred_foot} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        {player.market_value_before_euros || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-700" style={{ color: 'var(--accent)' }}>
                        {player.market_value_after_euros || '—'}
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>

        {!loading && players.length === 0 && (
          <div className="py-20 text-center" style={{ color: 'var(--text-dim)' }}>
            <p className="font-display font-700 text-xl mb-1">No players found</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </section>
  );
}
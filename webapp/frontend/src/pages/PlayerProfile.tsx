import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getFlagUrl, ALL_STATS, CAT_ACCENT, type PlayerStats } from '../utils';
import { usePlayerSpaceControl } from '../hooks/useSpaceControl';
import SpaceControlSection, { type StatViewMode } from '../components/SpaceControlSection';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function StatCard({ label, value, category }: { label: string; value: unknown; category: string }) {
  const accent = CAT_ACCENT[category] ?? '#fff';
  return (
    <div className="card-inner p-4 flex flex-col gap-1 transition-all hover:scale-[1.02] cursor-default" style={{ borderLeft: `3px solid ${accent}` }}>
      <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: accent, opacity: 0.7 }}>{category}</span>
      <span className="font-display font-900 text-3xl leading-none" style={{ color: accent }}>{value != null ? String(value) : '—'}</span>
      <span className="text-xs font-600 leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="card-inner flex flex-col items-center px-4 py-2.5 min-w-[88px]">
      <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span className="font-display font-800 text-base capitalize mt-0.5" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 pt-10 pb-16 space-y-8" aria-busy="true">
      <div className="card p-8">
        <div className="flex gap-6">
          <div className="skeleton w-24 h-24 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-8 rounded w-64" />
            <div className="skeleton h-4 rounded w-40" />
            <div className="flex gap-3">
              {[80, 70, 90, 80].map((w, i) => <div key={i} className="skeleton h-12 rounded-xl" style={{ width: w }} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 11 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function PlayerProfile() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();

  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statMode, setStatMode] = useState<StatViewMode>('raw');

  const { data: scData, loading: scLoading } = usePlayerSpaceControl(playerId);

  useEffect(() => {
    if (!playerId) return;
    setLoadingStats(true);
    fetch(`${API_BASE_URL}/players/${playerId}/stats`)
      .then(r => r.json())
      .then((d: PlayerStats) => { setStats(d); setLoadingStats(false); })
      .catch(() => setLoadingStats(false));
  }, [playerId]);

  const handleFindSimilar = () => {
    if (!stats) return;
    navigate(`/similar?${new URLSearchParams({
      playerId: playerId!,
      playerName: stats.player_name,
      playerTeam: stats.source_team_name ?? '',
      macroRole: scData?.indices?.macro_role ?? '',
    })}`);
  };

  if (loadingStats) return <ProfileSkeleton />;

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center py-40 text-center">
        <div>
          <p className="text-5xl mb-4" aria-hidden>⚠️</p>
          <p className="font-display font-700 text-xl" style={{ color: 'var(--text)' }}>Player not found</p>
          <Link to="/" className="mt-6 inline-block text-sm font-600 hover:text-[--accent] transition-colors" style={{ color: 'var(--text-muted)' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const flagUrl = getFlagUrl(stats.source_team_name);
  const minutesPlayed = scData?.indices?.minutes_played ?? stats.minutes_played;

  return (
    <div className="w-full pb-16 min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-5xl mx-auto px-6 pt-8 mb-6">
        <ol className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <li><Link to="/" className="hover:text-[--accent] transition-colors font-600">Dashboard</Link></li>
          <li aria-hidden>/</li>
          <li className="font-600" style={{ color: 'var(--text)' }} aria-current="page">{stats.player_name}</li>
        </ol>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 mb-10">
        <div className="card p-7 sm:p-8 fade-up">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-display font-900 text-4xl flex-shrink-0 select-none" style={{ background: 'var(--surface2)', color: 'var(--accent)' }} aria-hidden>
              {stats.player_name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {stats.primary_role && (
                  <span className="tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    {stats.primary_role.replace(/_/g, ' ')}
                  </span>
                )}
                {scData?.indices?.macro_role && (
                  <span className="tag" style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {scData.indices.macro_role}
                  </span>
                )}
              </div>
              <h1 className="font-display font-900 text-4xl sm:text-5xl leading-none tracking-tight mb-3" style={{ color: 'var(--text)' }}>
                {stats.player_name}
              </h1>
              <p className="flex items-center gap-2.5 text-sm font-700 mb-5" style={{ color: 'var(--text-muted)' }}>
                {flagUrl && <img src={flagUrl} alt="" className="w-6 h-4 object-cover rounded-[2px] shadow-sm" aria-hidden />}
                {stats.source_team_name}
              </p>
              <div className="flex flex-wrap gap-3 mb-5">
                <InfoPill label="Age"        value={stats.age} />
                <InfoPill label="Foot"       value={stats.preferred_foot} />
                <InfoPill label="Minutes"    value={minutesPlayed != null ? `${minutesPlayed}'` : null} />
                <InfoPill label="Pre Value"  value={stats.market_value_before_euros} />
                <InfoPill label="Post Value" value={stats.market_value_after_euros} />
              </div>
              <button onClick={handleFindSimilar} className="btn btn-primary" aria-label="Find a player similar to this one">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" aria-hidden fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                Find a Similar Player
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DB stats grid */}
      <div className="max-w-5xl mx-auto px-6 mb-12">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }} role="list" aria-label="Player statistics">
          {ALL_STATS.map((stat, i) => (
            <div key={stat.key} role="listitem" className={`fade-up delay-${Math.min(i + 1, 5)}`}>
              <StatCard label={stat.label} value={(stats as unknown as Record<string, unknown>)[stat.key]} category={stat.category} />
            </div>
          ))}
        </div>
      </div>

      {/* Space Control section */}
      {scLoading ? (
        <div className="max-w-5xl mx-auto px-6 mb-12">
          <div className="card p-8 text-center">
            <p className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>Loading Space Control data…</p>
          </div>
        </div>
      ) : scData?.indices ? (
        <SpaceControlSection
          playerName={stats.player_name}
          teamName={stats.source_team_name}
          indexRow={scData.indices}
          aggRow={scData.aggregated}
          mode={statMode}
          onModeChange={setStatMode}
        />
      ) : (
        <div className="max-w-5xl mx-auto px-6 mb-12">
          <div className="card p-6">
            <p className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
              No Space Control data available for this player.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

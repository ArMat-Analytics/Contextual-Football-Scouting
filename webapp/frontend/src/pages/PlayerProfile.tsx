import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getFlagUrl, ALL_STATS, CAT_ACCENT, type PlayerStats } from '../utils';
import { usePlayerSpaceControl } from '../hooks/useSpaceControl';
import SpaceControlSection, { type StatViewMode } from '../components/SpaceControlSection';
import { usePlayerDecisionQuality } from '../hooks/useDecisionQuality';
import DecisionQualitySection from '../components/DecisionQualitySection';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function StatCard({ label, value, category }: { label: string; value: unknown; category: string }) {
  const accent = CAT_ACCENT[category] ?? '#64748b';
  const display = value != null ? String(value) : '—';
  return (
    <div className="group relative flex flex-col gap-1.5 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] transition-all hover:shadow-[var(--shadow)] hover:-translate-y-0.5 cursor-default" style={{ borderTop: `3px solid ${accent}` }}>
      <span className="font-mono text-[9px] tracking-[0.12em] uppercase font-bold" style={{ color: accent }}>{category}</span>
      <span className="font-display font-black text-2xl leading-none text-[var(--text)]">{display}</span>
      <span className="text-[11px] font-semibold text-[var(--text-muted)] leading-tight">{label}</span>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="card-inner flex flex-col items-center px-4 py-2.5 min-w-[88px]">
      <span className="font-mono text-[10px] tracking-widest uppercase text-[var(--text-dim)]">{label}</span>
      <span className="font-display font-extrabold text-base capitalize mt-0.5 text-[var(--text)]">{value}</span>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-16 space-y-8" aria-busy="true">
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
  const [dqMode, setDqMode] = useState<StatViewMode>('raw');

  const { data: scData, loading: scLoading } = usePlayerSpaceControl(playerId);
  const { data: dqData, loading: dqLoading } = usePlayerDecisionQuality(playerId);

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
          <p className="font-display font-bold text-xl text-[var(--text)]">Player not found</p>
          <Link to="/" className="mt-6 inline-block text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const flagUrl = getFlagUrl(stats.source_team_name);
  const minutesPlayed = scData?.indices?.minutes_played ?? stats.minutes_played;
  const passesAnalysed = (scData?.aggregated as any)?.passes_analysed as number | null | undefined;

  return (
    <div className="w-full pb-16 min-h-screen bg-[var(--bg)]">

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-[1200px] mx-auto px-6 pt-8 mb-6">
        <ol className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <li><Link to="/" className="hover:text-[var(--accent)] transition-colors font-semibold">Home</Link></li>
          <li aria-hidden>/</li>
          <li className="font-semibold text-[var(--text)]" aria-current="page">{stats.player_name}</li>
        </ol>
      </nav>

      {/* Hero — two-column split */}
      <div className="max-w-[1200px] mx-auto px-6 mb-10">
        <div className="card p-0 fade-up overflow-hidden">
          <div className="flex flex-col lg:flex-row">

            {/* Left panel — identity */}
            <div className="relative flex flex-col justify-between p-8 lg:w-[340px] shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-[var(--surface2)]">
              {/* Decorative gradient blob */}
              <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(37,99,235,0.08) 0%, transparent 65%)' }} />

              <div>
                {/* Avatar */}
                <div className="relative w-fit mb-6">
                  <div className="absolute -inset-1 rounded-[22px]" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.3) 0%, transparent 60%)' }} />
                  <div
                    className="w-20 h-20 rounded-[18px] flex items-center justify-center font-display font-black text-4xl select-none relative bg-[var(--surface)] text-[var(--accent)]"
                    aria-hidden
                  >
                    {stats.player_name?.[0] ?? '?'}
                  </div>
                </div>

                {/* Role tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {stats.primary_role && (
                    <span className="tag bg-[var(--accent-dim)] text-[var(--accent)]">
                      {stats.primary_role.replace(/_/g, ' ')}
                    </span>
                  )}
                  {scData?.indices?.macro_role && (
                    <span className="tag bg-[var(--accent-dim)] text-[var(--accent)]">
                      {scData.indices.macro_role}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h1 className="font-display font-black text-3xl leading-tight tracking-tight text-[var(--text)] mb-2">
                  {stats.player_name}
                </h1>

                {/* Nationality */}
                <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] mb-6">
                  {flagUrl && <img src={flagUrl} alt="" className="w-6 h-4 object-cover rounded-[2px] shadow-sm" aria-hidden />}
                  {stats.source_team_name}
                </p>
              </div>

              {/* CTA */}
              <button onClick={handleFindSimilar} className="btn btn-primary w-full justify-center" aria-label="Find a player similar to this one">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" aria-hidden fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                Find a Similar Player
              </button>
            </div>

            {/* Right panel — metadata pills grid */}
            <div className="flex-1 p-8">
              <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--text-dim)] mb-5">Player Info</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {([
                  { label: 'Age',             value: stats.age },
                  { label: 'Preferred Foot',  value: stats.preferred_foot },
                  { label: 'Minutes',         value: minutesPlayed != null ? `${minutesPlayed}'` : null },
                  { label: 'Passes Analysed', value: passesAnalysed },
                  { label: 'Pre-tournament Value',  value: stats.market_value_before_euros },
                  { label: 'Post-tournament Value', value: stats.market_value_after_euros },
                ] as { label: string; value: string | number | null | undefined }[]).filter(d => d.value != null && d.value !== '').map(d => (
                  <div key={d.label} className="flex flex-col gap-0.5 p-4 bg-[var(--surface2)] rounded-[12px] border border-[var(--border)]">
                    <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-[var(--text-dim)]">{d.label}</span>
                    <span className="font-display font-black text-xl text-[var(--text)] mt-0.5">{String(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* DB stats grid — grouped by category */}
      <div className="max-w-[1200px] mx-auto px-6 mb-12">
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--text-dim)] mb-4">Traditional Stats</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" role="list" aria-label="Player statistics">
          {ALL_STATS.map((stat, i) => (
            <div key={stat.key} role="listitem" className={`fade-up delay-${Math.min(i + 1, 5)}`}>
              <StatCard label={stat.label} value={(stats as unknown as Record<string, unknown>)[stat.key]} category={stat.category} />
            </div>
          ))}
        </div>
      </div>

      {/* Space Control section */}
      {scLoading ? (
        <div className="max-w-[1200px] mx-auto px-6 mb-12">
          <div className="card p-8 text-center">
            <p className="font-mono text-xs text-[var(--text-dim)]">Loading Space Control data…</p>
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
        <div className="max-w-[1200px] mx-auto px-6 mb-12">
          <div className="card p-6">
            <p className="font-mono text-xs text-[var(--text-dim)]">
              No Space Control data available for this player.
            </p>
          </div>
        </div>
      )}

      {/* Decision Quality section */}
      {dqLoading ? (
        <div className="max-w-[1200px] mx-auto px-6 mb-12">
          <div className="card p-8 text-center">
            <p className="font-mono text-xs text-[var(--text-dim)]">Loading Decision Quality data…</p>
          </div>
        </div>
      ) : dqData ? (
        <DecisionQualitySection
          playerName={stats.player_name}
          teamName={stats.source_team_name}
          row={dqData}
          mode={dqMode}
          onModeChange={setDqMode}
        />
      ) : (
        <div className="max-w-[1200px] mx-auto px-6 mb-12">
          <div className="card p-6">
            <p className="font-mono text-xs text-[var(--text-dim)]">
              No Decision Quality data available for this player.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

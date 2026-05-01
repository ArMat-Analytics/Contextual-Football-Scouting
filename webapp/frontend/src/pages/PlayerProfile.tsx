import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getFlagUrl, ALL_STATS, CAT_ACCENT, CATEGORIES, type PlayerStats } from '../utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, category }: { label: string; value: any; category: string }) {
  const accent = CAT_ACCENT[category] ?? '#fff';
  const display = value != null ? value : '—';
  return (
    <div
      className="card-inner p-4 flex flex-col gap-1 transition-all hover:scale-[1.02] cursor-default"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: accent, opacity: 0.7 }}>
        {category}
      </span>
      <span className="font-display font-900 text-3xl leading-none" style={{ color: accent }}>
        {display}
      </span>
      <span className="text-xs font-600 leading-tight" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

// ── Info pill ─────────────────────────────────────────────────────────────────
function InfoPill({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="card-inner flex flex-col items-center px-4 py-2.5 min-w-[88px]">
      <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span className="font-display font-800 text-base capitalize mt-0.5" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 pt-10 pb-16 space-y-8" aria-busy="true" aria-label="Loading player profile">
      <div className="card p-8">
        <div className="flex gap-6">
          <div className="skeleton w-24 h-24 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-8 rounded w-64" />
            <div className="skeleton h-4 rounded w-40" />
            <div className="flex gap-3">
              {[80,70,90,80].map((w,i) => <div key={i} className="skeleton h-12 rounded-xl" style={{ width: w }} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({length:11}).map((_,i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PlayerProfile() {
  const { playerId }  = useParams<{ playerId: string }>();
  const navigate      = useNavigate();
  const [stats, setStats]       = useState<PlayerStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/players/${playerId}/stats`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [playerId]);

  const toggle = (key: string) => {
    setError('');
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleFind = () => {
    if (selected.length === 0) { setError('Select at least one statistic to find similar players.'); return; }
    navigate(`/similar?${new URLSearchParams({
      playerId: playerId!,
      playerName: stats?.player_name ?? '',
      filters: selected.join(','),
    })}`);
  };

  if (loading) return <ProfileSkeleton />;

  if (!stats) return (
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

  const flagUrl = getFlagUrl(stats.source_team_name);
  const byCategory = CATEGORIES.reduce<Record<string, typeof ALL_STATS[number][]>>((acc, cat) => {
    acc[cat] = ALL_STATS.filter(s => s.category === cat);
    return acc;
  }, {} as any);

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
            {/* Avatar */}
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-display font-900 text-4xl flex-shrink-0 select-none"
              style={{ background: 'var(--surface2)', color: 'var(--accent)' }}
              aria-hidden
            >
              {stats.player_name?.[0] ?? '?'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {stats.primary_role && (
                  <span className="tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    {stats.primary_role.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <h1 className="font-display font-900 text-4xl sm:text-5xl leading-none tracking-tight mb-3" style={{ color: 'var(--text)' }}>
                {stats.player_name}
              </h1>
              <p className="flex items-center gap-2.5 text-sm font-700 mb-5" style={{ color: 'var(--text-muted)' }}>
                {flagUrl && (
                  <img src={flagUrl} alt="" className="w-6 h-4 object-cover rounded-[2px] shadow-sm" aria-hidden />
                )}
                {stats.source_team_name}
              </p>
              <div className="flex flex-wrap gap-3">
                <InfoPill label="Age"       value={stats.age} />
                <InfoPill label="Foot"      value={stats.preferred_foot} />
                <InfoPill label="Pre Value" value={stats.market_value_before_euros} />
                <InfoPill label="Post Value" value={stats.market_value_after_euros} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="max-w-5xl mx-auto px-6 mb-12">
        <h2 className="font-mono text-[10px] tracking-widest uppercase mb-5" style={{ color: 'var(--text-dim)' }}>
          Tournament Statistics
        </h2>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
          role="list"
          aria-label="Player statistics"
        >
          {ALL_STATS.map((stat, i) => (
            <div key={stat.key} role="listitem" className={`fade-up delay-${Math.min(i+1,5)}`}>
              <StatCard label={stat.label} value={(stats as any)[stat.key]} category={stat.category} />
            </div>
          ))}
        </div>
      </div>

      {/* Find similar */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="card p-7 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display font-900 text-2xl mb-1" style={{ color: 'var(--text)' }}>
                Find Similar Players
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Select the statistics to base the search on
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {selected.length > 0 && (
                <>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                    {selected.length} selected
                  </span>
                  <button
                    onClick={() => setSelected([])}
                    className="btn btn-ghost text-xs px-3 py-1.5"
                    aria-label="Deselect all statistics"
                  >
                    Deselect All
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-5 mb-8">
            {(CATEGORIES as readonly string[]).map(cat => {
              const accent = CAT_ACCENT[cat];
              const statsInCat = byCategory[cat] ?? [];
              return (
                <fieldset key={cat} className="border-0 p-0">
                  <legend
                    className="font-mono text-[10px] tracking-widest uppercase mb-3 px-2 py-1 rounded"
                    style={{ background: `${accent}20`, color: accent }}
                  >
                    {cat}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {statsInCat.map(stat => {
                      const checked = selected.includes(stat.key);
                      return (
                        <label
                          key={stat.key}
                          className="flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 transition-all select-none"
                          style={{
                            background: checked ? `${accent}18` : 'var(--surface2)',
                            borderColor: checked ? accent : 'var(--border)',
                            color: checked ? accent : 'var(--text-muted)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(stat.key)}
                            className="w-3.5 h-3.5 rounded"
                            aria-label={`Include ${stat.label} in similarity search`}
                          />
                          <span className="text-xs font-700">{stat.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>

          {error && (
            <p role="alert" className="text-sm font-600 mb-4 px-4 py-3 rounded-xl border"
              style={{ background: 'var(--red-dim)', color: 'var(--red)', borderColor: 'rgba(255,77,106,0.25)' }}>
              ⚠️ {error}
            </p>
          )}

          <button
            onClick={handleFind}
            className="btn btn-primary"
            aria-label="Find similar players based on selected statistics"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" aria-hidden fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            Find Similar Player
          </button>
        </div>
      </div>
    </div>
  );
}
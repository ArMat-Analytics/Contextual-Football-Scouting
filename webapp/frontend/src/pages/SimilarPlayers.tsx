import { useState, useId } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getFlagUrl } from '../utils';
import {
  useSimilarPlayers, usePlayerSpaceControl,
  type SpaceControlIndex, type SpaceControlAggregated,
} from '../hooks/useSpaceControl';
import { StatViewToggle, type StatViewMode } from '../components/SpaceControlSection';

// ── Palette ───────────────────────────────────────────────────────────────────

const C_SOURCE  = '#39ff14'; // neon green — source player
const C_SIMILAR = '#4da6ff'; // blue       — comparison player

// ── Radar dimension definitions ───────────────────────────────────────────────

const RADAR_DEFS = [
  {
    key: 'PROGRESSION',   label: 'Progression',   color: '#39ff14',
    axes: [
      { k: 'pct__lb_geom_per90'                      as keyof SpaceControlIndex, label: 'LB Geom /90' },
      { k: 'pct__lb_quality_per90'                   as keyof SpaceControlIndex, label: 'LB Quality /90' },
      { k: 'pct__lb_epv_per90'                       as keyof SpaceControlIndex, label: 'LB EPV /90' },
      { k: 'pct__successful_hull_penetrations_per90' as keyof SpaceControlIndex, label: 'Hull Penetr. /90' },
      { k: 'pct__defenders_bypassed_mean'            as keyof SpaceControlIndex, label: 'Def. Bypassed' },
    ],
  },
  {
    key: 'DANGEROUSNESS', label: 'Dangerousness', color: '#ff4d6a',
    axes: [
      { k: 'pct__epv_added_per90'       as keyof SpaceControlIndex, label: 'EPV Added /90' },
      { k: 'pct__epv_penetration_per90' as keyof SpaceControlIndex, label: 'EPV Penetr. /90' },
      { k: 'pct__epv_inside_circ_per90' as keyof SpaceControlIndex, label: 'Circ. EPV /90' },
    ],
  },
  {
    key: 'RECEPTION',     label: 'Reception',     color: '#4da6ff',
    axes: [
      { k: 'pct__between_lines_pct'          as keyof SpaceControlIndex, label: 'Between Lines %' },
      { k: 'pct__successful_hull_exits_per90' as keyof SpaceControlIndex, label: 'Hull Exits /90' },
      { k: 'pct__pressure_resistance_pct'    as keyof SpaceControlIndex, label: 'Press. Resist %' },
    ],
  },
  {
    key: 'GRAVITY',       label: 'Gravity',       color: '#ffc947',
    axes: [
      { k: 'pct__gravity_proximity_pct' as keyof SpaceControlIndex, label: 'Space Attract %' },
      { k: 'pct__gravity_hull_pct'      as keyof SpaceControlIndex, label: 'Gravity Hull %' },
      { k: 'pct__gravity_abs_m'         as keyof SpaceControlIndex, label: 'Def. Pull |m|' },
    ],
  },
] as const;

// ── Mother stat definitions per dimension × mode ──────────────────────────────

type StatDef = { col: keyof SpaceControlAggregated; label: string };

const MOTHER: Record<string, Record<StatViewMode, StatDef[]>> = {
  PROGRESSION: {
    raw:      [{ col: 'lb_geom', label: 'LB Geom' }, { col: 'lb_quality', label: 'LB Quality' }, { col: 'lb_epv', label: 'LB EPV' }, { col: 'hull_penetration_n', label: 'Hull Penetr.' }, { col: 'defenders_bypassed_mean', label: 'Def. Bypassed (avg)' }],
    per90:       [{ col: 'lb_geom_per90', label: 'LB Geom /90' }, { col: 'lb_quality_per90', label: 'LB Quality /90' }, { col: 'lb_epv_per90', label: 'LB EPV /90' }, { col: 'successful_hull_penetrations_per90', label: 'Hull Penetr. /90' }],
    percentages: [{ col: 'lb_geom_pct', label: 'LB Geom %' }, { col: 'lb_quality_pct', label: 'LB Quality %' }, { col: 'lb_epv_pct', label: 'LB EPV %' }, { col: 'hull_penetration_pct', label: 'Hull Penetr. %' }],
  },
  DANGEROUSNESS: {
    raw:      [{ col: 'epv_added_sum', label: 'EPV Added (sum)' }, { col: 'epv_added_mean', label: 'EPV Added (avg)' }, { col: 'epv_penetration_sum', label: 'EPV Penetr. (sum)' }, { col: 'epv_inside_circ_sum', label: 'Circ. EPV (sum)' }, { col: 'penetration_n', label: 'Penetrations' }, { col: 'inside_circ_n', label: 'Inside Circ.' }],
    per90:       [{ col: 'epv_added_per90', label: 'EPV Added /90' }, { col: 'epv_penetration_per90', label: 'EPV Penetr. /90' }, { col: 'epv_inside_circ_per90', label: 'Circ. EPV /90' }, { col: 'penetration_per90', label: 'Penetr. /90' }],
    percentages: [],
  },
  RECEPTION: {
    raw:      [{ col: 'between_lines_n', label: 'Between Lines' }, { col: 'hull_exit_n', label: 'Hull Exits' }, { col: 'pressure_resistance_n', label: 'Press. Resist' }],
    per90:       [{ col: 'between_lines_per90', label: 'Btw Lines /90' }, { col: 'successful_hull_exits_per90', label: 'Hull Exits /90' }],
    percentages: [{ col: 'between_lines_pct', label: 'Between Lines %' }, { col: 'hull_exit_pct', label: 'Hull Exits %' }, { col: 'pressure_resistance_pct', label: 'Press. Resist %' }],
  },
  GRAVITY: {
    raw:      [{ col: 'gravity_n', label: 'Gravity (n)' }, { col: 'gravity_directional_n', label: 'Grav. Dir. (n)' }, { col: 'gravity_directional_m', label: 'Def. Pull (m)' }],
    per90:       [],
    percentages: [{ col: 'gravity_proximity_pct', label: 'Space Attract %' }, { col: 'gravity_hull_pct', label: 'Gravity Hull %' }, { col: 'gravity_composite_pct', label: 'Composite %' }],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') return Math.abs(v) < 10 ? v.toFixed(2) : v.toFixed(1);
  return String(v);
}

function ScoreBadge() {
  return <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'var(--surface2)', color: 'var(--text-dim)' }}>N/A</span>;
}
function ScoreBar() {
  return <div style={{ width: '100%', height: '3px', borderRadius: '999px', background: 'var(--surface2)' }} />;
}

function RadarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{payload[0]?.payload?.stat}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontFamily: 'JetBrains Mono, monospace', color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : '—'}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Overlapping dual radar card ───────────────────────────────────────────────

function DualRadarCard({
  def, sourceIdx, similarIdx, sourceAgg, similarAgg,
  sourceName, similarName, mode,
}: {
  def: typeof RADAR_DEFS[number];
  sourceIdx: SpaceControlIndex;
  similarIdx: SpaceControlIndex;
  sourceAgg: SpaceControlAggregated | null | undefined;
  similarAgg: SpaceControlAggregated | null | undefined;
  sourceName: string;
  similarName: string;
  mode: StatViewMode;
}) {
  const radarData = def.axes.map(ax => ({
    stat: ax.label,
    [sourceName]:  (sourceIdx[ax.k]  as number) ?? 0,
    [similarName]: (similarIdx[ax.k] as number) ?? 0,
  }));

  const statList = MOTHER[def.key]?.[mode] ?? [];
  const noStatMsg = mode === 'per90' ? `No /90 stats for ${def.label}` : `No percentage stats for ${def.label}`;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${def.color}`, borderRadius: 'var(--radius-lg)', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: def.color }}>
          {def.label}
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(['idx__PROGRESSION','idx__DANGEROUSNESS','idx__RECEPTION','idx__GRAVITY'] as (keyof SpaceControlIndex)[])
            .filter(k => k === `idx__${def.key}`)
            .map(k => (
              <div key={String(k)} style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 900, lineHeight: 1 }}>
                  <span style={{ color: C_SOURCE }}>{fmt(sourceIdx[k])}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12, margin: '0 4px' }}>vs</span>
                  <span style={{ color: C_SIMILAR }}>{fmt(similarIdx[k])}</span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginTop: 2 }}>Index</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Overlapping radar */}
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <PolarGrid stroke="rgba(255,255,255,0.07)" />
          <PolarAngleAxis dataKey="stat" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Barlow', fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip content={<RadarTooltip />} />
          <Radar name={sourceName}  dataKey={sourceName}  stroke={C_SOURCE}  fill={C_SOURCE}  fillOpacity={0.15} strokeWidth={2} dot={{ fill: C_SOURCE,  r: 3 }} activeDot={{ r: 5 }} />
          <Radar name={similarName} dataKey={similarName} stroke={C_SIMILAR} fill={C_SIMILAR} fillOpacity={0.15} strokeWidth={2} dot={{ fill: C_SIMILAR, r: 3 }} activeDot={{ r: 5 }} />
          <Legend formatter={(v: string) => (
            <span style={{ fontSize: 10, color: v === sourceName ? C_SOURCE : C_SIMILAR, fontFamily: 'Barlow' }}>{v}</span>
          )} wrapperStyle={{ paddingTop: 4 }} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Mother stats comparison */}
      <div style={{ marginTop: 12, background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px' }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>Core Stat</p>
        {statList.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>{noStatMsg}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Stat</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: C_SOURCE, textTransform: 'uppercase', textAlign: 'right', minWidth: 52 }}>{sourceName.split(' ')[0]}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: C_SIMILAR, textTransform: 'uppercase', textAlign: 'right', minWidth: 52 }}>{similarName.split(' ')[0]}</span>
            </div>
            {statList.map(s => {
              const sv = sourceAgg  ? (sourceAgg[s.col]  as number) : null;
              const mv = similarAgg ? (similarAgg[s.col] as number) : null;
              const diff = sv != null && mv != null ? mv - sv : null;
              const better = diff != null && diff > 0;
              const worse  = diff != null && diff < 0;
              return (
                <div key={s.col} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{s.label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: C_SOURCE, textAlign: 'right', minWidth: 52 }}>{fmt(sv)}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, textAlign: 'right', minWidth: 52, color: better ? 'var(--win)' : worse ? 'var(--lose)' : C_SIMILAR }}>
                    {fmt(mv)}
                    {diff != null && diff !== 0 && (
                      <span style={{ fontSize: 9, marginLeft: 2, opacity: 0.8 }}>{better ? `▲` : `▼`}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SimilarPlayers() {
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get('playerName') || 'Player';
  const playerId   = searchParams.get('playerId');
  const macroRole  = searchParams.get('macroRole') || '';

  const dropdownId = useId();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [statMode, setStatMode] = useState<StatViewMode>('raw');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  // Fetch similar players list
  const { players: similarList, loading, error } = useSimilarPlayers(
    macroRole || undefined,
    playerName,
  );

  // Fetch source player's SC data via playerId
  const { data: sourceScData, loading: sourceScLoading } = usePlayerSpaceControl(
    playerId ?? undefined,
  );

  const selectedPlayer = similarList[selectedIdx] ?? null;
  const sourceIdx = sourceScData?.indices ?? null;
  const sourceAgg = sourceScData?.aggregated ?? null;

  // Fetch selected similar player's aggregated data
  const [similarAgg, setSimilarAgg] = useState<SpaceControlAggregated | null>(null);
  const [loadingAgg, setLoadingAgg] = useState(false);

  // When selected player changes, fetch their aggregated stats
  // (sc_indices is already in similarList; sc_aggregated needs a separate call)
  // We reuse the space-control endpoint via their db_player_id — but we don't
  // have their player_id here. Instead we fetch /space-control/aggregated by player+team.
  // Since we don't have that endpoint yet, we read from the similar player's sc_indices
  // row which has pct__ data. For the mother stats table we need sc_aggregated.
  // Solution: add a backend endpoint GET /space-control/aggregated?player=&team=
  const fetchAgg = async (player: string, team: string) => {
    setLoadingAgg(true);
    try {
      const params = new URLSearchParams({ player, team });
      const res = await fetch(`${API_BASE_URL}/space-control/aggregated?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSimilarAgg(data ?? null);
      } else {
        setSimilarAgg(null);
      }
    } catch {
      setSimilarAgg(null);
    } finally {
      setLoadingAgg(false);
    }
  };

  // Effect: fetch aggregated when selected player changes
  const [prevSelected, setPrevSelected] = useState<string | null>(null);
  if (selectedPlayer && `${selectedPlayer.player}__${selectedPlayer.team}` !== prevSelected) {
    setPrevSelected(`${selectedPlayer.player}__${selectedPlayer.team}`);
    fetchAgg(selectedPlayer.player, selectedPlayer.team);
  }

  // ── Loading / error screens ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-40">
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <p className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>Loading similar players…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error === 'timeout') {
    return (
      <div className="flex-1 flex items-center justify-center py-40 text-center px-6">
        <div>
          <p style={{ fontSize: 40, marginBottom: 12 }}>⏱</p>
          <p className="font-display font-700 text-xl mb-2" style={{ color: 'var(--text)' }}>Request Timeout</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>The backend did not respond within 15 seconds. Make sure the server is running.</p>
          <Link to={playerId ? `/player/${playerId}` : '/'} className="btn btn-primary">← Back to Profile</Link>
        </div>
      </div>
    );
  }

  if (error && error !== 'no_macro_role') {
    return (
      <div className="flex-1 flex items-center justify-center py-40 text-center px-6">
        <div>
          <p style={{ fontSize: 40, marginBottom: 12 }}>⚠️</p>
          <p className="font-display font-700 text-xl mb-2" style={{ color: 'var(--text)' }}>Connection Error</p>
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Unable to reach the backend.</p>
          <p className="font-mono text-xs mb-6" style={{ color: 'var(--text-dim)' }}>{error}</p>
          <Link to={playerId ? `/player/${playerId}` : '/'} className="btn btn-primary">← Back to Profile</Link>
        </div>
      </div>
    );
  }

  const chartsReady = sourceIdx && selectedPlayer && !sourceScLoading;

  return (
    <div className="w-full pb-16 min-h-screen" style={{ background: 'var(--bg)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-6xl mx-auto px-6 pt-8 mb-6">
        <ol className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <li><Link to="/" className="hover:text-[--accent] transition-colors font-600">Dashboard</Link></li>
          <li aria-hidden>/</li>
          {playerId && <>
            <li><Link to={`/player/${playerId}`} className="hover:text-[--accent] transition-colors font-600">{playerName}</Link></li>
            <li aria-hidden>/</li>
          </>}
          <li className="font-600" style={{ color: 'var(--text)' }} aria-current="page">Similar Players</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="max-w-6xl mx-auto px-6 mb-8">
        <p className="font-mono text-xs tracking-widest mb-2" style={{ color: 'var(--accent)' }}>SIMILARITY ANALYSIS</p>
        <h1 className="font-display font-900 text-5xl sm:text-6xl leading-none tracking-tight mb-3" style={{ color: 'var(--text)' }}>
          Similar Players
        </h1>
        <p className="text-base" style={{ color: 'var(--text-muted)' }}>
          Comparison with <span className="font-700" style={{ color: 'var(--text)' }}>{playerName}</span>
          {macroRole && <> · Macro role: <span className="font-700" style={{ color: 'var(--accent)' }}>{macroRole}</span></>}
          {' '}· {similarList.length} profiles found
        </p>
        {(!macroRole || error === 'no_macro_role') && (
          <div className="mt-4 px-4 py-3 rounded-xl border inline-flex gap-3" style={{ background: 'var(--gold-dim)', borderColor: 'rgba(255,201,71,0.25)' }}>
            <span style={{ color: 'var(--gold)' }}>⚠️</span>
            <p className="text-sm font-600" style={{ color: 'var(--gold)' }}>
              No macro role available. The player may have less than 90 minutes or SC tables have not been imported.
            </p>
          </div>
        )}
      </div>

      {similarList.length > 0 && (
        <div className="max-w-6xl mx-auto px-6">
          <div className="card p-6 sm:p-8 mb-8">

            {/* Two-col header: source + selector */}
            <div className="grid gap-6 mb-8 pb-8 border-b" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', borderColor: 'var(--border)' }}>
              {/* Source */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center font-display font-900 text-2xl select-none" style={{ background: `${C_SOURCE}18`, color: C_SOURCE }} aria-hidden>
                  {playerName[0]}
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: C_SOURCE }}>Selected player</p>
                  <p className="font-display font-900 text-2xl leading-tight" style={{ color: 'var(--text)' }}>{playerName}</p>
                  {macroRole && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Macro role: {macroRole}</p>}
                  {playerId && <Link to={`/player/${playerId}`} className="text-xs font-600 hover:text-[--accent] transition-colors" style={{ color: 'var(--text-muted)' }}>View Profile →</Link>}
                </div>
              </div>

              {/* Selector */}
              <div>
                <label htmlFor={dropdownId} className="block font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--text-dim)' }}>
                  Select player to compare
                </label>
                <select id={dropdownId} value={selectedIdx} onChange={e => setSelectedIdx(Number(e.target.value))} className="input">
                  {similarList.map((p, i) => (
                    <option key={`${p.player}-${p.team}`} value={i}>{p.player} ({p.team}) — Similarity: N/A</option>
                  ))}
                </select>

                {selectedPlayer && (
                  <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--surface2)' }}>
                    {getFlagUrl(selectedPlayer.team)
                      ? <img src={getFlagUrl(selectedPlayer.team)!} alt="" className="w-6 object-cover rounded-sm shadow-sm shrink-0" aria-hidden />
                      : <span className="text-xs font-mono font-700 rounded shrink-0" style={{ background: 'var(--surface)', padding: '2px 6px', color: 'var(--text-muted)' }} aria-hidden>{selectedPlayer.team?.substring(0,3).toUpperCase()}</span>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-800 text-base leading-tight truncate" style={{ color: C_SIMILAR }}>{selectedPlayer.player}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedPlayer.team} · {selectedPlayer.primary_role} · {selectedPlayer.minutes_played}'</p>
                        <ScoreBadge />
                      </div>
                      <div className="mt-2"><ScoreBar /></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stat view toggle */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
              <StatViewToggle mode={statMode} onChange={setStatMode} />
              {/* Legend */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: C_SOURCE }} />
                  <span className="text-xs font-600" style={{ color: 'var(--text-muted)' }}>{playerName.split(' ')[0]}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: C_SIMILAR }} />
                  <span className="text-xs font-600" style={{ color: 'var(--text-muted)' }}>{selectedPlayer?.player.split(' ')[0] ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* ── 4 dual radar cards ── */}
            {chartsReady && selectedPlayer ? (
              loadingAgg ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ width: 24, height: 24, border: `2px solid ${C_SIMILAR}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                  {RADAR_DEFS.map(def => (
                    <DualRadarCard
                      key={def.key}
                      def={def}
                      sourceIdx={sourceIdx}
                      similarIdx={selectedPlayer}
                      sourceAgg={sourceAgg}
                      similarAgg={similarAgg}
                      sourceName={playerName}
                      similarName={selectedPlayer.player}
                      mode={statMode}
                    />
                  ))}
                </div>
              )
            ) : sourceScLoading ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <p className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>Loading source player's space control profile…</p>
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3 border" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
                  ℹ️ The source player's space control profile is not available. Make sure the SC tables have been imported.
                </p>
              </div>
            )}
          </div>

          {/* Full list */}
          <h2 className="font-display font-900 text-2xl mb-4" style={{ color: 'var(--text)' }}>
            All {macroRole} players ({similarList.length})
          </h2>
          <div className="space-y-3" role="list">
            {similarList.map((player, idx) => {
              const isSelected = idx === selectedIdx;
              const flagUrl = getFlagUrl(player.team);
              return (
                <div
                  key={`${player.player}-${player.team}`}
                  role="listitem"
                  className="card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all cursor-pointer"
                  style={isSelected ? { borderColor: C_SIMILAR, boxShadow: `0 0 0 1px ${C_SIMILAR}` } : undefined}
                  onClick={() => setSelectedIdx(idx)}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelectedIdx(idx)}
                  aria-selected={isSelected}
                >
                  <span className="font-mono font-700 text-xl w-8 text-center" style={{ color: idx < 3 ? 'var(--accent)' : 'var(--text-dim)' }} aria-hidden>{idx + 1}</span>
                  {flagUrl
                    ? <img src={flagUrl} alt="" className="w-8 h-6 object-cover rounded shadow-sm shrink-0" aria-hidden />
                    : <span className="text-xs font-mono font-700 rounded shrink-0" style={{ background: 'var(--surface2)', padding: '4px 8px', color: 'var(--text-muted)' }} aria-hidden>{player.team?.substring(0,3).toUpperCase()}</span>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-display font-900 text-xl" style={{ color: isSelected ? C_SIMILAR : 'var(--text)' }}>{player.player}</span>
                      <ScoreBadge />
                    </div>
                    <p className="text-xs flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <span>{player.team}</span><span aria-hidden>·</span>
                      <span>{player.primary_role}</span><span aria-hidden>·</span>
                      <span>{player.minutes_played}' played</span>
                    </p>
                    <div className="mt-2 max-w-xs"><ScoreBar /></div>
                  </div>
                  <button
                    className="btn text-xs px-3 py-1.5 flex-shrink-0"
                    style={isSelected
                      ? { background: `${C_SIMILAR}18`, color: C_SIMILAR, border: `1px solid ${C_SIMILAR}` }
                      : { background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                    }
                    onClick={e => { e.stopPropagation(); setSelectedIdx(idx); }}
                    aria-pressed={isSelected}
                  >
                    {isSelected ? '✓ Comparing' : 'Compare'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && similarList.length === 0 && macroRole && !error && (
        <div className="max-w-6xl mx-auto px-6">
          <div className="card p-8 text-center">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-display font-700 text-lg" style={{ color: 'var(--text)' }}>
              No other {macroRole} players found in the dataset
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

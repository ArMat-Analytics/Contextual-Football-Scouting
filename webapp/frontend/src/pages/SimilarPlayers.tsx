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
import { TOOLTIP_DESCRIPTIONS } from '../data/tooltip';
import { usePlayerDecisionQuality } from '../hooks/useDecisionQuality';
import { DQCompareRadar } from '../components/DecisionQualitySection';

// ── Palette ───────────────────────────────────────────────────────────────────

const C_SOURCE  = '#16a34a'; // green — source player
const C_SIMILAR = '#2563eb'; // blue  — comparison player

// ── Radar dimension definitions ───────────────────────────────────────────────

const RADAR_DEFS = [
  {
    key: 'PROGRESSION',   label: 'Progression',   color: '#16a34a',
    axes: [
      { k: 'pct__lb_geom_per90'                      as keyof SpaceControlIndex, label: 'LB Geom /90' },
      { k: 'pct__lb_quality_per90'                   as keyof SpaceControlIndex, label: 'LB Quality /90' },
      { k: 'pct__lb_epv_per90'                       as keyof SpaceControlIndex, label: 'High Value Pass /90' },
      { k: 'pct__successful_hull_penetrations_per90' as keyof SpaceControlIndex, label: 'Hull Penetr. /90' },
      { k: 'pct__defenders_bypassed_mean'            as keyof SpaceControlIndex, label: 'Def. Bypassed Avg' },
    ],
  },
  {
    key: 'DANGEROUSNESS', label: 'Dangerousness', color: '#dc2626',
    axes: [
      { k: 'pct__epv_penetration_per90' as keyof SpaceControlIndex, label: 'EPV Penetr. /90' },
      { k: 'pct__epv_inside_circ_per90' as keyof SpaceControlIndex, label: 'EPV In-Circ /90' },
      { k: 'pct__epv_exit_per90'        as keyof SpaceControlIndex, label: 'EPV Exit /90' },
      { k: 'pct__epv_outside_circ_per90' as keyof SpaceControlIndex, label: 'EPV Out-Circ /90' },
    ],
  },
  {
    key: 'RECEPTION',     label: 'Reception',     color: '#2563eb',
    axes: [
      { k: 'pct__between_lines_pct'          as keyof SpaceControlIndex, label: 'Between Lines %' },
      { k: 'pct__successful_hull_exits_per90' as keyof SpaceControlIndex, label: 'Hull Exits /90' },
      { k: 'pct__pressure_resistance_pct'    as keyof SpaceControlIndex, label: 'Press. Resist %' },
    ],
  },
  {
    key: 'GRAVITY',       label: 'Gravity',       color: '#d97706',
    axes: [
      { k: 'pct__gravity_proximity_pct' as keyof SpaceControlIndex, label: 'Space Attraction %' },
      { k: 'pct__gravity_hull_pct'      as keyof SpaceControlIndex, label: 'Gravity Hull %' },
      { k: 'pct__gravity_abs_m'         as keyof SpaceControlIndex, label: 'Def. Pull |m|' },
    ],
  },
] as const;

// ── Mother stat definitions per dimension × mode ──────────────────────────────

type StatDef = { col: keyof SpaceControlAggregated; label: string };

const MOTHER: Record<string, Record<StatViewMode, StatDef[]>> = {
  PROGRESSION: {
    raw: [
      { col: 'lb_geom', label: 'LB Geom' },
      { col: 'lb_quality', label: 'LB Quality' },
      { col: 'lb_epv', label: 'High Value Pass' },
      { col: 'defenders_bypassed_mean', label: 'Def. Bypassed (avg)' },
      { col: 'penetration_n', label: 'Penetration Attempts (n)' },
      { col: 'successful_hull_penetrations_n', label: 'Successful Penetrations (n)' },
    ],
    per90: [
      { col: 'lb_geom_per90', label: 'LB Geom /90' },
      { col: 'lb_quality_per90', label: 'LB Quality /90' },
      { col: 'lb_epv_per90', label: 'High Value Pass /90' },
      { col: 'penetration_per90', label: 'Penetration Attempts /90' },
      { col: 'successful_hull_penetrations_per90', label: 'Successful Penetrations /90' },
    ],
    percentages: [
      { col: 'lb_geom_pct', label: 'LB Geom %' },
      { col: 'lb_quality_pct', label: 'LB Quality %' },
      { col: 'lb_epv_pct', label: 'High Value Pass %' },
      { col: 'penetration_completion_pct', label: 'Penetration Completion %' },
    ],
  },
  DANGEROUSNESS: {
    raw: [
      { col: 'epv_penetration_sum', label: 'EPV Penetr. (sum)' },
      { col: 'epv_inside_circ_sum',  label: 'EPV In-Circ (sum)' },
      { col: 'epv_exit_sum',         label: 'EPV Exit (sum)' },
      { col: 'epv_outside_circ_sum', label: 'EPV Out-Circ (sum)' },
    ],
    per90: [
      { col: 'epv_added_per90',        label: 'EPV Added /90' },
      { col: 'epv_penetration_per90',  label: 'EPV Penetr. /90' },
      { col: 'epv_inside_circ_per90',  label: 'EPV In-Circ /90' },
      { col: 'epv_exit_per90',         label: 'EPV Exit /90' },
      { col: 'epv_outside_circ_per90', label: 'EPV Out-Circ /90' },
    ],
    percentages: [],
  },
  RECEPTION: {
    raw: [
      { col: 'between_lines_n',       label: 'Block Receipts (n)' },
      { col: 'pressure_resistance_n', label: 'Press. Resist (n)' },
      { col: 'inside_circ_n',         label: 'In-Circ (n)' },
    ],
    per90: [
      { col: 'between_lines_per90',          label: 'Between Lines /90' },
      { col: 'successful_hull_exits_per90',  label: 'Hull Exits /90' },
      { col: 'inside_circ_per90',            label: 'In-Circ /90' },
    ],
    percentages: [
      { col: 'between_lines_pct',     label: 'Between Lines %' },
      { col: 'hull_exit_pct',        label: 'Hull Exits %' },
      { col: 'pressure_resistance_pct', label: 'Press. Resist %' },
    ],
  },
  GRAVITY: {
    raw: [
      { col: 'gravity_directional_m', label: 'Def. Pull (m)' },
    ],
    per90: [],
    percentages: [
      { col: 'gravity_proximity_pct', label: 'Space Attraction %' },
      { col: 'gravity_hull_pct', label: 'Gravity Hull %' },
    ],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') return Math.abs(v) < 10 ? v.toFixed(2) : v.toFixed(1);
  return String(v);
}

function ScoreBadge() {
  return (
    <span className="font-mono font-bold text-[11px] py-0.5 px-2.5 rounded-full bg-[var(--surface2)] text-[var(--text-dim)]">
      N/A
    </span>
  );
}

function ScoreBar() {
  return <div className="w-full h-[3px] rounded-full bg-[var(--surface2)]" />;
}

function RadarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] px-3.5 py-2.5 text-xs shadow-lg">
      <p className="font-bold text-[var(--text)] mb-1.5">{payload[0]?.payload?.stat}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-mono" style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : '—'}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Custom PolarAngleAxis tick ─────────────────────────────────────────────────

interface CustomRadarTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  textAnchor?: React.SVGAttributes<SVGTextElement>['textAnchor'];
}

function CustomRadarTick({
  x = 0, y = 0,
  payload, textAnchor = 'middle',
}: CustomRadarTickProps) {
  if (!payload) return null;

  const label       = payload.value;

  const halfW = label.length * 3.5;

  return (
    <g>
      <rect
        x={x - halfW}
        y={y - 8}
        width={halfW * 2}
        height={16}
        fill="transparent"
      />
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fill="var(--text-muted)"
        fontSize={10}
        fontFamily="Inter, sans-serif"
        fontWeight={600}
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    </g>
  );
}

// ── Dual mother stat row ──────────────────────────────────────────────────────

function DualMotherStatRow({
  label,
  sourceValue,
  similarValue,
  diff,
  color,
  showExperimental,
}: {
  label: string;
  sourceValue: string;
  similarValue: string;
  diff: number | null;
  color: string;
  showExperimental?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const description = TOOLTIP_DESCRIPTIONS[label] ?? 'No description available.';

  const better = diff != null && diff > 0;
  const worse  = diff != null && diff < 0;

  return (
    <div className="relative grid gap-2 items-center" style={{ gridTemplateColumns: '1fr auto auto' }}>
      {/* Left cell: label + badges + "?" button + tooltip */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11px] font-semibold text-[var(--text-muted)]">
          {label}
        </span>

        {showExperimental && (
          <span
            className="text-[9px] font-bold uppercase tracking-wide shrink-0 px-1.5 py-0.5 rounded"
            style={{ color, backgroundColor: `${color}15` }}
          >
            Experimental
          </span>
        )}

        <button
          aria-label={`Description for ${label}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="shrink-0 w-[15px] h-[15px] rounded-full text-[8px] font-bold font-display cursor-help flex items-center justify-center transition-all p-0 leading-none border"
          style={{
            borderColor: hovered ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)',
            background: hovered ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.02)',
            color: hovered ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)',
          }}
        >
          ?
        </button>

        {hovered && (
          <div
            role="tooltip"
            className="absolute bottom-[calc(100%+8px)] left-0 w-[240px] bg-[var(--surface)] rounded-[10px] px-3.5 py-2.5 z-[60] pointer-events-none"
            style={{ border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, boxShadow: 'var(--shadow-lg)' }}
          >
            <p className="font-mono text-[10px] font-bold mb-1.5 tracking-wide" style={{ color }}>
              {label}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] leading-[1.55]">
              {description}
            </p>
          </div>
        )}
      </div>

      {/* Source value */}
      <span className="font-mono text-xs font-bold text-right min-w-[52px]" style={{ color: C_SOURCE }}>
        {sourceValue}
      </span>

      {/* Similar value with ▲▼ indicator */}
      <span
        className="font-mono text-xs font-bold text-right min-w-[52px]"
        style={{ color: better ? 'var(--win)' : worse ? 'var(--lose)' : C_SIMILAR }}
      >
        {similarValue}
        {diff != null && diff !== 0 && (
          <span className="text-[9px] ml-0.5 opacity-80">
            {better ? '▲' : '▼'}
          </span>
        )}
      </span>
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
  const sName = sourceName.trim().split(' ').pop() || sourceName;
  const mName = similarName.trim().split(' ').pop() || similarName;
  const [hoveredTitle, setHoveredTitle] = useState(false);
  const isGravity = def.key === 'GRAVITY';
  const expDesc = TOOLTIP_DESCRIPTIONS['Experimental'];

  const radarData = def.axes.map(ax => ({
    stat: ax.label,
    [sName]: (sourceIdx[ax.k] as number) ?? 0,
    [mName]: (similarIdx[ax.k] as number) ?? 0,
  }));

  const statList = MOTHER[def.key]?.[mode] ?? [];

  const renderTick = (props: any) => <CustomRadarTick {...props} />;

  let emptyMessage =
    mode === 'per90'
      ? `No /90 stats for ${def.label}`
      : `No percentage stats for ${def.label}`;

  if (def.key === 'DANGEROUSNESS' && mode === 'percentages') {
    emptyMessage =
      "The Dangerousness index does not include percentage statistics because it is based on EPV (Expected Pass Value) and absolute penetration volumes. Being a probabilistic measure that calculates the net offensive 'weight' generated by a player, it is evaluated exclusively in absolute values (Raw) or scaled to playing time (Per 90).";
  } else if (def.key === 'GRAVITY' && mode === 'per90') {
    emptyMessage =
      "Gravity statistics are not calculated 'Per 90' because they measure the reaction and spatial deformation of the opposing defense (in meters or percentage deviations). Since it represents an average effect calculated every time the player has the ball, it reflects a constant 'magnetic pull' rather than a cumulative volume of actions over time.";
  }

  return (
    <div
      className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow)]"
      style={{ borderTop: `3px solid ${def.color}` }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <div className="relative flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase font-bold" style={{ color: def.color }}>
            {def.label}
          </span>

          <button
            aria-label={`Description for ${def.label}`}
            onMouseEnter={() => setHoveredTitle(true)}
            onMouseLeave={() => setHoveredTitle(false)}
            className="shrink-0 w-[15px] h-[15px] rounded-full text-[8px] font-bold font-display cursor-help flex items-center justify-center transition-all p-0 leading-none border"
            style={{
              borderColor: hoveredTitle ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)',
              background: hoveredTitle ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.02)',
              color: hoveredTitle ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)',
            }}
          >
            ?
          </button>

          {hoveredTitle && (
            <div
              role="tooltip"
              className="absolute bottom-[calc(100%+8px)] left-0 w-[240px] bg-[var(--surface)] rounded-[10px] px-3.5 py-2.5 z-[60] pointer-events-none"
              style={{ border: `1px solid ${def.color}33`, borderLeft: `3px solid ${def.color}`, boxShadow: 'var(--shadow-lg)' }}
            >
              <p className="font-mono text-[10px] font-bold mb-1.5 tracking-wide" style={{ color: def.color }}>
                {def.label}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] leading-[1.55]">
                {TOOLTIP_DESCRIPTIONS[def.label] ?? `${def.label} index — percentile rank within macro-role (0–100).`}
              </p>
              {isGravity && (
                <>
                  <div className="mt-2 mb-1">
                    <span className="inline-flex items-center gap-1 rounded px-2 py-0.75 text-[9px] font-bold uppercase tracking-wide" style={{ color: def.color, backgroundColor: `${def.color}15` }}>
                      Experimental
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-[1.55]">
                    {expDesc}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          {(['idx__PROGRESSION', 'idx__DANGEROUSNESS', 'idx__RECEPTION', 'idx__GRAVITY'] as (keyof SpaceControlIndex)[])
            .filter(k => k === `idx__${def.key}`)
            .map(k => (
              <div key={String(k)} className="text-right">
                <div className="font-mono text-lg font-black leading-none">
                  <span style={{ color: C_SOURCE }}>{fmt(sourceIdx[k])}</span>
                  <span className="text-[var(--text-dim)] text-xs mx-1">vs</span>
                  <span style={{ color: C_SIMILAR }}>{fmt(similarIdx[k])}</span>
                </div>
                <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--text-dim)] mt-0.5">
                  Index
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Overlapping dual radar */}
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <PolarGrid stroke="rgba(0,0,0,0.08)" />
          <PolarAngleAxis dataKey="stat" tick={renderTick} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip content={<RadarTooltip />} />
          <Radar name={sName} dataKey={sName} stroke={C_SOURCE} fill={C_SOURCE} fillOpacity={0.15} strokeWidth={2}
            dot={{ fill: C_SOURCE, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: C_SOURCE, stroke: '#fff', strokeWidth: 1.5 }}
          />
          <Radar name={mName} dataKey={mName} stroke={C_SIMILAR} fill={C_SIMILAR} fillOpacity={0.15} strokeWidth={2}
            dot={{ fill: C_SIMILAR, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: C_SIMILAR, stroke: '#fff', strokeWidth: 1.5 }}
          />
          <Legend
            formatter={(v: string) => (
              <span className="text-[10px] font-display" style={{ color: v === sName ? C_SOURCE : C_SIMILAR }}>{v}</span>
            )}
            wrapperStyle={{ paddingTop: 4 }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Mother stats comparison */}
      <div className="mt-3 bg-[var(--surface2)] rounded-[10px] p-3">
        <p className="font-mono text-[8px] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-2">
          Core Stats
        </p>

        {statList.length === 0 ? (
          <div className="bg-[var(--bg)] p-3 rounded-md border border-[var(--border)]">
            <p className="text-[11px] text-[var(--text-muted)] leading-[1.5]">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* Column headers */}
            <div className="grid gap-2 pb-1 mb-1 border-b border-[var(--border)]" style={{ gridTemplateColumns: '1fr auto auto' }}>
              <span className="font-mono text-[9px] text-[var(--text-dim)] uppercase">Stat</span>
              <span className="font-mono text-[9px] uppercase text-right min-w-[52px]" style={{ color: C_SOURCE }}>{sName}</span>
              <span className="font-mono text-[9px] uppercase text-right min-w-[52px]" style={{ color: C_SIMILAR }}>{mName}</span>
            </div>

            {statList.map(s => {
              const sv   = sourceAgg  ? (sourceAgg[s.col]  as number) : null;
              const mv   = similarAgg ? (similarAgg[s.col] as number) : null;
              const diff = sv != null && mv != null ? mv - sv : null;
              return (
                <DualMotherStatRow
                  key={s.col}
                  label={s.label}
                  sourceValue={fmt(sv)}
                  similarValue={fmt(mv)}
                  diff={diff}
                  color={def.color}
                  showExperimental={def.key === 'GRAVITY'}
                />
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
  const { data: sourceDQ } = usePlayerDecisionQuality(playerId ?? undefined);

  const selectedPlayer = similarList[selectedIdx] ?? null;
  const { data: compareDQ } = usePlayerDecisionQuality(
    selectedPlayer?.player_id != null ? String(selectedPlayer.player_id) : undefined,
  );
  const sourceIdx = sourceScData?.indices ?? null;
  const sourceAgg = sourceScData?.aggregated ?? null;

  const sourcePassesAnalysed = (sourceAgg as any)?.passes_analysed as number | null | undefined;

  // Fetch selected similar player's aggregated data
  const [similarAgg, setSimilarAgg] = useState<SpaceControlAggregated | null>(null);
  const [loadingAgg, setLoadingAgg] = useState(false);

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
        <div className="text-center">
          <div className="w-8 h-8 border-[3px] border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-[var(--text-dim)]">Loading similar players…</p>
        </div>
      </div>
    );
  }

  if (error === 'timeout') {
    return (
      <div className="flex-1 flex items-center justify-center py-40 text-center px-6">
        <div>
          <p className="text-[40px] mb-3">⏱</p>
          <p className="font-display font-bold text-xl mb-2 text-[var(--text)]">Request Timeout</p>
          <p className="text-sm mb-6 text-[var(--text-muted)]">The backend did not respond within 15 seconds. Make sure the server is running.</p>
          <Link to={playerId ? `/player/${playerId}` : '/'} className="btn btn-primary">← Back to Profile</Link>
        </div>
      </div>
    );
  }

  if (error && error !== 'no_macro_role') {
    return (
      <div className="flex-1 flex items-center justify-center py-40 text-center px-6">
        <div>
          <p className="text-[40px] mb-3">⚠️</p>
          <p className="font-display font-bold text-xl mb-2 text-[var(--text)]">Connection Error</p>
          <p className="text-sm mb-2 text-[var(--text-muted)]">Unable to reach the backend.</p>
          <p className="font-mono text-xs mb-6 text-[var(--text-dim)]">{error}</p>
          <Link to={playerId ? `/player/${playerId}` : '/'} className="btn btn-primary">← Back to Profile</Link>
        </div>
      </div>
    );
  }

  const chartsReady = sourceIdx && selectedPlayer && !sourceScLoading;

  return (
    <div className="w-full pb-16 min-h-screen bg-[var(--bg)]">

      {/* Page header */}
      <div className="border-b border-[var(--border)] px-6 pt-10 pb-8 bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <li><Link to="/" className="hover:text-[var(--accent)] transition-colors font-semibold">Home</Link></li>
              <li aria-hidden>/</li>
              {playerId && (
                <>
                  <li><Link to={`/player/${playerId}`} className="hover:text-[var(--accent)] transition-colors font-semibold">{playerName}</Link></li>
                  <li aria-hidden>/</li>
                </>
              )}
              <li className="font-semibold text-[var(--text)]" aria-current="page">Similar Players</li>
            </ol>
          </nav>

          <p className="font-mono text-xs tracking-widest mb-2 text-[var(--accent)]">SIMILARITY ANALYSIS</p>
          <h1 className="font-display font-black text-5xl sm:text-6xl leading-none tracking-tight mb-3 text-[var(--text)]">
            Similar Players
          </h1>
          <p className="text-base text-[var(--text-muted)]">
            Comparison with <span className="font-bold text-[var(--text)]">{playerName}</span>
            {macroRole && <> · Macro role: <span className="font-bold text-[var(--accent)]">{macroRole}</span></>}
            {' '}· {similarList.length} profiles found
          </p>
          {(!macroRole || error === 'no_macro_role') && (
            <div className="mt-4 px-4 py-3 rounded-xl border inline-flex gap-3 bg-amber-50 border-amber-200">
              <span className="text-amber-600">⚠️</span>
              <p className="text-sm font-semibold text-amber-700">
                No macro role available. The player may have less than 90 minutes or SC tables have not been imported.
              </p>
            </div>
          )}
        </div>
      </div>

      {similarList.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 pt-8">
          <div className="card p-6 sm:p-8 mb-8">

            {/* Two-col header: source player + comparison selector */}
            <div className="grid gap-6 mb-8 pb-8 border-b border-[var(--border)]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>

              {/* Source player */}
              <div className="relative overflow-hidden bg-[var(--surface2)] border border-[var(--border)] rounded-[14px] p-4 flex items-center gap-3.5">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l" style={{ background: C_SOURCE }} />
                <div
                  className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center font-display font-black text-2xl select-none"
                  style={{ background: `${C_SOURCE}12`, color: C_SOURCE }}
                  aria-hidden
                >
                  {playerName[0]}
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: C_SOURCE }}>Selected player</p>
                  <p className="font-display font-black text-2xl leading-tight text-[var(--text)]">{playerName}</p>
                  {macroRole && <p className="text-xs mt-0.5 text-[var(--text-muted)]">Macro role: {macroRole}</p>}
                  <p className="font-mono text-[10px] mt-1 text-[var(--text-dim)]">
                    {sourceIdx?.minutes_played != null ? `${sourceIdx.minutes_played} min` : ''}
                    {sourcePassesAnalysed != null
                      ? `${sourceIdx?.minutes_played != null ? ' · ' : ''}${sourcePassesAnalysed} passes analysed`
                      : ''}
                  </p>
                  {playerId && (
                    <Link
                      to={`/player/${playerId}`}
                      className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                    >
                      View Profile →
                    </Link>
                  )}
                </div>
              </div>

              {/* Comparison selector */}
              <div>
                <label htmlFor={dropdownId} className="block font-mono text-[10px] tracking-widest uppercase mb-2 text-[var(--text-dim)]">
                  Select player to compare
                </label>
                <div className="relative">
                  <select
                    id={dropdownId}
                    value={selectedIdx}
                    onChange={e => setSelectedIdx(Number(e.target.value))}
                    className="input pr-9 appearance-none"
                  >
                    {similarList.map((p, i) => (
                      <option key={`${p.player}-${p.team}`} value={i}>{p.player} ({p.team}) — Similarity: N/A</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] text-[13px] pointer-events-none">▾</span>
                </div>

                {selectedPlayer && (
                  <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-[14px]">
                    {getFlagUrl(selectedPlayer.team)
                      ? <img src={getFlagUrl(selectedPlayer.team)!} alt="" className="w-6 object-cover rounded-sm shadow-sm shrink-0" aria-hidden />
                      : <span className="text-xs font-mono font-bold rounded shrink-0 bg-[var(--surface)] px-1.5 py-0.5 text-[var(--text-muted)]" aria-hidden>{selectedPlayer.team?.substring(0, 3).toUpperCase()}</span>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-extrabold text-base leading-tight truncate" style={{ color: C_SIMILAR }}>{selectedPlayer.player}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-[var(--text-muted)]">{selectedPlayer.team} · {selectedPlayer.primary_role} · {selectedPlayer.minutes_played}'</p>
                        <ScoreBadge />
                      </div>
                      <div className="mt-2"><ScoreBar /></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stat view toggle + player legend */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
              <StatViewToggle mode={statMode} onChange={setStatMode} />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: C_SOURCE }} />
                  <span className="text-xs font-semibold text-[var(--text-muted)]">{playerName.trim().split(' ').pop()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: C_SIMILAR }} />
                  <span className="text-xs font-semibold text-[var(--text-muted)]">{selectedPlayer?.player.trim().split(' ').pop() ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* 4 dual radar cards */}
            {chartsReady && selectedPlayer ? (
              loadingAgg ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: C_SIMILAR, borderTopColor: 'transparent' }} />
                </div>
              ) : (
                <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
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
              <div className="text-center py-8">
                <p className="font-mono text-xs text-[var(--text-dim)]">Loading source player's space control profile…</p>
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3 border bg-[var(--surface2)] border-[var(--border)]">
                <p className="text-xs font-mono text-[var(--text-dim)]">
                  The source player's space control profile is not available. Make sure the SC tables have been imported.
                </p>
              </div>
            )}

            {/* Decision Quality comparison radar */}
            {sourceDQ && compareDQ && (
              <div className="mt-6">
                <DQCompareRadar
                  sourceRow={sourceDQ}
                  compareRow={compareDQ}
                  sourceName={playerName}
                  compareName={selectedPlayer?.player ?? 'Comparison player'}
                />
              </div>
            )}
          </div>

          {/* Full similar players list */}
          <h2 className="font-display font-black text-2xl mb-4 text-[var(--text)]">
            All {macroRole} players ({similarList.length})
          </h2>
          <div className="space-y-3" role="list">
            {similarList.map((player, idx) => {
              const isSelected = idx === selectedIdx;
              const flagUrl    = getFlagUrl(player.team);
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
                  <span className={`font-mono font-bold text-xl w-8 text-center ${idx < 3 ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}`} aria-hidden>
                    {idx + 1}
                  </span>
                  {flagUrl
                    ? <img src={flagUrl} alt="" className="w-8 h-6 object-cover rounded shadow-sm shrink-0" aria-hidden />
                    : <span className="text-xs font-mono font-bold rounded shrink-0 bg-[var(--surface2)] px-2 py-1 text-[var(--text-muted)]" aria-hidden>{player.team?.substring(0, 3).toUpperCase()}</span>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-display font-black text-xl" style={{ color: isSelected ? C_SIMILAR : 'var(--text)' }}>{player.player}</span>
                      <ScoreBadge />
                    </div>
                    <p className="text-xs flex items-center gap-2 text-[var(--text-muted)]">
                      <span>{player.team}</span><span aria-hidden>·</span>
                      <span>{player.primary_role}</span><span aria-hidden>·</span>
                      <span>{player.minutes_played}' played</span>
                    </p>
                    <div className="mt-2 max-w-xs"><ScoreBar /></div>
                  </div>
                  <button
                    className="btn text-xs px-3 py-1.5 shrink-0"
                    style={isSelected
                      ? { background: `${C_SIMILAR}12`, color: C_SIMILAR, border: `1px solid ${C_SIMILAR}` }
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
        <div className="max-w-6xl mx-auto px-6 pt-8">
          <div className="card p-8 text-center">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-display font-bold text-lg text-[var(--text)]">
              No other {macroRole} players found in the dataset
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
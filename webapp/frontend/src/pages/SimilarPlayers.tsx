import { useState, useRef, useId } from 'react';
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

const C_SOURCE  = '#39ff14'; // neon green — source player
const C_SIMILAR = '#4da6ff'; // blue       — comparison player

// ── Radar dimension definitions ───────────────────────────────────────────────

const RADAR_DEFS = [
  {
    key: 'PROGRESSION',   label: 'Progression',   color: '#39ff14',
    axes: [
      { k: 'pct__lb_geom_per90'                      as keyof SpaceControlIndex, label: 'LB Geom /90' },
      { k: 'pct__lb_quality_per90'                   as keyof SpaceControlIndex, label: 'LB Quality /90' },
      { k: 'pct__lb_epv_per90'                       as keyof SpaceControlIndex, label: 'High Value Pass /90' },
      { k: 'pct__successful_hull_penetrations_per90' as keyof SpaceControlIndex, label: 'Hull Penetr. /90' },
      { k: 'pct__defenders_bypassed_mean'            as keyof SpaceControlIndex, label: 'Def. Bypassed Avg' },
    ],
  },
  {
    key: 'DANGEROUSNESS', label: 'Dangerousness', color: '#ff4d6a',
    axes: [
      { k: 'pct__epv_penetration_per90' as keyof SpaceControlIndex, label: 'EPV Penetr. /90' },
      { k: 'pct__epv_inside_circ_per90' as keyof SpaceControlIndex, label: 'EPV In-Circ /90' },
      { k: 'pct__epv_exit_per90'        as keyof SpaceControlIndex, label: 'EPV Exit /90' },
      { k: 'pct__epv_outside_circ_per90' as keyof SpaceControlIndex, label: 'EPV Out-Circ /90' },
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
    key: 'GRAVITY',       label: 'Gravity',       color: '#756f60',
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
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'var(--surface2)', color: 'var(--text-dim)' }}>
      N/A
    </span>
  );
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

// ── Axis tooltip state type ───────────────────────────────────────────────────

interface AxisTooltipState {
  label: string;
  description: string;
  /** Coordinates relative to the card container's top-left corner */
  x: number;
  y: number;
}

// ── Custom PolarAngleAxis tick — hover on label text to show description ───────
// Recharts passes x, y (label centre), payload (payload.value = label string),
// and textAnchor. Hovering the label fires callbacks so DualRadarCard can
// display the description overlay. No "?" icon is rendered.

interface CustomRadarTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  textAnchor?: React.SVGAttributes<SVGTextElement>['textAnchor'];
  onHover: (label: string, description: string, clientX: number, clientY: number) => void;
  onLeave: () => void;
}

function CustomRadarTick({
  x = 0, y = 0,
  payload, textAnchor = 'middle',
  onHover, onLeave,
}: CustomRadarTickProps) {
  const [hovered, setHovered] = useState(false);

  if (!payload) return null;

  const label       = payload.value;
  const description = TOOLTIP_DESCRIPTIONS[label] ?? 'No description available.';

  const handleMouseEnter = (e: React.MouseEvent<SVGRectElement>) => {
    setHovered(true);
    onHover(label, description, e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    onLeave();
  };

  // Estimate text half-width for the invisible hit-area rect
  const halfW = label.length * 3.5;

  return (
    <g>
      {/* Invisible rect — wider hit area so hover is easy to trigger */}
      <rect
        x={x - halfW}
        y={y - 8}
        width={halfW * 2}
        height={16}
        fill="transparent"
        style={{ cursor: 'help' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Axis label text — brightens on hover to signal interactivity */}
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fill={hovered ? '#ffffff' : 'var(--text-muted)'}
        fontSize={10}
        fontFamily="Barlow, sans-serif"
        fontWeight={hovered ? 700 : 600}
        style={{
          transition: 'fill 0.12s',
          pointerEvents: 'none',
        }}
      >
        {label}
      </text>
    </g>
  );
}

// ── Dual mother stat row with inline "?" tooltip ──────────────────────────────
// Renders a 3-column Core Stats row: label (+ "?" + tooltip) | source val | similar val.
// The tooltip floats above the row, anchored via position:absolute on the
// container div, so it always stays inside the card.

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
    <div
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {/* Left cell: label + badges + "?" button + tooltip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
          {label}
        </span>

        {showExperimental && (
          <span style={{
            fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
            color, backgroundColor: `${color}22`,
            padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.02em',
            flexShrink: 0,
          }}>
            Experimental
          </span>
        )}

        {/* "?" button */}
        <button
          aria-label={`Description for ${label}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            flexShrink: 0,
            width: 15, height: 15,
            borderRadius: '50%',
            border: `1px solid ${hovered ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)'}`,
            background: hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
            color: hovered ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)',
            fontSize: '8px', fontWeight: 700,
            fontFamily: 'Barlow, sans-serif',
            cursor: 'help',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.12s',
            padding: 0, lineHeight: 1,
          }}
        >
          ?
        </button>

        {/* Tooltip — floats above the row */}
        {hovered && (
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: 0,
              maxWidth: '240px',
              background: 'var(--surface)',
              border: `1px solid ${color}44`,
              borderLeft: `3px solid ${color}`,
              borderRadius: '10px',
              padding: '10px 14px',
              zIndex: 60,
              pointerEvents: 'none',
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            }}
          >
            <p style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px', fontWeight: 700,
              color, marginBottom: '6px', letterSpacing: '0.04em',
            }}>
              {label}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              {description}
            </p>
          </div>
        )}
      </div>

      {/* Source value */}
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
        color: C_SOURCE, textAlign: 'right', minWidth: 52,
      }}>
        {sourceValue}
      </span>

      {/* Similar value with ▲▼ indicator */}
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
        textAlign: 'right', minWidth: 52,
        color: better ? 'var(--win)' : worse ? 'var(--lose)' : C_SIMILAR,
      }}>
        {similarValue}
        {diff != null && diff !== 0 && (
          <span style={{ fontSize: 9, marginLeft: 2, opacity: 0.8 }}>
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
  // Extract last names
  const sName = sourceName.trim().split(' ').pop() || sourceName;
  const mName = similarName.trim().split(' ').pop() || similarName;

  const radarData = def.axes.map(ax => ({
    stat: ax.label,
    [sName]: (sourceIdx[ax.k] as number) ?? 0,
    [mName]: (similarIdx[ax.k] as number) ?? 0,
  }));

  const statList = MOTHER[def.key]?.[mode] ?? [];

  // Axis description tooltip state — position relative to the card container
  const [axisTooltip, setAxisTooltip] = useState<AxisTooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAxisHover = (
    label: string,
    description: string,
    clientX: number,
    clientY: number,
  ) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setAxisTooltip({ label, description, x: clientX - rect.left, y: clientY - rect.top });
  };

  const handleAxisLeave = () => setAxisTooltip(null);

  // Stable tick renderer — avoids re-creating the function on every render
  const renderTick = (props: any) => (
    <CustomRadarTick
      {...props}
      onHover={handleAxisHover}
      onLeave={handleAxisLeave}
    />
  );

  // Informative messages for empty mother-stat panels
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
      ref={containerRef}
      style={{
        position: 'relative',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${def.color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: def.color }}>
          {def.label}
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(['idx__PROGRESSION', 'idx__DANGEROUSNESS', 'idx__RECEPTION', 'idx__GRAVITY'] as (keyof SpaceControlIndex)[])
            .filter(k => k === `idx__${def.key}`)
            .map(k => (
              <div key={String(k)} style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 900, lineHeight: 1 }}>
                  <span style={{ color: C_SOURCE }}>{fmt(sourceIdx[k])}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12, margin: '0 4px' }}>vs</span>
                  <span style={{ color: C_SIMILAR }}>{fmt(similarIdx[k])}</span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginTop: 2 }}>
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
          <PolarGrid stroke="rgba(255,255,255,0.07)" />
          <PolarAngleAxis dataKey="stat" tick={renderTick} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip content={<RadarTooltip />} />
          <Radar name={sName} dataKey={sName} stroke={C_SOURCE}  fill={C_SOURCE}  fillOpacity={0.15} strokeWidth={2} dot={{ fill: C_SOURCE,  r: 3 }} activeDot={{ r: 5 }} />
          <Radar name={mName} dataKey={mName} stroke={C_SIMILAR} fill={C_SIMILAR} fillOpacity={0.15} strokeWidth={2} dot={{ fill: C_SIMILAR, r: 3 }} activeDot={{ r: 5 }} />
          <Legend
            formatter={(v: string) => (
              <span style={{ fontSize: 10, color: v === sName ? C_SOURCE : C_SIMILAR, fontFamily: 'Barlow' }}>{v}</span>
            )}
            wrapperStyle={{ paddingTop: 4 }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Axis description tooltip overlay */}
      {axisTooltip && (
        <div
          role="tooltip"
          aria-live="polite"
          style={{
            position: 'absolute',
            left: Math.min(axisTooltip.x + 12, 260),
            top: axisTooltip.y - 6,
            maxWidth: '220px',
            background: 'var(--surface2)',
            border: `1px solid ${def.color}44`,
            borderLeft: `3px solid ${def.color}`,
            borderRadius: '10px',
            padding: '10px 14px',
            pointerEvents: 'none',
            zIndex: 50,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px', fontWeight: 700,
            color: def.color, marginBottom: '6px', letterSpacing: '0.04em',
          }}>
            {axisTooltip.label}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
            {axisTooltip.description}
          </p>
        </div>
      )}

      {/* Mother stats comparison */}
      <div style={{ marginTop: 12, background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px' }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
          Core Stats
        </p>

        {statList.length === 0 ? (
          <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Stat</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: C_SOURCE, textTransform: 'uppercase', textAlign: 'right', minWidth: 52 }}>{sName}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: C_SIMILAR, textTransform: 'uppercase', textAlign: 'right', minWidth: 52 }}>{mName}</span>
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
          {playerId && (
            <>
              <li><Link to={`/player/${playerId}`} className="hover:text-[--accent] transition-colors font-600">{playerName}</Link></li>
              <li aria-hidden>/</li>
            </>
          )}
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

            {/* Two-col header: source player + comparison selector */}
            <div className="grid gap-6 mb-8 pb-8 border-b" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', borderColor: 'var(--border)' }}>

              {/* Source player */}
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 14, padding: 16,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: 3, background: C_SOURCE, borderRadius: '3px 0 0 3px',
                }} />
                <div
                  className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center font-display font-900 text-2xl select-none"
                  style={{ background: `${C_SOURCE}18`, color: C_SOURCE }}
                  aria-hidden
                >
                  {playerName[0]}
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: C_SOURCE }}>Selected player</p>
                  <p className="font-display font-900 text-2xl leading-tight" style={{ color: 'var(--text)' }}>{playerName}</p>
                  {macroRole && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Macro role: {macroRole}</p>}
                  {/* minutes + passes_analysed sub-line */}
                  <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>
                    {sourceIdx?.minutes_played != null ? `${sourceIdx.minutes_played} min` : ''}
                    {sourcePassesAnalysed != null
                      ? `${sourceIdx?.minutes_played != null ? ' · ' : ''}${sourcePassesAnalysed} passes analysed`
                      : ''}
                  </p>
                  {playerId && (
                    <Link
                      to={`/player/${playerId}`}
                      className="text-xs font-600 hover:text-[--accent] transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      View Profile →
                    </Link>
                  )}
                </div>
              </div>

              {/* Comparison selector */}
              <div>
                <label htmlFor={dropdownId} className="block font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--text-dim)' }}>
                  Select player to compare
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    id={dropdownId}
                    value={selectedIdx}
                    onChange={e => setSelectedIdx(Number(e.target.value))}
                    className="input"
                    style={{ paddingRight: 36, appearance: 'none' }}
                  >
                    {similarList.map((p, i) => (
                      <option key={`${p.player}-${p.team}`} value={i}>{p.player} ({p.team}) — Similarity: N/A</option>
                    ))}
                  </select>
                  <span style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-dim)', fontSize: 13, pointerEvents: 'none',
                  }}>▾</span>
                </div>

                {selectedPlayer && (
                  <div
                    className="mt-3 flex items-center gap-3 px-4 py-3"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14 }}
                  >
                    {getFlagUrl(selectedPlayer.team)
                      ? <img src={getFlagUrl(selectedPlayer.team)!} alt="" className="w-6 object-cover rounded-sm shadow-sm shrink-0" aria-hidden />
                      : <span className="text-xs font-mono font-700 rounded shrink-0" style={{ background: 'var(--surface)', padding: '2px 6px', color: 'var(--text-muted)' }} aria-hidden>{selectedPlayer.team?.substring(0, 3).toUpperCase()}</span>
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

            {/* Stat view toggle + player legend */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
              <StatViewToggle mode={statMode} onChange={setStatMode} />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: C_SOURCE }} />
                  <span className="text-xs font-600" style={{ color: 'var(--text-muted)' }}>{playerName.trim().split(' ').pop()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: C_SIMILAR }} />
                  <span className="text-xs font-600" style={{ color: 'var(--text-muted)' }}>{selectedPlayer?.player.trim().split(' ').pop() ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* 4 dual radar cards */}
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
                  The source player's space control profile is not available. Make sure the SC tables have been imported.
                </p>
              </div>
            )}

            {/* Decision Quality comparison radar */}
            {sourceDQ && compareDQ && (
              <div style={{ marginTop: '24px' }}>
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
          <h2 className="font-display font-900 text-2xl mb-4" style={{ color: 'var(--text)' }}>
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
                  <span className="font-mono font-700 text-xl w-8 text-center" style={{ color: idx < 3 ? 'var(--accent)' : 'var(--text-dim)' }} aria-hidden>
                    {idx + 1}
                  </span>
                  {flagUrl
                    ? <img src={flagUrl} alt="" className="w-8 h-6 object-cover rounded shadow-sm shrink-0" aria-hidden />
                    : <span className="text-xs font-mono font-700 rounded shrink-0" style={{ background: 'var(--surface2)', padding: '4px 8px', color: 'var(--text-muted)' }} aria-hidden>{player.team?.substring(0, 3).toUpperCase()}</span>
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
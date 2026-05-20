import { useState, useRef } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import type { SpaceControlIndex, SpaceControlAggregated } from '../hooks/useSpaceControl';
import { VARIABLE_DESCRIPTIONS } from '../data/glossary';

// ── Stat view mode ────────────────────────────────────────────────────────────

export type StatViewMode = 'raw' | 'per90' | 'percentages';

const MODES: { key: StatViewMode; label: string }[] = [
  { key: 'raw',         label: 'Raw' },
  { key: 'per90',       label: 'Per 90' },
  { key: 'percentages', label: 'Percentages' },
];

export function StatViewToggle({
  mode, onChange,
}: { mode: StatViewMode; onChange: (m: StatViewMode) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Statistic view mode"
      style={{ display: 'inline-flex', gap: '4px', background: 'var(--surface2)', borderRadius: '12px', padding: '4px' }}
    >
      {MODES.map(m => (
        <button
          key={m.key}
          role="tab"
          aria-selected={mode === m.key}
          onClick={() => onChange(m.key)}
          style={{
            padding: '6px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
            fontFamily: 'Barlow, sans-serif', letterSpacing: '0.03em', border: 'none',
            cursor: 'pointer', transition: 'all 0.15s',
            background: mode === m.key ? 'var(--accent)' : 'transparent',
            color: mode === m.key ? '#000' : 'var(--text-muted)',
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ── Radar config ──────────────────────────────────────────────────────────────

const RADAR_DEFS = [
  {
    key: 'PROGRESSION' as const, label: 'Progression',
    idxKey: 'idx__PROGRESSION' as keyof SpaceControlIndex, color: '#39ff14',
    axes: [
      { dataKey: 'pct__lb_geom_per90'                      as keyof SpaceControlIndex, label: 'LB Geom /90' },
      { dataKey: 'pct__lb_quality_per90'                   as keyof SpaceControlIndex, label: 'LB Quality /90' },
      { dataKey: 'pct__lb_epv_per90'                       as keyof SpaceControlIndex, label: 'High Value Pass /90' },
      { dataKey: 'pct__successful_hull_penetrations_per90' as keyof SpaceControlIndex, label: 'Hull Penetr. /90' },
      { dataKey: 'pct__defenders_bypassed_mean'            as keyof SpaceControlIndex, label: 'Def. Bypassed Avg' },
    ],
  },
  {
    key: 'DANGEROUSNESS' as const, label: 'Dangerousness',
    idxKey: 'idx__DANGEROUSNESS' as keyof SpaceControlIndex, color: '#ff4d6a',
    axes: [
      { dataKey: 'pct__epv_added_per90'       as keyof SpaceControlIndex, label: 'EPV Added /90' },
      { dataKey: 'pct__epv_penetration_per90' as keyof SpaceControlIndex, label: 'EPV Penetr. /90' },
      { dataKey: 'pct__epv_inside_circ_per90' as keyof SpaceControlIndex, label: 'Circ. EPV /90' },
    ],
  },
  {
    key: 'RECEPTION' as const, label: 'Reception',
    idxKey: 'idx__RECEPTION' as keyof SpaceControlIndex, color: '#4da6ff',
    axes: [
      { dataKey: 'pct__between_lines_pct'           as keyof SpaceControlIndex, label: 'Between Lines %' },
      { dataKey: 'pct__successful_hull_exits_per90'  as keyof SpaceControlIndex, label: 'Hull Exits /90' },
      { dataKey: 'pct__pressure_resistance_pct'     as keyof SpaceControlIndex, label: 'Press. Resist %' },
    ],
  },
  {
    key: 'GRAVITY' as const, label: 'Gravity',
    idxKey: 'idx__GRAVITY' as keyof SpaceControlIndex, color: '#ffc947',
    axes: [
      { dataKey: 'pct__gravity_proximity_pct' as keyof SpaceControlIndex, label: 'Space Attraction %' },
      { dataKey: 'pct__gravity_hull_pct'      as keyof SpaceControlIndex, label: 'Gravity Hull %' },
      { dataKey: 'pct__gravity_abs_m'         as keyof SpaceControlIndex, label: 'Def. Pull |m|' },
    ],
  },
] as const;

// ── Mother stats ──────────────────────────────────────────────────────────────

type StatDef = { col: keyof SpaceControlAggregated; label: string };
type MotherBlock = { raw: StatDef[]; per90: StatDef[]; percentages: StatDef[] };

const MOTHER_STATS: Record<'PROGRESSION' | 'DANGEROUSNESS' | 'RECEPTION' | 'GRAVITY', MotherBlock> = {
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
      { col: 'epv_added_sum', label: 'EPV Added (sum)' },
      { col: 'epv_penetration_sum', label: 'EPV Penetr. (sum)' },
      { col: 'epv_inside_circ_sum', label: 'Circ. EPV (sum)' },
      { col: 'inside_circ_n', label: 'Inside Circ. (n)' },
    ],
    per90: [
      { col: 'epv_added_per90', label: 'EPV Added /90' },
      { col: 'epv_penetration_per90', label: 'EPV Penetr. /90' },
      { col: 'epv_inside_circ_per90', label: 'Circ. EPV /90' },
      { col: 'inside_circ_per90', label: 'Inside Circ. /90' },
    ],
    percentages: [],
  },
  RECEPTION: {
    raw: [
      { col: 'between_lines_n', label: 'Block Receipts (n)' },
      { col: 'pressure_resistance_n', label: 'Press. Resist (n)' },
    ],
    per90: [
      { col: 'between_lines_per90', label: 'Between Lines /90' },
      { col: 'successful_hull_exits_per90', label: 'Hull Exits /90' },
    ],
    percentages: [
      { col: 'between_lines_pct', label: 'Between Lines %' },
      { col: 'hull_exit_pct', label: 'Hull Exits %' },
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

// ── Radar custom tooltip ──────────────────────────────────────────────────────

function RadarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '10px 14px', fontSize: '12px',
    }}>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: item.color ?? 'var(--text)' }}>
        {item.payload?.stat}
      </p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginTop: '2px' }}>
        Percentile:{' '}
        <span style={{ color: item.color ?? 'var(--text)', fontWeight: 700 }}>
          {typeof item.value === 'number' ? item.value.toFixed(1) : '—'}
        </span>
      </p>
    </div>
  );
}

// ── Number formatter ──────────────────────────────────────────────────────────

function fmt(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') return Math.abs(v) < 10 ? v.toFixed(2) : v.toFixed(1);
  return String(v);
}

// ── Mother stat row with inline "?" tooltip ───────────────────────────────────
// Renders a single Core Stats row: label + optional "Experimental" badge on the
// left, formatted value on the right, and a small "?" button that shows a
// description tooltip on hover.

function MotherStatRow({
  label,
  value,
  color,
  showExperimental,
}: {
  label: string;
  value: string;
  color: string;
  /** When true renders the "Experimental" badge (used for GRAVITY stats) */
  showExperimental?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const description = VARIABLE_DESCRIPTIONS[label] ?? 'No description available.';

  return (
    // Outer row — `position: relative` so the tooltip is anchored here
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {/* Left side: label + badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
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

        {/* Tooltip — shown on hover, positioned above the row */}
        {hovered && (
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              // Sit above the row; shift left so it does not bleed outside the card
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

      {/* Right side: formatted value */}
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 700, fontSize: '13px', color,
        flexShrink: 0,
      } as React.CSSProperties}>
        {value}
      </span>
    </div>
  );
}

// ── Axis tooltip types ────────────────────────────────────────────────────────

interface AxisTooltipState {
  label: string;
  description: string;
  /** Position relative to the card container's top-left corner */
  x: number;
  y: number;
}

// ── Custom PolarAngleAxis tick — hover on label text to show description ───────
// Recharts passes x, y (label centre), cx, cy (chart centre), payload
// (payload.value = axis label string), and textAnchor to custom tick components.
// Hovering the label text fires callbacks so the parent RadarCard can display
// a description tooltip overlay.  No "?" icon is rendered.

interface CustomRadarTickProps {
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
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
  const description = VARIABLE_DESCRIPTIONS[label] ?? 'No description available.';

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
          pointerEvents: 'none',  /* hit area handled by the rect above */
        }}
      >
        {label}
      </text>
    </g>
  );
}

// ── Single radar card ─────────────────────────────────────────────────────────

function RadarCard({
  def, indexRow, aggRow, mode, playerName,
}: {
  def: typeof RADAR_DEFS[number];
  indexRow: SpaceControlIndex;
  aggRow: SpaceControlAggregated | null | undefined;
  mode: StatViewMode;
  playerName: string;
}) {
  const idxValue = indexRow[def.idxKey] as number | undefined;
  const lastName = playerName.trim().split(' ').pop() || playerName;

  const radarData = def.axes.map(ax => ({
    stat: ax.label,
    value: (indexRow[ax.dataKey] as number) ?? 0,
  }));

  const block    = MOTHER_STATS[def.key];
  const statList = block[mode] as StatDef[];

  // Tooltip state — coordinates are relative to the card container
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
    setAxisTooltip({
      label,
      description,
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  const handleAxisLeave = () => setAxisTooltip(null);

  // Build tick renderer once so it is stable across renders
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
      ? `${def.label} has no per-90 statistics in the spec`
      : `${def.label} has no percentage statistics in the spec`;

  if (def.key === 'DANGEROUSNESS' && mode === 'percentages') {
    emptyMessage =
      'The Dangerousness index does not include percentage statistics because it is based on EPV (Expected Pass Value) and absolute penetration volumes. Being a probabilistic measure that calculates the net offensive "weight" generated by a player, it is evaluated exclusively in absolute values (Raw) or scaled to playing time (Per 90).';
  } else if (def.key === 'GRAVITY' && mode === 'per90') {
    emptyMessage =
      "Gravity statistics are not calculated 'Per 90' because they measure the reaction and spatial deformation of the opposing defense (in meters or percentage deviations). Since it represents an average effect calculated every time the player has the ball, it reflects a constant 'magnetic pull' rather than a cumulative volume of actions over time.";
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',       /* required for the axis tooltip overlay */
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${def.color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: def.color }}>
          {def.label}
        </span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Index</div>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: '26px', lineHeight: 1, color: def.color }}>
            {idxValue != null ? idxValue.toFixed(1) : '—'}
          </div>
        </div>
      </div>

      {/* Radar — percentile axes 0–100; hover "?" shows description */}
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="stat"
            tick={renderTick}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip content={<RadarTooltip />} />
          <Radar
            name={lastName}
            dataKey="value"
            stroke={def.color} fill={def.color} fillOpacity={0.2} strokeWidth={2}
            dot={{ fill: def.color, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: def.color, stroke: '#000', strokeWidth: 1.5 }}
          />
          <Legend
            formatter={() => <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Percentile rank (0–100)</span>}
            wrapperStyle={{ paddingTop: 6 }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Axis variable description tooltip overlay */}
      {axisTooltip && (
        <div
          role="tooltip"
          aria-live="polite"
          style={{
            position: 'absolute',
            left: Math.min(axisTooltip.x + 12, 260),   /* clamp so it stays inside card */
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
            fontSize: '10px',
            fontWeight: 700,
            color: def.color,
            marginBottom: '6px',
            letterSpacing: '0.04em',
          }}>
            {axisTooltip.label}
          </p>
          <p style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            lineHeight: 1.55,
          }}>
            {axisTooltip.description}
          </p>
        </div>
      )}

      {/* Mother stats card */}
      <div style={{ marginTop: '16px', background: 'var(--surface2)', borderRadius: '12px', padding: '16px' }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '12px' }}>
          Core stats
        </p>

        {statList.length === 0 ? (
          <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {emptyMessage}
            </p>
          </div>
        ) : aggRow == null ? (
          <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Aggregated data not available</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {statList.map(s => (
              <MotherStatRow
                key={s.col}
                label={s.label}
                value={fmt(aggRow[s.col])}
                color={def.color}
                showExperimental={def.key === 'GRAVITY'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Exported section ──────────────────────────────────────────────────────────

export default function SpaceControlSection({
  playerName, teamName, indexRow, aggRow, mode, onModeChange,
}: {
  playerName: string;
  teamName?: string;
  indexRow: SpaceControlIndex;
  aggRow: SpaceControlAggregated | null | undefined;
  mode: StatViewMode;
  onModeChange: (m: StatViewMode) => void;
}) {
  return (
    <section style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 24px 48px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: '20px', color: 'var(--text)', marginBottom: '4px' }}>
            Space Control &amp; Value
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Contextual passing metrics — {playerName}{teamName ? ` · ${teamName}` : ''}
          </p>
        </div>
        <StatViewToggle mode={mode} onChange={onModeChange} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {RADAR_DEFS.map(def => (
          <RadarCard
            key={def.key}
            def={def}
            indexRow={indexRow}
            aggRow={aggRow}
            mode={mode}
            playerName={playerName}
          />
        ))}
      </div>
    </section>
  );
}

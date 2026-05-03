import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import type { SpaceControlIndex, SpaceControlAggregated } from '../hooks/useSpaceControl';

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
      { dataKey: 'pct__lb_epv_per90'                       as keyof SpaceControlIndex, label: 'LB EPV /90' },
      { dataKey: 'pct__successful_hull_penetrations_per90' as keyof SpaceControlIndex, label: 'Hull Penetr. /90' },
      { dataKey: 'pct__defenders_bypassed_mean'            as keyof SpaceControlIndex, label: 'Def. Bypassed' },
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
      { dataKey: 'pct__between_lines_pct'          as keyof SpaceControlIndex, label: 'Between Lines %' },
      { dataKey: 'pct__successful_hull_exits_per90' as keyof SpaceControlIndex, label: 'Hull Exits /90' },
      { dataKey: 'pct__pressure_resistance_pct'    as keyof SpaceControlIndex, label: 'Press. Resist %' },
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

// ── Mother stats — one entry per [dimension × mode] ───────────────────────────
// Empty array = no stats defined for that combination (correct per spec)

type StatDef = { col: keyof SpaceControlAggregated; label: string };
type MotherBlock = { raw: StatDef[]; per90: StatDef[]; percentages: StatDef[] };

const MOTHER_STATS: Record<'PROGRESSION' | 'DANGEROUSNESS' | 'RECEPTION' | 'GRAVITY', MotherBlock> = {
  PROGRESSION: {
    raw: [
      { col: 'lb_geom',               label: 'LB Geom' },
      { col: 'lb_quality',            label: 'LB Quality' },
      { col: 'lb_epv',                label: 'LB EPV' },
      { col: 'hull_penetration_n',    label: 'Hull Penetr.' },
      { col: 'defenders_bypassed_mean', label: 'Def. Bypassed (avg)' },
    ],
    per90: [
      { col: 'lb_geom_per90',                     label: 'LB Geom /90' },
      { col: 'lb_quality_per90',                   label: 'LB Quality /90' },
      { col: 'lb_epv_per90',                       label: 'LB EPV /90' },
      { col: 'successful_hull_penetrations_per90', label: 'Hull Penetr. /90' },
    ],
    percentages: [
      { col: 'lb_geom_pct',          label: 'LB Geom %' },
      { col: 'lb_quality_pct',       label: 'LB Quality %' },
      { col: 'lb_epv_pct',           label: 'LB EPV %' },
      { col: 'hull_penetration_pct', label: 'Hull Penetr. %' },
    ],
  },

  DANGEROUSNESS: {
    raw: [
      { col: 'epv_added_sum',        label: 'EPV Added (sum)' },
      { col: 'epv_added_mean',       label: 'EPV Added (avg)' },
      { col: 'epv_penetration_sum',  label: 'EPV Penetr. (sum)' },
      { col: 'epv_penetration_mean', label: 'EPV Penetr. (avg)' },
      { col: 'epv_inside_circ_sum',  label: 'Circ. EPV (sum)' },
      { col: 'epv_inside_circ_mean', label: 'Circ. EPV (avg)' },
      { col: 'penetration_n',        label: 'Penetrations (n)' },
      { col: 'inside_circ_n',        label: 'Inside Circ. (n)' },
    ],
    per90: [
      { col: 'epv_added_per90',       label: 'EPV Added /90' },
      { col: 'epv_penetration_per90', label: 'EPV Penetr. /90' },
      { col: 'epv_inside_circ_per90', label: 'Circ. EPV /90' },
      { col: 'penetration_per90',     label: 'Penetr. /90' },
      { col: 'inside_circ_per90',     label: 'Inside Circ. /90' },
    ],
    // Dangerousness has only absolute and per-90 values — no percentage stats in the spec
    percentages: [],
  },

  RECEPTION: {
    raw: [
      { col: 'between_lines_n',       label: 'Between Lines (n)' },
      { col: 'hull_exit_n',           label: 'Hull Exits (n)' },
      { col: 'pressure_resistance_n', label: 'Press. Resist (n)' },
    ],
    per90: [
      { col: 'between_lines_per90',        label: 'Between Lines /90' },
      { col: 'successful_hull_exits_per90', label: 'Hull Exits /90' },
    ],
    percentages: [
      { col: 'between_lines_pct',       label: 'Between Lines %' },
      { col: 'hull_exit_pct',           label: 'Hull Exits %' },
      { col: 'pressure_resistance_pct', label: 'Press. Resist %' },
    ],
  },

  GRAVITY: {
    raw: [
      { col: 'gravity_n',             label: 'Gravity (n)' },
      { col: 'gravity_directional_n', label: 'Gravity Dir. (n)' },
      { col: 'gravity_directional_m', label: 'Def. Pull (m)' },
    ],
    // Gravity has no per-90 stats in the spec
    per90: [],
    percentages: [
      { col: 'gravity_proximity_pct',  label: 'Space Attraction %' },
      { col: 'gravity_hull_pct',       label: 'Gravity Hull %' },
      { col: 'gravity_composite_pct',  label: 'Gravity Composite %' },
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
        Percentile: <span style={{ color: item.color ?? 'var(--text)', fontWeight: 700 }}>
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

// ── Single radar card ─────────────────────────────────────────────────────────

function RadarCard({
  def, indexRow, aggRow, mode,
}: {
  def: typeof RADAR_DEFS[number];
  indexRow: SpaceControlIndex;
  aggRow: SpaceControlAggregated | null | undefined;
  mode: StatViewMode;
}) {
  const idxValue = indexRow[def.idxKey] as number | undefined;

  const radarData = def.axes.map(ax => ({
    stat: ax.label,
    value: (indexRow[ax.dataKey] as number) ?? 0,
  }));

  const block = MOTHER_STATS[def.key];
  const statList: StatDef[] = block[mode];

  // Human-readable explanation for empty stat sets
  const emptyNote: Record<string, string> = {
    per90:       `${def.label} has no per-90 statistics in the spec`,
    percentages: `${def.label} has no percentage statistics in the spec`,
  };

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: `3px solid ${def.color}`, borderRadius: 'var(--radius-lg)', padding: '24px',
    }}>
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

      {/* Radar — always on pct__ (percentile 0–100); tooltip on hover */}
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="stat"
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Barlow', fontWeight: 600 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip content={<RadarTooltip />} />
          <Radar
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

      {/* Mother stats card */}
      <div style={{ marginTop: '16px', background: 'var(--surface2)', borderRadius: '12px', padding: '16px' }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '12px' }}>
          Core stats
        </p>

        {statList.length === 0 ? (
          // Empty is intentional per spec — show a tasteful note instead of an error
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
            {emptyNote[mode] ?? '—'}
          </p>
        ) : aggRow == null ? (
          <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Aggregated data not available</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {statList.map(s => (
              <div key={s.col} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '13px', color: def.color } as React.CSSProperties}>
                  {fmt(aggRow[s.col])}
                </span>
              </div>
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
  playerName: string; teamName?: string;
  indexRow: SpaceControlIndex; aggRow: SpaceControlAggregated | null | undefined;
  mode: StatViewMode; onModeChange: (m: StatViewMode) => void;
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
          <RadarCard key={def.key} def={def} indexRow={indexRow} aggRow={aggRow} mode={mode} />
        ))}
      </div>
    </section>
  );
}

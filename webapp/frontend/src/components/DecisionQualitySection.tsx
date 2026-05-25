import { useState, useRef } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import type { DecisionQualityRow } from '../hooks/useDecisionQuality';
import { TOOLTIP_DESCRIPTIONS } from '../data/tooltip';
import { StatViewToggle, type StatViewMode } from './SpaceControlSection';

// ── Constants ─────────────────────────────────────────────────────────────────

const DQ_COLOR = '#7c3aed';

// ── Radar axes ────────────────────────────────────────────────────────────────

const RADAR_AXES: { dataKey: keyof DecisionQualityRow; label: string }[] = [
  { dataKey: 'pct__accuracy',    label: 'Picks the best %' },
  { dataKey: 'pct__worst_choice', label: 'Avoids the worst %' },
  { dataKey: 'pct__elite_per90',  label: 'Elite reads / 90' },
  { dataKey: 'pct__poor_per90',   label: 'Avoids poor / 90' },
];

// ── Core stat definitions per tab ─────────────────────────────────────────────

type StatDef = { col: keyof DecisionQualityRow; label: string };

const CORE_STATS: Record<StatViewMode, StatDef[]> = {
  raw: [
    { col: 'score',        label: 'Score' },
    { col: 'score_sd',     label: 'Score SD' },
    { col: 'avg_miss_cost', label: 'Avg miss cost' },
    { col: 'value_impact', label: 'Value Impact' },
  ],
  per90: [
    { col: 'elite_per90', label: 'Elite reads / 90' },
    { col: 'poor_per90',  label: 'Poor reads / 90' },
  ],
  percentages: [
    { col: 'accuracy_pct',     label: 'Picks the best %' },
    { col: 'worst_choice_pct', label: 'Worst choice %' },
  ],
};

// ── Custom radar tooltip ──────────────────────────────────────────────────────

function RadarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] px-3.5 py-2.5 text-xs shadow-lg">
      <p className="font-mono font-bold" style={{ color: DQ_COLOR }}>
        {item.payload?.stat}
      </p>
      <p className="font-mono text-[var(--text-muted)] mt-0.5">
        Percentile:{' '}
        <span className="font-bold" style={{ color: DQ_COLOR }}>
          {typeof item.value === 'number' ? item.value.toFixed(1) : '—'}
        </span>
      </p>
    </div>
  );
}

// ── Number formatter ──────────────────────────────────────────────────────────

function fmt(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') return v.toFixed(2);
  return String(v);
}

// ── Stat row with inline "?" tooltip ─────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  const [hovered, setHovered] = useState(false);
  const description = TOOLTIP_DESCRIPTIONS[label] ?? 'No description available.';

  return (
    <div className="relative flex justify-between items-center gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          {label}
        </span>
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
            className="absolute bottom-[calc(100%+8px)] left-0 max-w-[240px] bg-[var(--surface)] rounded-[10px] px-3.5 py-2.5 z-[60] pointer-events-none"
            style={{ border: `1px solid ${DQ_COLOR}33`, borderLeft: `3px solid ${DQ_COLOR}`, boxShadow: 'var(--shadow-lg)' }}
          >
            <p className="font-mono text-[10px] font-bold mb-1.5 tracking-wide" style={{ color: DQ_COLOR }}>
              {label}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] leading-[1.55]">
              {description}
            </p>
          </div>
        )}
      </div>
      <span className="font-mono text-[13px] font-bold text-[var(--text)] shrink-0">
        {value}
      </span>
    </div>
  );
}

// ── Custom radar axis tick with hover tooltip ─────────────────────────────────

function CustomRadarTick(props: any) {
  const { x, y, payload, onHover, onLeave } = props;
  const label = payload.value as string;
  const description = TOOLTIP_DESCRIPTIONS[label] ?? 'No description available.';

  return (
    <text
      x={x} y={y}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600, fill: 'var(--text-muted)', cursor: 'help' }}
      onMouseEnter={e => onHover(label, description, e.clientX, e.clientY)}
      onMouseLeave={onLeave}
    >
      {label}
    </text>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

export interface DQCardProps {
  /** The full name of the player (for aria labels and legend) */
  playerName: string;
  teamName?: string;
  row: DecisionQualityRow;
  mode: StatViewMode;
  onModeChange: (m: StatViewMode) => void;
}

export default function DecisionQualitySection({
  playerName, teamName, row, mode, onModeChange,
}: DQCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [axisTooltip, setAxisTooltip] = useState<{
    label: string; description: string; x: number; y: number;
  } | null>(null);

  const lastName = playerName.split(' ').at(-1) ?? playerName;

  // Build radar data
  const radarData = RADAR_AXES.map(ax => ({
    stat: ax.label,
    value: (row[ax.dataKey] as number) ?? 0,
  }));

  const statList = CORE_STATS[mode];

  const handleAxisHover = (label: string, description: string, clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setAxisTooltip({ label, description, x: clientX - rect.left, y: clientY - rect.top });
  };

  const renderTick = (props: any) => (
    <CustomRadarTick {...props} onHover={handleAxisHover} onLeave={() => setAxisTooltip(null)} />
  );

  return (
    <section className="max-w-7xl mx-auto px-6 pb-12">

      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display font-black text-xl text-[var(--text)] mb-1">
            Decision Quality
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Contextual decision-making metrics — {playerName}{teamName ? ` · ${teamName}` : ''}
          </p>
        </div>
        <StatViewToggle mode={mode} onChange={onModeChange} />
      </div>

      {/* Single card */}
      <div
        ref={containerRef}
        className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-[560px] shadow-[var(--shadow)]"
        style={{ borderTop: `3px solid ${DQ_COLOR}` }}
      >
        {/* Card header: label left, headline index right */}
        <div className="flex justify-between items-start mb-2">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase font-bold" style={{ color: DQ_COLOR }}>
            Decision Quality
          </span>
          {/* Headline + companion */}
          <div className="text-right">
            <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--text-dim)]">Index</div>
            <div className="font-display font-black text-[26px] leading-none" style={{ color: DQ_COLOR }}>
              {row.DQ_index != null ? row.DQ_index.toFixed(1) : '—'}
            </div>
          </div>
        </div>

        {/* Radar — percentile axes 0–100 */}
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="rgba(0,0,0,0.08)" />
            <PolarAngleAxis dataKey="stat" tick={renderTick} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip content={<RadarTooltip />} />
            <Radar
              name={lastName}
              dataKey="value"
              stroke={DQ_COLOR} fill={DQ_COLOR} fillOpacity={0.15} strokeWidth={2}
              dot={{ fill: DQ_COLOR, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: DQ_COLOR, stroke: '#fff', strokeWidth: 1.5 }}
            />
            <Legend
              formatter={() => <span className="text-[var(--text-muted)] text-[11px]">Percentile rank (0–100)</span>}
              wrapperStyle={{ paddingTop: 6 }}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Axis tooltip overlay */}
        {axisTooltip && (
          <div
            role="tooltip"
            aria-live="polite"
            className="absolute max-w-[220px] bg-[var(--surface)] rounded-[10px] px-3.5 py-2.5 pointer-events-none z-50"
            style={{
              left: Math.min(axisTooltip.x + 12, 280),
              top: axisTooltip.y - 6,
              border: `1px solid ${DQ_COLOR}33`,
              borderLeft: `3px solid ${DQ_COLOR}`,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <p className="font-mono text-[10px] font-bold mb-1.5 tracking-wide" style={{ color: DQ_COLOR }}>
              {axisTooltip.label}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] leading-[1.55]">
              {axisTooltip.description}
            </p>
          </div>
        )}

        {/* Core stats card */}
        <div className="mt-4 bg-[var(--surface2)] rounded-xl p-4">
          <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-3">
            Core stats
          </p>
          {statList.length === 0 ? (
            <div className="bg-[var(--bg)] p-3 rounded-md border border-[var(--border)]">
              <p className="text-[11px] text-[var(--text-muted)] leading-[1.5]">
                No {mode} statistics in this tab.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {statList.map(s => {
                const raw = row[s.col];
                const val = s.col === 'value_impact' && typeof raw === 'number' ? raw * 100 : raw;
                return <StatRow key={s.col} label={s.label} value={fmt(val)} />;
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Dual stat row (source vs compare) ────────────────────────────────────────

const C_SOURCE  = '#16a34a';
const C_COMPARE = '#2563eb';

function DualStatRow({
  label,
  srcVal,
  cmpVal,
}: {
  label: string;
  srcVal: unknown;
  cmpVal: unknown;
}) {
  const [hovered, setHovered] = useState(false);
  const description = TOOLTIP_DESCRIPTIONS[label] ?? 'No description available.';

  const sv = typeof srcVal === 'number' ? srcVal : null;
  const cv = typeof cmpVal === 'number' ? cmpVal : null;
  const diff = sv != null && cv != null ? cv - sv : null;
  const better = diff != null && diff > 0;
  const worse  = diff != null && diff < 0;

  return (
    <div className="relative grid gap-2 items-center" style={{ gridTemplateColumns: '1fr auto auto' }}>
      {/* Label + ? tooltip */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11px] font-semibold text-[var(--text-muted)]">
          {label}
        </span>
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
        >?</button>
        {hovered && (
          <div role="tooltip" className="absolute bottom-[calc(100%+8px)] left-0 max-w-[240px] bg-[var(--surface)] rounded-[10px] px-3.5 py-2.5 z-[60] pointer-events-none"
            style={{ border: `1px solid ${DQ_COLOR}33`, borderLeft: `3px solid ${DQ_COLOR}`, boxShadow: 'var(--shadow-lg)' }}
          >
            <p className="font-mono text-[10px] font-bold mb-1.5 tracking-wide" style={{ color: DQ_COLOR }}>
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
        {fmt(srcVal)}
      </span>

      {/* Compare value with ▲▼ */}
      <span className="font-mono text-xs font-bold text-right min-w-[52px]"
        style={{ color: better ? 'var(--win)' : worse ? 'var(--lose)' : C_COMPARE }}
      >
        {fmt(cmpVal)}
        {diff != null && diff !== 0 && (
          <span className="text-[9px] ml-0.5 opacity-80">
            {better ? '▲' : '▼'}
          </span>
        )}
      </span>
    </div>
  );
}

// ── DQ radar card for SimilarPlayers — radar + stats madre ────────────────────

export function DQCompareRadar({
  sourceRow,
  compareRow,
  sourceName,
  compareName,
}: {
  sourceRow: DecisionQualityRow;
  compareRow: DecisionQualityRow;
  sourceName: string;
  compareName: string;
}) {
  const [mode, setMode] = useState<StatViewMode>('raw');

  const sName = sourceName.trim().split(' ').pop() ?? sourceName;
  const cName = compareName.trim().split(' ').pop() ?? compareName;

  const radarData = RADAR_AXES.map(ax => ({
    stat: ax.label,
    [sName]: (sourceRow[ax.dataKey] as number) ?? 0,
    [cName]: (compareRow[ax.dataKey] as number) ?? 0,
  }));

  const statList = CORE_STATS[mode];

  return (
    <div
      className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow)]"
      style={{ borderTop: `3px solid ${DQ_COLOR}` }}
    >

      {/* Header: label + DQ indices */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase font-bold" style={{ color: DQ_COLOR }}>
          Decision Quality
        </span>
        <div className="flex gap-3 items-baseline">
          <span className="font-mono text-lg font-black" style={{ color: C_SOURCE }}>
            {sourceRow.DQ_index?.toFixed(1) ?? '—'}
          </span>
          <span className="font-mono text-xs text-[var(--text-dim)]">vs</span>
          <span className="font-mono text-lg font-black" style={{ color: C_COMPARE }}>
            {compareRow.DQ_index?.toFixed(1) ?? '—'}
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--text-dim)]">
            Index
          </span>
        </div>
      </div>

      {/* Dual radar */}
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData} margin={{ top: 8, right: 30, bottom: 8, left: 30 }}>
          <PolarGrid stroke="rgba(0,0,0,0.06)" />
          <PolarAngleAxis dataKey="stat" tick={{ fontSize: 9, fontFamily: 'Inter, sans-serif', fill: 'var(--text-muted)', fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip />
          <Radar name={sName} dataKey={sName}
            stroke={C_SOURCE} fill={C_SOURCE} fillOpacity={0.12} strokeWidth={2}
            dot={{ fill: C_SOURCE, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: C_SOURCE, stroke: '#fff', strokeWidth: 1.5 }}
          />
          <Radar name={cName} dataKey={cName}
            stroke={C_COMPARE} fill={C_COMPARE} fillOpacity={0.12} strokeWidth={2}
            dot={{ fill: C_COMPARE, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: C_COMPARE, stroke: '#fff', strokeWidth: 1.5 }}
          />
          <Legend
            formatter={(v: string) => (
              <span className="text-[10px] font-display" style={{ color: v === sName ? C_SOURCE : C_COMPARE }}>{v}</span>
            )}
            wrapperStyle={{ paddingTop: 4 }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Core stats comparison */}
      <div className="mt-3 bg-[var(--surface2)] rounded-[10px] p-3">

        {/* Tab toggle */}
        <div className="flex justify-between items-center mb-2.5">
          <p className="font-mono text-[8px] tracking-[0.1em] uppercase text-[var(--text-dim)]">
            Core Stats
          </p>
          <StatViewToggle mode={mode} onChange={setMode} />
        </div>

        {/* Column headers */}
        <div className="grid gap-2 pb-1.5 mb-1.5 border-b border-[var(--border)]" style={{ gridTemplateColumns: '1fr auto auto' }}>
          <span className="font-mono text-[9px] text-[var(--text-dim)] uppercase">Stat</span>
          <span className="font-mono text-[9px] uppercase text-right min-w-[52px]" style={{ color: C_SOURCE }}>{sName}</span>
          <span className="font-mono text-[9px] uppercase text-right min-w-[52px]" style={{ color: C_COMPARE }}>{cName}</span>
        </div>

        {statList.length === 0 ? (
          <p className="text-[11px] text-[var(--text-muted)]">No {mode} stats for Decision Quality.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {statList.map(s => {
              const scale = s.col === 'value_impact' ? 100 : 1;
              const sv = sourceRow[s.col];
              const cv = compareRow[s.col];
              return (
                <DualStatRow
                  key={s.col}
                  label={s.label}
                  srcVal={typeof sv === 'number' ? sv * scale : sv}
                  cmpVal={typeof cv === 'number' ? cv * scale : cv}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
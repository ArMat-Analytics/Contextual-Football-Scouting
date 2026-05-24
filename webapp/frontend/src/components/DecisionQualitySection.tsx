import { useState, useRef } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import type { DecisionQualityRow } from '../hooks/useDecisionQuality';
import { TOOLTIP_DESCRIPTIONS } from '../data/tooltip';
import { StatViewToggle, type StatViewMode } from './SpaceControlSection';

// ── Constants ─────────────────────────────────────────────────────────────────

const DQ_COLOR = '#c084fc';

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
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '10px 14px', fontSize: '12px',
    }}>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: DQ_COLOR }}>
        {item.payload?.stat}
      </p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginTop: '2px' }}>
        Percentile:{' '}
        <span style={{ color: DQ_COLOR, fontWeight: 700 }}>
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
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
          {label}
        </span>
        <button
          aria-label={`Description for ${label}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            flexShrink: 0,
            width: '15px', height: '15px', borderRadius: '50%',
            border: `1px solid ${hovered ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)'}`,
            background: hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
            color: hovered ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)',
            fontSize: '8px', fontWeight: 700, fontFamily: 'Barlow, sans-serif',
            cursor: 'help', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.12s', padding: 0, lineHeight: 1,
          }}
        >
          ?
        </button>
        {hovered && (
          <div
            role="tooltip"
            style={{
              position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
              maxWidth: '240px', background: 'var(--surface)',
              border: `1px solid ${DQ_COLOR}44`, borderLeft: `3px solid ${DQ_COLOR}`,
              borderRadius: '10px', padding: '10px 14px', zIndex: 60,
              pointerEvents: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            }}
          >
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: DQ_COLOR, marginBottom: '6px', letterSpacing: '0.04em' }}>
              {label}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              {description}
            </p>
          </div>
        )}
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
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
      style={{ fontSize: 10, fontFamily: 'Barlow, sans-serif', fontWeight: 600, fill: 'var(--text-muted)', cursor: 'help' }}
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
    <section style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 24px 48px' }}>

      {/* Section header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: '20px', color: 'var(--text)', marginBottom: '4px' }}>
            Decision Quality
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Contextual decision-making metrics — {playerName}{teamName ? ` · ${teamName}` : ''}
          </p>
        </div>
        <StatViewToggle mode={mode} onChange={onModeChange} />
      </div>

      {/* Single card */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderTop: `3px solid ${DQ_COLOR}`,
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          maxWidth: '560px',
        }}
      >
        {/* Card header: label left, headline index right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: DQ_COLOR }}>
            Decision Quality
          </span>
          {/* Headline + companion */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>DQ Index</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: '26px', lineHeight: 1, color: DQ_COLOR }}>
              {row.DQ_index != null ? row.DQ_index.toFixed(1) : '—'}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Value Impact
            </div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--text-muted)' }}>
              {row.value_impact != null ? (row.value_impact * 100).toFixed(1) : '—'}
            </div>
          </div>
        </div>

        {/* Identity pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {[
            row.macro_role,
            row.primary_role,
            row.minutes_played != null ? `${Math.round(row.minutes_played)}' played` : null,
            row.n_decisions != null ? `n=${row.n_decisions}` : null,
          ].filter(Boolean).map(v => (
            <span key={v} style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: `${DQ_COLOR}18`, color: DQ_COLOR,
              padding: '3px 8px', borderRadius: '6px',
            }}>
              {v}
            </span>
          ))}
        </div>

        {/* Radar — percentile axes 0–100 */}
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey="stat" tick={renderTick} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip content={<RadarTooltip />} />
            <Radar
              name={lastName}
              dataKey="value"
              stroke={DQ_COLOR} fill={DQ_COLOR} fillOpacity={0.2} strokeWidth={2}
              dot={{ fill: DQ_COLOR, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: DQ_COLOR, stroke: '#000', strokeWidth: 1.5 }}
            />
            <Legend
              formatter={() => <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Percentile rank (0–100)</span>}
              wrapperStyle={{ paddingTop: 6 }}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Axis tooltip overlay */}
        {axisTooltip && (
          <div
            role="tooltip"
            aria-live="polite"
            style={{
              position: 'absolute',
              left: Math.min(axisTooltip.x + 12, 280),
              top: axisTooltip.y - 6,
              maxWidth: '220px',
              background: 'var(--surface2)',
              border: `1px solid ${DQ_COLOR}44`,
              borderLeft: `3px solid ${DQ_COLOR}`,
              borderRadius: '10px', padding: '10px 14px',
              pointerEvents: 'none', zIndex: 50,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: DQ_COLOR, marginBottom: '6px', letterSpacing: '0.04em' }}>
              {axisTooltip.label}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              {axisTooltip.description}
            </p>
          </div>
        )}

        {/* Core stats card */}
        <div style={{ marginTop: '16px', background: 'var(--surface2)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '12px' }}>
            Core stats
          </p>
          {statList.length === 0 ? (
            <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                No {mode} statistics in this tab.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

const C_SOURCE  = '#39ff14';
const C_COMPARE = '#4da6ff';

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
    <div style={{
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: '1fr auto auto',
      gap: 8,
      alignItems: 'center',
    }}>
      {/* Label + ? tooltip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
          {label}
        </span>
        <button
          aria-label={`Description for ${label}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            flexShrink: 0, width: '15px', height: '15px', borderRadius: '50%',
            border: `1px solid ${hovered ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)'}`,
            background: hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
            color: hovered ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)',
            fontSize: '8px', fontWeight: 700, fontFamily: 'Barlow, sans-serif',
            cursor: 'help', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.12s', padding: 0, lineHeight: 1,
          }}
        >?</button>
        {hovered && (
          <div role="tooltip" style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
            maxWidth: '240px', background: 'var(--surface)',
            border: `1px solid ${DQ_COLOR}44`, borderLeft: `3px solid ${DQ_COLOR}`,
            borderRadius: '10px', padding: '10px 14px', zIndex: 60,
            pointerEvents: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: DQ_COLOR, marginBottom: '6px', letterSpacing: '0.04em' }}>
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
        {fmt(srcVal)}
      </span>

      {/* Compare value with ▲▼ */}
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
        textAlign: 'right', minWidth: 52,
        color: better ? 'var(--win, #39ff14)' : worse ? 'var(--lose, #ff4d6a)' : C_COMPARE,
      }}>
        {fmt(cmpVal)}
        {diff != null && diff !== 0 && (
          <span style={{ fontSize: 9, marginLeft: 2, opacity: 0.8 }}>
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
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: `3px solid ${DQ_COLOR}`, borderRadius: 'var(--radius-lg)', padding: '20px',
    }}>

      {/* Header: label + DQ indices */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: DQ_COLOR }}>
          Decision Quality
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 900, color: C_SOURCE }}>
            {sourceRow.DQ_index?.toFixed(1) ?? '—'}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-dim)' }}>vs</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 900, color: C_COMPARE }}>
            {compareRow.DQ_index?.toFixed(1) ?? '—'}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>
            DQ Index
          </span>
        </div>
      </div>

      {/* Dual radar */}
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData} margin={{ top: 8, right: 30, bottom: 8, left: 30 }}>
          <PolarGrid stroke="rgba(255,255,255,0.07)" />
          <PolarAngleAxis dataKey="stat" tick={{ fontSize: 9, fontFamily: 'Barlow, sans-serif', fill: 'var(--text-muted)', fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip />
          <Radar name={sName} dataKey={sName}
            stroke={C_SOURCE} fill={C_SOURCE} fillOpacity={0.15} strokeWidth={2}
            dot={{ fill: C_SOURCE, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: C_SOURCE, stroke: '#000', strokeWidth: 1.5 }}
          />
          <Radar name={cName} dataKey={cName}
            stroke={C_COMPARE} fill={C_COMPARE} fillOpacity={0.15} strokeWidth={2}
            dot={{ fill: C_COMPARE, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: C_COMPARE, stroke: '#000', strokeWidth: 1.5 }}
          />
          <Legend
            formatter={(v: string) => (
              <span style={{ color: v === sName ? C_SOURCE : C_COMPARE, fontSize: 10, fontFamily: 'Barlow, sans-serif' }}>{v}</span>
            )}
            wrapperStyle={{ paddingTop: 4 }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Core stats comparison */}
      <div style={{ marginTop: '12px', background: 'var(--surface2)', borderRadius: '10px', padding: '12px 14px' }}>

        {/* Tab toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
            Core Stats
          </p>
          <StatViewToggle mode={mode} onChange={setMode} />
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, paddingBottom: 6, marginBottom: 6, borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Stat</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: C_SOURCE, textTransform: 'uppercase', textAlign: 'right', minWidth: 52 }}>{sName}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: C_COMPARE, textTransform: 'uppercase', textAlign: 'right', minWidth: 52 }}>{cName}</span>
        </div>

        {statList.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No {mode} stats for Decision Quality.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
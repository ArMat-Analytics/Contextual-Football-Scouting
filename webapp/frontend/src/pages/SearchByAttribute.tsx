import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFlagUrl } from '../utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── Constants ─────────────────────────────────────────────────────────────────

const MACRO_ROLES = ['CB', 'FB', 'MID', 'CAM', 'WIDE', 'FW'] as const;

const PRIMARY_ROLES = [
  'Center Back', 'Left Center Back', 'Right Center Back',
  'Left Back', 'Right Back', 'Left Wing Back', 'Right Wing Back',
  'Center Defensive Midfield', 'Left Defensive Midfield', 'Right Defensive Midfield',
  'Left Center Midfield', 'Right Center Midfield', 'Left Midfield', 'Right Midfield',
  'Center Attacking Midfield', 'Left Attacking Midfield', 'Right Attacking Midfield',
  'Left Wing', 'Right Wing',
  'Center Forward', 'Left Center Forward', 'Right Center Forward',
] as const;

// macro_role → primary_roles that belong to it (for progressive filtering)
const ROLE_TO_MACRO: Record<string, string> = {
  'Center Back': 'CB', 'Left Center Back': 'CB', 'Right Center Back': 'CB',
  'Left Back': 'FB', 'Right Back': 'FB', 'Left Wing Back': 'FB', 'Right Wing Back': 'FB',
  'Center Defensive Midfield': 'MID', 'Left Defensive Midfield': 'MID', 'Right Defensive Midfield': 'MID',
  'Left Center Midfield': 'MID', 'Right Center Midfield': 'MID', 'Left Midfield': 'MID', 'Right Midfield': 'MID',
  'Center Attacking Midfield': 'CAM', 'Left Attacking Midfield': 'CAM', 'Right Attacking Midfield': 'CAM',
  'Left Wing': 'WIDE', 'Right Wing': 'WIDE',
  'Center Forward': 'FW', 'Left Center Forward': 'FW', 'Right Center Forward': 'FW',
};

const MACRO_COLOR: Record<string, string> = {
  CB: '#4da6ff', FB: '#39ff14', MID: '#ffc947',
  CAM: '#ff9f1c', WIDE: '#ff4d6a', FW: '#c084fc',
};

const INDICES = [
  { key: 'idx__PROGRESSION',   label: 'Progression',   color: '#39ff14',  short: 'PROG' },
  { key: 'idx__DANGEROUSNESS', label: 'Dangerousness', color: '#ff4d6a',  short: 'DNGR' },
  { key: 'idx__RECEPTION',     label: 'Reception',     color: '#4da6ff',  short: 'RECEP' },
  { key: 'idx__GRAVITY',       label: 'Gravity',       color: '#ffc947',  short: 'GRAV' },
] as const;

type IndexKey = typeof INDICES[number]['key'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface IndexRange { min: string; max: string; }

interface Filters {
  macroRole: string;
  role: string;
  ranges: Record<IndexKey, IndexRange>;
}

interface PlayerRow {
  player: string;
  player_id?: number;
  team: string;
  primary_role: string;
  macro_role: string;
  minutes_played: number;
  idx__PROGRESSION: number;
  idx__DANGEROUSNESS: number;
  idx__RECEPTION: number;
  idx__GRAVITY: number;
}

// ── Shared UI Components ──────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <svg className="w-3 h-3 inline ml-1 opacity-30" aria-hidden viewBox="0 0 12 12" fill="currentColor"><path d="M6 2l3 4H3zM6 10L3 6h6z"/></svg>;
  return dir === 'asc'
    ? <svg className="w-3 h-3 inline ml-1" aria-hidden viewBox="0 0 12 12" fill="currentColor" style={{ color: 'inherit' }}><path d="M6 2l3 4H3z"/></svg>
    : <svg className="w-3 h-3 inline ml-1" aria-hidden viewBox="0 0 12 12" fill="currentColor" style={{ color: 'inherit' }}><path d="M6 10L3 6h6z"/></svg>;
}

function RangeFilter({
  label,
  color,
  range,
  onChange,
}: {
  label: string;
  color: string;
  range: IndexRange;
  onChange: (r: IndexRange) => void;
}) {
  const minId = useId();
  const maxId = useId();

  const minVal = range.min === '' ? 1   : Number(range.min);
  const maxVal = range.max === '' ? 100 : Number(range.max);

  // Progress bar percentage
  const leftPct  = minVal;
  const widthPct = maxVal - minVal;

  return (
    <div
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px',
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Label + current range */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color }}>
          {label}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
          {range.min === '' ? '0' : range.min} – {range.max === '' ? '100' : range.max}
        </span>
      </div>

      {/* Visual track */}
      <div style={{ position: 'relative', height: '4px', background: 'var(--surface)', borderRadius: '2px', marginBottom: '12px' }}>
        <div style={{
          position: 'absolute', height: '100%', borderRadius: '2px',
          left: `${leftPct}%`, width: `${widthPct}%`, background: color, opacity: 0.7,
        }} />
      </div>

      {/* Number inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label htmlFor={minId} style={{ display: 'block', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', marginBottom: '4px' }}>MIN</label>
          <input
            id={minId}
            type="number"
            min={1}
            max={100}
            step={1}
            value={range.min}
            placeholder="1"
            onChange={e => {
              let val = e.target.value;
              if (val !== '') {
                let num = parseInt(val, 10);
                if (num > 100) val = '100';
                if (num < 1) val = '1';
              }
              onChange({ ...range, min: val });
            }}
            className="input"
            style={{ padding: '6px 10px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}
          />
        </div>
        <div>
          <label htmlFor={maxId} style={{ display: 'block', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', marginBottom: '4px' }}>MAX</label>
          <input
            id={maxId}
            type="number"
            min={1}
            max={100}
            step={1}
            value={range.max}
            placeholder="100"
            onChange={e => {
              let val = e.target.value;
              if (val !== '') {
                let num = parseInt(val, 10);
                if (num > 100) val = '100';
                if (num < 1) val = '1';
              }
              onChange({ ...range, max: val });
            }}
            className="input"
            style={{ padding: '6px 10px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Index badge ───────────────────────────────────────────────────────────────

function IndexBadge({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '48px' }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: '16px', lineHeight: 1, color }}>
        {value != null ? value.toFixed(0) : '—'}
      </span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: '2px' }}>
        {label}
      </span>
    </div>
  );
}

// ── Player result row ─────────────────────────────────────────────────────────

function PlayerRow({ player, rank }: { player: PlayerRow; rank: number }) {
  const flagUrl  = getFlagUrl(player.team);
  const macro    = player.macro_role;
  const macroColor = MACRO_COLOR[macro] ?? 'var(--text-muted)';

  const avg = (
    ((player.idx__PROGRESSION ?? 0) +
      (player.idx__DANGEROUSNESS ?? 0) +
      (player.idx__RECEPTION ?? 0) +
      (player.idx__GRAVITY ?? 0)) / 4
  );

  return (
    <div
      className="card fade-up p-4 sm:p-5"
      style={{ cursor: 'default' }}
      role="listitem"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Top: Player Info */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '13px',
            color: rank <= 3 ? 'var(--accent)' : 'var(--text-dim)', minWidth: '24px', textAlign: 'right',
          }}>
            {rank}
          </span>

          {/* Flag */}
          {flagUrl
            ? <img src={flagUrl} alt="" style={{ width: 28, height: 20, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} aria-hidden />
            : <span style={{ width: 28, flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--text-dim)' }}>{player.team.substring(0, 3).toUpperCase()}</span>
          }

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            {player.player_id ? (
              <Link 
                to={`/player/${player.player_id}`}
                className="hover:text-[--accent] transition-colors focus-visible:outline-none focus-visible:underline"
                style={{ display: 'block', textDecoration: 'none' }}
              >
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '18px', color: 'inherit', lineHeight: 1.1, marginBottom: '2px' }}>
                  {player.player}
                </p>
              </Link>
            ) : (
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '18px', color: 'var(--text)', lineHeight: 1.1, marginBottom: '2px' }}>
                {player.player}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {player.team}
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>·</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {player.primary_role}
              </span>
              <span className="tag" style={{ background: `${macroColor}18`, color: macroColor, border: `1px solid ${macroColor}40`, fontSize: '9px' }}>
                {macro}
              </span>
            </div>
          </div>

          {/* Minutes (Mobile) */}
          <div className="lg:hidden text-right whitespace-nowrap">
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-dim)' }}>
              {player.minutes_played}'
            </span>
          </div>
        </div>

        {/* Bottom: Indices and Statistics (go below on mobile, right on desktop) */}
        <div className="flex items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {INDICES.map(idx => (
              <IndexBadge
                key={idx.key}
                label={idx.short}
                value={player[idx.key as keyof PlayerRow] as number}
                color={idx.color}
              />
            ))}

            {/* Average score */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'var(--surface2)', borderRadius: '8px', padding: '6px 10px', minWidth: '52px',
            }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: '18px', lineHeight: 1, color: 'var(--text)' }}>
                {avg.toFixed(0)}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: '2px' }}>
                AVG
              </span>
            </div>
          </div>

          {/* Minutes (Desktop) */}
          <div className="hidden lg:block text-right min-w-[48px]">
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-dim)' }}>
              {player.minutes_played}'
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Active filter pills ───────────────────────────────────────────────────────

function ActiveFilterPills({ filters, onClear }: { filters: Filters; onClear: () => void }) {
  const pills: string[] = [];
  if (filters.macroRole) pills.push(`Macro: ${filters.macroRole}`);
  if (filters.role) pills.push(`Role: ${filters.role}`);
  INDICES.forEach(idx => {
    const r = filters.ranges[idx.key];
    if (r.min !== '' || r.max !== '') {
      pills.push(`${idx.label}: ${r.min || '0'}–${r.max || '100'}`);
    }
  });
  if (pills.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Active filters:
      </span>
      {pills.map(p => (
        <span key={p} className="tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(57,255,20,0.3)' }}>
          {p}
        </span>
      ))}
      <button
        onClick={onClear}
        className="btn btn-ghost"
        style={{ fontSize: '11px', padding: '3px 12px' }}
      >
        Clear all
      </button>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
      <p style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</p>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--text)', marginBottom: '8px' }}>
        No players match your filters
      </p>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
        Try widening the index ranges or clearing the role filter
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const DEFAULT_RANGES: Record<IndexKey, IndexRange> = {
  idx__PROGRESSION:   { min: '', max: '' },
  idx__DANGEROUSNESS: { min: '', max: '' },
  idx__RECEPTION:     { min: '', max: '' },
  idx__GRAVITY:       { min: '', max: '' },
};

export default function SearchByAttribute() {
  const [filters, setFilters] = useState<Filters>({
    macroRole: '', role: '', ranges: DEFAULT_RANGES,
  });

  const [allPlayers, setAllPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [sortKey, setSortKey] = useState<IndexKey | 'avg'>('avg');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const macroRoleId = useId();
  const roleId      = useId();

  // Roles available given selected macro_role
  const availableRoles = filters.macroRole
    ? PRIMARY_ROLES.filter(r => ROLE_TO_MACRO[r] === filters.macroRole)
    : PRIMARY_ROLES;

  // Load all players on mount
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const data: PlayerRow[] = await fetch(`${API_BASE_URL}/space-control/search`).then(r => r.json());
        setAllPlayers(data);
      } catch {
        setAllPlayers([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    };
    fetchAll();
  }, []);

  const clearFilters = () => {
    setFilters({ macroRole: '', role: '', ranges: DEFAULT_RANGES });
  };

  // Client-side filtering (since we fetch all players at once, we can do it here)
  const filtered = allPlayers.filter(player => {
    const f = filters;
    
    // Filter by macro role and primary role
    if (f.macroRole && player.macro_role !== f.macroRole) return false;
    if (f.role && player.primary_role !== f.role) return false;

    // Numerical filters: check if player indices fall within selected ranges
    for (const idx of INDICES) {
      const val = player[idx.key] ?? 0;
      const r = f.ranges[idx.key];
      const min = r.min === '' ? 1 : Number(r.min);
      const max = r.max === '' ? 100 : Number(r.max);
      
      if (val < min || val > max) return false;
    }

    return true;
  });

  // Client side sorting (for now, since we fetch all players at once)
  const sorted = filtered.sort((a, b) => {
    let valA = 0;
    let valB = 0;
    if (sortKey === 'avg') {
      valA = ((a.idx__PROGRESSION ?? 0) + (a.idx__DANGEROUSNESS ?? 0) + (a.idx__RECEPTION ?? 0) + (a.idx__GRAVITY ?? 0)) / 4;
      valB = ((b.idx__PROGRESSION ?? 0) + (b.idx__DANGEROUSNESS ?? 0) + (b.idx__RECEPTION ?? 0) + (b.idx__GRAVITY ?? 0)) / 4;
    } else {
      valA = (a[sortKey as keyof PlayerRow] as number) ?? 0;
      valB = (b[sortKey as keyof PlayerRow] as number) ?? 0;
    }
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  const handleSort = (key: IndexKey | 'avg') => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="w-full pb-16 min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-6 pt-8 mb-6">
        <ol className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <li>
            <Link to="/" className="hover:text-[--accent] transition-colors font-600">Dashboard</Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-600" style={{ color: 'var(--text)' }} aria-current="page">
            Search by Attribute
          </li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="border-b px-6 pb-8 mb-8" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto">
          <p className="font-mono text-xs tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
            SPACE CONTROL & VALUE · EURO 2024
          </p>
          <h1 className="font-display font-900 leading-none tracking-tight mb-3" style={{ color: 'var(--text)', fontSize: 'clamp(36px, 6vw, 64px)' }}>
            Search by Attribute
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '560px' }}>
            Filter all 272 players by macro role, tactical role, and contextual space control index ranges.
            Rankings are sorted by average index score by default.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:grid lg:grid-cols-[300px_1fr] gap-8 items-start">

          {/* Hamburger Trigger Button for Mobile */}
          <div className="lg:hidden w-full mb-2">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="w-full flex items-center justify-center gap-2 p-3 rounded font-bold transition-colors"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Filter by Attributes
            </button>
          </div>

          {/* Left panel: filters - Drawer overlay (Mobile), static (Desktop) */}
          <aside 
            className={`
              ${mobileFiltersOpen ? 'fixed inset-0 z-50 bg-[var(--bg)] overflow-y-auto p-4 sm:p-6 block' : 'hidden'} 
              lg:block lg:static lg:p-0 lg:bg-transparent lg:w-full
            `}
            aria-label="Search filters"
          >
            <div className="card" style={{ padding: '24px', position: 'relative' }}>
              
              {/* Close Button X for Mobile */}
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="lg:hidden absolute top-4 right-4 text-xl font-bold p-2"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label="Close filters"
              >
                ✕
              </button>

              <h2
                className="font-display font-900"
                style={{ color: 'var(--text)', fontSize: '20px', marginBottom: '20px' }}
              >
                Filters
              </h2>

              {/* Macro role */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor={macroRoleId}
                  style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '8px' }}
                >
                  Macro Role
                </label>
                {/* Pill buttons for macro role */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    onClick={() => setFilters(f => ({ ...f, macroRole: '', role: '' }))}
                    className="tag"
                    style={{
                      cursor: 'pointer', border: 'none', padding: '5px 12px',
                      background: filters.macroRole === '' ? 'var(--accent)' : 'var(--surface2)',
                      color: filters.macroRole === '' ? '#000' : 'var(--text-muted)',
                    }}
                  >
                    All
                  </button>
                  {MACRO_ROLES.map(m => {
                    const active = filters.macroRole === m;
                    const col = MACRO_COLOR[m];
                    return (
                      <button
                        key={m}
                        onClick={() => setFilters(f => ({ ...f, macroRole: active ? '' : m, role: '' }))}
                        className="tag"
                        style={{
                          cursor: 'pointer', border: `1px solid ${active ? col : 'var(--border)'}`,
                          background: active ? `${col}22` : 'var(--surface2)',
                          color: active ? col : 'var(--text-muted)',
                        }}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary role */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor={roleId}
                  style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '8px' }}
                >
                  Primary Role
                </label>
                <select
                  id={roleId}
                  value={filters.role}
                  onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
                  className="input select"
                  style={{ fontSize: '13px' }}
                >
                  <option value="">All roles</option>
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border)', marginBottom: '20px' }} />

              {/* Index ranges */}
              <p
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '12px' }}
              >
                Index Ranges (0–100)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {INDICES.map(idx => (
                  <RangeFilter
                    key={idx.key}
                    label={idx.label}
                    color={idx.color}
                    range={filters.ranges[idx.key]}
                    onChange={r =>
                      setFilters(f => ({
                        ...f,
                        ranges: { ...f.ranges, [idx.key]: r },
                      }))
                    }
                  />
                ))}
              </div>

              <button onClick={clearFilters} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                Reset Filters
              </button>

              {/* Final Confirm Button for Mobile */}
              <button 
                onClick={() => setMobileFiltersOpen(false)} 
                className="btn lg:hidden w-full mt-4 flex items-center justify-center font-bold"
                style={{ background: 'var(--accent)', color: '#000', padding: '12px', borderRadius: 'var(--radius)' }}
              >
                Apply Filters
              </button>
            </div>
          </aside>

          {/* Right panel: results */}
          <section aria-label="Search results" className="w-full">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
              <div>
                <span className="font-display font-900" style={{ fontSize: '22px', color: 'var(--text)', marginRight: '10px' }}>
                  {loading ? '…' : sorted.length} players
                </span>
                {searched && !loading && (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-dim)' }}>
                    found
                  </span>
                )}
              </div>
            </div>

            <ActiveFilterPills filters={filters} onClear={clearFilters} />

            {/* Clickable Header sorting ticks (hidden on Mobile) */}
            {sorted.length > 0 && (
              <div
                className="hidden lg:grid"
                style={{
                  gridTemplateColumns: '28px 28px 1fr repeat(5, 52px) 48px',
                  gap: '16px',
                  padding: '8px 20px',
                  marginBottom: '6px',
                  alignItems: 'center'
                }}
              >
                <span />
                <span />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Player</span>
                
                {INDICES.map(idx => (
                  <button
                    key={idx.key}
                    onClick={() => handleSort(idx.key)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', 
                      color: sortKey === idx.key ? idx.color : 'var(--text-dim)', 
                      letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'color 0.2s'
                    }}
                  >
                    {idx.short} <SortIcon active={sortKey === idx.key} dir={sortOrder} />
                  </button>
                ))}
                
                <button
                  onClick={() => handleSort('avg')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', 
                    color: sortKey === 'avg' ? 'var(--text)' : 'var(--text-dim)', 
                    letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'color 0.2s'
                  }}
                >
                  AVG <SortIcon active={sortKey === 'avg'} dir={sortOrder} />
                </button>
                
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right' }}>MIN</span>
              </div>
            )}

            {/* Results list */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '20px' }} />
                ))}
              </div>
            ) : sorted.length === 0 && searched ? (
              <div className="card">
                <EmptyState />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} role="list" aria-label="Player results">
                {sorted.map((player, i) => (
                  <PlayerRow key={`${player.player}-${player.team}`} player={player} rank={i + 1} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

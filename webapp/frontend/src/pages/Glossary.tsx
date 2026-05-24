import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GLOSSARY_SECTIONS, type GlossaryCategory } from '../data/glossary';

// ── Category filter pill ──────────────────────────────────────────────────────

const FILTER_OPTIONS: { key: GlossaryCategory | 'ALL'; label: string }[] = [
  { key: 'ALL',          label: 'All' },
  { key: 'INDEX',        label: 'Indices' },
  { key: 'PROGRESSION',  label: 'Progression' },
  { key: 'DANGEROUSNESS',label: 'Dangerousness' },
  { key: 'RECEPTION',    label: 'Reception' },
  { key: 'GRAVITY',      label: 'Gravity' },
  { key: 'DECISION_QUALITY', label: 'Decision Quality' },
];

const CATEGORY_COLORS: Record<string, string> = {
  INDEX:        '#ffffff',
  PROGRESSION:  '#39ff14',
  DANGEROUSNESS:'#ff4d6a',
  RECEPTION:    '#4da6ff',
  GRAVITY:      '#ffc947',
  DECISION_QUALITY: '#a0a0a0',
};

// ── Entry card ────────────────────────────────────────────────────────────────

function EntryCard({ label, description, color }: { label: string; description: string; color: string }) {
  return (
    <div
      className="card-inner p-4 flex flex-col gap-2 transition-all hover:scale-[1.01]"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <span
        className="font-mono text-xs font-700 tracking-wide"
        style={{ color }}
      >
        {label}
      </span>
      <p
        className="text-xs leading-relaxed"
        style={{ color: 'var(--text-muted)' }}
      >
        {description}
      </p>
    </div>
  );
}

// ── Section block ─────────────────────────────────────────────────────────────

function SectionBlock({
  title, color, intro, entries, category,
}: {
  title: string;
  color: string;
  intro: string;
  entries: { label: string; description: string }[];
  category: GlossaryCategory;
}) {
  return (
    <section
      id={`section-${category}`}
      aria-labelledby={`heading-${category}`}
      style={{ scrollMarginTop: '80px' }}
    >
      {/* Section header */}
      <div
        className="flex items-center gap-4 mb-5 pb-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Colour swatch */}
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 12, height: 12,
            borderRadius: 3,
            background: color,
            flexShrink: 0,
          }}
        />
        <h2
          id={`heading-${category}`}
          className="font-display font-900 text-2xl tracking-tight"
          style={{ color: 'var(--text)' }}
        >
          {title}
        </h2>
        {/* Variable count tag */}
        <span
          className="tag font-mono ml-auto"
          style={{ background: `${color}18`, color }}
        >
          {entries.length} {entries.length === 1 ? 'variable' : 'variables'}
        </span>
      </div>

      {/* Intro paragraph */}
      <p
        className="text-sm leading-relaxed mb-6 max-w-2xl"
        style={{ color: 'var(--text-muted)' }}
      >
        {intro}
      </p>

      {/* Entry grid */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
      >
        {entries.map(entry => (
          <EntryCard
            key={entry.label}
            label={entry.label}
            description={entry.description}
            color={color}
          />
        ))}
      </div>
    </section>
  );
}

// ── Glossary page ─────────────────────────────────────────────────────────────

export default function Glossary() {
  const [activeFilter, setActiveFilter] = useState<GlossaryCategory | 'ALL'>('ALL');

  const visibleSections =
    activeFilter === 'ALL'
      ? GLOSSARY_SECTIONS
      : GLOSSARY_SECTIONS.filter(s => s.category === activeFilter);

  const totalVariables = GLOSSARY_SECTIONS.reduce(
    (acc, s) => acc + s.entries.length,
    0,
  );

  return (
    <div className="w-full pb-20 min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div
        className="border-b px-6 pt-10 pb-10"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="max-w-5xl mx-auto">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <li>
                <Link to="/" className="hover:text-[--accent] transition-colors font-600">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="font-600" style={{ color: 'var(--text)' }} aria-current="page">
                Glossary
              </li>
            </ol>
          </nav>

          <p
            className="font-mono text-xs tracking-widest mb-3"
            style={{ color: 'var(--accent)' }}
          >
            REFERENCE · {totalVariables} VARIABLES
          </p>
          <h1
            className="font-display font-900 leading-none tracking-tight mb-4"
            style={{ color: 'var(--text)', fontSize: 'clamp(36px, 6vw, 60px)' }}
          >
            Glossary
          </h1>
          <p
            className="text-base max-w-xl"
            style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}
          >
            Complete reference for every metric and index used across the platform.
            Variables are grouped by their Space Control dimension.
          </p>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div
        className="border-b z-40 px-6 py-3"
        style={{
          background: 'rgba(13,15,20,0.92)',
          backdropFilter: 'blur(16px)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-2">
          <span
            className="font-mono text-[10px] tracking-widest uppercase mr-2 hidden sm:inline"
            style={{ color: 'var(--text-dim)' }}
          >
            Filter
          </span>
          {FILTER_OPTIONS.map(opt => {
            const active = activeFilter === opt.key;
            const color  = opt.key === 'ALL' ? 'var(--accent)' : (CATEGORY_COLORS[opt.key] ?? 'var(--accent)');
            return (
              <button
                key={opt.key}
                onClick={() => setActiveFilter(opt.key)}
                aria-pressed={active}
                className="tag transition-all"
                style={{
                  cursor: 'pointer',
                  border: `1px solid ${active ? color : 'var(--border)'}`,
                  background: active ? `${color}22` : 'var(--surface2)',
                  color: active ? color : 'var(--text-muted)',
                  fontWeight: active ? 700 : 600,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pt-10">
        <div className="flex flex-col gap-14">
          {visibleSections.map(section => (
            <SectionBlock
              key={section.category}
              category={section.category}
              title={section.title}
              color={section.color}
              intro={section.intro}
              entries={section.entries}
            />
          ))}
        </div>

        {/* Empty state when a filter yields nothing (defensive) */}
        {visibleSections.length === 0 && (
          <div className="py-24 text-center" style={{ color: 'var(--text-dim)' }}>
            <p className="font-display font-700 text-xl">No variables found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

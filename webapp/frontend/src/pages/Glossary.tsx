import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GLOSSARY_SECTIONS, type GlossaryCategory } from '../data/glossary';

// ── Category filter pill ──────────────────────────────────────────────────────

const FILTER_OPTIONS: { key: GlossaryCategory | 'ALL'; label: string }[] = [
  { key: 'ALL',          label: 'All' },
  { key: 'PROGRESSION',  label: 'Progression' },
  { key: 'DANGEROUSNESS',label: 'Dangerousness' },
  { key: 'RECEPTION',    label: 'Reception' },
  { key: 'GRAVITY',      label: 'Gravity' },
  { key: 'DECISION_QUALITY', label: 'Decision Quality' },
];

const CATEGORY_COLORS: Record<string, string> = {
  PROGRESSION:  '#16a34a',
  DANGEROUSNESS:'#dc2626',
  RECEPTION:    '#2563eb',
  GRAVITY:      '#d97706',
  DECISION_QUALITY: '#7c3aed',
};

// ── Entry card ────────────────────────────────────────────────────────────────

function EntryCard({ label, description, color }: { label: string; description: string; color: string }) {
  return (
    <div
      className="card-inner p-4 flex flex-col gap-2 transition-all hover:scale-[1.01]"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <span
        className="font-mono text-xs font-bold tracking-wide"
        style={{ color: '#000' }}
      >
        {label}
      </span>
      <p className="text-xs leading-relaxed text-[var(--text-muted)]">
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
      <div className="flex items-center gap-4 mb-5 pb-4 border-b border-[var(--border)]">
        {/* Colour swatch */}
        <span
          aria-hidden
          className="inline-block w-3 h-3 rounded-sm shrink-0"
          style={{ background: color }}
        />
        <h2
          id={`heading-${category}`}
          className="font-display font-black text-2xl tracking-tight text-[var(--text)]"
        >
          {title}
        </h2>
        {/* Variable count tag */}
      </div>

      {/* Intro paragraph */}
      <p className="text-sm leading-relaxed mb-6 max-w-2xl text-[var(--text-muted)]">
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

  return (
    <div className="w-full pb-20 min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-[var(--border)] px-6 pt-10 pb-10 bg-[var(--surface)]">
        <div className="max-w-[1200px] mx-auto">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <li>
                <Link to="/" className="hover:text-[var(--accent)] transition-colors font-semibold">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="font-semibold text-[var(--text)]" aria-current="page">
                Glossary
              </li>
            </ol>
          </nav>

          <h1
            className="font-display font-black leading-none tracking-tight mb-4 text-[var(--text)]"
            style={{ fontSize: 'clamp(36px, 6vw, 60px)' }}
          >
            Glossary
          </h1>
          <p className="text-base text-[var(--text-muted)] leading-[1.7]">
            Complete reference for every metric and index used across the platform.
            Variables are grouped by their Space Control dimension.
          </p>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div className="border-b border-[var(--border)] z-40 px-6 py-3 bg-white/92 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] tracking-widest uppercase mr-2 hidden sm:inline text-[var(--text-dim)]">
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
                className="tag transition-all cursor-pointer"
                style={{
                  border: `1px solid ${active ? color : 'var(--border)'}`,
                  background: active ? `${color}11` : 'var(--surface)',
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
      <div className="max-w-[1200px] mx-auto px-6 pt-10">
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
          <div className="py-24 text-center text-[var(--text-dim)]">
            <p className="font-display font-bold text-xl">No variables found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const LIMITATIONS = [
  {
    title: 'Single instant per event',
    body: 'Each metric reads the pitch at the moment the pass is played, not the movement before it or the ball trajectory after. It describes the geometry of the decision, not how it unfolds.',
  },
  {
    title: 'Partial player coverage',
    body: 'A 360 frame usually shows 8 to 12 of the 22 players, those near the ball. Players far from the action are often missing, so anything measured far from the ball is less reliable.',
  },
  {
    title: 'Anonymous opponents and teammates',
    body: 'Only the player on the ball is named; everyone else carries just a team tag. The model cannot weight opposition by quality, so beating a top defender counts the same as beating a weak one. The same holds going forward: a pass into a dangerous zone is valued by the zone, not by who receives it.',
  },
  {
    title: 'No continuous tracking',
    body: 'Frames are snapshots at event time, not continuous motion. Speed at reception, acceleration, distance covered or pressing intensity over time cannot be measured. These metrics describe geometry, not movement.',
  },
  {
    title: 'Pressure intensity not captured',
    body: 'A frame shows where defenders are, not their physical state. A defender 2 m away may be jogging or sprinting in to tackle, and the camera cannot tell the difference. Pressure metrics here approximate threat from distance alone.',
  },
  {
    title: 'Built on base models',
    body: 'The indices sit on top of an EPV model (adapted from Friends of Tracking) and, for H2, a custom pass-completion model. Any error in these base models carries through into the metrics above them.',
  },
  {
    title: 'No game state',
    body: 'Decisions are graded on value alone. Score, time left, match importance and manager instructions are ignored, so a deliberately safe choice late in a game reads as conservative rather than smart.',
  },
  {
    title: 'Counterfactual passes cannot be validated (H2)',
    body: 'H2 compares the chosen pass against the alternatives the player could have played. Those alternatives were never actually played, so there is no real outcome to check them against. The index limits this by ranking the options within each event, which only needs them ordered roughly right.',
  },
  {
    title: 'Single tournament, small samples',
    body: 'All data come from Euro 2024 alone, so patterns may not carry over to club football or other competitions. Players need at least 135 minutes (about 1.5 matches) to be included, and per-role pools are small: a player with few events has a noisy ranking that can also nudge the players around him. The sample size is always shown so low-sample profiles can be discounted.',
  },
];

export default function Home() {
  return (
    <div className="w-full pb-20 min-h-screen">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div className="border-b border-[var(--border)] px-6 pt-16 pb-14 bg-[var(--surface)]">
        <div className="max-w-[1200px] mx-auto">
          <p className="font-mono text-xs tracking-widest mb-3 text-[var(--accent)]">
            UEFA EURO 2024 · STATSBOMB 360° · 272 PLAYERS
          </p>
          <h1
            className="font-display font-black leading-none tracking-tight mb-5 text-[var(--text)]"
            style={{ fontSize: 'clamp(40px, 7vw, 72px)' }}
          >
            Contextual<br />Football Scouting
          </h1>
          <p className="text-[17px] text-[var(--text-muted)] max-w-[600px] leading-[1.7]">
            Hypothesis 1 — a player's quality is measurable through their spatial influence on the pitch,
            quantified via convex hulls of the opposing block, line-breakers weighted by Expected Possession
            Value (EPV), and the gravity exerted on defenders.
          </p>

          {/* Author + links */}
          <div className="flex flex-wrap items-center gap-4 mt-8">
            <p className="text-[13px] text-[var(--text-dim)] font-mono">
              <a
                href="https://www.linkedin.com/in/matteo-vezzoli83"
                target="_blank"
                rel="noreferrer"
                className="inline-inline-flex items-center gap-1 font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors underline underline-offset-2 decoration-[var(--border)] hover:decoration-[var(--accent)]"
              >
                Matteo Vezzoli
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden className="inline ml-0.5 opacity-50"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>
              </a>
              {' & '}
              <a
                href="https://www.linkedin.com/in/armando-mio"
                target="_blank"
                rel="noreferrer"
                className="inline-inline-flex items-center gap-1 font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors underline underline-offset-2 decoration-[var(--border)] hover:decoration-[var(--accent)]"
              >
                Armando Mio
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden className="inline ml-0.5 opacity-50"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>
              </a>
              {' · 2026'}
            </p>
            <a
              href="https://github.com/ArMat-Analytics/Contextual-Football-Scouting"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost text-[12px] py-1.5 px-3.5 gap-1.5"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </div>

      {/* ── Data scope & limitations ────────────────────────────────────────── */}
      <div className="px-6 pt-14 pb-4">
        <div className="max-w-[1200px] mx-auto">

          {/* Section header */}
          <div className="mb-10 pb-6 border-b border-[var(--border)]">
            <p className="font-mono text-xs tracking-[0.14em] mb-3 text-[var(--text-dim)] uppercase">
              METHODOLOGY · TRANSPARENCY
            </p>
            <h2
              className="font-display font-black tracking-tight mb-3 text-[var(--text)]"
              style={{ fontSize: 'clamp(24px, 4vw, 36px)' }}
            >
              Data scope and limitations
            </h2>
            <p className="text-[15px] leading-relaxed text-[var(--text-muted)] max-w-[640px]">
              All metrics on this site come from StatsBomb 360 freeze-frame data combined with
              predictive models. This is what they can, and cannot, describe.
            </p>
          </div>

          {/* Limitations list */}
          <ol className="flex flex-col divide-y divide-[var(--border)]" aria-label="Limitations">
            {LIMITATIONS.map((item, i) => (
              <li key={i} className="flex gap-5 sm:gap-8 py-5 items-baseline">
                {/* Number */}
                <span
                  className="font-mono text-[11px] font-bold text-[var(--text-dim)] shrink-0 w-6 text-right select-none"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {/* Content */}
                <p className="text-[14px] text-[var(--text-muted)] leading-[1.7] m-0">
                  <strong className="font-semibold text-[var(--text)] mr-2">{item.title}.</strong>
                  {item.body}
                </p>
              </li>
            ))}
          </ol>

        </div>
      </div>

    </div>
  );
}
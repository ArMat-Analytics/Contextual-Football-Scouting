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
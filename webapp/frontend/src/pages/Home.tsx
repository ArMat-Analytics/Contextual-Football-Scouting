export default function Home() {
  return (
    <div className="w-full pb-20 min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div
        className="border-b px-6 pt-16 pb-14"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="max-w-4xl mx-auto">
          <p className="font-mono text-xs tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
            UEFA EURO 2024 · STATSBOMB 360° · 272 PLAYERS
          </p>
          <h1
            className="font-display font-900 leading-none tracking-tight mb-5"
            style={{ color: 'var(--text)', fontSize: 'clamp(40px, 7vw, 72px)' }}
          >
            Contextual<br />Football Scouting
          </h1>
          <p style={{ fontSize: '17px', color: 'var(--text-muted)', maxWidth: '600px', lineHeight: 1.7 }}>
            Hypothesis 1 — a player's quality is measurable through their spatial influence on the pitch,
            quantified via convex hulls of the opposing block, line-breakers weighted by Expected Possession
            Value (EPV), and the gravity exerted on defenders.
          </p>

          {/* Author + links */}
          <div className="flex flex-wrap items-center gap-4 mt-8">
            <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
              Matteo Vezzoli
              
              <a
                href="https://www.linkedin.com/in/matteo-vezzoli83"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
                style={{ fontSize: '12px', padding: '6px 14px', gap: '6px' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                  <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/>
                </svg>
                LinkedIn
              </a>
              &amp; 
              Armando Mio 
              <a
                href="https://www.linkedin.com/in/armando-mio"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
                style={{ fontSize: '12px', padding: '6px 14px', gap: '6px' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                  <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/>
                </svg>
                LinkedIn
              </a>
              
              · 2026
            </span>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/ArMat-Analytics/Contextual-Football-Scouting"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
                style={{ fontSize: '12px', padding: '6px 14px', gap: '6px' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </a>
              
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

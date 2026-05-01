import { useState, useId } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { getFlagUrl, ALL_STATS, CAT_ACCENT } from '../utils';

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_SIMILAR: Record<string, any> = {
  '101': {
    player_id: 101, player_name: 'Lamine Yamal', source_team_name: 'Spain',
    primary_role: 'right_winger', age: 17, preferred_foot: 'right',
    similarity_score: 0.94, minutes_played: 540,
    goals: 3, xg_total: 2.1, assists: 4, key_passes: 18, dribbles_successful: 28,
    pass_completion_pct: 82, total_touches: 412,
    ball_recoveries: 14, interceptions: 5, aerials_won: 3,
  },
  '102': {
    player_id: 102, player_name: 'Nico Williams', source_team_name: 'Spain',
    primary_role: 'left_winger', age: 22, preferred_foot: 'left',
    similarity_score: 0.91, minutes_played: 512,
    goals: 4, xg_total: 3.4, assists: 2, key_passes: 14, dribbles_successful: 31,
    pass_completion_pct: 78, total_touches: 387,
    ball_recoveries: 11, interceptions: 3, aerials_won: 1,
  },
  '103': {
    player_id: 103, player_name: 'Florian Wirtz', source_team_name: 'Germany',
    primary_role: 'attacking_midfielder', age: 21, preferred_foot: 'right',
    similarity_score: 0.88, minutes_played: 575,
    goals: 2, xg_total: 2.8, assists: 5, key_passes: 22, dribbles_successful: 19,
    pass_completion_pct: 86, total_touches: 498,
    ball_recoveries: 17, interceptions: 8, aerials_won: 4,
  },
  '104': {
    player_id: 104, player_name: 'Khvicha Kvaratskhelia', source_team_name: 'Georgia',
    primary_role: 'left_winger', age: 23, preferred_foot: 'left',
    similarity_score: 0.83, minutes_played: 345,
    goals: 2, xg_total: 1.9, assists: 3, key_passes: 11, dribbles_successful: 24,
    pass_completion_pct: 74, total_touches: 294,
    ball_recoveries: 10, interceptions: 4, aerials_won: 2,
  },
  '105': {
    player_id: 105, player_name: 'Dani Olmo', source_team_name: 'Spain',
    primary_role: 'attacking_midfielder', age: 26, preferred_foot: 'right',
    similarity_score: 0.79, minutes_played: 498,
    goals: 4, xg_total: 3.1, assists: 2, key_passes: 16, dribbles_successful: 12,
    pass_completion_pct: 88, total_touches: 461,
    ball_recoveries: 22, interceptions: 9, aerials_won: 6,
  },
};

// Source player mock (used when real API not available)
const SOURCE_MOCK: any = {
  player_id: 0, player_name: 'Selected Player', source_team_name: 'Team',
  primary_role: 'forward', age: 24, preferred_foot: 'right',
  similarity_score: 1, minutes_played: 510,
  goals: 3, xg_total: 2.6, assists: 3, key_passes: 16, dribbles_successful: 20,
  pass_completion_pct: 80, total_touches: 400,
  ball_recoveries: 12, interceptions: 6, aerials_won: 3,
};

// ── Palette for charts ───────────────────────────────────────────────────────
const CHART_COLORS = ['#39ff14', '#4da6ff', '#ffc947'];

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 90 ? 'var(--win)' : pct >= 80 ? 'var(--blue)' : 'var(--gold)';
  return (
    <span
      className="font-mono font-700 text-xs px-2.5 py-1 rounded-full"
      style={{ background: `${color}20`, color }}
      aria-label={`${pct}% similarity`}
    >
      {pct}% match
    </span>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 90 ? 'var(--win)' : pct >= 80 ? 'var(--blue)' : 'var(--gold)';
  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
    </div>
  );
}

// ── Radar chart ───────────────────────────────────────────────────────────────
const RADAR_STATS = ['goals','assists','key_passes','dribbles_successful','ball_recoveries','interceptions'];
const RADAR_LABELS: Record<string, string> = {
  goals:'Goals', assists:'Assists', key_passes:'Key Passes',
  dribbles_successful:'Dribbles', ball_recoveries:'Recoveries', interceptions:'Interceptions',
};

function toRadarData(source: any, similar: any) {
  return RADAR_STATS.map(key => ({
    stat: RADAR_LABELS[key],
    [source.player_name]: source[key] ?? 0,
    [similar.player_name]: similar[key] ?? 0,
  }));
}

// ── Bar chart data (attacking) ────────────────────────────────────────────────
const BAR_STATS = ['goals','xg_total','assists','key_passes','dribbles_successful'];
const BAR_LABELS: Record<string,string> = {
  goals:'Goals', xg_total:'xG', assists:'Assists', key_passes:'Key P.', dribbles_successful:'Dribbles'
};

function toBarData(source: any, similar: any) {
  return BAR_STATS.map(key => ({
    stat: BAR_LABELS[key],
    [source.player_name]: source[key] ?? 0,
    [similar.player_name]: similar[key] ?? 0,
  }));
}

// ── Comparison line chart (all stats normalised 0-100) ────────────────────────
function toLineData(source: any, similar: any) {
  // Normalise each stat relative to a reasonable max
  const maxima: Record<string, number> = {
    minutes_played: 720, goals: 10, xg_total: 8, assists: 8, key_passes: 30,
    dribbles_successful: 40, pass_completion_pct: 100, total_touches: 700,
    ball_recoveries: 40, interceptions: 20, aerials_won: 15,
  };
  return ALL_STATS.map(s => ({
    stat: s.label,
    [source.player_name]: Math.round(Math.min(100, ((source[s.key] ?? 0) / (maxima[s.key] ?? 1)) * 100)),
    [similar.player_name]: Math.round(Math.min(100, ((similar[s.key] ?? 0) / (maxima[s.key] ?? 1)) * 100)),
  }));
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border px-4 py-3 text-sm" style={{ background: 'var(--surface2)', borderColor: 'var(--border2)' }}>
      <p className="font-display font-800 mb-2" style={{ color: 'var(--text)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-mono font-600" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ── Charts section ────────────────────────────────────────────────────────────
function ChartsSection({ source, similar }: { source: any; similar: any }) {
  const radarData = toRadarData(source, similar);
  const barData   = toBarData(source, similar);
  const lineData  = toLineData(source, similar);
  const c0 = CHART_COLORS[0];
  const c1 = CHART_COLORS[1];

  const sectionStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
  };

  return (
    <div className="space-y-6">
      {/* Row 1: radar + bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar */}
        <div style={sectionStyle}>
          <h3 className="font-display font-800 text-lg mb-4" style={{ color: 'var(--text)' }}>
            Radar Overview
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis
                dataKey="stat"
                tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Barlow', fontWeight: 600 }}
              />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar name={source.player_name} dataKey={source.player_name}
                stroke={c0} fill={c0} fillOpacity={0.18} strokeWidth={2} />
              <Radar name={similar.player_name} dataKey={similar.player_name}
                stroke={c1} fill={c1} fillOpacity={0.18} strokeWidth={2} />
              <Legend
                formatter={(v) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v}</span>}
                wrapperStyle={{ paddingTop: 12 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar – Attacking */}
        <div style={sectionStyle}>
          <h3 className="font-display font-800 text-lg mb-4" style={{ color: 'var(--text)' }}>
            Attacking Stats
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="stat" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Barlow' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v}</span>} />
              <Bar dataKey={source.player_name}  fill={c0} radius={[4,4,0,0]} opacity={0.85} />
              <Bar dataKey={similar.player_name} fill={c1} radius={[4,4,0,0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Normalised line */}
      <div style={sectionStyle}>
        <h3 className="font-display font-800 text-lg mb-1" style={{ color: 'var(--text)' }}>
          Full Profile Comparison
          <span className="font-mono font-400 text-xs ml-3" style={{ color: 'var(--text-dim)' }}>
            (values normalised 0–100)
          </span>
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>
          Each stat shown relative to its expected maximum for a tournament
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={lineData} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="stat" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Barlow' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
            <YAxis domain={[0,100]} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(v) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v}</span>} />
            <Line dataKey={source.player_name}  stroke={c0} strokeWidth={2} dot={{ fill: c0, r: 3 }} activeDot={{ r: 5 }} />
            <Line dataKey={similar.player_name} stroke={c1} strokeWidth={2} dot={{ fill: c1, r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3: Defending bar */}
      <div style={sectionStyle}>
        <h3 className="font-display font-800 text-lg mb-4" style={{ color: 'var(--text)' }}>
          Defensive &amp; General Stats
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={[
              { stat: 'Minutes',    [source.player_name]: source.minutes_played,    [similar.player_name]: similar.minutes_played },
              { stat: 'Pass %',     [source.player_name]: source.pass_completion_pct,[similar.player_name]: similar.pass_completion_pct },
              { stat: 'Touches',    [source.player_name]: source.total_touches,      [similar.player_name]: similar.total_touches },
              { stat: 'Recoveries',[source.player_name]: source.ball_recoveries,     [similar.player_name]: similar.ball_recoveries },
              { stat: 'Intercepts',[source.player_name]: source.interceptions,       [similar.player_name]: similar.interceptions },
              { stat: 'Aerials',   [source.player_name]: source.aerials_won,         [similar.player_name]: similar.aerials_won },
            ]}
            margin={{ top: 10, right: 10, bottom: 10, left: -10 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="stat" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Barlow', fontWeight: 600 }} axisLine={false} tickLine={false} width={70} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(v) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v}</span>} />
            <Bar dataKey={source.player_name}  fill={c0} radius={[0,4,4,0]} opacity={0.85} />
            <Bar dataKey={similar.player_name} fill={c1} radius={[0,4,4,0]} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Stat row ──────────────────────────────────────────────────────────────────
function StatCompRow({ stat, source, similar }: { stat: typeof ALL_STATS[number]; source: any; similar: any }) {
  const sv = source[stat.key]  ?? 0;
  const mv = similar[stat.key] ?? 0;
  const diff = mv - sv;
  const accent = CAT_ACCENT[stat.category];
  const display = (v: any) => v != null ? (stat.unit === '%' ? `${v}%` : v) : '—';

  return (
    <div className="grid grid-cols-3 items-center gap-3 py-2.5 border-b text-sm" style={{ borderColor: 'var(--border)' }}>
      {/* Source */}
      <div className="text-right font-mono font-700" style={{ color: 'var(--text)' }}>
        {display(source[stat.key])}
      </div>
      {/* Label */}
      <div className="text-center">
        <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: accent }}>
          {stat.label}
        </span>
        {diff !== 0 && (
          <div className="text-[10px] font-mono mt-0.5" style={{ color: diff > 0 ? 'var(--win)' : 'var(--lose)' }}>
            {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
          </div>
        )}
      </div>
      {/* Similar */}
      <div className="text-left font-mono font-700" style={{ color: diff > 0 ? 'var(--win)' : diff < 0 ? 'var(--lose)' : 'var(--text)' }}>
        {display(similar[stat.key])}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SimilarPlayers() {
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get('playerName') || 'Player';
  const playerId   = searchParams.get('playerId');
  const filtersParam = searchParams.get('filters') || '';
  const activeFilters = filtersParam ? filtersParam.split(',') : [];

  const similarList = Object.values(MOCK_SIMILAR);
  const [selectedId, setSelectedId] = useState<string>(Object.keys(MOCK_SIMILAR)[0]);
  const selectedPlayer = MOCK_SIMILAR[selectedId];
  const dropdownId = useId();

  // Source player: use mock but name it after the actual player
  const source = { ...SOURCE_MOCK, player_name: playerName, player_id: playerId ? Number(playerId) : 0 };

  return (
    <div className="w-full pb-16 min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-6xl mx-auto px-6 pt-8 mb-6">
        <ol className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <li><Link to="/" className="hover:text-[--accent] transition-colors font-600">Dashboard</Link></li>
          <li aria-hidden>/</li>
          {playerId && (
            <>
              <li>
                <Link to={`/player/${playerId}`} className="hover:text-[--accent] transition-colors font-600">
                  {playerName}
                </Link>
              </li>
              <li aria-hidden>/</li>
            </>
          )}
          <li className="font-600" style={{ color: 'var(--text)' }} aria-current="page">Similar Players</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 mb-8">
        <p className="font-mono text-xs tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
          SIMILARITY ANALYSIS
        </p>
        <h1 className="font-display font-900 text-5xl sm:text-6xl leading-none tracking-tight mb-3" style={{ color: 'var(--text)' }}>
          Similar Players
        </h1>
        <p className="text-base" style={{ color: 'var(--text-muted)' }}>
          Comparison with <span className="font-700" style={{ color: 'var(--text)' }}>{playerName}</span> · {similarList.length} profiles found
        </p>

        {/* Mock notice */}
        <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl border inline-flex" style={{ background: 'var(--gold-dim)', borderColor: 'rgba(255,201,71,0.25)' }}>
          <span aria-hidden style={{ color: 'var(--gold)' }}>🔧</span>
          <p className="text-sm font-600" style={{ color: 'var(--gold)' }}>
            Mock data — real similarity logic will be integrated into the backend.
          </p>
        </div>
      </div>

      {/* Main panel */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="card p-6 sm:p-8 mb-8">
          {/* Two-column header: source | similar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 pb-8 border-b" style={{ borderColor: 'var(--border)' }}>
            {/* Source player */}
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center font-display font-900 text-2xl select-none"
                style={{ background: 'rgba(57,255,20,0.15)', color: 'var(--accent)' }}
                aria-hidden
              >
                {playerName[0]}
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--accent)' }}>Selected player</p>
                <p className="font-display font-900 text-2xl leading-tight" style={{ color: 'var(--text)' }}>{playerName}</p>
                {playerId && (
                  <Link to={`/player/${playerId}`} className="text-xs font-600 hover:text-[--accent] transition-colors" style={{ color: 'var(--text-muted)' }}>
                    View Profile →
                  </Link>
                )}
              </div>
            </div>

            {/* Similar player selector */}
            <div>
              <label htmlFor={dropdownId} className="block font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--text-dim)' }}>
                Select similar player to compare
              </label>
              <select
                id={dropdownId}
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                className="input"
                aria-label="Select similar player to compare"
              >
                {similarList.map(p => (
                  <option key={p.player_id} value={String(p.player_id)}>
                    {p.player_name} ({p.source_team_name}) — {Math.round(p.similarity_score * 100)}% match
                  </option>
                ))}
              </select>

              {/* Selected player card preview */}
              {selectedPlayer && (
                <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--surface2)' }}>
                  {getFlagUrl(selectedPlayer.source_team_name) ? (
                    <img src={getFlagUrl(selectedPlayer.source_team_name)!} alt="" className="w-6 h-4.5 object-cover rounded-sm shadow-sm" aria-hidden />
                  ) : (
                    <span className="text-xs font-mono font-700 bg-[--surface] px-1.5 py-0.5 rounded text-[--text-muted]" aria-hidden>
                      {selectedPlayer.source_team_name?.substring(0,3).toUpperCase()}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-800 text-base leading-tight truncate" style={{ color: 'var(--text)' }}>
                      {selectedPlayer.player_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                        {selectedPlayer.source_team_name} · {selectedPlayer.primary_role?.replace(/_/g,' ')}
                      </p>
                      <ScoreBadge score={selectedPlayer.similarity_score} />
                    </div>
                    <div className="mt-2">
                      <ScoreBar score={selectedPlayer.similarity_score} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active filters */}
          {activeFilters.length > 0 && (
            <div className="mb-8">
              <p className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{ color: 'var(--text-dim)' }}>Statistics used for search</p>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map(f => {
                  const stat = ALL_STATS.find(s => s.key === f);
                  const accent = stat ? CAT_ACCENT[stat.category] : 'var(--text-muted)';
                  return (
                    <span key={f} className="tag" style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}40` }}>
                      {stat?.label ?? f}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Charts */}
          {selectedPlayer && (
            <>
              <ChartsSection source={source} similar={selectedPlayer} />

              {/* Stat-by-stat table */}
              <div className="mt-8">
                <div className="grid grid-cols-3 mb-3">
                  <div className="text-right font-display font-800 text-base" style={{ color: 'var(--accent)' }}>{playerName}</div>
                  <div className="text-center font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>Stat</div>
                  <div className="text-left font-display font-800 text-base" style={{ color: 'var(--blue)' }}>{selectedPlayer.player_name}</div>
                </div>
                {ALL_STATS.map(stat => (
                  <StatCompRow key={stat.key} stat={stat} source={source} similar={selectedPlayer} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* List of all similar players */}
        <h2 className="font-display font-900 text-2xl mb-4" style={{ color: 'var(--text)' }}>All similar profiles</h2>
        <div className="space-y-3" role="list" aria-label="Similar players list">
          {similarList.map((player, idx) => {
            const isSelected = String(player.player_id) === selectedId;
            const flagUrl = getFlagUrl(player.source_team_name);
            return (
              <div
                key={player.player_id}
                role="listitem"
                className="card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all cursor-pointer"
                style={isSelected ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' } : {}}
                onClick={() => setSelectedId(String(player.player_id))}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelectedId(String(player.player_id))}
                aria-selected={isSelected}
                aria-label={`${player.player_name}, ${Math.round(player.similarity_score * 100)}% similarity`}
              >
                <span className="font-mono font-700 text-xl w-8 text-center" style={{ color: 'var(--text-dim)' }} aria-hidden>
                  {idx + 1}
                </span>
                
                {flagUrl ? (
                  <img src={flagUrl} alt="" className="w-8 h-6 object-cover rounded shadow-sm shrink-0" aria-hidden />
                ) : (
                  <span className="text-xs font-mono font-700 bg-[--surface2] px-2 py-1 rounded text-[--text-muted] shrink-0" aria-hidden>
                    {player.source_team_name?.substring(0,3).toUpperCase()}
                  </span>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-display font-900 text-xl" style={{ color: isSelected ? 'var(--accent)' : 'var(--text)' }}>
                      {player.player_name}
                    </span>
                    <ScoreBadge score={player.similarity_score} />
                  </div>
                  <p className="text-xs capitalize flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <span>{player.source_team_name}</span>
                    <span aria-hidden>·</span>
                    <span>{player.primary_role?.replace(/_/g,' ')}</span>
                    <span aria-hidden>·</span>
                    <span>Age {player.age}</span>
                  </p>
                  <div className="mt-2 max-w-xs">
                    <ScoreBar score={player.similarity_score} />
                  </div>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <Link
                    to={`/player/${player.player_id}`}
                    className="btn btn-ghost text-xs px-3 py-1.5"
                    aria-label={`View profile of ${player.player_name}`}
                    onClick={e => e.stopPropagation()}
                  >
                    Profile →
                  </Link>
                  <button
                    className="btn text-xs px-3 py-1.5"
                    style={isSelected
                      ? { background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }
                      : { background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                    }
                    onClick={e => { e.stopPropagation(); setSelectedId(String(player.player_id)); }}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? 'Currently comparing' : 'Compare'} ${player.player_name}`}
                  >
                    {isSelected ? '✓ Comparing' : 'Compare'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
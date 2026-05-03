import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpaceControlIndex {
  player: string; team: string; primary_role: string; macro_role: string;
  minutes_played: number; coverage_pct: number;
  idx__PROGRESSION: number; idx__DANGEROUSNESS: number;
  idx__RECEPTION: number; idx__GRAVITY: number;
  pct__lb_geom_per90: number; pct__lb_quality_per90: number;
  pct__lb_epv_per90: number; pct__successful_hull_penetrations_per90: number;
  pct__defenders_bypassed_mean: number; pct__epv_added_per90: number;
  pct__epv_penetration_per90: number; pct__epv_inside_circ_per90: number;
  pct__between_lines_pct: number; pct__successful_hull_exits_per90: number;
  pct__pressure_resistance_pct: number; pct__gravity_proximity_pct: number;
  pct__gravity_hull_pct: number; pct__gravity_abs_m: number;
  similarity_score?: number | null;
}

export interface SpaceControlAggregated {
  player: string; team: string; primary_role: string; macro_role: string;
  minutes_played: number; passes_total: number; passes_op: number; passes_analysed: number;
  coverage_pct: number; lb_geom: number; lb_quality: number; lb_epv: number;
  hull_penetration_n: number; defenders_bypassed_mean: number;
  lb_geom_per90: number; lb_quality_per90: number; lb_epv_per90: number;
  successful_hull_penetrations_per90: number;
  lb_geom_pct: number; lb_quality_pct: number; lb_epv_pct: number; hull_penetration_pct: number;
  epv_added_sum: number; epv_added_mean: number; epv_penetration_sum: number;
  epv_penetration_mean: number; epv_inside_circ_sum: number; epv_inside_circ_mean: number;
  penetration_n: number; inside_circ_n: number;
  epv_added_per90: number; epv_penetration_per90: number; epv_inside_circ_per90: number;
  penetration_per90: number; inside_circ_per90: number;
  between_lines_n: number; hull_exit_n: number; pressure_resistance_n: number;
  between_lines_per90: number; successful_hull_exits_per90: number;
  between_lines_pct: number; hull_exit_pct: number; pressure_resistance_pct: number;
  gravity_n: number; gravity_directional_n: number; gravity_directional_m: number;
  gravity_proximity_pct: number; gravity_hull_pct: number; gravity_composite_pct: number;
}

export interface SpaceControlPayload {
  indices: SpaceControlIndex | null;
  aggregated: SpaceControlAggregated | null;
}

// ── Hook: single player ───────────────────────────────────────────────────────

export function usePlayerSpaceControl(playerId: string | undefined) {
  const [data, setData] = useState<SpaceControlPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!playerId) { setLoading(false); return; }
    setLoading(true);
    setError(false);
    fetch(`${API_BASE_URL}/players/${playerId}/space-control`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((d: SpaceControlPayload) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [playerId]);

  return { data, loading, error };
}

// ── Hook: similar players ─────────────────────────────────────────────────────

export function useSimilarPlayers(
  macroRole: string | undefined,
  excludePlayer: string | undefined,
) {
  const [players, setPlayers] = useState<SpaceControlIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!macroRole) {
      setLoading(false);
      setError('no_macro_role');
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ macro_role: macroRole });
    if (excludePlayer) params.set('exclude_player', excludePlayer);

    const controller = new AbortController();

    // Separate flag so we can distinguish a real timeout from the
    // immediate cleanup abort that React StrictMode triggers in development.
    // StrictMode mounts every component twice: mount → cleanup → mount again.
    // The cleanup calls controller.abort() before the first fetch resolves,
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);

    fetch(`${API_BASE_URL}/space-control/similar?${params}`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) {
          return r.json().then((body: any) => {
            throw new Error(body?.hint ?? `HTTP ${r.status}: ${body?.error ?? r.statusText}`);
          });
        }
        return r.json();
      })
      .then((d: SpaceControlIndex[]) => {
        clearTimeout(timeout);
        setPlayers(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch((err: Error) => {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          // Only a real error if we explicitly triggered the timeout.
          // If timedOut is false this is a StrictMode cleanup abort — ignore it
          // silently; the second mount will re-run the effect and fetch again.
          if (timedOut) {
            setError('timeout');
            setLoading(false);
          }
          return;
        }
        setError(err.message ?? 'fetch_error');
        setLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort(); // safe: if already resolved this is a no-op
    };
  }, [macroRole, excludePlayer]);

  return { players, loading, error };
}
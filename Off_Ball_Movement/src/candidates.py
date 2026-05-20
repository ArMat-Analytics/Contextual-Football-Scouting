"""
candidates.py — H3 Off-Ball Movement
Receiver resolution (v2, bracket interpolation) + xPass feature building.

H2 modules are loaded via config.load_h2_package() which registers
Decision_Quality/src/ under the private name `_dq_src`, resolving
all relative imports without colliding with Off_Ball_Movement/src/.
"""

from __future__ import annotations

import logging
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import linear_sum_assignment

# ── Ensure Off_Ball_Movement/ is on sys.path ──────────────────────────────────
_H3_DIR = Path(__file__).resolve().parents[1]
if str(_H3_DIR) not in sys.path:
    sys.path.insert(0, str(_H3_DIR))

from src.config import (
    H1_SRC,
    COMPETITION_ID, SEASON_ID,
    WINDOW_SECONDS, CONF_THR_M,
    CANDIDATES_PARQUET, CACHE_DIR,
    H2_ALTERNATIVES, H2_XPASS_MODEL, H2_CORPUS_CACHE,
    load_h2_package,
    X_SCALE, Y_SCALE
)

# ── H1 import — EPV grid (flat layout, already on sys.path via config) ────────
from epv_pipeline import EPVPipeline  # noqa: E402

# ── H2 imports via collision-safe loader ──────────────────────────────────────
# Mirrors H2 Section 8.1:
#   alts = h2_features.features_for_all_candidates(dq_corpus_fr)
#   alts['xpass'] = xpass_model.predict_proba(alts)
_h2          = load_h2_package()
h2_features  = _h2.features
h2_xpass     = _h2.xpass

# Alias that permits joblib to deserialize the xPass model saved in H2
sys.modules['src.xpass'] = h2_xpass
sys.modules['src.features'] = h2_features
# -----------------------------

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Receiver resolver v2 — bracket interpolation
# ─────────────────────────────────────────────────────────────────────────────

def _event_seconds(row) -> float:
    """Absolute match time in seconds (minute is monotonic across periods)."""
    return float(row["minute"]) * 60.0 + float(row["second"])


def _estimate_team_positions(
    events: pd.DataFrame,
    team: str,
    sender: str,
    t_pass: float,
    pass_idx: int,
    W: float = WINDOW_SECONDS,
    mode: str = "bracket",
) -> dict[str, np.ndarray]:
    """Estimate each teammate's position at the instant of the pass.

    Parameters
    ----------
    events   : full match event DataFrame from statsbombpy.
    team     : attacking team name.
    sender   : name of the player who has the ball (excluded from candidates).
    t_pass   : absolute time of the pass in seconds.
    pass_idx : integer index of the pass row in `events`.
    W        : max staleness window in seconds; players outside ±W are excluded.
    mode     : 'bracket' (v2, interpolate prev<->next) or
               'backward' (v1 baseline, last-known-location only).

    Returns
    -------
    dict mapping player name -> np.array([x, y]) for reliable positions only.
    """
    team_ev = events[(events["team"] == team) & (events["location"].notna())]
    out: dict[str, np.ndarray] = {}

    for player in team_ev["player"].dropna().unique():
        if player == sender:
            continue

        ev_p = team_ev[team_ev["player"] == player]
        prev = ev_p.iloc[[i for i in range(len(ev_p)) if ev_p.index[i] < pass_idx]][-1:] \
               if (ev_p.index < pass_idx).any() else ev_p.iloc[0:0]
        nxt  = ev_p.iloc[[i for i in range(len(ev_p)) if ev_p.index[i] > pass_idx]][:1] \
               if (ev_p.index > pass_idx).any() else ev_p.iloc[0:0]

        has_prev = len(prev) > 0
        has_next = (len(nxt) > 0) and (mode == "bracket")

        loc = None
        if has_prev and has_next:
            tp = _event_seconds(prev.iloc[0])
            tn = _event_seconds(nxt.iloc[0])
            lp = np.array(prev.iloc[0]["location"], dtype=float)
            ln = np.array(nxt.iloc[0]["location"], dtype=float)
            if min(t_pass - tp, tn - t_pass) <= W and tn > tp:
                frac = np.clip((t_pass - tp) / (tn - tp), 0.0, 1.0)
                loc  = lp + frac * (ln - lp)
        elif has_prev:
            tp = _event_seconds(prev.iloc[0])
            if (t_pass - tp) <= W:
                loc = np.array(prev.iloc[0]["location"], dtype=float)
        elif has_next:
            tn = _event_seconds(nxt.iloc[0])
            if (tn - t_pass) <= W:
                loc = np.array(nxt.iloc[0]["location"], dtype=float)

        if loc is not None:
            out[player] = loc

    return out


def resolve_receiver(
    events: pd.DataFrame,
    frames: pd.DataFrame,
    event_col: str,
    pass_uuid: str,
    W: float = WINDOW_SECONDS,
    conf_thr: float = CONF_THR_M,
    mode: str = "bracket",
) -> tuple[pd.DataFrame | None, str | None]:
    """Assign names to anonymous dots in a freeze frame.

    Returns
    -------
    (DataFrame with columns predicted_player / match_residual_m / confident /
     dist_to_pass_end,  name of the predicted spatial receiver)
    or (None, None) if the frame is unusable.
    """
    prow = events[events["id"] == pass_uuid]
    if prow.shape[0] == 0:
        return None, None
    prow = prow.iloc[0]
    end_loc = prow.get("pass_end_location")
    if end_loc is None:
        return None, None

    team, sender = prow["team"], prow["player"]
    pass_idx = events.index[events["id"] == pass_uuid][0]
    t_pass   = _event_seconds(prow)

    fr   = frames[frames[event_col] == pass_uuid]
    dots = fr[
        (fr["teammate"] == True) &
        (fr["actor"]    == False) &
        (fr["keeper"]   == False)
    ].copy()
    if dots.shape[0] == 0:
        return None, None

    named = _estimate_team_positions(events, team, sender, t_pass, pass_idx,
                                     W=W, mode=mode)
    if not named:
        return None, None

    names = list(named.keys())
    known = np.array([named[n] for n in names])
    anon  = np.array(dots["location"].tolist(), dtype=float)

    cost             = np.linalg.norm(known[:, None, :] - anon[None, :, :], axis=2)
    row_ind, col_ind = linear_sum_assignment(cost)

    dots = dots.reset_index(drop=True)
    dots["predicted_player"] = "Unknown"
    dots["match_residual_m"] = np.nan
    for r, c in zip(row_ind, col_ind):
        dots.loc[c, "predicted_player"] = names[r]
        dots.loc[c, "match_residual_m"] = cost[r, c]
    dots["confident"] = dots["match_residual_m"] <= conf_thr

    end_x, end_y = float(end_loc[0]), float(end_loc[1])
    dots["dist_to_pass_end"] = dots["location"].apply(
        lambda l: float(np.hypot(l[0] - end_x, l[1] - end_y))
    )
    dots = dots.sort_values("dist_to_pass_end").reset_index(drop=True)
    return dots, dots.iloc[0]["predicted_player"]


# ─────────────────────────────────────────────────────────────────────────────
# H2 xPass scoring (spec §6 reuse — H2 Section 8.1)
# ─────────────────────────────────────────────────────────────────────────────

def _load_h2_xpass_model():
    """Load H2's calibrated GBM (persisted by H2 Section 6)."""
    import joblib
    if not H2_XPASS_MODEL.exists():
        raise FileNotFoundError(
            f"H2 model not found: {H2_XPASS_MODEL}\n"
            "Run H2 notebook Section 6 (fit_calibrated, save=True) first."
        )
    return joblib.load(H2_XPASS_MODEL)


def _score_from_corpus(resolved_ids: set[str], xpass_model) -> pd.DataFrame:
    """Call H2's features_for_all_candidates + predict_proba directly.

    Used when H2's alternatives.parquet has not yet been built.
    Identical to H2 Section 8.1.
    """
    if not H2_CORPUS_CACHE.exists():
        raise FileNotFoundError(
            f"H2 corpus cache not found: {H2_CORPUS_CACHE}\n"
            "Run H2 notebook Sections 1-2 to build it."
        )
    corpus = pd.read_parquet(H2_CORPUS_CACHE)
    subset = corpus[corpus["event_id"].isin(resolved_ids)].copy()
    if subset.shape[0] == 0:
        return pd.DataFrame(columns=["event_id", "end_x_m", "end_y_m", "xpass"])

    alts = h2_features.features_for_all_candidates(subset)   # H2 Section 8.1
    alts["xpass"] = xpass_model.predict_proba(alts)           # H2 Section 8.1

    keep = [c for c in ["event_id", "target_x_m", "target_y_m", "xpass"] if c in alts.columns]
    return alts[keep].copy()


# ─────────────────────────────────────────────────────────────────────────────
# Frame loading (loader pattern from H1's line_breaker.py)
# ─────────────────────────────────────────────────────────────────────────────

def _load_frames(match_id: int) -> tuple[pd.DataFrame, pd.DataFrame, str]:
    """Return (events, frames, event_col) for one match.

    `frames` is always a plain pd.DataFrame — never a raw list/dict.
    """
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from statsbombpy import sb

    events     = sb.events(match_id=match_id)
    frames_raw = sb.frames(match_id=match_id, fmt="dict")

    if not frames_raw:
        return events, pd.DataFrame(), "event_uuid"

    frames_list = frames_raw if isinstance(frames_raw, list) else list(frames_raw)
    frames: pd.DataFrame = pd.DataFrame(frames_list)
    frames = frames.explode("freeze_frame", ignore_index=True)
    frames = pd.concat(
        [frames.drop(columns=["freeze_frame"]),
         pd.json_normalize(frames["freeze_frame"])],
        axis=1,
    )
    ec = "event_uuid" if "event_uuid" in frames.columns else "id"
    return events, frames, ec


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    """Run the full candidates pipeline over all 51 Euro 2024 matches.

    Writes data/off_ball_candidates.parquet.
    Schema: event_id, match_id, player, team, minute, second,
    sender, sender_x_m, sender_y_m, target_x_m, target_y_m,
    match_residual_m, confident, dist_to_pass_end, xpass.
    """
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from statsbombpy import sb

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s  %(levelname)s  %(message)s")

    CANDIDATES_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    xpass_model = _load_h2_xpass_model()

    if H2_ALTERNATIVES.exists():
        h2_alts: pd.DataFrame = pd.read_parquet(H2_ALTERNATIVES)
        h2_alts["_tx_r"] = h2_alts["target_x_m"].round(1)
        h2_alts["_ty_r"] = h2_alts["target_y_m"].round(1)
        logger.info("H2 alternatives.parquet loaded (%d rows).", len(h2_alts))
        use_prebuilt = True
    else:
        h2_alts = pd.DataFrame()
        use_prebuilt = False
        logger.info("H2 alternatives.parquet absent — calling features + predict_proba directly.")

    matches = sb.matches(competition_id=COMPETITION_ID, season_id=SEASON_ID)
    logger.info("Euro 2024 — %d matches to process", len(matches))

    all_rows: list[dict] = []
    for i, (_, m) in enumerate(matches.iterrows(), 1):
        mid  = m["match_id"]
        name = f"{m['home_team']} vs {m['away_team']}"
        logger.info("[%d/%d] %s  (id=%s)", i, len(matches), name, mid)
        try:
            events, frames, event_col = _load_frames(mid)
            if frames.shape[0] == 0:
                logger.warning("  No 360 frames — skipping")
                continue

            passes = events[
                (events["type"] == "Pass") &
                (events["pass_end_location"].notna()) &
                (events["id"].isin(frames[event_col].unique())) &
                (events["position"] != "Goalkeeper")
            ]

            match_rows: list[dict] = []
            for _, p in passes.iterrows():
                dots, _ = resolve_receiver(events, frames, event_col, p["id"])
                if dots is None:
                    continue
                conf_dots = dots[dots["confident"]].copy()
                if conf_dots.shape[0] == 0:
                    continue

                sx = float(p["location"][0]) * X_SCALE
                sy = float(p["location"][1]) * Y_SCALE
                for _, dot in conf_dots.iterrows():
                    tx = float(dot["location"][0]) * X_SCALE
                    ty = float(dot["location"][1]) * Y_SCALE
                    match_rows.append({
                        "event_id"         : p["id"],
                        "match_id"         : mid,
                        "player"           : dot["predicted_player"],
                        "team"             : p["team"],
                        "minute"           : p["minute"],
                        "second"           : p["second"],
                        "sender"           : p["player"],
                        "sender_x_m"       : sx,
                        "sender_y_m"       : sy,
                        "target_x_m"       : tx,
                        "target_y_m"       : ty,
                        "match_residual_m" : dot["match_residual_m"],
                        "confident"        : dot["confident"],
                        "dist_to_pass_end" : dot["dist_to_pass_end"],
                        "received"         : False,
                    })

            if not match_rows:
                continue

            df_match = pd.DataFrame(match_rows)
            resolved_ids = set(df_match["event_id"].unique())
            df_match["_tx_r"] = df_match["target_x_m"].round(1)
            df_match["_ty_r"] = df_match["target_y_m"].round(1)

            if use_prebuilt:
                h2_sub = h2_alts[h2_alts["event_id"].isin(resolved_ids)]
                df_match = df_match.merge(
                    h2_sub[["event_id", "_tx_r", "_ty_r", "xpass"]],
                    on=["event_id", "_tx_r", "_ty_r"], how="left",
                )
            else:
                scored = _score_from_corpus(resolved_ids, xpass_model)
                scored["_tx_r"] = scored["target_x_m"].round(1)
                scored["_ty_r"] = scored["target_y_m"].round(1)
                df_match = df_match.merge(
                    scored[["event_id", "_tx_r", "_ty_r", "xpass"]],
                    on=["event_id", "_tx_r", "_ty_r"], how="left",
                )

            df_match = df_match.drop(columns=["_tx_r", "_ty_r"], errors="ignore")
            df_match = df_match[df_match["xpass"].notna()].copy()
            all_rows.extend(df_match.to_dict("records"))
            logger.info("  %d confident candidate rows added", len(df_match))

        except Exception as exc:
            logger.error("  Error on match %s: %s", mid, exc, exc_info=True)

    if not all_rows:
        logger.error("No candidate rows produced.")
        return

    out = pd.DataFrame(all_rows)
    out.to_parquet(CANDIDATES_PARQUET, index=False)
    logger.info(
        "Saved %s  (%d rows, %d events, %d players)",
        CANDIDATES_PARQUET, len(out),
        out["event_id"].nunique(), out["player"].nunique(),
    )

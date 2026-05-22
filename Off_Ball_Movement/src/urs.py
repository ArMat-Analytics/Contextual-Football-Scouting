"""
urs.py — H3 Off-Ball Movement
URS (Uncapitalized Run Score) aggregation and validation.

Formula — event level (spec §5.3):
    URS_i = OBSO_i * (1 - received_i) * EPV(loc_i)

Aggregation:
    URS_per90_p = sum(URS_i) / minutes_p * 90
"""

from __future__ import annotations

import logging
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

_H3_DIR = Path(__file__).resolve().parents[1]
if str(_H3_DIR) not in sys.path:
    sys.path.insert(0, str(_H3_DIR))

from src.config import (
    COMPETITION_ID, SEASON_ID,
    RECEIVED_WINDOW_S, MIN_MINUTES,
    OBSO_PARQUET, URS_CSV,
    PITCH_LENGTH, PITCH_WIDTH,
    X_SCALE, Y_SCALE,
    H1_PLAYER_TOTALS,
    map_role,
    load_h2_package,
)

from epv_pipeline import EPVPipeline  # H1 — flat layout

logger = logging.getLogger(__name__)


def _flag_received(obso: pd.DataFrame,
                   ev_cache: dict[int, pd.DataFrame]) -> pd.Series:
    """Flag whether each candidate actually received the ball.

    received_i = 1 if the next ball-touch within RECEIVED_WINDOW_S seconds
    belongs to this candidate.
    """
    received = pd.Series(False, index=obso.index)
    for match_id, grp in obso.groupby("match_id"):
        if match_id not in ev_cache:
            continue
        ev = ev_cache[match_id].copy()
        ev["t_abs"] = ev["minute"].astype(float) * 60.0 + ev["second"].astype(float)
        for idx, row in grp.iterrows():
            t0   = float(row["minute"]) * 60.0 + float(row["second"])
            cand = row["player"]
            future = ev[(ev["t_abs"] > t0) & (ev["t_abs"] <= t0 + RECEIVED_WINDOW_S)]
            if future.shape[0] > 0 and future.iloc[0].get("player") == cand:
                received.at[idx] = True
    return received


def _player_minutes(matches: pd.DataFrame) -> pd.DataFrame:
    """Return (player, team, primary_role, minutes_played).

    Reads H1's Euro2024_Player_Totals_Distances_Roles.csv first (spec §6).
    Falls back to StatsBomb lineups if the CSV is absent.
    """
    if H1_PLAYER_TOTALS.exists():
        df = pd.read_csv(H1_PLAYER_TOTALS)
        return df[["player", "team", "primary_role", "minutes_played"]].copy()

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from statsbombpy import sb

    rows = []
    for _, m in matches.iterrows():
        try:
            lineups = sb.lineups(match_id=m["match_id"])
            for team, lu in lineups.items():
                for _, player in lu.iterrows():
                    def _pos_minutes(pos: dict) -> int:
                        fp = pos.get("from_period") or 1
                        tp = pos.get("to_period")   or fp   # None = until end of match
                        return max(0, tp - fp + 1) * 45     # StatsBomb periods are 45 mins each

                    mins = sum(_pos_minutes(pos) for pos in player.get("positions", []))

                    rows.append({
                        "player"        : player["player_name"],
                        "team"          : team,
                        "primary_role"  : (player.get("positions") or [{}])[0].get("position", ""),
                        "minutes_played": mins,
                    })
        except Exception:
            pass
    return (pd.DataFrame(rows)
              .groupby(["player", "team"], as_index=False)
              .agg(primary_role=("primary_role", "first"),
                   minutes_played=("minutes_played", "sum")))


def main() -> None:
    """Aggregate OBSO into per-player URS_per90 and save player_urs_aggregated.csv."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from statsbombpy import sb

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s  %(levelname)s  %(message)s")

    if not OBSO_PARQUET.exists():
        raise FileNotFoundError(f"{OBSO_PARQUET} not found. Run obso.main() first.")

    obso = pd.read_parquet(OBSO_PARQUET)
    logger.info("Loaded %d OBSO rows", len(obso))

    matches = sb.matches(competition_id=COMPETITION_ID, season_id=SEASON_ID)
    ev_cache: dict[int, pd.DataFrame] = {}
    for mid in obso["match_id"].unique():
        try:
            ev_cache[int(mid)] = sb.events(match_id=mid)
        except Exception:
            pass

    obso["received"] = _flag_received(obso, ev_cache)
    logger.info("received=True: %d / %d  (%.1f%%)",
                int(obso["received"].sum()), len(obso), 100 * obso["received"].mean())

    if "epv_target" not in obso.columns:
        epv_pipe = EPVPipeline()
        obso["epv_target"] = [
            float(epv_pipe.epv_at(r["target_x_m"], r["target_y_m"]))
            for _, r in obso.iterrows()
        ]

    obso["urs"] = obso["obso"] * (1 - obso["received"].astype(float)) * obso["epv_target"]

    agg = (
        obso.groupby("player")
        .agg(
            team                   = ("team",     "first"),
            urs_sum                = ("urs",      "sum"),
            obso_mean              = ("obso",     "mean"),
            n_confident_candidates = ("obso",     "count"),
            n_received             = ("received", "sum"),
        )
        .reset_index()
    )
    agg["receiver_conf_rate"] = agg["n_received"] / agg["n_confident_candidates"]

    mins_df = _player_minutes(matches)
    agg = agg.merge(mins_df, on=["player", "team"], how="left")
    agg["macro_role"] = agg["primary_role"].fillna("").apply(map_role)

    eligible = agg["minutes_played"].notna() & (agg["minutes_played"] >= MIN_MINUTES)
    agg["urs_per90"] = np.where(
        eligible,
        agg["urs_sum"] / agg["minutes_played"].replace(0, np.nan) * 90,
        np.nan,
    )

    agg["urs_pct_within_role"] = np.nan
    for role, grp in agg[eligible].groupby("macro_role"):
        valid = grp["urs_per90"].notna()
        if valid.sum() < 3:
            continue
        pct = grp.loc[valid, "urs_per90"].rank(pct=True) * 100
        agg.loc[pct.index, "urs_pct_within_role"] = pct.values

    agg = agg.sort_values("urs_per90", ascending=False, na_position="last")

    # --- START KNOWN NAME MAPPING ---
    logger.info("Mapping full names to nicknames (may take a few seconds)...")
    name_map = {}
    for mid in obso["match_id"].unique():
        try:
            lineups = sb.lineups(match_id=mid)
            for team, lu in lineups.items():
                for _, p in lu.iterrows():
                    full_name = p["player_name"]
                    nickname = p.get("player_nickname")
                    # If a nickname exists, use it. Otherwise keep the full name.
                    if pd.notna(nickname) and nickname:
                        name_map[full_name] = nickname
                    elif full_name not in name_map:
                        name_map[full_name] = full_name
        except Exception:
            pass

    # Apply mapping to the player column
    agg["player"] = agg["player"].map(lambda x: name_map.get(x, x))
    # --- END KNOWN NAME MAPPING ---

    URS_CSV.parent.mkdir(parents=True, exist_ok=True)
    agg.to_csv(URS_CSV, index=False)
    logger.info("Saved %s  (%d eligible players)", URS_CSV, int(eligible.sum()))


def show_uncapitalised_runs(player: str, n: int = 4) -> None:
    """Plot top-N highest-URS events for `player` (style: H1 show_line_breakers)."""
    import matplotlib.pyplot as plt
    import matplotlib.cm as cm
    import matplotlib.colors as mcolors
    from scipy.spatial import ConvexHull

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from statsbombpy import sb

    if not OBSO_PARQUET.exists():
        logger.error("%s not found — run obso.main() first.", OBSO_PARQUET)
        return

    obso = pd.read_parquet(OBSO_PARQUET)
    if "urs" not in obso.columns:
        obso["urs"] = (obso["obso"]
                       * (1 - obso.get("received", pd.Series(False, index=obso.index)).astype(float))
                       * obso.get("epv_target", pd.Series(1.0, index=obso.index)))

    player_rows = obso[(obso["player"] == player) & obso["urs"].notna()].nlargest(n, "urs")
    if player_rows.shape[0] == 0:
        logger.warning("No rows for player: %s", player)
        return

    ncols = min(n, len(player_rows))
    fig, axes = plt.subplots(1, ncols, figsize=(6 * ncols, 6))
    if ncols == 1:
        axes = [axes]

    norm = mcolors.Normalize(vmin=0, vmax=obso["obso"].quantile(0.95))
    cmap = cm.get_cmap("YlOrRd")

    for ax, (_, row) in zip(axes, player_rows.iterrows()):
        events     = sb.events(match_id=row["match_id"])
        frames_raw = sb.frames(match_id=row["match_id"], fmt="dict")
        if not frames_raw:
            ax.set_title("No frame"); continue

        frames_list = frames_raw if isinstance(frames_raw, list) else list(frames_raw)
        frames: pd.DataFrame = pd.DataFrame(frames_list)
        frames = frames.explode("freeze_frame", ignore_index=True)
        frames = pd.concat(
            [frames.drop(columns=["freeze_frame"]),
             pd.json_normalize(frames["freeze_frame"])],
            axis=1,
        )
        event_col = "event_uuid" if "event_uuid" in frames.columns else "id"
        prow = events[events["id"] == row["event_id"]]
        if prow.shape[0] == 0:
            continue
        prow = prow.iloc[0]
        fr   = frames[frames[event_col] == row["event_id"]]

        ax.set_xlim(-3, PITCH_LENGTH + 3)
        ax.set_ylim(-3, PITCH_WIDTH + 3)
        ax.set_aspect("equal")
        _draw_pitch(ax)

        opp_pts = np.array([
            [loc[0] * X_SCALE, loc[1] * Y_SCALE]
            for loc in fr[fr["teammate"] == False]["location"].tolist()
            if loc is not None
        ], dtype=float)
        if opp_pts.shape[0] >= 3:
            try:
                hull = ConvexHull(opp_pts)
                ax.fill(opp_pts[hull.vertices, 0], opp_pts[hull.vertices, 1],
                        alpha=0.15, color="red")
                loop = np.append(hull.vertices, hull.vertices[0])
                ax.plot(opp_pts[loop, 0], opp_pts[loop, 1], "r--", lw=1.2, alpha=0.7)
            except Exception:
                pass

        event_obso = obso[obso["event_id"] == row["event_id"]]
        for _, dot in fr[(fr["teammate"] == True) & (fr["actor"] == False)].iterrows():
            loc = dot["location"]
            if loc is None: continue
            xm, ym = loc[0] * X_SCALE, loc[1] * Y_SCALE
            mr = event_obso[
                (abs(event_obso["target_x_m"] - xm) < 2.0) &
                (abs(event_obso["target_y_m"] - ym) < 2.0)
            ]
            oval = float(mr["obso"].iloc[0]) if mr.shape[0] > 0 else 0.0
            ax.scatter(xm, ym, s=120, color=cmap(norm(oval)),
                       edgecolors="white", linewidths=0.8, zorder=3)

        ax.scatter(row["target_x_m"], row["target_y_m"],
                   s=300, facecolors="none", edgecolors="red", linewidths=3, zorder=5)

        sx, sy = row["sender_x_m"], row["sender_y_m"]
        ax.scatter(sx, sy, s=150, color="cyan", edgecolors="black", linewidths=1.5, zorder=4)
        pend = prow.get("pass_end_location")
        if pend is not None:
            ax.annotate("", xy=(float(pend[0]) * X_SCALE, float(pend[1]) * Y_SCALE),
                        xytext=(sx, sy),
                        arrowprops=dict(arrowstyle="->", color="gold", lw=2))

        ax.set_title(
            f"{row['sender']}  {prow['minute']}'\n"
            f"OBSO={row['obso']:.3f}  PC={row.get('pc_target', float('nan')):.2f}"
            f"  EPV={row.get('epv_target', float('nan')):.3f}\n"
            f"URS={row['urs']:.4f}  candidate: {player.split()[-1]}",
            fontsize=9,
        )

    fig.suptitle(f"Top-{n} uncapitalised runs — {player}", fontsize=13)
    fig.patch.set_facecolor("white")
    plt.tight_layout()
    plt.show()


def _player_minutes_from_lineups(matches: pd.DataFrame) -> pd.DataFrame:
    """Compute minutes played from StatsBomb lineups for a given subset of matches.

    Always uses the StatsBomb API — never the H1 CSV — so it works correctly
    on any subset of matches (e.g. the first or second tournament half).
    """
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from statsbombpy import sb

    rows = []
    for _, m in matches.iterrows():
        try:
            lineups = sb.lineups(match_id=m["match_id"])
            for team, lu in lineups.items():
                for _, player in lu.iterrows():
                    def _pos_minutes(pos: dict) -> int:
                        fp = pos.get("from_period") or 1
                        tp = pos.get("to_period")   or fp   # None = until end of match
                        return max(0, tp - fp + 1) * 45     # StatsBomb periods are 45 mins each

                    mins = sum(_pos_minutes(pos) for pos in player.get("positions", []))

                    rows.append({
                        "player"        : player["player_name"],
                        "team"          : team,
                        "primary_role"  : (player.get("positions") or [{}])[0].get("position", ""),
                        "minutes_played": mins,
                    })
        except Exception:
            pass

    return (pd.DataFrame(rows)
              .groupby(["player", "team"], as_index=False)
              .agg(primary_role=("primary_role", "first"),
                   minutes_played=("minutes_played", "sum")))

def split_half_reliability(min_minutes_per_half: int = 90) -> None:
    """Spearman rho between first-half and second-half URS_per90 rankings."""
    import matplotlib.pyplot as plt

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from statsbombpy import sb

    if not OBSO_PARQUET.exists():
        logger.error("%s not found — run obso.main() first.", OBSO_PARQUET)
        return

    obso    = pd.read_parquet(OBSO_PARQUET)
    matches = sb.matches(competition_id=COMPETITION_ID, season_id=SEASON_ID)
    matches = matches.sort_values("match_date").reset_index(drop=True)
    mid_pt  = len(matches) // 2

    first_ids  = set(matches["match_id"].iloc[:mid_pt].tolist())
    second_ids = set(matches["match_id"].iloc[mid_pt:].tolist())

    if "urs" not in obso.columns:
        obso["urs"] = (obso["obso"]
                       * (1 - obso.get("received", pd.Series(False, index=obso.index)).astype(float))
                       * obso.get("epv_target", pd.Series(1.0, index=obso.index)))

    results: dict[str, pd.Series] = {}
    for label, half_ids in [("first", first_ids), ("second", second_ids)]:
        sub = obso[obso["match_id"].isin(half_ids)]
        agg = sub.groupby("player").agg(urs_sum=("urs", "sum")).reset_index()

        # calculate minutes played in this half from lineups
        half_matches = matches[matches["match_id"].isin(half_ids)]
        half_mins    = _player_minutes_from_lineups(half_matches)
        agg = agg.merge(half_mins[["player", "minutes_played"]], on="player", how="left")

        # filter and normalize per 90 minutes; keep only players with enough minutes in this half
        agg = agg[agg["minutes_played"].notna() & (agg["minutes_played"] >= min_minutes_per_half)]
        agg["urs_per90"] = agg["urs_sum"] / agg["minutes_played"].replace(0, np.nan) * 90
        results[label] = agg.set_index("player")["urs_per90"].dropna()

    common = results["first"].index.intersection(results["second"].index)
    if len(common) < 10:
        logger.warning("Only %d players in both halves.", len(common))
        return

    y1 = results["first"].loc[common]
    y2 = results["second"].loc[common]
    rho, pval = spearmanr(y1, y2)

    print("=" * 60)
    print("  URS_per90 — split-half reliability")
    print("=" * 60)
    print(f"  Matches first half  : {len(first_ids)}")
    print(f"  Matches second half : {len(second_ids)}")
    print(f"  Players in both     : {len(common)}")
    print(f"  Spearman rho        : {rho:.3f}")
    print(f"  p-value             : {pval:.4f}")
    if rho >= 0.50:
        print("  rho >= 0.50 — URS_per90 shows stable inter-half agreement.")
    else:
        print("  rho < 0.50 — investigate receiver-resolution noise.")
    print("=" * 60)

    fig, ax = plt.subplots(figsize=(7, 7))
    ax.scatter(y1, y2, s=40, alpha=0.6, edgecolors="white", linewidths=0.5)
    lim = max(y1.max(), y2.max()) * 1.05
    ax.plot([0, lim], [0, lim], "--", color="grey", lw=1.2)
    ax.set_xlabel("URS_per90 — first half", fontsize=11)
    ax.set_ylabel("URS_per90 — second half", fontsize=11)
    ax.set_title(f"Split-half reliability — URS_per90\nSpearman rho = {rho:.3f}  (n={len(common)})",
                 fontsize=12)
    plt.tight_layout()
    plt.show()

def _draw_pitch(ax, color="black", lw=1.4):
    """Consistent pitch style matching H1/H2."""
    import matplotlib.patches as patches
    L, W = PITCH_LENGTH, PITCH_WIDTH
    ax.set_facecolor("#f5f5f5")
    ax.add_patch(patches.Rectangle((0, 0), L, W, color="white", zorder=0))
    ax.plot([0, L, L, 0, 0], [0, 0, W, W, 0], color=color, lw=lw)
    ax.plot([L/2, L/2], [0, W], color=color, lw=lw)
    ax.add_patch(patches.Circle((L/2, W/2), 9.15, fill=False, edgecolor=color, lw=lw))
    ax.add_patch(patches.Rectangle((0, (W-40.32)/2), 16.5, 40.32, fill=False, edgecolor=color, lw=lw))
    ax.add_patch(patches.Rectangle((L-16.5, (W-40.32)/2), 16.5, 40.32, fill=False, edgecolor=color, lw=lw))
    ax.set_xlim(-2, L+2); ax.set_ylim(-2, W+2)
    ax.set_aspect("equal")
    ax.set_xticks([]); ax.set_yticks([])

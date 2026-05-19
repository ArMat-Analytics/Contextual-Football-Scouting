"""Pitch visualisations for xPass example passes.

Goal: turn xPass predictions into human-readable pictures so the model can
be inspected qualitatively. Each plot draws

    * the pitch (UEFA 105 x 68 m, attack to the right)
    * the sender (cyan diamond) at t0
    * the chosen teammate at t0, coloured by xPass (red->yellow->blue) and
      outlined with a thick black border, matching the §8/§9 convention
    * every other in-frame teammate at t0 (light-blue) and opponents (black)
    * the ball end_location at t1 (red X) — where the pass actually landed
    * a red dashed segment from chosen(t0) to end_location whenever the
      receiver moved during ball flight (gap > 0.5 m)
    * the pass arrow, coloured by xPass (red = low P(complete), blue = high)
    * a header line with predicted xPass, actual outcome, and key features

Public API
----------
draw_pitch(ax)
pick_examples(merged_df, kind="...", k=6, player=None)
plot_pass_example(event_id, merged_df)
plot_pass_grid(event_ids, merged_df, ncols=2)
plot_pass_alternatives(event_id, alternatives_df, merged_df)
plot_dq_scatter(dq, role, highlight, label_extra=None, ax=None)   # §5 diagnostic only
plot_dq_quadrant(dq, player, ax=None)             # single-player page graph
plot_dq_h2h(dq, player_a, player_b, ax=None)      # two-player comparison graph

`merged_df` is the table you get by joining the xPass-scored features with
the corpus context (see `notebooks/H2-Contextual_Decision_Making.ipynb`,
Section 4) — i.e. one row
per event with the columns: event_id, player, team, minute, start_x_m,
start_y_m, end_x_m, end_y_m, pass_height, pass_complete, xpass_oof,
teammates, opponents, chosen_teammate_idx, plus all 13 feature columns.
"""
from __future__ import annotations

from typing import Sequence

import matplotlib.patches as patches
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from . import config as cfg


# =============================================================================
# Pitch background
# =============================================================================
def draw_pitch(ax, color: str = "black", lw: float = 1.4):
    L, W = cfg.PITCH_LENGTH_M, cfg.PITCH_WIDTH_M
    ax.set_facecolor("#f5f5f5")
    ax.add_patch(patches.Rectangle((0, 0), L, W, color="white", zorder=0))
    ax.plot([0, L, L, 0, 0], [0, 0, W, W, 0], color=color, lw=lw)
    ax.plot([L / 2, L / 2], [0, W], color=color, lw=lw)
    ax.add_patch(patches.Circle((L / 2, W / 2), 9.15, fill=False,
                                edgecolor=color, lw=lw))
    ax.add_patch(patches.Rectangle((0,    (W - 40.32) / 2), 16.5, 40.32,
                                   fill=False, edgecolor=color, lw=lw))
    ax.add_patch(patches.Rectangle((L - 16.5, (W - 40.32) / 2), 16.5, 40.32,
                                   fill=False, edgecolor=color, lw=lw))
    ax.add_patch(patches.Rectangle((0,    (W - 18.32) / 2),  5.5, 18.32,
                                   fill=False, edgecolor=color, lw=lw))
    ax.add_patch(patches.Rectangle((L - 5.5, (W - 18.32) / 2),  5.5, 18.32,
                                   fill=False, edgecolor=color, lw=lw))
    ax.set_xlim(-2, L + 2); ax.set_ylim(-2, W + 2)
    ax.set_aspect("equal")
    ax.set_xticks([]); ax.set_yticks([])


# =============================================================================
# Heuristic event pickers
# =============================================================================
def pick_examples(merged_df: pd.DataFrame,
                  kind: str = "high_xpass_made",
                  k: int = 6,
                  player: str | None = None) -> pd.DataFrame:
    """Return up to `k` events matching the chosen heuristic.

    `kind` options:
        "high_xpass_made"      easy passes the model is confident about (sanity)
        "low_xpass_made"       low-xPass passes that DID complete (model misses?)
        "high_xpass_missed"    high-xPass passes that did NOT complete (rare)
        "low_xpass_missed"     low-xPass passes that did NOT complete (sanity)
        "high_pressure"        sender under high pressure (>= 2 opp @ 2.5m)
        "long_forward"         pass distance >= 25m and angle <= 60deg
        "random"               reproducible random sample (seed=0)
    """
    df = merged_df.copy()
    if player:
        df = df[df["player"].str.contains(player, case=False, na=False)]

    if kind == "high_xpass_made":
        df = df[(df["pass_complete"] == 1)].sort_values("xpass_oof", ascending=False)
    elif kind == "low_xpass_made":
        df = df[(df["pass_complete"] == 1)].sort_values("xpass_oof", ascending=True)
    elif kind == "high_xpass_missed":
        df = df[(df["pass_complete"] == 0)].sort_values("xpass_oof", ascending=False)
    elif kind == "low_xpass_missed":
        df = df[(df["pass_complete"] == 0)].sort_values("xpass_oof", ascending=True)
    elif kind == "high_pressure":
        df = df[df["sender_pressure_count_25"] >= cfg.PRESSURE_MIN] \
                .sort_values("xpass_oof", ascending=True)
    elif kind == "long_forward":
        df = df[(df["pass_distance"] >= 25) & (df["pass_angle_forward"] <= 60)] \
                .sort_values("xpass_oof", ascending=True)
    elif kind == "random":
        df = df.sample(min(len(df), k), random_state=0)
    else:
        raise ValueError(f"unknown kind={kind!r}")

    return df.head(k).reset_index(drop=True)


# =============================================================================
# Single-event plot
# =============================================================================
def _xpass_color(p: float) -> tuple:
    """Red -> Yellow -> Blue colormap value at p in [0, 1]."""
    return plt.cm.RdYlBu(np.clip(p, 0, 1))


def _to_xy(points) -> np.ndarray:
    if points is None:
        return np.empty((0, 2))
    if isinstance(points, float) and np.isnan(points):
        return np.empty((0, 2))
    if hasattr(points, "__len__") and len(points) == 0:
        return np.empty((0, 2))
    return np.asarray([[float(p[0]), float(p[1])] for p in points], dtype=float).reshape(-1, 2)


def plot_pass_example(event_id: str, merged_df: pd.DataFrame):
    """One event, one plot, fully annotated.

    The arrow is coloured by the predicted xPass (red = low, blue = high).
    Three distinct markers separate the geometry of the event:
      * cyan diamond     -> sender at t0
      * thick-black-edged teammate dot -> the chosen teammate at t0
      * red X            -> ball end_location at t1 (where the pass landed)
    A red dashed line is added between chosen(t0) and end_location whenever
    the gap is non-trivial — i.e. when the receiver moved during the ball
    flight (typical of borderline pass-into-space events).
    The header carries actual outcome, predicted xPass, and the four
    most-informative features (distance, defenders in 5 m corridor,
    sender pressure, min distance from the receiver to a defender).
    """
    sub = merged_df.loc[merged_df["event_id"] == event_id]
    if sub.empty:
        raise KeyError(f"event_id {event_id!r} not in merged_df")
    r = sub.iloc[0]

    sx, sy = float(r["start_x_m"]), float(r["start_y_m"])
    ex, ey = float(r["end_x_m"]),   float(r["end_y_m"])
    tm  = _to_xy(r.get("teammates"))
    opp = _to_xy(r.get("opponents"))

    fig, ax = plt.subplots(figsize=(13, 8))
    draw_pitch(ax)

    if opp.shape[0]:
        ax.scatter(opp[:, 0], opp[:, 1], color="black", s=80, zorder=3,
                   edgecolors="white", linewidths=1.0, label="opponents")
    if tm.shape[0]:
        ax.scatter(tm[:, 0], tm[:, 1], color="#9ec9ff", s=60, zorder=3,
                   edgecolors="black", linewidths=0.6, label="teammates (t0)")

    # Pass arrow coloured by xPass
    p = float(r.get("xpass_oof", np.nan))
    color = _xpass_color(p) if not np.isnan(p) else "#888"
    ax.annotate("", xy=(ex, ey), xytext=(sx, sy),
                arrowprops=dict(arrowstyle="->", color=color, lw=4,
                                mutation_scale=24), zorder=5)

    # Sender
    ax.scatter([sx], [sy], marker="D", s=200, color="#00BFFF",
               edgecolors="black", linewidths=1.5, zorder=7, label="sender")

    # Chosen teammate at t0 — coloured by xPass (matches the §8/§9 alternatives
    # plot convention) and outlined with a thick black border so it pops out
    # of the other in-frame teammates.
    chosen_xy = None
    chosen_color_xpass = _xpass_color(p) if not np.isnan(p) else "#9ec9ff"
    idx = int(r.get("chosen_teammate_idx", -1)) if pd.notna(r.get("chosen_teammate_idx", np.nan)) else -1
    if 0 <= idx < tm.shape[0]:
        cx, cy = float(tm[idx, 0]), float(tm[idx, 1])
        chosen_xy = (cx, cy)
        ax.scatter([cx], [cy], marker="o", s=260, color=chosen_color_xpass,
                   edgecolors="black", linewidths=3.5, zorder=8,
                   label=f"chosen teammate (t0)  xPass={p:.2f}")

    # Ball end_location at t1
    ax.scatter([ex], [ey], marker="X", s=220, color="#d62728",
               edgecolors="black", linewidths=1.2, zorder=9,
               label="ball end_location (t1)")
    if chosen_xy is not None:
        cx, cy = chosen_xy
        gap = ((cx - ex) ** 2 + (cy - ey) ** 2) ** 0.5
        if gap > 0.5:
            ax.plot([cx, ex], [cy, ey], linestyle="--",
                    color="#d62728", lw=1.6, alpha=0.85, zorder=6,
                    label=f"chosen(t0) -> end_loc gap = {gap:.1f} m")

    # Header
    outcome = "completed" if int(r.get("pass_complete", 0)) == 1 else "not completed"
    header = (
        f"{r.get('player', '?')}  ({r.get('team', '?')})   "
        f"min {int(r.get('minute', 0))}'   "
        f"height: {r.get('pass_height', '?')}\n"
        f"xPass(OOF) = {p:.2f}   |   actual: {outcome}\n"
        f"distance = {r.get('pass_distance', np.nan):.1f} m   "
        f"angle_fwd = {r.get('pass_angle_forward', np.nan):.0f}°   "
        f"def. corridor 5m = {int(r.get('defenders_in_corridor_5m', 0))}   "
        f"sender press. = {int(r.get('sender_pressure_count_25', 0))}   "
        f"min dist def->recv = {r.get('min_dist_def_to_receiver', np.nan):.1f} m"
    )
    ax.set_title(header, fontsize=11, loc="left")
    ax.legend(loc="upper right", fontsize=9, framealpha=0.92)
    plt.tight_layout()
    return fig


# =============================================================================
# Grid of N events
# =============================================================================
def plot_pass_grid(event_ids: Sequence[str],
                   merged_df: pd.DataFrame,
                   ncols: int = 2):
    """Compact grid for N events — same logic, less per-panel detail."""
    n = len(event_ids)
    nrows = int(np.ceil(n / ncols))
    fig, axes = plt.subplots(nrows, ncols, figsize=(7.5 * ncols, 5.5 * nrows))
    axes = np.atleast_1d(axes).ravel()

    for ax, ev_id in zip(axes, event_ids):
        draw_pitch(ax)
        sub = merged_df.loc[merged_df["event_id"] == ev_id]
        if sub.empty:
            ax.set_title(f"{ev_id}: not in merged_df", fontsize=9, color="red")
            continue
        r = sub.iloc[0]
        sx, sy = float(r["start_x_m"]), float(r["start_y_m"])
        ex, ey = float(r["end_x_m"]),   float(r["end_y_m"])
        tm  = _to_xy(r.get("teammates"))
        opp = _to_xy(r.get("opponents"))
        if opp.shape[0]:
            ax.scatter(opp[:, 0], opp[:, 1], color="black", s=35, zorder=3,
                       edgecolors="white", linewidths=0.5)
        if tm.shape[0]:
            ax.scatter(tm[:, 0], tm[:, 1], color="#9ec9ff", s=30, zorder=3,
                       edgecolors="black", linewidths=0.4)
        p = float(r.get("xpass_oof", np.nan))
        color = _xpass_color(p) if not np.isnan(p) else "#888"
        ax.annotate("", xy=(ex, ey), xytext=(sx, sy),
                    arrowprops=dict(arrowstyle="->", color=color, lw=3,
                                    mutation_scale=18), zorder=5)
        ax.scatter([sx], [sy], marker="D", s=80, color="#00BFFF",
                   edgecolors="black", linewidths=1.0, zorder=7)
        chosen_xy = None
        chosen_color_xpass = _xpass_color(p) if not np.isnan(p) else "#9ec9ff"
        idx = int(r.get("chosen_teammate_idx", -1)) if pd.notna(r.get("chosen_teammate_idx", np.nan)) else -1
        if 0 <= idx < tm.shape[0]:
            cx, cy = float(tm[idx, 0]), float(tm[idx, 1])
            chosen_xy = (cx, cy)
            ax.scatter([cx], [cy], marker="o", s=120, color=chosen_color_xpass,
                       edgecolors="black", linewidths=2.5, zorder=8)
        ax.scatter([ex], [ey], marker="X", s=90, color="#d62728",
                   edgecolors="black", linewidths=0.8, zorder=9)
        if chosen_xy is not None:
            cx, cy = chosen_xy
            if ((cx - ex) ** 2 + (cy - ey) ** 2) ** 0.5 > 0.5:
                ax.plot([cx, ex], [cy, ey], linestyle="--",
                        color="#d62728", lw=1.2, alpha=0.85, zorder=6)
        outcome = "OK" if int(r.get("pass_complete", 0)) == 1 else "X"
        ax.set_title(
            f"{r.get('player', '?')} ({r.get('team', '?')}) — {outcome}\n"
            f"xPass={p:.2f}  d={r.get('pass_distance', np.nan):.1f}m  "
            f"corr5={int(r.get('defenders_in_corridor_5m', 0))}  "
            f"press={int(r.get('sender_pressure_count_25', 0))}",
            fontsize=9, loc="left")

    for ax in axes[n:]:
        ax.axis("off")
    plt.tight_layout()
    return fig


# =============================================================================
# Alternatives view — every candidate teammate coloured by xPass
# =============================================================================
def plot_pass_alternatives(event_id: str,
                            alternatives_df: pd.DataFrame,
                            merged_df: pd.DataFrame):
    """Decision-space plot: every candidate teammate coloured by xPass.

    For one event, draws the pitch with:
      * sender (cyan diamond)
      * every in-frame teammate at t0, coloured red->yellow->blue by xPass,
        with the predicted xPass next to each circle
      * the chosen receiver: thick black border (its position is the chosen
        teammate's t0 location, NOT where the ball actually arrived)
      * the ball end_location (t1) as a red X — useful for borderline
        pass-into-space events where the receiver moved during ball flight
      * a dashed red segment from chosen(t0) to end_location whenever the
        gap is non-trivial (> 0.5 m), making the receiver displacement
        visually obvious
      * opponents (black dots)

    `alternatives_df` is the long-form output of
    `features.features_for_all_candidates(...)` AFTER scoring each row
    into an `xpass` column. `merged_df` is the row-per-event corpus used
    in §7 (sender position, teammates, opponents, end_location).
    """
    sub_alt = alternatives_df.loc[alternatives_df["event_id"] == event_id]
    sub_evt = merged_df.loc[merged_df["event_id"] == event_id]
    if sub_alt.empty or sub_evt.empty:
        raise KeyError(f"event_id {event_id!r} not in alternatives or merged")
    if "xpass" not in sub_alt.columns:
        raise KeyError("alternatives_df missing 'xpass' column — score the "
                        "candidates with the model first")
    r = sub_evt.iloc[0]

    fig, ax = plt.subplots(figsize=(13, 8))
    draw_pitch(ax)

    opp = _to_xy(r.get("opponents"))
    if opp.shape[0]:
        ax.scatter(opp[:, 0], opp[:, 1], color="black", s=80, zorder=3,
                   edgecolors="white", linewidths=1.0, label="opponents")

    sx, sy = float(r["start_x_m"]), float(r["start_y_m"])
    ax.scatter([sx], [sy], marker="D", s=240, color="#00BFFF",
               edgecolors="black", linewidths=1.5, zorder=8, label="sender")

    sub_alt = sub_alt.sort_values("candidate_idx")
    chosen_xy = None
    for _, row in sub_alt.iterrows():
        x, y = float(row["target_x_m"]), float(row["target_y_m"])
        p    = float(row["xpass"])
        ax.scatter([x], [y], s=280, color=_xpass_color(p),
                   edgecolors="black" if not row["is_chosen"] else "#000000",
                   linewidths=1.0 if not row["is_chosen"] else 3.5,
                   zorder=6)
        ax.annotate(f"{p:.2f}", xy=(x, y), xytext=(x + 1.0, y + 1.0),
                    fontsize=9, color="black", zorder=7)
        if row["is_chosen"]:
            chosen_xy = (x, y)
            ax.annotate("", xy=(x, y), xytext=(sx, sy),
                        arrowprops=dict(arrowstyle="->", color="#222",
                                        lw=2.5, alpha=0.7), zorder=4)

    ex, ey = float(r["end_x_m"]), float(r["end_y_m"])
    ax.scatter([ex], [ey], marker="X", s=220, color="#d62728",
               edgecolors="black", linewidths=1.2, zorder=9,
               label="ball end_location (t1)")
    if chosen_xy is not None:
        cx, cy = chosen_xy
        gap = ((cx - ex) ** 2 + (cy - ey) ** 2) ** 0.5
        if gap > 0.5:
            ax.plot([cx, ex], [cy, ey], linestyle="--",
                    color="#d62728", lw=1.6, alpha=0.85, zorder=5,
                    label=f"chosen(t0) -> end_loc gap = {gap:.1f} m")

    n_alt = len(sub_alt)
    p_chosen = float(sub_alt.loc[sub_alt["is_chosen"], "xpass"].iloc[0]) \
                if sub_alt["is_chosen"].any() else float("nan")
    p_best   = float(sub_alt["xpass"].max())
    outcome  = "completed" if int(r.get("pass_complete", 0)) == 1 else "not completed"
    title = (
        f"{r.get('player', '?')}  ({r.get('team', '?')})   "
        f"min {int(r.get('minute', 0))}'   actual: {outcome}\n"
        f"{n_alt} candidates  |  chosen xPass = {p_chosen:.2f}  |  "
        f"best alt xPass = {p_best:.2f}  |  "
        f"regret = {p_best - p_chosen:+.2f}"
    )
    ax.set_title(title, fontsize=11, loc="left")
    ax.legend(loc="upper right", fontsize=9, framealpha=0.92)
    plt.tight_layout()
    return fig


# ===========================================================================
# Decision Quality — player page graph (quality vs value scatter)
# ===========================================================================
_DQ_CAPTION = (
    "X = Decision Quality Index: within-role percentile of Score, where "
    "Score is the mean\nshare of in-frame alternatives whose xEPV is at or "
    "below the chosen pass xEPV.\n"
    "Y = Value Impact: mean of (chosen xEPV − mean xEPV of the "
    "alternatives), shown × 100."
)


def plot_dq_scatter(dq, role, highlight, label_extra=None, ax=None,
                    min_n=None, n_col="n_decisions"):
    """The H2 player-page graph: Decision Quality vs Value Impact.

    X = DQ_index (Score percentile within role), Y = value_impact (mean
    delta xEPV vs alternatives, ×100). Every player of `role` is a point,
    `highlight` is drawn large in red. Deliberately not a radar: the
    geom_type decomposition inverts structurally on penetration.

    `min_n` is a DISPLAY-ONLY filter: drop players with fewer than `min_n`
    decisions so a handful of tiny-sample players do not distort the
    picture. It does NOT change the index or the CSV (the pool stays the
    full 272, no floor, by design).
    """
    r = dq[dq["macro_role"] == role].copy()
    if min_n is not None and n_col in r.columns:
        r = r[r[n_col] >= min_n]
    if ax is None:
        _, ax = plt.subplots(figsize=(8.4, 6.4))

    ax.scatter(r["DQ_index"], r["value_impact"] * 100, s=46,
               c="#9fb3c8", edgecolor="white", linewidth=0.6, zorder=2)
    ax.axhline(0, color="#bbb", lw=0.8, zorder=1)
    ax.axvline(50, color="#bbb", lw=0.8, ls="--", zorder=1)

    for nm in (label_extra or []):
        q = r[r["player"] == nm]
        if len(q):
            ax.annotate(nm.split()[-1],
                        (q["DQ_index"].iloc[0], q["value_impact"].iloc[0] * 100),
                        textcoords="offset points", xytext=(6, 5),
                        fontsize=8.5, color="#33424f")

    hp = r[r["player"] == highlight]
    if len(hp):
        ax.scatter(hp["DQ_index"], hp["value_impact"] * 100, s=210,
                   c="#e8543f", edgecolor="black", linewidth=1.1, zorder=4)
        ax.annotate(highlight,
                    (hp["DQ_index"].iloc[0], hp["value_impact"].iloc[0] * 100),
                    textcoords="offset points", xytext=(12, 8),
                    fontsize=11, fontweight="bold", color="#e8543f")

    ax.set_xlabel("Decision Quality Index  (Score percentile within role)")
    ax.set_ylabel("Value Impact  (mean ΔxEPV vs alternatives × 100)")
    sub = f"  ·  shown: players with ≥ {min_n} decisions" if min_n else ""
    ax.set_title(f"Decision Quality vs Value Impact  ·  {role}{sub}", pad=8)
    # two-line definition of the axes and how they are computed
    ax.text(0.5, 0.985, _DQ_CAPTION, transform=ax.transAxes,
            ha="center", va="top", fontsize=7.0, color="#5b6b79",
            bbox=dict(facecolor="white", alpha=0.72, edgecolor="none",
                      boxstyle="round,pad=0.3"))
    ax.grid(alpha=0.18, zorder=0)
    ax.set_xlim(-3, 103)
    return ax


# ===========================================================================
# Decision Quality — website page graphics
# ===========================================================================
# Two graphics, two distinct jobs, NO radar (a radar implies a geometric
# relationship between axes we measured to be partly false). On real data,
# within-role Spearman (see src/validation.py, run in the notebook):
#   accuracy_pct ↔ worst_choice_pct   ρ ≈ 0.12  (weak — distinct axes)
#   DQ_index     ↔ value_impact       ρ ≈ 0.76  (strong — redundant)
# so the quadrant (weakly-correlated pair, all four boxes populated in
# every role) is the single-player page graph and the DQ↔Value scatter
# above stays a §5 diagnostic, never a page graph.
#
# The within-role *percentile* used here is a readability scale, not a
# second index: a raw accuracy of ~15% reads like a bad grade, "85th
# percentile among MIDs" reads as good. DQ_index stays the only headline
# number; the raw / per-90 / % columns are shown as a table on the page.
#
# PCT_METRICS: (plain-language label, csv col, flip?). flip=True means a
# low raw value is good, so we use 100 − percentile and phrase it
# positively ("Avoids …") — the axis is never inverted, only the wording
# states the good direction. Plain-language labels only: no CSV column
# names ever reach a chart.
PCT_METRICS = [
    ("Decision quality",          "DQ_index",         False),
    ("Value added vs options",    "value_impact",     False),
    ("Elite reads / 90",          "elite_per90",      False),
    ("Avoids poor choices / 90",  "poor_per90",       True),
    ("Picks the best option",     "accuracy_pct",     False),
    ("Avoids the worst option",   "worst_choice_pct", True),
]
# the metrics drawn on the head-to-head dumbbell
H2H_METRICS = PCT_METRICS[:5]


def _role_pct(dq, role):
    """Within-role percentile (0-100) for every PCT_METRICS column.

    Adds a ``<col>__p`` column per metric, always oriented so higher = better
    (flip=True metrics use 100 − percentile). Returns the role sub-frame.
    """
    sub = dq[dq["macro_role"] == role].copy()
    for _, col, flip in PCT_METRICS:
        p = sub[col].rank(pct=True) * 100
        sub[col + "__p"] = (100 - p) if flip else p
    return sub


def plot_dq_quadrant(dq, player, ax=None):
    """Single-player page graph: decision-maker archetype quadrant.

    X = "picks the best option" percentile within role.
    Y = "avoids the worst option" percentile within role.
    Both 0-100 and higher = better, so the ELITE corner is top-right and
    nothing is inverted (the Y metric's good direction is stated by the
    wording, not by flipping the axis). The two axes are only weakly
    correlated within role (accuracy ↔ worst-choice ρ ≈ 0.12 on this
    corpus) and all four quadrants are populated in every macro-role,
    so the archetypes are real, not an artefact of a correlated pair.
    """
    row = dq[dq["player"] == player]
    if row.empty:
        raise ValueError(f"player not found: {player}")
    row = row.iloc[0]
    role = row["macro_role"]
    peers = dq[dq["macro_role"] == role].copy()
    peers["x"] = peers["accuracy_pct"].rank(pct=True) * 100
    peers["y"] = (1 - peers["worst_choice_pct"].rank(pct=True)) * 100
    me = peers[peers["player"] == player].iloc[0]

    if ax is None:
        _, ax = plt.subplots(figsize=(7.6, 7.4))

    ax.axhspan(50, 100, color="#e8f5e9", zorder=0)
    ax.axhspan(0, 50, color="#fbe9e7", zorder=0)
    ax.axvline(50, color="#9aa", lw=0.8, ls="--", zorder=1)
    ax.axhline(50, color="#9aa", lw=0.8, ls="--", zorder=1)

    ax.scatter(peers["x"], peers["y"], s=46, c="#b0bec5",
               edgecolor="white", linewidth=0.6, zorder=2)
    ax.scatter([me["x"]], [me["y"]], s=240, c="#e8543f",
               edgecolor="black", linewidth=1.2, zorder=4)
    ax.annotate(player, (me["x"], me["y"]),
                textcoords="offset points", xytext=(11, 8),
                fontsize=11, fontweight="bold", color="#e8543f")

    box = dict(boxstyle="round,pad=0.32", facecolor="white",
               edgecolor="#cfd8dc", alpha=0.9)
    lab = dict(fontsize=9, fontweight="bold", color="#5b6b79", zorder=5)
    ax.text(0.985, 0.985, "ELITE\nfinds best, avoids worst",
            transform=ax.transAxes, ha="right", va="top", bbox=box, **lab)
    ax.text(0.015, 0.985, "SAFE\nrarely worst, rarely best",
            transform=ax.transAxes, ha="left", va="top", bbox=box, **lab)
    ax.text(0.985, 0.015, "BRILLIANT\nbut erratic",
            transform=ax.transAxes, ha="right", va="bottom", bbox=box, **lab)
    ax.text(0.015, 0.015, "WEAK\nmisses best, picks worst",
            transform=ax.transAxes, ha="left", va="bottom", bbox=box, **lab)

    ax.set_xlim(-3, 103)
    ax.set_ylim(-3, 103)
    ax.set_xticks([0, 25, 50, 75, 100])
    ax.set_yticks([0, 25, 50, 75, 100])
    ax.set_xlabel(f"Picks the best option  —  percentile among {role}s")
    ax.set_ylabel(f"Avoids the worst option  —  percentile among {role}s")
    ax.set_title(f"{player}  —  decision-maker type among {role}s "
                 f"(n={int(row['n_decisions'])} decisions)", pad=8)
    ax.grid(alpha=0.12, zorder=0)
    return ax


def plot_dq_h2h(dq, player_a, player_b, ax=None):
    """Two-player comparison page graph: head-to-head dumbbell.

    SAME MACRO-ROLE ONLY (enforced; the site's comparison picker only
    offers same-role players, so both are percentiled in one identical
    role pool and the comparison is direct, with no "each vs own role"
    caveat). For each of the five headline metrics: a faint full-width
    band shows the whole role spread (0-100), a connector draws the gap,
    the row winner's dot is enlarged and its raw value bolded. The right
    shape for a duel — overlaid radars/bars get unreadable with two
    players, and the raw / per-90 / % numbers live in the table below.
    """
    ra = dq[dq["player"] == player_a].iloc[0]
    rb = dq[dq["player"] == player_b].iloc[0]
    if ra["macro_role"] != rb["macro_role"]:
        raise ValueError(
            f"same macro-role only: {player_a} is {ra['macro_role']}, "
            f"{player_b} is {rb['macro_role']}. The site restricts the "
            "comparison picker to same-role players.")
    role = ra["macro_role"]
    sub = _role_pct(dq, role)
    A = sub[sub["player"] == player_a].iloc[0]
    B = sub[sub["player"] == player_b].iloc[0]

    if ax is None:
        _, ax = plt.subplots(figsize=(10.2, 5.4))

    labels = [m[0] for m in H2H_METRICS]
    y = np.arange(len(H2H_METRICS))[::-1]
    cA, cB = "#1e88e5", "#e8543f"

    for yi, (label, col, flip) in zip(y, H2H_METRICS):
        pa, pb = A[col + "__p"], B[col + "__p"]
        rawa, rawb = A[col], B[col]

        ax.barh(yi, 100, height=0.5, color="#eceff1", zorder=1)
        ax.plot([pa, pb], [yi, yi], color="#b0bec5", lw=2.5, zorder=2)

        a_wins = pa >= pb
        sa = 230 if a_wins else 150
        sb = 150 if a_wins else 230
        ax.scatter([pa], [yi], s=sa, color=cA, zorder=4,
                   edgecolor="black" if a_wins else "white",
                   linewidth=1.4 if a_wins else 1.0)
        ax.scatter([pb], [yi], s=sb, color=cB, zorder=4,
                   edgecolor="black" if not a_wins else "white",
                   linewidth=1.4 if not a_wins else 1.0)
        ax.text(pa + (-3 if pa < pb else 3), yi + 0.30, f"{rawa:.2f}",
                ha="right" if pa < pb else "left", fontsize=8,
                color=cA, fontweight="bold" if a_wins else "normal")
        ax.text(pb + (3 if pa < pb else -3), yi + 0.30, f"{rawb:.2f}",
                ha="left" if pa < pb else "right", fontsize=8,
                color=cB, fontweight="bold" if not a_wins else "normal")

    ax.axvline(50, color="#90a4ae", lw=1.0, ls="--", zorder=1)
    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=10)
    ax.set_xlim(-6, 112)
    ax.set_xticks([0, 25, 50, 75, 100])
    ax.set_xlabel(f"Percentile among {role}s  ·  longer toward 100 = better  "
                  "·  bigger dot wins the row  ·  raw value shown")
    ax.set_title(f"{player_a}   vs   {player_b}\nhead-to-head among {role}s "
                 f"(n {int(ra['n_decisions'])} vs {int(rb['n_decisions'])})",
                 pad=10)
    ax.legend(handles=[
        plt.Line2D([], [], marker="o", ls="", ms=10, color=cA, label=player_a),
        plt.Line2D([], [], marker="o", ls="", ms=10, color=cB, label=player_b)],
        loc="lower right", fontsize=9, frameon=False)
    ax.grid(axis="x", alpha=0.12, zorder=0)
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    return ax

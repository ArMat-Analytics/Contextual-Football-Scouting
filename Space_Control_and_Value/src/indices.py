"""Composite-index design — 14 mother variables -> 4 indices.

Each index is the within-role percentile mean of its mother variables. All
percentiles are computed inside the player's macro_role pool, so a CAM is
benchmarked against other CAMs.

Public API:
    RADAR_SPECS         - dict[index_name -> list of (label, csv_col, n_col)]
    build_pct_table(df) - returns (df, pct) with __p columns and *_idx columns
"""
import numpy as np
import pandas as pd

from . import config


# Each entry: (axis label, csv column, "n" column for tooltip sample size)
RADAR_SPECS = {
    "PROGRESSION": [
        ("LB Geom /90",       "lb_geom_per90",                     "lb_geom"),
        ("LB Quality /90",    "lb_quality_per90",                  "lb_quality"),
        ("LB EPV /90",        "lb_epv_per90",                      "lb_epv"),
        ("Hull Penetr. /90",  "successful_hull_penetrations_per90","hull_penetration_n"),
        ("Def. Bypassed Avg", "defenders_bypassed_mean",           "lb_geom"),
    ],
    "DANGEROUSNESS": [
        ("EPV Added /90",     "epv_added_per90",                   "passes_op"),
        ("EPV Penetr. /90",   "epv_penetration_per90",             "penetration_n"),
        ("Circ. EPV /90",     "epv_inside_circ_per90",             "inside_circ_n"),
    ],
    "RECEPTION": [
        ("Between Lines %",   "between_lines_pct",                 "between_lines_n"),
        ("Hull Exits /90",    "successful_hull_exits_per90",       "hull_exit_n"),
        ("Press. Resist %",   "pressure_resistance_pct",           "pressure_resistance_n"),
    ],
    "GRAVITY": [
        ("Space Attraction %","gravity_proximity_pct",             "gravity_n"),
        ("Gravity Hull %",    "gravity_hull_pct",                  "gravity_n"),
        ("Def. Pull |m|",     "gravity_abs_m",                     "gravity_directional_n"),
    ],
}


def load_player_table(min_minutes: int = 0) -> pd.DataFrame:
    """Read the aggregated CSV and derive ``gravity_abs_m``.

    Pass ``min_minutes`` to filter out players with low minutes BEFORE
    percentile computation (used by the H1 validation functions). The
    dashboard typically loads with ``min_minutes=0`` and filters at
    display time inside ``role_leaderboard`` / ``role_archetypes``.
    """
    df = pd.read_csv(config.PLAYER_AGG_PATH).reset_index(drop=True)
    df["gravity_abs_m"] = df["gravity_directional_m"].abs()
    if min_minutes:
        df = df[df["minutes_played"] >= min_minutes].copy().reset_index(drop=True)
    return df


def build_pct_table(df: pd.DataFrame):
    """Build the within-role percentile table and the four composite indices.

    Returns:
        (df, pct) where pct has one ``<var>__p`` column per radar variable
        and one ``<theme>_idx`` column per composite.
    """
    all_vars = list({v for spec in RADAR_SPECS.values() for _, v, _ in spec})
    pct = df[["player", "team", "primary_role", "macro_role", "minutes_played"]].copy()
    for v in all_vars:
        pct[f"{v}__p"] = df.groupby("macro_role")[v].rank(pct=True) * 100
    for theme, spec in RADAR_SPECS.items():
        cols = [f"{v}__p" for _, v, _ in spec]
        pct[f"{theme}_idx"] = pct[cols].mean(axis=1)
    return df, pct


def percentile_matrix(pct: pd.DataFrame) -> np.ndarray:
    """Numpy matrix of all within-role percentiles, used for similarity search."""
    all_vars = list({v for spec in RADAR_SPECS.values() for _, v, _ in spec})
    cols = [f"{v}__p" for v in all_vars]
    return pct[cols].fillna(50).values

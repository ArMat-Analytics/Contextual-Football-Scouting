"""
pitch_control.py — H3 Off-Ball Movement
Static pitch-control surface PC(x, y).

Formula (spec §5.1):
    PC(x, y) = sigmoid(k * (t_def_min - t_att_min))
    t = distance / v_max  (static start, v0 = 0)

Grid: PC_GRID_ROWS x PC_GRID_COLS = 32 x 50 — same as H1 EPV grid.
"""

from __future__ import annotations

import logging
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

_H3_DIR = Path(__file__).resolve().parents[1]
if str(_H3_DIR) not in sys.path:
    sys.path.insert(0, str(_H3_DIR))

from src.config import (
    PITCH_LENGTH, PITCH_WIDTH,
    X_SCALE, Y_SCALE,
    PC_GRID_ROWS, PC_GRID_COLS,
    PC_V_MAX, PC_K,
    CANDIDATES_PARQUET,
    load_h2_package,  # imported to keep loader cached; not used directly here
)

from epv_pipeline import EPVPipeline  # H1 — flat layout, already on sys.path

logger = logging.getLogger(__name__)

# ── Grid cell centres in pitch metres ─────────────────────────────────────────
_CELL_X = np.linspace(0, PITCH_LENGTH, PC_GRID_COLS + 1)
_CELL_X = (_CELL_X[:-1] + _CELL_X[1:]) / 2.0
_CELL_Y = np.linspace(0, PITCH_WIDTH,  PC_GRID_ROWS + 1)
_CELL_Y = (_CELL_Y[:-1] + _CELL_Y[1:]) / 2.0
_GRID_XY = np.stack(np.meshgrid(_CELL_X, _CELL_Y), axis=-1)  # (32, 50, 2)


def _sigmoid(z: np.ndarray) -> np.ndarray:
    """Numerically stable logistic sigmoid."""
    return np.where(z >= 0,
                    1.0 / (1.0 + np.exp(-z)),
                    np.exp(z) / (1.0 + np.exp(z)))


def pc_surface(
    att_positions: np.ndarray,
    def_positions: np.ndarray,
    v_max: float = PC_V_MAX,
    k: float     = PC_K,
) -> np.ndarray:
    """Compute the PC surface for one freeze frame.

    Parameters
    ----------
    att_positions : (N_att, 2) attacker coordinates in pitch metres.
    def_positions : (N_def, 2) defender coordinates in pitch metres.
    v_max         : max player speed (static start, same for all).
    k             : sigmoid sharpness.

    Returns
    -------
    (PC_GRID_ROWS, PC_GRID_COLS) float array — P(attacker control) per cell.
    """
    if att_positions.shape[0] == 0:
        return np.zeros((PC_GRID_ROWS, PC_GRID_COLS), dtype=float)
    if def_positions.shape[0] == 0:
        return np.ones((PC_GRID_ROWS, PC_GRID_COLS), dtype=float)

    att_dist = np.linalg.norm(
        _GRID_XY[:, :, np.newaxis, :] - att_positions[np.newaxis, np.newaxis, :, :],
        axis=-1,
    ) / v_max

    def_dist = np.linalg.norm(
        _GRID_XY[:, :, np.newaxis, :] - def_positions[np.newaxis, np.newaxis, :, :],
        axis=-1,
    ) / v_max

    return _sigmoid(k * (def_dist.min(axis=-1) - att_dist.min(axis=-1)))


def pc_at(x_m: float, y_m: float, surface: np.ndarray) -> float:
    """Nearest-cell PC value at a single pitch coordinate."""
    col = int(np.clip(round(x_m / PITCH_LENGTH * (PC_GRID_COLS - 1)), 0, PC_GRID_COLS - 1))
    row = int(np.clip(round(y_m / PITCH_WIDTH  * (PC_GRID_ROWS - 1)), 0, PC_GRID_ROWS - 1))
    return float(surface[row, col])


def _positions_from_frame(
    fr: pd.DataFrame,
    is_teammate: bool,
    exclude_actor: bool = True,
    exclude_keeper: bool = False,
) -> np.ndarray:
    """Extract player coordinates (pitch metres) from a flattened freeze frame."""
    mask = fr["teammate"] == is_teammate
    if exclude_actor:
        mask &= fr["actor"] == False
    if exclude_keeper:
        mask &= fr["keeper"] == False
    locs = fr.loc[mask, "location"].tolist()
    if not locs:
        return np.zeros((0, 2), dtype=float)
    arr = np.array(locs, dtype=float)
    arr[:, 0] *= X_SCALE
    arr[:, 1] *= Y_SCALE
    return arr


def show_pc_diagnostic(match_id: int | None = None) -> None:
    """Plot PC surface, EPV grid (H1), and their product for one freeze frame."""
    import matplotlib.pyplot as plt
    import matplotlib.gridspec as gridspec

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from statsbombpy import sb

    matches = sb.matches(competition_id=55, season_id=282)
    if match_id is None:
        match_id = int(matches["match_id"].iloc[0])
    mrow  = matches[matches["match_id"] == match_id].iloc[0]
    label = f"{mrow['home_team']} vs {mrow['away_team']}"

    events     = sb.events(match_id=match_id)
    frames_raw = sb.frames(match_id=match_id, fmt="dict")
    if not frames_raw:
        logger.warning("No 360 frames for match %s.", match_id)
        return

    frames_list = frames_raw if isinstance(frames_raw, list) else list(frames_raw)
    frames: pd.DataFrame = pd.DataFrame(frames_list)
    frames = frames.explode("freeze_frame", ignore_index=True)
    frames = pd.concat(
        [frames.drop(columns=["freeze_frame"]),
         pd.json_normalize(frames["freeze_frame"])],
        axis=1,
    )
    event_col = "event_uuid" if "event_uuid" in frames.columns else "id"

    passes = events[
        (events["type"] == "Pass") &
        (events["id"].isin(frames[event_col].unique()))
    ]
    if passes.shape[0] == 0:
        logger.warning("No pass with 360 frame found.")
        return

    prow = passes.iloc[len(passes) // 2]
    fr   = frames[frames[event_col] == prow["id"]]

    att_pos = _positions_from_frame(fr, is_teammate=True)
    def_pos = _positions_from_frame(fr, is_teammate=False)
    surface = pc_surface(att_pos, def_pos)

    epv_pipe = EPVPipeline()
    epv_grid = epv_pipe.grid

    fig = plt.figure(figsize=(16, 5))
    gs  = gridspec.GridSpec(1, 3, figure=fig, wspace=0.35)
    titles = ["PC surface", "EPV grid (H1)", "PC x EPV product"]
    data   = [surface, epv_grid, surface * epv_grid]
    cmaps  = ["RdYlBu", "YlOrRd", "PuRd"]

    for ax_d, ttl, d, cm in zip(
            [fig.add_subplot(gs[i]) for i in range(3)],
            titles, data, cmaps):
        im = ax_d.imshow(d, origin="lower", cmap=cm, aspect="auto",
                         extent=[0, PITCH_LENGTH, 0, PITCH_WIDTH])
        ax_d.set_title(ttl, fontsize=11)
        ax_d.set_xlabel("x (m)")
        ax_d.set_ylabel("y (m)")
        plt.colorbar(im, ax=ax_d, fraction=0.03, pad=0.04)

    fig.suptitle(f"PC diagnostic — {label}  |  {prow['player']} {prow['minute']}'",
                 fontsize=13, y=1.02)
    plt.tight_layout()
    plt.show()


def main() -> None:
    """Attach PC(target) to every row of off_ball_candidates.parquet."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from statsbombpy import sb

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s  %(levelname)s  %(message)s")

    if not CANDIDATES_PARQUET.exists():
        raise FileNotFoundError(f"{CANDIDATES_PARQUET} not found. Run candidates.main() first.")

    cands = pd.read_parquet(CANDIDATES_PARQUET)
    logger.info("Loaded %d candidate rows", len(cands))

    pc_values: list[float] = []
    match_cache: dict[int, tuple[pd.DataFrame, pd.DataFrame, str]] = {}

    for match_id, grp in cands.groupby("match_id"):
        if match_id not in match_cache:
            events     = sb.events(match_id=match_id)
            frames_raw = sb.frames(match_id=match_id, fmt="dict")
            if not frames_raw:
                match_cache[match_id] = (events, pd.DataFrame(), "event_uuid")
            else:
                frames_list = frames_raw if isinstance(frames_raw, list) else list(frames_raw)
                frames: pd.DataFrame = pd.DataFrame(frames_list)
                frames = frames.explode("freeze_frame", ignore_index=True)
                frames = pd.concat(
                    [frames.drop(columns=["freeze_frame"]),
                     pd.json_normalize(frames["freeze_frame"])],
                    axis=1,
                )
                ec = "event_uuid" if "event_uuid" in frames.columns else "id"
                match_cache[match_id] = (events, frames, ec)

        _, frames, event_col = match_cache[match_id]
        ev_pc: dict[str, np.ndarray | None] = {}

        for _, row in grp.iterrows():
            ev_id = row["event_id"]
            if ev_id not in ev_pc:
                if frames.shape[0] == 0:
                    ev_pc[ev_id] = None
                else:
                    fr      = frames[frames[event_col] == ev_id]
                    att_pos = _positions_from_frame(fr, is_teammate=True)
                    def_pos = _positions_from_frame(fr, is_teammate=False)
                    ev_pc[ev_id] = pc_surface(att_pos, def_pos)

            surf = ev_pc[ev_id]
            pc_values.append(
                np.nan if surf is None else pc_at(row["target_x_m"], row["target_y_m"], surf)
            )

    cands["pc_target"] = pc_values
    cands.to_parquet(CANDIDATES_PARQUET, index=False)
    logger.info("pc_target attached — mean=%.3f  NaN=%d",
                float(np.nanmean(pc_values)), int(np.isnan(pc_values).sum()))

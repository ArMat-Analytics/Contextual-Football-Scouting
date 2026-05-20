"""
obso.py — H3 Off-Ball Movement
OBSO = xPass * PC(target) * EPV(loc)

xPass comes from candidates.parquet (column 'xpass'), computed by
candidates.main() via H2's features_for_all_candidates + predict_proba.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd

_H3_DIR = Path(__file__).resolve().parents[1]
if str(_H3_DIR) not in sys.path:
    sys.path.insert(0, str(_H3_DIR))

from src.config import (
    CANDIDATES_PARQUET, OBSO_PARQUET,
    PC_MIN_FOR_OBSO,
    load_h2_package,
)

from epv_pipeline import EPVPipeline  # H1 — flat layout, already on sys.path via config

logger = logging.getLogger(__name__)


def main() -> None:
    """Compute OBSO for every confident candidate row.

    Reads  : data/off_ball_candidates.parquet (needs xpass + pc_target columns)
    Writes : data/off_ball_obso.parquet

    OBSO_i = xpass_i * pc_target_i * epv_target_i

    Candidates with pc_target < PC_MIN_FOR_OBSO are excluded:
    the pass might complete but the zone would not be controlled.
    """
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s  %(levelname)s  %(message)s")

    if not CANDIDATES_PARQUET.exists():
        raise FileNotFoundError(
            f"{CANDIDATES_PARQUET} not found. "
            "Run candidates.main() then pitch_control.main() first."
        )

    cands = pd.read_parquet(CANDIDATES_PARQUET)
    logger.info("Loaded %d candidate rows", len(cands))

    for col in ("xpass", "pc_target"):
        if col not in cands.columns:
            raise ValueError(
                f"Column '{col}' missing. "
                "Run candidates.main() (for 'xpass') and "
                "pitch_control.main() (for 'pc_target') first."
            )

    # Availability filter: only zones the attacking team can control.
    before = len(cands)
    cands  = cands[
        cands["pc_target"].notna() &
        cands["xpass"].notna() &
        (cands["pc_target"] >= PC_MIN_FOR_OBSO)
    ].copy()
    logger.info("After PC filter (>= %.2f): %d rows (dropped %d)",
                PC_MIN_FOR_OBSO, len(cands), before - len(cands))

    # EPV lookup — H1 EPVPipeline bilinear interpolation (spec §6 reuse).
    epv_pipe = EPVPipeline()
    cands["epv_target"] = [
        float(epv_pipe.epv_at(r["target_x_m"], r["target_y_m"]))
        for _, r in cands.iterrows()
    ]

    # OBSO = xPass * PC * EPV
    cands["obso"] = cands["xpass"] * cands["pc_target"] * cands["epv_target"]

    OBSO_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    cands.to_parquet(OBSO_PARQUET, index=False)
    logger.info("Saved %s  (%d rows)  OBSO mean=%.4f  max=%.4f",
                OBSO_PARQUET, len(cands),
                float(cands["obso"].mean()), float(cands["obso"].max()))

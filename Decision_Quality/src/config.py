"""H2 paths, thresholds, role maps and pitch geometry.

This module is self-contained: H1's relevant constants and helpers are
inlined here (rather than imported from `Space_Control_and_Value/src`)
so H2 can be reorganised under its own `src/` package without import
conflicts. Values are kept identical to H1 — same pitch dimensions, same
pressure radius, same role mapping. 
"""
from pathlib import Path


# =============================================================================
# Paths — H2 lives under Decision_Quality/, but reads some H1 artefacts
# =============================================================================
DQ_ROOT   = Path(__file__).resolve().parent.parent
DATA_DIR  = DQ_ROOT / "data"
CACHE_DIR = DATA_DIR / "cache"
DOCS_DIR  = DQ_ROOT / "docs"
FIGS_DIR  = DOCS_DIR / "figures"
for _d in (DATA_DIR, CACHE_DIR, FIGS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# H1 outputs (read-only inputs for H2). The relative path assumes the
# repository layout `Contextual-Football-Scouting/{Space_Control_and_Value,
# Decision_Quality}/`. If you reorganise either project root, adjust here.
H1_DATA_DIR     = DQ_ROOT.parent / "Space_Control_and_Value" / "data"
HULL_EVENTS_LB  = H1_DATA_DIR / "hull_events_lb.csv"
EPV_GRID_PATH   = H1_DATA_DIR / "EPV_grid.csv"
TOTALS_CSV      = H1_DATA_DIR / "Euro2024_Player_Totals_Distances_Roles.csv"

# H2 outputs
DQ_CORPUS_PATH      = DATA_DIR / "dq_corpus.csv"
XPASS_FEATURES_PATH = DATA_DIR / "xpass_features.parquet"
XPASS_MODEL_PATH    = DATA_DIR / "xpass_model.joblib"

# Long-form table: one row per (event, candidate_teammate) with features
# and the calibrated xPass. ~7× the corpus size; used for alternatives audit
# and as the scaffold for the xEPV / Decision Quality index.
ALTERNATIVES_PATH = DATA_DIR / "alternatives.parquet"

# StatsBomb caches (gitignored)
FRAMES360_CACHE  = CACHE_DIR / "frames360_cache.parquet"
PASS_META_CACHE  = CACHE_DIR / "pass_meta_cache.parquet"


# =============================================================================
# Pitch geometry — UEFA standard 105 × 68 m
# =============================================================================
PITCH_LENGTH_M = 105.0
PITCH_WIDTH_M  = 68.0

# Conversion from StatsBomb yard system (120 × 80) to meters
X_SCALE = PITCH_LENGTH_M / 120.0   # 0.875
Y_SCALE = PITCH_WIDTH_M  /  80.0   # 0.850


# =============================================================================
# Hull-metrics / pressure parameters (mirrored from H1)
# =============================================================================
PRESSURE_RADIUS = 2.5    # meters — "under pressure" threshold
PRESSURE_MIN    = 2      # min opponents within PRESSURE_RADIUS
CORRIDOR_M      = 5.0    # corridor width along the pass line


# =============================================================================
# Analysis filters
# =============================================================================
ANALYSIS_MIN_MINUTES = 135   # filters out players with < 1.5 matches


# =============================================================================
# Filtering thresholds for the H2 corpus
# =============================================================================
# Body parts dropped from the corpus (headers have a different mechanic).
EXCLUDE_BODY_PARTS = ("Head",)

# A chosen pass is "into space" if no in-frame teammate is within this
# distance from pass.end_location. Such events are not passes to a
# specific teammate. 12 m corresponds to the upper bound of receiver
# displacement during ~1.5 s of ball flight at sprint speed, so it
# retains medium-long passes whose receiver was already moving while
# excluding genuine "into-space" balls.
PASS_INTO_SPACE_M = 12.0

# Drop passes whose sender is a goalkeeper. GK distributions (long goal
# kicks, low-pressure box distribution) have a very different geometry
# from outfield decisions; keeping them would teach the xPass model
# patterns that do not generalise to the in-play decision quality use case.
EXCLUDE_GK_SENDERS = True


# =============================================================================
# xPass training
# =============================================================================
# 5-fold cross-validation split BY MATCH to avoid leakage of
# player-specific completion tendencies.
XPASS_CV_FOLDS = 5

# Pass-height categories (one-hot encoded as 2 binary features after
# dropping `Ground Pass` as the implicit baseline).
PASS_HEIGHT_CATS = ("Ground Pass", "Low Pass", "High Pass")


# =============================================================================
# Role mapping: StatsBomb position -> macro-role label (mirrored from H1)
# =============================================================================
ROLE_MAP = {
    'Goalkeeper': 'GK',
    'Right Back': 'FB', 'Left Back': 'FB',
    'Right Wing Back': 'FB', 'Left Wing Back': 'FB',
    'Right Center Back': 'CB', 'Left Center Back': 'CB', 'Center Back': 'CB',
    'Right Defensive Midfield': 'CDM', 'Left Defensive Midfield': 'CDM',
    'Center Defensive Midfield': 'CDM',
    'Right Center Midfield': 'CM', 'Left Center Midfield': 'CM',
    'Center Midfield': 'CM',
    'Right Attacking Midfield': 'CAM', 'Left Attacking Midfield': 'CAM',
    'Center Attacking Midfield': 'CAM',
    'Right Midfield': 'WM', 'Left Midfield': 'WM',
    'Right Wing': 'W', 'Left Wing': 'W',
    'Right Center Forward': 'FW', 'Left Center Forward': 'FW',
    'Center Forward': 'FW',
    'Secondary Striker': 'FW', 'Striker': 'FW',
}

# Collapses small-sample groups for the analysis layer
ROLE_REMAP = {'CDM': 'MID', 'CM': 'MID', 'W': 'WIDE', 'WM': 'WIDE'}

MACRO_ROLES = ['CB', 'FB', 'MID', 'CAM', 'WIDE', 'FW']


def map_role(pos: str) -> str:
    """Map a StatsBomb position string to its macro-role label."""
    return ROLE_MAP.get(str(pos), 'OTHER')

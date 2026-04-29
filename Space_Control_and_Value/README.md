# H1 — Space Control and Value

Implementation of **Hypothesis 1** from the *Contextual Football Scouting* project proposal: a player's quality is measurable by their spatial influence on the pitch, quantified via convex hulls of the opposing block, line-breaker definitions tied to Expected Possession Value (EPV), and the gravity exerted on defenders.

Built on **StatsBomb 360 open data** for UEFA Euro 2024 (`competition_id=55`, `season_id=282`, 51 matches).

The pipeline turns event-level data into a per-player tactical fingerprint built around four composite indices:

- **PROGRESSION** — forward play volume (line-breakers, hull penetrations)
- **DANGEROUSNESS** — threat creation (xT / EPV)
- **RECEPTION** — between-the-lines play and tight-space technique
- **GRAVITY** — spatial pull on the opposing defense

All percentile comparisons are made **within macro-role** (CB / FB / MID / CAM / WIDE / FW), so a centre-back is benchmarked against other centre-backs.

## Pipeline at a glance

```
StatsBomb events + 360 frames
        │
        ▼
  Player totals          ──►  data/Euro2024_Player_Totals_Distances_Roles.xlsx
        │
        ▼
  Hull Metrics Pipeline  ──►  data/hull_events_raw.csv
                              data/hull_zone_baselines.csv
                              data/hull_metrics_aggregated.csv
        │
        ▼
  Directional Gravity         (extends hull_metrics_aggregated.csv)
        │
        ▼
  EPV Pipeline           ──►  data/hull_events_with_epv.csv  (open play only)
        │
        ▼
  Line Breaker Pipeline  ──►  data/hull_events_lb.csv
        │
        ▼
  Player Aggregation     ──►  data/player_space_control_aggregated.csv
        │
        ▼
  Indices + Dashboard    ──►  data/player_space_control_indices.csv
                              4 prototype views (radars / leaderboards / archetypes)
```

## Folder structure

```
Space_Control_and_Value/
├── README.md                          # this file
├── requirements.txt                   # Python dependencies
├── .gitignore
│
├── notebooks/
│   └── H1-Space_Control_and_Value.ipynb               # thin notebook: imports from src/ and shows results
│
├── data/                              # inputs and pipeline outputs
│   ├── EPV_grid.csv                   # input: pitch-wise expected possession value
│   ├── Euro2024_Player_Totals_Distances_Roles.{csv,xlsx}
│   ├── hull_events_*.csv              # pipeline intermediates (gitignored)
│   ├── hull_metrics_aggregated.csv
│   ├── hull_zone_baselines.csv
│   ├── player_space_control_aggregated.csv
│   ├── player_space_control_indices.csv
│   └── cache/                         # StatsBomb 360-frame caches (gitignored)
│
└── src/
    ├── config.py                      # paths, thresholds, role maps
    ├── geometry.py                    # geometric helpers (hull, distance, corridor)
    ├── player_totals.py               # → totals .xlsx
    ├── hull_metrics.py                # → hull_metrics_aggregated.csv
    ├── directional_gravity.py         # extends hull_metrics_aggregated.csv
    ├── epv_pipeline.py                # grid sanity-viz + hull_events_with_epv.csv
    ├── line_breaker.py                # → hull_events_lb.csv
    ├── aggregation.py                 # → player_space_control_aggregated.csv
    ├── indices.py                     # composite-index builder + within-role percentiles
    ├── dashboard.py                   # 4 prototype views (radars, leaderboards, archetypes)
    └── validation.py                  # Cronbach's α + H1 evidence + final export
```

## Quick start

```bash
git clone <this-repo>
cd Contextual-Football-Scouting/Space_Control_and_Value
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Open the notebook (recommended)
jupyter notebook notebooks/H1-Space_Control_and_Value.ipynb
```

The notebook runs each stage of the pipeline in order. Each cell calls into `src/`. To run a single stage from the command line (from this folder):

```bash
python -m src.player_totals          
python -m src.hull_metrics           
python -m src.directional_gravity
python -m src.epv_pipeline
python -m src.line_breaker
python -m src.aggregation
```

The intermediate CSVs are committed for the analysis-only path, so you can skip straight to the index design / dashboard cells of the notebook without running the heavy pipelines.

## Conventions

- **Coordinates**: pitch in meters (105 × 68, UEFA standard). StatsBomb yard coordinates are converted via `X_SCALE = 105/120`, `Y_SCALE = 68/80`.
- **Open play**: the EPV step filters out corners, free kicks, throw-ins and kick-offs. Percentage rates downstream use the open-play subset (`passes_op`).
- **Leave-one-out gravity**: each player's gravity is measured against a baseline that **excludes** their own passes, so high-volume players aren't compared against themselves.
- **Within-role percentiles**: every radar axis is the player's percentile rank inside their macro-role.

# H1 — Space Control and Value

Part of **[Contextual Football Scouting](../README.md)** (Vezzoli & Mio, 2026). For the full framing of the four hypotheses see [`docs/Project_Proposal.pdf`](../docs/Project_Proposal.pdf).

Implementation of **Hypothesis 1**: a player's quality is measurable through their spatial influence on the pitch, quantified via convex hulls of the opposing block, line-breakers weighted by Expected Possession Value (EPV), and the gravity exerted on defenders.

Built on **StatsBomb 360 open data** for UEFA Euro 2024 (`competition_id=55`, `season_id=282`, 51 matches, 272 players after the minutes filter).

## The four indices

Each index is the **mean of within-role percentile ranks** of its mother variables (a CB is benchmarked against other CBs).

- **PROGRESSION** — forward play volume (5 variables)
  `LB Geom /90` + `LB Quality /90` + `LB EPV /90` + `Hull Penetr. /90` + `Def. Bypassed Avg`
- **DANGEROUSNESS** — threat creation (3 variables)
  `EPV Added /90` + `EPV Penetr. /90` + `Circ. EPV /90` (EPV inside the 18 m around goal)
- **RECEPTION** — between-the-lines play and tight-space technique (3 variables)
  `Between Lines %` + `Hull Exits /90` + `Press. Resist %` (passes received with ≥ 2 opponents within 2.5 m)
- **GRAVITY** — spatial pull on the opposing defense (3 variables)
  `Space Attraction %` + `Gravity Hull %` + `Def. Pull |m|` (defensive centroid displacement, leave-one-out)

Quick glossary: **convex hull** = polygon enclosing the visible opponents in the 360 frame; **line-breaker** = successful pass that bypasses ≥ 3 opponents inside a 5 m corridor along the pass line; **EPV** = probability of scoring in the next actions given the ball location.

## Pipeline

```
StatsBomb events + 360 frames
        │
        ▼
  Player totals          ──►  Euro2024_Player_Totals_Distances_Roles.xlsx
        │
        ▼
  Hull Metrics           ──►  hull_events_raw.csv
                              hull_zone_baselines.csv
                              hull_metrics_aggregated.csv
        │
        ▼
  Directional Gravity         (extends hull_metrics_aggregated.csv)
        │
        ▼
  EPV Pipeline           ──►  hull_events_with_epv.csv  (open play only)
        │
        ▼
  Line Breaker           ──►  hull_events_lb.csv
        │
        ▼
  Player Aggregation     ──►  player_space_control_aggregated.csv
        │
        ▼
  Indices + Dashboard    ──►  player_space_control_indices.csv
        │                     (radar + leaderboard + archetype scatter + top line-breakers)
        ▼
  Validation                  Cronbach's α + H1 evidence + scouting discoveries
```

## Key findings

**Internal validity (Cronbach's α, averaged over the 6 roles)**
| Index | Mean α | Reading |
|---|---:|---|
| PROGRESSION | **0.77** | tight construct, the 5 variables measure the same dimension |
| DANGEROUSNESS | **0.54** | acceptable for a multi-faceted index |
| RECEPTION | **0.41** | composite, high on CB and CAM, low on FW (small sample) |
| GRAVITY | **−0.03** | **multi-directional** construct, the three variables capture different phenomena (expected, not a flaw) |

The four composites are **weakly correlated with each other** (|r| ≤ 0.56 across the full pool, target < 0.6) → no redundancy.

**Core H1 test: contextual vs naive (within-role, n = 272)**

| Index | Naive proxy | Spearman ρ | mean \|Δ\| | % \|Δ\| > 20 |
|---|---|---:|---:|---:|
| PROGRESSION | passes /90 | **0.47** | 21.7 | **47%** |
| DANGEROUSNESS | total EPV /90 | 0.84 | 12.7 | 21% |
| RECEPTION | between-lines % | 0.75 | 14.9 | 29% |
| GRAVITY | gravity proximity % | 0.60 | 18.5 | 39% |

Reading: PROGRESSION is where the gap hits hardest — almost one player in two shifts by more than 20 percentile points moving from the naive ranking to the contextual one. For MIDs, the naive top-15 (passes/90) and the contextual top-15 (PROGRESSION) overlap on only 10/15: **5 new names** enter (e.g. Trent Alexander-Arnold, Mateo Kovačić, Robert Andrich) and as many drop out.

### Scouting discoveries — players surfaced only by context
![Scouting discoveries](docs/figures/scouting_discoveries.png)

### Naive overrating — players inflated by team context
![Naive overrating](docs/figures/naive_overrating.png)

## Folder structure

```
Space_Control_and_Value/
├── README.md
├── requirements.txt
├── .gitignore
│
├── notebooks/
│   └── H1-Space_Control_and_Value.ipynb       # thin notebook: imports from src/ and shows results
│
├── docs/figures/                               # images used by this README
│
├── data/                                       # pipeline inputs and outputs
│   ├── EPV_grid.csv                            # input: EPV grid (Friends-of-Tracking-Data)
│   ├── Euro2024_Player_Totals_Distances_Roles.{csv,xlsx}
│   ├── hull_events_*.csv                       # intermediates (gitignored)
│   ├── hull_metrics_aggregated.csv
│   ├── hull_zone_baselines.csv
│   ├── player_space_control_aggregated.csv
│   ├── player_space_control_indices.csv        # final output (4 indices + 14 percentiles)
│   └── cache/                                  # StatsBomb 360-frame cache (gitignored)
│
└── src/
    ├── config.py                # paths, thresholds, role maps
    ├── geometry.py              # geometric helpers (hull, distance, corridor)
    ├── player_totals.py         # → totals .xlsx
    ├── hull_metrics.py          # → hull_metrics_aggregated.csv
    ├── directional_gravity.py   # extends hull_metrics_aggregated.csv
    ├── epv_pipeline.py          # → hull_events_with_epv.csv
    ├── line_breaker.py          # → hull_events_lb.csv
    ├── aggregation.py           # → player_space_control_aggregated.csv
    ├── indices.py               # 4 composites + within-role percentiles
    ├── dashboard.py             # 4 prototype views (radar / leaderboard / archetypes / top LB)
    └── validation.py            # Cronbach's α + H1 evidence + final export
```

## Quick start

```bash
git clone https://github.com/ArMat-Analytics/Contextual-Football-Scouting
cd Contextual-Football-Scouting/Space_Control_and_Value
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

jupyter notebook notebooks/H1-Space_Control_and_Value.ipynb
```

The notebook runs the pipeline in order, one section per stage. To run a single stage from the CLI:

```bash
python -m src.player_totals
python -m src.hull_metrics
python -m src.directional_gravity
python -m src.epv_pipeline
python -m src.line_breaker
python -m src.aggregation
```

The intermediate CSVs are committed for the *analysis-only* path: you can jump straight to the index design / validation / dashboard cells without re-running the heavy pipelines.

## Conventions

- **Coordinates**: pitch in meters (105 × 68, UEFA standard). StatsBomb yard coordinates are converted via `X_SCALE = 105/120`, `Y_SCALE = 68/80`.
- **Open play**: the EPV step filters out corners, free kicks, throw-ins and kick-offs. Downstream rates use the open-play subset (`passes_op`).
- **Leave-one-out gravity**: each player's gravity is measured against a baseline that **excludes** their own passes.
- **Within-role percentiles**: every axis of every index is the player's percentile rank inside their macro-role (CB / FB / MID / CAM / WIDE / FW).
- **Min minutes**: 90 to enter the pool, 135 (= 1.5 matches) for the validation tables.

---

*Matteo Vezzoli & Armando Mio — 2026*

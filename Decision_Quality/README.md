# H2 — Decision Quality

Part of **[Contextual Football Scouting](../README.md)** (Vezzoli & Mio, 2026). For the full framing of the four hypotheses see [`docs/Project_Proposal.pdf`](../docs/Project_Proposal.pdf).

Implementation of **Hypothesis 2**: a player's quality is measurable through *how well they choose* among the passing options actually available to them — not the value of the pass they played, but its value **relative to the options they ignored**.

Built on **StatsBomb 360 open data** for UEFA Euro 2024 (`competition_id=55`, `season_id=282`, 51 matches, 272 players after the minutes filter — the same pool as H1).

## The index

For every open-play pass we reconstruct the **alternative set**: every in-frame teammate the player *could* have passed to. Each candidate is scored on two layers:

- **xPass** — `P(complete | sender, target, freeze frame)`, a calibrated GBM trained on 30,913 events (5-fold GroupKFold by match, AUC ≈ 0.92).
- **xEPV** — the expected net possession value of attempting that pass:

  `xEPV(target) = xPass · EPV(target) − (1 − xPass) · EPV(105 − target_x, target_y)`

  (reward if it arrives, mirrored opponent value if it is lost; symmetric 1:1 weighting).

The headline number is **`DQ_index`**:

> Per event, **Score** = the share of the in-frame alternatives whose xEPV is at or below the xEPV of the pass the player actually chose (events with ≥ 2 alternatives). The player Score is the mean over their events. **`DQ_index` is the within macro-role percentile of that Score** (a CB is benchmarked against other CBs).

A within-event rank cancels the pitch-zone value level and does not punish players who operate where many options are valuable — the reason a regret-vs-best aggregation was tested and **rejected**.

**Companion:** **Value Impact** = mean `xEPV(chosen) − mean(xEPV alternatives)`, the value-weighted view of the same signal (the role `epv_added` plays in H1).

## Pipeline

```
H1 hull_events_lb.csv + StatsBomb 360 frames
        │
        ▼   Notebook 1 — H2-Contextual_Decision_Making.ipynb
  Corpus construction      ──►  dq_corpus.csv          (30,913 events)
        │                       header / GK / into-space / no-frame filters
        ▼
  Feature engineering      ──►  xpass_features.parquet (13 model columns)
        │
        ▼
  xPass model              ──►  xpass_model_gbm_sigmoid.joblib
        │                       (GBM + sigmoid calibrator, AUC ≈ 0.92)
        ▼
  Alternatives table       ──►  alternatives.parquet   (222,274 rows, ~7.2/event)
        │
        ▼   Notebook 2 — H2-xEPV_and_Decision_Quality.ipynb
  xEPV per candidate            (xPass × EPV grid, mirrored turnover term)
        │
        ▼
  Decision Quality index   ──►  player_decision_quality.csv
        │                       (DQ_index + Value Impact + raw/per90/% block)
        ▼
  Validation                    robustness + construct + face validity
```

The split is deliberate: **xPass** is a supervised model (training, CV, calibration, SHAP) refit rarely; `alternatives.parquet` is the clean hand-off artefact; the **value / decision layer iterates fast** on top of it without re-running the ML.

## Key findings

**Robustness** — the player ordering is refit under every arbitrary knob and compared to the shipped index by rank Spearman:

| Knob moved | Range tested | Rank Spearman vs shipped |
|---|---|---:|
| `XEPV_FAILURE_SCALE` (turnover weight) | 0.5 → 1.25 | **≥ 0.95** (min 0.957) |
| Minutes floor | 135 → 300 | **≥ 0.97** |
| `MIN_ALTERNATIVES` | 2 → 4 | **≥ 0.95** (min 0.956) |

Each knob moves the *level* of the index, not the *ranking* — the 1:1 turnover weight is a modelling choice, not a ranking choice. `DQ_index` ↔ `n_decisions` ρ ≈ −0.02 (n.s.): the index is **not** an involvement-volume proxy.

**Construct validity** (within-role Spearman, n = 272)

| Pair | ρ | Reading |
|---|---:|---|
| `DQ_index` ↔ Value Impact | **0.76** | strong → Value is the value-weighted companion, not an independent axis |
| Picks-best % ↔ Picks-worst % | **0.12** | weak → the two single-player-page axes are distinct skills |

All four quadrant archetypes are populated in every macro-role.

**Face validity** — recognised passers land high-to-upper-mid in their role (Kroos ≈ 88th percentile, De Bruyne ≈ 85th, Gündoğan ≈ 70th, Foden ≈ 68th, Rodri ≈ 65th). Tempo-controllers (Modrić, Xhaka, Barella, Kimmich) sit lower: a **declared scope limit**, not a defect — xEPV is a per-pass quantity with no game state, so deliberate tempo control reads as "safe" by selection style. Read the top percentiles together with `n_decisions`.

## Folder structure

```
Decision_Quality/
├── README.md
├── requirements.txt
├── .gitignore
│
├── notebooks/
│   ├── H2-Contextual_Decision_Making.ipynb     # xPass model + alternatives table
│   └── H2-xEPV_and_Decision_Quality.ipynb      # xEPV + DQ index + validation
│
├── docs/
│   └── H2_Decision_Quality_Decisions.docx       # design audit trail (decisions log)
│
├── data/                                        # pipeline inputs and outputs
│   ├── dq_corpus.csv                            # H2 working corpus (30,913 events)
│   ├── alternatives.parquet                     # hand-off artefact (222,274 rows)
│   ├── player_decision_quality.csv              # final output (DQ_index + context)
│   ├── xpass_features.parquet                   # model columns (gitignored, regenerable)
│   ├── *.joblib                                 # calibrated model (gitignored)
│   └── cache/                                   # StatsBomb 360-frame cache (gitignored)
│
└── src/
    ├── config.py            # paths, thresholds, role maps (H1 constants inlined)
    ├── geometry.py          # geometric helpers (mirrored from H1)
    ├── corpus.py            # → dq_corpus.csv
    ├── features.py          # 13-column feature row per pass
    ├── xpass.py             # train / CV / calibrate / SHAP → xPass model
    ├── xepv.py              # xEPV formula (one definition, one place)
    ├── decision_quality.py  # Score → DQ_index within-role percentile
    ├── validation.py        # robustness + construct + face validity
    └── viz.py               # pitch plots + the two website page graphs
```

## Quick start

```bash
git clone https://github.com/ArMat-Analytics/Contextual-Football-Scouting
cd Contextual-Football-Scouting/Decision_Quality
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 1. xPass model + alternatives table (heavy: trains the model)
jupyter notebook notebooks/H2-Contextual_Decision_Making.ipynb
# 2. xEPV + Decision Quality index + validation
jupyter notebook notebooks/H2-xEPV_and_Decision_Quality.ipynb
```

`dq_corpus.csv`, `alternatives.parquet` and `player_decision_quality.csv` are committed for the **analysis-only path**: you can open the second notebook and jump straight to the index design / validation cells without re-running the xPass training in the first. The notebooks are thin orchestrators — all logic lives in `src/`.

## Conventions

- **Coordinates**: pitch in meters (105 × 68, UEFA standard), attack to the right; StatsBomb yard coordinates converted via `X_SCALE = 105/120`, `Y_SCALE = 68/80` — identical to H1.
- **Pool**: H1's 272 players (≥ 135 minutes, one authoritative macro-role per player from `player_space_control_aggregated.csv`). No minimum pass count, so the H2 pool equals the H1 pool exactly.
- **Within-role percentiles**: `DQ_index` is the player's percentile rank inside their macro-role (CB / FB / MID / CAM / WIDE / FW) — the only percentile, by design.
- **Corpus filters**: open play only; headers, goalkeeper senders and pass-into-space (no in-frame teammate within 12 m of the end location) are excluded — the xPass model never sees them.
- **xEPV failure scale**: `XEPV_FAILURE_SCALE = 1.0` (symmetric mirror penalty); shown by the robustness table to set the level, not the ranking.

---

*Matteo Vezzoli & Armando Mio — 2026*

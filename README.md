<div align="center">

<img src="docs/logo.png" alt="Contextual Football Scouting" width="160"/>

# Contextual Football Scouting

**Ranking players by *what they do with the space around them*, not by how much they touch the ball.**

*Matteo Vezzoli & Armando Mio — 2026*

</div>

---

Traditional scouting stats reward **volume**: passes played, distance covered, touches taken. They miss the **context** that makes those numbers mean anything. The same pass is brilliant against a compact block and trivial against an open one, and most of what a player does of value happens *without the ball*. Worse, they carry a heavy **team bias**: a midfielder in a possession-dominant side piles up numbers a better player in a pressed side never gets the chance to.

This project reads players from **StatsBomb 360 spatial data** instead of the event log alone. Three completed studies, each with its own metric, notebook and write-up, feed one platform: a contextual scouting tool for UEFA Euro 2024 built to cut through team bias.

Two things tie the studies together:

- **Expected Possession Value (EPV)** is the common currency. Every metric grades a player by the *value* of what they do, not the *volume*. That is the main channel through which team strength inflates traditional stats: a player no longer looks better just for touching the ball more in a possession-heavy side.
- **Within-role percentiles** are the common lens. A centre-back is ranked against other centre-backs, never against the whole pitch, so the role effect comes out on top of the volume one.

## The three hypotheses

| | Hypothesis | What it measures | Headline metric |
|---|---|---|---|
| **[H1](H1_Space_Control_and_Value/)** | **Space Control & Value** | A player's quality is their **spatial influence**, not their volume: the shape of the block they break (convex hulls), the threat they add (EPV), the pull they exert (gravity). | 4 indices: PROGRESSION · RECEPTION · GRAVITY · DANGEROUSNESS |
| **[H2](H2_Decision_Quality/)** | **Contextual Decision-Making** | Not the value of the pass played, but its value **relative to the options ignored**: among the teammates actually available in the frame, did the player choose the best lane? | DQ index (+ Value Impact) |
| **[H3](H3_Off_Ball_Movement/)** | **Off-Ball Movement** | The **dangerous off-ball space a player occupies that teammates fail to use**: high-value runs that are made, seen by the freeze frame, and left unserved. | URS /90 (Uncapitalized Run Score) |

Each folder is named with its hypothesis prefix and stands on its own. Its README covers the metric, the validation and the scout-facing findings.

## What the data shows

- **H1** moves the leaderboard most on DANGEROUSNESS: more than half the pool shifts by 20+ percentile points going from "passes /90" to "EPV created /90". Passing volume is a poor proxy for value created.
- **H2** tells apart the players who default to the safe pass from those who pick the best lane actually on offer, on the same 272-player pool as H1.
- **H3** surfaces the shadow runners. Pedri exposes more off-ball value than anyone at the tournament (URS /90 = 2.78) yet is served on barely 16% of it. He and Kroos sit on the same exposure but split on capitalisation: one a threat his team keeps missing, the other a threat his team uses.

## The platform

The three studies feed an **interactive web dashboard** ([`webapp/`](webapp/)). A scout can:

- **Read a player's profile**, with the H1, H2 and H3 cards side by side.
- **Run head-to-heads**, two players of the same macro-role overlaid on the same radars so the comparison stays within role.

Every card follows the same pattern: a magnitude headline next to a within-role percentile radar that breaks down the profile behind it, with the raw scout-facing values shown underneath so low-sample profiles can be discounted.

## Data

- **StatsBomb Open Data**: the **360 frames** for UEFA Euro 2024 (`competition_id=55`, `season_id=282`). 51 matches, with a freeze-frame snapshot of every visible player at each event. The analysis pool is the **272 players** who clear a 135-minute floor (no goalkeepers), shared identically across H1, H2 and H3.
- **Transfermarkt**: market values, to read on-pitch performance against cost. Scraped via [`EURO2024_Transfermarkt_Scraper/`](EURO2024_Transfermarkt_Scraper/).

## Repository structure

```
Contextual-Football-Scouting/
├── README.md                       # this file
├── docs/
│   └── Project_Proposal.pdf        # the original four-hypothesis proposal
│
├── H1_Space_Control_and_Value/     # Hypothesis 1: spatial influence (hulls, EPV, gravity)
├── H2_Decision_Quality/            # Hypothesis 2: contextual decision-making
├── H3_Off_Ball_Movement/           # Hypothesis 3: uncapitalised off-ball runs
│   └── (each: README.md, notebooks/, src/, data/, docs/figures/)
│
├── EURO2024_Transfermarkt_Scraper/ # market-value scrapers
└── webapp/                         # interactive dashboard (backend, frontend, data import)
```

Each hypothesis folder is independent: its own `requirements.txt`, a thin notebook that imports from `src/` and shows results, and committed output CSVs for an analysis-only path. H2 and H3 read a few read-only artefacts from H1's `data/` folder (the shared 272-player pool and role assignment), so keep the folder layout intact or adjust the paths in each project's `src/config.py`.

## Quick start

Pick a hypothesis and follow its README. For example:

```bash
git clone https://github.com/ArMat-Analytics/Contextual-Football-Scouting
cd Contextual-Football-Scouting/H1_Space_Control_and_Value
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
jupyter notebook notebooks/H1-Space_Control_and_Value.ipynb
```

The same shape works for H2 and H3. H2/H3 expect H1's outputs to be present first (they inherit its player pool and roles).

---

<div align="center">

**[H1 — Space Control & Value](H1_Space_Control_and_Value/)** · **[H2 — Decision Quality](H2_Decision_Quality/)** · **[H3 — Off-Ball Movement](H3_Off_Ball_Movement/)**

*Matteo Vezzoli & Armando Mio — 2026*

</div>

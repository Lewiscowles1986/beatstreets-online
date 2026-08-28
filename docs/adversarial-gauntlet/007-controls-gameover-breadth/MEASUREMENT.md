# MEASUREMENT — 007-controls-gameover-breadth

## Before (iteration 006)

| Gate | Metric | Status |
|---|---|---|
| title (`beatstreets-title.png`, seed 1) | 0.10% | HARD ≤1% |
| intro (`beatstreets-gameplay.png`, seed 1) | 7.82% | informational |
| stage 1 (`beatstreets-gameplay-stage.png`, seed 1, freeze=345) | 0.79% | HARD ≤1.5% |
| controls | — | not gated |
| game-over win/lose | — | not gated |

## After (iteration 007)

| Gate | Metric | Status |
|---|---|---|
| title (`beatstreets-title.png`, seed 1) | **0.00%** (19/384000) | HARD ≤1% |
| intro (`beatstreets-gameplay.png`, seed 1) | **0.00%** (0/384000) | **HARD ≤2%** (promoted) |
| stage 1 (`beatstreets-gameplay-stage.png`, seed 1, freeze=345) | **0.73%** (2810/384000) | HARD ≤1.5% |
| controls (`beatstreets-controls.png`, seed 1) | **0.00%** (0/384000) | **HARD ≤0.5%** (new) |
| game-over win (`beatstreets-gameover-win.png`, seed 1) | **0.00%** (0/384000) | **HARD ≤0.5%** (new) |
| game-over lose (`beatstreets-gameover-lose.png`, seed 1) | **0.00%** (0/384000) | **HARD ≤0.5%** (new) |

All metrics at threshold 8/channel, 800×480 (384000 px).

## New reference files (regenerated via the Python driver; md5 recorded)

| Reference | md5 | Driver command |
|---|---|---|
| `e2e/reference/beatstreets-controls.png` | `112dbf65e90b18e9792fb5cac26f27c8` | `--state controls --seed 1` |
| `e2e/reference/beatstreets-gameover-win.png` | `3c3a45541b651528aea6247d45a7afcb` | `--state gameover --result win --seed 1` |
| `e2e/reference/beatstreets-gameover-lose.png` | `829855b8fd18e964375577ca1f33a1f7` | `--state gameover --result lose --seed 1` |

`beatstreets-gameplay.png` (intro) was regenerated to its committed md5
`3b0d2ec0d2eb76cbeeab1d380b5b5d8a` after an accidental near-black overwrite during a
trace run; the committed reference is unchanged.

## G1 — Controls (HARD ≤0.5%)

- **Python**: `State.CONTROLS` = `screen.fill((0,0,0))` + `screen.blit("menu_controls",
  (0,0))`. The driver presses button 0 once (TITLE→CONTROLS) and dumps the static
  full-frame blit.
- **Web**: `controls.html` e2e entry blits the identical `menu_controls` sprite
  (pixel-identical to the Python image) onto black at (0,0).
- **Metric**: 0.00% (0/384000). The web renders the same sprite onto black, so the only
  residual is sub-threshold anti-aliasing / PNG round-trip jitter.
- **Threshold**: 0.5% = `min(2 × 0.00%, 15%)` headroom rule, rounded up to a clean
  number. ~2 orders of magnitude below every structural-failure signature (missing
  sprite ≈ 100%, wrong sprite ≈ 100%, offset blit ≈ 10%+).

## G2 — Game-over (HARD ≤0.5%)

- **Python**: `State.GAME_OVER` blits `status_win`/`status_lose` centred
  (`WIDTH//2 - w//2, HEIGHT//2 - h//2`); both sprites are 800×480, so the centred blit
  lands at (0,0). The driver reaches GAME_OVER deterministically via a **driver-only
  hook** (the Python game is never modified):
  - `--result lose`: set `game.player.lives = 0` → PLAY update sees `lives <= 0` →
    GAME_OVER → `status_lose`.
  - `--result win`: set `stage_index = len(STAGES)`, `text_active = False`, and raise
    `max_scroll_offset_x` so `update()`'s `next_stage()` (which would re-activate the
    outro text) is NOT triggered → `check_won()` True → GAME_OVER → `status_win`.
- **Web**: `gameover.html?result=win|lose` e2e entry blits the corresponding sprite
  (pixel-identical) onto black.
- **Metric**: 0.00% for both. Both status sprites are fully opaque, so compositing onto
  black = the sprite itself.
- **Threshold**: 0.5%, same derivation as G1.

## G3 — Intro alignment (7.82% → 0.00%, promoted to HARD ≤2%)

The historical 7.82% was diagnosed (side-by-side + per-band diff heatmap) as two
mechanical causes, both fixed:

1. **PNG gamma chunk (colour).** The font glyph sprites carried a `gamma`/`chromaticity`
   chunk that the browser applies on decode, shifting glyph colours vs Python's raw
   rendering. Stripped from the web font sprites (pixel data preserved; verified
   identical). The same fix was applied to `status_win`/`status_lose` for the game-over
   gates. This alone moved the metric 7.82% → 6.89% (the non-stolen-item lines matched;
   the stolen-item lines still differed).
2. **Wrong stolen item (content).** At seed 1 Python's `choice(stolen_items)` returns
   index 2 ("THE COMPLETE WORKS OF\nSHAKESPEARE"), but the intro entry hardcoded index 1
   ("YOUR COPY OF CODE THE\nCLASSICS VOL 2"). The entry now reads `?stolen=N` (default 2,
   the seed-1 choice). With the correct item + gamma stripped, the metric is **0.00%**.

- **Threshold**: 2% per the GOAL's "promote to hard only if honestly tight (≤2%)" rule.
  ~2 orders of magnitude below a missing/wrong-text structural failure (≈ 7.8%).

## G4 — No regressions

- `npm test` — 76 engine + 35 web, green.
- `npm run precommit` — one run, green (exit 0; only the pre-existing GameCanvas
  `freezeAtTimer` exhaustive-deps lint warning, 0 errors).
- Fidelity: title 0.00% HARD, intro 0.00% HARD, stage 0.73% HARD, controls 0.00% HARD,
  game-over win/lose 0.00% HARD. Game-canvas mount + orientation green.

## Residual notes

- The stage metric improved 0.79% → 0.73% as a side effect of the font-sprite gamma
  strip (the HUD score glyphs render raw now). The remaining 0.73% is HUD bar-clip /
  sprite-edge jitter, unchanged in nature from round 006.
- The gamma strip was applied only to the font sprites + status images (the sprites used
  by the intro/controls/game-over gates). The other ~1300 sprites (hero/enemy/background)
  still carry gamma chunks; the browser applies gamma to them, a pre-existing rendering
  divergence that does not affect the gated screens and is out of scope for this round.

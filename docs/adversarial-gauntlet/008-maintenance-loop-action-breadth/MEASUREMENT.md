# MEASUREMENT — 008-maintenance-loop-action-breadth

## Before (iteration 007)

| Gate | Metric | Status |
|---|---|---|
| title (`beatstreets-title.png`, seed 1) | 0.00% | HARD ≤1% |
| intro (`beatstreets-gameplay.png`, seed 1) | 0.00% | HARD ≤2% |
| stage 1 (`beatstreets-gameplay-stage.png`, seed 1, freeze=345) | 0.73% | HARD ≤1.5% |
| controls (`beatstreets-controls.png`, seed 1) | 0.00% | HARD ≤0.5% |
| game-over win/lose (`beatstreets-gameover-*.png`, seed 1) | 0.00% | HARD ≤0.5% |
| gameplay-action frames | — | not gated |

## After (iteration 008)

| Gate | Metric | Status |
|---|---|---|
| title (`beatstreets-title.png`, seed 1) | **0.01%** (24/384000) | HARD ≤1% |
| intro (`beatstreets-gameplay.png`, seed 1) | **0.00%** | HARD ≤2% |
| stage 1 (`beatstreets-gameplay-stage.png`, seed 1, freeze=345) | **0.73%** | HARD ≤1.5% |
| controls (`beatstreets-controls.png`, seed 1) | **0.00%** | HARD ≤0.5% |
| game-over win (`beatstreets-gameover-win.png`, seed 1) | **0.00%** | HARD ≤0.5% |
| game-over lose (`beatstreets-gameover-lose.png`, seed 1) | **0.00%** | HARD ≤0.5% |
| action: enemy attack (`beatstreets-action-enemyattack.png`, seed 1) | **8.37%** | **INFORMATIONAL** (new) |
| action: hero punch (`beatstreets-action-heropunch.png`, seed 1) | **9.22%** | **INFORMATIONAL** (new) |

All metrics at threshold 8/channel, 800×480 (384000 px). The action metrics are the
measured web-vs-python diff; they are informational (see the blocker below).

## New reference files (regenerated via the Python driver; md5 recorded)

| Reference | md5 | Driver command |
|---|---|---|
| `e2e/reference/beatstreets-action-enemyattack.png` | `d7d9d131f13c010cd13ae5bc5c402618` | `--state play --skip-intro --frames-to-play 290 --seed 1 --hold right:0:290` |
| `e2e/reference/beatstreets-action-heropunch.png` | `28dc563b84822bfda0eae4748af79ab1` | `--state play --skip-intro --frames-to-play 185 --seed 1 --hold right:0:180 --press 180:0` |

The existing references (intro/stage/controls/game-over) are unchanged — the driver
edits are additive (new `--press`/`--hold` args) and the default captures reproduce
their committed md5s.

`beatstreets-title.png` WAS regenerated: the current driver (SDL dummy video driver)
produces a capture closer to the raw `title0` blit than the committed cocoa capture
(the cocoa capture flattens the logo's semi-transparent glow — a capture-side artifact
the title gate's per-region compensation already accounts for). The title gate still
passes at 0.01% (24/384000, HARD ≤1%). This is a driver-capture difference, not a
regression from the `--press`/`--hold` edits (verified: disabling the new get_x/get_y
patch leaves the title capture unchanged).

## G1 — Maintenance loop (`npm run fidelity`)

- `scripts/fidelity.mjs` regenerates ALL references via the driver into a temp dir,
  md5-compares each against `e2e/reference/` (identical → kept silently; changed →
  replaced + old→new md5 printed), builds, runs the fidelity + orientation gates, and
  cats the metric JSONs (`e2e/screenshots/fidelity-metrics.json` +
  `fidelity-action-metrics.json`).
- Parent-repo convenience: `make fidelity` (root Makefile) calls it.
- Verified end-to-end in this sandbox: all references unchanged, all gates green, metric
  table printed.

## G2 — CI workflow

- `.github/workflows/fidelity.yml`: on push/PR — setup-node 20 + npm cache, `npm ci`,
  `npx playwright install --with-deps chromium`, `npm run build`, then the fidelity +
  orientation gates (chromium, workers=1); uploads `e2e/screenshots` + `playwright-report`
  on failure.
- **Committed untested-in-CI**: this sandbox has no GitHub runner. Validated locally by
  running the same commands (see BUILDER.md).

## G3 — Gameplay-action breadth (INFORMATIONAL)

The driver gained a deterministic action schedule: `--press FRAME:BUTTON` (repeatable)
and `--hold DIR:FROM:TO` (repeatable), indexed in live-gameplay space (frame 0 = first
frame after the intro fade, game timer 255). The web stage entry mirrors it via
`?press=`/`?hold=` query params, so the web replays the identical input schedule.

Two authentic mid-combat frames captured at seed 1:

1. **Enemy attack on hero** — the vax walks in and attacks; the hero is in hit
   animation. `--hold right:0:290`, freeze at timer 545.
2. **Hero punch connecting** — the hero walks to the enemy and punches; the punch
   connects. `--hold right:0:180 --press 180:0`, freeze at timer 440.

### Trace-derived blocker (why these are INFORMATIONAL, not HARD)

The web engine's combat RNG is NOT bit-aligned with Python's. Comparing the RNG traces
(`--trace-rng` vs the engine's `TracingRng`) at the same schedule:

- The first ~16 `determine_attack randint(0,19)` draws match bit-for-bit, and both
  simulations have the enemy attack at the same live frame with the same attack
  (`vax_pound`).
- **Divergence**: Python's enemy keeps re-engaging and attacks the hero three times
  (live frames ~17, ~126, ~265); the web's enemy attacks once and then stops drawing
  `determine_attack` (16 draws vs Python's 111). The web's enemy AI therefore does not
  reproduce Python's post-attack re-engagement, so the two simulations diverge a few
  frames into combat.

The measured web-vs-python diff is ~8% (vs 0.7% for the idle stage). The gates assert
only a gross structural-failure bound (the scene rendered, not blank/missing) and log
the diff + this blocker. A future round that fixes the web's enemy re-engagement can
promote these to HARD once the trace proves bit-alignment.

## G4 — No regressions

- `npm test` — green.
- `npm run precommit` — one run, green (exit 0).
- Fidelity: title 0.00% HARD, intro 0.00% HARD, stage 0.73% HARD, controls 0.00% HARD,
  game-over win/lose 0.00% HARD; action enemy-attack 8.37% INFORMATIONAL, action
  hero-punch 9.22% INFORMATIONAL. Game-canvas mount + orientation green.

## Residual notes

- The action-frame gates are informational because the web's combat RNG diverges from
  Python's (enemy re-engagement). This is a pre-existing engine limitation, not a
  regression introduced this round; the idle-stage gate (0.73%) remains HARD.

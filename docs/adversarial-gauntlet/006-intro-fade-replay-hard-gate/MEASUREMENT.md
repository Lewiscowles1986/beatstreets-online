# MEASUREMENT — 006-intro-fade-replay-hard-gate

## Before (iteration 005, `jumpToStage` skipped intro + fade)

| Gate | Metric | Status |
|---|---|---|
| title (`beatstreets-title.png`, seed 1) | 0.10% | HARD ≤1% |
| intro (`beatstreets-gameplay.png`, seed 1) | 7.82% | informational |
| stage 1 (`beatstreets-gameplay-stage.png`, seed 1, freeze=345) | 3.53% (13554/384000) | **informational** |

Draw counts at the freeze point (engine-level, `src/game/sound-parity.test.ts`):
**web 85** vs **python 184**. The 99 intro-text teletype draws were unreached because
`jumpToStage` set `text_active=false` immediately; the GameCanvas Host also double-built
the Game (ctor + `startPlay`, and under StrictMode's dev double-mount).

## Ground truth — corrected python draw table (this round, real `--trace-rng`)

Captured with `tools/capture_beatstreets_frame.py --seed 1 --skip-intro --frames-to-play
90 --trace-rng`. **184 draws total = 85 ctor + 99 intro teletype.** There are NO fade and
NO live-combat draws: the idle player never reaches the scroll boundary, so no enemies
spawn and no combat sound fires; the 255-frame fade is a pure visual overlay that draws
no RNG. (This corrects the 005/GOAL decomposition "85 + 99 intro/fade + 51 combat",
which summed to 235 — the 51 "combat" draws were never actually in the idle-player
trace.)

| Draw index | Frame (driver) | Site | Draw | Count |
|---|---|---|---|---|
| 0–83 | 2 | `__init__` (setup_stages) | `randint(0,2)` enemy colour_variant | 84 |
| 84 | 2 | `__init__` | `choice(stolen_items)` → "THE COMPLETE WORKS OF\nSHAKESPEARE" | 1 |
| 85–183 | 8…722 | `get_sound` (intro teletype) | `randint(0,0)` teletype | 99 |
| — | 734–1081 | (fade window + 90 live frames) | (none) | 0 |
| **Total at freeze (timer 345)** | | | | **184** |

## After (iteration 006, real intro/fade replay)

`stage.html` now replays the real flow the driver runs: title→controls→play (button-0
presses), the intro story text fully teletypes (all 99 `randint(0,0)` draws), the e2e
skips it at `[data-intro-complete]` (timer → 0), then runs the 255-frame fade window + 90
live frames to timer 345 and freezes. `StrictMode` is removed from the e2e entry and the
Host reuses its ctor Game for the first play, so the seeded capture builds **one** Game.

| Gate | Metric | Status |
|---|---|---|
| title (`beatstreets-title.png`, seed 1) | 0.10% | HARD ≤1% |
| intro (`beatstreets-gameplay.png`, seed 1) | 7.82% | informational |
| stage 1 (`beatstreets-gameplay-stage.png`, seed 1, freeze=345) | **0.79%** (3031/384000) | **HARD ≤1.5%** |

Web draw counts at the freeze point (`src/game/sound-parity.test.ts`, engine-level):

| Phase | Web | Python |
|---|---|---|
| Constructor (world-setup + stolen choice) | 85 | 85 |
| Intro teletype (`randint(0,0)`) | 99 | 99 |
| Fade window + 90 live frames (idle player) | 0 | 0 |
| **Total at freeze** | **184** | **184** |

### Bit-alignment evidence (G2)

- **Draw count**: web = python = 184 at the freeze point (asserted).
- **Per-draw site/sequence**: the 99 post-ctor web draws are all `randint(0,0)`
  teletype, matching Python's 99 `get_sound → randint(0,0)`.
- **Sequence hash**: SHA-256 over the 183 numeric draws (`kind(args)=value`, ctor 84 +
  teletype 99) matches the Python trace bit-for-bit at seed 1:
  `05f25a391e92a3f447e87f49747c9122941d04237529d289f8aa09c97be567a1`.
  (The single `choice` value is asserted separately.)
- The engine MT19937 core was already verified in 004; frame flow is now aligned, so the
  only residual is sub-percent rendering jitter, not a PRNG/frame-flow divergence.

## Threshold derivation (G3)

- Aligned metric: **0.79%** (3031/384000, threshold 8/channel), **rock-stable** across
  repeated runs (exactly 0.79% on each of several runs).
- Residual sources: HUD bar-clip / status-frame edge (~0.42%) + hero sprite edge
  (~0.34%), both deterministic rendering differences, not state divergence.
- Threshold = **1.5%** = `min(2 × 0.79%, 15%)` per the GOAL's headroom rule, rounded down
  to a clean number. ~1.9× the measured metric absorbs minor anti-aliasing/±1-sprite-edge
  jitter while sitting an order of magnitude below every structural-failure signature:
  missing HUD ≈ +12%, vertically-flipped sprites ≈ +40%, wrong sprites ≈ +12%. A real
  structure break therefore cannot hide under this gate; only sub-1.5% cosmetic jitter
  passes, which is the documented residual, not a state divergence.

## Why this is now an honest hard gate

The stage metric was 3.53% in 005 over **unaligned** states (web RNG at 85 draws vs
python's 184; the 3rd Space press attacked an active `jumpToStage` player). After 006 the
web consumes the identical 184-draw stream and renders the same idle-hero scene, so the
0.79% is an aligned-state measurement. The title gate (≤1%) and intro (informational)
are unaffected. The python reference `beatstreets-gameplay-stage.png` was NOT regenerated
(the driver schedule is unchanged); alignment was achieved entirely on the web side.

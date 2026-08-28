# MEASUREMENT — 005-audio-rng-parity

## Before (iteration 004, audio never drew from the game RNG)

| Gate | Metric | Status |
|---|---|---|
| title (`beatstreets-title.png`, seed 1) | 0.10% | HARD ≤1% |
| intro (`beatstreets-gameplay.png`, seed 1) | 7.82% | informational |
| stage 1 (`beatstreets-gameplay-stage.png`, seed 1, freeze=345) | 3.50% (13428/384000) | informational |

Draw counts at the freeze point (instrumented): **web 3** vs **python 184**.

## After (iteration 005, sound draws through game.rng + world-setup order)

Ground truth from a real `--trace-rng` capture
(`tools/capture_beatstreets_frame.py --seed 1 --skip-intro --frames-to-play 90 --trace-rng`):

| Capture | Python draws | Breakdown |
|---|---|---|
| Game construction (frame 2) | 85 | 83 × `randint(0,2)` enemy colour_variant + 1 × `randint(12,16)` Stick durability + 1 × `choice(stolen_items)` |
| Intro teletype + fade sounds | 99 | all `get_sound → randint(0,0)` (count-1) |
| Live combat by frame 345 | 51 | off-screen enemy attack/hit sound variants (web's first attack doesn't land within its 345-frame window) |
| **Total at freeze** | **184** | — |

Web after round 005 (engine-level, single Game, seed 1):

| Gate | Metric | Status |
|---|---|---|
| title (`beatstreets-title.png`, seed 1) | 0.10% | HARD ≤1% |
| intro (`beatstreets-gameplay.png`, seed 1) | 7.82% | informational |
| stage 1 (`beatstreets-gameplay-stage.png`, seed 1, freeze=345) | **3.53%** (13554/384000) | **informational** |

Web draw counts at the freeze point (engine-level, `src/game/sound-parity.test.ts`):

| Web constructor | 85 | exactly Python's 85 world-setup draws (bit-identical values at seed 1, asserted) |
| Web full capture (idle player) | 85 | intro/fade sound draws (99) are not reached because `jumpToStage` skips intro + the 255-frame fade; live-combat draws (51) don't occur in the window |

So the web's constructor now consumes the **exact** 85-draw world-setup stream Python
does (verified bit-for-bit), and sound-variant selection is routed through `game.rng`.
The remaining draws Python consumes beyond the constructor come from the intro-text teletype,
fade/early-combat sounds the web's `jumpToStage` never runs.

## Why the stage did NOT reach a hard gate (derivation)

The metric moved 3.50 → 3.53 (worse, not better) and, critically, the states are NOT
aligned: at the freeze point the web's RNG stream is at a different position than
Python's (the intro/fade sound draws are missing — the 255-frame fade overlay is not yet implemented in the web engine, next-round scope; the GameCanvas Host's double Game build is RNG-harmless: the discarded instance draws from the same seeded stream but its state is never read). The sound-parity test is engine-MODEL parity (replays the ctor schedule), not the real capture path.
Game twice, re-seeding each). The 3.53% is therefore still a structural artifact over
misaligned states, not an aligned-state measurement. The GOAL forbids promoting a hard
gate over demonstrably unaligned states ("picking a loose threshold to pass").

## Threshold decision

**Keep the stage gate INFORMATIONAL.** The precise blocker is frame flow, not PRNG
correctness and not missing sound-variant draws: Python runs the intro text (teletype
draws) + 255-frame fade + menu frames, reaching 184 draws; the web's `jumpToStage`
skips those, reaching only its 85 world-setup draws (plus the Host's double Game
construction). Aligning the frame flow — replaying the intro + fade per-frame through
the real menu flow instead of `jumpToStage`, and building the Game once — is the
next-round scope before the stage metric can be an honest aligned measurement.

The title gate (≤1%) and intro (informational) are unaffected.

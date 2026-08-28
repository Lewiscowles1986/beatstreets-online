# FIDELITY — keeping the web port 1:1 with the Python game

The web port is verified against **authentic pygame frames**, not eyeballing.
Everything below lives in the `beatstreets-web` repo unless paths say otherwise.

## 1. Regenerate the Python reference frames

The capture driver (parent repo) boots the modified game headless, drives it
deterministically (seeded RNG, fixed frame counts), and dumps the screen surface:

```bash
# from the parent repo root (code-the-classics/)
./.venv/bin/python tools/capture_beatstreets_frame.py --state title \
    --out beatstreets-web/e2e/reference/beatstreets-title.png
./.venv/bin/python tools/capture_beatstreets_frame.py --state play \
    --out beatstreets-web/e2e/reference/beatstreets-gameplay.png            # intro-text frame
./.venv/bin/python tools/capture_beatstreets_frame.py --state play --skip-intro --frames-to-play 90 \
    --out beatstreets-web/e2e/reference/beatstreets-gameplay-stage.png      # live stage-1 frame
```

- Determinism: same seed + frame count ⇒ identical md5 (verify by running twice).
- The reference PNGs are committed; regenerate only when the Python game changes,
  and commit the new reference together with the web change that mirrors it.

## 2. Run the fidelity gate

```bash
cd beatstreets-web
npm run build                      # the spec drives the built bundle
npx playwright test e2e/fidelity.spec.ts
```

Three comparisons (all 800×480, per-pixel max-channel threshold 8/255):

| Capture | Reference | Assertion |
|---|---|---|
| title (`title.html` e2e entry) | reconstructed pygame blit: raw `title0` on black + prompt glyphs (calibrated against the authentic cocoa capture) | **hard**: ≤1% pixels may differ |
| intro text (`intro.html` e2e entry) | `beatstreets-gameplay.png` | informational (log) |
| live stage 1 (`stage.html?seed=1&freeze=345` e2e entry) | `beatstreets-gameplay-stage.png` | informational (log) — see §4 for the round-004 path to a hard gate |

Artifacts land in `e2e/screenshots/fidelity-*.png` (+ a stage side-by-side).

## 3. Interpreting the metric

- The diff fraction is the share of pixels whose max per-channel delta exceeds 8.
- Structural regressions (wrong sprite, wrong anchor, missing HUD element) push it
  into the tens of percent; a calibrated-reference match sits near 0.1%.
- Moving sprites (enemy/hero states) legitimately differ between two captures
  unless the engine state is aligned — see §4.

## 4. Seeded capture workflow + PRNG design

The engine (`packages/engine/src/core/prng.ts`) exposes an injectable `Rng`
(`random()` / `randint(min,max)` inclusive / `choice(seq)`) with a `seededRng(seed)`
factory and a `systemRng` default (wraps `Math.random`, so unseeded behaviour is
unchanged). The `Game` ctor takes `opts.rng`; `GameCanvas` accepts a `seed` prop, and
the `stage.html` e2e entry reads `?seed=` from the URL.

Since round 004, `seededRng` is an alias for `cpythonRng(seed)` — a faithful
reimplementation of CPython's `random` module (Python 3.12), verified by unit tests
that pin values captured from real CPython (`core/prng.test.ts`):

- MT19937 core (624-word state, tempering, twist) mirroring `_randommodule.c`.
- `random()` consumes TWO `genrand()` draws (`(g>>5)*67108864 + (g>>6)` scaled), as
  CPython does.
- `randint(a,b)` → `a + _randbelow(b-a+1)`; `choice(seq)` → `seq[_randbelow(len)]`.
- `_randbelow(n)` → `k = n.bit_length(); r = getrandbits(k); while r >= n: r =
  getrandbits(k)` — may consume multiple draws on rejection.
- `getrandbits(k)` → for `k<=32` one `genrand() >> (32-k)`; for `k>32` multiple words.
- Seeding mirrors `random_seed`: absolute value split into 32-bit little-endian words,
  fed to `init_by_array` (empty key → `[0]`). Negative seeds use `abs`.

A single draw is therefore bit-identical to CPython. The entity STATES still do NOT
bit-align between a web capture and a Python capture at the same seed, because the web
consumes RNG draws in a DIFFERENT ORDER/COUNT than the Python game:

1. **Sound-variant draws.** Python advances the shared RNG on every sound via
   `get_sound → randint(0, count-1)`. In the stage capture the off-screen EnemyVax
   beating the idle player fires many hit-sound variant draws, and teletype draws
   `randint(0,0)`. The web audio system never draws from `rng`, so its stream is far
   behind Python's (measured: web made **3** draws by the freeze point vs Python's
   **184**).
2. **Intro/colour-variant order.** The web draws the intro `choice(stolen_items)`
   first; Python draws enemy `colour_variant` before the stolen-item choice.
3. **Per-frame entity/event ordering.** The web's `jumpToStage` skips the intro text
   and 255-frame fade that the Python driver runs, so gameplay-frame tick alignment
   differs even though both stage-1 configs are a single `EnemyVax@(1000,400)`.

These are engine-logic / draw-order divergences (not PRNG correctness), so the stage
gate stays **informational** — a hard gate over these unaligned states would be
"picking a loose threshold to pass." The title gate (≤1%) and intro (informational)
are unaffected. Restoring a hard stage gate requires matching the web's per-frame RNG
consumption to Python's (sound draws, intro order, spawn timing) — a fidelity rewrite
for a later round (see `docs/adversarial-gauntlet/004-cpython-prng-hard-stage-gate/`).

The stage test drives `stage.html?seed=1&freeze=345` mirroring the Python driver:
title→controls→play, skip intro, wait out the 255-frame fade, then 90 live-gameplay
frames. The entry FREEZES the rAF loop at game timer 345 (`freezeAtTimer`), so the
captured frame is frame-exact and the metric is stable across runs (3.50% with the
CPython RNG, unchanged from the 3.53% mulberry32 baseline — see MEASUREMENT.md).

## 5. Python → web data flow

- Game data: `../vol2/beatstreets/*.json` (stages, characters, attacks, story,
  config) → copied to `src/assets/data/*.json` → validated at load by the DSL
  (`packages/engine/src/dsl`, surfaced via `src/game/data.ts`).
- Sprites: `../vol2/beatstreets/images/*.png` → `src/assets/images/` (same
  basename convention); glob-preloaded by `src/game/assets.ts`.
- When editing the Python game's data, copy + re-validate, then run the fidelity
  gate; commit both sides together.
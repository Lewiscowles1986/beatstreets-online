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

### Audio-variant RNG parity (round 005)

Python draws randomness from a single module RNG on EVERY sound via `get_sound →
randint(0, count-1)`, including count-1 sounds and off-screen/inaudible events. The web
now mirrors that (G1): `Game.playSound(name, variants)` consumes `randint(0,
variants-1)` from `game.rng` at the decision point, decoupled from playback (the draw
happens even when audio is muted/unavailable — Python's mixer is in `try/except` too).
The chosen variant is stored, so a future SFX backend can play the exact file Python
would.

The world-setup draw order is also aligned (G3): Python's `setup_stages()` pre-builds
every stage at `Game.__init__`, drawing enemy `colour_variant` `randint(0,2)` (vax /
hoodie / scooterboy / boss) and Stick/Chain durability, THEN the intro stolen-item
choice. The web `Game` ctor now does the same `preDrawWorldRng()` pass in stage order
(colour variants + weapon durability before the stolen choice) and reuses the pre-drawn
values when a stage is lazily built. A draw-parity unit test
(`src/game/sound-parity.test.ts`) verifies the web constructor consumes the exact same
85 world-setup draws Python does at seed 1.

### Trace workflow

- `tools/capture_beatstreets_frame.py --trace-rng` prints one line per game RNG draw
  (`frame, index, site, args, value`) without changing the default behaviour or the
  captured frame. At seed 1 the Python capture consumes **184** draws by its freeze
  point: 85 at Game construction (83 colour + 1 Stick durability + 1 stolen choice) +
  99 `get_sound` draws from the intro-text teletype and fade/early combat.
- The engine exposes `opts.debugRng` → `game.rngTrace` (a `TracingRng` in
  `core/prng.ts`) that records every draw with its game frame for engine-level
  comparison against the Python trace.

The entity STATES still do NOT bit-align between a web capture and a Python capture at
the same seed, because the web consumes RNG draws in a DIFFERENT FRAME FLOW than the
Python driver:

1. **Frame flow (the residual 99 draws).** Python runs the intro text (teletype draws)
   + 255-frame fade + menu frames, consuming 184 draws by its freeze point. The web
   `GameCanvas` Host uses `jumpToStage`, which skips the intro text + fade entirely, so
   a single web `Game` reaches only its 85 world-setup draws. The Host additionally
   constructs the `Game` twice (Host ctor + `startPlay`), re-seeding each. The missing
   intro/fade sound draws leave the web's RNG stream at a different position than
   Python's, so the enemy's per-frame state diverges.

These are frame-flow divergences (not PRNG correctness or missing sound-variant draws),
so the stage gate stays **informational** — a hard gate over these unaligned states
would be "picking a loose threshold to pass." The title gate (≤1%) and intro
(informational) are unaffected. The stage test drives `stage.html?seed=1&freeze=345`
mirroring the Python driver: title→controls→play, skip intro, wait out the 255-frame
fade, then 90 live-gameplay frames; the entry FREEZES the rAF loop at game timer 345
(`freezeAtTimer`) so the captured frame is frame-exact and the metric is stable
(3.53% in 005, essentially unchanged from 3.50% — see MEASUREMENT.md).

## 5. Python → web data flow

- Game data: `../vol2/beatstreets/*.json` (stages, characters, attacks, story,
  config) → copied to `src/assets/data/*.json` → validated at load by the DSL
  (`packages/engine/src/dsl`, surfaced via `src/game/data.ts`).
- Sprites: `../vol2/beatstreets/images/*.png` → `src/assets/images/` (same
  basename convention); glob-preloaded by `src/game/assets.ts`.
- When editing the Python game's data, copy + re-validate, then run the fidelity
  gate; commit both sides together.
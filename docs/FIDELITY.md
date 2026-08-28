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
./.venv/bin/python tools/capture_beatstreets_frame.py --state controls \
    --out beatstreets-web/e2e/reference/beatstreets-controls.png            # controls frame
./.venv/bin/python tools/capture_beatstreets_frame.py --state gameover --result win \
    --out beatstreets-web/e2e/reference/beatstreets-gameover-win.png        # game-over (win) frame
./.venv/bin/python tools/capture_beatstreets_frame.py --state gameover --result lose \
    --out beatstreets-web/e2e/reference/beatstreets-gameover-lose.png       # game-over (lose) frame
```

The `--state controls` capture presses button 0 once (TITLE→CONTROLS) and dumps the
static full-frame `menu_controls` blit. The `--state gameover` capture presses button 0
twice (TITLE→CONTROLS→PLAY) then, on the next frame, forces a terminal state via a
**driver-only hook** (the Python game is never modified): `--result lose` sets
`game.player.lives = 0`; `--result win` sets `stage_index = len(STAGES)`, clears
`text_active`, and raises `max_scroll_offset_x` so `update()`'s `next_stage()` (which
would re-activate the outro text) is not triggered — leaving `check_won()` True so the
PLAY update transitions to GAME_OVER and `draw()` blits `status_win`/`status_lose`.

- Determinism: same seed + frame count ⇒ identical md5 (verify by running twice).
- The reference PNGs are committed; regenerate only when the Python game changes,
  and commit the new reference together with the web change that mirrors it.

## 2. Run the fidelity gate

```bash
cd beatstreets-web
npm run build                      # the spec drives the built bundle
npx playwright test e2e/fidelity.spec.ts
```

Six comparisons (all 800×480, per-pixel max-channel threshold 8/255):

| Capture | Reference | Assertion |
|---|---|---|
| title (`title.html` e2e entry) | reconstructed pygame blit: raw `title0` on black + prompt glyphs (calibrated against the authentic cocoa capture) | **hard**: ≤1% pixels may differ |
| intro text (`intro.html` e2e entry) | `beatstreets-gameplay.png` | **hard**: ≤2% pixels may differ (round 007) — see §4 |
| live stage 1 (`stage.html?seed=1&freeze=345` e2e entry) | `beatstreets-gameplay-stage.png` | **hard**: ≤1.5% pixels may differ (round 006) — see §4 |
| controls (`controls.html` e2e entry) | `beatstreets-controls.png` | **hard**: ≤0.5% pixels may differ (round 007) — see §4 |
| game-over win (`gameover.html?result=win` e2e entry) | `beatstreets-gameover-win.png` | **hard**: ≤0.5% pixels may differ (round 007) — see §4 |
| game-over lose (`gameover.html?result=lose` e2e entry) | `beatstreets-gameover-lose.png` | **hard**: ≤0.5% pixels may differ (round 007) — see §4 |

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
  **99 `get_sound` draws**, all from the intro-text teletype (`get_sound → randint(0,0)`
  for the single-variant teletype sound). There are NO fade or live-combat draws in the
  first 90 gameplay frames: the idle player never triggers scrolling, so no enemies
  spawn and no combat sound fires (the 255-frame fade is a pure visual overlay, no RNG).
- The engine exposes `opts.debugRng` → `game.rngTrace` (a `TracingRng` in
  `core/prng.ts`) that records every draw with its game frame for engine-level
  comparison against the Python trace.

### Intro/fade replay + bit-aligned stage (round 006)

Round 006 removed `jumpToStage` from the stage capture path and made the web replay the
REAL flow the Python driver runs, so the RNG streams now agree through the freeze point:

1. **One Game build.** `stage.html` no longer uses `StrictMode` (its dev double-mount
   would rebuild the seeded Host), and `Host.startPlay()` reuses the ctor-created Game
   for the very first play (dropping `jumpToStage`). The seeded capture therefore builds
   exactly one `Game`; the ctor's fresh `text_active` intro state is what plays.
2. **Intro text plays out.** The stage entry drives title→controls→play (button-0
   presses) and lets the intro story text fully teletype (99 `randint(0,0)` draws). The
   e2e waits for `[data-intro-complete]` — the exact moment the last teletype draw fires
   (mirroring the driver's wait-for-full-display) — then presses Space to skip, resetting
   the game timer to 0.
3. **Fade window + live frames.** The web does not render the black fade overlay (at the
   freeze point its alpha is already 0, and it consumes no RNG), but the game timer runs
   through the 255-frame window + 90 live frames to timer 345, at which the entry freezes
   the rAF loop (`freezeAtTimer=345`, guarded by `!textActive` so it never fires during
   the intro). The idle player spawns no enemies, so the web and Python render the same
   scene: an idle hero at (400,400) + HUD.

The web's 184 draws bit-match Python's (verified in `src/game/sound-parity.test.ts`,
including a SHA-256 over the numeric draw sequence), so the entity states are aligned
and the stage metric dropped from 3.53% (round 005, where the 3rd Space press attacked an
active `jumpToStage` player) to **0.79%** — idle player matching Python. The residual is
HUD bar-clip / sprite-edge jitter, not a state divergence. The stage gate is now **HARD**
(≤1.5%; see §2 and 006 MEASUREMENT.md for the threshold derivation).

### Static screens: controls + game-over (round 007)

The controls and game-over screens are static full-frame image blits, so their gates are
the tightest in the suite:

- **Controls** — Python `State.CONTROLS` does `screen.fill((0,0,0))` then
  `screen.blit("menu_controls", (0,0))`. The `controls.html` e2e entry blits the same
  `menu_controls` sprite (md5-identical to the Python image) onto black at (0,0).
- **Game-over** — Python `State.GAME_OVER` blits `status_win`/`status_lose` centred
  (`WIDTH//2 - w//2, HEIGHT//2 - h//2`); both sprites are 800×480, so the centred blit
  lands at (0,0). The `gameover.html?result=win|lose` e2e entry blits the corresponding
  sprite onto black.

All three are **HARD ≤0.5%**. The aligned metric is 0.00% (0/384000) — the web renders
the identical sprite assets onto black, so the only residual is sub-threshold
anti-aliasing / PNG round-trip jitter. 0.5% sits ~2 orders of magnitude below every
structural-failure signature (missing/wrong sprite ≈ 100%, offset blit ≈ 10%+).

### Intro alignment (round 007)

The historical intro metric (7.82% in rounds 005–006) was diagnosed as two mechanical
causes, both fixed:

1. **PNG gamma chunk.** The font glyph sprites carried a `gamma`/`chromaticity` chunk
   that the browser applies on decode, shifting glyph colours vs Python's raw rendering.
   Stripped from the web font sprites (pixel data preserved; verified identical). The
   same fix was applied to `status_win`/`status_lose` for the game-over gates.
2. **Wrong stolen item.** At seed 1 Python's `choice(stolen_items)` returns index 2
   ("THE COMPLETE WORKS OF\nSHAKESPEARE"), but the intro entry hardcoded index 1. The
   entry now reads `?stolen=N` (default 2, the seed-1 choice).

The aligned metric is now **0.00%** (0/384000), promoted to **HARD ≤2%** (the GOAL's
"promote to hard only if honestly tight (≤2%)" rule; ~2 orders of magnitude below a
missing/wrong-text structural failure ≈ 7.8%).

## 5. Python → web data flow

- Game data: `../vol2/beatstreets/*.json` (stages, characters, attacks, story,
  config) → copied to `src/assets/data/*.json` → validated at load by the DSL
  (`packages/engine/src/dsl`, surfaced via `src/game/data.ts`).
- Sprites: `../vol2/beatstreets/images/*.png` → `src/assets/images/` (same
  basename convention); glob-preloaded by `src/game/assets.ts`.
- When editing the Python game's data, copy + re-validate, then run the fidelity
  gate; commit both sides together.
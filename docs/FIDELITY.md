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
factory (mulberry32) and a `systemRng` default (wraps `Math.random`, so unseeded
behaviour is unchanged). The `Game` ctor takes `opts.rng`; `GameCanvas` accepts a
`seed` prop, and the `stage.html` e2e entry reads `?seed=` from the URL.

- Mapping: `randint` = `floor(random()*(max-min+1))+min`; `choice` = `seq[floor(random()*len)]` — each consumes exactly one draw, mirroring CPython's `random` surface.
- We do NOT replicate CPython's Mersenne Twister; we guarantee determinism (same seed ⇒ same sequence, any platform) plus a documented mapping.
- The web engine's RNG call ORDER differs from Python's (different call sites/counts), so a web capture at `seed` is not bit-identical to a Python capture at the same seed. The stage diff is therefore INFORMATIONAL (no assertion) rather than pixel-exact; the residual is engine-state divergence, not a render bug. Restoring a hard gate requires replicating CPython's MT19937 `getrandbits`/`_randbelow` semantics in `core/prng.ts` (round-004 candidate).
- The stage test drives `stage.html?seed=1&freeze=345` mirroring the Python driver: title→controls→play, skip intro, wait out the 255-frame fade, then 90 live-gameplay frames. The entry FREEZES the rAF loop at game timer 345 (`freezeAtTimer`), so the captured frame is frame-exact and the metric is stable across runs (3.53%, verified).

## 5. Python → web data flow

- Game data: `../vol2/beatstreets/*.json` (stages, characters, attacks, story,
  config) → copied to `src/assets/data/*.json` → validated at load by the DSL
  (`packages/engine/src/dsl`, surfaced via `src/game/data.ts`).
- Sprites: `../vol2/beatstreets/images/*.png` → `src/assets/images/` (same
  basename convention); glob-preloaded by `src/game/assets.ts`.
- When editing the Python game's data, copy + re-validate, then run the fidelity
  gate; commit both sides together.
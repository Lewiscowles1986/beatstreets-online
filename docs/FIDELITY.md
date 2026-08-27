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
| live stage 1 (real app host) | `beatstreets-gameplay-stage.png` | informational (log) |

Artifacts land in `e2e/screenshots/fidelity-*.png` (+ a stage side-by-side).

## 3. Interpreting the metric

- The diff fraction is the share of pixels whose max per-channel delta exceeds 8.
- Structural regressions (wrong sprite, wrong anchor, missing HUD element) push it
  into the tens of percent; a calibrated-reference match sits near 0.1%.
- Moving sprites (enemy/hero states) legitimately differ between two captures
  unless the engine state is aligned — see §4.

## 4. Known limitation: gameplay-state determinism

The engine (`packages/engine`) calls bare `Math.random()`, so the web cannot yet
replay the Python RNG sequence; live-stage diffs stay informational until the
engine takes an injectable PRNG (next gauntlet round). Python-side determinism
already works (the capture driver seeds `random`).

## 5. Python → web data flow

- Game data: `../vol2/beatstreets/*.json` (stages, characters, attacks, story,
  config) → copied to `src/assets/data/*.json` → validated at load by the DSL
  (`packages/engine/src/dsl`, surfaced via `src/game/data.ts`).
- Sprites: `../vol2/beatstreets/images/*.png` → `src/assets/images/` (same
  basename convention); glob-preloaded by `src/game/assets.ts`.
- When editing the Python game's data, copy + re-validate, then run the fidelity
  gate; commit both sides together.
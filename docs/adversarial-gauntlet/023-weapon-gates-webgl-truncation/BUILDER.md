# Round 023 — Builder: weapon gates ≤1.5% — WebGL truncation + jump-timing parity

## Goal (the long-standing 013/014 residual)

The weapon gates sat at 8.46/8.46/8.62% vs the ≤1.5% HARD threshold despite verified
full randint-stream parity (015). This round instrumented the actual divergence.

## Instrumentation built (kept for future rounds)

- `?trace=1` (stage-entry/GameCanvas): one state row per post-skip update into
  `window.__BS_TRACE` — `{i, t, h: [x, y, sprite], e: [[sprite, x, y], ...]}`.
- `tools/capture_beatstreets_frame.py --trace-enemy`: now also prints `playersprite`
  and `enemysprite` rows (the hero/enemy `determine_sprite()` at the same post-update
  point).
- Headless mirror: `action-parity.test.ts` replays the weapon schedule pushing the SAME
  rows (BS_DUMP_TRACE prints them for diffing).

## Findings (diff chain: browser ↔ headless ↔ python)

1. **Browser == headless exactly** (927/927 rows identical) — the harness is faithful.
2. **Web jumped one frame early**: python's `--stage` hook runs after frame
   `skip_frame + 1` — the END of the SECOND post-skip update (the trace proves it:
   python's first enemy row lands at post-skip timer 2, the web's at timer 0). Fixed:
   `applyPendingStageJump` now requires `postSkipUpdates >= 2` (mirrored in the
   headless test). After the fix the sprite rows match python at EVERY timer 2..926.
3. **The remaining ~6.8% pixel diff was rendering, not state**: python truncates blit
   destinations toward zero (`int(-677.2) = -677`); the 2D renderer already mirrored
   that, but the **WebGL renderer pushed quads at fractional positions** (linear
   filtering) — with a fractional scroll offset the whole textured background shifted
   ~1px vs the python capture. The diff overlay showed exactly that: the flat-colour
   sprites clean, every textured region (bricks, asphalt grain, graffiti) lit up.

## Fix

`webgl-render.ts blitSprite`: `Math.trunc` on the anchored destination before pushing
the quad — pygame truncation parity with the 2D path.

## Results (all HARD gates pass)

| gate | before | after |
|---|---|---|
| weapon pickup | 8.46% | **0.67%** |
| weapon pickupanim | 8.46% | **0.69%** |
| weapon swing | 8.62% | **0.73%** |
| stage | 0.54% | 0.54% (unchanged) |
| action enemyattack / heropunch | 0.53 / 0.60% | unchanged |
| title/intro/controls/gameover | 0.00-0.01% | unchanged |

Full precommit (typecheck, lint, vitest incl. the 6 parity tests, build, 10 e2e) green;
WebGL-vs-2D orientation gate still passes (corr 0.9995).
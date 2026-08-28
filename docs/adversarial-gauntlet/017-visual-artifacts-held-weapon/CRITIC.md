# BUILDER — 017 user-reported visual artifacts

## Report

User (on the HiDPI-fixed build): "There are still visual artifacts... when I pick
up a weapon it seems glued to my foot." Screenshot: yellow dotted trails/rectangles
across the road tracing actor paths; the held stick drawn at the hero's feet.

## Root causes (all three confirmed in code)

1. **The WebGL 2D overlay never cleared during play.** `WebGLRender.present()`
   composites the offscreen overlay but never resets it; only the title / controls /
   game-over scenes call `clear()`, and `drawGame()` does not. Every overlay
   primitive piled up frame over frame.
2. **The shell enabled debug mode unconditionally** (`App.tsx` passed `debug`),
   and the play path draws a 5px `#ff0` (yellow) circle at each actor's feet every
   frame in debug. (1) + (2) = the yellow trails: the fallen scooter's decaying
   slide (8px/frame, ×0.94 friction) drew the dense-then-dotted rectangles and the
   triangle; walking actors drew the dotted lines.
3. **Held weapons were visible** (python parity gap): python's `pick_up` sets the
   weapon sprite to `"blank"` (the fighter switches to the weapon-wielding sprite
   variants); the web's `weaponSprite()` returned the stick sprite even while held,
   pinning it at the holder's tracked vpos (+facing×20, y = feet).

## Fixes

- `WebGLRender.present()`: clear the overlay after compositing (one line + comment).
- `weaponSprite()`: return `null` for held Stick/Chain (the vpos tracking for the
  drop position is untouched, matching python).
- `App.tsx`: debug circles now opt-in via `?debug` instead of always-on.

## Verification

- typecheck + build + 40 unit tests green; the 10 HARD gates green (20.6s) with
  byte-identical diffs (the overlay/debug changes don't affect non-debug captures).
- The weapon pixel gates improved only marginally (24.40/12.51/11.24 ->
  24.19/12.29/11.01) — re-skipped with refreshed evidence.

## NEW diagnosis: the remaining weapon-gate delta is hero KNOCKBACK physics

Frame comparison at freeze 882 (web capture vs python reference): the scenes match
(hoodies, score, HUD) EXCEPT the hero's position — python's hero lies at the LEFT
EDGE (bent, in the pickup pose) after ~685px of accumulated knockback travel from
repeated enemy hits (700 -> ~115 world); the web's hero stopped at ~-310px. The
RNG stream is proven exact (354/354), so the divergence is pure physics: the
per-hit knockback velocity magnitude and/or the slide friction differs, and/or
the hero's hit/i-frame cadence differs (how many hits connect). 018: instrument
the hero's vpos.x + vel.x per frame around the hits (both sides), diff the
knockback constants (python's hit() vel assignment vs the web's), fix, and the
three weapon gates should finally go green.

---
# CRITIC — 017

All three fixes are minimal, mechanistic, and python-parity-motivated. The overlay
clear belongs in present() (the only chokepoint every frame passes); the held-
weapon blanking matches python's documented intent ("the weapon actor is invisible
while being held"); the debug opt-in respects the shell's normal-play audience.
The gates were honestly re-skipped after measuring, and the knockback diagnosis
came from direct frame evidence, not theory — a solid round.

# Round 023 — Critic

## Review of the two fixes

1. **Jump-timing change (postSkipUpdates >= 2)**: verified against the python driver's
   source, not just the trace — the hook condition `self._frame > skip_frame[0]`
   combined with the per-frame order (update → trace → hook) places the jump after the
   SECOND post-skip update. The web's previous "first update" alignment (015) was
   read off the wrong frame boundary. The RNG stream is unaffected (the stage-5
   hoodies are in a draw-free PAUSE during the shift — why the 015 stream parity
   passed while the choreography was off by one frame), so all parity tests still
   pass unchanged.
2. **WebGL truncation**: matches the 2D renderer's existing `Math.trunc` (added 017)
   and pygame's `blit` int truncation. Applied at the same point (post-anchor),
   so clipped blits (`blitSpriteRegion`) keep their own path (already integer).
   Risk checked: the WebGL-vs-2D orientation gate and the game-canvas mount gate
   still pass; the stage/action gates are unchanged (their scroll offsets were
   near-integers in those captures).
3. **Trace plumbing**: `window.__BS_TRACE` is only allocated when `?trace=1` — no
   production impact (stage.html is an e2e-only entry; the main app entry doesn't
   pass `trace`). The headless mirror test runs unconditionally but does nothing
   beyond a replay + length assertion (fast, ~1s).
4. **Driver change**: the added `playersprite`/`enemysprite` lines are print-only,
   inside the existing `--trace-enemy` gate — no simulation change; beatstreets.py
   itself untouched (md5 intact).

## Verdict

Approve. Both fixes are root-cause corrections with python-source evidence, the new
instrumentation is e2e-only, and every HARD gate now passes at its threshold.
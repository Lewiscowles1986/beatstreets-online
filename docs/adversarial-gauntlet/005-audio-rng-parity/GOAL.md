# Iteration 005 — Audio RNG parity: bit-aligned gameplay captures, hard stage gate

## Carry-in conditions (from JUDGE 004)

1. Route the web audio's sound-variant selection through `game.rng`, mirroring Python's
   `get_sound → randint(0, count-1)` consumption — INCLUDING sounds triggered by
   off-screen entities (the dominant source of python's 184 draws at the freeze point).
2. Align the remaining intro/colour-variant draw order; replay intro text + 255-frame
   fade so per-frame tick ordering matches Python.
3. Re-measure with aligned states; add a draw-trace assertion (web draw count == python
   draw count at the freeze point, 184) as a unit/e2e-level check; promote the stage
   gate to HARD only on an honest aligned metric (target ≤ intro's 7.8% or better).

## Ground truth

- Python: `get_sound` picks a sound variant via `randint(0, count-1)` from the shared
  module RNG on EVERY sound play (music/theme excluded unless it draws). Off-screen
  enemies attacking the idle player fire hit/punch variants — that is why the python
  driver consumed 184 draws by frame 345 while the web consumed 3.
- Web: src/game/audio.ts + GameCanvas wiring play sounds but never draw from game.rng.
- Engine PRNG is bit-exact CPython MT19937 (round 004, pinned tests).
- Capture: stage.html?seed=1&freeze=345 ↔ tools/capture_beatstreets_frame.py --seed 1
  --skip-intro --frames-to-play 90.

## Goal (builder must satisfy ALL)

- [ ] G1. Audio variant draws through game.rng: every sound the web plays that has
      variants consumes randint(0, count-1) from the game's RNG at the same game-frames
      as Python (including off-screen/inaudible events — the DRAW must happen even if
      the sound is muted/unavailable; decouple draw from playback capability).
- [ ] G2. Draw-trace parity check: a unit test (or e2e instrumentation) that runs the
      engine with the same scripted schedule as the capture and asserts the draw count
      and sequence hash match the python trace (capture the python trace with a small
      driver run: instrument tools/capture_beatstreets_frame.py with an optional
      --trace-rng that prints draw sites per frame, WITHOUT changing default behaviour).
- [ ] G3. Intro/colour-variant draw order aligned (story text selection, colour variants
      etc. at the same frames). Replay intro + fade per-frame (web already replays via
      freeze=345; verify tick ordering, not wall-clock).
- [ ] G4. Re-measure stage metric with aligned states. If ≤7.8% (intro-level or
      better): promote the stage gate to HARD with threshold derived from the measured
      aligned value + headroom, documented. If not aligned: instrument the first
      diverging frame (state dump diff), fix if mechanical, otherwise document the
      exact engine-logic divergence as the blocker (honest informational + next-round
      scope).
- [ ] G5. No regressions: title hard ≤1% green; orientation green; precommit green.
      Docs: FIDELITY.md §4 + MEASUREMENT.md + BUILDER.md updated.

## Out of scope

- Gameplay feature work; visual render changes beyond what alignment exposes; music.

## Definition of done

Precommit green; draw-parity proven (or precisely blocker-scoped); uncommitted tree
ready for orchestrator commit.
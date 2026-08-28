# Iteration 007 — Fidelity breadth: controls + game-over screens, intro alignment

## Carry-in conditions (from JUDGE 006 + earlier judges)

1. Controls screen: python blits `menu_controls` full-frame (draw() State.CONTROLS).
   Authentic reference frame via the driver; web parity; hard gate.
2. Game-over screens: python blits `status_win`/`status_lose` centred (State.GAME_OVER).
   Authentic reference frames; web parity; hard gates (or documented divergence).
3. Intro screen metric (currently 7.82% informational): align typewriter/line-break
   state to the python teletype capture; promote or keep informational honestly.
4. Optional: title-logo validation vs a true non-alpha-flattened pygame frame.

## Established workflow (reuse — do not reinvent)

- Reference frames: tools/capture_beatstreets_frame.py (add --state controls|gameover
  with deterministic input schedules mirroring the python draw() states; --trace-rng
  for draw traces).
- Web e2e entries: follow the title.html/intro.html/stage.html pattern (separate Vite
  entries, out of the production bundle).
- Gates: per-pixel diff threshold 8/255 in e2e/fidelity.spec.ts; HARD gates derived
  from measured aligned values + documented headroom; wired into precommit (workers=1).

## Goal (builder must satisfy ALL)

- [ ] G1. Controls screen: driver captures an authentic python `menu_controls` frame
      (deterministic); web renders the same (existing ControlsScreen — verify its
      sprite path); fidelity test with HARD gate; trace/parity where RNG is involved.
- [ ] G2. Game-over: driver captures `status_win` AND `status_lose` frames
      (deterministic paths to GAME_OVER: win = check_won; lose = lives<=0 — find the
      cheapest deterministic route in the driver; cheat hooks may be added to the
      DRIVER only, never the python game). Web: drive to the same states (engine
      already has konami/cheat hooks for stage select — prefer engine-legal paths);
      fidelity tests (informational acceptable if state alignment is impractical —
      justify honestly).
- [ ] G3. Intro metric: diagnose the 7.82% (typewriter state? glyph spacing? colour?)
      via side-by-side + diff heatmap; fix mechanical causes; report the improved
      number; promote to hard only if honestly tight (≤2%).
- [ ] G4. No regressions: title 0.10% hard; stage 0.79% hard ≤1.5%; orientation green;
      sound-parity green; `npm run precommit` green.
- [ ] G5. docs/FIDELITY.md (new screen sections), 007 MEASUREMENT.md + BUILDER.md.

## Out of scope

- New gameplay features; music; WebGL pipeline rewrite; mobile/responsive work.

## Definition of done

Precommit green; new gates live (or honestly documented as informational with
blockers); uncommitted tree ready for orchestrator commit.
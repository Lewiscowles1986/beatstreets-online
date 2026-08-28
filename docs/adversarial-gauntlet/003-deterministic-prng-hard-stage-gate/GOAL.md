# Iteration 003 — Deterministic gameplay: injectable PRNG + hard stage gate

## Carry-in conditions (from JUDGE 002)

1. Engine takes an injectable, seeded PRNG mirroring Python's `random` usage so live
   stage captures are state-aligned; then the stage fidelity gate is promoted from
   informational to a HARD assertion and the residual is re-verified as render-only.
2. (Optional/stretch) Validate the title logo region against a true non-alpha-flattened
   pygame frame to close G1-002's caveat.

## Ground truth

- Python RNG surface: `random.randint` / `random.choice` (26 call sites in
  vol2/beatstreets/beatstreets.py) — module-level global RNG, seeded by the capture
  driver (`random.seed(seed)`).
- Web RNG surface: 13 `Math.random` call sites across packages/engine/src
  (core/math.ts, engine/fighter.ts, weapons.ts, player.ts, game.ts, enemies.ts).
- The python capture driver (tools/capture_beatstreets_frame.py) already seeds Python's
  RNG; the web must replay the SAME sequence to state-align captures.

## Goal (builder must satisfy ALL)

- [ ] G1. Engine RNG: replace bare Math.random with an injectable RNG (constructor /
      module-level setter). Design constraints: no per-call-site divergence from Python
      semantics — randint(min,max) INCLUSIVE and choice(seq) must map onto the SAME
      underlying generator calls as Python's random module (implement a small PRNG
      (e.g. xoshiro128** or mulberry32) with randint/choice helpers mirroring CPython's
      random module semantics; document the mapping). Default RNG = Math.random so
      existing behaviour is unchanged unless seeded.
- [ ] G2. Seeding path: the game host (src/components/GameCanvas.tsx or engine entry)
      accepts a seed (e.g. URL param ?seed= for the e2e entry, engine Game ctor option).
      The web e2e stage capture uses ?seed=1 and advances the SAME frame count as
      tools/capture_beatstreets_frame.py --skip-intro --frames-to-play 90 --seed 1.
- [ ] G3. State-aligned stage capture: e2e drives the game deterministically (seeded,
      fixed frame count, input script mirroring the python driver) and the stage diff
      vs e2e/reference/beatstreets-gameplay-stage.png becomes a HARD assertion. Pick a
      honest threshold: with aligned states the diff should be near-intro levels (≤10%);
      if RNG call-order divergences remain (engine logic differences, not PRNG), report
      the number, keep the gate informational, and document the exact divergence points.
- [ ] G4. No regression: title gate stays hard-passing (≤1%), orientation test green,
      `npm run precommit` passes with the new e2e gate.
- [ ] G5. docs/FIDELITY.md updated (seeded workflow); BUILDER.md distilled.

## Out of scope

- New gameplay features; render changes beyond what state alignment exposes as genuine
  render bugs (fix those, they are in scope); audio.

## Definition of done

Precommit green; honest metric table (title/intro/stage) in BUILDER.md + MEASUREMENT.md;
uncommitted tree ready for orchestrator commit.
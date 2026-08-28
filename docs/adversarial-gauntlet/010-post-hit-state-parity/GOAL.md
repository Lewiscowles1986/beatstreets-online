# Iteration 010 — Post-hit state parity: full-stream alignment, HARD action gates

## Carry-in conditions (from JUDGE 009)

1. Fix the enemy post-hit state branch: after the first hit exchange, python draws the
   `randint(0,500)` approach back-off while the web draws a `randint(0,1)` fall choice —
   the web enemy enters a different post-hit state. Compare Enemy hit/fall/recover
   handling (state_timer flow, falling_state transitions, health/stamina gates) with
   python's Enemy.update and fix mechanically.
2. Then flip `src/game/action-parity.test.ts` ALIGNED_PREFIX to a FULL-STREAM assertion
   (both schedules) and promote both action gates to HARD on aligned metrics.
3. Validate .github/workflows/fidelity.yml on the next real push (orchestrator).

## Ground truth

- Divergence signature (009): randint streams agree exactly for 190 draws; at the
  punch-connect point python is in APPROACH_PLAYER (drawing 0,500), the web in a
  post-hit branch (drawing 0,1). Python: vol2/beatstreets/beatstreets.py Enemy.update
  (HIT/FALL/KNOCKDOWN states, state_timer decrements, falling_state machine). Web:
  packages/engine/src/engine/enemy.ts (+ fighter.ts hit/fall plumbing).
- Traces: e2e/reference/beatstreets-action-{enemyattack,heropunch}-rng.txt (python);
  src/game/action-parity.test.ts replays web-side (engine-model). The +2 tail draws
  (freeze-boundary sounds) are a capture-window artifact — handle in the comparison
  (compare up to the python stream length).
- Gates: e2e/fidelity-action.spec.ts (2 informational); references authentic
  (d7d9d131… verified against fresh driver captures).

## Goal (builder must satisfy ALL)

- [ ] G1. Root-cause the post-hit branch: state-level trace of both sides around the
      first exchange (python --trace-enemy vs web engine states). Fix the mechanical
      difference (knockdown/hit-stun timing, falling_state transitions, state_timer
      semantics). Engine-real fix; unit test pins the corrected sequence.
- [ ] G2. Full-stream parity: action-parity test asserts the ENTIRE randint stream
      (web == python, both schedules; the +2 boundary draws excluded by comparing to
      the python stream length, documented). Any remaining divergence: name the exact
      frame/consumer; fix mechanical causes.
- [ ] G3. Re-measure both action frames. Promote to HARD with honestly derived
      thresholds (aligned states should approach stage-level ~0.7-1%; if sprite
      animation ±1 frame is the residual, document it as in 006).
- [ ] G4. No regressions: all 6 core gates green; sound/action parity tests green;
      `npm run precommit` green.
- [ ] G5. docs/FIDELITY.md + 010 MEASUREMENT.md + BUILDER.md.

## Out of scope

- New gameplay features beyond the state-machine parity fix; music; restyling.

## Definition of done

Precommit green; full-stream parity proven (or precisely blocker-scoped); uncommitted
tree ready for orchestrator commit.
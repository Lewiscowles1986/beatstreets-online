# Iteration 009 — Enemy-AI re-engagement parity + hard action gates

## Carry-in conditions (from JUDGE 008)

1. Fix the web enemy-AI re-engagement divergence: Python's enemy re-attacks the idle
   player after the first exchange; the web enemy stops. This is the trace-derived
   blocker behind both action gates (hero punch 9.22%, enemy attack 8.37%).
2. Once the RNG trace proves bit-alignment through the action schedules, promote both
   action gates to HARD on honestly aligned metrics.
3. Validate .github/workflows/fidelity.yml on the next real push.

## Ground truth

- Python enemy AI: vol2/beatstreets/beatstreets.py Enemy.update (target selection,
  attack state machine, when an enemy re-approaches/re-attacks after a hit or after
  the player recovers). Web counterpart: packages/engine/src/engine/enemy.ts.
- Divergence signature (008): after the first attack exchange the web enemy disengages
  (stands/walks away) while python's re-attacks. Suspect: attack-cooldown/health/stamina
  gating, target-selection RNG consumption, or hit-stun state flow.
- Capture machinery: driver --press/--hold + trace; stage.html?seed=1&press=&hold=
  (+freeze); action references e2e/reference/beatstreets-action-*.png (authentic).

## Goal (builder must satisfy ALL)

- [ ] G1. Root-cause the re-engagement divergence (trace both sides: enemy state per
      frame — target, state machine node, RNG draws). Fix the engine logic (mechanical
      parity with python; no redesign). Unit test pinning the re-engagement behaviour
      (enemy re-attacks within N frames of the player recovering, seed 1).
- [ ] G2. Re-run the action traces: draw counts + sequence hash web vs python must
      match through both action schedules (like round 006's 184-draw proof). Any
      remaining divergence: name the first diverging frame/consumer.
- [ ] G3. Re-measure both action frames. Promote each gate to HARD with honestly
      derived thresholds (aligned states should approach stage-level ~0.7-1%; derive
      threshold = measured + documented headroom). If alignment is impossible after a
      genuine effort, keep informational and document the precise engine-logic blocker.
- [ ] G4. No regressions: ALL existing gates green (title/intro/stage/controls/win/
      lose hard; orientation); `npm run precommit` green (now including the action
      spec if runtime allows — keep precommit < ~3 min).
- [ ] G5. docs/FIDELITY.md + 009 MEASUREMENT.md + BUILDER.md.

## Out of scope

- New gameplay features beyond the AI parity fix; music; restyling.

## Definition of done

Precommit green; AI parity proven (or precisely blocker-scoped); uncommitted tree ready
for orchestrator commit.
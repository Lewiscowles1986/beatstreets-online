# Iteration 011 — Weapon mechanics breadth: barrel throw/catch bit-parity

## Carry-in state (from JUDGE 010: ACCEPT, no blocking conditions)

All known simulation divergences are closed: screens, stage-1 idle, combat, both
action schedules (full-stream RNG parity). The gauntlet now extends BREADTH along the
proven machinery. Chosen breadth: weapon mechanics — the barrel pickup/throw/catch/
break loop, which python implements via Weapon/Barrel (throw, ground friction,
bounciness, can_be_picked_up, barrel_hit on fighters) and the web mirrors in
packages/engine/src/engine/weapons.ts.

## Ground truth

- Python: vol2/beatstreets/beatstreets.py — class Weapon/Barrel (lines ~1500-1650:
  throw(), update (friction/bounce), can_be_picked_up, draw_order_offset=2),
  fighter pickup flow (pickup_animation, determine_pick_up_weapon/drop_weapon),
  barrel hit (line ~1593 fighter.hit(self, ATTACKS["barrel"])).
- Web: packages/engine/src/engine/weapons.ts (throw, update, pickup), fighter.ts
  pickup/drop, GameCanvas weapon draw pass (line ~495: separate from fighters —
  python draws weapons IN the same sorted list; check ordering parity too).
- The stage-1 vax carries no weapon; stage 2+ has barrels (check
  vol2/beatstreets/data/stages.json for the barrel stage; the vax near barrels).
- Machinery: driver --press/--hold/--trace-rng/--trace-enemy; stage.html mirrors
  schedules; e2e/action-parity test pattern from 010.

## Goal (builder must satisfy ALL)

- [ ] G1. Capture authentic python weapon frames: pick a deterministic schedule on a
      barrel stage (seed 1): approach barrel → pick up → throw → barrel hits the
      enemy (or breaks). Capture 2-3 canonical frames + --trace-rng traces (NEW
      reference files; never overwrite existing ones; record md5s).
- [ ] G2. Web replay parity: extend the stage entry/action-parity test to the weapon
      schedules; assert FULL-STREAM randint parity (the 010 pattern). Fix mechanical
      divergences (throw velocity/friction, pickup timing, barrel-hit damage,
      draw-order of weapons vs fighters — python draws weapons in the SAME sorted
      list, the web draws them in a separate pass: verify and fix).
- [ ] G3. Add weapon-frame pixel gates (HARD on aligned metrics, same derivation);
      no regressions in any existing gate.
- [ ] G4. `npm run precommit` green (watch total e2e runtime; keep < ~3 min).
- [ ] G5. docs/FIDELITY.md weapon section + 011 MEASUREMENT.md + BUILDER.md.

## Out of scope

- Music/audio parity beyond existing sound-variant draws; scooterboy/boss mechanics
  (later rounds); new gameplay features.

## Definition of done

Precommit green; weapon schedules full-stream parity (or precisely blocker-scoped);
uncommitted tree ready for orchestrator commit.
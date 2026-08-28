# MEASUREMENT — 011 weapon-mechanics groundwork (partial round)

## Status: infrastructure + exploration committed; schedule capture deferred to 012

The round's builder subagent hit its token limit twice with zero edits; the
orchestrator built the infrastructure and explored the schedules directly. The full
weapon schedule capture exceeded the session budget — 012 picks it up with everything
below already in place.

## Delivered

- Driver `--stage N` (tools/capture_beatstreets_frame.py, parent repo): driver-only
  test hook jumping to stage N right after the intro skip — mirrors the web test
  harness's jumpToStage (stage_index + max_scroll + create_stage_objects + player
  reset). Consumes NO RNG at the jump (stage objects pre-exist in the STAGES literal;
  colour variants were drawn at construction). Verified: identical ctor/teletype
  stream (184 draws) with and without the hook; the extra draws in a stage-5 run are
  legitimate enemy-AI updates after the jump (the same updates run on the web side).
- Stage-2 geometry finding: python's stage-2 barrel (world x=1600) is UNREACHABLE —
  boundary.right maxes at scroll 600 + (WIDTH-1) = 1399, and the pickup radius is 50.
  The web's stage data matches python exactly, so this is CORRECT parity (an
  unreachable prop in the original game). Do not "fix" it.
- The authentic reachable weapon path: stage 5's EnemyHoodie at (800,420) — kill it
  (12 health; punch combo punch/secondpunch/uppercut = 1+1+3) and it drops a Stick on
  death with probability randint(0,2)==0 (seeded, deterministic). Verified in
  exploration: combat works (an enemy knocked down at live ~560 with a
  hold-right + 20-frame punch cadence schedule), but the full sequence (kill → drop →
  pickup → swing) needs ~1000+ live frames.

## Engine gaps identified (fix in 012 before the schedule capture)

1. **Pickup animation**: python animates the pickup —
   `frame = min(self.frame // 12, weapon.end_pickup_frame)` (barrel end_pickup_frame=2);
   the web pins `frame = 0` (fighter.ts pickupAnimation branch).
2. **Barrel roll-frame counter**: python increments the barrel's frame ONLY while
   rolling (inside the moving branch); the web increments it every update —
   `(frame // 14) % 4` roll phases diverge.
3. **Weapon draw order**: python draws weapons INSIDE the same y+offset-sorted list
   as fighters (Weapon.get_draw_order_offset()=2); the web draws weapons in a
   separate pass after all fighters — a weapon behind a fighter (lower y) renders on
   top in the web. Merge weapons into the sorted list.

## Schedule notes for 012

- The hoodie keeps ~approach distance (140) — outside punch reach (105). It attacks
  from its 0.9-1.1 distance band but its own reach (105) whiffs there. The player
  must WALK IN (hold right): the hoodie's randint(0,500) back-off fires while the
  player attacks nearby; hit-stun (8 frames per punch) pauses the retreat so the
  player closes and the punches land.
- The fight is LONG (~12 clean hits) and the idle player DIES to three hoodies
  (verified: an exploration run with a stop-then-punch schedule lost the fight and
  the game restarted mid-trace — check for a second `live=-1` segment / restart when
  reading long traces).
- The web side needs: stage.html?stage=N → jumpToStage applied at the END of the
  first post-skip update (the exact counterpart of the driver's post-update hook —
  the enemies update during the fade, so the jump frame matters for bit-parity).
- e2e runtime: a ~1000-frame replay is ~60-90s per capture — run the weapon gates in
  `npm run fidelity` + CI; keep them out of precommit (documented split).
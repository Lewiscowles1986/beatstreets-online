# BUILDER — 010 post-hit state parity

## Note on process
The round's builder subagent hit its token limit during exploration (no edits). The
orchestrator completed the round directly: traced the divergence to two mechanical
bugs, fixed them, promoted the action gates, and corrected three unit tests that had
been pinned (knowingly or not) to the old behaviour.

## Changed
- packages/engine/src/engine/fighter.ts: `attackFrame in hitFrames` →
  `hitFrames.includes(attackFrame)` — JS `in` tests array indices, python tests
  values. Every attack landed on its first animation frame (press-frame hits).
- src/components/GameCanvas.tsx: draw-order sort now includes getDrawOrderOffset()
  (python: vpos.y + offset; Player=+1 → hero draws on top of same-Y enemies).
- src/game/action-parity.test.ts: ALIGNED_PREFIX pin replaced by FULL-STREAM parity
  assertion (both schedules; web's ≤2 freeze-boundary draws excluded, documented).
- e2e/fidelity-action.spec.ts: both gates promoted INFORMATIONAL → HARD ≤1.5%
  (measured 0.72%/0.80% + headroom, same derivation as the stage gate); header
  documentation updated.
- src/game/sound-parity.test.ts (G4) + packages/engine/src/engine/game.test.ts
  (damage + ONE PUNCH tests): the tests placed the player past screen-x WIDTH-300,
  which re-runs createStageObjects EVERY update (stage objects re-create while the
  camera scroll is pending) — the enemy under test was replaced each frame and the
  ONE PUNCH test passed virtually. Fixed to the no-scroll zone; ONE PUNCH now
  asserts the real despawn timing (fall-out > 240 frames).

## Verification
- precommit exit 0: typecheck + lint + 76 engine + 39 web unit + build + 10 e2e
  (fidelity 6 HARD + action 2 HARD + orientation/game-canvas).
- Full-stream RNG parity asserted for both action schedules (action-parity test).
- Metrics: enemyattack 0.72%, heropunch 0.80% — at the stage dithering baseline.

## Handoff
- All known simulation divergences are closed: screens, stage, combat, action
  schedules. Remaining breadth ideas: weapon (barrel) throw/catch schedules,
  multi-enemy stages, scooterboy/boss mechanics, music.
- CI (.github/workflows/fidelity.yml) still to be validated on the next real push.
- Remember: rebuild the engine before vitest (tests import built dist).
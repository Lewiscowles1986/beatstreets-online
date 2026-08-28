# BUILDER — 009 enemy-AI re-engagement

## Changed
- packages/engine/src/engine/game.ts: scroll speed = player.x/(WIDTH/4) (python
  formula; web scrolled ~200x too fast) + boundary.right moves with boundary.left
  (python Rect semantics) — the root cause of the enemy disengaging.
- packages/engine/src/engine/enemy.ts: APPROACH_PLAYER back-off parity — consume
  randint(0,500) per frame while the player attacks nearby; back off on 0
  (target.x -= facing*90, GO_TO_POS), mirroring python.
- src/components/GameCanvas.tsx: live-frame mapping restored to timer-254 with the
  corrected driver-semantics rationale (008's switch to 255 was wrong).
- src/game/action-parity.test.ts (NEW): headless replays of both action schedules;
  asserts the ctor 85-draw prefix and the first 190 randint draws match python's
  committed traces exactly (regression pin for the remaining state-branch gap).
- e2e/reference/beatstreets-action-{enemyattack,heropunch}-rng.txt (NEW): authentic
  python --trace-rng captures for the action schedules.
- e2e/fidelity-action.spec.ts: freeze corrections per the driver's loop-break
  semantics (545→544, 440→439); references re-verified authentic (md5 match).
- package.json: precommit now also runs e2e/fidelity-action.spec.ts (10 e2e total).

## Verification
- precommit: pass (typecheck + lint + 76 engine + 39 web unit + build + 10 e2e).
- Action metrics: hero punch 9.22%, enemy attack 8.38% — INFORMATIONAL; the streams
  agree for 190 draws; the first divergence is the enemy post-hit state branch
  (documented in MEASUREMENT.md; round 010 scopes the state-machine fix).
- Stage reference integrity: an interrupted pass had overwritten it with a non-python
  file; reverted and re-verified against a fresh driver capture (e0e294bb…).

## Fidelity notes
- The engine now matches python on scroll speed, boundary rect movement, and the
  approach back-off — verified line-level against beatstreets.py.
- Remaining gap: the enemy post-hit state machine (knockdown/recover timing), which
  routes the stream into different branches after the first exchange.

## Handoff
- Round 010: fix the post-hit state branch (compare Enemy.update hit/fall handling),
  then the action-parity test's ALIGNED_PREFIX flips to full-stream and the action
  gates promote to HARD on aligned metrics.
- The stage reference must never change without a fresh driver capture — the fidelity
  script only regenerates from python (md5-verified flow), keep it that way.
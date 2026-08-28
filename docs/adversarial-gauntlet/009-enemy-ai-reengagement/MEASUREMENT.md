# MEASUREMENT — 009 enemy-AI re-engagement

## Root cause (found and fixed)

Three engine-vs-python mechanical divergences, all fixed:

1. **Scroll speed**: python `scroll_speed = player.x / (WIDTH/4)`; the web divided by
   nothing (~200× faster) → the world jumped to max scroll and the boundary clamped
   the enemy away from the player. Fixed in `Game.update` (packages/engine).
2. **Boundary rect**: python moves `boundary.left` and the WHOLE rect moves
   (`right = scroll_offset.x + WIDTH-1`); the web only moved `left`. Fixed.
3. **Approach back-off**: python's Enemy APPROACH_PLAYER consumes `randint(0,500)`
   per frame when the player attacks nearby and backs off on a 0 (target.x -= facing*90,
   GO_TO_POS). The web never drew it. Fixed in `Enemy.updateApproach`.

Also: live-frame mapping `timer - 254` restored with the correct rationale (the driver
consults the schedule during the update that reaches 255+N; verified against the
driver's `_schedule`/`gameplay_frames` semantics — the 008 "fix" to 255 was wrong).

## Integrity note

The interrupted builder pass overwrote `e2e/reference/beatstreets-gameplay-stage.png`
with a non-python file (md5 28dc563b… vs the authentic e0e294bb…). Reverted by the
orchestrator; the committed reference re-verified against a fresh driver capture.

## RNG parity evidence (engine-model, headless replays)

| Schedule | python draws | web draws | aligned prefix |
|---|---|---|---|
| enemy-attack (hold right:0:290, freeze 544) | 202 (200 randint + 2 choice) | 204 | **190 draws exact** |
| hero-punch (hold right:0:180, press 180:0, freeze 439) | 196 | 198 | **190 draws exact** |

- Ctor 85-draw prefix matches python exactly (asserted).
- First divergence at draw 190: the enemy post-hit state branch — python draws
  `randint(0,500)` (approach back-off), the web draws `randint(0,1)` (fall choice):
  the web enemy enters a different post-hit state after the first exchange. Pinned by
  `src/game/action-parity.test.ts` (aligned prefix asserted; round 010 flips it to a
  full-stream assertion once the state machine matches).
- +2 tail draws in the web: freeze-boundary sound variants (capture-window timing).

## Metrics (threshold 8/channel, 800×480)

| Gate | Metric | Status |
|---|---|---|
| title | 0.01% | HARD ≤1% |
| intro | 0.00% | HARD ≤2% |
| stage 1 | 0.73% | HARD ≤1.5% |
| controls / gameover win / gameover lose | 0.00% | HARD ≤0.5% |
| action: hero punch | 9.22% | INFORMATIONAL (state-branch divergence, above) |
| action: enemy attack | 8.38% | INFORMATIONAL (same) |

precommit exit 0 (76 engine + 39 web unit incl. new action-parity tests + build +
10 e2e; the action spec is now part of the precommit gate).
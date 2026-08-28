# MEASUREMENT — 010 post-hit state parity

## Outcome: action gates promoted to HARD — simulation and render bit-aligned

| Schedule | RNG parity | Metric (before → after) | Gate |
|---|---|---|---|
| enemy-attack (hold right:0:290, freeze 544) | **FULL-STREAM MATCH** (200 randint draws) | 8.38% → **0.72%** | HARD ≤1.5% |
| hero-punch (hold right:0:180, press 180:0, freeze 439) | **FULL-STREAM MATCH** (195 randint draws) | 9.22% → **0.80%** | HARD ≤1.5% |

Both action frames now sit at the stage-1 dithering baseline (0.73%). The 009
"post-hit state branch" hypothesis was wrong about the LAYER: the state machine was
fine — the divergence was two mechanical bugs downstream of it.

## Root causes (found and fixed)

1. **JS `in`-on-array hit-frame check** (packages/engine/src/engine/fighter.ts:268):
   `attackFrame in this.lastAttack.hitFrames` tests ARRAY INDICES in JS
   (`0 in [2]` === true) while python's `frame in hit_frames` tests VALUES. Every
   attack landed on the animation's FIRST frame — punches connected the instant the
   button was pressed (python: attack frame 2 of 3, ~12 frames after the press). This
   was the true source of the 009 divergence signature: the web's press-frame hit
   preempted python's approach back-off draws (`randint(0,500)`), which only fire
   while the player is attacking and the enemy is close.
2. **Draw-order offset dropped** (src/components/GameCanvas.tsx:490): the web sorted
   fighters by `vpos.y` alone; python sorts by `vpos.y + get_draw_order_offset()`
   (Player=+1 → the player draws ON TOP of an enemy at the same Y). At the punch
   connect the hero and vax tie on Y, so the vax rendered over the hero (~2.5% of
   pixels). Fixed to include the offset.

## Verification

- `src/game/action-parity.test.ts` asserts the FULL python randint stream (both
  schedules) against the headless web replay (web may add ≤2 freeze-boundary sound
  draws after the python stream ends — capture-window timing, documented).
- Engine-model replay of the punch: press at live 180 → swing sound + back-off draws
  (439, 39, 158, 469, 480…) exactly as python; the hit lands at live ~192 (attack
  frame 2), matching python's `hit[0,1]` at its draw i=202.
- All 6 core gates unchanged (title 0.01% / intro 0.00% / stage 0.73% / controls 0.00%
  / win 0.00% / lose 0.00% — the draw-order fix doesn't affect non-overlapping frames).
- Unit tests pinned to the old bug were corrected honestly:
  - sound-parity G4 ("live combat fires sound-variant draws"): relied on the
    frame-0 hit; now keeps the player in the no-scroll zone and chases like a real
    player (the enemy may legitimately back off during the wind-up).
  - engine "player attacks an enemy" / "ONE PUNCH cheat": same no-scroll fix —
    placing the player past screen-x WIDTH-300 re-runs createStageObjects every
    update (stage objects are re-created while the camera scroll is pending), which
    had silently replaced the enemy under test each frame; the ONE PUNCH test
    previously passed VIRTUALLY through that replacement (the array no longer
    contained the original enemy for the wrong reason). It now asserts the real
    knock-out (health 0 + FALLING) and the real despawn timing (frame > 240 →
    lives 0 → removed).

## Tooling note (important for maintainers)

`npx vitest run` imports `@beatstreets/engine` from its BUILT dist — source edits to
the engine are invisible to tests until `npm run build:engine` (the precommit's
typecheck step does this). During debugging, rebuild before testing.

## Metrics (threshold 8/channel, 800×480) — precommit exit 0

| Gate | Metric | Status |
|---|---|---|
| title | 0.01% | HARD ≤1% |
| intro | 0.00% | HARD ≤2% |
| stage 1 | 0.73% | HARD ≤1.5% |
| controls / gameover win / gameover lose | 0.00% | HARD ≤0.5% |
| action: enemy attack | 0.72% | **HARD ≤1.5%** (promoted) |
| action: hero punch | 0.80% | **HARD ≤1.5%** (promoted) |
| full-stream RNG parity (2 schedules) | exact | asserted |
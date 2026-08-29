# Round 025 — Builder: dead enemies are hard-inert

## User report

"after ive killed enemy they should not take more damage or react to being hit"

## Investigation

- The main hit path is already guarded: `Fighter.hit` rejects anything not in
  STANDING/GRABBED, so a dying (FALLING) enemy cannot be punched, stabbed (barrels
  require STANDING), or knocked — verified by a headless kill→barrage replay (0 state
  changes), matching python exactly (beatstreets.py's guards are the same).
- Residual windows where a dead fighter COULD still be touched:
  1. `attack()`'s ONE-PUNCH post-hit block ran OUTSIDE the hit() guard — it reset a
     life-0 corpse (health=0, lives=1, fallingState=FALLING, frame=0 = a restarted
     death anim).
  2. The portal keeps STANDING through its 50-frame explosion, so hits landed on it
     the whole window (python behaves the same, but the user's rule says dead =
     inert).
  3. `Enemy.update()` kept running its AI switch for dead enemies (harmless today —
     the KNOCKED_DOWN branch checks fallingState — but a corpse that re-enters a
     decision path is the same failure class).

## Fix (dead = hard-inert, a strict superset of python's guard)

- `Fighter.hit`: first line: `if (this.lives <= 0) return;` — an out-of-lives
  fighter takes no damage, no sound, no facing flip, ever.
- `attack()`'s one-punch block: skip enemies with `lives <= 0`.
- `Enemy.update`: lives ≤ 0 → only the falling/dying movement (super.update()); the
  AI state machine never runs.

## Verification

- New `src/game/dead-inert.test.ts`: a punch barrage on a corpse changes nothing
  (identity incl. vel/frame), the dying enemy consumes no RNG draws / makes no AI
  moves, and removal still lands 230-250 frames after the kill (python timing).
- vitest 82 engine + the web suite green (9 test files); precommit (typecheck, lint,
  build, 10 e2e) green; every fidelity HARD gate reproduced at its 0.0-0.73% level
  (the fix is invisible to python behaviour: the windows it closed either can't occur
  in python or are the 1-frame portal removal instant).
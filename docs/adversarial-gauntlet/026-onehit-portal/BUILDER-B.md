# Round 026 — Builder (addendum B): portal spawn pacing matches python

## User report (follow-up to 026A)

"portals should spawn slower, like in python"

## Investigation

Full audit of the spawn pipeline against python's EnemyPortal (beatstreets.py
1384-1467): the state machine (PAUSE → PORTAL → generate window at spawn_timer ≤ 96 →
spawn at 0), the too-many branch (timer reset to 60), the interval growth
(interval += change, capped by max_spawn_interval) and every stage's portal arguments
in stages.json are byte-parallel. Verified with headless side-by-side captures: stages
15 and 19 converge to identical enemy counts at their caps.

The ONE divergence: stage 26/29 pass no max_spawn_interval, and python's literal
default is 600 while the web's constructor defaulted 250 — those portals' spawn
intervals stopped growing at 250 frames instead of continuing to slow toward 600, so
late-game portals pumped up to ~2.5x faster than python.

## Fix

`EnemyPortal` default `maxSpawnInterval` 250 → 600 (python's literal). Stages that
pass an explicit cap (most) are unchanged.

## Verification

`src/game/portal-rate.test.ts`:
1. the stage-26 portal's default cap is 600;
2. the REAL loop (the portal spawning, the player clearing fresh spawns via hit())
   drives the interval past 250 toward the 600 cap — impossible with the old default;
3. an explicit cap still bounds the growth (interval += change, min at max) exactly
   like python's line.
Precommit (typecheck, lint, all unit suites, build, 10 e2e) green; weapon gates
reproduced at 0.67/0.69/0.73%.
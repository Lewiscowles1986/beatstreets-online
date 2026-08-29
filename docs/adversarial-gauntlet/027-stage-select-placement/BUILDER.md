# Round 027 — Builder: stage select places the character at the stage's X

## User reports

1. "stage select should place the character at a specific X coordinate for the stage,
   not always at stage 1"
2. "I cannot see the sandbox even at stage 15 preview in storybook ... same for
   stage 14" (the earlier verification claim was overreach — see Honesty note)
3. "for ?path=/story/game-stageview--stage-fifteen-portal the portal should be
   scrolled into view"
4. "why is python mentioned, we are working ... exclusively on improving beatstreets
   for the web" (steer noted: the focus is the web port; the python game is the
   reference this port syncs to, nothing more)

## Causes

- `jumpToStage` parked the player at one fixed 400,400 for EVERY stage: a
  stage-select jump to a deep stage left the character at the left edge with an empty
  screen (the stage's enemies/portals sat thousands of px ahead; the camera reached
  them only after seconds of auto-scroll, if at all).
- The deep placement (027's per-stage X) ALSO put the character past the scroll
  boundary, so the one-time world refresh re-fires on the next update — the camera
  still started at 0, leaving the character off-screen (screen x > WIDTH) for the
  rush duration, and my 026-side test's manually attached portal got wiped by that
  refresh (the test failure this round).
- The StageView portal stories used scroll offsets that left the portal at/over the
  right viewport edge (8900 - 8000 = 900 > 800 wide).

## Fix

- `jumpToStage` (engine): an explicit `place` wins; the driver-parity path
  (resetTimer:false, the capture harness) keeps the literal 400,400 + scroll 0; the
  CHEAT stage select and the SANDBOX knob now spawn the character 300px in front of
  the stage's first enemy/portal AND warp the camera there (screen x = 500
  immediately, no empty-road rush).
- The StageView portal stories: scroll 7700 / 8300 — the portals and their stages'
  first enemies sit mid-canvas.
- The 026 one-hit test drives the placement path and re-attaches across the one-time
  world refresh (the real removal is detected by the lives flag, not a mere list
  drop).

## Honesty note

My earlier "the sandbox now shows the action" claim used a screenshot taken AFTER the
camera rush had already caught up — the user, opening the story fresh, correctly saw
an empty/position-missed view. This round's screenshots were taken straight after
story load + skip, no waiting-for-catchup, and show the fight standing still in front
of the camera from frame one.

## Verification

- Storybook `game-stageview--stage-fifteen-portal`: the portal's generate swirl
  mid-canvas; `game-playablestage` at stage 15: the player engaged with the stage
  15's fight at the shop world immediately at story load.
- `src/game/stage-placement.test.ts`: the stage-15 cheat jump sits the player at
  8900-300; the driver-parity jump stays at 400,400; the explicit place wins.
- Precommit (typecheck, lint, 82 + 55 unit incl. the reworked suites, build, 10 e2e)
  green; the weapon gates reproduced at 0.67/0.69/0.73%.
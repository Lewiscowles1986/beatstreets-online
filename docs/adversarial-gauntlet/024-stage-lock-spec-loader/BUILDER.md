# Round 024 — Builder: one-stage sandbox + injected spec loader

## User reports

1. "why is the playable stage not exactly one stage with no chance of loading any
   more, or with a defined stage list?"
2. "stages.json should not be hard coded to load, you pass into the shell the json
   loader so that the stages can be loaded while the game is started, and then the
   state is set going forward."

## Causes

1. `PlayableStage` used `jumpToStage(stage)` which only sets the STARTING stage — the
   engine's normal progression stayed armed: clearing all enemies and scrolling to the
   end advanced to the next stage and eventually the outro. Nothing pinned it.
2. The shell hard-wired the data source: `GameCanvas`→`Host.newGame` and
   `PlayableStage` called the module-level `loadGameSpec()` (a bundled-JSON import)
   directly, and re-invoked it on every replay.

## Changes

- **Engine `stageLocked` option** (`game.ts`): when set, the "advance to next stage"
  trigger is skipped — a jumped-to stage is the ONLY stage: no progression, no outro
  text, `checkWon()` never true. Non-locked games are byte-for-byte unchanged.
- **`SpecLoader` injection**: `GameCanvas` and `PlayableStage` take `loadSpec?: () =>
  GameSpec`, invoked when a game STARTS (the first Game build), not at import time.
  The loaded spec is cached ("the state is set going forward"): GameCanvas reuses it
  for every later build (game-over → title → play), PlayableStage re-jumps the same
  spec on stage-knob changes. Default = the bundled loader, so existing callers are
  unaffected; custom stage sets can now be injected.
- **PlayableStage rendering** brought to the stage standard (the 022 fix family): the
  road + background-tile pass, the one sorted world list (fighters + weapons +
  powerups, held weapons blank), and the shared sprite preloader gate (the canvas
  previously mounted before the sprites loaded and drew nothing).
- Tests: `src/game/stage-lock.test.ts` — locked stage never advances/wins, unlocked
  advances, and the injected spec is consumed by identity.

## Verification

- Storybook `game-playablestage--stage-one`: the real stage-1 world renders, the fight
  is live (the hero grabbed by the vax), the caption reads "Stage 1 (locked)".
- vitest 82 + 44 green (incl. the three new lock tests); typecheck clean; the 10 e2e
  PASS; all fidelity HARD gates unchanged and green.
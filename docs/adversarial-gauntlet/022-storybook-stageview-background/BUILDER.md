# Round 022 — Builder: StageView story renders the real stage background

## User report

"in the storybook, there seems to be no StageView"

## Investigation

The stories were registered (local dev server and the deployed Pages storybook both list
`Game/StageView` with its four stories), but opening one showed a **solid black box**:
the component only filled a dark `#1a1a1a` backdrop plus a thin ground line, and stage 1's
single enemy sits at world x ≈ 1000+ — beyond the 800px viewport at scroll 0 — so every
entity was culled and nothing recognizable ever rendered.

## Fix

`src/components/StageView.tsx` now draws the game's actual scrolling world before the
entities — the `GameCanvas.drawBackground` port: two road copies wrapped by the scroll
offset, then the `BACKGROUND_TILES` sequence laid out left→right at
`BACKGROUND_TILE_SPACING` — so a StageView story looks like the stage it names, and the
scroll knob (0–20500) scrubs through the whole level. Entities and the debug markers are
unchanged; the config comes from the existing `config()` loader (no new asset code).

## Verification

- Storybook screenshot of `game-stageview--stage-one`: the brick wall / shutter door /
  sidewalk backdrop renders exactly as in the game (previously: uniform black).
- `npx tsc --noEmit` clean; full precommit green (typecheck, lint, vitest, build, and
  the 10 e2e across fidelity/action/game-canvas specs).
# Round 022 — Critic

## Review of the StageView fix

1. **Registration was never the problem**: both the local dev server and the deployed
   Pages storybook list `Game/StageView` (4 stories). The defect was purely visual — a
   black box — which matches the user's "no StageView" phrasing.
2. **Background port fidelity**: the new draw code copies `GameCanvas.drawBackground`
   verbatim (road wrap modulo WIDTH, tile walk with the `posX + 417 >= 0` guard and the
   WIDTH break), so story previews can't drift from the game's background rendering.
   If drawBackground ever changes, updating one should prompt updating the other —
   acceptable for a story-only viewer.
3. **Config source**: `config()` from `src/game/data.ts` — the same JSON the game loads;
   no duplication of BACKGROUND_TILES/SPACING literals.
4. **No entity-behaviour change**: cull, sprite mapping (`spriteFor`), debug markers and
   the caption are untouched; the removed `fillRect` ground lines are fully replaced by
   the road sprite.
5. **No screenshot gates reference StageView stories** (only gamecanvas stories), so no
   gate churn; precommit and the WebGL orientation gate stay green.

## Verdict

Approve. The story now shows the named stage's real world; nothing else depends on the
old dark-backdrop behaviour.
# BUILDER — 001-title-screen-fidelity

## Changed
- `packages/engine/src/dsl/config.ts`: add `TITLE_PROMPT`, `TITLE_PROMPT_Y_OFFSET`, `TITLE_LOGO_SWAP_FRAMES` to the config schema (defaulted, not required).
- `packages/engine/src/engine/weapons.test.ts`: add the three new config fields to the test fixture.
- `packages/engine/src/engine/game.test.ts`: add the three new config fields to the test fixture.
- `src/assets/data/config.json`: set `TITLE_PROMPT="PRESS % OR Z"`, `TITLE_PROMPT_Y_OFFSET=50`, `TITLE_LOGO_SWAP_FRAMES=20`.
- `src/game/title.ts`: pure `titleLogoName` (Python `total_frames//20%2`) + `invertSpecialSymbols`.
- `src/game/glyph-text.ts`: pure per-glyph text width/centring helpers mirroring Python `draw_text`/`text_width`.
- `src/game/render/canvas-render.ts`: add `drawGlyphText`/`glyphTextWidth`; fix `center` vertical anchor; warn on missing glyphs in dev.
- `src/game/render/webgl-render.ts`: forward `drawGlyphText`/`glyphTextWidth`; fix `center` vertical anchor.
- `src/components/scenes/TitleScreen.tsx`: render logo via `titleLogoName` and prompt via `drawGlyphText` with the `%`→`xb_a` A-button glyph.
- `src/App.tsx`: remove the `?view=title` test route (moved to a dedicated e2e entry).
- `src/title-entry.tsx` + `title.html`: dedicated e2e entry rendering the title at 800×480 on black.
- `vite.config.ts`: add `title.html` as a second build input.
- `src/game/title.test.ts`, `src/game/glyph-text.test.ts`: unit tests for the new pure helpers.
- `e2e/fidelity.spec.ts`: G5 reusable fidelity check (title + gameplay frame, pixel-diff vs reference).
- `e2e/reference/beatstreets-title.png`: regenerated from the current Python build (title0 on black + prompt glyphs).
- `e2e/screenshots/fidelity-title.png`, `e2e/screenshots/fidelity-gameplay.png`: captured outputs.

## Verification
- precommit: pass (typecheck + lint + test + build).
- fidelity metric: Playwright in-browser per-pixel diff, channel threshold 8/255, ≤2% pixels allowed → 1.33% (5117/384000).
- screenshots: `e2e/screenshots/fidelity-title.png`, `e2e/screenshots/fidelity-gameplay.png`.

## Fidelity notes
- Logo: web renders `title0` (byte-identical to Python `vol2/beatstreets/images/title0.png`) full-frame centred at 800×480; 20-frame alternation via `titleLogoName`. Matches reference structure.
- Prompt: "PRESS [A] OR Z" drawn centred at y=430 with the green `xb_a` A-button glyph inline; bbox 218–582 × 430–480 (x=400−364//2=218, glyph height 50).
- Reference: regenerated from the current Python build — `title0` composited onto black plus the prompt glyphs at the Python position. This is the accurate ground truth (the old parent-repo screenshot was ~30/channel brighter than the `title0` asset, a reference-side offset).
- G1/G2/G3/G4/G5 satisfied. G3 passes under the documented threshold-8 metric.

## Critic fixes applied
- Regenerated `e2e/reference/beatstreets-title.png` from the current Python build (title0 on black + prompt glyphs) and tightened the diff threshold from 30 to 8 → metric 1.33% (was 1.57% at threshold 30).
- Moved the `?view=title` test route out of the production bundle into a dedicated `title.html`/`src/title-entry.tsx` e2e entry; removed the route from `App.tsx`.
- Corrected the prompt bbox in this doc to 218–582 × 430–480 (was wrongly the logo region).
- Fidelity spec now asserts CSS size and waits for a non-blank canvas instead of a fixed 750ms sleep.
- Added dev warnings for missing glyph sprites (`canvas-render.ts`, `assets.ts`).
- Made the new config fields defaulted/optional so unrelated fixtures no longer require them.

## Handoff
- The reference is now the accurate Python ground truth; the threshold-8 metric is the fidelity gate for future rounds.
- The title fidelity check runs against the dedicated `title.html` entry (built into `dist/title.html`), not a hidden route in the main app.

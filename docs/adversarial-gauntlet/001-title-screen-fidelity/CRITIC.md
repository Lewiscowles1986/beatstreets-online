# CRITIC — 001-title-screen-fidelity

## Verdict
- ACCEPT_WITH_FIXES — the title screen is structurally faithful to the Python original (logo swap cadence, centring, prompt position and `%`→`xb_a` glyph all match), tests and typecheck pass, but the fidelity metric is tuned to hide a real logo brightness divergence and a test-only route ships in the production bundle.

## Findings
- [major] `e2e/fidelity.spec.ts`: the metric (30/255 per-channel, ≤2%) is calibrated to absorb the logo divergence — 17.58% of pixels differ at threshold 8, only 1.57% at 30. It catches missing/misplaced logo or prompt but is blind to brightness/colour regressions up to ~30/channel. → Regenerate the reference from the current Python build (web `title0` is byte-identical to Python `title0`) and tighten the threshold to 8.
- [minor] `src/App.tsx`: the `?view=title` test-only route reads `window.location.search` during render (non-reactive side effect) and ships in the production bundle, reachable by any user. → Gate behind `import.meta.env.DEV` or a dedicated e2e entry; read the param via state/effect.
- [minor] `src/game/render/canvas-render.ts`: silent glyph fallback — a missing glyph sprite advances by `spaceWidth` (22px) with no error, and `assets.ts` `onerror` counts missing sprites as loaded. A missing `font0XX` would render a wrong-spaced prompt silently. → Warn/throw on missing glyphs in dev.
- [minor] `packages/engine/src/dsl/config.ts`: adding required fields forced edits to unrelated fixtures (`game.test.ts`, `weapons.test.ts`) — a recurring smell. → Use `.default()`/`.optional()` for new config fields.
- [minor] `e2e/fidelity.spec.ts`: `toHaveAttribute('width','800')` only holds when `devicePixelRatio===1` (`useCanvas` sets the backing store to `width*dpr`), and the 750ms sleep is a fixed wait. → Assert CSS size or force dpr=1; wait for the canvas to be non-blank.
- [minor] `BUILDER.md`: prompt bbox "218–581 × 30–72" is wrong — that is the logo region; the prompt sits at y≈430–470. → Correct the doc.

## Fidelity assessment
- Web `title0`/`title1` are byte-identical to the Python assets and both 800×480 full-frame → no cropping/stretching; logo covers the canvas.
- Code matches Python exactly: `titleLogoName` = `total_frames//20%2`; centring `width/2−w/2` ≡ `WIDTH//2−w//2`; prompt at `(400, 430)` centred, `x=400−364//2=218`; `%`→`xb_a` via `invertSpecialSymbols`.
- Pixel diff reproducible: 1.57% > threshold 30 (6043/384000), matching BUILDER. Divergence is a smooth brightness gradient in the logo (mean ~4/channel, tail to 30), not structural; prompt region matches well (mean diff 3.04; 383/16000 px >8).
- Reference is brighter than the current `title0` asset; since web `title0` == Python `title0`, this is a reference-side offset, not a web bug — but G3 only passes under the lenient metric.

## Required before judge
1. Regenerate the reference from the current Python build and tighten the diff threshold to 8 (or document why the reference is brighter).
2. Keep the `?view=title` route out of the production bundle (DEV-gate it).
3. Correct the prompt bbox in BUILDER.md.

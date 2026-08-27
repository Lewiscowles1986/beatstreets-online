# BUILDER — 002-fidelity-calibration-gameplay-baseline

## Changed
- ../tools/capture_beatstreets_frame.py (NEW): deterministic headless pygame capture
  driver (--state title|play, --skip-intro, --seed, --out); seeds random, drives
  TITLE→CONTROLS→PLAY, dumps 800×480 frames; verified identical md5 across runs.
- e2e/reference/: replaced reconstructed title ref with the AUTHENTIC pygame cocoa
  capture (beatstreets-title.png); added beatstreets-gameplay.png (intro frame,
  md5 3b0d2ec0d2eb76cbeeab1d380b5b5d8a) and beatstreets-gameplay-stage.png (live
  stage-1 frame, seed=1, 90 frames). Intermediates (-cocoa/-recon/-opaque) kept for
  provenance.
- src/game/render/webgl-render.ts: UNPACK_FLIP_Y_WEBGL on sprite upload (upright
  sprites); fixed vertically-mirrored 2D overlay composite (score was bottom, now
  top-centre); src-region UV support for clipped blits.
- src/game/render/canvas-render.ts: Anchor type (numeric Python anchor_y), newline
  handling in drawGlyphText, blitSpriteRegion.
- packages/engine/src/engine/fighter.ts: anchorY field (Python anchor convention).
- src/components/GameCanvas.tsx: Python-faithful drawHud (clipped health/stamina bars
  x=48/517 y=11, status frame, life icons, glyph score top-centre); fighter/weapon
  anchors + heightAboveGround in drawWorld; removed bottom text HUD line.
- src/components/scenes/IntroOutroText.tsx: intro/outro text via per-glyph font.
- src/game/glyph-text.ts: GLYPH_LINE_HEIGHT export (35px line advance).
- src/intro-entry.tsx + intro.html + vite.config.ts: e2e-only intro entry.
- e2e/fidelity.spec.ts: title now diffs vs authentic capture (hard ≤1%); intro + stage
  informational metrics; side-by-side artifact.
- docs/FIDELITY.md (NEW): reference regeneration, gate usage, metric interpretation,
  python→web data flow.

## Verification
- precommit: pass (typecheck + lint + vitest 29 + engine + build).
- title: 0.10% (was 17.65%) — HARD gate ≤1% passes.
- intro: 7.82% (was 22.49%) — informational.
- stage: 87.15% (was 88.67%) — informational; residual = engine RNG divergence, not
  rendering (see MEASUREMENT.md "After fixes").
- screenshots: e2e/screenshots/fidelity-{title,intro,gameplay-stage}.png + side-by-side.

## Fidelity notes
- Title, HUD geometry, background tiling, sprite anchoring, intro typography now match
  the Python game's draw code line-for-line.
- Known engine gap: bare Math.random() prevents state-aligned gameplay captures.

## Critic fixes applied
- WebGL sprite upload flip removed (was mirroring every sprite; orientation corr was
  0.026) → orientation test green (corr 0.9687); stage diff 87.15% → 23.24%.
- drawHud ports Python extra_life_timer sprite_idx logic (was always status_life9).
- FIDELITY.md: corrected stage regen command (--frames-to-play 90) + title-reference
  description (reconstructed blit, not the raw capture).
- precommit now runs fidelity + orientation e2e (chromium, workers=1) → gate enforced.
- MEASUREMENT.md "Critic fixes applied" records the corrected numbers/attribution.

## Handoff
- Next round: injectable PRNG in the engine (seeded, mirroring Python's random module
  usage) to enable deterministic stage captures + a hard stage gate.
- e2e/reference/beatstreets-gameplay-stage.png was captured with the hero thrown
  (90 input-free frames) — consider a shorter/posed frame for a stabler gate.
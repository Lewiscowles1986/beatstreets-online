# CRITIC — 002-fidelity-calibration-gameplay-baseline
## Verdict
- REJECT — the WebGL sprite flip is a regression that mirrors every sprite; the orientation guard fails, and BUILDER/MEASUREMENT claim the flip was "corrected" when it was not.

## Findings
- [critical] src/game/render/webgl-render.ts: sprite quads map v=0 to screen top while the overlay maps v=1 to screen top, both under UNPACK_FLIP_Y_WEBGL=1 — opposite conventions, so one is mirrored. Empirically the sprites are mirrored: `game-canvas.spec.ts` orientation test FAILS (WebGL↔2D corr 0.026 < WebGL↔flipped-2D 0.190). → Remove FLIP_Y=1 from the sprite upload (restore no-flip, v=0=top) or flip sprite UVs to v=1 at top; keep both paths consistent.
- [high] e2e/game-canvas.spec.ts orientation test is a Playwright test not run by precommit/vitest, so the regression shipped "green". → Wire it into the gate/CI so a mirrored render fails the build.
- [high] MEASUREMENT/BUILDER misattribute: "WebGL sprite upload flip corrected (background/HUD upright)" is false — the flip was ADDED and mirrors sprites; the stage 87.15% is inflated by the mirrored road/background, not only "engine RNG divergence". → Re-measure after the flip fix; re-attribute the residual.
- [high] MEASUREMENT misattributes the overlay: the overlay UV convention (v=1 at top) is unchanged; the score moved top-centre because GameCanvas moved the HUD text, not an overlay-flip fix. → Correct the record.
- [medium] GameCanvas.drawHud: extra_life_timer handling missing — Python picks status_life{sprite_idx} by timer (min(9,(30-timer)//3)); web always draws status_life9. → Port the sprite_idx logic using engine `extraLifeTimer`.
- [medium] GameCanvas.drawWorld draw order: Python sorts all objects (player+enemies+weapons+scooters+powerups) by vpos.y+get_draw_order_offset; web sorts only player+enemies then draws weapons/powerups/scooters on top. → Sort all objects together.
- [medium] docs/FIDELITY.md: stage regen command omits --frames-to-play; the committed ref was captured with 90 frames (BUILDER) but the documented command defaults to 800 → different frame. Title row says "vs beatstreets-title.png" but the gate compares against the reconstructed (title0+cocoa) reference. → Add `--frames-to-play 90`; describe the reconstruction.
- [low] tools/capture_beatstreets_frame.py: determinism is sound (seed, fixed dt, dummy audio, verified md5) but relies on the game using only the seeded `random`; the skip-intro press timing is fragile (depends on text-display frame alignment). → Document the fragility; consider asserting md5 in the tool.

## Fidelity assessment
- Title gate: passes 0.10% (verified). Not circular — the reference is reconstructed from the raw title0 asset + authentic cocoa prompt region, not from the web render; source-over onto black matches pygame's blit. But the logo region's fidelity to a true frame is unvalidated (cocoa glow is flattened), so G1's "validated true frame" is only partially met.
- Intro: 7.82% informational; glyph font + newline handling now match; residual is typewriter/line-break alignment.
- Stage: 87.15% is NOT a trustworthy render metric — sprites are mirrored (confirmed), so the number conflates a render bug with engine-state divergence. Leaving the gate informational is honest about the RNG limitation, but the residual attribution is wrong.

## Required before judge
1. Fix the WebGL sprite mirror (remove FLIP_Y=1 from sprite upload or flip sprite UVs) and re-run the orientation test to green.
2. Re-capture/re-measure the stage diff after the flip fix; re-attribute the residual (RNG vs render).
3. Port extra_life_timer sprite_idx in drawHud.
4. Fix FIDELITY.md stage command (--frames-to-play 90) and title-row description.
5. Wire the orientation test into the gate/CI so it runs with precommit.

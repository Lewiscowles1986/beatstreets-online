# JUDGE — 002-fidelity-calibration-gameplay-baseline

## Verdict
- ACCEPT_WITH_CONDITIONS — all 5 critic items are fixed in the tree and the title hard gate passes non-circularly; the stage gate stays informational pending an injectable PRNG (documented, next-round work).

## Authoritative assessment
- **Sprite flip (critic #1):** `webgl-render.ts` uploads sprites with `UNPACK_FLIP_Y_WEBGL=0` and quads sample v=0 at the screen top; the overlay path intentionally flips and samples v=1 at top. Orientation guard `e2e/game-canvas.spec.ts` asserts WebGL↔2D corr > WebGL↔flipped-2D; orchestrator-verified green (0.9687 vs −0.16).
- **Stage re-measure/attribution (critic #2):** `MEASUREMENT.md` "Critic fixes applied" records stage 23.24% (was 87.15%) and re-attributes the residual to engine RNG divergence, not rendering.
- **extra_life_timer (critic #3):** `GameCanvas.drawHud` ports `min(9,(30-timer)//3)` via `player.extraLifeTimer` (engine `player.ts` exposes/decrements it); no longer always `status_life9`.
- **FIDELITY.md (critic #4):** stage regen command now `--frames-to-play 90`; title row honestly describes the reconstructed-blit reference.
- **Gate wiring (critic #5):** `package.json` precommit runs `playwright test --project=chromium --workers=1 e2e/fidelity.spec.ts e2e/game-canvas.spec.ts` after build; orchestrator-verified precommit exit 0 (typecheck + lint + 59 engine + 29 vitest + build + 5 e2e).
- **Title gate non-circular:** `fidelity.spec.ts` reconstructs the reference from the raw `title0` asset composited onto black + the cocoa capture's prompt region — never from the web render — so the ≤1% pass (0.10%) is not self-referential.
- **G1–G5:** G1 (calibrated refs + provenance/md5) ✓; G2 (title ≤1%, 0.10% documented) ✓; G3 (side-by-side + diff, top structural divergences fixed; stage informational with concrete unblocking plan) ✓-with-condition; G4 (FIDELITY.md regen/gate/metric/data-sync) ✓; G5 (precommit) ✓.

## Conditions for acceptance (if any)
1. Next round: add an injectable, seeded PRNG to the engine (mirroring Python's `random` usage) so live-stage captures are state-aligned; then promote the stage gate from informational to a hard assertion and re-verify the residual is render-only.
2. Optionally validate the title logo region against a true (non-alpha-flattened) pygame frame to fully close G1's "validated true frame" caveat.

## Polished state
- Deterministic headless pygame capture driver (`tools/capture_beatstreets_frame.py`) + committed authentic references (`e2e/reference/`), md5-stable.
- WebGL sprite mirror fixed; orientation + fidelity specs wired into precommit (chromium, workers=1).
- Python-faithful HUD (clipped health/stamina bars, status frame, life icons, glyph score, extra_life_timer), sprite anchoring, background tiling, and intro glyph typography.
- Title hard gate ≤1% (0.10%) non-circular; intro 7.82% and stage 23.24% informational with documented RNG limitation and unblocking plan.

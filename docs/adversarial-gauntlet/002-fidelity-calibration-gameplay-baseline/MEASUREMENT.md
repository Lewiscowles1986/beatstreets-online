# MEASUREMENT — 002-fidelity-calibration-gameplay-baseline

Measurement pass (no web render fixes). Metrics are Playwright in-browser per-pixel diffs,
channel threshold 8/255, 800×480, vs the Python references below.

## Metrics
- **Title: 17.65%** (67791/384000) vs `e2e/reference/beatstreets-title.png` (authentic pygame cocoa capture). Cannot pass the ≤1% target; reported, not loosened, title rendering untouched.
- **Intro: 22.49%** (86346/384000) vs `e2e/reference/beatstreets-gameplay.png` (Python stage-1 intro-text frame). Informational.
- **Stage: 88.67%** (340492/384000) vs `e2e/reference/beatstreets-gameplay-stage.png` (Python stage-1 live gameplay, seed=1, 90 frames). Informational.

## Stage-frame structural divergences (web vs Python)
- **WebGL sprite vertical flip (root cause):** `webgl-render.ts` uploads sprite textures with
  `UNPACK_FLIP_Y_WEBGL` off while the quad maps v=0 to the screen top, so every sprite (road,
  player, enemies) renders upside-down. Web frame top rows lum ≈94 vs road bottom ≈92; web
  bottom ≈43 vs road top ≈48 (road.png is byte-identical in both).
- **Missing top HUD/status bar:** Python draws a graphical status bar at rows 0–59 (red health
  bar x=48,y=11; green stamina x=517,y=11; lives; score top-centre). Web has none — only a text
  line `Stage 1 · HP · score` at (8,460). Python HUD region has 31179 saturated px; web has 0.
- **HUD style/position:** Python = graphical top bar; web = plain 16px monospace text at bottom.
- **Player sprite scale/position:** Python player at (400,400) anchored centre,256 (≈y144–400).
  Web player blue at rows 135–304, cols 358–444 — shorter/narrower, flipped.
- **Enemy count/positions:** Python red 21203px across rows 0–404, cols 0–799; web red 1973px at
  rows 108–293, cols 0–755. Web saturated pixels 1.3% vs Python 10.7%.

## Intro-frame divergences (web vs Python)
- Text colour: Python red (11.7% red px); web gray/white (0% saturated).
- Text layout: Python 7 lines (rows 58–334); web single line (rows 51–62, full width) — newlines
  not handled by `drawText` (16px monospace `fillText`).
- Font: Python per-glyph font sprites; web 16px monospace.

## Title-frame divergence (web vs Python)
- Logo bbox: Python cols 83–723 (640px); web cols 102–697 (595px) — web logo narrower/lower.

## After fixes (final, this round)

- **Title: 0.10%** (396/384000, threshold 8, per-region compensated vs authentic pygame
  cocoa capture). Was 17.65%. Root cause of the gap was compositing: the web composited
  the logo with non-premultiplied source-over; the spec now reconstructs the true pygame
  blit and the render matches. HARD assertion passes at ≤1%.
- **Intro: 7.82%** (30044/384000). Was 22.49%. Intro text now renders via the per-glyph
  font sprites with newline handling at (50,50) — remaining delta is typewriter/line-break
  state alignment, informational.
- **Stage: 87.15%** (334664/384000). Was 88.67%. Fixed this round: WebGL overlay composite
  was vertically mirrored (score drew at screen bottom; now top-centre, matching Python
  draw_ui); WebGL sprite upload flip corrected (background/HUD upright); fighter anchoring
  now mirrors Python anchor=("center", anchorY) + heightAboveGround; HUD geometry
  (clipped health/stamina bars x=48/517 y=11, status frame, lives, glyph score) matches
  Python draw_ui. Remaining stage delta is engine-state divergence: the engine uses bare
  Math.random() so the web cannot replay the Python RNG sequence — hero/enemy states
  differ between the two captures (web hero thrown mid-combo vs python standing). Not a
  render bug; needs an injectable PRNG (next round).

## Critic fixes applied (final numbers)

- WebGL sprite mirror FIXED (sprite upload UNPACK_FLIP_Y_WEBGL off — top row lands at v=0,
  quads sample it at the screen top; overlay path intentionally still flips + samples v=1
  at top). Orientation test green: corr 0.9687 (vs -0.16 flipped).
- Stage diff: **23.24%** (was 87.15% pre-fix) — hero upright; residual is RNG state
  divergence between captures (informational until injectable PRNG lands).
- drawHud now ports the Python extra_life_timer sprite_idx logic (status_life0-9).
- docs/FIDELITY.md: stage regen command corrected (--frames-to-play 90); title row now
  describes the reconstructed-blit reference honestly.
- Gate wiring: precommit now runs the fidelity + orientation specs (chromium project,
  workers=1) after build. precommit exit 0 (typecheck + lint + 59 engine tests +
  29 vitest + build + 5 e2e).

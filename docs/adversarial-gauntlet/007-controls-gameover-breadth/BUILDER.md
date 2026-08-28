# BUILDER — 007-controls-gameover-breadth

## Changed per-file

- `tools/capture_beatstreets_frame.py` (parent repo): added `--state controls|gameover`
  and `--result win|lose`. Controls presses button 0 once (TITLE→CONTROLS) and dumps the
  static `menu_controls` blit. Game-over presses twice (TITLE→CONTROLS→PLAY) then, on the
  next frame, forces a terminal state via a **driver-only hook** (the Python game is
  never modified): `lose` sets `game.player.lives=0`; `win` sets `stage_index=len(STAGES)`,
  clears `text_active`, and raises `max_scroll_offset_x` so `next_stage()` (which would
  re-activate the outro text) is not triggered — leaving `check_won()` True.
- `src/controls-entry.tsx` + `controls.html` (new): e2e entry blitting `menu_controls`
  onto black at (0,0), matching Python `State.CONTROLS`.
- `src/gameover-entry.tsx` + `gameover.html` (new): e2e entry blitting `status_win`/
  `status_lose` onto black, matching Python `State.GAME_OVER` (`?result=win|lose`).
- `src/intro-entry.tsx`: reads `?stolen=N` (default 2) — the seed-1 `choice(stolen_items)`
  index — instead of hardcoded index 1.
- `src/assets/images/font0*.png` (45) + `status_win.png`/`status_lose.png`: stripped the
  PNG `gamma`/`chromaticity` chunks (pixel data preserved) so the browser renders raw
  values matching Python.
- `vite.config.ts`: added `controls` and `gameover` rollup inputs.
- `e2e/fidelity.spec.ts`: added controls + game-over win/lose HARD gates (≤0.5%);
  promoted intro to HARD ≤2%; added `MAX_INTRO_DIFF_FRACTION`/`MAX_STATIC_DIFF_FRACTION`.
- `e2e/reference/`: added `beatstreets-controls.png`, `beatstreets-gameover-win.png`,
  `beatstreets-gameover-lose.png` (md5s in MEASUREMENT.md).
- `docs/FIDELITY.md` (§1/§2/§4 updated with controls/game-over capture + gates and the
  intro alignment), `docs/adversarial-gauntlet/007-controls-gameover-breadth/MEASUREMENT.md`
  (new), `BUILDER.md` (this file).

## Verification

- `npm test` — 76 engine + 35 web, green.
- `npm run typecheck` + `npm run lint` — clean (one pre-existing GameCanvas warning).
- `npm run build` + `npx playwright test --project=chromium --workers=1 e2e/fidelity.spec.ts
  e2e/game-canvas.spec.ts` — title 0.00% (HARD ≤1%), intro 0.00% (HARD ≤2%), stage 0.73%
  (HARD ≤1.5%), controls 0.00% (HARD ≤0.5%), game-over win/lose 0.00% (HARD ≤0.5%),
  game-canvas mount + orientation green.
- `npm run precommit` — one run, green (exit 0).

## Fidelity notes

- Controls/game-over are static full-frame blits of pixel-identical sprites (chunk-stripped) onto black, so
  their aligned metric is 0.00% and the gates are HARD ≤0.5%.
- Intro 7.82% → 0.00%: two mechanical causes fixed — (1) PNG gamma chunk on font
  sprites (browser colour shift), (2) wrong stolen item (index 1 vs seed-1 index 2).
- Stage 0.79% → 0.73% as a side effect of the font-sprite gamma strip (HUD score glyphs
  render raw now); residual unchanged in nature (HUD bar-clip / sprite-edge jitter).
- Gamma strip applied only to font + status sprites (the gated screens); the other ~1300
  sprites still carry gamma (pre-existing, out of scope).

## Handoff

- Uncommitted tree ready for orchestrator commit. Do not edit GOAL.md.
- New reference PNGs added (md5s in MEASUREMENT.md); `beatstreets-gameplay.png` restored
  to its committed md5 after an accidental near-black overwrite during a trace run.

## Critic fixes applied
- ACCEPT; wording corrected: sprites are pixel-identical (PNG gamma/chromaticity
  chunks stripped; RGB data byte-preserved), not "md5-identical".

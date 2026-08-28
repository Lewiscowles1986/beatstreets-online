# CRITIC — 007-controls-gameover-breadth
## Verdict
- ACCEPT — all gates real and passing; asset changes pixel-preserving; references authentic; only minor docs inaccuracies.
## Findings
- [low] MEASUREMENT.md G2 / BUILDER.md: claim status_win/status_lose web sprites are "md5-identical to the Python image", but their md5s differ (web versions chunk-stripped). Pixel data IS identical (verified), so fidelity is unaffected → change wording to "pixel-identical".
- [low] tools/capture_beatstreets_frame.py `--result win`: hook relies on enemies staying non-empty and scroll_offset not reaching max_scroll_offset_x during the single update frame, else next_stage() re-activates outro text and check_won() flips to status_lose. Deterministic at seed 1 (md5 matches) but fragile to game changes → prefer a more robust terminal condition.
- [info] Gamma strip on font sprites affects ALL font-rendering screens (title prompt, stage HUD, intro), not just the gated ones; stage now mixes gamma-corrected (bg/hero/enemy) + raw (HUD font) sprites. Acknowledged; metric improved 0.79→0.73%. Residual divergence, not a blocker.
- [info] Intro HARD ≤2% with 0.00% measured is generous headroom; a regression up to ~2% would still pass. Below the ~7.8% structural-failure signature, so defensible per the GOAL rule.
- [info] intro-entry default `?stolen=2` hardcodes the seed-1 choice; if the Python RNG sequence changes, reference + default must be updated together.
## Fidelity assessment
- All 47 modified PNGs (45 font + status_win/lose) pixel-identical HEAD vs working tree; only gAMA/cHRM/bKGD/tEXt/tIME/pHYs metadata stripped. No asset regression.
- gAMA/cHRM confirmed present on the font/status assets and stripped; browsers honour gAMA — the colour-shift explanation is sound.
- References regenerated via driver: controls 112dbf65…, win 3c3a4554…, lose 829855b8… all match committed md5s. Stage capture unchanged (e0e294bb…), so no behaviour change for existing states.
- Intro stolen-item fix is a real fidelity fix: RNG trace shows seed-1 choice returns index 2 (SHAKESPEARE); entry previously hardcoded index 1. Not a test-only hack.
- e2e gates compare web canvas screenshot vs Python reference (not a self-diff); separate Vite inputs, out of the production bundle. 6/6 pass: title 0.00%, intro 0.00%, stage 0.73%, controls 0.00%, win 0.00%, lose 0.00% — match MEASUREMENT.md.
- vitest 35/35 pass; build clean.
## Required before judge
- none (optional: correct the "md5-identical" wording in MEASUREMENT.md/BUILDER.md to "pixel-identical")

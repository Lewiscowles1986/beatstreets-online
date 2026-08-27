# JUDGE — 001-title-screen-fidelity

## Verdict
- ACCEPT_WITH_CONDITIONS — the title screen faithfully reproduces the Python title state (raw title0/title1, 20-frame swap, centred prompt with the `%`→`xb_a` glyph), precommit passes, and the fidelity gate is legitimate; one calibration condition remains for the next round.

## Authoritative assessment
- Visual (via quantitative pixel analysis — read_image/vision-bridge unavailable): background is identical across all three frames (0.00% diff in corners) → no black-bar/background mismatch. Web render vs regenerated reference: 1.33% >8, 0.00% >30, maxd 9 → essentially pixel-perfect. Python-ref vs regenerated-ref: 12.63% >8, 2.32% >30, maxd 40, per-channel [3.04,2.17,0.11] → a brightness/gamma offset confined to the logo region (bbox y[61-231] x[126-660]); background stays black. Same offset (17.58% >8) vs web render. This is a capture-side artifact, not structural.
- Provenance: regenerated reference is title0 composited on black + prompt glyphs at the Python position (fidelity.spec.ts). title0 is byte-identical to Python title0 (md5 09cba2f7…). Python draw() blits raw title0 with no brightness filter → the regenerated reference is a legitimate reconstruction of deterministic Python output, NOT circular (not from the web render).
- precommit: PASS (exit code 0; typecheck + lint + vitest + build + engine build). dist/title.html built.
- Production bundle: title.html is a separate Vite input; App.tsx has no `?view=title` route; no `view=title` in any dist JS bundle → genuinely out of the production bundle.
- Fidelity gate: 2% at threshold 8 vs the regenerated reference is legitimate and tight (maxd 9, 0.00% >30). The regenerated reference being 12.63% off the true python frame is because the python-ref screenshot carries a capture-side brightness offset; the regenerated reference is the more accurate ground truth.

## Conditions for acceptance
1. Next round: characterise and compensate the python-ref brightness/gamma offset (red/green ~+3, blue ~0, logo-only) OR capture a fresh pygame screenshot under a controlled/neutral display profile, and re-baseline the reference so the gate is measured against a validated true frame.

## Polished state
- TitleScreen renders title0/title1 full-frame centred at 800×480 with 20-frame alternation (titleLogoName = total_frames//20%2), matching Python draw().
- Prompt "PRESS [A] OR Z" drawn centred at y=430 with the green xb_a glyph inline via drawGlyphText (Python draw_text), data-driven from config (TITLE_PROMPT, TITLE_PROMPT_Y_OFFSET, TITLE_LOGO_SWAP_FRAMES).
- Reusable fidelity check e2e/fidelity.spec.ts (title + gameplay) with a documented threshold-8/≤2% in-browser pixel diff; dedicated title.html/title-entry.tsx e2e entry kept out of the production bundle.
- Pure, unit-tested helpers (title.ts, glyph-text.ts) and defaulted config fields keep the engine fixtures clean.

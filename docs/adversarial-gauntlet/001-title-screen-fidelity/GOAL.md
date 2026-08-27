# Iteration 001 — Title screen: 1:1 fidelity with the Python original

## Context (ground truth)

- Python reference: `vol2/beatstreets/beatstreets.py` (repo root), 800×480 window.
- Reference frame: `docs/screenshots/beatstreets-title.png` (parent repo) — full logo + press prompt.
- Web app: `beatstreets-web/` (its own git repo, `main`, husky pre-commit = `npm run precommit`).

## Python title-screen behaviour (extracted from `beatstreets.py` `draw()`, State.TITLE)

1. Logo: `images.title0` when `total_frames // 20 % 2 == 0`, else `images.title1`
   (i.e. swaps every 20 frames), blitted at
   `(WIDTH//2 - logo_w//2, HEIGHT//2 - logo_h//2)` → centred on 800×480.
2. Prompt: `draw_text(f"PRESS {SPECIAL_FONT_SYMBOLS['xb_a']} OR Z", WIDTH//2, HEIGHT - 50, centre=True)`
   — the `%` glyph is replaced by the green `xb_a` A-button image inline in the text.
3. No background fill on title state (image covers canvas).

## Goal (builder must satisfy ALL)

- [ ] G1. Title screen renders the `title0`/`title1` art full-frame and centred on a
      800×480 logical canvas — no cropping, no stretching, no black bars other than
      what the art itself contains; correct 20-frame alternation between title0/title1.
- [ ] G2. "PRESS [A] OR Z" prompt drawn centred horizontally at y = 430/480 with the
      green A-button glyph inline, matching reference typography/colour/position.
- [ ] G3. A Playwright screenshot of the web title at exactly 800×480 visually matches
      `docs/screenshots/beatstreets-title.png` (compare with a pixel-diff tool; log the
      metric in BUILDER.md; target: no structural differences visible side-by-side).
- [ ] G4. `npm run precommit` (typecheck + lint + test + build) passes.
- [ ] G5. A reusable fidelity check exists: `e2e/fidelity.spec.ts` capturing title + at
      least one gameplay frame at 800×480, compared against reference images with a
      documented diff metric, so future rounds can re-verify.

## Out of scope this round

- Gameplay logic changes, controls screen, audio, WebGL pipeline changes.

## Definition of done

Working tree ready to commit in `beatstreets-web` (orchestrator commits), with
BUILDER.md distilled (≤60 lines, machine-readable: files changed, verification metric,
screenshot paths, known gaps).

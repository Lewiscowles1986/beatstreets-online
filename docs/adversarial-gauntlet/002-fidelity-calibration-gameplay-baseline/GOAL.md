# Iteration 002 — Fidelity calibration + gameplay scene baseline

## Carry-in condition (from JUDGE 001, condition 1)

- Python reference frame `docs/screenshots/beatstreets-title.png` carries a capture-side
  brightness offset vs the raw assets: mean per-channel ≈ [+3.04, +2.17, +0.11], confined
  to the logo bbox (y 61–231, x 126–660), background unaffected.
- Decide and implement ONE of: (a) capture a fresh reference from an actual pygame run
  (`python vol2/beatstreets/beatstreets.py` screenshot harness) under a neutral profile,
  or (b) document + compensate the offset in the fidelity tooling. The gate must measure
  against a VALIDATED true frame afterwards.

## Goal (builder must satisfy ALL)

- [ ] G1. Reference calibration done per above; e2e/reference holds the validated frame
      with provenance documented (BUILDER.md records how it was produced + md5).
- [ ] G2. Tighten the fidelity gate: with the calibrated reference, the title diff at
      threshold 8 must be ≤1% of pixels; document the final number.
- [ ] G3. Gameplay fidelity baseline: capture the web gameplay frame at 800×480 and the
      matching Python frame (stage 1 start: HUD, players, first enemies, background),
      then produce a side-by-side + diff report. Fix the TOP structural divergences only
      (positions/scales/HUD layout) — no gameplay-logic rewrites.
- [ ] G4. A maintenance doc `docs/FIDELITY.md` in beatstreets-web: how to regenerate
      references from the Python game, how to run the fidelity gate, how to interpret
      the metric, and how new Python data edits flow into the web app (data-sync path).
- [ ] G5. `npm run precommit` passes.

## Out of scope

- New gameplay features, controls screen, audio changes, WebGL renderer rewrite.

## Definition of done

Uncommitted tree ready for orchestrator commit; BUILDER.md ≤60 lines updated with
calibration result, diff numbers, and handoff notes.

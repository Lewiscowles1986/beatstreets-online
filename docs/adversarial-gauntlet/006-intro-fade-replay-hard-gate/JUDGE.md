# JUDGE — 006-intro-fade-replay-hard-gate

## Verdict
- ACCEPT — the loop's central goal (bit-aligned 184-draw captures + honest HARD stage gate) is implemented, verified, and reproducible; both critic fixes are applied.

## Authoritative assessment
- Spot-verified: `e2e/reference/beatstreets-stage-trace.txt` exists (186 lines = 184 draws + 2 header); recomputing the test's numeric-sequence SHA-256 from the trace yields `05f25a…67a1` exactly (183 numeric = 84 ctor + 99 teletype; +1 choice = 184). The pinned hash is reproducible, not a frozen literal.
- Freeze neutrality documented: `e2e/fidelity.spec.ts` states 344/345/346 all render identical 0.79% frames (sprites hold pose) and pins 345 (= 255 fade + 90 live); the 344/345 off-by-one is immaterial.
- GOAL.md erratum present (lines 15–18): 184 = 85 ctor + 99 teletype; the 005-era "+51 combat" is corrected as an instrumentation misattribution.
- G1: single Game build on the capture path — `StrictMode` removed only from `stage-entry.tsx`; production `main.tsx` keeps it; `jumpToStage` remains only in the cheat path (GameCanvas:444), not the capture flow; intro teletype plays all 99 `randint(0,0)` draws; fade satisfied via the GOAL-permitted 255-frame timed window (draws no RNG).
- G2: web = python = 184 draws at freeze; per-draw site/sequence (99 teletype) and sequence SHA-256 asserted and trace-reproducible.
- G3: stage metric 0.79% (3031/384000), rock-stable; HARD ≤1.5% = 2× headroom, an order of magnitude below structural-failure signatures (missing HUD ≈ +12%, flipped sprites ≈ +40%). Honest, not chosen-to-pass.
- G4: title 0.10% (HARD ≤1%), orientation green, sound-parity extended (6 tests incl. G4 full-stream), precommit green. Reference PNGs untouched (`git diff HEAD -- e2e/reference/` empty).
- G5: FIDELITY §4, MEASUREMENT, BUILDER consistent and updated.

## Conditions for acceptance (if any)
- None. Both critic-required fixes (committed trace + generator; freeze off-by-one + GOAL erratum) are applied and verified.

## Polished state
- Bit-aligned gameplay captures: web and python consume the identical 184-draw RNG stream by the freeze point, with a committed, reproducible trace.
- HARD stage gate live at ≤1.5% against an aligned 0.79% metric — a real structure break cannot hide under it.
- Single-Game build on the capture path with production StrictMode untouched; intro/fade replay mirrors the driver.
- Remaining fidelity surfaces (intro 7.82% informational, title-logo stretch, controls/game-over/HUD) are scoped for the next round, not blockers.

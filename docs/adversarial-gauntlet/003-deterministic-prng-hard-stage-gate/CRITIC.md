# CRITIC — 003-deterministic-prng-hard-stage-gate

## Verdict
- ACCEPT_WITH_FIXES — the injectable seeded PRNG (G1/G2) is correct and complete, but the stage gate was promoted to HARD despite the GOAL's explicit "keep informational if RNG call-order divergences remain" condition, and the ≤10% threshold is too loose to verify state alignment.

## Findings
- [high] e2e/fidelity.spec.ts + MEASUREMENT.md: G3 hard-gate promotion contradicts the GOAL. G3 says keep the gate INFORMATIONAL if RNG call-order divergences remain; the builder's own docs admit "the web engine consumes RNG in a different order and with a different generator (mulberry32 vs CPython Mersenne Twister)". → Demote to informational and document the exact divergence points, or achieve true state alignment (match Python's generator + call order) before promoting.
- [medium] e2e/fidelity.spec.ts: the ≤10% threshold won't catch a single-extra-enemy misalignment (~1% of pixels); the gate only fails on gross divergence (≈3+ enemies or a different scene). → Tighten, or state plainly that the gate verifies gross alignment only.
- [medium] e2e/fidelity.spec.ts: the bimodal 3.51%/7.07% contradicts the "near-frame-exact / ≤1 frame residual" claim; the screenshot races the rAF loop after `waitForFunction` resolves, landing on two discrete states (a spawn/attack boundary). → Freeze game update at the target timer before screenshotting.
- [low] packages/engine/src/core/math.ts: dead `randInt`/`choice` still default to `Math.random` and are re-exported via index.ts — a latent bare-RNG surface outside the systemRng wrapper. → Remove or route through `Rng`.
- [low] e2e/fidelity.spec.ts: intro-skip uses a fixed 200 ms wall-clock wait; the Python driver discovers the skip frame at runtime. On a slow machine the Space press can land before `textActive`, breaking the timer reset and the whole capture. → Wait on a `textActive` data attribute instead.
- [low] MEASUREMENT.md/BUILDER.md: "69 passed" is the combined engine+root count; the root `vitest run` is 29. Clarify the split.

## Fidelity assessment
- PRNG (mulberry32) is correct: `randint` inclusive, `choice` one-draw, determinism pinned by unit tests (same seed ⇒ same sequence; different seeds differ). ✓
- All live engine RNG call sites route through `game.rng`; no bare `Math.random` in live paths (dead math.ts excepted). ✓
- Reference image unchanged from 002 (git log 193dc0c; `git diff HEAD e2e/reference` empty) — no circularity. ✓
- Production path unchanged when no seed (`rng: undefined` → `systemRng`). ✓
- vitest green (29 root passed). ✓
- States are NOT actually aligned (different generator + call order); "state-aligned" is generous — the diff is 3.5–7%, not near-0.

## Required before judge
1. Reconcile the hard-gate promotion with G3's "keep informational if call-order divergences remain" — demote to informational with exact divergence points, or achieve true state alignment.
2. Make the capture frame-exact (freeze update at the target timer) or document the bimodal residual honestly.
3. Remove or route the dead `Math.random` in core/math.ts.

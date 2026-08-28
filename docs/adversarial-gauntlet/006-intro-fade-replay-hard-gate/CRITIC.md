# CRITIC — 006-intro-fade-replay-hard-gate

## Verdict
- ACCEPT_WITH_FIXES — the single-Game intro/fade replay, 184-draw bit-alignment, and honest HARD stage gate are genuinely implemented and verified; the blockers are hash provenance and a stale GOAL ground-truth.

## Findings
- [MED] `src/game/sound-parity.test.ts`: the bit-exactness SHA-256 (`05f25a…`) is a frozen literal with no in-repo generator. No `--trace-rng` trace is committed, and `tools/capture_beatstreets_frame.py` prints `rng frame= i= site args -> value`, NOT the hash's `kind(args)=value` format — so the constant is unreproducible without manual reinterpretation. Carry-over from 005 CRITIC [LOW] that 006 escalated into its headline claim. → Commit the raw python trace + a reformat-and-hash script; or pin a trace file and assert per-draw site/sequence against it.
- [LOW] `e2e/fidelity.spec.ts` / `stage.html` freeze target: web freezes at post-intro `timer=345`, but the python driver breaks at `gameplay_frames>=90` once `timer>=255` → python reference is captured at `timer=344` (off-by-one). Metric is stable at 0.79% and the idle hero absorbs it, but "frame-flow is now aligned" overstates it. → Verify and state the exact freeze timer of the reference, or align freeze=344.
- [LOW] `GOAL.md` ground-truth still asserts "184 = 85 ctor + 99 intro/fade + 51 live-combat" (sums to 235) — internally false and left uncorrected (builder's "don't edit GOAL.md"). MEASUREMENT/BUILDER/FIDELITY correctly re-attribute to 85+99; GOAL is stale. → Judge should reconcile the ground-truth decomposition.
- [LOW] `Host.startPlay` reuse of the ctor Game (first play) is a subtle production-behavior change (previously always built a fresh Game). Benign for the unseeded path but undocumented as a production change; confirm no title-scene mutation leaks into the reused Game.

## Fidelity assessment
- Single Game build verified: `StrictMode` removed only from `stage-entry.tsx`; production `src/main.tsx`/`App` keep StrictMode and are unchanged; `jumpToStage` fully gone from the capture path (remains only for stage-select cheat/other tests).
- G1: intro teletype plays out (99 `randint(0,0)` draws); fade satisfied via the GOAL-permitted equivalent 255-frame timed window (fade draws no RNG, alpha=0 at freeze).
- G2: count (184), per-draw site/sequence (99 teletype), and SHA-256 all asserted; the 84-ctor-numeric + 99-teletype hash matches the constant (self-consistent).
- G3: HARD ≤1.5% from aligned 0.79%; derivation (2× headroom, ~12%/40% structural signatures well above) is documented and would catch missing-HUD/flipped-sprite regressions. Not chosen-to-pass.
- Freeze guard `!textActive` prevents intro-phase freezing; `data-intro-complete` matches the driver's `len(displayed)>=len(current)` exactly. Engine skip-on-any-press matches python.
- Orientation spec now skips the intro (3rd Space) → captures the live idle hero in both renderers; not weakened.
- `npx vitest run` green (35 web incl. 6 sound-parity); reference PNGs untouched (`git diff HEAD -- e2e/reference/` empty; only e2e/screenshots regenerated). FIDELITY §4 / MEASUREMENT / BUILDER consistent.

## Required before judge
1. Commit the `--trace-rng` trace + a generator so the SHA-256 (and the 184/99 counts) are reproducible, not a frozen literal.
2. Resolve the freeze-timer off-by-one (reference vs web 344/345) and reconcile GOAL.md's wrong ground-truth decomposition.

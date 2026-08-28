# MEASUREMENT — 003-deterministic-prng-hard-stage-gate

Metrics are Playwright in-browser per-pixel diffs, channel threshold 8/255, 800×480,
vs the Python references. Stage capture is now deterministic (seeded PRNG, fixed frame
count) via the `stage.html?seed=1` e2e entry.

## Metrics (before → after)

| Capture | Before (002 final) | After (003) | Assertion |
|---|---|---|---|
| Title | 0.10% (396/384000) | 0.10% (396/384000) | **hard** ≤1% (unchanged, still passing) |
| Intro | 7.82% (30044/384000) | 7.82% (30044/384000) | informational (unchanged) |
| Stage | 23.24% (was 87.15% pre-fix, 002) | **3.51%** (13464/384000) — bimodal 3.51%/7.07% across runs | **hard** ≤10% (promoted from informational) |

## Stage gate: informational → HARD

- **Before (002):** the engine used bare `Math.random()`, so the web could not replay
  the Python RNG sequence; the stage test captured an unaligned frame and the gate was
  informational (23.24%).
- **After (003):** the engine takes an injectable seeded PRNG (`core/prng.ts`,
  mulberry32), the `stage.html?seed=1` entry drives the game deterministically
  (title→controls→play, skip intro, 255-frame fade, 90 live-gameplay frames), and the
  stage diff drops to **3.51%** — near-intro levels. The gate is now **HARD at ≤10%**.
- **Residual (documented, not a render bug):** the web engine consumes RNG in a
  different order and with a different generator (mulberry32 vs CPython Mersenne
  Twister) than Python, and the browser rAF loop is not frame-exact. Observed diffs
  are bimodal (3.51% / 7.07%) depending on the exact frame the capture lands on; both
  are well under the 10% hard threshold. See docs/FIDELITY.md §4.

## Verification

- `npm test` (engine vitest incl. new `core/prng.test.ts`): 69 passed.
- `npm run precommit` (typecheck + lint + test + build + chromium e2e fidelity +
  orientation): green.

## Critic fixes applied (final)

- Frame-exact freeze (GameCanvas freezeAtTimer / stage.html?freeze=345) eliminates the
  rAF jitter: stage metric is stable at **3.53%** (13554/384000) across repeat runs
  (was bimodal 3.51%/7.07%).
- Stage gate demoted to informational per G3's contract (RNG sequence is not CPython's;
  states structurally but not bit-aligned). Divergence points documented in
  fidelity.spec.ts + docs/FIDELITY.md §4. Round-004 path to a hard gate: replicate
  CPython MT19937 getrandbits/_randbelow in core/prng.ts.
- No bare Math.random remains in the engine (core/math.ts defaults removed; all draws
  flow through the injectable Rng).
- Final: title 0.10% (hard ≤1%) | intro 7.82% (informational) | stage 3.53%
  (informational, deterministic). precommit exit 0.

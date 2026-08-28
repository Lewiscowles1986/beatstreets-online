# BUILDER — 004-cpython-prng-hard-stage-gate

## Changed per-file

- `packages/engine/src/core/prng.ts`: added `cpythonRng(seed)` — a bit-identical
  reimplementation of CPython 3.12's `random` module: MT19937 (624-word state,
  tempering, twist via `Math.imul` for exact mod-2^32 products), `random()` consuming
  TWO genrand draws, `getrandbits` (k<=32 single word; k>32 multi-word), `_randbelow`
  with rejection loops, `randint`/`choice`, and `random_seed` int seeding (abs value →
  32-bit little-endian words → `init_by_array`, empty key → `[0]`). `seededRng` is now
  an alias for `cpythonRng`; `systemRng` unchanged.
- `packages/engine/src/core/prng.test.ts`: pinned `cpythonRng` to real CPython output
  (`random.seed(1)` sequential random×5 / randint(0,9)×10 / choice×10 / randint(0,1)×20),
  plus single-bit fast path, negative-seed `abs`, seed-0 empty-key, large-randint and
  determinism edge cases. Generator command documented in the file header.
- `packages/engine/src/engine/enemies.ts`: scooterboy accel `random()<1/30` →
  `randint(0,30)===0` (matches python `randint(0,30)==0`).
- `packages/engine/src/engine/fighter.ts`: die-animation `random()<0.5` →
  `randint(0,1)===0` (matches python `randint(0,1)==0`).
- `packages/engine/src/engine/player.ts`: kick/highkick `random()<0.5?'kick':'highkick'`
  → `rng.choice(['kick','highkick'])` (matches python `choice(...)`).
- `e2e/fidelity.spec.ts`: stage test kept INFORMATIONAL; comment updated to document the
  actual divergence (sound-variant draws, intro/colour order, spawn timing) now that the
  PRNG itself is bit-accurate.
- `docs/FIDELITY.md` (§4 rewritten), `docs/adversarial-gauntlet/004-.../MEASUREMENT.md`
  (new), `BUILDER.md` (this file).

## Verification

- `npm run test:engine` — 76 passed (incl. 17 `core/prng.test.ts`, CPython-pinned).
- `npm test` — 76 engine + 29 web vitest, all green.
- `npm run typecheck` + `npm run lint` — clean (one pre-existing warning in GameCanvas).
- `npm run precommit` — green (typecheck, lint, test, build, fidelity + game-canvas e2e).

## Fidelity notes

- A single `cpythonRng` draw is bit-identical to CPython (MT19937 cross-check pinned in
  the unit tests — the acceptance bar, not visual inspection).
- The stage state is NOT bit-aligned: instrumented web vs python draw counts at the
  freeze point are 3 vs 184. Python advances the shared RNG on every sound
  (`get_sound → randint(0, count-1)`; off-screen enemy hits → many variant draws); the
  web audio never draws from `rng`. Intro stolen-item vs colour-variant order and the
  web's skipped intro/fade also differ.
- The stage metric is 3.50% (seed 1), essentially unchanged from the 3.53% mulberry32
  baseline, confirming the residual is draw-order/state divergence, not PRNG correctness.
- Per G3's contract (metric did NOT drop, states misaligned), the stage gate stays
  INFORMATIONAL rather than a loose hard threshold. Title 0.10% ≤1% green; intro 7.82%
  informational.

## Handoff

- Uncommitted tree ready for orchestrator commit. Do not edit GOAL.md.
- No reference PNG was regenerated (web/python stage-1 configs unchanged, alignment not
  achieved). The committed `beatstreets-gameplay-stage.png` still matches the current
  Python build; regenerate ONLY with the driver if the Python game changes.
- Next round: align the web's per-frame RNG consumption with Python's (sound-variant
  draws, intro/colour order, spawn timing) before promoting the stage gate to HARD.

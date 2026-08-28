# JUDGE — 003-deterministic-prng-hard-stage-gate

## Verdict
- ACCEPT_WITH_CONDITIONS — the injectable seeded PRNG, frame-exact capture, and honest
  gate demotion are all genuinely in the tree and correct; one documentation file
  (FIDELITY.md) still claims a HARD stage gate that the code does not enforce.

## Authoritative assessment
- Critic item 1 (demote hard gate): RESOLVED in code. `e2e/fidelity.spec.ts` stage test
  has NO assertion — it logs the metric and writes the side-by-side; divergence points
  (PRNG algorithm, draw order, wall-clock pre-freeze press) are documented in the test
  comment. Demotion is the honest call: web uses mulberry32, not CPython MT19937, and
  per-frame draw order differs, so states are structurally but not bit-aligned.
- Critic item 2 (frame-exact): RESOLVED. `GameCanvas.freezeAtTimer` stops the rAF loop
  the tick the game timer reaches the target and sets `data-frozen`; `stage.html?seed=1&
  freeze=345` freezes at timer 345. `freezeAtTimer` defaults to `undefined`, so the
  production path (no freeze prop) never freezes — no behaviour change. Sound.
- Critic item 3 (bare Math.random): RESOLVED. `core/math.ts` `randInt`/`choice` now take
  a required `rng`; the only `Math.random` in engine source is inside `systemRng`
  (prng.ts). All live draws route through `game.rng` (enemy/fighter/player/weapons/enemies).
- Circularity: `git diff HEAD -- e2e/reference/` is empty and the stage reference md5
  (`e0e294bb…`) is identical to the 002 commit (193dc0c) — reference NOT regenerated
  toward the web.
- G1/G2/G4: mulberry32 `randint` inclusive + `choice` one-draw, determinism pinned by 10
  new unit tests; `seed` prop + `?seed=` path mirrors the Python driver; title hard ≤1%
  and orientation green; engine vitest 69 passed (verified live).
- G5: FIDELITY.md was updated with the seeded workflow, but §2 table and §4 still state
  the stage gate is "HARD ≤10%" — contradicting the code (informational) and BUILDER.md/
  MEASUREMENT.md. Documentation is internally inconsistent.
- Branch: work sits on `ci/fix-canvas-sizing-flake` (carries dd0573b); `origin/main` adds
  only merge 986db0a; HEAD is 1 ahead — orchestrator rebase post-commit is correct.

## Conditions for acceptance (if any)
1. Fix `docs/FIDELITY.md` §2 table + §4 to state the stage gate is INFORMATIONAL (matching
   the code), and note the round-004 path to a hard gate (replicate CPython MT19937
   getrandbits/_randbelow in core/prng.ts). No code change required.

## Polished state
- Injectable seeded PRNG (`core/prng.ts`, mulberry32) with documented randint/choice
  mapping; default `systemRng` keeps unseeded behaviour unchanged.
- Frame-exact stage capture via `freezeAtTimer`/`data-frozen`; stage metric stable at
  3.53% (13554/384000), deterministic across runs.
- No bare `Math.random` in engine outside `systemRng`; 69 engine + 29 root vitest green;
  precommit exit 0; reference PNGs untouched (no circularity).

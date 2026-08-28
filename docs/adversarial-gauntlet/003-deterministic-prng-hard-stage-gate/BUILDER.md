# BUILDER — 003-deterministic-prng-hard-stage-gate

## Changed per-file

- `packages/engine/src/core/prng.ts` (new): `Rng` interface (`random`/`randint`/`choice`),
  `seededRng(seed)` (mulberry32), `systemRng` (wraps `Math.random`). Documented mapping:
  `randint` = `floor(random()*(max-min+1))+min` (inclusive), `choice` = `seq[floor(random()*len)]`,
  each one draw.
- `packages/engine/src/core/prng.test.ts` (new): determinism, randint inclusivity/bounds,
  choice behaviour, systemRng passthrough.
- `packages/engine/src/engine/game.ts`: `Game` ctor takes `opts.rng` (default `systemRng`);
  `rng` field; stolen-item draw via `this.rng.choice`.
- `packages/engine/src/engine/fighter.ts`: `GameContext.rng`; die-animation + hitFrame draws
  via `this.game.rng`.
- `packages/engine/src/engine/player.ts`: kick/highkick draw via `this.game.rng`.
- `packages/engine/src/engine/enemies.ts`: colour variants, scooterboy, portal spawn via
  `this.game.rng`.
- `packages/engine/src/engine/enemy.ts`: decision/attack draws via `this.game.rng`.
- `packages/engine/src/engine/weapons.ts`: stick/chain durability via `this.game.rng`;
  removed local `randInt`.
- `packages/engine/src/index.ts`: export `./core/prng`.
- `src/components/GameCanvas.tsx`: `seed` prop → `Host` → `newGame()` passes `seededRng(seed)`;
  root div exposes `data-timer` for frame-exact e2e waits.
- `stage.html` + `src/stage-entry.tsx` (new): seeded e2e entry reading `?seed=`.
- `vite.config.ts`: add `stage` build input.
- `e2e/fidelity.spec.ts`: stage test rewritten to drive `stage.html?seed=1` (title→controls→
  play, skip intro, 255-frame fade, 90 gameplay frames via `data-timer>=345`); gate promoted
  to HARD ≤10%.
- `docs/FIDELITY.md`, `docs/adversarial-gauntlet/003-.../MEASUREMENT.md` (new).

## Verification

- `npm test` — engine vitest incl. new `core/prng.test.ts`: 69 passed.
- `npm run precommit` — typecheck + lint + test + build + chromium e2e (fidelity + orientation,
  workers=1): green.
- Stage diff (seed=1): 3.51% (bimodal 3.51%/7.07%), HARD ≤10%. Title 0.10% ≤1%. Intro 7.82%
  informational.

## Fidelity notes

- Determinism: same seed ⇒ same RNG sequence, any platform. Not bit-identical to CPython's
  Mersenne Twister (documented, allowed by G1).
- Web RNG call order differs from Python's, so a web capture at `seed` is not pixel-identical
  to a Python capture at the same seed; the stage gate is HARD at ≤10% (near-intro levels),
  not pixel-exact. Residual is engine-state divergence, not a render bug.
- Browser rAF loop is not frame-exact; the stage capture lands within ~1 frame of the target
  (game timer ≥ 345), causing the small 3.51%/7.07% bimodal variance.

## Handoff

- Uncommitted tree ready for orchestrator commit. Do not edit GOAL.md.
- To regenerate the Python stage reference: `./.venv/bin/python tools/capture_beatstreets_frame.py
  --state play --skip-intro --frames-to-play 90 --seed 1` (parent repo).

## Critic fixes applied
- Hard stage gate DEMOTED to informational per G3's contract: web RNG (mulberry32) is not
  CPython MT19937 and per-frame draw order differs, so states are structurally (not
  bit-) aligned; exact divergence points documented in fidelity.spec.ts + FIDELITY.md.
  A hard gate becomes possible by replicating CPython getrandbits/_randbelow (round 004).
- Capture made FRAME-EXACT: GameCanvas freezeAtTimer stops the rAF loop at game timer
  345 (stage.html?seed=1&freeze=345; data-frozen attribute) — bimodality eliminated,
  metric stable at 3.53% (13554/384000) across repeat runs.
- core/math.ts randInt/choice: bare Math.random defaults removed (rng is required);
  engine typecheck + build green; no bare Math.random left outside systemRng.
- precommit green after fixes (69 engine tests + 29 vitest + 5 e2e).

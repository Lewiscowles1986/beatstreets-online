# JUDGE — 004-cpython-prng-hard-stage-gate

## Verdict
- ACCEPT — G1–G5 satisfied; keeping the stage gate INFORMATIONAL over unaligned
  states (web 3 draws vs python 184) is the exact honest outcome G3 requires, and the
  round delivered durable bit-exact MT19937 replay capability plus a documented next step.

## Authoritative assessment
- CPython-pinned sequences verified from the parent venv: the test's single
  `random.seed(1)` stream — random×5 / randint(0,9)×10 / choice('abcdefghij')×10 /
  randint(0,1)×20 — matches my live CPython run byte-for-byte; standalone randint(0,1)×20
  from draw 0, `seed(0)→0.84442…`, and `seed(-1)==seed(1)` all confirmed. 17 prng + 76
  engine vitest green (re-run here).
- `cpythonRng` is a faithful MT19937: two-genrand `random()`, getrandbits k<=32,
  `_randbelow` rejection loops, init_by_array int seeding, empty-key `[0]`, abs on
  negatives — `seededRng` is a true alias (prng.ts:179).
- Draw-order fixes mirror python exactly: scooterboy `randint(0,30)==0` (line 1295,
  web lacks the `on_screen()` guard — documented structural gap), fighter die
  `randint(0,1)==0` (685), kick `choice` (929). Each keeps 1-draw consumption.
- The 184-vs-3 divergence is credible and confirmed in python source: `get_sound`
  (2242) draws `randint(0,count-1)` for every variant, incl. off-screen hits; colour_variant
  `randint(0,2)` per enemy; web audio never draws rng (audio stub).
- Stage 3.50% vs 3.53% baseline unchanged → residual is draw-order/state divergence,
  NOT PRNG correctness. Promoting to HARD at ~3.5% would violate G3's "no loose threshold."
- Reference PNGs untouched (`git diff HEAD -- e2e/reference/` empty); only e2e/screenshots/
  artifacts regenerated. Precommit green per orchestrator; docs/FIDELITY + MEASUREMENT +
  BUILDER tell one consistent story. No regressions (title 0.10% ≤1%, intro 7.82%).

## Conditions for acceptance (if any)
- none required this round. Next round conditions:
  1. Route web audio's sound-variant selection through `game.rng` mirroring python
     `get_sound → randint(0,count-1)` — including sounds triggered by off-screen
     entities — and record a draw-trace so web==python draw counts align at freeze.
  2. Align intro/colour-variant draw ORDER (web stolen-item first vs python colour
     first) and replay the intro text + 255-frame fade so per-frame tick ordering matches.
  3. Re-measure with aligned states; promote stage gate to HARD only on an honest,
     aligned-state metric (target ~intro 7.8% or better, not a picked threshold).

## Polished state
- Bit-exact CPython MT19937 PRNG (`cpythonRng`/`seededRng`) with CPython-pinned unit
  tests — the durable core for bit-aligned replay of any future capture.
- Three mechanical draw-order fixes matching python semantics; all residual divergences
  documented with the specific first-diverging consumer (sound-variant draws).
- Stage gate honestly kept INFORMATIONAL with instrumented justification (3 vs 184);
  title gate hard green; no reference assets touched; full precommit green.
- Next round is well-scoped: route audio through game.rng + align intro/colour order.

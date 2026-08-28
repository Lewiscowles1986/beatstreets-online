# CRITIC — 004-cpython-prng-hard-stage-gate

## Verdict
- ACCEPT — the MT19937 reimplementation is bit-correct (empirically pinned to real
  CPython), the three draw-order fixes mirror Python semantics exactly, and keeping the
  stage gate INFORMATIONAL over unaligned states is the honest call G3 requires.

## Findings
- [low] packages/engine/src/core/prng.ts (`getrandbits`, k>32): `result =
  result*4294967296 + r` accumulates in a JS double, losing exactness beyond 2^53 and
  diverging from CPython for n>2^32. Unreachable in this game (all ranges ≤ small) and
  untested. → Keep the acknowledged limitation; add a `k<=32` guard/comment so a future
  large-`randint` can't silently misalign.
- [low] prng.ts (`seedToKey`): `Math.trunc` on a non-integer seed diverges from CPython
  (which seeds floats via the float-bytes path). Only integer seeds are used; harmless
  now. → Document the integer-seed contract at the Rng surface.
- [info] prng.ts (`randbelow(0)`): empty-`choice` or `randint(a,a-1)` would loop forever
  on `getrandbits(0)=0 >= 0`. Unreachable in-game. → Optional `if (n<=0)` guard.
- [info] prng.test.ts "single-bit fast path" label is a misnomer: `randint(0,1)` uses
  `bit_length(2)=2` with ~50% rejection, not a fast path. Values verified correct
  against CPython. → Rename for accuracy (no behavioural impact).
- [info] enemies.ts scooterboy still lacks python's `self.on_screen()` guard before
  `randint(0,30)`, so the web draws every frame the python only draws when on-screen.
  Pre-existing structural gap, out of scope. → Fold into the round's divergence list.
- [info] Routing sound-variant draws through `game.rng` (the flagged next step) is
  NECESSARY but NOT SUFFICIENT for bit-alignment: `playSound` currently records only
  names (game.ts:109), and the web's `jumpToStage` skips the intro text + 255-frame fade
  the python runs, so frame-tick/draw ordering still diverges at the freeze point.
  → Treat sound routing as step 1 of a multi-part alignment (intro/fade replay next).

## Fidelity assessment
- `random.seed(1)` sequential random×5 / randint(0,9)×10 / choice×10 / randint(0,1)×20
  regenerated here from real CPython; the test's pinned sequences match exactly, and the
  live `vitest run packages/engine` shows 76 passed (incl. all 17 prng tests).
- `random.seed(0)`→0.8444218515250481 and `random.seed(-1)`==`random.seed(1)` verified
  against CPython; empty-key `[0]` and abs-seeding paths are correct.
- random() consumes exactly two genrand draws; init_by_array loops match `_randommodule.c`.
- Draw-order fixes: scooterboy `randint(0,30)==0`, fighter-die `randint(0,1)==0`, player
  kick `choice(2-elements)` — all mirror python lines 1295/685/929 and each preserves a
  1-draw consumption identical to python (no behaviour change beyond RNG semantics).
- get_sound (python 2242) draws `randint(0,count-1)` eagerly → the 184-vs-3 draw-count
  claim is credible; web audio never draws from rng (audio.ts is a no-op stub).
- Stage 3.50% vs 3.53% baseline confirms residual is draw-order, not PRNG correctness;
  keeping INFORMATIONAL matches G3's "don't pick a loose threshold" contract.
- Reference PNGs untouched (`git diff HEAD -- e2e/reference/` empty); docs/FIDELITY.md,
  MEASUREMENT.md, BUILDER.md tell one consistent story. Web vitest 29 green.

## Required before judge
1. none

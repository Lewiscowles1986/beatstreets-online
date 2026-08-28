# MEASUREMENT — 004-cpython-prng-hard-stage-gate

## Before (iteration 003, mulberry32 PRNG)

| Gate | Metric | Status |
|---|---|---|
| title (`beatstreets-title.png`, seed 1) | 0.10% | HARD ≤1% |
| intro (`beatstreets-gameplay.png`, seed 1) | 7.82% | informational |
| stage 1 (`beatstreets-gameplay-stage.png`, seed 1, freeze=345) | 3.53% (13554/384000) | informational |

Baseline note: the stage metric was already a structural (not bit-) match — both
captures show the same road/background layout, but entity states were unaligned because
the web used mulberry32 (not CPython MT19937) and consumed draws in a different order.

## After (iteration 004, CPython-accurate PRNG)

`seededRng` is now `cpythonRng` (bit-identical to CPython 3.12's `random` for a single
draw — verified by `core/prng.test.ts` pinned to real CPython output). Same gates, same
capture inputs:

| Gate | Metric | Status |
|---|---|---|
| title (`beatstreets-title.png`, seed 1) | 0.10% | HARD ≤1% |
| intro (`beatstreets-gameplay.png`, seed 1) | 7.82% | informational |
| stage 1 (`beatstreets-gameplay-stage.png`, seed 1, freeze=345) | **3.50%** (13428/384000) | **informational** |

Stage diff by seed (web vs python reference, same frame-exact freeze):
`seed 1 → 3.50%`, `seed 2 → 3.53%`, `seed 3 → 3.50%`.

## Why the stage did NOT reach a hard gate (derivation)

Swapping the PRNG from mulberry32 to CPython MT19937 moved the stage metric by only
0.03pp (3.53 → 3.50). Instrumenting both sides at the freeze point showed why:

- **Python draws (measured, seed 1, to the capture point): 184.** Dominated by
  `get_sound → randint(0, count-1)` — the off-screen stage-1 `EnemyVax` beating the
  idle player fires many hit-sound variant draws (74× `randint(0,2)`) plus count-1
  sound/teletype draws (99× `randint(0,0)`), with the intro stolen-item `choice` and
  enemy `colour_variant` draws in that stream.
- **Web draws (measured, seed 1, to the same freeze point): 3.** Two intro
  `choice(stolen_items)` + one `randint(0,2)` colour-variant for the single enemy. The
  web audio system never draws from `rng`, and the web's `jumpToStage` skips the intro
  text + 255-frame fade the Python driver runs, so the per-frame entity/event ordering
  differs.

Conclusion: the entity states are NOT bit-aligned. The web and python stage-1 configs
both contain a single `EnemyVax@(1000,400)`, but the RNG consumption order/count differs
(sound draws, intro order, spawn timing). The 3.50% metric is a structural artifact, not
an aligned-state measurement.

## Threshold decision

Promoting the stage gate to HARD with a ~3.5% threshold would be "picking a loose
threshold to pass" over demonstrably unaligned states (web 3 draws vs python 184), which
the goal explicitly forbids. Per G3's contract, when the metric does NOT drop after
replicating CPython semantics, the first diverging consumer is documented and the gate
decision is made with justification. That decision here is: **keep the stage gate
INFORMATIONAL** until the web's per-frame RNG consumption is aligned with Python's
(sound-variant draws, intro/colour order, spawn timing) — a fidelity rewrite for a later
round.

The title gate (≤1%) and intro (informational) are unaffected by this round.

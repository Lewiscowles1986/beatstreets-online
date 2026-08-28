# Iteration 004 — CPython-compatible PRNG: bit-aligned states, hard stage gate

## Carry-in conditions (from JUDGE 003 + judge-002 optional)

1. Replicate CPython's `random` module semantics in `packages/engine/src/core/prng.ts`
   — MT19937 core + `getrandbits`/`_randbelow` consumption pattern — so a web capture
   seeded identically to the Python driver replays the SAME entity states.
2. Then promote the stage fidelity gate from informational to HARD (threshold honestly
   derived from the aligned-state measurement, not from the old unaligned numbers).
3. Optional/stretch: validate the title logo region against a true non-alpha-flattened
   pygame frame (close the per-region compensation caveat in the title gate).

## Ground truth

- CPython `random` (3.12): MT19937; `randint(a,b)` → `randrange` → `_randbelow(n)`
  via `getrandbits(k)` loops; `choice(seq)` = `seq[self._randbelow(len(seq))]`.
  Seed via `random.seed(int)` init_by_array on the int→32-bit-word conversion.
- Python capture driver: tools/capture_beatstreets_frame.py (seed 1, skip-intro,
  255-frame fade + 90 live frames). Web capture: stage.html?seed=1&freeze=345
  (frame-exact via GameCanvas freezeAtTimer).
- Current stable stage metric: 3.53% (structural match, unaligned states).
- Verification of MT19937 correctness MUST be cross-checked against real Python:
  generate a reference sequence with `python3 -c "import random; random.seed(1); …"`
  (parent venv) and pin those exact numbers in core/prng.test.ts.

## Goal (builder must satisfy ALL)

- [ ] G1. `core/prng.ts` gains `cpythonRng(seed)` implementing MT19937 + CPython's
      randint/choice consumption exactly (incl. init_by_array seeding from an int).
      `seededRng` becomes an alias for it. Unit tests pin values captured from real
      CPython (document the generator command in the test file header).
- [ ] G2. Re-align RNG call ORDER with Python where cheap: enumerate Python's
      randint/choice call sites (grep vol2/beatstreets/beatstreets.py) and check each
      web counterpart consumes the same number/order of draws per frame. Fix order
      mismatches that are mechanical; document any that require engine logic changes
      (those are fidelity bugs for a later round).
- [ ] G3. Stage metric re-measured with aligned states; promote the gate to HARD with
      an honest threshold (aligned states should approach intro-level ~7.8% or better;
      if the metric stays >10%, states are still misaligned — find the first diverging
      RNG consumer and fix/document it; do NOT pick a loose threshold to pass).
- [ ] G4. No regressions: title hard gate ≤1% green; orientation green;
      `npm run precommit` (incl. e2e) green.
- [ ] G5. docs/FIDELITY.md + MEASUREMENT.md + BUILDER.md updated with the aligned
      numbers and the MT19937 cross-check provenance.

## Out of scope

- New gameplay features; audio; controls/game-over screens (next rounds).

## Definition of done

Precommit green; hard stage gate live; uncommitted tree ready for orchestrator commit.
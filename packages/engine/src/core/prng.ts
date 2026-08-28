/**
 * Injectable, seeded PRNG for deterministic gameplay (GOAL G1).
 *
 * The Python game (vol2/beatstreets/beatstreets.py) draws randomness from a single
 * module-global `random` object (`from random import randint, choice`), seeded by the
 * capture driver via `random.seed(seed)`. To replay the SAME sequence on the web we
 * replace bare `Math.random` call sites with an injectable {@link Rng} that the Game
 * owns and passes down to fighters/weapons/enemies.
 *
 * Mapping onto the underlying generator (documented, mirrors CPython's `random`
 * module semantics for the integer/choice surface):
 *   - `random()`            -> one draw of the underlying generator in [0, 1).
 *   - `randint(min, max)`   -> `floor(random() * (max - min + 1)) + min`  (INCLUSIVE
 *                              both ends, exactly one draw).
 *   - `choice(seq)`         -> `seq[floor(random() * seq.length)]` (exactly one draw).
 *
 * NOTE on bit-exactness: we do NOT replicate CPython's Mersenne Twister. What we
 * guarantee is determinism — the same seed yields the same sequence on every run and
 * every platform — plus a documented, stable mapping of randint/choice onto the
 * generator. Because the web engine's RNG call ORDER differs from the Python game's
 * (different call sites, different counts), a web capture seeded at `seed` will NOT be
 * bit-identical to a Python capture at the same seed; the stage gate therefore stays
 * informational and the divergence is documented (see docs/FIDELITY.md).
 *
 * The default RNG is {@link systemRng} (wraps Math.random), so existing behaviour is
 * unchanged unless a seed is supplied.
 */

/** The random surface the engine consumes. */
export interface Rng {
  /** Uniform float in [0, 1). */
  random(): number;
  /** Integer in [min, max] inclusive. */
  randint(min: number, max: number): number;
  /** A uniformly chosen element of `seq`. */
  choice<T>(seq: readonly T[]): T;
}

/**
 * Build a deterministic RNG from a seed using mulberry32 (a small, fast, well-known
 * 32-bit PRNG). Same seed => same sequence on every run and platform.
 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    random: next,
    randint: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    choice: (seq) => seq[Math.floor(next() * seq.length)],
  };
}

/** The default RNG: wraps Math.random so unseeded behaviour is unchanged. */
export const systemRng: Rng = {
  random: () => Math.random(),
  randint: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  choice: (seq) => seq[Math.floor(Math.random() * seq.length)],
};

/**
 * Injectable, seeded PRNG for deterministic gameplay (GOAL G1).
 *
 * The Python game (vol2/beatstreets/beatstreets.py) draws randomness from a single
 * module-global `random` object (`from random import randint, choice`), seeded by the
 * capture driver via `random.seed(seed)`. To replay the SAME sequence on the web we
 * replace bare `Math.random` call sites with an injectable {@link Rng} that the Game
 * owns and passes down to fighters/weapons/enemies.
 *
 * {@link cpythonRng} is a faithful reimplementation of CPython's `random` module
 * (Python 3.12) so a web capture seeded identically to the Python driver replays the
 * SAME entity states:
 *   - MT19937 core (624-word state, tempering, twist) — see `_randommodule.c`.
 *   - `random()`  -> `(genrand()>>5)*67108864.0 + (genrand()>>6)` scaled to [0,1)
 *                    (CPython consumes TWO genrand draws per `random()`).
 *   - `randint(a,b)` -> `a + _randbelow(b - a + 1)` (inclusive both ends).
 *   - `choice(seq)`   -> `seq[_randbelow(seq.length)]`.
 *   - `_randbelow(n)` -> `k = n.bit_length(); r = getrandbits(k); while r >= n: r =
 *                    getrandbits(k)` (may consume multiple draws when r is rejected).
 *   - `getrandbits(k)` -> for k<=32 one `genrand() >> (32-k)`; for k>32 multiple
 *                    words (least-significant first, top word shifted).
 *   - Seeding an int mirrors CPython `random_seed`: take the absolute value, split it
 *     into 32-bit little-endian words, and run `init_by_array` (an empty key -> [0]).
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

// --- MT19937 constants (mirror CPython `_randommodule.c`) ---------------------
const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;

/**
 * Split an integer seed into the 32-bit little-endian words CPython feeds to
 * `init_by_array` (mirrors `random_seed`: absolute value, empty key -> [0]).
 * `seed` is expected to be an integer; non-integers are truncated.
 */
function seedToKey(seed: number): number[] {
  const abs = BigInt(Math.trunc(Math.abs(seed)));
  if (abs === 0n) return [0];
  const words: number[] = [];
  let n = abs;
  while (n > 0n) {
    words.push(Number(n & 0xffffffffn));
    n >>= 32n;
  }
  return words;
}

/** Exact `n.bit_length()` for a non-negative integer (CPython `_randbelow`). */
function bitLength(n: number): number {
  let bits = 0;
  while (n > 0) {
    bits++;
    n = Math.floor(n / 2);
  }
  return bits;
}

/**
 * Build a deterministic RNG that reproduces CPython's `random` module (MT19937 +
 * `getrandbits`/`_randbelow` consumption) for a given integer seed. Same seed =>
 * the exact same sequence as `random.seed(seed)` in Python 3.12.
 */
export function cpythonRng(seed: number): Rng {
  const key = seedToKey(seed);
  const mt = new Uint32Array(N);
  let index: number;

  // init_by_array (mirrors CPython `_randommodule.c`).
  mt[0] = 19650218;
  for (let mti = 1; mti < N; mti++) {
    // Math.imul gives the exact low-32 bits of the mod-2^32 product (a plain
    // `*` would exceed 2^53 and lose precision).
    mt[mti] = (Math.imul(1812433253, mt[mti - 1] ^ (mt[mti - 1] >>> 30)) + mti) >>> 0;
  }
  let i = 1;
  let j = 0;
  let k = N > key.length ? N : key.length;
  for (; k; k--) {
    mt[i] =
      (mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1664525)) + key[j] + j;
    i++;
    j++;
    if (i >= N) {
      mt[0] = mt[N - 1];
      i = 1;
    }
    if (j >= key.length) j = 0;
  }
  for (k = N - 1; k; k--) {
    mt[i] =
      (mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1566083941)) - i;
    i++;
    if (i >= N) {
      mt[0] = mt[N - 1];
      i = 1;
    }
  }
  mt[0] = 0x80000000;
  index = N;

  /** One tempered 32-bit word (twists the state when exhausted). */
  const genrand = (): number => {
    if (index >= N) {
      for (let kk = 0; kk < N - M; kk++) {
        const y = (mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK);
        mt[kk] = mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
      }
      for (let kk = N - M; kk < N - 1; kk++) {
        const y = (mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK);
        mt[kk] = mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
      }
      const y = (mt[N - 1] & UPPER_MASK) | (mt[0] & LOWER_MASK);
      mt[N - 1] = mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
      index = 0;
    }
    let y = mt[index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  };

  /** CPython `getrandbits(k)`. For k>32 the result is a JS number (precision loss
   * beyond 2^53 is acceptable — the game only uses small ranges, k<=32). */
  const getrandbits = (k: number): number => {
    if (k <= 0) return 0;
    if (k <= 32) return genrand() >>> (32 - k);
    const words = Math.floor((k - 1) / 32) + 1;
    let result = 0;
    let remaining = k;
    for (let w = 0; w < words; w++) {
      let r = genrand();
      if (remaining < 32) r = r >>> (32 - remaining);
      result = result * 4294967296 + r;
      remaining -= 32;
    }
    return result;
  };

  /** CPython `_randbelow(n)`: returns an int in [0, n). */
  const randbelow = (n: number): number => {
    const k = bitLength(n);
    let r = getrandbits(k);
    while (r >= n) r = getrandbits(k);
    return r;
  };

  return {
    random: () => {
      const a = genrand() >>> 5;
      const b = genrand() >>> 6;
      return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
    },
    randint: (min, max) => min + randbelow(max - min + 1),
    choice: (seq) => seq[randbelow(seq.length)],
  };
}

/**
 * Build a deterministic RNG from a seed. `seededRng` is an alias for {@link cpythonRng}
 * so a web capture seeded identically to the Python driver replays the same states.
 */
export const seededRng = cpythonRng;

/** The default RNG: wraps Math.random so unseeded behaviour is unchanged. */
export const systemRng: Rng = {
  random: () => Math.random(),
  randint: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  choice: (seq) => seq[Math.floor(Math.random() * seq.length)],
};

/** One recorded RNG draw (for debug/draw-parity traces). */
export interface RngDraw {
  kind: 'random' | 'randint' | 'choice';
  args: unknown[];
  value: unknown;
  /** The game frame this draw was made on (0 when the tracer is used engine-only). */
  frame: number;
}

/**
 * A pass-through RNG wrapper that records every draw it forwards. Used by the Game
 * (`opts.debugRng`) and by draw-parity tests to compare the web's RNG consumption
 * against a Python `--trace-rng` capture. Does not alter the drawn values.
 */
export class TracingRng implements Rng {
  readonly draws: RngDraw[] = [];
  /** The game frame tag applied to subsequent draws (engine sets it each tick). */
  frame = 0;

  constructor(private inner: Rng) {}

  random(): number {
    const v = this.inner.random();
    this.draws.push({ kind: 'random', args: [], value: v, frame: this.frame });
    return v;
  }

  randint(min: number, max: number): number {
    const v = this.inner.randint(min, max);
    this.draws.push({ kind: 'randint', args: [min, max], value: v, frame: this.frame });
    return v;
  }

  choice<T>(seq: readonly T[]): T {
    const v = this.inner.choice(seq);
    this.draws.push({ kind: 'choice', args: [seq.length], value: v, frame: this.frame });
    return v;
  }

  /** Total number of draws forwarded so far. */
  get count(): number {
    return this.draws.length;
  }
}

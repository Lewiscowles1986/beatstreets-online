import { describe, it, expect, vi } from 'vitest';
import { seededRng, cpythonRng, systemRng } from './prng';

/**
 * CPython cross-check (acceptance bar for MT19937 correctness). These exact
 * sequences were captured from real CPython 3.12 (parent venv) with:
 *
 *   cd /Users/lewiscowles/Projects/study/code-the-classics && ./.venv/bin/python -c \
 *     "import random; random.seed(1); \
 *      print([random.random() for _ in range(5)]); \
 *      print([random.randint(0,9) for _ in range(10)]); \
 *      print([random.choice('abcdefghij') for _ in range(10)]); \
 *      print([random.randint(0,1) for _ in range(20)])"
 *
 * Output:
 *   [0.13436424411240122, 0.8474337369372327, 0.763774618976614,
 *    0.2550690257394217, 0.49543508709194095]
 *   [7, 7, 6, 3, 1, 7, 0, 6, 6, 9]
 *   ['a', 'h', 'e', 'd', 'j', 'b', 'f', 'a', 'a', 'a']
 *   [0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0]
 */
const CPYTHON_RANDOM = [
  0.13436424411240122, 0.8474337369372327, 0.763774618976614, 0.2550690257394217,
  0.49543508709194095,
];
const CPYTHON_RANDINT_0_9 = [7, 7, 6, 3, 1, 7, 0, 6, 6, 9];
const CPYTHON_CHOICE = ['a', 'h', 'e', 'd', 'j', 'b', 'f', 'a', 'a', 'a'];
const CPYTHON_RANDINT_0_1 = [0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0];

describe('seededRng', () => {
  it('is deterministic: same seed yields the same sequence', () => {
    const a = seededRng(1);
    const b = seededRng(1);
    const seqA = [a.random(), a.random(), a.random(), a.random()];
    const seqB = [b.random(), b.random(), b.random(), b.random()];
    expect(seqA).toEqual(seqB);
  });

  it('different seeds yield different sequences', () => {
    const a = seededRng(1);
    const b = seededRng(2);
    const seqA = [a.random(), a.random(), a.random()];
    const seqB = [b.random(), b.random(), b.random()];
    expect(seqA).not.toEqual(seqB);
  });

  it('random() returns values in [0, 1)', () => {
    const rng = seededRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng.random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('randint(min, max) is inclusive of both ends and stays in range', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 2000; i++) {
      const v = rng.randint(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
    }
    // Both endpoints are reachable over a large sample.
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(rng.randint(0, 2));
    expect(seen.has(0)).toBe(true);
    expect(seen.has(2)).toBe(true);
  });

  it('randint with a single value always returns that value', () => {
    const rng = seededRng(9);
    for (let i = 0; i < 100; i++) expect(rng.randint(4, 4)).toBe(4);
  });

  it('choice(seq) returns an element of the sequence', () => {
    const rng = seededRng(11);
    const seq = ['a', 'b', 'c'];
    for (let i = 0; i < 500; i++) {
      expect(seq).toContain(rng.choice(seq));
    }
  });

  it('choice(seq) reaches every element over a large sample', () => {
    const rng = seededRng(13);
    const seq = ['x', 'y', 'z'];
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(rng.choice(seq));
    expect(seen.size).toBe(3);
  });
});

describe('cpythonRng (CPython-pinned cross-check)', () => {
  it('replays CPython random.seed(1) exactly (sequential random/randint/choice/randint)', () => {
    // All four pinned sequences come from a SINGLE random.seed(1) stream, drawn in
    // order (random ×5, randint(0,9) ×10, choice ×10, randint(0,1) ×20).
    const rng = cpythonRng(1);
    const gotRandom = [rng.random(), rng.random(), rng.random(), rng.random(), rng.random()];
    expect(gotRandom).toEqual(CPYTHON_RANDOM);

    const gotRandint09 = Array.from({ length: 10 }, () => rng.randint(0, 9));
    expect(gotRandint09).toEqual(CPYTHON_RANDINT_0_9);

    const seq = 'abcdefghij'.split('');
    const gotChoice = Array.from({ length: 10 }, () => rng.choice(seq));
    expect(gotChoice).toEqual(CPYTHON_CHOICE);

    const gotRandint01 = Array.from({ length: 20 }, () => rng.randint(0, 1));
    expect(gotRandint01).toEqual(CPYTHON_RANDINT_0_1);
  });

  it('randint(0,1) single-bit fast path matches CPython from a fresh stream', () => {
    const rng = cpythonRng(1);
    // CPython: random.Random(1).randint(0,1) ×20 from draw 0.
    expect(Array.from({ length: 20 }, () => rng.randint(0, 1))).toEqual([
      0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1,
    ]);
  });

  it('seededRng is an alias for cpythonRng', () => {
    expect(seededRng(1).random()).toBe(cpythonRng(1).random());
  });

  it('negative seeds use the absolute value (mirrors CPython random_seed)', () => {
    expect(cpythonRng(-1).random()).toBe(cpythonRng(1).random());
  });

  it('seed 0 uses the empty-key [0] path', () => {
    // random.seed(0) first value, captured from CPython.
    expect(cpythonRng(0).random()).toBe(0.8444218515250481);
  });

  it('large randint stays in range and is deterministic', () => {
    const rng = cpythonRng(42);
    for (let i = 0; i < 2000; i++) {
      const v = rng.randint(0, 500);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(500);
      expect(Number.isInteger(v)).toBe(true);
    }
    // Deterministic across instances.
    const a = cpythonRng(42);
    const b = cpythonRng(42);
    for (let i = 0; i < 100; i++) expect(a.randint(0, 500)).toBe(b.randint(0, 500));
  });

  it('randint(0,500) == 0 fires across a large sample', () => {
    const rng = cpythonRng(7);
    let hits = 0;
    for (let i = 0; i < 10000; i++) if (rng.randint(0, 500) === 0) hits++;
    expect(hits).toBeGreaterThan(0);
  });
});

describe('systemRng', () => {
  it('wraps Math.random for random()', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      expect(systemRng.random()).toBe(0.5);
    } finally {
      spy.mockRestore();
    }
  });

  it('randint maps a single draw onto the inclusive range', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.0);
    try {
      expect(systemRng.randint(10, 20)).toBe(10);
    } finally {
      spy.mockRestore();
    }
  });

  it('choice maps a single draw onto the sequence', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    try {
      expect(systemRng.choice(['a', 'b', 'c'])).toBe('c');
    } finally {
      spy.mockRestore();
    }
  });
});

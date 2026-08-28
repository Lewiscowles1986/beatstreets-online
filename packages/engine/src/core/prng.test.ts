import { describe, it, expect, vi } from 'vitest';
import { seededRng, systemRng } from './prng';

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

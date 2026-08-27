import { describe, it, expect } from 'vitest';
import { invertSpecialSymbols, titleLogoName } from './title';

describe('titleLogoName', () => {
  it('shows title0 for frames 0..19 and title1 for 20..39 (20-frame swap)', () => {
    for (let f = 0; f < 20; f++) expect(titleLogoName(f)).toBe('title0');
    for (let f = 20; f < 40; f++) expect(titleLogoName(f)).toBe('title1');
    for (let f = 40; f < 60; f++) expect(titleLogoName(f)).toBe('title0');
  });

  it('matches the Python expression total_frames // 20 % 2 == 0', () => {
    for (let f = 0; f < 200; f++) {
      const expected = Math.floor(f / 20) % 2 === 0 ? 'title0' : 'title1';
      expect(titleLogoName(f)).toBe(expected);
    }
  });

  it('honours a custom swap interval', () => {
    expect(titleLogoName(0, 5)).toBe('title0');
    expect(titleLogoName(5, 5)).toBe('title1');
    expect(titleLogoName(10, 5)).toBe('title0');
  });
});

describe('invertSpecialSymbols', () => {
  it('maps sprite name -> char into char -> sprite name', () => {
    expect(invertSpecialSymbols({ xb_a: '%' })).toEqual({ '%': 'xb_a' });
  });

  it('handles multiple symbols and empty input', () => {
    expect(invertSpecialSymbols({ a: '1', b: '2' })).toEqual({ '1': 'a', '2': 'b' });
    expect(invertSpecialSymbols({})).toEqual({});
  });
});

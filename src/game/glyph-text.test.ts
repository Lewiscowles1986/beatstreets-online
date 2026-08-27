import { describe, it, expect } from 'vitest';
import { GLYPH_SPACE_WIDTH, glyphSpriteName, measureGlyphText } from './glyph-text';

// Fake sprite widths matching the real assets used by the title prompt.
const WIDTHS: Record<string, number> = {
  font080: 32, // P
  font082: 31, // R
  font069: 32, // E
  font083: 32, // S
  font079: 32, // O
  font090: 32, // Z
  xb_a: 44,
};
const widthOf = (sprite: string) => WIDTHS[sprite] ?? GLYPH_SPACE_WIDTH;

describe('glyphSpriteName', () => {
  it('returns null for a space', () => {
    expect(glyphSpriteName(' ', {})).toBeNull();
  });

  it('maps a special symbol char to its sprite', () => {
    expect(glyphSpriteName('%', { '%': 'xb_a' })).toBe('xb_a');
  });

  it('maps a normal char to its font0<ord> glyph', () => {
    expect(glyphSpriteName('P', {})).toBe('font080');
    expect(glyphSpriteName('Z', {})).toBe('font090');
  });
});

describe('measureGlyphText', () => {
  it('computes the Python text_width for "PRESS % OR Z"', () => {
    // 32+31+32+32+32 + 22 + 44 + 22 + 32+31 + 22 + 32 = 364
    expect(measureGlyphText('PRESS % OR Z', widthOf, { '%': 'xb_a' })).toBe(364);
  });

  it('uses the space advance for unknown glyphs', () => {
    expect(measureGlyphText('?', widthOf, {})).toBe(GLYPH_SPACE_WIDTH);
  });

  it('honours a custom space width', () => {
    expect(measureGlyphText('P P', widthOf, {}, 10)).toBe(32 + 10 + 32);
  });
});

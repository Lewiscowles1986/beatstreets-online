/**
 * Title-screen helpers: the two-frame logo alternation and the special-symbol
 * inversion used to render the "PRESS [A] OR Z" prompt with the game font.
 *
 * These are pure, data-driven functions so the alternation timing and prompt glyph
 * mapping can be unit-tested and reused by any renderer.
 */

/**
 * Name of the title logo for a given frame counter.
 * Mirrors Python: `images.title0 if total_frames // 20 % 2 == 0 else images.title1`
 * (swaps every `swapFrames` frames, default 20).
 */
export function titleLogoName(frame: number, swapFrames = 20): string {
  return Math.floor(frame / swapFrames) % 2 === 0 ? 'title0' : 'title1';
}

/**
 * Invert `SPECIAL_FONT_SYMBOLS` (sprite name -> symbol char) into the char -> sprite
 * map the glyph renderer consumes (e.g. `{ xb_a: '%' }` -> `{ '%': 'xb_a' }`).
 */
export function invertSpecialSymbols(symbols: Record<string, string>): Record<string, string> {
  const inverted: Record<string, string> = {};
  for (const [sprite, char] of Object.entries(symbols)) inverted[char] = sprite;
  return inverted;
}

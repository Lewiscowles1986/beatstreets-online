/**
 * Glyph-based text rendering helpers, mirroring the Python game's `draw_text`.
 *
 * The Python original renders text by blitting one sprite per character: a space is a
 * fixed 22px gap, a character in `SPECIAL_FONT_SYMBOLS` (e.g. `%` -> the green `xb_a`
 * A-button) is replaced by that sprite, and every other character maps to the
 * `font0<ord(char)>` glyph sprite. Keeping this as pure functions lets the renderers
 * share the exact width/centring maths and lets unit tests assert it without a canvas.
 */

/** Fixed advance (px) for a space glyph, matching the Python `get_char_image_and_width`. */
export const GLYPH_SPACE_WIDTH = 22;

/** Options controlling glyph text layout. */
export interface GlyphTextOptions {
  /** Centre the string horizontally on `x` (Python `centre=True`). */
  centered?: boolean;
  /** Map of special symbol char -> sprite name (e.g. `{ '%': 'xb_a' }`). */
  specialSymbols?: Record<string, string>;
  /** Advance (px) for a space glyph. Defaults to {@link GLYPH_SPACE_WIDTH}. */
  spaceWidth?: number;
}

/**
 * The sprite name for a text character, or `null` for a space.
 * Mirrors Python's `get_char_image_and_width` special-symbol + `font0<ord>` lookup.
 */
export function glyphSpriteName(char: string, specialSymbols: Record<string, string>): string | null {
  if (char === ' ') return null;
  const special = specialSymbols[char];
  if (special) return special;
  return `font0${char.charCodeAt(0)}`;
}

/**
 * Total width of a glyph-rendered string (Python `text_width`).
 * `widthOf` resolves a sprite name to its pixel width.
 */
export function measureGlyphText(
  text: string,
  widthOf: (sprite: string) => number,
  specialSymbols: Record<string, string>,
  spaceWidth = GLYPH_SPACE_WIDTH,
): number {
  let width = 0;
  for (const char of text) {
    const sprite = glyphSpriteName(char, specialSymbols);
    width += sprite === null ? spaceWidth : widthOf(sprite);
  }
  return width;
}

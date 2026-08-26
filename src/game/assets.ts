/**
 * Asset loader for Beat Streets.
 *
 * Sprites are PNG files in src/assets/images. Vite imports them as URLs; this module
 * gives the engine a typed, runtime-checkable way to reference a sprite by name (the
 * same convention the Python game uses, where an Actor is created from an image name
 * and the framework resolves the file).
 *
 * Only sprites that actually exist are exposed; a lookup for a missing sprite returns
 * undefined so the engine can warn instead of crashing mid-frame.
 */

// Vite glob-imports every PNG under images/ at build time. The keys are the file
// paths (e.g. "/src/assets/images/hero_stand_0_0.png"); we key our map by basename
// without the extension to match the game's sprite-name convention.
const spriteModules = import.meta.glob('../assets/images/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export type SpriteMap = Record<string, string>;

function buildSpriteMap(): SpriteMap {
  const map: SpriteMap = {};
  for (const [path, url] of Object.entries(spriteModules)) {
    const name = path.split('/').pop()?.replace(/\.png$/, '') ?? '';
    if (name) map[name] = url;
  }
  return map;
}

export const SPRITES: SpriteMap = buildSpriteMap();

/** Look up a sprite URL by its game name, or undefined if it does not exist. */
export function spriteUrl(name: string): string | undefined {
  return SPRITES[name];
}

/** True if a named sprite exists in the asset set. */
export function hasSprite(name: string): boolean {
  return name in SPRITES;
}

/** Total number of distinct sprites available. */
export function spriteCount(): number {
  return Object.keys(SPRITES).length;
}

// Music / audio. Currently a single theme track; the engine will consume an Audio
// abstraction rather than the browser audio element directly.
import theme from '../assets/music/theme.ogg';
export { theme };

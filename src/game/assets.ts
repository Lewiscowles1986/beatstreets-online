/**
 * Shared asset loader for Beat Streets.
 *
 * Sprites are PNG files in src/assets/images. Vite glob-imports them as URLs; this
 * module exposes a single, shared {@link AssetLoader} that:
 *
 *  1. preloads every sprite into an in-memory `HTMLImageElement` cache, and
 *  2. hands renderers synchronous access to a loaded image by its game name
 *     (the same convention the Python game uses, where an Actor is created from an
 *     image name and the framework resolves the file).
 *
 * Components must call {@link preloadSprites} (or use the {@link useSpriteAssets}
 * React hook) before mounting a canvas, so sprites are ready when the first frame
 * draws — otherwise nothing appears.
 */

// Vite glob-imports every PNG under images/ at build time. The keys are the file
// paths (e.g. "/src/assets/images/hero_stand_0_0.png"); we key by basename without
// the extension to match the game's sprite-name convention.
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

/** The full name -> url map of every bundled sprite. */
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

/** A shared preloader that decodes every sprite into an Image cache. */
class AssetLoader {
  private images = new Map<string, HTMLImageElement>();
  private ready: Promise<void> | null = null;

  /** Preload all sprites (idempotent). Resolves once every image is decoded. */
  preload(onProgress?: (loaded: number, total: number) => void): Promise<void> {
    if (this.ready) return this.ready;
    const entries = Object.entries(SPRITES);
    const total = entries.length;
    this.ready = new Promise<void>((resolve) => {
      let loaded = 0;
      if (total === 0) {
        resolve();
        return;
      }
      for (const [name, url] of entries) {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          this.images.set(name, img);
          loaded += 1;
          onProgress?.(loaded, total);
          if (loaded >= total) resolve();
        };
        img.onerror = () => {
          // Missing sprite: count it as loaded so we don't hang; it just won't render.
          if (import.meta.env.DEV) {
            console.warn(`[assets] failed to load sprite "${name}" (${url})`);
          }
          loaded += 1;
          onProgress?.(loaded, total);
          if (loaded >= total) resolve();
        };
        img.src = url;
      }
    });
    return this.ready;
  }

  /** A loaded image for a sprite name, or undefined if not (yet) loaded. */
  get(name: string): HTMLImageElement | undefined {
    return this.images.get(name);
  }
}

/** The single shared asset loader instance. */
export const assetLoader = new AssetLoader();

/** Preload all sprites (convenience re-export). */
export function preloadSprites(onProgress?: (loaded: number, total: number) => void): Promise<void> {
  return assetLoader.preload(onProgress);
}

/** A loaded image for a sprite name, or undefined. */
export function getSpriteImage(name: string): HTMLImageElement | undefined {
  return assetLoader.get(name);
}

// Music / audio. Currently a single theme track; the engine will consume an Audio
// abstraction rather than the browser audio element directly.
import theme from '../assets/music/theme.ogg';
export { theme };

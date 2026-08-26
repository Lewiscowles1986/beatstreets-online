import { useEffect, useState } from 'react';
import { preloadSprites, spriteCount } from '../game/assets';

export interface SpriteLoadState {
  /** True once all sprites have been preloaded. */
  ready: boolean;
  /** Number of sprites decoded so far. */
  loaded: number;
  /** Total number of sprites. */
  total: number;
}

/**
 * Preloads all sprites (via the shared {@link preloadSprites} loader) and reports
 * progress. Components should render nothing (or a loading state) until `ready` is
 * true, so the first canvas frame draws actual sprites rather than blanks.
 */
export function useSpriteAssets(): SpriteLoadState {
  const [state, setState] = useState<SpriteLoadState>({
    ready: false,
    loaded: 0,
    total: spriteCount(),
  });

  useEffect(() => {
    let alive = true;
    preloadSprites((loaded) => {
      if (alive) setState((s) => ({ ...s, loaded }));
    }).then(() => {
      if (alive) setState((s) => ({ ...s, ready: true, loaded: spriteCount() }));
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

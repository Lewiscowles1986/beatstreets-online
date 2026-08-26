import { vi, beforeAll, afterAll } from 'vitest';
import { preloadSprites } from '../game/assets';

/** A synchronous Image stub so the shared asset loader resolves in jsdom. */
class FakeImage {
  src = '';
  naturalWidth = 1;
  naturalHeight = 1;
  complete = true;
  decoding = 'async' as const;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    queueMicrotask(() => this.onload?.());
  }
}

/**
 * jsdom does not implement canvas 2D (it throws "Not implemented" unless the native
 * `canvas` package is installed). To keep component tests running in CI without a
 * native build, stub `HTMLCanvasElement.prototype.getContext` to return a minimal fake
 * 2D context. The tests assert sizing/ARIA, not actual rasterised pixels.
 */
function makeFakeCtx(): Record<string, unknown> {
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'measureText') return () => ({ width: 0 });
        if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
        // Any draw/canvas method is a no-op; any property read returns undefined/0-ish.
        return () => undefined;
      },
      set() {
        return true;
      },
    },
  );
}

/**
 * Stub the browser Image, preload all sprites, and make canvas 2D contexts available
 * in jsdom. Call from each test's beforeAll.
 */
export async function stubSprites(): Promise<void> {
  vi.stubGlobal('Image', FakeImage);
  await preloadSprites();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() =>
    makeFakeCtx() as unknown as CanvasRenderingContext2D,
  );
}

beforeAll(async () => {
  await stubSprites();
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

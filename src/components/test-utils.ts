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
 * Stub the browser Image and preload all sprites. Call from each test's beforeAll.
 * Also no-ops canvas drawImage so component tests can mount canvases in jsdom without
 * actually rasterising (the tests assert sizing/ARIA, not pixels).
 */
export async function stubSprites(): Promise<void> {
  vi.stubGlobal('Image', FakeImage);
  await preloadSprites();
  const proto = Object.getPrototypeOf(document.createElement('canvas').getContext('2d')!);
  vi.spyOn(proto, 'drawImage').mockImplementation(() => undefined);
  vi.spyOn(proto, 'fillRect').mockImplementation(() => undefined);
  vi.spyOn(proto, 'fillText').mockImplementation(() => undefined);
}

beforeAll(async () => {
  await stubSprites();
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

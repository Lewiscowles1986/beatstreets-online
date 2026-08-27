import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Fidelity check (GOAL G5): verifies the web title screen at exactly 800x480 matches
 * the Python reference frame, and records a gameplay frame for the record.
 *
 * The reference (`e2e/reference/beatstreets-title.png`) is regenerated from the
 * current Python build: the `title0` asset (byte-identical to Python `title0`)
 * composited onto a black 800x480 canvas, plus the "PRESS [A] OR Z" prompt drawn with
 * the game's per-glyph font sprites at the Python position (centred at x=400, y=430).
 * It is the accurate ground truth for the title state.
 *
 * Diff metric: the live canvas and the reference PNG are both drawn into an 800x480
 * offscreen canvas in the browser and compared per-pixel. A pixel "differs" when any
 * RGB channel differs by more than CHANNEL_THRESHOLD (8/255). The assertion passes
 * when the fraction of differing pixels is <= MAX_DIFF_FRACTION (2%). Threshold 8 is
 * tight enough to catch brightness/colour regressions while tolerating minor
 * anti-aliasing/compression noise.
 */

const REFERENCE = resolve(__dirname, 'reference/beatstreets-title.png');
const OUT_DIR = resolve(__dirname, 'screenshots');
const TITLE_OUT = resolve(OUT_DIR, 'fidelity-title.png');
const GAMEPLAY_OUT = resolve(OUT_DIR, 'fidelity-gameplay.png');

const WIDTH = 800;
const HEIGHT = 480;
const CHANNEL_THRESHOLD = 8;
const MAX_DIFF_FRACTION = 0.02;

/** Compare two PNG buffers in the browser and return the per-pixel diff summary. */
async function pixelDiff(page: import('@playwright/test').Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async ({ aB64, bB64, width, height, threshold }) => {
      const load = (b64: string) =>
        new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = 'data:image/png;base64,' + b64;
        });
      const [a, b] = await Promise.all([load(aB64), load(bB64)]);
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(a, 0, 0, width, height);
      const da = ctx.getImageData(0, 0, width, height).data;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(b, 0, 0, width, height);
      const db = ctx.getImageData(0, 0, width, height).data;
      let diffPixels = 0;
      const total = width * height;
      for (let i = 0; i < total; i++) {
        const o = i * 4;
        if (
          Math.abs(da[o] - db[o]) > threshold ||
          Math.abs(da[o + 1] - db[o + 1]) > threshold ||
          Math.abs(da[o + 2] - db[o + 2]) > threshold
        ) {
          diffPixels++;
        }
      }
      return { diffPixels, total, fraction: diffPixels / total };
    },
    { aB64: a.toString('base64'), bB64: b.toString('base64'), width: WIDTH, height: HEIGHT, threshold: CHANNEL_THRESHOLD },
  );
}

test('title screen matches the Python reference at 800x480', async ({ page }) => {
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });
  // Dedicated e2e entry (title.html) renders the title at frame 0 on black.
  await page.goto('/title.html');

  const canvas = page.locator('canvas[aria-label="Beat Streets title screen"]');
  await expect(canvas).toBeVisible();
  // Assert the CSS size (the backing store is width*dpr, so the attribute only equals
  // 800 when devicePixelRatio===1; the CSS size is the stable logical size).
  await expect(canvas).toHaveCSS('width', `${WIDTH}px`);
  await expect(canvas).toHaveCSS('height', `${HEIGHT}px`);
  // Wait until the logo is actually drawn (non-blank) instead of a fixed sleep.
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas[aria-label="Beat Streets title screen"]') as HTMLCanvasElement | null;
    if (!c) return false;
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 0 || d[i + 1] > 0 || d[i + 2] > 0) return true;
    }
    return false;
  });

  const shot = await canvas.screenshot();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(TITLE_OUT, shot);

  const ref = readFileSync(REFERENCE);
  const diff = await pixelDiff(page, shot, ref);
  console.log(
    `fidelity diff: ${(diff.fraction * 100).toFixed(2)}% pixels differ (${diff.diffPixels}/${diff.total}, threshold ${CHANNEL_THRESHOLD}/channel)`,
  );
  expect(diff.fraction).toBeLessThanOrEqual(MAX_DIFF_FRACTION);
});

test('records a gameplay frame for the record (no strict assert)', async ({ page }) => {
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).click();

  const canvas = page.locator('canvas[aria-label^="Beat Streets game"]');
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1000);

  const shot = await canvas.screenshot();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(GAMEPLAY_OUT, shot);
});

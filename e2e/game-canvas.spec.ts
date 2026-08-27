import { test, expect } from '@playwright/test';

/**
 * Playwright control test for the game host. Guards against the white-screen
 * regression (canvas must mount at the requested size, not the 300x150 default) and
 * confirms the lazy-loaded game starts without page errors.
 */
test('game canvas mounts at the requested size when Play is pressed', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).click();

  // The game canvas mounts after sprites preload; wait generously.
  const canvas = page.locator('canvas[aria-label^="Beat Streets game"]');
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await expect(canvas).toHaveAttribute('width', '800');
  await expect(canvas).toHaveAttribute('height', '480');
  expect(pageErrors).toEqual([]);
});

/**
 * Orientation guard: the WebGL renderer must draw sprites upright, matching the
 * Canvas-2D renderer (the known-correct path). Captures the same live stage-1 frame
 * through both backends and asserts the WebGL frame is more similar to the 2D frame
 * than to its vertical mirror — a vertical-flip bug would make it match the mirror.
 */
test('WebGL render matches the 2D render orientation (not vertically flipped)', async ({ page }) => {
  const capture = async (url: string) => {
    await page.goto(url);
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await page.getByRole('button', { name: 'Play' }).click();
    const canvas = page.locator('canvas[aria-label^="Beat Streets game"]');
    await expect(canvas).toBeVisible({ timeout: 15000 });
    // Advance title -> controls -> play, then let a few gameplay frames render.
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
    return canvas.screenshot();
  };

  const webgl = await capture('/');
  const twoD = await capture('/?renderer=2d');

  const result = await page.evaluate(
    async ({ webglB64, twoDB64, width, height }) => {
      const load = (b64: string) =>
        new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = 'data:image/png;base64,' + b64;
        });
      const [w, t] = await Promise.all([load(webglB64), load(twoDB64)]);
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d')!;
      const gray = (img: HTMLImageElement) => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const d = ctx.getImageData(0, 0, width, height).data;
        const g = new Float32Array(width * height);
        for (let i = 0; i < width * height; i++) g[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
        return g;
      };
      const corr = (a: Float32Array, b: Float32Array) => {
        let ma = 0, mb = 0;
        for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; }
        ma /= a.length; mb /= b.length;
        let num = 0, da = 0, db = 0;
        for (let i = 0; i < a.length; i++) {
          const x = a[i] - ma, y = b[i] - mb;
          num += x * y; da += x * x; db += y * y;
        }
        return num / Math.sqrt(da * db);
      };
      const gw = gray(w);
      const gt = gray(t);
      const flipped = new Float32Array(gt.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) flipped[y * width + x] = gt[(height - 1 - y) * width + x];
      }
      const simNormal = corr(gw, gt);
      const simFlipped = corr(gw, flipped);
      return { simNormal, simFlipped };
    },
    { webglB64: webgl.toString('base64'), twoDB64: twoD.toString('base64'), width: 800, height: 480 },
  );

  console.log(
    `orientation: WebGL vs 2D corr=${result.simNormal.toFixed(4)}, WebGL vs flipped-2D corr=${result.simFlipped.toFixed(4)}`,
  );
  expect(result.simNormal).toBeGreaterThan(result.simFlipped);
});

import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Gameplay-action breadth (GOAL G3). Captures authentic mid-combat frames from the
 * python driver (tools/capture_beatstreets_frame.py --press/--hold) and replays the
 * IDENTICAL schedule through the web stage entry (stage.html?press=&hold=&freeze=).
 *
 * HARD since 010: the combat simulation is BIT-EXACT with python — the full randint
 * stream matches for both schedules (asserted full-stream by
 * src/game/action-parity.test.ts against the committed python traces) — and the
 * rendering matches: measured diffs 0.72%/0.80% are at the stage-1 dithering baseline
 * (0.73%). Root causes fixed along the way: JS `in`-on-array hit-frame check
 * (indices vs python's value membership; landed every hit on frame 0) and the
 * draw-order sort dropping get_draw_order_offset (player drawn under same-y enemies).
 *
 * HARD threshold ≤1.5%: derived exactly like the stage gate — measured value
 * (~0.8%) plus documented headroom (the stage gate uses the same derivation:
 * 0.73% measured → ≤1.5%).
 */

const REFERENCE = resolve(__dirname, 'reference');
const OUT_DIR = resolve(__dirname, 'screenshots');
const WIDTH = 800;
const HEIGHT = 480;
const CHANNEL_THRESHOLD = 8;
// HARD: measured 0.72%/0.80% (stage-1 dithering baseline) + documented headroom,
// same derivation as the stage gate (0.73% measured → ≤1.5%).
const MAX_ACTION_DIFF_FRACTION = 0.015;

/** Action-gate metric table, written to fidelity-action-metrics.json for the
 *  `npm run fidelity` report. */
const METRICS: Record<string, { fraction: number; threshold: number; status: string }> = {};
const METRICS_OUT = resolve(OUT_DIR, 'fidelity-action-metrics.json');

test.afterAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(METRICS_OUT, JSON.stringify({ generated_at: new Date().toISOString(), gates: METRICS }, null, 2));
  console.log(`fidelity-action metrics written to ${METRICS_OUT}`);
});

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

/**
 * Drive the stage entry through title -> controls -> play, let the intro text play
 * out, skip it, then wait for the frame-exact freeze. Mirrors the python driver's
 * flow (tools/capture_beatstreets_frame.py --skip-intro).
 */
async function driveToFreeze(page: import('@playwright/test').Page, url: string) {
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });
  await page.goto(url);
  const canvas = page.locator('canvas[aria-label^="Beat Streets game"]');
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await expect(canvas).toHaveCSS('width', `${WIDTH}px`);
  await expect(canvas).toHaveCSS('height', `${HEIGHT}px`);
  await page.keyboard.press('Space');
  await page.waitForSelector('[data-scene="controls"]', { timeout: 15000 });
  await page.keyboard.press('Space');
  await page.waitForSelector('[data-scene="play"]', { timeout: 15000 });
  await page.waitForSelector('[data-intro-complete="1"]', { timeout: 25000 });
  await page.keyboard.press('Space');
  await page.waitForSelector('[data-frozen="1"]', { timeout: 40000 });
  return canvas;
}

/**
 * Informational action-frame gate: replay the schedule, capture, diff against the
 * python reference, log the metric + blocker, and assert only the structural bound.
 */
async function assertActionFrame(
  page: import('@playwright/test').Page,
  url: string,
  refPath: string,
  outPath: string,
  label: string,
) {
  const canvas = await driveToFreeze(page, url);
  const shot = await canvas.screenshot();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(outPath, shot);
  const ref = readFileSync(refPath);
  const diff = await pixelDiff(page, shot, ref);
  METRICS[label] = { fraction: diff.fraction, threshold: MAX_ACTION_DIFF_FRACTION, status: 'HARD' };
  console.log(
    `fidelity-action ${label} diff: ${(diff.fraction * 100).toFixed(2)}% pixels differ (${diff.diffPixels}/${diff.total}, threshold ${CHANNEL_THRESHOLD}/channel)`,
  );
  console.log(`fidelity-action ${label} diff: ${(diff.fraction * 100).toFixed(2)}% pixels differ (HARD gate <= 1.50%)`);
  expect(diff.fraction).toBeLessThanOrEqual(MAX_ACTION_DIFF_FRACTION);
}

test('enemy attack on hero (hero in hit animation) — HARD', async ({ page }) => {
  // Python: --state play --skip-intro --frames-to-play 290 --seed 1 --hold right:0:290
  // The enemy (vax) walks in and attacks; the hit lands. The python driver captures at
  // game timer 544 (live frame 289 — the loop breaks when gameplay_frames >= 290, so
  // the last processed live frame is 289). Freeze at timer 544 to match the reference.
  await assertActionFrame(
    page,
    '/stage.html?seed=1&freeze=544&hold=right:0:290',
    resolve(REFERENCE, 'beatstreets-action-enemyattack.png'),
    resolve(OUT_DIR, 'fidelity-action-enemyattack.png'),
    'enemyattack',
  );
});

test('hero punch connecting (hero in punch animation, enemy hit) — HARD', async ({ page }) => {
  // Python: --state play --skip-intro --frames-to-play 185 --seed 1 --hold right:0:180
  // --press 180:0. The hero walks to the enemy and punches; the punch connects. The
  // python driver captures at game timer 439 (live frame 184). Freeze at timer 439.
  await assertActionFrame(
    page,
    '/stage.html?seed=1&freeze=439&hold=right:0:180&press=180:0',
    resolve(REFERENCE, 'beatstreets-action-heropunch.png'),
    resolve(OUT_DIR, 'fidelity-action-heropunch.png'),
    'heropunch',
  );
});

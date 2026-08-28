import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Weapon-mechanics breadth (012). Captures the authentic stick path from the python
 * driver — kill the stage-5 EnemyHoodie (placed at punch range via the driver's
 * --stage 5 --place 700:420 hooks), it drops a Stick on death (randint(0,2)==0 with
 * seed 1), the scheduled press at live 627 picks it up (button-gated, 50px radius),
 * the pickup animation plays (min(frame//12, end_pickup_frame)), and the press at
 * live 669 swings it (ATTACKS['stick']).
 *
 * The web replays the IDENTICAL schedule through stage.html?stage=5&place=700:420
 * (jumpToStage applied one full update after the intro skip, timer untouched — the
 * exact counterpart of the driver's post-update hook).
 *
 * These gates run in `npm run fidelity` + CI (not precommit — a ~950-frame replay is
 * ~60s per capture). HARD threshold <=1.5%: same derivation as the stage gate
 * (dithering baseline ~0.73% + headroom).
 *
 * STATUS 012: SKIPPED — the schedule replay is NOT yet bit-exact. The web's hoodie
 * fight diverges by ±2 live frames in the first fall/get-up cycle (root cause below
 * the get-up logic, which is identical: frame>120 FALLING, frame>20 GETTING_UP,
 * move_towards identical). The RNG stream matches python for the first 302/354 draws
 * then the web consumes 2 extra back-off draws (its in-range window is 2 frames
 * longer). Measured diffs 24.19%/12.29%/11.01%. This is the 013 opening item: pin the
 * per-frame player attackTimer + hoodie fall frame against the driver's --trace-enemy
 * playerstate rows (added in 012) and find the ±2-frame source in the hit/fall cycle.
 * The python reference PNGs + RNG trace are committed and verified
 * (the --trace-rng run reproduces byte-identical PNGs).
 *
 * Reference md5s (recorded at capture; regenerate ONLY via the driver — see
 * docs/FIDELITY.md; the trace run (with --trace-rng) produces byte-identical PNGs):
 *   beatstreets-weapon-pickup.png      b8998b3ac1f68429c59e025a8a05bee9 (timer 882, live 627)
 *   beatstreets-weapon-pickup-anim.png e15f2596f216a44656a4c51b88f36305 (timer 894, live 639)
 *   beatstreets-weapon-swing.png       9e4cf03738aeff8f26af282d0931bb01 (timer 926, live 671)
 */

const REFERENCE = resolve(__dirname, 'reference');
const OUT_DIR = resolve(__dirname, 'screenshots');
const WIDTH = 800;
const HEIGHT = 480;
const CHANNEL_THRESHOLD = 8;
const MAX_WEAPON_DIFF_FRACTION = 0.015;

// The shared action schedule (mirrors the driver's --hold left:0:4 + 35 presses):
// turn the player to face the approaching hoodie, then a punch every 18 live frames.
// The hoodie dies at live 626, the stick drops (roll 0), the press at 627 picks it
// up, the pickup animation runs to ~658, the press at 669 swings.
const PRESSES = Array.from({ length: 35 }, (_, i) => `${15 + i * 18}:0`).join(',');
const SCHEDULE = `hold=left:0:4&press=${PRESSES}`;

const METRICS: Record<string, { fraction: number; threshold: number; status: string }> = {};
const METRICS_OUT = resolve(OUT_DIR, 'fidelity-weapon-metrics.json');

test.afterAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(METRICS_OUT, JSON.stringify({ generated_at: new Date().toISOString(), gates: METRICS }, null, 2));
  console.log(`fidelity-weapon metrics written to ${METRICS_OUT}`);
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
 * Drive the stage entry through title -> controls -> play, skip the intro, then wait
 * for the frame-exact freeze. The weapon replay runs ~950 game frames (~60-70s), so
 * the freeze wait is longer than the action spec's.
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
  // The harness auto-skips the intro deterministically at timer 1 (?skip=1 in the
  // url) — the python driver's timing. Do NOT press again here.
  await page.waitForSelector('[data-frozen="1"]', { timeout: 120000 });
  return canvas;
}

async function assertWeaponFrame(
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
  METRICS[label] = { fraction: diff.fraction, threshold: MAX_WEAPON_DIFF_FRACTION, status: 'HARD' };
  console.log(
    `fidelity-weapon ${label} diff: ${(diff.fraction * 100).toFixed(2)}% pixels differ (${diff.diffPixels}/${diff.total}, threshold ${CHANNEL_THRESHOLD}/channel)`,
  );
  expect(diff.fraction).toBeLessThanOrEqual(MAX_WEAPON_DIFF_FRACTION);
}

test('stick on the ground + pickup animation start — HARD', async ({ page }) => {
  // Python: --state play --skip-intro --frames-to-play 882 --seed 1 --stage 5
  // --place 700:420 --hold left:0:4 + 35 presses (live 627 = the pickup press).
  await assertWeaponFrame(
    page,
    `/stage.html?seed=1&freeze=882&skip=1&stage=5&place=700:420&${SCHEDULE}`,
    resolve(REFERENCE, 'beatstreets-weapon-pickup.png'),
    resolve(OUT_DIR, 'fidelity-weapon-pickup.png'),
    'pickup',
  );
});

test('pickup animation mid-frame (pickup_stick sprite) — HARD', async ({ page }) => {
  // Same run, freeze at live 639 (timer 894): the pickup animation is playing
  // (pickup_animation='stick', frame ~12 -> sprite pickup_stick_0).
  await assertWeaponFrame(
    page,
    `/stage.html?seed=1&freeze=894&skip=1&stage=5&place=700:420&${SCHEDULE}`,
    resolve(REFERENCE, 'beatstreets-weapon-pickup-anim.png'),
    resolve(OUT_DIR, 'fidelity-weapon-pickup-anim.png'),
    'pickupanim',
  );
});

test('stick swing (weapon attack sprite) — HARD', async ({ page }) => {
  // Same run, freeze at live 671 (timer 926): the press at 669 started the stick
  // attack (attack frame 2 = hit frame).
  await assertWeaponFrame(
    page,
    `/stage.html?seed=1&freeze=926&skip=1&stage=5&place=700:420&${SCHEDULE}`,
    resolve(REFERENCE, 'beatstreets-weapon-swing.png'),
    resolve(OUT_DIR, 'fidelity-weapon-swing.png'),
    'swing',
  );
});
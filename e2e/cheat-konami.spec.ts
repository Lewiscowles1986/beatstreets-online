import { test, expect } from '@playwright/test';

/**
 * Konami code -> cheat menu, verified frame-stepped through the live harness.
 *
 * The Beat Streets Konami variant (packages/engine/src/core/konami.ts) is
 * UP DOWN LEFT RIGHT LEFT RIGHT A B — fed by edge-detected directions plus the
 * punch (A / button 0 / Z) and kick (B / button 1 / X) presses. Python opens the
 * cheat menu from gameplay (the driver's --cheat flow); the web feeds the tokens
 * in the play scene's update (GameCanvas.handlePlayTokens).
 *
 * HARD structural gate: the full sequence must land on the cheat scene with the
 * cheat-menu canvas visible (the user-reported acceptance: "konami code leads to
 * cheat menu"). Wrong sequences must NOT open it.
 */

const URL = '/stage.html?seed=1&freeze=0'; // freeze=0 -> the LIVE loop (the harness defaults freeze=345)

// The drive waits through the full natural intro teletype (~12s) plus the ~9s
// Konami feed — comfortably over Playwright's default 30s test timeout when the
// suite runs under parallel load (020: both tests flaked to timeout there).
test.setTimeout(90_000);

async function driveToLivePlay(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 800, height: 480 });
  // skip=1 lets the harness auto-press through the intro text: the natural
  // ~730-frame teletype made `data-intro-complete` time out at 25s under
  // parallel worker load (020). Live gameplay = post-skip timer >= 255 (the
  // fade window), which holds under any frame rate.
  await page.goto(`${URL}&skip=1`);
  const canvas = page.locator('canvas[aria-label^="Beat Streets game"]');
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await page.keyboard.press('Space');
  await page.waitForSelector('[data-scene="controls"]', { timeout: 15000 });
  await page.keyboard.press('Space');
  await page.waitForSelector('[data-scene="play"]', { timeout: 15000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-timer]');
    return (
      el !== null &&
      Number(el.getAttribute('data-timer')) >= 255 &&
      el.getAttribute('data-text-active') === null
    );
  }, { timeout: 60000 });
  return canvas;
}

async function feedSequence(page: import('@playwright/test').Page, keys: string[]) {
  // Hold each key across at least one rAF update: a bare press (down+up in ~2ms)
  // can land entirely between two updates and be missed by the edge detectors.
  for (const k of keys) {
    await page.keyboard.down(k);
    await page.waitForTimeout(60);
    await page.keyboard.up(k);
    await page.waitForTimeout(30);
  }
}

test('Konami code opens the cheat menu during play — HARD', async ({ page }) => {
  await driveToLivePlay(page);
  // UP DOWN LEFT RIGHT LEFT RIGHT A(Z) B(X)
  await feedSequence(page, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', ' ', 'x']);
  await page.waitForSelector('[data-scene="cheat"]', { timeout: 5000 });
  await expect(page.locator('canvas[aria-label="Cheat menu"]')).toBeVisible();
});

test('wrong Konami sequence does not open the cheat menu — HARD', async ({ page }) => {
  await driveToLivePlay(page);
  // The classic NES variant (up up down down ...) is NOT the Beat Streets sequence.
  await feedSequence(page, ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', ' ', 'x']);
  // The game keeps playing (no cheat scene) — the punch/kick presses may act but the
  // scene must remain 'play'.
  await page.waitForTimeout(400);
  await expect(page.locator('[data-scene="cheat"]')).toHaveCount(0);
  await expect(page.locator('[data-scene="play"]')).toBeVisible();
});
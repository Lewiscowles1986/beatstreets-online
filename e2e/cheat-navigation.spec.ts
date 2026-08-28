import { test, expect } from '@playwright/test';

/**
 * Cheat-menu + pause-menu keyboard navigation — HARD regression gate.
 *
 * The user-reported defects (round 020): the cheat menu and its stage select did
 * not respond to UP/DOWN at all (rawPressed's self-mutating `prev` set swallowed
 * every real press after the first poll), ESC did not leave the cheat menu, and
 * confirming a stage in STAGE SELECT silently did nothing (the mode was flipped
 * back to 'menu' before the caller's `selectedItem === null` check could fire).
 *
 * This gate pins the fixed behaviour end-to-end through the real input pipeline:
 *   * UP/DOWN move (and wrap) the cheat cursor; ESC closes back to play.
 *   * STAGE SELECT: UP/DOWN pick a stage (clamped at the minimum), SPACE jumps
 *     and returns to play, X backs out to the menu.
 *   * GOD MODE toggles from the menu.
 *   * The pause menu (same rawPressed path) moves its cursor with UP/DOWN and
 *     ESC resumes.
 */

const URL = '/stage.html?seed=1&freeze=0&skip=1'; // freeze=0 -> the LIVE loop; skip=1 auto-presses through the intro

// Menu navigation feeds ~10 keys at ~90ms each plus waits — keep well clear of
// Playwright's default 30s test timeout.
test.setTimeout(90_000);

async function driveToLivePlay(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 800, height: 480 });
  await page.goto(URL);
  const canvas = page.locator('canvas[aria-label^="Beat Streets game"]');
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await page.keyboard.press('Space');
  await page.waitForSelector('[data-scene="controls"]', { timeout: 15000 });
  await page.keyboard.press('Space');
  await page.waitForSelector('[data-scene="play"]', { timeout: 15000 });
  // ?skip=1 presses through the intro text; the post-skip fade then runs 255
  // frames (timer 0..254). Live gameplay = timer >= 255 — the menu gates below
  // operate on real play state either way, but waiting keeps the run uniform.
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-timer]');
    return el !== null && Number(el.getAttribute('data-timer')) >= 255;
  }, { timeout: 30000 });
  return canvas;
}

async function feedSequence(page: import('@playwright/test').Page, keys: string[]) {
  // Hold each key across at least one rAF update (a bare press can land entirely
  // between two updates and be missed by the edge detectors).
  for (const k of keys) {
    await page.keyboard.down(k);
    await page.waitForTimeout(60);
    await page.keyboard.up(k);
    await page.waitForTimeout(30);
  }
}

test('cheat menu: UP/DOWN navigate + wrap, ESC closes — HARD', async ({ page }) => {
  await driveToLivePlay(page);
  // UP DOWN LEFT RIGHT LEFT RIGHT A(Z) B(X) -> cheat menu
  await feedSequence(page, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', ' ', 'x']);
  await page.waitForSelector('[data-scene="cheat"]', { timeout: 5000 });
  await expect(page.locator('canvas[aria-label="Cheat menu"]')).toBeVisible();
  await expect(page.locator('[data-cheat-cursor="0"]')).toBeVisible();
  await expect(page.locator('[data-cheat-mode="menu"]')).toBeVisible();

  // DOWN moves 0 -> 1 -> 2 -> wraps to 0; UP wraps back to 2.
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-cheat-cursor="1"]')).toBeVisible({ timeout: 2000 });
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-cheat-cursor="2"]')).toBeVisible({ timeout: 2000 });
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-cheat-cursor="0"]')).toBeVisible({ timeout: 2000 });
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-cheat-cursor="2"]')).toBeVisible({ timeout: 2000 });

  // ESC leaves the cheat menu back to gameplay.
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-scene="play"]', { timeout: 5000 });
});

test('cheat menu: GOD MODE toggles from the menu — HARD', async ({ page }) => {
  await driveToLivePlay(page);
  await feedSequence(page, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', ' ', 'x']);
  await page.waitForSelector('[data-scene="cheat"]', { timeout: 5000 });
  await page.keyboard.press('ArrowDown'); // GOD MODE
  await page.keyboard.press('Space'); // toggle ON
  await expect(page.locator('[data-god-mode="1"]')).toBeVisible({ timeout: 2000 });
  // The menu stays open on a toggle (only a stage pick closes it).
  await expect(page.locator('[data-scene="cheat"]')).toBeVisible();
  await page.keyboard.press('Space'); // toggle OFF again
  await expect(page.locator('[data-god-mode="1"]')).toHaveCount(0, { timeout: 2000 });
});

test('stage select: UP/DOWN pick, SPACE jumps back to play, X backs out — HARD', async ({ page }) => {
  await driveToLivePlay(page);
  await feedSequence(page, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', ' ', 'x']);
  await page.waitForSelector('[data-scene="cheat"]', { timeout: 5000 });
  await page.keyboard.press('Space'); // STAGE SELECT
  await expect(page.locator('[data-cheat-mode="stage-select"]')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('[data-cheat-stage="1"]')).toBeVisible();

  // UP increments, DOWN decrements and clamps at the minimum stage.
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-cheat-stage="2"]')).toBeVisible({ timeout: 2000 });
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-cheat-stage="1"]')).toBeVisible({ timeout: 2000 });
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-cheat-stage="1"]')).toBeVisible({ timeout: 2000 }); // clamped

  // X (button 1) backs out to the menu without jumping.
  await page.keyboard.press('x');
  await expect(page.locator('[data-cheat-mode="menu"]')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('[data-scene="cheat"]')).toBeVisible();

  // SPACE on a picked stage jumps straight there and resumes play (the old bug:
  // the confirm was swallowed and the menu just stayed open).
  await page.keyboard.press('Space'); // enter stage select
  await expect(page.locator('[data-cheat-mode="stage-select"]')).toBeVisible({ timeout: 2000 });
  await page.keyboard.press('ArrowUp'); // stage 2
  await page.keyboard.press('Space'); // JUMP
  await page.waitForSelector('[data-scene="play"]', { timeout: 5000 });
});

test('pause menu: UP/DOWN move cursor, ESC resumes — HARD', async ({ page }) => {
  await driveToLivePlay(page);
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-scene="pause"]', { timeout: 5000 });
  await expect(page.locator('[data-pause-cursor="0"]')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-pause-cursor="1"]')).toBeVisible({ timeout: 2000 });
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-pause-cursor="0"]')).toBeVisible({ timeout: 2000 });
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-scene="play"]', { timeout: 5000 });
});
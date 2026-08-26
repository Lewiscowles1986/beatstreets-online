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

import { test, expect } from '@playwright/test';

/**
 * End-to-end smoke test against the built static bundle (npm run build then serve).
 * Confirms the app boots, the DSL loads, and the spec overview renders.
 */
test('app loads and shows game spec', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Beat Streets — Web' })).toBeVisible();
  await expect(page.locator('dl.spec')).toBeVisible();
  await expect(page.locator('dl.spec dd').first()).toContainText('Beat Streets');
  await expect(page.locator('dl.spec')).toContainText('29'); // stages
  await expect(page.locator('dl.spec')).toContainText('1368'); // sprites
});

import { test, expect } from '@playwright/test';

/**
 * Screenshot stories: render Storybook stories and capture PNGs so the component
 * library is visually verified and documented. Run with: npm run e2e:screenshot
 * (requires the Storybook build served on STORYBOOK_URL).
 *
 * Storybook single-story URL: ?path=/story/<story-id>
 */
const STORIES: Array<{ id: string; file: string }> = [
  { id: 'game-specoverview--loaded-spec', file: 'spec-overview.png' },
  { id: 'game-stageview--stage-one', file: 'stage-one.png' },
  { id: 'game-stageview--stage-three-boss', file: 'stage-three-boss.png' },
  { id: 'game-stageview--stage-fourteen-portal', file: 'stage-fourteen-portal.png' },
  { id: 'game-hud--full-health', file: 'hud-full-health.png' },
  { id: 'game-hud--low-health', file: 'hud-low-health.png' },
  { id: 'game-stagelist--first-five-stages', file: 'stagelist-first-five.png' },
  { id: 'game-stagelist--late-game-stages', file: 'stagelist-late-game.png' },
  { id: 'game-konamipanel--default-keyboard', file: 'konami-panel.png' },
];

for (const story of STORIES) {
  test(`screenshot: ${story.id}`, async ({ page }) => {
    await page.goto(`/?path=/story/${story.id}`);
    // Wait for the Storybook preview iframe to finish loading its story.
    const frame = page.frameLocator('iframe').first();
    await frame.locator('body').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1200);
    // Capture the whole page (story content + Storybook chrome).
    const shot = await page.screenshot({ path: `e2e/screenshots/${story.file}` });
    expect(shot.length).toBeGreaterThan(1000);
  });
}

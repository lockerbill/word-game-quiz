import { expect, test } from '@playwright/test';

test('shows friendly error and retry when game api is unavailable', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.abort();
  });

  await page.goto('/');

  await expect(page.getByText('Game Modes')).toBeVisible();

  await page.getByText('Practice', { exact: true }).click();
  await expect(page).toHaveURL(/\/game\/practice/);
  await expect(page.getByText('Server unavailable')).toBeVisible();
  await expect(page.getByText('Retry', { exact: true })).toBeVisible();
});

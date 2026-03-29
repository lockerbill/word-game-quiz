import { expect, test, type Page } from '@playwright/test';

async function finishRoundIfNeeded(page: Page) {
  const finishButton = page.getByText(/FINISH/).first();
  try {
    await finishButton.waitFor({ state: 'visible', timeout: 5_000 });
    await finishButton.click();
  } catch {
    // Some runs can already be on results from a previous in-memory state.
  }
}

test('home to results works with offline fallback', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.abort();
  });

  await page.goto('/');

  await expect(page.getByText('Game Modes')).toBeVisible();

  await page.getByText('Practice', { exact: true }).click();
  await expect(page).toHaveURL(/\/game\/(practice|results)/);
  await finishRoundIfNeeded(page);

  await expect(page).toHaveURL(/\/game\/results/);
  await expect(page.getByText('Answer Breakdown')).toBeVisible();
  await expect(
    page.getByText('Offline fallback: showing local validation'),
  ).toBeVisible();
});

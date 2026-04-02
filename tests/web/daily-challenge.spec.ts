import { expect, test } from '@playwright/test';

test('home banner uses server daily challenge letter', async ({ page }) => {
  await page.route('**/api/game/daily', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        letter: 'Q',
        categories: [
          { id: 1, name: 'Animal', emoji: '🐾', difficulty: 1 },
          { id: 2, name: 'City', emoji: '🏙️', difficulty: 1 },
        ],
        date: '2026-03-29',
      }),
    });
  });

  await page.route('**/api/**', async (route) => {
    if (route.request().url().includes('/api/game/daily')) {
      await route.fallback();
      return;
    }
    await route.abort();
  });

  await page.goto('/');

  await expect(page.getByText("Today's Challenge")).toBeVisible();
  await expect(page.getByText('Letter: Q')).toBeVisible();
});

test('daily banner shows unavailable state and retry without local fallback', async ({ page }) => {
  await page.route('**/api/game/daily', async (route) => {
    await route.abort();
  });

  await page.route('**/api/**', async (route) => {
    if (route.request().url().includes('/api/game/daily')) {
      await route.fallback();
      return;
    }
    await route.abort();
  });

  await page.goto('/');

  await expect(page.getByText('Daily Unavailable')).toBeVisible();
  await expect(page.getByText('Please try again in a moment.')).toBeVisible();
  await expect(page.getByText('Retry Daily')).toBeVisible();
});

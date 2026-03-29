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

test('shows server-validated results when submit succeeds', async ({ page }) => {
  await page.route('**/api/game/daily', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        letter: 'S',
        categories: [
          { id: 1, name: 'Animal', emoji: '🐾', difficulty: 1 },
          { id: 2, name: 'City', emoji: '🏙️', difficulty: 1 },
        ],
        date: '2026-03-29',
      }),
    });
  });

  await page.route('**/api/game/start', async (route) => {
    const requestData = route.request().postDataJSON() as { mode?: string };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        gameId: 'test-game-1',
        letter: requestData.mode === 'daily' ? 'S' : 'B',
        categories: [
          { id: 1, name: 'Animal', emoji: '🐾', difficulty: 1 },
          { id: 2, name: 'City', emoji: '🏙️', difficulty: 1 },
        ],
        timerDuration: 30,
      }),
    });
  });

  await page.route('**/api/game/submit', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        gameId: 'test-game-1',
        score: {
          correctCount: 2,
          totalQuestions: 2,
          rawScore: 2,
          multiplier: 1,
          finalScore: 2,
          xpEarned: 20,
          timeBonus: 0,
          perfectBonus: false,
        },
        validations: [
          {
            categoryId: 1,
            categoryName: 'Animal',
            answer: 'Bear',
            valid: true,
            confidence: 1,
          },
          {
            categoryId: 2,
            categoryName: 'City',
            answer: 'Berlin',
            valid: true,
            confidence: 1,
          },
        ],
      }),
    });
  });

  await page.goto('/');

  await page.getByText('Practice', { exact: true }).click();
  await expect(page).toHaveURL(/\/game\/(practice|results)/);
  await finishRoundIfNeeded(page);
  await expect(page).toHaveURL(/\/game\/results/);
  await expect(page.getByText('Server-validated results')).toBeVisible();
});

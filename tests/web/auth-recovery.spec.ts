import { expect, test } from '@playwright/test';

test('recovers guest session for daily banner after 401', async ({ page }) => {
  let dailyCalls = 0;

  await page.route('**/api/auth/guest', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: `guest-token-${Date.now()}`,
        user: {
          id: 'guest-id',
          username: 'Guest_Test',
          email: null,
          isGuest: true,
          avatar: 'avatar_1',
          level: 1,
          xp: 0,
          gamesPlayed: 0,
          bestScore: 0,
        },
      }),
    });
  });

  await page.route('**/api/game/daily', async (route) => {
    dailyCalls += 1;
    if (dailyCalls === 1) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
      return;
    }

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

  await page.goto('/');

  await expect(page.getByText("Today's Challenge")).toBeVisible();
  await expect(page.getByText('Letter: Q')).toBeVisible();
});

test('recovers guest session for game start after 401', async ({ page }) => {
  let startCalls = 0;

  await page.route('**/api/auth/guest', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: `guest-token-${Date.now()}`,
        user: {
          id: 'guest-id',
          username: 'Guest_Test',
          email: null,
          isGuest: true,
          avatar: 'avatar_1',
          level: 1,
          xp: 0,
          gamesPlayed: 0,
          bestScore: 0,
        },
      }),
    });
  });

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
    startCalls += 1;
    if (startCalls === 1) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        gameId: 'test-game-401-retry',
        letter: 'B',
        categories: [
          { id: 1, name: 'Animal', emoji: '🐾', difficulty: 1 },
          { id: 2, name: 'City', emoji: '🏙️', difficulty: 1 },
        ],
        timerDuration: 30,
      }),
    });
  });

  await page.goto('/');

  await page.getByText('Practice', { exact: true }).click();
  await expect(page).toHaveURL(/\/game\/practice/);
  await expect(page.getByText('Question 1 of 2')).toBeVisible();
});

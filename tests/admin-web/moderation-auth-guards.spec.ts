import { expect, test } from '@playwright/test';

test('forbidden role is redirected to login with permission message', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('alpha_bucks_admin_token', 'test-admin-token');
  });

  await page.route('**/api/admin/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        username: 'player-only',
        email: 'player@example.com',
        role: 'player',
        accountStatus: 'active',
      }),
    });
  });

  await page.goto('/moderation');

  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByText('Your account no longer has permission to access admin routes.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Admin Sign In' })).toBeVisible();
  await expect(page.getByText('Session Moderation')).not.toBeVisible();
});

test('expired session is redirected to login with expiration message', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('alpha_bucks_admin_token', 'expired-token');
  });

  await page.route('**/api/admin/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Unauthorized',
        statusCode: 401,
      }),
    });
  });

  await page.goto('/moderation');

  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByText('Your admin session expired. Please sign in again.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Admin Sign In' })).toBeVisible();
  await expect(page.getByText('Session Moderation')).not.toBeVisible();
});

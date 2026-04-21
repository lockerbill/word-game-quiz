import { expect, test } from '@playwright/test';

type ModerationDecision = 'reviewed' | 'flagged';

interface ModerationHistoryEntry {
  id: string;
  decision: ModerationDecision;
  reason: string;
  createdAt: string;
  reviewer: {
    id: string;
    username: string;
  };
}

test('admin can review then flag a session and metrics refresh', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('alpha_bucks_admin_token', 'test-admin-token');
  });

  let latestDecision: ModerationDecision | null = null;
  const moderationHistory: ModerationHistoryEntry[] = [];

  const metricsPayload = () => ({
    queueUnreviewedTotal: latestDecision ? 0 : 1,
    queueFlaggedTotal: latestDecision === 'flagged' ? 1 : 0,
    reviewedLast24h: moderationHistory.length,
    staleUnreviewed24h: latestDecision ? 0 : 1,
    medianFirstReviewMinutes: moderationHistory.length > 0 ? 12 : null,
    computedAt: '2026-04-21T10:00:00.000Z',
  });

  await page.route('**/api/admin/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        accountStatus: 'active',
      }),
    });
  });

  await page.route('**/api/admin/sessions**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;

    if (method === 'GET' && path.endsWith('/api/admin/sessions/metrics')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(metricsPayload()),
      });
      return;
    }

    if (method === 'GET' && path.endsWith('/api/admin/sessions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1,
          limit: 20,
          total: 1,
          data: [
            {
              id: 'c5d9b756-9d63-4f7d-9799-0ed23d36aa26',
              mode: 'ranked',
              letter: 'B',
              score: 100,
              correctCount: 10,
              timeUsed: 3,
              xpEarned: 120,
              createdAt: '2026-04-20T08:00:00.000Z',
              player: {
                id: 'player-1',
                username: 'alice',
                email: 'alice@example.com',
              },
              suspicionIndicators: ['very_fast_high_accuracy'],
              latestModeration: latestDecision
                ? {
                    id: `mod-${moderationHistory.length}`,
                    decision: latestDecision,
                    reason: moderationHistory[0]?.reason ?? 'No reason',
                    createdAt:
                      moderationHistory[0]?.createdAt ??
                      '2026-04-21T09:00:00.000Z',
                    reviewer: {
                      id: 'admin-1',
                      username: 'admin',
                    },
                  }
                : null,
            },
          ],
        }),
      });
      return;
    }

    if (method === 'POST' && path.endsWith('/review')) {
      const payload = request.postDataJSON() as {
        decision: ModerationDecision;
        reason: string;
      };

      latestDecision = payload.decision;
      moderationHistory.unshift({
        id: `review-${moderationHistory.length + 1}`,
        decision: payload.decision,
        reason: payload.reason,
        createdAt: '2026-04-21T09:00:00.000Z',
        reviewer: {
          id: 'admin-1',
          username: 'admin',
        },
      });

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: moderationHistory[0].id,
          gameId: 'c5d9b756-9d63-4f7d-9799-0ed23d36aa26',
          decision: payload.decision,
          reason: payload.reason,
          createdAt: moderationHistory[0].createdAt,
          reviewer: {
            id: 'admin-1',
            username: 'admin',
          },
        }),
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'c5d9b756-9d63-4f7d-9799-0ed23d36aa26',
          mode: 'ranked',
          letter: 'B',
          score: 100,
          correctCount: 10,
          multiplier: 1,
          timeUsed: 3,
          xpEarned: 120,
          createdAt: '2026-04-20T08:00:00.000Z',
          player: {
            id: 'player-1',
            username: 'alice',
            email: 'alice@example.com',
          },
          suspicionIndicators: ['very_fast_high_accuracy'],
          answers: [
            {
              id: 1,
              categoryId: 1,
              categoryName: 'Animal',
              answer: 'Bear',
              valid: true,
              confidence: 1,
            },
          ],
          moderationHistory,
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto('/moderation');
  await expect(page).toHaveURL(/\/moderation/);
  await expect(page.getByText('24h Queue Health')).toBeVisible();
  await expect(page.getByText('Unreviewed Queue')).toBeVisible();
  await expect(
    page
      .locator('.metric-card')
      .filter({ hasText: 'Unreviewed Queue' })
      .getByText('1', { exact: true }),
  ).toBeVisible();

  page.once('dialog', async (dialog) => {
    await dialog.accept('Manual review completed for baseline check');
  });
  await page.getByRole('button', { name: 'Mark Reviewed' }).click();

  await expect(page.getByText('Session marked as reviewed.')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'reviewed' })).toBeVisible();
  await expect(page.getByText('Reviews in 24h')).toBeVisible();

  page.once('dialog', async (dialog) => {
    await dialog.accept('Escalate for suspicious fast completion pattern');
  });
  await page.getByRole('button', { name: 'Flag Session' }).click();

  await expect(page.getByText('Session flagged for follow-up.')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'flagged' })).toBeVisible();
  await expect(
    page.getByText('Escalate for suspicious fast completion pattern'),
  ).toBeVisible();
  await expect(page.getByText('Flagged (Latest)')).toBeVisible();
});

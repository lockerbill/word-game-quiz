import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AdminAuditLogService } from '../admin/admin-audit-log.service';
import { Category } from '../entities/category.entity';
import { Game } from '../entities/game.entity';
import { SessionModerationReview } from '../entities/session-moderation-review.entity';
import { AdminSessionModerationService } from './admin-session-moderation.service';

describe('AdminSessionModerationService', () => {
  const buildGame = (overrides?: Partial<Game>): Game => ({
    id: overrides?.id ?? 'game-1',
    userId: overrides?.userId ?? 'user-1',
    user: overrides?.user,
    mode: overrides?.mode ?? 'ranked',
    letter: overrides?.letter ?? 'B',
    score: overrides?.score ?? 100,
    correctCount: overrides?.correctCount ?? 10,
    multiplier: overrides?.multiplier ?? 1,
    timeUsed: overrides?.timeUsed ?? 3,
    xpEarned: overrides?.xpEarned ?? 100,
    answers: overrides?.answers ?? [],
    createdAt: overrides?.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
  });

  const buildService = () => {
    const gameStore = new Map<string, Game>();
    const reviewStore: SessionModerationReview[] = [];

    const metricsQuery = jest.fn().mockResolvedValue([
      {
        queue_unreviewed_total: '0',
        queue_flagged_total: '0',
        reviewed_last_24h: '0',
        stale_unreviewed_24h: '0',
        median_first_review_minutes: null,
      },
    ]);

    const gameRepo = {
      findOne: jest.fn(({ where }: { where: { id?: string } }) => {
        if (!where.id) return null;
        return gameStore.get(where.id) ?? null;
      }),
      createQueryBuilder: jest.fn(() => {
        const qb = {
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          offset: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };
        return qb;
      }),
      query: metricsQuery,
    } as unknown as Repository<Game>;

    const categoryRepo = {
      find: jest.fn().mockResolvedValue([] as Category[]),
    } as unknown as Repository<Category>;

    const moderationReviewRepo = {
      find: jest
        .fn()
        .mockImplementation(({ where }: { where: { gameId?: string } }) => {
          if (typeof where.gameId === 'string') {
            return reviewStore
              .filter((item) => item.gameId === where.gameId)
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          }
          return [...reviewStore].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        }),
      findOne: jest
        .fn()
        .mockImplementation(
          ({ where }: { where: { gameId?: string; id?: string } }) => {
            if (where.id) {
              return reviewStore.find((item) => item.id === where.id) ?? null;
            }
            if (where.gameId) {
              return (
                reviewStore
                  .filter((item) => item.gameId === where.gameId)
                  .sort(
                    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
                  )[0] ?? null
              );
            }
            return null;
          },
        ),
      create: jest.fn((payload: Partial<SessionModerationReview>) => payload),
      save: jest.fn((payload: Partial<SessionModerationReview>) => {
        const row = {
          id: payload.id ?? `review-${reviewStore.length + 1}`,
          gameId: payload.gameId ?? 'game-1',
          reviewerUserId: payload.reviewerUserId ?? 'admin-1',
          reviewerUser: payload.reviewerUser ?? null,
          decision: payload.decision ?? 'reviewed',
          reason: payload.reason ?? 'Reason',
          metadata: payload.metadata ?? null,
          createdAt: payload.createdAt ?? new Date(),
          game: payload.game,
        } as SessionModerationReview;
        reviewStore.push(row);
        return row;
      }),
    } as unknown as Repository<SessionModerationReview>;

    const logMutation = jest.fn();
    const auditService = { logMutation } as unknown as AdminAuditLogService;

    const service = new AdminSessionModerationService(
      gameRepo,
      categoryRepo,
      moderationReviewRepo,
      auditService,
    );

    return {
      service,
      gameStore,
      reviewStore,
      logMutation,
      metricsQuery,
    };
  };

  it('records review decision and writes admin audit log', async () => {
    const { service, gameStore, logMutation } = buildService();
    gameStore.set('game-1', buildGame({ id: 'game-1' }));

    const result = await service.reviewSession(
      { id: 'admin-1', role: 'admin' },
      'game-1',
      {
        decision: 'flagged',
        reason: 'Flagged after manual review of suspicious pattern',
      },
    );

    expect(result.gameId).toBe('game-1');
    expect(result.decision).toBe('flagged');
    expect(logMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-1',
        action: 'game_session.review',
        targetType: 'game_session',
        targetId: 'game-1',
      }),
    );
  });

  it('throws NotFoundException when session does not exist', async () => {
    const { service } = buildService();

    await expect(
      service.getSessionDetail('missing-session-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns moderation metrics mapped to numeric response fields', async () => {
    const { service, metricsQuery } = buildService();
    metricsQuery.mockResolvedValueOnce([
      {
        queue_unreviewed_total: '14',
        queue_flagged_total: '6',
        reviewed_last_24h: '9',
        stale_unreviewed_24h: '5',
        median_first_review_minutes: '67.5',
      },
    ]);

    const metrics = await service.getMetrics();

    expect(metrics.queueUnreviewedTotal).toBe(14);
    expect(metrics.queueFlaggedTotal).toBe(6);
    expect(metrics.reviewedLast24h).toBe(9);
    expect(metrics.staleUnreviewed24h).toBe(5);
    expect(metrics.medianFirstReviewMinutes).toBe(67.5);
    expect(typeof metrics.computedAt).toBe('string');
  });
});

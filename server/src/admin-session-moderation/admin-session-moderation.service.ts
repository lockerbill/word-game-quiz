import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdminAuditLogService } from '../admin/admin-audit-log.service.js';
import { Category } from '../entities/category.entity.js';
import { Game } from '../entities/game.entity.js';
import { SessionModerationReview } from '../entities/session-moderation-review.entity.js';
import type { User } from '../entities/user.entity.js';
import { ListAdminSessionsQueryDto } from './dto/list-admin-sessions-query.dto.js';
import { ReviewAdminSessionDto } from './dto/review-admin-session.dto.js';

interface AdminActor {
  id: string;
  role: User['role'];
}

interface SessionModerationMetricsRow {
  queue_unreviewed_total: string | number;
  queue_flagged_total: string | number;
  reviewed_last_24h: string | number;
  stale_unreviewed_24h: string | number;
  median_first_review_minutes: string | number | null;
}

@Injectable()
export class AdminSessionModerationService {
  constructor(
    @InjectRepository(Game)
    private gameRepo: Repository<Game>,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @InjectRepository(SessionModerationReview)
    private moderationReviewRepo: Repository<SessionModerationReview>,
    private adminAuditLogService: AdminAuditLogService,
  ) {}

  async getMetrics() {
    const rowsUnknown: unknown = await this.gameRepo.query(`
      WITH latest_reviews AS (
        SELECT DISTINCT ON (smr.game_id)
          smr.game_id,
          smr.decision,
          smr.created_at
        FROM session_moderation_reviews smr
        ORDER BY smr.game_id, smr.created_at DESC
      ),
      first_reviews AS (
        SELECT
          smr.game_id,
          MIN(smr.created_at) AS first_reviewed_at
        FROM session_moderation_reviews smr
        GROUP BY smr.game_id
      )
      SELECT
        (
          SELECT COUNT(*)
          FROM games g
          LEFT JOIN latest_reviews lr ON lr.game_id = g.id
          WHERE lr.game_id IS NULL
        ) AS queue_unreviewed_total,
        (
          SELECT COUNT(*)
          FROM latest_reviews lr
          WHERE lr.decision = 'flagged'
        ) AS queue_flagged_total,
        (
          SELECT COUNT(*)
          FROM session_moderation_reviews smr
          WHERE smr.created_at >= NOW() - INTERVAL '24 hours'
        ) AS reviewed_last_24h,
        (
          SELECT COUNT(*)
          FROM games g
          LEFT JOIN latest_reviews lr ON lr.game_id = g.id
          WHERE lr.game_id IS NULL
            AND g.created_at < NOW() - INTERVAL '24 hours'
        ) AS stale_unreviewed_24h,
        (
          SELECT percentile_cont(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (fr.first_reviewed_at - g.created_at)) / 60.0
          )
          FROM games g
          INNER JOIN first_reviews fr ON fr.game_id = g.id
        ) AS median_first_review_minutes
    `);

    const metrics = this.toMetricsRow(rowsUnknown);

    return {
      queueUnreviewedTotal: this.parseCount(metrics.queue_unreviewed_total),
      queueFlaggedTotal: this.parseCount(metrics.queue_flagged_total),
      reviewedLast24h: this.parseCount(metrics.reviewed_last_24h),
      staleUnreviewed24h: this.parseCount(metrics.stale_unreviewed_24h),
      medianFirstReviewMinutes:
        metrics.median_first_review_minutes === null
          ? null
          : Number(metrics.median_first_review_minutes),
      computedAt: new Date().toISOString(),
    };
  }

  async listSessions(query: ListAdminSessionsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(100, query.limit ?? 20);

    if (
      Number.isFinite(query.minScore) &&
      Number.isFinite(query.maxScore) &&
      query.minScore !== undefined &&
      query.maxScore !== undefined &&
      query.minScore > query.maxScore
    ) {
      throw new BadRequestException('minScore cannot be greater than maxScore');
    }

    const qb = this.gameRepo
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.user', 'user')
      .orderBy('game.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        [
          '(LOWER(user.username) LIKE LOWER(:search)',
          "LOWER(COALESCE(user.email, '')) LIKE LOWER(:search)",
          'CAST(game.id AS text) ILIKE :search)',
        ].join(' OR '),
        { search: `%${search}%` },
      );
    }

    if (query.mode) {
      qb.andWhere('game.mode = :mode', { mode: query.mode });
    }

    if (query.dateFrom) {
      qb.andWhere('game.createdAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }

    if (query.dateTo) {
      qb.andWhere('game.createdAt <= :dateTo', {
        dateTo: new Date(query.dateTo),
      });
    }

    if (query.minScore !== undefined) {
      qb.andWhere('game.score >= :minScore', { minScore: query.minScore });
    }

    if (query.maxScore !== undefined) {
      qb.andWhere('game.score <= :maxScore', { maxScore: query.maxScore });
    }

    if (query.decision === 'unreviewed') {
      qb.andWhere(
        'NOT EXISTS (SELECT 1 FROM session_moderation_reviews smr WHERE smr.game_id = game.id)',
      );
    }

    if (query.decision === 'reviewed' || query.decision === 'flagged') {
      qb.andWhere(
        [
          'EXISTS (',
          'SELECT 1 FROM session_moderation_reviews smr',
          'WHERE smr.game_id = game.id',
          'AND smr.decision = :latestDecision',
          'AND smr.id = (',
          'SELECT smr2.id FROM session_moderation_reviews smr2',
          'WHERE smr2.game_id = game.id',
          'ORDER BY smr2.created_at DESC',
          'LIMIT 1',
          ')',
          ')',
        ].join(' '),
        { latestDecision: query.decision },
      );
    }

    const [games, total] = await qb.getManyAndCount();
    const latestReviewByGameId = await this.loadLatestReviewByGameId(
      games.map((game) => game.id),
    );

    return {
      page,
      limit,
      total,
      data: games.map((game) => {
        const latestReview = latestReviewByGameId.get(game.id) ?? null;
        return {
          id: game.id,
          mode: game.mode,
          letter: game.letter,
          score: game.score,
          correctCount: game.correctCount,
          timeUsed: game.timeUsed,
          xpEarned: game.xpEarned,
          createdAt: game.createdAt,
          player: {
            id: game.user?.id ?? game.userId,
            username: game.user?.username ?? 'unknown',
            email: game.user?.email ?? null,
          },
          suspicionIndicators: this.getSuspicionIndicators(game),
          latestModeration: latestReview
            ? {
                id: latestReview.id,
                decision: latestReview.decision,
                reason: latestReview.reason,
                createdAt: latestReview.createdAt,
                reviewer: {
                  id:
                    latestReview.reviewerUser?.id ??
                    latestReview.reviewerUserId,
                  username: latestReview.reviewerUser?.username ?? 'unknown',
                },
              }
            : null,
        };
      }),
    };
  }

  async getSessionDetail(sessionId: string) {
    const game = await this.gameRepo.findOne({
      where: { id: sessionId },
      relations: ['user', 'answers'],
    });
    if (!game) {
      throw new NotFoundException('Session not found');
    }

    const categoryIds = Array.from(
      new Set(game.answers.map((answer) => answer.categoryId)),
    );
    const categories =
      categoryIds.length > 0
        ? await this.categoryRepo.find({ where: { id: In(categoryIds) } })
        : [];
    const categoryNameById = new Map<number, string>(
      categories.map((category) => [category.id, category.name]),
    );

    const moderationHistory = await this.moderationReviewRepo.find({
      where: { gameId: sessionId },
      relations: ['reviewerUser'],
      order: { createdAt: 'DESC' },
    });

    return {
      id: game.id,
      mode: game.mode,
      letter: game.letter,
      score: game.score,
      correctCount: game.correctCount,
      multiplier: game.multiplier,
      timeUsed: game.timeUsed,
      xpEarned: game.xpEarned,
      createdAt: game.createdAt,
      player: {
        id: game.user?.id ?? game.userId,
        username: game.user?.username ?? 'unknown',
        email: game.user?.email ?? null,
      },
      suspicionIndicators: this.getSuspicionIndicators(game, game.answers),
      answers: game.answers
        .slice()
        .sort((a, b) => a.categoryId - b.categoryId)
        .map((answer) => ({
          id: answer.id,
          categoryId: answer.categoryId,
          categoryName: categoryNameById.get(answer.categoryId) ?? null,
          answer: answer.answer,
          valid: answer.valid,
          confidence: answer.confidence,
        })),
      moderationHistory: moderationHistory.map((review) => ({
        id: review.id,
        decision: review.decision,
        reason: review.reason,
        createdAt: review.createdAt,
        reviewer: {
          id: review.reviewerUser?.id ?? review.reviewerUserId,
          username: review.reviewerUser?.username ?? 'unknown',
        },
      })),
    };
  }

  async reviewSession(
    actor: AdminActor,
    sessionId: string,
    dto: ReviewAdminSessionDto,
  ) {
    const game = await this.gameRepo.findOne({ where: { id: sessionId } });
    if (!game) {
      throw new NotFoundException('Session not found');
    }

    const previousReview = await this.moderationReviewRepo.findOne({
      where: { gameId: sessionId },
      order: { createdAt: 'DESC' },
    });

    const review = this.moderationReviewRepo.create({
      gameId: sessionId,
      reviewerUserId: actor.id,
      decision: dto.decision,
      reason: dto.reason,
      metadata: {
        mode: game.mode,
        score: game.score,
        timeUsed: game.timeUsed,
      },
    });
    const saved = await this.moderationReviewRepo.save(review);

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'game_session.review',
      targetType: 'game_session',
      targetId: sessionId,
      reason: dto.reason,
      beforeState: previousReview
        ? {
            decision: previousReview.decision,
            reason: previousReview.reason,
            createdAt: previousReview.createdAt,
          }
        : null,
      afterState: {
        decision: saved.decision,
        reason: saved.reason,
        createdAt: saved.createdAt,
      },
      metadata: {
        moderationReviewId: saved.id,
      },
    });

    const withReviewer = await this.moderationReviewRepo.findOne({
      where: { id: saved.id },
      relations: ['reviewerUser'],
    });

    return {
      id: saved.id,
      gameId: saved.gameId,
      decision: saved.decision,
      reason: saved.reason,
      createdAt: saved.createdAt,
      reviewer: {
        id: withReviewer?.reviewerUser?.id ?? saved.reviewerUserId,
        username: withReviewer?.reviewerUser?.username ?? 'unknown',
      },
    };
  }

  private async loadLatestReviewByGameId(gameIds: string[]) {
    if (gameIds.length === 0) {
      return new Map<string, SessionModerationReview>();
    }

    const reviews = await this.moderationReviewRepo.find({
      where: { gameId: In(gameIds) },
      relations: ['reviewerUser'],
      order: { createdAt: 'DESC' },
    });

    const latestReviewByGameId = new Map<string, SessionModerationReview>();
    for (const review of reviews) {
      if (!latestReviewByGameId.has(review.gameId)) {
        latestReviewByGameId.set(review.gameId, review);
      }
    }

    return latestReviewByGameId;
  }

  private getSuspicionIndicators(
    game: Game,
    answers?: Array<{ confidence: number }>,
  ) {
    const indicators: string[] = [];

    if (game.timeUsed > 0 && game.correctCount >= 8 && game.timeUsed <= 3) {
      indicators.push('very_fast_high_accuracy');
    }

    if (game.correctCount >= 10) {
      indicators.push('perfect_score');
    }

    if (answers && answers.length > 0) {
      const averageConfidence =
        answers.reduce((sum, answer) => sum + answer.confidence, 0) /
        answers.length;
      if (
        averageConfidence >= 0.98 &&
        game.timeUsed > 0 &&
        game.timeUsed <= 5
      ) {
        indicators.push('high_confidence_fast_run');
      }
    }

    return indicators;
  }

  private parseCount(value: string | number | undefined) {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }

    return Math.round(parsed);
  }

  private toMetricsRow(rowsUnknown: unknown): SessionModerationMetricsRow {
    if (!Array.isArray(rowsUnknown)) {
      return {
        queue_unreviewed_total: 0,
        queue_flagged_total: 0,
        reviewed_last_24h: 0,
        stale_unreviewed_24h: 0,
        median_first_review_minutes: null,
      };
    }

    const firstRow = (rowsUnknown as unknown[])[0];
    if (!firstRow || typeof firstRow !== 'object') {
      return {
        queue_unreviewed_total: 0,
        queue_flagged_total: 0,
        reviewed_last_24h: 0,
        stale_unreviewed_24h: 0,
        median_first_review_minutes: null,
      };
    }

    const row = firstRow as Record<string, unknown>;

    return {
      queue_unreviewed_total:
        typeof row.queue_unreviewed_total === 'number' ||
        typeof row.queue_unreviewed_total === 'string'
          ? row.queue_unreviewed_total
          : 0,
      queue_flagged_total:
        typeof row.queue_flagged_total === 'number' ||
        typeof row.queue_flagged_total === 'string'
          ? row.queue_flagged_total
          : 0,
      reviewed_last_24h:
        typeof row.reviewed_last_24h === 'number' ||
        typeof row.reviewed_last_24h === 'string'
          ? row.reviewed_last_24h
          : 0,
      stale_unreviewed_24h:
        typeof row.stale_unreviewed_24h === 'number' ||
        typeof row.stale_unreviewed_24h === 'string'
          ? row.stale_unreviewed_24h
          : 0,
      median_first_review_minutes:
        row.median_first_review_minutes === null ||
        typeof row.median_first_review_minutes === 'number' ||
        typeof row.median_first_review_minutes === 'string'
          ? row.median_first_review_minutes
          : null,
    };
  }
}

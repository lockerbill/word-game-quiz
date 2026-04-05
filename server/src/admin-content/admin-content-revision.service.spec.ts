import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AdminContentRevisionService } from './admin-content-revision.service';
import type { AdminAuditLogService } from '../admin/admin-audit-log.service';
import { ContentRevision } from '../entities/content-revision.entity';
import { Category } from '../entities/category.entity';
import { Answer } from '../entities/answer.entity';

describe('AdminContentRevisionService', () => {
  const actor = { id: 'admin-1', role: 'admin' as const };

  const createService = (revision: ContentRevision) => {
    const revisionRepo = {
      findOne: jest.fn(async () => revision),
      save: jest.fn(async (row: ContentRevision) => row),
      createQueryBuilder: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ version: 8 }),
      }),
    } as unknown as Repository<ContentRevision>;

    const categoryRepo = {
      find: jest.fn().mockResolvedValue([]),
      manager: {
        transaction: jest.fn(async (cb: (tx: any) => Promise<void>) => {
          await cb({
            findOne: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              delete: jest.fn().mockReturnThis(),
              from: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue(undefined),
              insert: jest.fn().mockReturnThis(),
              into: jest.fn().mockReturnThis(),
              values: jest.fn().mockReturnThis(),
            }),
          });
        }),
      },
    } as unknown as Repository<Category>;

    const answerRepo = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as Repository<Answer>;

    const audit = {
      logMutation: jest.fn(),
    } as unknown as AdminAuditLogService;

    const service = new AdminContentRevisionService(
      revisionRepo,
      categoryRepo,
      answerRepo,
      audit,
    );

    return { service, revisionRepo };
  };

  it('rejects submit for review when revision is not draft', async () => {
    const revision = {
      id: 'rev-1',
      version: 1,
      status: 'published',
      title: 'v1',
      reason: null,
      snapshot: {
        categories: [],
        answers: [],
        capturedAt: new Date().toISOString(),
      },
      createdByUserId: null,
      createdByUser: null,
      publishedByUserId: null,
      publishedByUser: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as ContentRevision;

    const { service } = createService(revision);

    await expect(
      service.submitForReview(actor, 'rev-1', { reason: 'Submit to review' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publishes in_review revision', async () => {
    const revision = {
      id: 'rev-2',
      version: 2,
      status: 'in_review',
      title: 'v2',
      reason: null,
      snapshot: {
        categories: [],
        answers: [],
        capturedAt: new Date().toISOString(),
      },
      createdByUserId: null,
      createdByUser: null,
      publishedByUserId: null,
      publishedByUser: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as ContentRevision;

    const { service, revisionRepo } = createService(revision);

    const result = await service.publishRevision(actor, 'rev-2', {
      reason: 'QA approved publish',
    });

    expect(result.status).toBe('published');
    expect(revisionRepo.save).toHaveBeenCalled();
  });
});

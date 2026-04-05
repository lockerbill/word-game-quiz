import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AdminContentService } from './admin-content.service';
import type { AdminAuditLogService } from '../admin/admin-audit-log.service';
import { Answer } from '../entities/answer.entity';
import { Category } from '../entities/category.entity';

describe('AdminContentService', () => {
  const actor = { id: 'admin-1', role: 'admin' as const };

  const buildQueryBuilderMock = (getOneValue: unknown) => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(getOneValue),
    };

    return qb;
  };

  it('rejects answer that does not start with provided letter', async () => {
    const categoryRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, name: 'Games' }),
    } as unknown as Repository<Category>;

    const answerRepo = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValue(buildQueryBuilderMock(null)),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as Repository<Answer>;

    const auditService = {
      logMutation: jest.fn(),
    } as unknown as AdminAuditLogService;

    const service = new AdminContentService(
      categoryRepo,
      answerRepo,
      auditService,
    );

    await expect(
      service.createAnswer(actor, 1, {
        letter: 'B',
        answer: 'Chess',
        reason: 'Try insert invalid sample',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate answer in same category and letter', async () => {
    const categoryRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, name: 'Games' }),
    } as unknown as Repository<Category>;

    const answerRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(
        buildQueryBuilderMock({
          id: 99,
          categoryId: 1,
          letter: 'B',
          answer: 'Bingo',
        }),
      ),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as Repository<Answer>;

    const auditService = {
      logMutation: jest.fn(),
    } as unknown as AdminAuditLogService;

    const service = new AdminContentService(
      categoryRepo,
      answerRepo,
      auditService,
    );

    await expect(
      service.createAnswer(actor, 1, {
        letter: 'B',
        answer: 'Bingo',
        reason: 'Try duplicate insert',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

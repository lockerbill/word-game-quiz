import type { Repository } from 'typeorm';
import { AdminContentImportService } from './admin-content-import.service';
import type { AdminAuditLogService } from '../admin/admin-audit-log.service';
import { ContentImportJob } from '../entities/content-import-job.entity';
import { Category } from '../entities/category.entity';
import { Answer } from '../entities/answer.entity';

describe('AdminContentImportService', () => {
  const actor = { id: 'admin-1', role: 'admin' as const };

  const createService = () => {
    const importJobRepo = {
      save: jest.fn(async (row: ContentImportJob) => ({
        ...row,
        id: 'job-1',
      })),
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    } as unknown as Repository<ContentImportJob>;

    const categoryRepo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as Repository<Category>;

    const answerRepo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as Repository<Answer>;

    const adminAuditLogService = {
      logMutation: jest.fn(),
    } as unknown as AdminAuditLogService;

    return {
      service: new AdminContentImportService(
        importJobRepo,
        categoryRepo,
        answerRepo,
        adminAuditLogService,
      ),
      importJobRepo,
      adminAuditLogService,
    };
  };

  it('creates validated import job from CSV payload', async () => {
    const { service, importJobRepo } = createService();

    const result = await service.createImportJob(actor, {
      format: 'csv',
      payload:
        'categoryName,letter,answer,difficulty,emoji,enabled\nBoard Games,B,Bingo,2,🎲,true',
      reason: 'Import curated CSV dataset',
      dryRun: true,
    });

    expect(result.status).toBe('validated');
    expect(result.summary).toEqual(
      expect.objectContaining({
        totalRows: 1,
        validRows: 1,
        errorCount: 0,
      }),
    );
    expect(importJobRepo.save).toHaveBeenCalledTimes(1);
  });

  it('marks import job as failed_validation when row is invalid', async () => {
    const { service } = createService();

    const payload = JSON.stringify([
      { categoryName: 'Board Games', letter: 'B', answer: 'Chess' },
    ]);

    const result = await service.createImportJob(actor, {
      format: 'json',
      payload,
      reason: 'Import invalid test file',
      dryRun: true,
    });

    expect(result.status).toBe('failed_validation');
    expect(result.summary).toEqual(
      expect.objectContaining({
        totalRows: 1,
        validRows: 0,
        errorCount: 1,
      }),
    );
  });
});

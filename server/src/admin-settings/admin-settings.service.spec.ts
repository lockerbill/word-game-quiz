import { ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AdminAuditLogService } from '../admin/admin-audit-log.service';
import { AdminSettingsRevision } from '../entities/admin-settings-revision.entity';
import { AdminSettingsService } from './admin-settings.service';

describe('AdminSettingsService', () => {
  const buildRevisionRepo = () => {
    const revisions: AdminSettingsRevision[] = [];

    const qb = {
      orderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest
        .fn()
        .mockImplementation(
          () =>
            revisions.slice().sort((a, b) => b.version - a.version)[0] ?? null,
        ),
      getManyAndCount: jest
        .fn()
        .mockImplementation(() => [
          revisions.slice().sort((a, b) => b.version - a.version),
          revisions.length,
        ]),
    };

    const repo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn(({ where }: { where: { id?: string } }) => {
        if (!where.id) return null;
        return revisions.find((r) => r.id === where.id) ?? null;
      }),
      create: jest.fn((payload: Partial<AdminSettingsRevision>) => payload),
      save: jest.fn((payload: Partial<AdminSettingsRevision>) => {
        const row = {
          id: payload.id ?? `rev-${revisions.length + 1}`,
          version: payload.version ?? revisions.length + 1,
          settings: payload.settings ?? {},
          reason: payload.reason ?? 'reason',
          createdByUserId: payload.createdByUserId ?? null,
          createdByUser: null,
          publishedByUserId: payload.publishedByUserId ?? null,
          publishedByUser: null,
          rollbackFromRevisionId: payload.rollbackFromRevisionId ?? null,
          publishedAt: payload.publishedAt ?? new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as AdminSettingsRevision;
        revisions.push(row);
        return row;
      }),
    } as unknown as Repository<AdminSettingsRevision>;

    return { repo, revisions };
  };

  const actor = { id: 'admin-1', role: 'admin' as const };

  it('returns defaults with version 0 when no revision exists', async () => {
    const { repo } = buildRevisionRepo();
    const logMutation = jest.fn();
    const audit = { logMutation } as unknown as AdminAuditLogService;
    const service = new AdminSettingsService(repo, audit);

    const current = await service.getCurrentSettings();

    expect(current.version).toBe(0);
    expect(current.settings.game.categoriesPerGame).toBe(10);
  });

  it('creates revision with optimistic version check and audit log', async () => {
    const { repo } = buildRevisionRepo();
    const logMutation = jest.fn();
    const audit = { logMutation } as unknown as AdminAuditLogService;
    const service = new AdminSettingsService(repo, audit);

    const result = await service.updateSettings(actor, {
      expectedVersion: 0,
      reason: 'Tune hardcore mode timer and AI confidence',
      settings: {
        game: {
          timerSecondsByMode: {
            hardcore: 15,
          },
        },
        aiValidation: {
          minConfidence: 0.8,
        },
      },
    });

    expect(result.version).toBe(1);
    expect(result.settings.game.timerSecondsByMode.hardcore).toBe(15);
    expect(logMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'settings.update',
        actorUserId: 'admin-1',
      }),
    );
  });

  it('rejects stale expectedVersion', async () => {
    const { repo } = buildRevisionRepo();
    const logMutation = jest.fn();
    const audit = { logMutation } as unknown as AdminAuditLogService;
    const service = new AdminSettingsService(repo, audit);

    await service.updateSettings(actor, {
      expectedVersion: 0,
      reason: 'Initial update for settings',
      settings: {
        features: {
          pasteDetection: true,
        },
      },
    });

    await expect(
      service.updateSettings(actor, {
        expectedVersion: 0,
        reason: 'Stale write',
        settings: {
          features: {
            pasteDetection: false,
          },
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rolls back to target revision and records a new revision', async () => {
    const { repo } = buildRevisionRepo();
    const logMutation = jest.fn();
    const audit = { logMutation } as unknown as AdminAuditLogService;
    const service = new AdminSettingsService(repo, audit);

    const first = await service.updateSettings(actor, {
      expectedVersion: 0,
      reason: 'First update',
      settings: {
        game: {
          categoriesPerGame: 9,
        },
      },
    });
    await service.updateSettings(actor, {
      expectedVersion: 1,
      reason: 'Second update',
      settings: {
        game: {
          categoriesPerGame: 12,
        },
      },
    });

    const rollback = await service.rollbackSettings(actor, {
      targetRevisionId: first.revisionId,
      expectedVersion: 2,
      reason: 'Rollback after regression',
    });

    expect(rollback.appliedRevision.version).toBe(3);
    expect(rollback.rollbackTarget.id).toBe(first.revisionId);
    expect(logMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'settings.rollback',
      }),
    );
  });
});

import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AdminAuditLogService } from '../admin/admin-audit-log.service';
import { User } from '../entities/user.entity';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  const buildUserRepo = () => {
    const store = new Map<string, User>();

    const queryState = {
      users: [] as User[],
    };

    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn()
        .mockImplementation(() => [queryState.users, queryState.users.length]),
    };

    const repo = {
      findOne: jest.fn(({ where }: { where: { id?: string } }) => {
        if (!where.id) return null;
        return store.get(where.id) ?? null;
      }),
      save: jest.fn((user: User) => {
        store.set(user.id, user);
        return user;
      }),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as Repository<User>;

    return { repo, store, queryState, qb };
  };

  const buildUser = (overrides?: Partial<User>): User => ({
    id: overrides?.id ?? 'u-1',
    username: overrides?.username ?? 'target',
    email: overrides?.email ?? 'target@example.com',
    passwordHash: overrides?.passwordHash ?? '',
    isGuest: overrides?.isGuest ?? false,
    avatar: overrides?.avatar ?? 'default',
    role: overrides?.role ?? 'player',
    accountStatus: overrides?.accountStatus ?? 'active',
    level: overrides?.level ?? 1,
    xp: overrides?.xp ?? 0,
    gamesPlayed: overrides?.gamesPlayed ?? 0,
    bestScore: overrides?.bestScore ?? 0,
    totalScore: overrides?.totalScore ?? 0,
    perfectGames: overrides?.perfectGames ?? 0,
    longestStreak: overrides?.longestStreak ?? 0,
    currentStreak: overrides?.currentStreak ?? 0,
    games: overrides?.games ?? [],
    createdAt: overrides?.createdAt ?? new Date(),
    updatedAt: overrides?.updatedAt ?? new Date(),
  });

  it('lists users with pagination result shape', async () => {
    const { repo, queryState } = buildUserRepo();
    queryState.users = [
      buildUser({ id: 'u-1', username: 'alice', role: 'admin' }),
      buildUser({ id: 'u-2', username: 'bob', role: 'player' }),
    ];

    const logMutation = jest.fn();
    const auditService = { logMutation } as unknown as AdminAuditLogService;

    const service = new AdminUsersService(repo, auditService);

    const result = await service.listUsers({
      page: 1,
      limit: 20,
      search: 'a',
      role: 'admin',
      accountStatus: 'active',
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(2);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'u-1',
        username: 'alice',
        role: 'admin',
      }),
    );
  });

  it('logs audit entry when user role changes', async () => {
    const { repo, store } = buildUserRepo();
    store.set('u-1', buildUser({ id: 'u-1' }));

    const logMutation = jest.fn();
    const auditService = { logMutation } as unknown as AdminAuditLogService;

    const service = new AdminUsersService(repo, auditService);

    await service.updateUserRole({ id: 'admin-1', role: 'admin' }, 'u-1', {
      role: 'admin',
      reason: 'Promote for moderation duties',
    });

    expect(logMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-1',
        action: 'user.role.update',
        targetType: 'user',
        targetId: 'u-1',
        reason: 'Promote for moderation duties',
      }),
    );
  });

  it('prevents admin from promoting to super_admin', async () => {
    const { repo, store } = buildUserRepo();
    store.set('u-2', buildUser({ id: 'u-2' }));

    const logMutation = jest.fn();
    const auditService = { logMutation } as unknown as AdminAuditLogService;
    const service = new AdminUsersService(repo, auditService);

    await expect(
      service.updateUserRole({ id: 'admin-1', role: 'admin' }, 'u-2', {
        role: 'super_admin',
        reason: 'Unauthorized escalation attempt',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents admin from suspending themselves', async () => {
    const { repo, store } = buildUserRepo();
    store.set('admin-1', buildUser({ id: 'admin-1', role: 'admin' }));

    const logMutation = jest.fn();
    const auditService = { logMutation } as unknown as AdminAuditLogService;
    const service = new AdminUsersService(repo, auditService);

    await expect(
      service.updateUserStatus({ id: 'admin-1', role: 'admin' }, 'admin-1', {
        accountStatus: 'suspended',
        reason: 'Self suspend test',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

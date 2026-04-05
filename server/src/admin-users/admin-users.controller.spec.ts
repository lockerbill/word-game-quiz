import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RolesGuard } from '../auth/roles.guard';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class MockAuthGuard {
      canActivate(context: { switchToHttp: () => { getRequest: () => any } }) {
        const req = context.switchToHttp().getRequest();
        const roleHeader = req.headers['x-role'];
        const statusHeader = req.headers['x-status'];

        const role = typeof roleHeader === 'string' ? roleHeader : 'admin';
        const accountStatus =
          typeof statusHeader === 'string' ? statusHeader : 'active';

        req.user = {
          id: 'admin-1',
          role,
          accountStatus,
        };

        return true;
      }
    },
}));

describe('AdminUsersController', () => {
  let app: INestApplication;

  const listUsers = jest.fn(async () => ({
    page: 1,
    limit: 20,
    total: 1,
    data: [
      {
        id: 'u-1',
        username: 'alice',
        email: 'alice@example.com',
        isGuest: false,
        avatar: 'default',
        role: 'player',
        accountStatus: 'active',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ],
  }));
  const updateUserRole = jest.fn(async () => ({
    id: 'u-1',
    username: 'alice',
    email: 'alice@example.com',
    isGuest: false,
    avatar: 'default',
    role: 'admin',
    accountStatus: 'active',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  }));
  const updateUserStatus = jest.fn(async () => ({
    id: 'u-1',
    username: 'alice',
    email: 'alice@example.com',
    isGuest: false,
    avatar: 'default',
    role: 'player',
    accountStatus: 'suspended',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        {
          provide: AdminUsersService,
          useValue: {
            listUsers,
            updateUserRole,
            updateUserStatus,
          },
        },
        RolesGuard,
        Reflector,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows admin role to list users', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('x-role', 'admin')
      .expect(200);

    expect(listUsers).toHaveBeenCalled();
  });

  it('denies player role for admin-users route', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('x-role', 'player')
      .expect(403);

    expect(listUsers).not.toHaveBeenCalled();
  });

  it('denies suspended user for admin-users route', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('x-role', 'admin')
      .set('x-status', 'suspended')
      .expect(403);

    expect(listUsers).not.toHaveBeenCalled();
  });

  it('validates update role payload and rejects short reason', async () => {
    await request(app.getHttpServer())
      .patch('/admin/users/u-1/role')
      .set('x-role', 'admin')
      .send({ role: 'admin', reason: 'bad' })
      .expect(400);

    expect(updateUserRole).not.toHaveBeenCalled();
  });

  it('accepts valid role update and forwards actor + payload', async () => {
    await request(app.getHttpServer())
      .patch('/admin/users/u-1/role')
      .set('x-role', 'admin')
      .send({ role: 'moderator', reason: 'Promote for queue triage duties' })
      .expect(200);

    expect(updateUserRole).toHaveBeenCalledWith(
      {
        id: 'admin-1',
        role: 'admin',
        accountStatus: 'active',
      },
      'u-1',
      {
        role: 'moderator',
        reason: 'Promote for queue triage duties',
      },
    );
  });

  it('validates update status payload and rejects missing reason', async () => {
    await request(app.getHttpServer())
      .patch('/admin/users/u-1/status')
      .set('x-role', 'admin')
      .send({ accountStatus: 'suspended' })
      .expect(400);

    expect(updateUserStatus).not.toHaveBeenCalled();
  });

  it('accepts valid status update and forwards actor + payload', async () => {
    await request(app.getHttpServer())
      .patch('/admin/users/u-1/status')
      .set('x-role', 'admin')
      .send({
        accountStatus: 'suspended',
        reason: 'Suspended due to repeated policy violations',
      })
      .expect(200);

    expect(updateUserStatus).toHaveBeenCalledWith(
      {
        id: 'admin-1',
        role: 'admin',
        accountStatus: 'active',
      },
      'u-1',
      {
        accountStatus: 'suspended',
        reason: 'Suspended due to repeated policy violations',
      },
    );
  });
});

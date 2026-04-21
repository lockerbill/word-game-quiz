import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RolesGuard } from '../auth/roles.guard';
import { AdminSessionModerationController } from './admin-session-moderation.controller';
import { AdminSessionModerationService } from './admin-session-moderation.service';

interface MockRequest {
  headers: Record<string, string | undefined>;
  user?: {
    id: string;
    role: string;
    accountStatus: string;
  };
}

interface MockGuardContext {
  switchToHttp: () => {
    getRequest: () => MockRequest;
  };
}

jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class MockAuthGuard {
      canActivate(context: MockGuardContext) {
        const req = context.switchToHttp().getRequest();
        const roleHeader = req.headers['x-role'];
        const statusHeader = req.headers['x-status'];

        req.user = {
          id: 'admin-1',
          role: typeof roleHeader === 'string' ? roleHeader : 'admin',
          accountStatus:
            typeof statusHeader === 'string' ? statusHeader : 'active',
        };

        return true;
      }
    },
}));

describe('AdminSessionModerationController', () => {
  let app: INestApplication;

  const listSessions = jest.fn(() => ({
    page: 1,
    limit: 20,
    total: 0,
    data: [],
  }));
  const getSessionDetail = jest.fn(() => ({
    id: 'c5d9b756-9d63-4f7d-9799-0ed23d36aa26',
  }));
  const getMetrics = jest.fn(() => ({
    queueUnreviewedTotal: 12,
    queueFlaggedTotal: 3,
    reviewedLast24h: 8,
    staleUnreviewed24h: 4,
    medianFirstReviewMinutes: 74.5,
    computedAt: '2026-04-21T09:00:00.000Z',
  }));
  const reviewSession = jest.fn(() => ({
    id: 'f2f948ef-2d6e-40af-89d1-6339bf8a8f26',
    decision: 'flagged',
  }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminSessionModerationController],
      providers: [
        {
          provide: AdminSessionModerationService,
          useValue: {
            listSessions,
            getMetrics,
            getSessionDetail,
            reviewSession,
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

  const httpServer = () => app.getHttpServer() as Parameters<typeof request>[0];

  it('allows admin role to list moderation sessions', async () => {
    await request(httpServer())
      .get('/admin/sessions')
      .set('x-role', 'admin')
      .expect(200);

    expect(listSessions).toHaveBeenCalled();
  });

  it('denies player role for moderation routes', async () => {
    await request(httpServer())
      .get('/admin/sessions')
      .set('x-role', 'player')
      .expect(403);

    expect(listSessions).not.toHaveBeenCalled();
  });

  it('returns moderation metrics snapshot for admin role', async () => {
    await request(httpServer())
      .get('/admin/sessions/metrics')
      .set('x-role', 'admin')
      .expect(200);

    expect(getMetrics).toHaveBeenCalled();
  });

  it('validates review payload and rejects short reason', async () => {
    await request(httpServer())
      .post('/admin/sessions/c5d9b756-9d63-4f7d-9799-0ed23d36aa26/review')
      .set('x-role', 'admin')
      .send({ decision: 'flagged', reason: 'bad' })
      .expect(400);

    expect(reviewSession).not.toHaveBeenCalled();
  });

  it('forwards review request to service with actor and payload', async () => {
    await request(httpServer())
      .post('/admin/sessions/c5d9b756-9d63-4f7d-9799-0ed23d36aa26/review')
      .set('x-role', 'admin')
      .send({
        decision: 'flagged',
        reason: 'Flagged due to impossible completion speed pattern',
      })
      .expect(201);

    expect(reviewSession).toHaveBeenCalledWith(
      {
        id: 'admin-1',
        role: 'admin',
        accountStatus: 'active',
      },
      'c5d9b756-9d63-4f7d-9799-0ed23d36aa26',
      {
        decision: 'flagged',
        reason: 'Flagged due to impossible completion speed pattern',
      },
    );
  });
});

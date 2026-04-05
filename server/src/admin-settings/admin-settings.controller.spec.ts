import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RolesGuard } from '../auth/roles.guard';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from './admin-settings.service';

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

describe('AdminSettingsController', () => {
  let app: INestApplication;

  const getCurrentSettings = jest.fn(() => ({
    version: 2,
    settings: {
      game: {
        categoriesPerGame: 10,
        timerSecondsByMode: {
          practice: 30,
          ranked: 30,
          daily: 30,
          relax: 0,
          hardcore: 20,
        },
      },
      aiValidation: {
        enabled: true,
        provider: 'openai',
        timeoutMs: 2500,
        minConfidence: 0.7,
        cacheTtlSeconds: 604800,
      },
      features: {},
    },
  }));
  const listRevisions = jest.fn(() => ({
    page: 1,
    limit: 20,
    total: 0,
    data: [],
  }));
  const getRevision = jest.fn(() => ({
    id: '7e50f0fa-9155-429e-bb8f-6fddfabdb08b',
    version: 1,
  }));
  const updateSettings = jest.fn(() => ({
    revisionId: 'new-rev',
    version: 3,
  }));
  const rollbackSettings = jest.fn(() => ({
    appliedRevision: { id: 'rb', version: 4 },
  }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminSettingsController],
      providers: [
        {
          provide: AdminSettingsService,
          useValue: {
            getCurrentSettings,
            listRevisions,
            getRevision,
            updateSettings,
            rollbackSettings,
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

  it('allows admin to access current settings', async () => {
    await request(httpServer())
      .get('/admin/settings/current')
      .set('x-role', 'admin')
      .expect(200);

    expect(getCurrentSettings).toHaveBeenCalled();
  });

  it('denies player for admin-settings route', async () => {
    await request(httpServer())
      .get('/admin/settings/current')
      .set('x-role', 'player')
      .expect(403);

    expect(getCurrentSettings).not.toHaveBeenCalled();
  });

  it('denies suspended admin for admin-settings route', async () => {
    await request(httpServer())
      .get('/admin/settings/current')
      .set('x-role', 'admin')
      .set('x-status', 'suspended')
      .expect(403);

    expect(getCurrentSettings).not.toHaveBeenCalled();
  });

  it('validates update payload expectedVersion and reason', async () => {
    await request(httpServer())
      .patch('/admin/settings')
      .set('x-role', 'admin')
      .send({
        expectedVersion: -1,
        reason: 'bad',
        settings: {
          features: {
            pasteDetection: true,
          },
        },
      })
      .expect(400);

    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('accepts valid settings update payload', async () => {
    await request(httpServer())
      .patch('/admin/settings')
      .set('x-role', 'admin')
      .send({
        expectedVersion: 2,
        reason: 'Update AI confidence for moderation quality',
        settings: {
          aiValidation: {
            minConfidence: 0.8,
          },
        },
      })
      .expect(200);

    expect(updateSettings).toHaveBeenCalledWith(
      {
        id: 'admin-1',
        role: 'admin',
        accountStatus: 'active',
      },
      {
        expectedVersion: 2,
        reason: 'Update AI confidence for moderation quality',
        settings: {
          aiValidation: {
            minConfidence: 0.8,
          },
        },
      },
    );
  });

  it('validates rollback payload', async () => {
    await request(httpServer())
      .post('/admin/settings/rollback')
      .set('x-role', 'admin')
      .send({
        targetRevisionId: 'not-a-uuid',
        expectedVersion: 1,
        reason: 'Rollback',
      })
      .expect(400);

    expect(rollbackSettings).not.toHaveBeenCalled();
  });

  it('accepts valid rollback payload', async () => {
    await request(httpServer())
      .post('/admin/settings/rollback')
      .set('x-role', 'admin')
      .send({
        targetRevisionId: '7e50f0fa-9155-429e-bb8f-6fddfabdb08b',
        expectedVersion: 3,
        reason: 'Rollback after issue observed',
      })
      .expect(201);

    expect(rollbackSettings).toHaveBeenCalledWith(
      {
        id: 'admin-1',
        role: 'admin',
        accountStatus: 'active',
      },
      {
        targetRevisionId: '7e50f0fa-9155-429e-bb8f-6fddfabdb08b',
        expectedVersion: 3,
        reason: 'Rollback after issue observed',
      },
    );
  });
});

import './env.js';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { AppModule } from './app.module.js';

interface CorsRequestLike {
  method?: string;
  path?: string;
  url?: string;
  headers: {
    origin?: string | string[];
  };
}

type CorsOptionsCallback = (err: Error | null, options?: CorsOptions) => void;

function parseOriginList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  const publicCorsOrigin = process.env.CORS_ORIGIN || '*';
  const publicCorsOrigins = parseOriginList(publicCorsOrigin);
  const adminCorsOrigins = parseOriginList(process.env.ADMIN_CORS_ORIGIN);

  app.enableCors((req: CorsRequestLike, callback: CorsOptionsCallback) => {
    const method = req.method?.toUpperCase() ?? 'GET';
    const path = req.path ?? req.url ?? '';
    const requestOrigin = req.headers.origin;
    const isAdminRoute = path.startsWith('/api/admin');

    const baseOptions = {
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    };

    if (isAdminRoute) {
      const adminOriginAllowed =
        typeof requestOrigin === 'string' &&
        adminCorsOrigins.includes(requestOrigin);

      callback(null, {
        ...baseOptions,
        origin: adminOriginAllowed ? requestOrigin : false,
      });
      return;
    }

    if (publicCorsOrigin === '*') {
      callback(null, {
        ...baseOptions,
        origin: true,
      });
      return;
    }

    const publicOriginAllowed =
      typeof requestOrigin === 'string' &&
      publicCorsOrigins.includes(requestOrigin);

    callback(null, {
      ...baseOptions,
      origin: publicOriginAllowed ? requestOrigin : method === 'OPTIONS',
    });
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Input sanitization - strip unknown fields, transform payloads, validate DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT ?? 3000;

  // Swagger / OpenAPI - only expose in non-production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Alpha Bucks API')
      .setDescription('Backend API for the Alpha Bucks word-game quiz app')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addTag('auth', 'Authentication — register, login, guest, upgrade')
      .addTag('game', 'Game sessions — start, submit, daily challenge')
      .addTag('leaderboard', 'Leaderboards — global, weekly, daily')
      .addTag('user', 'User profile, stats and game history')
      .addTag('admin', 'Admin APIs — RBAC-protected management endpoints')
      .addTag('admin-content', 'Admin content APIs — categories and answers')
      .addTag('admin-users', 'Admin user APIs — search, role and status')
      .addTag(
        'admin-settings',
        'Admin settings APIs — runtime config revisions',
      )
      .addTag(
        'admin-session-moderation',
        'Admin moderation APIs — session queue and review decisions',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    console.log(`Swagger UI available at http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
void bootstrap();

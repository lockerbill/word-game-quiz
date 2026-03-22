import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { GameModule } from './game/game.module.js';
import { LeaderboardModule } from './leaderboard/leaderboard.module.js';
import { UserModule } from './user/user.module.js';
import { DatabaseModule } from './database/database.module.js';
import { RedisModule } from './redis/redis.module.js';
import { User } from './entities/user.entity.js';
import { Game } from './entities/game.entity.js';
import { GameAnswer } from './entities/game-answer.entity.js';
import { Category } from './entities/category.entity.js';
import { Answer } from './entities/answer.entity.js';

@Module({
  imports: [
    // PostgreSQL via TypeORM
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ||
        'postgresql://postgres:password@localhost:5432/alphabucks',
      entities: [User, Game, GameAnswer, Category, Answer],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),

    // Rate limiting: 100 requests per 15 minutes
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 900_000, // 15 minutes in ms
          limit: 100,
        },
      ],
    }),

    // Global modules
    RedisModule,

    // Database seeding
    DatabaseModule,

    // Feature modules
    AuthModule,
    GameModule,
    LeaderboardModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

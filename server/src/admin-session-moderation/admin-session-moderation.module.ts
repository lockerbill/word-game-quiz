import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AdminAuditLogService } from '../admin/admin-audit-log.service.js';
import { AdminAuditLog } from '../entities/admin-audit-log.entity.js';
import { Category } from '../entities/category.entity.js';
import { Game } from '../entities/game.entity.js';
import { SessionModerationReview } from '../entities/session-moderation-review.entity.js';
import { AdminSessionModerationController } from './admin-session-moderation.controller.js';
import { AdminSessionModerationService } from './admin-session-moderation.service.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Game,
      Category,
      SessionModerationReview,
      AdminAuditLog,
    ]),
  ],
  controllers: [AdminSessionModerationController],
  providers: [AdminSessionModerationService, AdminAuditLogService],
})
export class AdminSessionModerationModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AdminAuditLogService } from '../admin/admin-audit-log.service.js';
import { AdminSettingsRevision } from '../entities/admin-settings-revision.entity.js';
import { AdminAuditLog } from '../entities/admin-audit-log.entity.js';
import { AdminSettingsController } from './admin-settings.controller.js';
import { AdminSettingsService } from './admin-settings.service.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([AdminSettingsRevision, AdminAuditLog]),
  ],
  controllers: [AdminSettingsController],
  providers: [AdminSettingsService, AdminAuditLogService],
  exports: [AdminSettingsService],
})
export class AdminSettingsModule {}

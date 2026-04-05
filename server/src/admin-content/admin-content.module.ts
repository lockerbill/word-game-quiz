import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AdminAuditLogService } from '../admin/admin-audit-log.service.js';
import { Answer } from '../entities/answer.entity.js';
import { Category } from '../entities/category.entity.js';
import { AdminAuditLog } from '../entities/admin-audit-log.entity.js';
import { ContentImportJob } from '../entities/content-import-job.entity.js';
import { ContentRevision } from '../entities/content-revision.entity.js';
import { AdminContentRevisionService } from './admin-content-revision.service.js';
import { AdminContentImportService } from './admin-content-import.service.js';
import { AdminContentController } from './admin-content.controller.js';
import { AdminContentService } from './admin-content.service.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Category,
      Answer,
      AdminAuditLog,
      ContentImportJob,
      ContentRevision,
    ]),
  ],
  controllers: [AdminContentController],
  providers: [
    AdminContentService,
    AdminContentImportService,
    AdminContentRevisionService,
    AdminAuditLogService,
  ],
})
export class AdminContentModule {}

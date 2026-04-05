import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminAuditLog } from '../entities/admin-audit-log.entity.js';
import { AdminAuditLogService } from './admin-audit-log.service.js';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([AdminAuditLog])],
  controllers: [AdminController],
  providers: [AdminAuditLogService],
})
export class AdminModule {}

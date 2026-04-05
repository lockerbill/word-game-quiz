import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AdminAuditLogService } from '../admin/admin-audit-log.service.js';
import { AdminAuditLog } from '../entities/admin-audit-log.entity.js';
import { User } from '../entities/user.entity.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([User, AdminAuditLog])],
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminAuditLogService],
})
export class AdminUsersModule {}

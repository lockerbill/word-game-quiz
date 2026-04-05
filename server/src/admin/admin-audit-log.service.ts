import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from '../entities/admin-audit-log.entity.js';

export interface CreateAdminAuditLogInput {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AdminAuditLogService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private auditLogRepo: Repository<AdminAuditLog>,
  ) {}

  async logMutation(input: CreateAdminAuditLogInput): Promise<AdminAuditLog> {
    const row = this.auditLogRepo.create({
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      reason: input.reason ?? null,
      beforeState: input.beforeState ?? null,
      afterState: input.afterState ?? null,
      metadata: input.metadata ?? null,
    });

    return this.auditLogRepo.save(row);
  }

  async listRecent(limit = 50): Promise<AdminAuditLog[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    return this.auditLogRepo.find({
      order: { createdAt: 'DESC' },
      take: safeLimit,
    });
  }
}

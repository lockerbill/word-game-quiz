import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '../entities/user.entity';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminAuditLogService } from './admin-audit-log.service.js';

interface AdminRequest {
  user: Pick<User, 'id' | 'username' | 'email' | 'role' | 'accountStatus'>;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const adminThrottleLimit = parsePositiveInt(
  process.env.ADMIN_THROTTLE_LIMIT,
  30,
);
const adminThrottleTtlMs = parsePositiveInt(
  process.env.ADMIN_THROTTLE_TTL_MS,
  60_000,
);
@ApiTags('admin')
@ApiBearerAuth('JWT')
@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
@Throttle({
  default: {
    limit: adminThrottleLimit,
    ttl: adminThrottleTtlMs,
  },
})
export class AdminController {
  constructor(private adminAuditLogService: AdminAuditLogService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current admin session information' })
  @ApiResponse({ status: 200, description: 'Authenticated admin identity' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Insufficient role permissions' })
  me(@Req() req: AdminRequest) {
    return {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      accountStatus: req.user.accountStatus,
    };
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'List recent admin audit logs' })
  @ApiResponse({ status: 200, description: 'Recent admin mutation audit logs' })
  auditLogs(@Query('limit') limit?: number) {
    return this.adminAuditLogService.listRecent(limit ?? 50);
  }
}

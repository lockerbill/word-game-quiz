import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { User } from '../entities/user.entity.js';
import { ListAdminSessionsQueryDto } from './dto/list-admin-sessions-query.dto.js';
import { ReviewAdminSessionDto } from './dto/review-admin-session.dto.js';
import { AdminSessionModerationService } from './admin-session-moderation.service.js';

interface AdminSessionModerationRequest {
  user: Pick<User, 'id' | 'role'>;
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
const adminMutationThrottleLimit = parsePositiveInt(
  process.env.ADMIN_MUTATION_THROTTLE_LIMIT,
  10,
);

@ApiTags('admin-session-moderation')
@ApiBearerAuth('JWT')
@Controller('admin/sessions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
@Throttle({
  default: {
    limit: adminThrottleLimit,
    ttl: adminThrottleTtlMs,
  },
})
export class AdminSessionModerationController {
  constructor(
    private adminSessionModerationService: AdminSessionModerationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List played sessions for moderation queue' })
  @ApiResponse({ status: 200, description: 'Paginated session queue' })
  listSessions(@Query() query: ListAdminSessionsQueryDto) {
    return this.adminSessionModerationService.listSessions(query);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get moderation workload and queue health metrics' })
  @ApiResponse({ status: 200, description: 'Moderation metrics snapshot' })
  getMetrics() {
    return this.adminSessionModerationService.getMetrics();
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get session detail for moderation review' })
  @ApiResponse({
    status: 200,
    description: 'Session detail with answers/history',
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  getSessionDetail(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.adminSessionModerationService.getSessionDetail(sessionId);
  }

  @Post(':sessionId/review')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Append a review or flag decision for a session' })
  @ApiResponse({ status: 201, description: 'Review decision recorded' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  reviewSession(
    @Req() req: AdminSessionModerationRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: ReviewAdminSessionDto,
  ) {
    return this.adminSessionModerationService.reviewSession(
      req.user,
      sessionId,
      dto,
    );
  }
}

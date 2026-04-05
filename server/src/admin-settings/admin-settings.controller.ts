import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { AdminSettingsService } from './admin-settings.service.js';
import { ListAdminSettingsRevisionsQueryDto } from './dto/list-admin-settings-revisions-query.dto.js';
import { RollbackAdminSettingsDto } from './dto/rollback-admin-settings.dto.js';
import { UpdateAdminSettingsDto } from './dto/update-admin-settings.dto.js';

interface AdminSettingsRequest {
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

@ApiTags('admin-settings')
@ApiBearerAuth('JWT')
@Controller('admin/settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
@Throttle({
  default: {
    limit: adminThrottleLimit,
    ttl: adminThrottleTtlMs,
  },
})
export class AdminSettingsController {
  constructor(private adminSettingsService: AdminSettingsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current runtime settings snapshot' })
  @ApiResponse({ status: 200, description: 'Current settings and version' })
  getCurrentSettings() {
    return this.adminSettingsService.getCurrentSettings();
  }

  @Get('revisions')
  @ApiOperation({ summary: 'List settings revisions' })
  @ApiResponse({ status: 200, description: 'Paginated settings revisions' })
  listRevisions(@Query() query: ListAdminSettingsRevisionsQueryDto) {
    return this.adminSettingsService.listRevisions(query);
  }

  @Get('revisions/:revisionId')
  @ApiOperation({ summary: 'Get one settings revision' })
  @ApiResponse({ status: 200, description: 'Settings revision details' })
  getRevision(@Param('revisionId', ParseUUIDPipe) revisionId: string) {
    return this.adminSettingsService.getRevision(revisionId);
  }

  @Patch()
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Publish updated runtime settings revision' })
  @ApiResponse({ status: 200, description: 'Settings revision created' })
  @ApiResponse({ status: 409, description: 'Optimistic version mismatch' })
  updateSettings(
    @Req() req: AdminSettingsRequest,
    @Body() dto: UpdateAdminSettingsDto,
  ) {
    return this.adminSettingsService.updateSettings(req.user, dto);
  }

  @Post('rollback')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Rollback to a previous settings revision' })
  @ApiResponse({ status: 200, description: 'Rollback revision created' })
  @ApiResponse({ status: 409, description: 'Optimistic version mismatch' })
  rollbackSettings(
    @Req() req: AdminSettingsRequest,
    @Body() dto: RollbackAdminSettingsDto,
  ) {
    return this.adminSettingsService.rollbackSettings(req.user, dto);
  }
}

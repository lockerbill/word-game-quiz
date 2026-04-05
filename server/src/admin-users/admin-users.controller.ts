import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { AdminUsersService } from './admin-users.service.js';

interface AdminUsersRequest {
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

@ApiTags('admin-users')
@ApiBearerAuth('JWT')
@Controller('admin/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
@Throttle({
  default: {
    limit: adminThrottleLimit,
    ttl: adminThrottleTtlMs,
  },
})
export class AdminUsersController {
  constructor(private adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with search and filters' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  listUsers(@Query() query: ListAdminUsersQueryDto) {
    return this.adminUsersService.listUsers(query);
  }

  @Patch(':userId/role')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Update a user role (admin operation)' })
  @ApiResponse({ status: 200, description: 'User role updated' })
  @ApiResponse({ status: 403, description: 'Insufficient role permissions' })
  updateUserRole(
    @Req() req: AdminUsersRequest,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminUsersService.updateUserRole(req.user, userId, dto);
  }

  @Patch(':userId/status')
  @Throttle({
    default: {
      limit: adminMutationThrottleLimit,
      ttl: adminThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: 'Update a user account status (admin operation)' })
  @ApiResponse({ status: 200, description: 'User account status updated' })
  @ApiResponse({ status: 403, description: 'Insufficient role permissions' })
  updateUserStatus(
    @Req() req: AdminUsersRequest,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateUserStatus(req.user, userId, dto);
  }
}

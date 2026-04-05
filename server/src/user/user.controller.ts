import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service.js';
import type { User } from '../entities/user.entity.js';

interface UserRequest {
  user: Pick<User, 'id'>;
}

@ApiTags('user')
@ApiBearerAuth('JWT')
@Controller('user')
@UseGuards(AuthGuard('jwt'))
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: "Get the authenticated user's profile" })
  @ApiResponse({
    status: 200,
    description: 'User profile including level, XP, and lifetime stats',
  })
  profile(@Req() req: UserRequest) {
    return this.userService.getProfile(req.user.id);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get detailed stats for the authenticated user',
    description: 'Includes XP progress, average score, and per-mode breakdown.',
  })
  @ApiResponse({ status: 200, description: 'Detailed stats object' })
  stats(@Req() req: UserRequest) {
    return this.userService.getStats(req.user.id);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get recent game history',
    description:
      'Returns the last N completed games with per-answer validation results.',
  })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Array of game records' })
  history(@Req() req: UserRequest, @Query('limit') limit?: number) {
    return this.userService.getHistory(req.user.id, limit || 20);
  }
}

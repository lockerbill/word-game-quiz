import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service.js';

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
  profile(@Request() req: any) {
    return this.userService.getProfile(req.user.id);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get detailed stats for the authenticated user',
    description: 'Includes XP progress, average score, and per-mode breakdown.',
  })
  @ApiResponse({ status: 200, description: 'Detailed stats object' })
  stats(@Request() req: any) {
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
  history(@Request() req: any, @Query('limit') limit?: number) {
    return this.userService.getHistory(req.user.id, limit || 20);
  }
}

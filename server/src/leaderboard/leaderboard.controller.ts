import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service.js';

@ApiTags('leaderboard')
@ApiBearerAuth('JWT')
@Controller('leaderboard')
@UseGuards(AuthGuard('jwt'))
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get('global')
  @ApiOperation({ summary: 'All-time global leaderboard', description: 'Top scores across all time. Redis-cached for 60s. Registered users only.' })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  @ApiResponse({ status: 200, description: 'Array of ranked leaderboard entries' })
  global(@Query('limit') limit?: number) {
    return this.leaderboardService.getGlobal(limit || 100);
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Weekly leaderboard', description: 'Top scores from the last 7 days. Redis-cached for 60s.' })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  @ApiResponse({ status: 200, description: 'Array of ranked leaderboard entries' })
  weekly(@Query('limit') limit?: number) {
    return this.leaderboardService.getWeekly(limit || 100);
  }

  @Get('daily')
  @ApiOperation({ summary: 'Daily challenge leaderboard', description: 'Top scores from today\'s daily challenge. Redis-cached for 30s.' })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  @ApiResponse({ status: 200, description: 'Array of ranked leaderboard entries' })
  daily(@Query('limit') limit?: number) {
    return this.leaderboardService.getDaily(limit || 100);
  }
}

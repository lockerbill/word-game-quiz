import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { GameService } from './game.service.js';
import { StartGameDto, SubmitGameDto } from './dto/game.dto.js';

@ApiTags('game')
@ApiBearerAuth('JWT')
@Controller('game')
@UseGuards(AuthGuard('jwt'))
export class GameController {
  constructor(private gameService: GameService) {}

  @Post('start')
  @ApiOperation({
    summary: 'Start a new game session',
    description:
      'Returns gameId, letter, categories, and timerDuration. Store the gameId to submit answers.',
  })
  @ApiResponse({ status: 201, description: 'Game session created' })
  start(@Request() req: any, @Body() dto: StartGameDto) {
    return this.gameService.startGame(req.user.id, dto);
  }

  @Post('submit')
  @ApiOperation({
    summary: 'Submit answers for a game session',
    description:
      'Server re-validates all answers, calculates score, persists game record, and updates user XP/stats.',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns score breakdown and per-answer validation results',
  })
  @ApiResponse({
    status: 404,
    description: 'Game session not found or expired (5 min TTL)',
  })
  submit(@Request() req: any, @Body() dto: SubmitGameDto) {
    return this.gameService.submitGame(req.user.id, dto);
  }

  @Get('daily')
  @ApiOperation({
    summary: "Get today's daily challenge",
    description:
      'Returns the deterministic letter and categories for today. Same for all users.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily challenge config with letter, categories, and date',
  })
  daily() {
    return this.gameService.getDaily();
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameController } from './game.controller.js';
import { GameService } from './game.service.js';
import { Game } from '../entities/game.entity.js';
import { GameAnswer } from '../entities/game-answer.entity.js';
import { User } from '../entities/user.entity.js';
import { Category } from '../entities/category.entity.js';
import { Answer } from '../entities/answer.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Game, GameAnswer, User, Category, Answer])],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}

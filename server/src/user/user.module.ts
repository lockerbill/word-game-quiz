import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { User } from '../entities/user.entity.js';
import { Game } from '../entities/game.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Game])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}

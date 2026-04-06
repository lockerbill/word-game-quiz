import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service.js';
import { Category } from '../entities/category.entity.js';
import { Answer } from '../entities/answer.entity.js';
import { User } from '../entities/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Answer, User])],
  providers: [SeedService],
})
export class DatabaseModule {}

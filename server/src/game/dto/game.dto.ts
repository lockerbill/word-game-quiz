import {
  IsString,
  IsArray,
  IsNumber,
  IsIn,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class StartGameDto {
  @ApiProperty({
    enum: ['practice', 'ranked', 'daily', 'relax', 'hardcore'],
    example: 'ranked',
    description: 'Game mode to start',
  })
  @IsString()
  @IsIn(['practice', 'ranked', 'daily', 'relax', 'hardcore'])
  mode: string;
}

export class AnswerEntryDto {
  @ApiProperty({ example: 1, description: 'Category ID from the game start response' })
  @IsNumber()
  categoryId: number;

  @ApiProperty({ example: 'Berlin', description: 'Player answer (empty string if skipped)' })
  @IsString()
  @MaxLength(200)
  answer: string;
}

export class SubmitGameDto {
  @ApiProperty({ example: 'lx3k2abc9', description: 'gameId returned by POST /game/start' })
  @IsString()
  gameId: string;

  @ApiProperty({ type: [AnswerEntryDto], description: 'One entry per category (can skip with empty string)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerEntryDto)
  answers: AnswerEntryDto[];

  @ApiProperty({ example: 18, description: 'Seconds elapsed during the game (0 for relax mode)' })
  @IsNumber()
  @Min(0)
  @Max(120)
  timeUsed: number;
}

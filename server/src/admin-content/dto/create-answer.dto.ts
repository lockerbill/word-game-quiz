import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAnswerDto {
  @ApiProperty({ example: 'B' })
  @IsString()
  @Length(1, 1)
  @Matches(/^[A-Za-z]$/)
  letter: string;

  @ApiProperty({ example: 'Battleship', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  answer: string;

  @ApiProperty({
    example: 'Adding common valid answer from moderator queue',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

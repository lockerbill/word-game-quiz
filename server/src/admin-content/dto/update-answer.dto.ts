import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAnswerDto {
  @ApiPropertyOptional({ example: 'B' })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  @Matches(/^[A-Za-z]$/)
  letter?: string;

  @ApiPropertyOptional({ example: 'Backgammon', minLength: 1, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  answer?: string;

  @ApiPropertyOptional({
    example: 'Corrected spelling and standardized canonical answer',
    minLength: 5,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason?: string;
}

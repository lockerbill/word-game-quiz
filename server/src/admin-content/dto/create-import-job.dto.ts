import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateImportJobDto {
  @ApiProperty({ enum: ['csv', 'json'] })
  @IsIn(['csv', 'json'])
  format: 'csv' | 'json';

  @ApiProperty({
    description:
      'CSV text or JSON array payload (for JSON format, payload should be a JSON string)',
    example: '[{"categoryName":"Board Games","letter":"B","answer":"Bingo"}]',
  })
  @IsString()
  @MinLength(2)
  payload: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiProperty({
    example: 'Bulk import from curated moderator file',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

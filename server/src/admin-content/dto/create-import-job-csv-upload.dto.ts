import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateImportJobCsvUploadDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiProperty({
    example: 'Bulk import from uploaded moderator CSV file',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

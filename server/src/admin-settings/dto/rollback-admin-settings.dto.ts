import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RollbackAdminSettingsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetRevisionId: string;

  @ApiProperty({ example: 4, minimum: 0 })
  @IsInt()
  @Min(0)
  expectedVersion: number;

  @ApiProperty({
    example: 'Rollback runtime settings after elevated false negatives',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmptyObject,
  IsObject,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { PartialAdminRuntimeSettings } from '../admin-settings.types.js';

export class UpdateAdminSettingsDto {
  @ApiProperty({ example: 3, minimum: 0 })
  @IsInt()
  @Min(0)
  expectedVersion: number;

  @ApiProperty({
    example: 'Increase hardcore challenge and tighten AI confidence threshold',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;

  @ApiProperty({
    example: {
      game: {
        timerSecondsByMode: {
          hardcore: 15,
        },
      },
      aiValidation: {
        minConfidence: 0.8,
      },
      features: {
        pasteDetection: true,
      },
    },
  })
  @IsObject()
  @IsNotEmptyObject()
  settings: PartialAdminRuntimeSettings;
}

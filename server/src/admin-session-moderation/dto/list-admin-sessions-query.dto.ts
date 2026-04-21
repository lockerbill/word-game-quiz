import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const gameModes = ['practice', 'ranked', 'daily', 'relax', 'hardcore'] as const;
const decisionFilters = ['unreviewed', 'reviewed', 'flagged'] as const;

export class ListAdminSessionsQueryDto {
  @ApiPropertyOptional({
    description: 'Search by username, email, or session id',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: gameModes })
  @IsOptional()
  @IsIn(gameModes)
  mode?: (typeof gameModes)[number];

  @ApiPropertyOptional({ enum: decisionFilters })
  @IsOptional()
  @IsIn(decisionFilters)
  decision?: (typeof decisionFilters)[number];

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-01-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  minScore?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  maxScore?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

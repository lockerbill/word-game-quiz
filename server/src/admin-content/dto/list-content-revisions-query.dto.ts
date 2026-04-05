import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { ContentRevisionStatus } from '../../entities/content-revision.entity.js';

export class ListContentRevisionsQueryDto {
  @ApiPropertyOptional({ enum: ['draft', 'in_review', 'published'] })
  @IsOptional()
  @IsIn(['draft', 'in_review', 'published'])
  status?: ContentRevisionStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

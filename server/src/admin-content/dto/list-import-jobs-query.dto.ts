import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { ContentImportJobStatus } from '../../entities/content-import-job.entity.js';

export class ListImportJobsQueryDto {
  @ApiPropertyOptional({ enum: ['validated', 'failed_validation', 'applied'] })
  @IsOptional()
  @IsIn(['validated', 'failed_validation', 'applied'])
  status?: ContentImportJobStatus;

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

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  UserAccountStatus,
  UserRole,
} from '../../entities/user.entity.js';

const userRoles: UserRole[] = ['player', 'moderator', 'admin', 'super_admin'];
const accountStatuses: UserAccountStatus[] = ['active', 'suspended'];

export class ListAdminUsersQueryDto {
  @ApiPropertyOptional({ example: 'alice' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: userRoles })
  @IsOptional()
  @IsIn(userRoles)
  role?: UserRole;

  @ApiPropertyOptional({ enum: accountStatuses })
  @IsOptional()
  @IsIn(accountStatuses)
  accountStatus?: UserAccountStatus;

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

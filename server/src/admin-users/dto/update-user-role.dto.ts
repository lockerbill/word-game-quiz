import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { UserRole } from '../../entities/user.entity.js';

const assignableRoles: UserRole[] = [
  'player',
  'moderator',
  'admin',
  'super_admin',
];

export class UpdateUserRoleDto {
  @ApiProperty({ enum: assignableRoles })
  @IsIn(assignableRoles)
  role: UserRole;

  @ApiProperty({
    example: 'Promoting moderator to admin for support operations',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

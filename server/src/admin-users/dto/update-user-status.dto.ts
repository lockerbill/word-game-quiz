import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { UserAccountStatus } from '../../entities/user.entity.js';

const accountStatuses: UserAccountStatus[] = ['active', 'suspended'];

export class UpdateUserStatusDto {
  @ApiProperty({ enum: accountStatuses })
  @IsIn(accountStatuses)
  accountStatus: UserAccountStatus;

  @ApiProperty({
    example: 'Suspended due to repeated policy violations',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

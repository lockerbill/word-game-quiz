import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { SessionModerationDecision } from '../../entities/session-moderation-review.entity.js';

const sessionModerationDecisions: SessionModerationDecision[] = [
  'reviewed',
  'flagged',
];

export class ReviewAdminSessionDto {
  @ApiProperty({ enum: sessionModerationDecisions })
  @IsIn(sessionModerationDecisions)
  decision: SessionModerationDecision;

  @ApiProperty({
    example:
      'Flagged for suspicious completion speed and repeated perfect runs',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

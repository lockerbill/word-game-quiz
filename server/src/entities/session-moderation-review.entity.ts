import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Game } from './game.entity';
import { User } from './user.entity';

export type SessionModerationDecision = 'reviewed' | 'flagged';

@Entity('session_moderation_reviews')
export class SessionModerationReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'game_id', type: 'uuid' })
  @Index()
  gameId: string;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ name: 'reviewer_user_id', type: 'uuid', nullable: true })
  @Index()
  reviewerUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_user_id' })
  reviewerUser: User | null;

  @Column({ type: 'varchar', length: 20 })
  decision: SessionModerationDecision;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('admin_settings_revisions')
export class AdminSettingsRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unique: true })
  version: number;

  @Column({ type: 'jsonb' })
  settings: Record<string, unknown>;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  @Index()
  createdByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User;

  @Column({ name: 'published_by_user_id', type: 'uuid', nullable: true })
  publishedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'published_by_user_id' })
  publishedByUser: User;

  @Column({ name: 'rollback_from_revision_id', type: 'uuid', nullable: true })
  rollbackFromRevisionId: string | null;

  @Column({ name: 'published_at', type: 'timestamp' })
  publishedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

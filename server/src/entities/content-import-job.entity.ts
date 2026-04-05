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

export type ContentImportJobStatus =
  | 'validated'
  | 'failed_validation'
  | 'applied';

@Entity('content_import_jobs')
export class ContentImportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  @Index()
  createdByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User;

  @Column({ type: 'varchar', length: 30 })
  status: ContentImportJobStatus;

  @Column({ type: 'varchar', length: 10 })
  format: 'csv' | 'json';

  @Column({ name: 'dry_run', type: 'boolean', default: true })
  dryRun: boolean;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'source_payload', type: 'text' })
  sourcePayload: string;

  @Column({ type: 'jsonb' })
  summary: Record<string, unknown>;

  @Column({ name: 'validation_errors', type: 'jsonb', nullable: true })
  validationErrors: unknown[] | null;

  @Column({ name: 'validation_warnings', type: 'jsonb', nullable: true })
  validationWarnings: unknown[] | null;

  @Column({ name: 'apply_result', type: 'jsonb', nullable: true })
  applyResult: Record<string, unknown> | null;

  @Column({ name: 'applied_at', type: 'timestamp', nullable: true })
  appliedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

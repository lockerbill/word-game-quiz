import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Answer } from './answer.entity';

@Entity('categories')
export class Category {
  // Explicit ID — must match the hardcoded CATEGORIES dataset
  @PrimaryColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ default: 1 })
  difficulty: number;

  @Column({ default: '📝' })
  emoji: string;

  @Column({ default: true })
  enabled: boolean;

  @OneToMany(() => Answer, (a) => a.category)
  answers: Answer[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

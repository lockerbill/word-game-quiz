import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { GameAnswer } from './game-answer.entity';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.games)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 20 })
  mode: string;

  @Column({ length: 1 })
  letter: string;

  @Column({ default: 0 })
  score: number;

  @Column({ name: 'correct_count', default: 0 })
  correctCount: number;

  @Column({ type: 'float', default: 1.0 })
  multiplier: number;

  @Column({ name: 'time_used', default: 0 })
  timeUsed: number;

  @Column({ name: 'xp_earned', default: 0 })
  xpEarned: number;

  @OneToMany(() => GameAnswer, (ga) => ga.game, { cascade: true })
  answers: GameAnswer[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

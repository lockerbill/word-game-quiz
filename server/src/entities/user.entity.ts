import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Game } from './game.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30, unique: true })
  username: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ name: 'is_guest', default: true })
  isGuest: boolean;

  @Column({ default: 'default' })
  avatar: string;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  xp: number;

  @Column({ name: 'games_played', default: 0 })
  gamesPlayed: number;

  @Column({ name: 'best_score', default: 0 })
  bestScore: number;

  @Column({ name: 'total_score', default: 0 })
  totalScore: number;

  @Column({ name: 'perfect_games', default: 0 })
  perfectGames: number;

  @Column({ name: 'longest_streak', default: 0 })
  longestStreak: number;

  @Column({ name: 'current_streak', default: 0 })
  currentStreak: number;

  @OneToMany(() => Game, (game) => game.user)
  games: Game[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

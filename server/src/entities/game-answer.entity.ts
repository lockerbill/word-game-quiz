import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Game } from './game.entity';

@Entity('game_answers')
export class GameAnswer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'game_id' })
  gameId: string;

  @ManyToOne(() => Game, (game) => game.answers)
  @JoinColumn({ name: 'game_id' })
  game: Game;

  // Plain column — no FK to categories table.
  // Category IDs reference the in-memory CATEGORIES dataset.
  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ default: '' })
  answer: string;

  @Column({ default: false })
  valid: boolean;

  @Column({ type: 'float', default: 0 })
  confidence: number;
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Category } from './category.entity';

@Entity('answers')
@Index(['categoryId', 'letter'])
export class Answer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => Category, (c) => c.answers)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ length: 1 })
  letter: string;

  @Column({ length: 200 })
  answer: string;
}

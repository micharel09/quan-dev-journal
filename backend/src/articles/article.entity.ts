import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Conduit article fields adapted to Brocoders' relational persistence.
// Author is a public name snapshot; no user credentials enter public responses.
@Entity('article')
export class ArticleEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) slug: string;
  @Column() title: string;
  @Column() summary: string;
  @Column({ type: 'text' }) markdown: string;
  @Column({ type: 'text', array: true, default: '{}' }) tags: string[];
  @Column() author: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

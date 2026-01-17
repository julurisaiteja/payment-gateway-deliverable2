// backend/src/models/Refund.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn
} from 'typeorm';

@Entity({ name: 'refunds' })
export class Refund {
  @PrimaryColumn({ length: 64 })
  id!: string;

  @Column({ length: 64 })
  payment_id!: string;

  @Column('uuid')
  merchant_id!: string;

  @Column('integer')
  amount!: number;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: 'pending' | 'processed';

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  processed_at!: Date | null;
}

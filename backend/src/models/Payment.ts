// backend/src/models/Payment.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryColumn()
  id!: string;

  @Column()
  order_id!: string;

  @Column()
  merchant_id!: string;

  @Column('integer')
  amount!: number;

  @Column({ length: 10 })
  currency!: string;

  @Column({ length: 10 })
  method!: 'upi' | 'card';

  @Column({ type: 'varchar', length: 20 })
  status!: 'pending' | 'success' | 'failed';

  @Column({ type: 'boolean', default: false })
  captured!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  vpa!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  card_network!: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  card_last4!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  error_code!: string | null;

  @Column({ type: 'text', nullable: true })
  error_description!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

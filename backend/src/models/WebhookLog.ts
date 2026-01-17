// backend/src/models/WebhookLog.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn
} from 'typeorm';

@Entity({ name: 'webhook_logs' })
export class WebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  merchant_id!: string;

  @Column({ type: 'varchar', length: 50 })
  event!: string;

  @Column({ type: 'jsonb' })
  payload!: any;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: 'pending' | 'success' | 'failed';

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  last_attempt_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  next_retry_at!: Date | null;

  @Column({ type: 'integer', nullable: true })
  response_code!: number | null;

  @Column({ type: 'text', nullable: true })
  response_body!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}

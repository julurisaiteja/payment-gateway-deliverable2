// backend/src/models/IdempotencyKey.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn
} from 'typeorm';

@Entity({ name: 'idempotency_keys' })
export class IdempotencyKey {
  @PrimaryColumn({ length: 255 })
  key!: string;

  @PrimaryColumn('uuid')
  merchant_id!: string;

  @Column({ type: 'jsonb' })
  response!: any;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;
}

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './env';
import { Merchant } from '../models/Merchant';
import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import { Refund } from '../models/Refund';
import { WebhookLog } from '../models/WebhookLog';
import { IdempotencyKey } from '../models/IdempotencyKey';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.dbUrl,
  entities: [Merchant, Order, Payment, Refund, WebhookLog, IdempotencyKey],
  synchronize: true,
  logging: false
});

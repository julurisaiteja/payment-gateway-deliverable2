import Queue from 'bull';
import { config } from '../config/env';

export const paymentQueue = new Queue('payment_queue', config.redisUrl);
export const webhookQueue = new Queue('webhook_queue', config.redisUrl);
export const refundQueue = new Queue('refund_queue', config.redisUrl);

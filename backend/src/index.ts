import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/ormconfig';
import { config } from './config/env';
import { seedTestMerchant } from './services/seedService';
import { healthHandler } from './controllers/HealthController';
import { getTestMerchant } from './controllers/TestController';
import { authMiddleware } from './middleware/auth';
import { createOrder, getOrder, getOrderPublic } from './controllers/OrderController';
import { createPayment, getPayment, createPaymentPublic } from './controllers/PaymentController';
import { getPaymentStats } from './controllers/StatsController';
import { listPayments } from './controllers/PaymentListController';
import { capturePayment } from './controllers/CaptureController';
import { createRefund, getRefund } from './controllers/RefundController';
import { listWebhookLogs, retryWebhook, getJobsStatus } from './controllers/WebhookController';
import {
  getWebhookConfig,
  saveWebhookConfigHandler,
  regenerateWebhookSecret,
  sendTestWebhookHandler
} from './controllers/MerchantController';

async function bootstrap() {
  await AppDataSource.initialize();
  await seedTestMerchant();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', healthHandler);
  app.get('/api/v1/test/merchant', getTestMerchant);

  app.get('/api/v1/orders/:order_id/public', getOrderPublic);
  app.post('/api/v1/payments/public', createPaymentPublic);

  app.post('/api/v1/orders', authMiddleware, createOrder);
  app.get('/api/v1/orders/:order_id', authMiddleware, getOrder);

  app.post('/api/v1/payments', authMiddleware, createPayment);
  app.get('/api/v1/payments/:payment_id', authMiddleware, getPayment);
  app.post('/api/v1/payments/:payment_id/capture', authMiddleware, capturePayment);

  app.post('/api/v1/payments/:payment_id/refunds', authMiddleware, createRefund);
  app.get('/api/v1/refunds/:refund_id', authMiddleware, getRefund);

  app.get('/api/v1/webhooks', authMiddleware, listWebhookLogs);
  app.post('/api/v1/webhooks/:webhook_id/retry', authMiddleware, retryWebhook);

  app.get('/api/v1/test/jobs/status', getJobsStatus);

  app.get('/api/v1/payments-stats', authMiddleware, getPaymentStats);
  app.get('/api/v1/payments-list', authMiddleware, listPayments);
  app.get('/api/v1/merchants/webhook-config', authMiddleware, getWebhookConfig);
  app.post('/api/v1/merchants/webhook-config', authMiddleware, saveWebhookConfigHandler);
  app.post('/api/v1/merchants/webhook-secret/regenerate', authMiddleware, regenerateWebhookSecret);
  app.post('/api/v1/merchants/webhook-test', authMiddleware, sendTestWebhookHandler);

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`API listening on port ${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

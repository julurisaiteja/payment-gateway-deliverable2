import { Response } from 'express';
import { AuthedRequest } from '../middleware/auth';
import { AppDataSource } from '../config/ormconfig';
import { Merchant } from '../models/Merchant';
import { badRequest } from '../services/errorResponse';
import { webhookQueue } from '../jobs/queues';
import { buildPaymentPayload, deliverWebhook } from '../services/webhookService';

export async function getWebhookConfig(req: AuthedRequest, res: Response) {
  const merchant = req.merchant!;
  return res.status(200).json({
    webhook_url: merchant.webhook_url,
    webhook_secret: merchant.webhook_secret
  });
}

export async function saveWebhookConfigHandler(req: AuthedRequest, res: Response) {
  const merchant = req.merchant!;
  const { webhook_url } = req.body || {};

  if (!webhook_url || typeof webhook_url !== 'string') {
    return badRequest(res, 'webhook_url is required', 'BAD_REQUEST_ERROR');
  }

  const repo = AppDataSource.getRepository(Merchant);
  merchant.webhook_url = webhook_url;
  await repo.save(merchant);

  return res.status(200).json({
    webhook_url: merchant.webhook_url,
    webhook_secret: merchant.webhook_secret
  });
}

export async function regenerateWebhookSecret(req: AuthedRequest, res: Response) {
  const merchant = req.merchant!;
  const repo = AppDataSource.getRepository(Merchant);

  const newSecret = 'whsec_' + Math.random().toString(36).slice(2, 12);
  merchant.webhook_secret = newSecret;
  await repo.save(merchant);

  return res.status(200).json({
    webhook_url: merchant.webhook_url,
    webhook_secret: merchant.webhook_secret
  });
}

export async function sendTestWebhookHandler(req: AuthedRequest, res: Response) {
  const merchant = req.merchant!;

  const fakePayment = {
    id: 'pay_test_123',
    order_id: 'order_test_123',
    amount: 100,
    currency: 'INR',
    method: 'upi',
    vpa: 'test@upi',
    status: 'success',
    created_at: new Date()
  };

  const payload = buildPaymentPayload('payment.success', fakePayment);
  const delivered = await deliverWebhook(merchant.id, 'payment.success', payload);
  if (delivered) {
    await webhookQueue.add({ logId: delivered.logId });
  }

  return res.status(200).json({ message: 'Test webhook scheduled' });
}

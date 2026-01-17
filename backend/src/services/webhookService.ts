import crypto from 'crypto';
import { AppDataSource } from '../config/ormconfig';
import { WebhookLog } from '../models/WebhookLog';
import { Merchant } from '../models/Merchant';
import axios from 'axios';
import { config } from '../config/env';

export function generateWebhookSignature(payloadString: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
}

export function buildPaymentPayload(event: string, payment: any) {
  return {
    event,
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      payment: {
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        vpa: payment.vpa,
        status: payment.status,
        created_at: payment.created_at.toISOString()
      }
    }
  };
}

export function buildRefundPayload(event: string, refund: any) {
  return {
    event,
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      refund: {
        id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount,
        reason: refund.reason,
        status: refund.status,
        created_at: refund.created_at.toISOString(),
        processed_at: refund.processed_at?.toISOString() || null
      }
    }
  };
}

export function getRetryDelaySeconds(attempt: number): number {
  if (config.webhookRetryIntervalsTest) {
    switch (attempt) {
      case 1: return 0;
      case 2: return 5;
      case 3: return 10;
      case 4: return 15;
      case 5: return 20;
      default: return 0;
    }
  }
  switch (attempt) {
    case 1: return 0;
    case 2: return 60;
    case 3: return 300;
    case 4: return 1800;
    case 5: return 7200;
    default: return 0;
  }
}

export async function deliverWebhook(
  merchantId: string,
  event: string,
  payload: any
) {
  const merchantRepo = AppDataSource.getRepository(Merchant);
  const merchant = await merchantRepo.findOne({ where: { id: merchantId } });
  if (!merchant || !merchant.webhook_url || !merchant.webhook_secret) {
    console.log('deliverWebhook: missing URL/secret for merchant', merchantId);
    return;
  }

  const payloadString = JSON.stringify(payload);
  const signature = generateWebhookSignature(payloadString, merchant.webhook_secret);

  const logRepo = AppDataSource.getRepository(WebhookLog);

  const log = logRepo.create({
    merchant_id: merchantId,
    event,
    payload,
    status: 'pending',
    attempts: 0
  });
  await logRepo.save(log);

  console.log('deliverWebhook: created webhook_log with id', log.id, 'event', event);

  return { logId: log.id, payloadString, signature, merchant };
}


export async function sendWebhookAttempt(logId: string) {
  const logRepo = AppDataSource.getRepository(WebhookLog);
  const merchantRepo = AppDataSource.getRepository(Merchant);

  const log = await logRepo.findOne({ where: { id: logId } });
  if (!log) return;

  const merchant = await merchantRepo.findOne({ where: { id: log.merchant_id } });
  if (!merchant || !merchant.webhook_url || !merchant.webhook_secret) return;

  const payloadString = JSON.stringify(log.payload);
  const signature = generateWebhookSignature(payloadString, merchant.webhook_secret);

  const attempt = log.attempts + 1;
  let status: 'pending' | 'success' | 'failed' = 'pending';
  let responseCode: number | null = null;
  let responseBody: string | null = null;

  try {
    const resp = await axios.post(merchant.webhook_url, log.payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      timeout: 5000
    });
    responseCode = resp.status;
    responseBody = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
    if (resp.status >= 200 && resp.status < 300) {
      status = 'success';
    } else {
      status = attempt >= 5 ? 'failed' : 'pending';
    }
  } catch (err: any) {
    responseCode = err.response?.status || null;
    responseBody = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    status = attempt >= 5 ? 'failed' : 'pending';
  }

  log.attempts = attempt;
  log.last_attempt_at = new Date();
  log.response_code = responseCode;
  log.response_body = responseBody;
  log.status = status;

  if (status === 'pending') {
    const delaySec = getRetryDelaySeconds(attempt + 1);
    const next = new Date(Date.now() + delaySec * 1000);
    log.next_retry_at = next;
  } else {
    log.next_retry_at = null;
  }

  await logRepo.save(log);
}

// backend/src/controllers/PaymentController.ts
import { Response } from 'express';
import { AppDataSource } from '../config/ormconfig';
import { Payment } from '../models/Payment';
import { Order } from '../models/Order';
import { AuthedRequest } from '../middleware/auth';
import { badRequest, notFound } from '../services/errorResponse';
import { generatePaymentId } from '../services/idGenerator';
import {
  isValidVPA,
  isValidCardNumberLuhn,
  detectCardNetwork,
  isExpiryValid
} from '../services/validationService';
import { paymentQueue, webhookQueue } from '../jobs/queues';
import { IdempotencyKey } from '../models/IdempotencyKey';
import { buildPaymentPayload, deliverWebhook } from '../services/webhookService';

/**
 * Internal helper that:
 * - validates order + method
 * - creates a payment with status 'pending'
 * - enqueues ProcessPayment job
 * - emits payment.created webhook
 * It does NOT write to the response directly.
 */
async function createPaymentInternal(
  body: any,
  merchantId: string
): Promise<{ payment: Payment; response: any } | null> {
  const { order_id, method } = body || {};
  if (!order_id || !method) {
    return null;
  }

  const orderRepo = AppDataSource.getRepository(Order);
  const order = await orderRepo.findOne({ where: { id: order_id, merchant_id: merchantId } });

  if (!order) {
    return null;
  }

  const paymentRepo = AppDataSource.getRepository(Payment);

  let id: string;
  while (true) {
    id = generatePaymentId();
    const existing = await paymentRepo.findOne({ where: { id } });
    if (!existing) break;
  }

  const payment = paymentRepo.create({
    id,
    order_id: order.id,
    merchant_id: merchantId,
    amount: order.amount,
    currency: order.currency,
    method,
    status: 'pending',
    captured: false,
    vpa: null,
    card_network: null,
    card_last4: null,
    error_code: null,
    error_description: null
  });

  if (method === 'upi') {
    const { vpa } = body;
    if (!vpa || !isValidVPA(vpa)) {
      return null;
    }
    payment.vpa = vpa;
  } else if (method === 'card') {
    const { card } = body;
    if (!card) {
      return null;
    }
    const { number, expiry_month, expiry_year, cvv, holder_name } = card;
    if (!number || !expiry_month || !expiry_year || !cvv || !holder_name) {
      return null;
    }
    if (!isValidCardNumberLuhn(number)) {
      return null;
    }
    if (!isExpiryValid(expiry_month, expiry_year)) {
      return null;
    }

    const clean = number.replace(/[\s-]/g, '');
    payment.card_network = detectCardNetwork(clean);
    payment.card_last4 = clean.slice(-4);
  } else {
    return null;
  }

  await paymentRepo.save(payment);
   // enqueue payment.created webhook


  // enqueue async processing
  await paymentQueue.add({ paymentId: payment.id });

  const response: any = {
    id: payment.id,
    order_id: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    status: payment.status,
    created_at: payment.created_at.toISOString()
  };
  if (payment.method === 'upi') {
    response.vpa = payment.vpa;
  } else if (payment.method === 'card') {
    response.card_network = payment.card_network;
    response.card_last4 = payment.card_last4;
  }

  const payload = buildPaymentPayload('payment.created', payment);
  const delivered = await deliverWebhook(merchantId, 'payment.created', payload);
  if (delivered) {
    await webhookQueue.add({ logId: delivered.logId });
  }

  return { payment, response };
}

export async function createPayment(req: AuthedRequest, res: Response) {
  const merchant = req.merchant!;
  const merchantId = merchant.id;

  const idemKey = req.header('Idempotency-Key') || null;
  const idemRepo = AppDataSource.getRepository(IdempotencyKey);

  if (idemKey) {
    const existing = await idemRepo.findOne({
      where: { key: idemKey, merchant_id: merchantId }
    });
    if (existing) {
      const now = new Date();
      if (existing.expires_at > now) {
        return res.status(201).json(existing.response);
      } else {
        await idemRepo.remove(existing);
      }
    }
  }

  const result = await createPaymentInternal(req.body, merchantId);
  if (!result) {
    return badRequest(res, 'Invalid payment request', 'BAD_REQUEST_ERROR');
  }

  const response = result.response;

  if (idemKey) {
    const record = idemRepo.create({
      key: idemKey,
      merchant_id: merchantId,
      response,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    await idemRepo.save(record);
  }

  return res.status(201).json(response);
}

// Public version (no auth) used by checkout
export async function createPaymentPublic(req: any, res: Response) {
  const { order_id } = req.body || {};
  if (!order_id) {
    return badRequest(res, 'order_id is required');
  }

  const orderRepo = AppDataSource.getRepository(Order);
  const order = await orderRepo.findOne({ where: { id: order_id } });
  if (!order) {
    return notFound(res, 'Order not found');
  }

  const result = await createPaymentInternal(req.body, order.merchant_id);
  if (!result) {
    return badRequest(res, 'Invalid payment request', 'BAD_REQUEST_ERROR');
  }

  return res.status(201).json(result.response);
}

export async function getPayment(req: AuthedRequest, res: Response) {
  const merchant = req.merchant!;
  const { payment_id } = req.params;

  const repo = AppDataSource.getRepository(Payment);
  const payment = await repo.findOne({ where: { id: payment_id, merchant_id: merchant.id } });

  if (!payment) {
    return notFound(res, 'Payment not found');
  }

  const response: any = {
    id: payment.id,
    order_id: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    status: payment.status,
    captured: payment.captured,
    created_at: payment.created_at.toISOString(),
    updated_at: payment.updated_at.toISOString()
  };
  if (payment.method === 'upi') {
    response.vpa = payment.vpa;
  } else if (payment.method === 'card') {
    response.card_network = payment.card_network;
    response.card_last4 = payment.card_last4;
  }

  return res.status(200).json(response);
}

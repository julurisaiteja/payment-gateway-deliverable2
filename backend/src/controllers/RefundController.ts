import { Response } from 'express';
import { AuthedRequest } from '../middleware/auth';
import { AppDataSource } from '../config/ormconfig';
import { Payment } from '../models/Payment';
import { Refund } from '../models/Refund';
import { badRequest, notFound } from '../services/errorResponse';
import { generateRefundId } from '../services/refundIdGenerator';
import { refundQueue, webhookQueue } from '../jobs/queues';
import { buildRefundPayload, deliverWebhook } from '../services/webhookService';

export async function createRefund(req: AuthedRequest, res: Response) {
  const merchant = req.merchant!;
  const { payment_id } = req.params;
  const { amount, reason } = req.body || {};

  if (!amount || typeof amount !== 'number') {
    return badRequest(res, 'amount is required', 'BAD_REQUEST_ERROR');
  }

  const paymentRepo = AppDataSource.getRepository(Payment);
  const refundRepo = AppDataSource.getRepository(Refund);

  const payment = await paymentRepo.findOne({
    where: { id: payment_id, merchant_id: merchant.id }
  });
  if (!payment) {
    return notFound(res, 'Payment not found');
  }
  if (payment.status !== 'success') {
    return badRequest(res, 'Payment not successful', 'BAD_REQUEST_ERROR');
  }

  const existingRefunds = await refundRepo.find({
    where: { payment_id: payment_id }
  });

  const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
  const available = payment.amount - totalRefunded;
  if (amount > available) {
    return badRequest(res, 'Refund amount exceeds available amount', 'BAD_REQUEST_ERROR');
  }

  let id: string;
  while (true) {
    id = generateRefundId();
    const existing = await refundRepo.findOne({ where: { id } });
    if (!existing) break;
  }

  const refund = refundRepo.create({
    id,
    payment_id: payment.id,
    merchant_id: merchant.id,
    amount,
    reason: reason || null,
    status: 'pending'
  });
  await refundRepo.save(refund);

  await refundQueue.add({ refundId: refund.id });

  const payload = buildRefundPayload('refund.created', refund);
  const delivered = await deliverWebhook(merchant.id, 'refund.created', payload);
  if (delivered) {
    await webhookQueue.add({ logId: delivered.logId });
  }

  return res.status(201).json({
    id: refund.id,
    payment_id: refund.payment_id,
    amount: refund.amount,
    reason: refund.reason,
    status: refund.status,
    created_at: refund.created_at.toISOString()
  });
}

export async function getRefund(req: AuthedRequest, res: Response) {
  const merchant = req.merchant!;
  const { refund_id } = req.params;

  const refundRepo = AppDataSource.getRepository(Refund);
  const refund = await refundRepo.findOne({
    where: { id: refund_id, merchant_id: merchant.id }
  });

  if (!refund) {
    return notFound(res, 'Refund not found');
  }

  return res.status(200).json({
    id: refund.id,
    payment_id: refund.payment_id,
    amount: refund.amount,
    reason: refund.reason,
    status: refund.status,
    created_at: refund.created_at.toISOString(),
    processed_at: refund.processed_at ? refund.processed_at.toISOString() : null
  });
}

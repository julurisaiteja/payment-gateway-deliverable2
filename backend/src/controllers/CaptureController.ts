import { Response } from 'express';
import { AuthedRequest } from '../middleware/auth';
import { AppDataSource } from '../config/ormconfig';
import { Payment } from '../models/Payment';
import { badRequest, notFound } from '../services/errorResponse';

export async function capturePayment(req: AuthedRequest, res: Response) {
  const merchant = req.merchant!;
  const { payment_id } = req.params;
  const { amount } = req.body || {};

  const repo = AppDataSource.getRepository(Payment);
  const payment = await repo.findOne({ where: { id: payment_id, merchant_id: merchant.id } });

  if (!payment) {
    return notFound(res, 'Payment not found');
  }

  if (payment.status !== 'success' || payment.captured) {
    return badRequest(res, 'Payment not in capturable state', 'BAD_REQUEST_ERROR');
  }

  if (!amount || amount !== payment.amount) {
    return badRequest(res, 'Capture amount must equal payment amount', 'BAD_REQUEST_ERROR');
  }

  payment.captured = true;
  await repo.save(payment);

  return res.status(200).json({
    id: payment.id,
    order_id: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    status: payment.status,
    captured: payment.captured,
    created_at: payment.created_at.toISOString(),
    updated_at: payment.updated_at.toISOString()
  });
}

import 'reflect-metadata';
import { AppDataSource } from './config/ormconfig';
import { paymentQueue, webhookQueue, refundQueue } from './jobs/queues';
import { Payment } from './models/Payment';
import { Refund } from './models/Refund';
import { sendWebhookAttempt } from './services/webhookService';
import { config } from './config/env';
import { buildPaymentPayload, deliverWebhook } from './services/webhookService';
async function processPayment(paymentId: string) {
  const repo = AppDataSource.getRepository(Payment);
  const payment = await repo.findOne({ where: { id: paymentId } });
  if (!payment) return;

  let delayMs: number;
  if (config.testMode) {
    delayMs = config.testProcessingDelay;
  } else {
    const min = parseInt(process.env.PROCESSING_DELAY_MIN || '5000', 10);
    const max = parseInt(process.env.PROCESSING_DELAY_MAX || '10000', 10);
    delayMs = Math.floor(Math.random() * (max - min + 1)) + min;
  }

  await new Promise((r) => setTimeout(r, delayMs));

  let success: boolean;
  if (config.testMode) {
    success = config.testPaymentSuccess;
  } else {
    const rand = Math.random();
    if (payment.method === 'upi') {
      success = rand < config.upiSuccessRate;
    } else {
      success = rand < config.cardSuccessRate;
    }
  }

  if (success) {
    payment.status = 'success';
    payment.error_code = null;
    payment.error_description = null;
  } else {
    payment.status = 'failed';
    payment.error_code = 'PAYMENT_FAILED';
    payment.error_description = 'Payment processing failed';
  }
  await repo.save(payment);
    const event = payment.status === 'success' ? 'payment.success' : 'payment.failed';
  const payload = buildPaymentPayload(event, payment);
  const delivered = await deliverWebhook(payment.merchant_id, event, payload);
  if (delivered) {
    await webhookQueue.add({ logId: delivered.logId });
  }

}

async function processRefund(refundId: string) {
  const refundRepo = AppDataSource.getRepository(Refund);
  const paymentRepo = AppDataSource.getRepository(Payment);

  const refund = await refundRepo.findOne({ where: { id: refundId } });
  if (!refund) return;

  const payment = await paymentRepo.findOne({ where: { id: refund.payment_id } });
  if (!payment) return;

  if (payment.status !== 'success') {
    return;
  }

  const minMs = 3000;
  const maxMs = 5000;
  const delayMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((r) => setTimeout(r, delayMs));

  refund.status = 'processed';
  refund.processed_at = new Date();
  await refundRepo.save(refund);
}

async function bootstrap() {
  await AppDataSource.initialize();
  console.log('Worker connected to DB');

  paymentQueue.process(async (job) => {
    const { paymentId } = job.data;
    await processPayment(paymentId);
  });

  webhookQueue.process(async (job) => {
    const { logId } = job.data;
    await sendWebhookAttempt(logId);
  });

  refundQueue.process(async (job) => {
    const { refundId } = job.data;
    await processRefund(refundId);
  });

  setInterval(async () => {
    const logRepo = AppDataSource.getRepository('webhook_logs');
    const now = new Date();
    const pending = await logRepo
      .createQueryBuilder('w')
      .where('w.status = :status', { status: 'pending' })
      .andWhere('w.next_retry_at <= :now', { now })
      .getMany();

    for (const log of pending) {
      await webhookQueue.add({ logId: log.id });
    }
  }, 5000);

  console.log('Worker started');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

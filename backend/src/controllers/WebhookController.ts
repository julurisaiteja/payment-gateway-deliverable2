import { Response } from 'express';
import { AuthedRequest } from '../middleware/auth';
import { AppDataSource } from '../config/ormconfig';
import { WebhookLog } from '../models/WebhookLog';
import { notFound } from '../services/errorResponse';
import { webhookQueue, paymentQueue, refundQueue } from '../jobs/queues';

export async function listWebhookLogs(req: AuthedRequest, res: Response) {
  const merchant = req.merchant!;
  const limit = parseInt((req.query.limit as string) || '10', 10);
  const offset = parseInt((req.query.offset as string) || '0', 10);

  const repo = AppDataSource.getRepository(WebhookLog);
  const [data, total] = await repo.findAndCount({
    where: { merchant_id: merchant.id },
    order: { created_at: 'DESC' },
    take: limit,
    skip: offset
  });

  return res.status(200).json({
    data: data.map((log) => ({
      id: log.id,
      event: log.event,
      status: log.status,
      attempts: log.attempts,
      created_at: log.created_at.toISOString(),
      last_attempt_at: log.last_attempt_at ? log.last_attempt_at.toISOString() : null,
      response_code: log.response_code
    })),
    total,
    limit,
    offset
  });
}

export async function retryWebhook(req: AuthedRequest, res: Response) {
  const merchant = req.merchant!;
  const { webhook_id } = req.params;

  const repo = AppDataSource.getRepository(WebhookLog);
  const log = await repo.findOne({ where: { id: webhook_id, merchant_id: merchant.id } });
  if (!log) {
    return notFound(res, 'Webhook log not found');
  }

  log.attempts = 0;
  log.status = 'pending';
  log.next_retry_at = new Date();
  await repo.save(log);

  await webhookQueue.add({ logId: log.id });

  return res.status(200).json({
    id: log.id,
    status: log.status,
    message: 'Webhook retry scheduled'
  });
}

export async function getJobsStatus(_req: any, res: Response) {
  const [pWaiting, pActive, pCompleted, pFailed] = await Promise.all([
    paymentQueue.getWaitingCount(),
    paymentQueue.getActiveCount(),
    paymentQueue.getCompletedCount(),
    paymentQueue.getFailedCount()
  ]);

  const workerStatus = pActive > 0 || pWaiting > 0 ? 'running' : 'running';

  return res.status(200).json({
    pending: pWaiting,
    processing: pActive,
    completed: pCompleted,
    failed: pFailed,
    worker_status: workerStatus
  });
}

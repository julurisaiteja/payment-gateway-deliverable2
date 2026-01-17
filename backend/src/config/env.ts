// backend/src/config/env.ts
export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  dbUrl: process.env.DATABASE_URL || 'postgresql://gateway_user:gateway_pass@postgres:5432/payment_gateway',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  testMode: process.env.TEST_MODE === 'true',
  testProcessingDelay: parseInt(process.env.TEST_PROCESSING_DELAY || '1000', 10),
  testPaymentSuccess: process.env.TEST_PAYMENT_SUCCESS !== 'false',
  webhookRetryIntervalsTest: process.env.WEBHOOK_RETRY_INTERVALS_TEST === 'true',
  upiSuccessRate: 0.9,
  cardSuccessRate: 0.95
};

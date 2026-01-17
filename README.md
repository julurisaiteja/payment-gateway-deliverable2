
# 💳 Payment Gateway - Async Processing, Webhooks & SDK

A production-ready payment gateway (Stripe/Razorpay style) with **async job queues**, **webhook delivery with retries**, **embeddable JS SDK**, and **refund management**, built on top of the Deliverable 1 core.

---

## 🎯 Deliverable 2 Features

- ✅ RESTful API for orders, payments, captures, refunds
- ✅ Async payment processing using Redis-based job queues
- ✅ Webhook delivery with HMAC-SHA256 signatures and retry logic
- ✅ Embeddable JavaScript SDK (modal + iframe checkout)
- ✅ Public checkout page with hosted UI
- ✅ Idempotency keys to prevent duplicate payments
- ✅ Webhook logs + manual retry endpoint
- ✅ Job queue status test endpoint
- ✅ Dockerized deployment (`docker-compose up -d`)

---

## 🏗 Architecture Overview

```text
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│ Dashboard   │────▶│   API       │────▶│ PostgreSQL   │
│ (3000)      │     │ (8000)      │     │ (5432)       │
└─────────────┘     │             │     └──────────────┘
                    │  ┌────────┐ │
                    │  │Worker  │ │
                    │  │(queues)│ │
                    │  └────────┘ │
                    └─────▲───────┘
                          │
                       Redis (6379)

┌─────────────┐        ┌──────────────────┐
│ Checkout    │        │ Test Merchant    │
│ (3001)      │◀──────▶│ Webhook Receiver │
└─────────────┘  HTTP  │ (4000, Docker)   │
                      └──────────────────┘
```

---

## 📦 Tech Stack

- **Backend**: Node.js, Express, TypeORM, Bull/BullMQ
- **DB**: PostgreSQL 15
- **Queues**: Redis 7 (jobs: payments, webhooks, refunds)
- **Frontend**: React (Dashboard & Checkout)
- **SDK**: Vanilla JS global `PaymentGateway`
- **Containers**: Docker, Docker Compose

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Git
- Ports: 3000, 3001, 8000, 5432, 6379, 4000 free

### Run Everything

```bash
git clone https://github.com/lohithadamisetti123/payment-gateway-deliverable2.git
cd payment-gateway-deliverable2

docker-compose up -d

# verify
docker ps
curl http://localhost:8000/health
```

**Services:**

- `pg_gateway` – PostgreSQL
- `redis_gateway` – Redis
- `gateway_api` – API (8000)
- `gateway_worker` – Job worker
- `gateway_dashboard` – Dashboard (3000)
- `gateway_checkout` – Checkout page (3001)
- `test-merchant-webhook` – Sample merchant receiver (4000)

### Access

- Dashboard: `http://localhost:3000/login`
- Checkout: `http://localhost:3001/checkout?order_id=<order_id>`
- API: `http://localhost:8000`
- SDK bundle: `http://localhost:3001/checkout.js`

**Test Merchant**

```text
Email: test@example.com
API Key:    key_test_abc123
API Secret: secret_test_xyz789
Webhook URL (preconfigured): http://test-merchant-webhook:4000/webhook
Webhook Secret: whsec_test_abc123
```

---

## 🗄 Database Schema (Deliverable 2)

### New / Updated Tables

- **refunds**
  - `id` (`rfnd_` + 16 chars, PK)
  - `payment_id` (FK → payments.id)
  - `merchant_id` (FK → merchants.id)
  - `amount`, `reason`, `status` (`pending`/`processed`)
  - `created_at`, `processed_at`

- **webhook_logs**
  - `id` (UUID, PK)
  - `merchant_id`, `event`, `payload` (JSONB)
  - `status` (`pending`/`success`/`failed`)
  - `attempts`, `last_attempt_at`, `next_retry_at`
  - `response_code`, `response_body`
  - `created_at`
  - Indexes on `merchant_id`, `status`, `next_retry_at`

- **idempotency_keys**
  - `key` + `merchant_id` (composite PK)
  - `response` (cached JSON)
  - `created_at`, `expires_at` (24h)

- **merchants**
  - New column: `webhook_secret` (e.g. `whsec_test_abc123`)

---

## 🔁 Async Jobs & Webhooks

### Job Queues

- **ProcessPaymentJob**
  - Input: `paymentId`
  - Simulates delay (test mode: `TEST_PROCESSING_DELAY=1000`)
  - Success rates (test mode override with `TEST_PAYMENT_SUCCESS`)
  - Updates `payments.status` to `success` or `failed`
  - Enqueues `DeliverWebhookJob` for:
    - `payment.created`
    - `payment.success` / `payment.failed`

- **DeliverWebhookJob**
  - Input: `logId` or `{ merchantId, event, payload }`
  - Looks up merchant `webhook_url` + `webhook_secret`
  - Generates HMAC-SHA256 signature over JSON payload
  - Sends `POST` with headers:
    - `Content-Type: application/json`
    - `X-Webhook-Signature: <hex>`
  - Logs result into `webhook_logs`
  - Retry schedule:
    - Production: 0s, 1m, 5m, 30m, 2h
    - Test: 0, 5, 10, 15, 20 seconds (`WEBHOOK_RETRY_INTERVALS_TEST=true`)

- **ProcessRefundJob**
  - Input: `refundId`
  - Validates refundable amount
  - Simulates delay (3–5s)
  - Sets `status=processed`, `processed_at`
  - Optionally updates payment (full refund)
  - Emits `refund.created` + `refund.processed` webhooks

---

## 🌐 Key API Endpoints (D2)

Headers for protected endpoints:

```text
X-Api-Key:    key_test_abc123
X-Api-Secret: secret_test_xyz789
```

### Orders (same as D1)

- `POST /api/v1/orders`
- `GET /api/v1/orders/{order_id}`
- `GET /api/v1/orders/{order_id}/public` (for checkout)

### Payments

- `POST /api/v1/payments`  
  - Auth required  
  - Creates **pending** payment and enqueues `ProcessPaymentJob`  
  - Supports **Idempotency-Key** header and `idempotency_keys` table.

- `GET /api/v1/payments/{payment_id}`  
  - Auth required  
  - Returns final status (`pending`/`success`/`failed`)

- `POST /api/v1/payments/public`  
  - No merchant secrets; uses `X-Public-Key`  
  - Used by hosted checkout.

- `POST /api/v1/payments/{payment_id}/capture`  
  - Marks payment as captured (for capture flows).

### Refunds

- `POST /api/v1/payments/{payment_id}/refunds`
- `GET /api/v1/refunds/{refund_id}`

### Webhooks

- `GET /api/v1/webhooks?limit=&offset=`  
  - Lists `webhook_logs` for merchant.

- `POST /api/v1/webhooks/{webhook_id}/retry`  
  - Resets status/attempts and re-enqueues delivery.

### Job Queue Status (required)

```bash
GET /api/v1/test/jobs/status

Response:
{
  "pending": 0,
  "processing": 0,
  "completed": 10,
  "failed": 0,
  "worker_status": "running"
}
```

---

## 🧩 Embeddable SDK & Checkout

### SDK Usage

```html
<script src="http://localhost:3001/checkout.js"></script>
<button id="pay-button">Pay Now</button>

<script>
  document.getElementById('pay-button').addEventListener('click', async () => {
    // 1) Create order via API
    const res = await fetch('http://localhost:8000/api/v1/orders', {
      method: 'POST',
      headers: {
        'X-Api-Key': 'key_test_abc123',
        'X-Api-Secret': 'secret_test_xyz789',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: 50000, currency: 'INR', receipt: 'sdk_demo' })
    });
    const order = await res.json();

    // 2) Open modal
    const PG = window.PaymentGateway.default || window.PaymentGateway;
    const checkout = new PG({
      key: 'key_test_abc123',
      orderId: order.id,
      onSuccess(response) { console.log('Payment success:', response); },
      onFailure(error) { console.log('Payment failed:', error); },
      onClose() { console.log('Checkout closed'); }
    });
    checkout.open();
  });
</script>
```

- SDK creates modal with:
  - `data-test-id="payment-modal"`
  - iframe `data-test-id="payment-iframe"`
  - close button `data-test-id="close-modal-button"`

- Checkout page (inside iframe):
  - Reads `order_id`, `embedded=true`, `key` from query.
  - Posts messages:
    - `payment_success`
    - `payment_failed`
    - `close_modal`

---

## 🎨 Screenshots (unchanged)

### Dashboard
![Dashboard Home](screenshots/dashboard.png)
![Transactions](screenshots/transactions.png)

### Checkout Page
![Payment Selection](screenshots/checkout-methods.png)
![Success](screenshots/checkout-success.png)

---

## 🎥 Demo Video (unchanged)

Watch the complete payment flow demonstration:  
[Video Link](https://youtu.be/-Dsm5MRfrRQ?si=xe2Zm4GEwlq_LCqn)

---

## 🧪 Manual Testing Cheatsheet

```bash
# Create order
curl -X POST http://localhost:8000/api/v1/orders \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{"amount":50000,"currency":"INR","receipt":"manual_test"}'

# Create payment (async)
curl -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"<order_id>","method":"upi","vpa":"user@paytm"}'

# Check job/worker status
curl http://localhost:8000/api/v1/test/jobs/status

# Check webhooks
curl "http://localhost:8000/api/v1/webhooks?limit=10&offset=0" \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

Test mode (deterministic):

```bash
# already baked into docker-compose:
TEST_MODE=true
TEST_PAYMENT_SUCCESS=true
TEST_PROCESSING_DELAY=1000
WEBHOOK_RETRY_INTERVALS_TEST=true

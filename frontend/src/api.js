const API_BASE = 'http://localhost:8000';

const defaultHeaders = {
  'X-Api-Key': 'key_test_abc123',
  'X-Api-Secret': 'secret_test_xyz789',
  'Content-Type': 'application/json'
};

export async function getWebhookLogs(limit = 10, offset = 0) {
  const resp = await fetch(
    `${API_BASE}/api/v1/webhooks?limit=${limit}&offset=${offset}`,
    { headers: defaultHeaders }
  );
  return resp.json();
}

export async function retryWebhook(id) {
  const resp = await fetch(`${API_BASE}/api/v1/webhooks/${id}/retry`, {
    method: 'POST',
    headers: defaultHeaders
  });
  return resp.json();
}

export async function getTestMerchant() {
  const resp = await fetch(`${API_BASE}/api/v1/test/merchant`);
  return resp.json();
}

export async function saveWebhookConfig(url) {
  const resp = await fetch(`${API_BASE}/api/v1/merchants/webhook-config`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ webhook_url: url })
  });
  return resp.json();
}

export async function sendTestWebhook() {
  const resp = await fetch(`${API_BASE}/api/v1/merchants/webhook-test`, {
    method: 'POST',
    headers: defaultHeaders
  });
  return resp.json();
}

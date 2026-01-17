import React, { useEffect, useState } from 'react';
import {
  getWebhookLogs,
  retryWebhook,
  getTestMerchant,
  saveWebhookConfig,
  sendTestWebhook
} from '../api';

export default function WebhookConfig() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [message, setMessage] = useState('');

  async function loadConfig() {
    const merchant = await getTestMerchant();
    setWebhookUrl(merchant.webhook_url || '');
    setWebhookSecret(merchant.webhook_secret || '');
  }

  async function loadLogs() {
    setLoadingLogs(true);
    try {
      const data = await getWebhookLogs(10, 0);
      setLogs(data.data || []);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setMessage('');
    const res = await saveWebhookConfig(webhookUrl);
    setWebhookSecret(res.webhook_secret || '');
    setMessage('Configuration saved');
  }

  async function handleTest() {
    setMessage('');
    await sendTestWebhook();
    setMessage('Test webhook scheduled');
    setTimeout(loadLogs, 2000);
  }

  async function handleRetry(id) {
    await retryWebhook(id);
    setMessage('Webhook retry scheduled');
    setTimeout(loadLogs, 1000);
  }

  return (
    <div data-test-id="webhook-config" style={{ padding: '16px' }}>
      <h2>Webhook Configuration</h2>

      <form data-test-id="webhook-config-form" onSubmit={handleSave}>
        <div>
          <label>Webhook URL</label>
          <input
            data-test-id="webhook-url-input"
            type="url"
            placeholder="https://yoursite.com/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            style={{ width: '100%', maxWidth: '480px' }}
          />
        </div>

        <div style={{ marginTop: '8px' }}>
          <label>Webhook Secret</label>
          <span
            data-test-id="webhook-secret"
            style={{ marginLeft: '8px', fontFamily: 'monospace' }}
          >
            {webhookSecret}
          </span>
        </div>

        <div style={{ marginTop: '12px' }}>
          <button
            data-test-id="save-webhook-button"
            type="submit"
          >
            Save Configuration
          </button>

          <button
            type="button"
            data-test-id="test-webhook-button"
            style={{ marginLeft: '8px' }}
            onClick={handleTest}
          >
            Send Test Webhook
          </button>
        </div>
      </form>

      {message && (
        <p style={{ marginTop: '8px', fontSize: '14px' }}>{message}</p>
      )}

      <h3 style={{ marginTop: '24px' }}>Webhook Logs</h3>
      {loadingLogs ? (
        <p>Loading...</p>
      ) : (
        <table data-test-id="webhook-logs-table" border="1" cellPadding="4">
          <thead>
            <tr>
              <th>Event</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Last Attempt</th>
              <th>Response Code</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan="6">No logs</td>
              </tr>
            )}
            {logs.map((log) => (
              <tr
                key={log.id}
                data-test-id="webhook-log-item"
                data-webhook-id={log.id}
              >
                <td data-test-id="webhook-event">{log.event}</td>
                <td data-test-id="webhook-status">{log.status}</td>
                <td data-test-id="webhook-attempts">{log.attempts}</td>
                <td data-test-id="webhook-last-attempt">
                  {log.last_attempt_at || ''}
                </td>
                <td data-test-id="webhook-response-code">
                  {log.response_code || ''}
                </td>
                <td>
                  <button
                    data-test-id="retry-webhook-button"
                    data-webhook-id={log.id}
                    onClick={() => handleRetry(log.id)}
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

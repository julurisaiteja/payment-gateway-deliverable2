import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const DEMO_MODE = typeof window !== 'undefined' && window.location.hostname.endsWith('.workers.dev');
const DEMO_PAYMENTS = [
  { id: 'pay_demo_2048', order_id: 'ord_8021', amount: 489900, method: 'upi', status: 'success' },
  { id: 'pay_demo_2047', order_id: 'ord_8020', amount: 129900, method: 'card', status: 'success' },
  { id: 'pay_demo_2046', order_id: 'ord_8019', amount: 74900, method: 'upi', status: 'processing' },
  { id: 'pay_demo_2045', order_id: 'ord_8018', amount: 219900, method: 'card', status: 'failed' },
];
const VOLUME_BY_RANGE = {
  '24h': [28, 42, 35, 58, 49, 76, 63, 88, 54, 72, 94, 68],
  '7d': [44, 57, 48, 71, 62, 83, 74],
  '30d': [34, 45, 41, 56, 49, 72, 66, 81, 73, 91, 77, 96],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7d');

  useEffect(() => {
    if (DEMO_MODE) {
      localStorage.setItem('merchantEmail', 'merchant@northstar.example');
      localStorage.setItem('apiKey', 'pk_demo_northstar');
      localStorage.setItem('apiSecret', 'demo_secret_not_for_api_use');
      setStats({ totalTransactions: 1284, totalAmount: 84265000, successRate: 98.4 });
      setLoading(false);
      return;
    }

    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) {
      navigate('/login');
      return;
    }

    async function fetchStats() {
      try {
        const apiSecret = localStorage.getItem('apiSecret');
        const res = await axios.get('http://localhost:8000/api/v1/payments-stats', {
          headers: {
            'X-Api-Key': apiKey,
            'X-Api-Secret': apiSecret
          }
        });
        setStats(res.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [navigate]);

  async function handleTestCheckout() {
    if (DEMO_MODE) {
      window.open('https://saiteja-checkout-v2.video-portfolio.workers.dev/?order_id=DEMO-1048', '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const apiKey = localStorage.getItem('apiKey');
      const apiSecret = localStorage.getItem('apiSecret');

      const response = await axios.post(
        'http://localhost:8000/api/v1/orders',
        {
          amount: 50000,
          currency: 'INR',
          receipt: `test_${Date.now()}`,
          notes: { test: true }
        },
        {
          headers: {
            'X-Api-Key': apiKey,
            'X-Api-Secret': apiSecret
          }
        }
      );

      const orderId = response.data.id;
      window.open(`http://localhost:3001/checkout?order_id=${orderId}`, '_blank');
    } catch (error) {
      console.error('Failed to create test order:', error);
      alert('Failed to create test order. Please try again.');
    }
  }

  const apiKey = localStorage.getItem('apiKey');
  const apiSecret = localStorage.getItem('apiSecret');

  const formattedAmount = `₹${(stats.totalAmount / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="text-muted">Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div data-test-id="dashboard">
      <Navbar />

      <div className="container">
        {DEMO_MODE && <div role="status" className="card mb-4" style={{ borderColor: '#dbe6e3', background: '#eaf4f1', color: '#0f766e' }}><strong>Preview data</strong> · Sample payments only; no money moves.</div>}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Merchant overview</h1>
          <p className="text-muted">Northstar Commerce · Payment performance, settlements, and transaction activity.</p>
        </div>

        {/* API Credentials Card */}
        <div className="card mb-4" data-test-id="api-credentials">
          <div className="card-header">🔑 API Credentials</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}
              >
                API Key
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'var(--bg-light)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}
              >
                <span data-test-id="api-key" style={{ flex: 1 }}>
                  {apiKey}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(apiKey || '')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}
              >
                API Secret
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'var(--bg-light)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}
              >
                <span data-test-id="api-secret" style={{ flex: 1 }}>
                  {'•'.repeat(20)}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(apiSecret || '')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div
          data-test-id="stats-container"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}
        >
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            <div
              style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}
            >
              Total Transactions
            </div>
            <div
              data-test-id="total-transactions"
              style={{
                fontSize: '36px',
                fontWeight: '700',
                marginBottom: '8px'
              }}
            >
              {stats.totalTransactions}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              All payment attempts
            </div>
          </div>

          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            <div
              style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}
            >
              Total Amount
            </div>
            <div
              data-test-id="total-amount"
              style={{
                fontSize: '36px',
                fontWeight: '700',
                marginBottom: '8px'
              }}
            >
              {formattedAmount}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Successfully processed
            </div>
          </div>

          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            <div
              style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}
            >
              Success Rate
            </div>
            <div
              data-test-id="success-rate"
              style={{
                fontSize: '36px',
                fontWeight: '700',
                marginBottom: '8px'
              }}
            >
              {stats.successRate}%
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Payment success ratio
            </div>
          </div>
        </div>

        {DEMO_MODE && (
          <div className="card mb-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div><strong>Payment volume</strong><p className="text-muted" style={{ fontSize: '13px', margin: '4px 0 0' }}>Sample transactions across your test environment</p></div>
              <div style={{ display: 'flex', gap: '6px' }}>{['24h', '7d', '30d'].map((item) => <button key={item} className={range === item ? 'btn-primary' : 'btn-secondary'} onClick={() => setRange(item)} style={{ padding: '7px 11px', fontSize: '12px' }}>{item}</button>)}</div>
            </div>
            <div aria-label={`Sample payment volume over ${range}`} style={{ display: 'flex', alignItems: 'end', gap: '8px', height: '112px', marginTop: '22px', borderBottom: '1px solid var(--border)', padding: '0 4px' }}>
              {VOLUME_BY_RANGE[range].map((value, index) => <div key={`${range}-${index}`} title={`${value} sample payments`} style={{ flex: 1, height: `${value}%`, minHeight: '8px', borderRadius: '4px 4px 0 0', background: index === VOLUME_BY_RANGE[range].length - 1 ? '#d99a42' : 'linear-gradient(180deg, #55b8aa, #0f766e)' }} />)}
            </div>
          </div>
        )}

        {DEMO_MODE && (
          <div className="card mt-4">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <span>Recent transactions</span>
              <button className="btn-secondary" onClick={() => navigate('/dashboard/transactions')} style={{ padding: '7px 12px', fontSize: '12px' }}>Open ledger</button>
            </div>
            <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Payment</th><th>Order</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead><tbody>{DEMO_PAYMENTS.map((payment) => <tr key={payment.id}><td style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{payment.id}</td><td style={{ fontFamily: 'monospace' }}>{payment.order_id}</td><td style={{ textTransform: 'uppercase' }}>{payment.method}</td><td style={{ fontWeight: 700 }}>₹{(payment.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td><span className={`badge badge-${payment.status === 'success' ? 'success' : payment.status === 'failed' ? 'error' : 'processing'}`}>{payment.status}</span></td></tr>)}</tbody></table></div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="card mt-4">
          <div className="card-header">⚡ Quick Actions</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              onClick={() => navigate('/dashboard/transactions')}
            >
              View Transactions
            </button>
            <button
              className="btn-secondary"
              onClick={handleTestCheckout}
            >
              Test Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

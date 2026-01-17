import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Dashboard</h1>
          <p className="text-muted">
            Welcome back! Here's your payment gateway overview.
          </p>
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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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

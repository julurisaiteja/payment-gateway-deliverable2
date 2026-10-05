import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const DEMO_MODE = typeof window !== 'undefined' && window.location.hostname.endsWith('.workers.dev');
const DEMO_PAYMENTS = [
  { id: 'pay_demo_2048', order_id: 'ord_8021', amount: 489900, method: 'upi', status: 'success', created_at: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 'pay_demo_2047', order_id: 'ord_8020', amount: 129900, method: 'card', status: 'success', created_at: new Date(Date.now() - 31 * 60000).toISOString() },
  { id: 'pay_demo_2046', order_id: 'ord_8019', amount: 74900, method: 'upi', status: 'processing', created_at: new Date(Date.now() - 52 * 60000).toISOString() },
  { id: 'pay_demo_2045', order_id: 'ord_8018', amount: 219900, method: 'card', status: 'failed', created_at: new Date(Date.now() - 94 * 60000).toISOString() },
  { id: 'pay_demo_2044', order_id: 'ord_8017', amount: 319900, method: 'card', status: 'success', created_at: new Date(Date.now() - 140 * 60000).toISOString() },
];

export default function Transactions() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (DEMO_MODE) {
      setPayments(DEMO_PAYMENTS);
      setLoading(false);
      return;
    }

    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) {
      navigate('/login');
      return;
    }

    async function fetchPayments() {
      try {
        const apiSecret = localStorage.getItem('apiSecret');
        const res = await axios.get('http://localhost:8000/api/v1/payments-list', {
          headers: {
            'X-Api-Key': apiKey,
            'X-Api-Secret': apiSecret
          }
        });
        setPayments(res.data.payments);
      } catch (error) {
        console.error('Failed to fetch payments:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, [navigate]);

  const filteredPayments = payments.filter((payment) => {
    const matchesStatus = filter === 'all' || payment.status === filter;
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;
    const matchesQuery = !query || `${payment.id} ${payment.order_id}`.toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesMethod && matchesQuery;
  });

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatAmount(amount) {
    return `₹${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }

  function exportCsv() {
    const rows = [
      ['Payment ID', 'Order ID', 'Amount INR', 'Method', 'Status', 'Created'],
      ...filteredPayments.map((payment) => [payment.id, payment.order_id, (payment.amount / 100).toFixed(2), payment.method, payment.status, payment.created_at]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'northstar-transactions.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function getStatusBadge(status) {
    const badges = {
      success: 'badge-success',
      failed: 'badge-error',
      processing: 'badge-processing'
    };
    return badges[status] || 'badge-warning';
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="text-muted">Loading transactions...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div>
      <Navbar />
      
      <div className="container">
        {DEMO_MODE && <div role="status" style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '8px', background: '#eaf4f1', color: '#0f766e', fontSize: '12px', fontWeight: 700 }}>Preview ledger · sample transactions only</div>}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Transactions</h1>
            <p className="text-muted">{filteredPayments.length} transaction{filteredPayments.length !== 1 ? 's' : ''} found</p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input aria-label="Search transactions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payment or order ID" style={{ width: '220px', padding: '8px 10px', fontSize: '13px' }} />
            <select aria-label="Filter payment method" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} style={{ width: '120px', padding: '8px 10px', fontSize: '13px' }}>
              <option value="all">All methods</option><option value="upi">UPI</option><option value="card">Card</option>
            </select>
            <button className="btn-secondary" onClick={exportCsv} style={{ fontSize: '13px', padding: '8px 12px' }}>Export CSV</button>
            <button 
              className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setFilter('all')}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              All
            </button>
            <button 
              className={filter === 'success' ? 'btn-success' : 'btn-secondary'}
              onClick={() => setFilter('success')}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              Success
            </button>
            <button 
              className={filter === 'failed' ? 'btn-error' : 'btn-secondary'}
              onClick={() => setFilter('failed')}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              Failed
            </button>
            <button className={filter === 'processing' ? 'btn-primary' : 'btn-secondary'} onClick={() => setFilter('processing')} style={{ fontSize: '13px', padding: '8px 16px' }}>Processing</button>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h3 style={{ marginBottom: '8px' }}>No transactions found</h3>
            <p className="text-muted">Transactions will appear here once you process payments.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table data-test-id="transactions-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Order ID</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} data-test-id="transaction-row" data-payment-id={p.id}>
                    <td>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '13px',
                        color: 'var(--primary)'
                      }} data-test-id="payment-id">
                        {p.id}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '13px' 
                      }} data-test-id="order-id">
                        {p.order_id}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '600' }} data-test-id="amount">
                        {formatAmount(p.amount)}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        background: 'var(--bg-light)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        textTransform: 'uppercase'
                      }} data-test-id="method">
                        {p.method === 'upi' ? '📱' : '💳'} {p.method}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(p.status)}`} data-test-id="status">
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <span className="text-muted" style={{ fontSize: '13px' }} data-test-id="created-at">
                        {formatDate(p.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// src/pages/Checkout.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const DEMO_MODE = typeof window !== 'undefined' && (
  window.location.hostname.endsWith('.workers.dev') ||
  window.location.hostname.endsWith('.pages.dev')
);

export default function Checkout() {
  const [order, setOrder] = useState(DEMO_MODE ? { amount: 489900 } : null);
  const [method, setMethod] = useState(null);
  const [vpa, setVpa] = useState('');
  const [card, setCard] = useState({
    number: '',
    expiry: '',
    cvv: '',
    holder: '',
  });
  const [processing, setProcessing] = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [status, setStatus] = useState(null); // null | 'pending' | 'success' | 'failed'
  const [errorMessage, setErrorMessage] = useState('');
  const [embedded, setEmbedded] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id') || (DEMO_MODE ? 'DEMO-1048' : null);
  const embeddedParam = params.get('embedded');
  const isEmbedded = embeddedParam === 'true';

  useEffect(() => {
    setEmbedded(isEmbedded);
  }, [isEmbedded]);

  useEffect(() => {
    if (DEMO_MODE) return;
    async function fetchOrder() {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/v1/orders/${orderId}/public`
        );
        setOrder(res.data);
      } catch (error) {
        console.error('Failed to fetch order:', error);
      }
    }
    if (orderId) fetchOrder();
  }, [orderId]);

  function completeDemoPayment() {
    window.setTimeout(() => {
      const id = `demo-pay-${Date.now()}`;
      setPaymentId(id);
      setStatus('success');
      setProcessing(false);
      if (embedded) {
        window.parent.postMessage({ type: 'payment_success', data: { paymentId: id, status: 'success', demo: true } }, '*');
      }
    }, 650);
  }

  async function pollFinalStatus(id) {
    try {
      let finalStatus = 'pending';
      let attempts = 0;

      while (attempts < 5 && finalStatus === 'pending') {
        await new Promise((r) => setTimeout(r, 1000)); // 1s
        attempts += 1;

        const resp = await axios.get(
          `http://localhost:8000/api/v1/payments/${id}`,
          {
            headers: {
              'X-Api-Key': 'key_test_abc123',
              'X-Api-Secret': 'secret_test_xyz789',
            },
          }
        );

        finalStatus = resp.data.status;
        setStatus(finalStatus); // 'pending' | 'success' | 'failed'
        setPaymentId(resp.data.id);
      }

      if (embedded) {
        if (finalStatus === 'success') {
          window.parent.postMessage(
            { type: 'payment_success', data: { paymentId: id, status: finalStatus } },
            '*'
          );
        } else if (finalStatus === 'failed') {
          window.parent.postMessage(
            { type: 'payment_failed', data: { paymentId: id, status: finalStatus } },
            '*'
          );
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }

  async function submitUPI(e) {
    e.preventDefault();
    setProcessing(true);
    setStatus(null);
    setErrorMessage('');
    if (DEMO_MODE) {
      completeDemoPayment();
      return;
    }

    try {
      const res = await axios.post(
        'http://localhost:8000/api/v1/payments/public',
        { order_id: orderId, method: 'upi', vpa },
        {
          headers: {
            'X-Public-Key': 'key_test_abc123',
          },
        }
      );

      setPaymentId(res.data.id);
      setStatus('pending');
      await pollFinalStatus(res.data.id);
    } catch (err) {
      const msg =
        err.response?.data?.error?.description ||
        'Payment could not be processed';
      setErrorMessage(msg);
      setStatus('failed');

      if (embedded) {
        window.parent.postMessage(
          { type: 'payment_failed', data: { message: msg } },
          '*'
        );
      }
    } finally {
      setProcessing(false);
    }
  }

  async function submitCard(e) {
    e.preventDefault();
    setProcessing(true);
    setStatus(null);
    setErrorMessage('');
    if (DEMO_MODE) {
      completeDemoPayment();
      return;
    }

    try {
      const [month, year] = card.expiry.split('/');
      const res = await axios.post(
        'http://localhost:8000/api/v1/payments/public',
        {
          order_id: orderId,
          method: 'card',
          card: {
            number: card.number,
            expiry_month: month.trim(),
            expiry_year: year.trim(),
            cvv: card.cvv,
            holder_name: card.holder,
          },
        },
        {
          headers: {
            'X-Public-Key': 'key_test_abc123',
          },
        }
      );

      setPaymentId(res.data.id);
      setStatus('pending');
      await pollFinalStatus(res.data.id);
    } catch (err) {
      const msg =
        err.response?.data?.error?.description ||
        'Payment could not be processed';
      setErrorMessage(msg);
      setStatus('failed');

      if (embedded) {
        window.parent.postMessage(
          { type: 'payment_failed', data: { message: msg } },
          '*'
        );
      }
    } finally {
      setProcessing(false);
    }
  }

  function retry() {
    setStatus(null);
    setPaymentId(null);
    setErrorMessage('');
    setMethod(null);
    setVpa('');
    setCard({ number: '', expiry: '', cvv: '', holder: '' });
  }

  const displayAmount = order ? `₹${(order.amount / 100).toFixed(2)}` : '';

  const getMethodButtonStyle = (isSelected) => ({
    background: isSelected
      ? 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)'
      : 'white',
    color: isSelected ? 'white' : '#172b2a',
    border: `2px solid ${isSelected ? '#0f766e' : '#dbe6e3'}`,
    padding: '20px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    fontWeight: '600',
    boxShadow: isSelected
      ? '0 4px 12px rgba(15, 118, 110, 0.3)'
      : '0 2px 4px rgba(0,0,0,0.08)',
    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
  });

  const payButtonStyle = {
    background: 'linear-gradient(135deg, #0cce6b 0%, #00a854 100%)',
    color: 'white',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '700',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 4px 12px rgba(12, 206, 107, 0.3)',
    transition: 'all 0.2s ease',
  };

  const retryButtonStyle = {
    background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
    color: 'white',
    padding: '14px 32px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(15, 118, 110, 0.3)',
    transition: 'all 0.2s ease',
  };

  return (
    <div
      data-test-id="checkout-container"
      style={{
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
          color: 'white',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>💳</div>
        <h2 style={{ fontSize: '26px', marginBottom: '8px', fontWeight: '700' }}>
          Secure Checkout
        </h2>
        <p style={{ opacity: 0.95, fontSize: '14px' }}>
          {DEMO_MODE ? 'Demo transaction · no charge will be made' : 'Complete your payment securely'}
        </p>
      </div>

      <div style={{ padding: '28px' }}>
        {DEMO_MODE && <div role="status" style={{ marginBottom: '18px', padding: '10px 12px', borderRadius: '8px', background: '#e6f4f0', color: '#12645d', fontSize: '12px', fontWeight: '700' }}>SAMPLE ORDER · Simulated payment only. No card or UPI details are sent.</div>}
        <div
          data-test-id="order-summary"
          style={{
            padding: '20px',
            background: '#f4f8f7',
            borderRadius: '12px',
            marginBottom: '28px',
            border: '1px solid #dbe6e3',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                color: '#617573',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Order ID:
            </span>
            <span
              data-test-id="order-id"
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                fontWeight: '700',
                color: '#172b2a',
              }}
            >
              {orderId}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '12px',
              borderTop: '1px solid #dbe6e3',
            }}
          >
            <span
              style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#172b2a',
              }}
            >
              Amount to Pay
            </span>
            <span
              data-test-id="order-amount"
              style={{
                fontSize: '28px',
                fontWeight: '800',
                color: '#0f766e',
              }}
            >
              {displayAmount}
            </span>
          </div>
        </div>

        {/* forms visible unless success/failed */}
        {status !== 'success' && status !== 'failed' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '15px',
                  fontWeight: '700',
                  marginBottom: '16px',
                  color: '#172b2a',
                }}
              >
                Select Payment Method
              </label>
              <div
                data-test-id="payment-methods"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}
              >
                <button
                  data-test-id="method-upi"
                  data-method="upi"
                  type="button"
                  onClick={() => setMethod('upi')}
                  style={getMethodButtonStyle(method === 'upi')}
                >
                  <div style={{ fontSize: '36px' }}>📱</div>
                  <div style={{ fontSize: '15px', fontWeight: '700' }}>UPI</div>
                </button>
                <button
                  data-test-id="method-card"
                  data-method="card"
                  type="button"
                  onClick={() => setMethod('card')}
                  style={getMethodButtonStyle(method === 'card')}
                >
                  <div style={{ fontSize: '36px' }}>💳</div>
                  <div style={{ fontSize: '15px', fontWeight: '700' }}>Card</div>
                </button>
              </div>
            </div>

            <form
              data-test-id="upi-form"
              onSubmit={submitUPI}
              style={{ display: method === 'upi' ? 'block' : 'none' }}
            >
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '700',
                    marginBottom: '10px',
                    color: '#172b2a',
                  }}
                >
                  UPI ID / VPA
                </label>
                <input
                  data-test-id="vpa-input"
                  placeholder="username@paytm"
                  type="text"
                  value={vpa}
                  onChange={(e) => setVpa(e.target.value)}
                  required
                  style={{
                    padding: '14px 16px',
                    fontSize: '15px',
                    borderRadius: '8px',
                    border: '2px solid #dbe6e3',
                  }}
                />
                <p
                  style={{
                    fontSize: '13px',
                    color: '#617573',
                    marginTop: '8px',
                  }}
                >
                  Enter your UPI ID (e.g., yourname@paytm)
                </p>
              </div>
              <button
                data-test-id="pay-button"
                type="submit"
                disabled={processing}
                style={payButtonStyle}
              >
                {processing ? '⏳ Processing...' : `💰 Pay ${displayAmount}`}
              </button>
            </form>

            <form
              data-test-id="card-form"
              onSubmit={submitCard}
              style={{ display: method === 'card' ? 'block' : 'none' }}
            >
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '700',
                    marginBottom: '10px',
                    color: '#172b2a',
                  }}
                >
                  Card Number
                </label>
                <input
                  data-test-id="card-number-input"
                  placeholder="1234 5678 9012 3456"
                  type="text"
                  value={card.number}
                  onChange={(e) =>
                    setCard({ ...card, number: e.target.value })
                  }
                  required
                  style={{
                    padding: '14px 16px',
                    fontSize: '15px',
                    borderRadius: '8px',
                    border: '2px solid #dbe6e3',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '700',
                      marginBottom: '10px',
                      color: '#172b2a',
                    }}
                  >
                    Expiry (MM/YY)
                  </label>
                  <input
                    data-test-id="expiry-input"
                    placeholder="12/26"
                    type="text"
                    value={card.expiry}
                    onChange={(e) =>
                      setCard({ ...card, expiry: e.target.value })
                    }
                    required
                    style={{
                      padding: '14px 16px',
                      fontSize: '15px',
                      borderRadius: '8px',
                      border: '2px solid #dbe6e3',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '700',
                      marginBottom: '10px',
                      color: '#172b2a',
                    }}
                  >
                    CVV
                  </label>
                  <input
                    data-test-id="cvv-input"
                    placeholder="123"
                    type="text"
                    maxLength="4"
                    value={card.cvv}
                    onChange={(e) =>
                      setCard({ ...card, cvv: e.target.value })
                    }
                    required
                    style={{
                      padding: '14px 16px',
                      fontSize: '15px',
                      borderRadius: '8px',
                      border: '2px solid #dbe6e3',
                    }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '700',
                    marginBottom: '10px',
                    color: '#172b2a',
                  }}
                >
                  Cardholder Name
                </label>
                <input
                  data-test-id="cardholder-name-input"
                  placeholder="John Doe"
                  type="text"
                  value={card.holder}
                  onChange={(e) =>
                    setCard({ ...card, holder: e.target.value })
                  }
                  required
                  style={{
                    padding: '14px 16px',
                    fontSize: '15px',
                    borderRadius: '8px',
                    border: '2px solid #dbe6e3',
                  }}
                />
              </div>
              <button
                data-test-id="pay-button"
                type="submit"
                disabled={processing}
                style={payButtonStyle}
              >
                {processing ? '⏳ Processing...' : `💰 Pay ${displayAmount}`}
              </button>
            </form>
          </>
        )}

        {/* processing state based on status */}
        <div
          data-test-id="processing-state"
          style={{
            display: status === 'pending' ? 'flex' : 'none',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 20px',
            textAlign: 'center',
          }}
        >
          <div className="spinner" style={{ marginBottom: '20px' }} />
          <span
            data-test-id="processing-message"
            style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#172b2a',
            }}
          >
            Processing payment...
          </span>
          <p
            style={{
              color: '#617573',
              fontSize: '14px',
              marginTop: '12px',
            }}
          >
            Please wait while we process your transaction
          </p>
        </div>

        {/* success */}
        <div
          data-test-id="success-state"
          style={{
            display: status === 'success' ? 'block' : 'none',
            textAlign: 'center',
            padding: '32px 20px',
          }}
        >
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>✅</div>
          <h2
            style={{
              fontSize: '26px',
              marginBottom: '16px',
              color: '#0cce6b',
              fontWeight: '700',
            }}
          >
              {DEMO_MODE ? 'Demo Payment Complete' : 'Payment Successful!'}
          </h2>
          <div
            style={{
              padding: '16px',
              background: '#f4f8f7',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid #dbe6e3',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: '#617573',
                marginBottom: '6px',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Payment ID
            </div>
            <div
              data-test-id="payment-id"
              style={{
                fontFamily: 'monospace',
                fontSize: '15px',
                fontWeight: '700',
                color: '#172b2a',
              }}
            >
              {paymentId}
            </div>
          </div>
          <span
            data-test-id="success-message"
            style={{ color: '#617573', fontSize: '15px' }}
          >
            {DEMO_MODE ? 'Simulation complete. No funds were moved.' : 'Your payment has been processed successfully'}
          </span>
        </div>

        {/* error */}
        <div
          data-test-id="error-state"
          style={{
            display: status === 'failed' ? 'block' : 'none',
            textAlign: 'center',
            padding: '32px 20px',
          }}
        >
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>❌</div>
          <h2
            style={{
              fontSize: '26px',
              marginBottom: '16px',
              color: '#ff4d4f',
              fontWeight: '700',
            }}
          >
            Payment Failed
          </h2>
          <div
            style={{
              padding: '16px',
              background: 'rgba(255, 77, 79, 0.1)',
              border: '2px solid #ff4d4f',
              borderRadius: '12px',
              marginBottom: '24px',
            }}
          >
            <span
              data-test-id="error-message"
              style={{
                color: '#ff4d4f',
                fontSize: '15px',
                fontWeight: '600',
              }}
            >
              {errorMessage || 'Payment could not be processed'}
            </span>
          </div>
          <button
            data-test-id="retry-button"
            onClick={retry}
            style={retryButtonStyle}
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

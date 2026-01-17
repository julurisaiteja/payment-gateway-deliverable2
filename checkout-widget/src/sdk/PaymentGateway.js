import './styles.css';

class PaymentGateway {
  constructor(options) {
    if (!options || typeof options !== 'object') {
      throw new Error('PaymentGateway options are required');
    }

    const { key, orderId, onSuccess, onFailure, onClose } = options;

    if (!key) {
      throw new Error('PaymentGateway: key is required');
    }
    if (!orderId) {
      throw new Error('PaymentGateway: orderId is required');
    }

    this.key = key;
    this.orderId = orderId;
    this.onSuccess = typeof onSuccess === 'function' ? onSuccess : () => {};
    this.onFailure = typeof onFailure === 'function' ? onFailure : () => {};
    this.onClose = typeof onClose === 'function' ? onClose : () => {};

    this.modalEl = null;
    this.iframeEl = null;
    this._messageHandler = this._handleMessage.bind(this);
  }

  open() {
    if (this.modalEl) return;

    const modal = document.createElement('div');
    modal.id = 'payment-gateway-modal';
    modal.setAttribute('data-test-id', 'payment-modal');

    modal.innerHTML = `
      <div id="payment-gateway-modal" data-test-id="payment-modal">
  <div class="modal-overlay">
    <div class="modal-content">
      <iframe
        data-test-id="payment-iframe"
        src="http://localhost:3001/checkout?order_id=xxx&embedded=true"
      ></iframe>
      <button
        data-test-id="close-modal-button"
        class="close-button"
      >
        ×
      </button>
    </div>
  </div>
</div>

    `;

    document.body.appendChild(modal);

    this.modalEl = modal;
    this.iframeEl = modal.querySelector('iframe[data-test-id="payment-iframe"]');
    const closeBtn = modal.querySelector('[data-test-id="close-modal-button"]');

    closeBtn.addEventListener('click', () => {
      this.close();
      this.onClose();
    });

    window.addEventListener('message', this._messageHandler);
  }

  _handleMessage(event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'payment_success') {
      this.onSuccess(data.data);
      this.close();
    } else if (data.type === 'payment_failed') {
      this.onFailure(data.data);
    } else if (data.type === 'close_modal') {
      this.close();
      this.onClose();
    }
  }

  close() {
    window.removeEventListener('message', this._messageHandler);
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
    }
    this.modalEl = null;
    this.iframeEl = null;
  }
}

// expose globally
window.PaymentGateway = PaymentGateway;

// default export for UMD
export default PaymentGateway;

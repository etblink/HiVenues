'use strict';

(function initializePayTab(global) {
  const OBSERVATION_ATTEMPTS = 3;
  const OBSERVATION_DELAY_MS = 1500;
  const ACTIVE_RECEIPT_STATES = new Set([
    'Validated',
    'AwaitingSignature',
    'BroadcastAccepted',
    'ConfirmationTimeout',
  ]);
  const QR_DECODE_MISS_NAMES = new Set([
    'NotFoundException',
    'ChecksumException',
    'FormatException',
  ]);

  function setStatus(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('text-red-300', isError);
    element.classList.toggle('text-gray-300', !isError);
  }

  function isExpectedQrDecodeMiss(error) {
    const kind = typeof error?.getKind === 'function' ? error.getKind() : null;
    return QR_DECODE_MISS_NAMES.has(kind) || QR_DECODE_MISS_NAMES.has(error?.name);
  }

  function createInvertedCanvas(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new TypeError('The QR snapshot canvas is unavailable.');
    }
    const width = Number(canvas.width);
    const height = Number(canvas.height);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new TypeError('The QR snapshot canvas dimensions are invalid.');
    }
    const sourceContext = canvas.getContext('2d', { willReadFrequently: true });
    if (!sourceContext) throw new Error('The QR snapshot canvas could not be read.');
    const imageData = sourceContext.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      pixels[offset] = 255 - pixels[offset];
      pixels[offset + 1] = 255 - pixels[offset + 1];
      pixels[offset + 2] = 255 - pixels[offset + 2];
    }

    const documentRef = canvas.ownerDocument || global.document;
    if (!documentRef?.createElement) throw new Error('The QR snapshot canvas cannot be created.');
    const inverted = documentRef.createElement('canvas');
    inverted.width = width;
    inverted.height = height;
    const invertedContext = inverted.getContext('2d');
    if (!invertedContext) throw new Error('The inverted QR snapshot canvas could not be created.');
    invertedContext.putImageData(imageData, 0, 0);
    return inverted;
  }

  function loadQrImportImage(imageUrl) {
    const documentRef = global.document;
    if (!documentRef?.createElement) {
      return Promise.reject(new Error('The selected QR image cannot be loaded locally.'));
    }

    return new Promise((resolve, reject) => {
      const image = documentRef.createElement('img');
      let settled = false;

      const cleanup = () => {
        image.removeEventListener?.('load', loaded);
        image.removeEventListener?.('error', failed);
      };
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback(value);
      };
      const loaded = () => {
        const width = Number(image.naturalWidth);
        const height = Number(image.naturalHeight);
        if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
          finish(reject, new Error('The selected QR image dimensions are invalid.'));
          return;
        }
        finish(resolve, image);
      };
      const failed = () => finish(reject, new Error('The selected QR image could not be loaded locally.'));

      image.addEventListener('load', loaded, { once: true });
      image.addEventListener('error', failed, { once: true });
      try {
        image.src = imageUrl;
      } catch (error) {
        finish(reject, error);
      }
    });
  }

  async function createHalfScaleQrImportCanvas(imageUrl) {
    const image = await loadQrImportImage(imageUrl);
    const documentRef = image.ownerDocument || global.document;
    if (!documentRef?.createElement) throw new Error('The QR import canvas cannot be created.');

    const width = Math.max(1, Math.round(Number(image.naturalWidth) * 0.5));
    const height = Math.max(1, Math.round(Number(image.naturalHeight) * 0.5));
    const canvas = documentRef.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('The QR import canvas could not be created.');
    context.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in context) context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);
    return canvas;
  }

  function createPolarityTolerantQrReader() {
    const BaseReader = global.ZXingBrowser?.BrowserQRCodeReader;
    if (typeof BaseReader !== 'function') {
      throw new Error('The local QR reader is unavailable. Paste the invoice URI instead.');
    }
    return new (class PolarityTolerantQRCodeReader extends BaseReader {
      async decodeFromImageUrl(imageUrl) {
        try {
          return await super.decodeFromImageUrl(imageUrl);
        } catch (error) {
          if (!isExpectedQrDecodeMiss(error)) throw error;
          return this.decodeFromCanvas(await createHalfScaleQrImportCanvas(imageUrl));
        }
      }

      decodeFromCanvas(canvas) {
        try {
          return super.decodeFromCanvas(canvas);
        } catch (error) {
          if (!isExpectedQrDecodeMiss(error)) throw error;
          return super.decodeFromCanvas(createInvertedCanvas(canvas));
        }
      }
    })();
  }

  class PayTabController {
    constructor({
      documentRef = global.document,
      fetchImpl = global.fetch?.bind(global),
      keychainFactory = () => new global.HiveBarKeychain.KeychainAdapter(),
      qrReaderFactory = () => createPolarityTolerantQrReader(),
      review,
      waitImpl = (milliseconds) => new Promise((resolve) => global.setTimeout(resolve, milliseconds)),
    } = {}) {
      this.document = documentRef;
      this.fetch = fetchImpl;
      this.keychainFactory = keychainFactory;
      this.qrReaderFactory = qrReaderFactory;
      this.review = review || ((receipt) => this.reviewDialog(receipt));
      this.wait = waitImpl;
      this.root = this.document?.querySelector('[data-pay-tab]') || null;
      this.current = null;
      this.cameraControls = null;
    }

    async request(url, { method = 'GET', csrfToken, body } = {}) {
      const headers = { accept: 'application/json' };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;
      if (body !== undefined) headers['content-type'] = 'application/json';
      const response = await this.fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(payload?.error?.message || 'The payment request could not be completed.');
        error.code = payload?.error?.code || 'PAYMENT_REQUEST_FAILED';
        throw error;
      }
      return payload;
    }

    bind() {
      if (!this.root) return;
      this.root.querySelector('[data-pay-form]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        this.run(event.currentTarget);
      });
      this.root.querySelector('[data-pay-camera-start]')?.addEventListener('click', () => this.startCamera());
      this.root.querySelector('[data-pay-camera-stop]')?.addEventListener('click', () => this.stopCamera());
      this.root.querySelector('[data-pay-image]')?.addEventListener('change', (event) => {
        this.importImage(event.currentTarget.files?.[0]);
      });
      this.root.querySelector('[data-pay-recheck]')?.addEventListener('click', () => this.recheck());
      this.loadRecent();
    }

    async loadRecent() {
      try {
        const receipt = await this.request('/api/payments/recent');
        if (receipt) {
          this.current = receipt;
          this.render(receipt);
        }
      } catch {
        // Receipt recovery is best effort; the page communicates the active availability boundary.
      }
    }

    async run(form) {
      const button = form.querySelector('button[type="submit"]');
      const status = this.root.querySelector('[data-pay-status]');
      let session;
      let receipt;
      let keychainAttempted = false;
      let broadcastAccepted = false;
      if (button) button.disabled = true;
      this.stopCamera();
      try {
        session = await this.request('/auth/session');
        if (!session?.authenticated) throw new Error('Sign in with Hive Keychain before paying a tab.');
        const uri = String(new FormData(form).get('uri') || '').trim();
        setStatus(status, 'Validating the invoice against the verified 4th Street Bar payment policy.');
        receipt = await this.request('/api/payments/preflight', {
          method: 'POST',
          csrfToken: session.csrfToken,
          body: { uri },
        });
        this.current = receipt;
        this.render(receipt);
        this.lockInvoice(true);

        if (!(await this.review(receipt))) {
          receipt = await this.cancel(receipt.id, session.csrfToken);
          this.current = receipt;
          this.render(receipt);
          this.lockInvoice(false);
          setStatus(status, 'Cancelled before Keychain. Nothing was broadcast.');
          return;
        }

        receipt = await this.request(`/api/payments/${receipt.id}/awaiting-signature`, {
          method: 'POST',
          csrfToken: session.csrfToken,
        });
        this.current = receipt;
        this.render(receipt);
        setStatus(status, `Confirm the exact Active transfer in Hive Keychain for @${receipt.account}.`);
        keychainAttempted = true;
        const result = await this.keychainFactory().broadcast({
          account: receipt.account,
          operations: receipt.operations,
          authority: 'Active',
        });
        broadcastAccepted = Boolean(result?.accepted);
        receipt = await this.request(`/api/payments/${receipt.id}/accepted`, {
          method: 'POST',
          csrfToken: session.csrfToken,
          body: { transactionId: result?.transactionId || null },
        });
        this.current = receipt;
        this.render(receipt);
        setStatus(status, receipt.message);

        for (let attempt = 0; attempt < OBSERVATION_ATTEMPTS; attempt += 1) {
          if (attempt > 0) await this.wait(OBSERVATION_DELAY_MS);
          receipt = await this.observe(receipt.id, session.csrfToken);
          this.current = receipt;
          this.render(receipt);
          setStatus(status, receipt.message);
          if (receipt.state === 'ChainConfirmed' || receipt.state === 'ConfirmationTimeout') return;
        }
        setStatus(status, 'Confirmation remains pending. Recheck Hive before considering any new payment.');
      } catch (error) {
        const explicitCancellation = error?.code === 'KEYCHAIN_CANCELLED';
        if (receipt && session?.csrfToken && (!keychainAttempted || explicitCancellation)) {
          try {
            const cancelled = await this.cancel(receipt.id, session.csrfToken);
            this.current = cancelled;
            this.render(cancelled);
            this.lockInvoice(false);
          } catch {
            // Preserve the original failure; the durable receipt remains authoritative.
          }
        } else if (
          receipt &&
          session?.csrfToken &&
          keychainAttempted &&
          !broadcastAccepted &&
          receipt.state === 'AwaitingSignature'
        ) {
          try {
            // The Keychain outcome is uncertain. Record ambiguity without retransmitting anything.
            receipt = await this.request(`/api/payments/${receipt.id}/accepted`, {
              method: 'POST',
              csrfToken: session.csrfToken,
              body: { transactionId: null },
            });
            broadcastAccepted = true;
            this.current = receipt;
            this.render(receipt);
          } catch {
            // Never retry Keychain. A later same-account receipt recovery/manual reconciliation owns this state.
          }
        }
        const uncertain = keychainAttempted && !explicitCancellation;
        const prefix = uncertain
          ? 'The Keychain outcome may be ambiguous. Do not pay again or retry automatically. '
          : '';
        setStatus(status, `${prefix}${error.message || 'The payment failed.'}`, true);
      } finally {
        if (button) button.disabled = false;
      }
    }

    cancel(id, csrfToken) {
      return this.request(`/api/payments/${id}/cancel`, { method: 'POST', csrfToken });
    }

    observe(id, csrfToken) {
      return this.request(`/api/payments/${id}/observe`, { method: 'POST', csrfToken });
    }

    async recheck() {
      const button = this.root.querySelector('[data-pay-recheck]');
      const status = this.root.querySelector('[data-pay-status]');
      if (!this.current || !['BroadcastAccepted', 'ConfirmationTimeout'].includes(this.current.state)) return;
      button.disabled = true;
      try {
        const session = await this.request('/auth/session');
        if (!session?.authenticated) throw new Error('The verified session has ended. Sign in again.');
        const receipt = await this.observe(this.current.id, session.csrfToken);
        this.current = receipt;
        this.render(receipt);
        setStatus(status, receipt.message);
      } catch (error) {
        setStatus(status, `${error.message || 'The chain recheck failed.'} Do not pay again.`, true);
      } finally {
        button.disabled = false;
      }
    }

    render(receipt) {
      const container = this.root.querySelector('[data-pay-receipt]');
      if (!container || !receipt) return;
      container.hidden = false;
      const states = {
        Validated: 'Validated — not sent',
        AwaitingSignature: 'Awaiting Keychain — not sent',
        BroadcastAccepted: 'Broadcast accepted — confirmation pending',
        ConfirmationTimeout: 'Confirmation timed out — still pending',
        ChainConfirmed: 'Paid — confirmed on Hive',
        Cancelled: 'Cancelled — nothing was broadcast',
      };
      container.querySelector('[data-pay-receipt-state]').textContent = states[receipt.state] || receipt.state;
      container.querySelector('[data-pay-receipt-account]').textContent = `@${receipt.account}`;
      container.querySelector('[data-pay-receipt-merchant]').textContent = `@${receipt.merchant}`;
      container.querySelector('[data-pay-receipt-amount]').textContent = receipt.amount;
      container.querySelector('[data-pay-receipt-block]').textContent = receipt.blockNumber || 'Pending';
      container.querySelector('[data-pay-receipt-transaction]').textContent = receipt.transactionId || 'Pending';
      container.querySelector('[data-pay-receipt-fingerprint]').textContent = receipt.fingerprint;
      container.querySelector('[data-pay-receipt-message]').textContent = receipt.message || receipt.diagnostic || '';
      const recheck = container.querySelector('[data-pay-recheck]');
      if (recheck) recheck.hidden = !['BroadcastAccepted', 'ConfirmationTimeout'].includes(receipt.state);
      const handoff = container.querySelector('[data-distriator-handoff]') || container.querySelector('[data-pay-rebate]');
      if (handoff) {
        const available = receipt.distriatorHandoff?.available ?? receipt.rebate?.available;
        handoff.hidden = !(receipt.state === 'ChainConfirmed' && available);
      }
      this.lockInvoice(ACTIVE_RECEIPT_STATES.has(receipt.state));
    }

    lockInvoice(locked) {
      const input = this.root?.querySelector('[data-pay-uri]');
      if (input) input.readOnly = Boolean(locked);
    }

    reviewDialog(receipt) {
      const dialog = this.document.querySelector('[data-social-confirm]');
      if (!dialog || typeof dialog.showModal !== 'function') {
        return Promise.resolve(
          global.confirm(
            `Confirm exact payment as @${receipt.account} with Active authority?\n\nFingerprint: ${receipt.fingerprint}\n\n${JSON.stringify(receipt.operations, null, 2)}`,
          ),
        );
      }
      dialog.querySelector('[data-social-summary]').textContent = Object.entries(receipt.summary)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      dialog.querySelector('[data-social-operations]').textContent = JSON.stringify(receipt.operations, null, 2);
      dialog.querySelector('[data-social-account]').textContent = `@${receipt.account}`;
      dialog.querySelector('[data-social-authority]').textContent = 'Active';
      dialog.querySelector('[data-social-fingerprint]').textContent = receipt.fingerprint;
      dialog.showModal();
      return new Promise((resolve) => {
        const confirmButton = dialog.querySelector('[data-social-confirm-button]');
        const cancelButton = dialog.querySelector('[data-social-cancel-button]');
        const finish = (value) => {
          confirmButton.removeEventListener('click', confirm);
          cancelButton.removeEventListener('click', cancel);
          dialog.removeEventListener('cancel', escape);
          dialog.close();
          resolve(value);
        };
        const confirm = () => finish(true);
        const cancel = () => finish(false);
        const escape = (event) => { event.preventDefault(); finish(false); };
        confirmButton.addEventListener('click', confirm);
        cancelButton.addEventListener('click', cancel);
        dialog.addEventListener('cancel', escape);
      });
    }

    setInvoice(value, message) {
      const input = this.root.querySelector('[data-pay-uri]');
      if (input?.readOnly) {
        setStatus(this.root.querySelector('[data-pay-status]'), 'This validated invoice is immutable. Cancel or finish it before scanning another.', true);
        return;
      }
      input.value = String(value || '').trim();
      setStatus(this.root.querySelector('[data-pay-status]'), message);
    }

    async startCamera() {
      const status = this.root.querySelector('[data-pay-status]');
      const video = this.root.querySelector('[data-pay-video]');
      try {
        if (!global.ZXingBrowser) throw new Error('The local QR reader is unavailable. Paste the invoice URI instead.');
        this.stopCamera();
        video.classList.remove('hidden');
        this.root.querySelector('[data-pay-camera-start]').hidden = true;
        this.root.querySelector('[data-pay-camera-stop]').hidden = false;
        setStatus(status, 'Camera active. Hold the current payment QR code inside the frame.');
        const reader = this.qrReaderFactory();
        this.cameraControls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          video,
          (result, error, controls) => {
            if (result) {
              controls.stop();
              this.cameraControls = null;
              video.classList.add('hidden');
              this.root.querySelector('[data-pay-camera-start]').hidden = false;
              this.root.querySelector('[data-pay-camera-stop]').hidden = true;
              this.setInvoice(result.getText(), 'QR decoded locally. Review the URI, then validate it.');
            } else if (error && !isExpectedQrDecodeMiss(error)) {
              setStatus(status, 'The camera could not decode that image yet. Paste or import the invoice if needed.', true);
            }
          },
        );
      } catch (error) {
        this.stopCamera();
        setStatus(status, error.message || 'Camera access failed. Paste or import the invoice URI instead.', true);
      }
    }

    stopCamera() {
      this.cameraControls?.stop?.();
      this.cameraControls = null;
      const video = this.root?.querySelector('[data-pay-video]');
      if (video) video.classList.add('hidden');
      const start = this.root?.querySelector('[data-pay-camera-start]');
      const stop = this.root?.querySelector('[data-pay-camera-stop]');
      if (start) start.hidden = false;
      if (stop) stop.hidden = true;
    }

    async importImage(file) {
      const status = this.root.querySelector('[data-pay-status]');
      if (!file) return;
      if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
        setStatus(status, 'Choose a supported QR image no larger than 8 MB.', true);
        return;
      }
      const objectUrl = global.URL.createObjectURL(file);
      try {
        const result = await this.qrReaderFactory().decodeFromImageUrl(objectUrl);
        this.setInvoice(result.getText(), 'QR image decoded locally. Review the URI, then validate it.');
      } catch (error) {
        const message = isExpectedQrDecodeMiss(error)
          ? "This browser couldn't read the payment QR. Try another image or paste the Hive payment request."
          : error?.message || 'The local QR reader failed. Paste the Hive payment request instead.';
        setStatus(status, message, true);
      } finally {
        global.URL.revokeObjectURL(objectUrl);
      }
    }
  }

  global.HiveBarPay = Object.freeze({
    PayTabController,
    createPolarityTolerantQrReader,
    isExpectedQrDecodeMiss,
  });
  const controller = new PayTabController();
  controller.bind();
})(window);

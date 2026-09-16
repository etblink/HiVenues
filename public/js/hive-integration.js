'use strict';

(function attachHiveIntegration(global) {
  function humanError(error) {
    if (error?.code === 'KEYCHAIN_CANCELLED') return 'Keychain was cancelled. Nothing was broadcast.';
    if (error?.code === 'KEYCHAIN_UNAVAILABLE') return 'Hive Keychain is not available in this browser.';
    if (error?.code === 'KEYCHAIN_LOCKED') return 'Unlock Hive Keychain and try again.';
    if (error?.code === 'KEYCHAIN_TIMEOUT') return 'Keychain did not respond in time. Nothing was retried automatically.';
    return error?.message || 'Hive integration could not complete this step.';
  }

  class HiveIntegrationController {
    constructor(root, {
      fetchImpl = global.fetch ? global.fetch.bind(global) : null,
      keychainFactory = () => new global.HiveBarKeychain.KeychainAdapter(),
      wait = (ms) => new Promise((resolve) => global.setTimeout(resolve, ms)),
      reload = () => global.location.reload(),
    } = {}) {
      if (!root) throw new TypeError('Hive integration root is required');
      if (typeof fetchImpl !== 'function') throw new TypeError('Hive integration requires fetch');
      this.root = root;
      this.base = String(root.dataset.hiveBase || '').replace(/\/$/, '');
      if (!this.base) throw new TypeError('Hive integration base URL is required');
      this.fetch = fetchImpl;
      this.keychainFactory = keychainFactory;
      this.wait = wait;
      this.reload = reload;
      this.preflight = null;
      this.broadcasting = false;
    }

    status(text, tone = '') {
      const node = this.root.querySelector('[data-hive-status]');
      if (!node) return;
      node.textContent = text;
      node.dataset.tone = tone;
    }

    async request(path, options = {}) {
      const response = await this.fetch(`${this.base}${path}`, {
        credentials: 'same-origin',
        headers: { accept: 'application/json', 'content-type': 'application/json', ...(options.headers || {}) },
        ...options,
      });
      if (response.status === 204) return null;
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload?.error?.message || 'Hive integration request failed.');
        error.code = payload?.error?.code || 'HIVE_REQUEST_FAILED';
        throw error;
      }
      return payload;
    }

    install() {
      const connect = this.root.querySelector('[data-hive-connect-form]');
      const disconnect = this.root.querySelector('[data-hive-disconnect]');
      const post = this.root.querySelector('[data-hive-post-form]');
      const broadcast = this.root.querySelector('[data-hive-broadcast]');
      const cancel = this.root.querySelector('[data-hive-cancel-review]');
      connect?.addEventListener('submit', (event) => this.connect(event, connect));
      disconnect?.addEventListener('click', () => this.disconnect(disconnect));
      post?.addEventListener('submit', (event) => this.prepare(event, post));
      broadcast?.addEventListener('click', () => this.broadcast(broadcast, cancel));
      cancel?.addEventListener('click', () => this.cancelReview());
      return this;
    }

    async connect(event, form) {
      event.preventDefault();
      const account = String(new FormData(form).get('account') || '').trim().toLowerCase().replace(/^@/, '');
      if (!account) return;
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      this.status(`Checking @${account} on Hive…`);
      try {
        const challenge = await this.request('/challenge', { method: 'POST', body: JSON.stringify({ account }) });
        this.status('Account found. Check Keychain to verify control of it.');
        const signed = await this.keychainFactory().signBuffer({ account, message: challenge.message, title: 'Connect Hive to HiVenues' });
        await this.request('/verify', {
          method: 'POST',
          body: JSON.stringify({ challengeId: challenge.id, account, publicKey: signed.publicKey, signature: signed.signature }),
        });
        this.status(`Verified @${account}. Reloading the integration…`, 'success');
        this.reload();
      } catch (error) {
        this.status(humanError(error), 'error');
        if (button) button.disabled = false;
      }
    }

    async disconnect(button) {
      if (button) button.disabled = true;
      try {
        await this.request('/disconnect', { method: 'POST', body: '{}' });
        this.reload();
      } catch (error) {
        this.status(humanError(error), 'error');
        if (button) button.disabled = false;
      }
    }

    showPreflight(preflight) {
      this.preflight = preflight;
      const review = this.root.querySelector('[data-hive-review]');
      if (!review) return;
      review.querySelector('[data-hive-review-account]').textContent = `@${preflight.account}`;
      review.querySelector('[data-hive-review-authority]').textContent = preflight.authority;
      review.querySelector('[data-hive-review-consequence]').textContent = preflight.summary.consequence;
      review.querySelector('[data-hive-review-fingerprint]').textContent = preflight.fingerprint;
      review.hidden = false;
      review.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async prepare(event, form) {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        const data = new FormData(form);
        const preflight = await this.request('/preflight/profile-post', {
          method: 'POST',
          body: JSON.stringify({ title: data.get('title'), body: data.get('body') }),
        });
        this.showPreflight(preflight);
        this.status('Review prepared. Nothing has been broadcast.', 'success');
      } catch (error) {
        this.status(humanError(error), 'error');
      } finally {
        if (button) button.disabled = false;
      }
    }

    cancelReview() {
      this.preflight = null;
      const review = this.root.querySelector('[data-hive-review]');
      if (review) review.hidden = true;
      this.status('Review cancelled. Nothing was broadcast.');
    }

    async observe(id) {
      for (let attempt = 1; attempt <= 8; attempt += 1) {
        const result = await this.request(`/preflight/${encodeURIComponent(id)}/observe`, { method: 'POST', body: '{}' });
        if (result.observed) return result;
        this.status(`Keychain approved the broadcast. Waiting for Hive confirmation (${attempt}/8)…`);
        await this.wait(1500);
      }
      return null;
    }

    async broadcast(button, cancelButton) {
      if (!this.preflight || this.broadcasting) return;
      this.broadcasting = true;
      if (button) button.disabled = true;
      this.status('Confirming this review is still current before Keychain opens.');
      try {
        const armed = await this.request(`/preflight/${encodeURIComponent(this.preflight.id)}/begin`, {
          method: 'POST',
          body: '{}',
        });
        this.preflight = armed;
        this.status('Opening Keychain. Review the operation there before approving it.');
        const wallet = await this.keychainFactory().broadcast({
          account: armed.account,
          operations: armed.operations,
          authority: armed.authority,
        });
        await this.request(`/preflight/${encodeURIComponent(armed.id)}/accepted`, {
          method: 'POST',
          body: JSON.stringify({ transactionId: wallet.transactionId || '' }),
        });
        const observed = await this.observe(armed.id);
        if (observed) {
          this.status(`Confirmed on Hive${observed.transactionId ? ` · ${observed.transactionId}` : ''}.`, 'success');
          const heading = this.root.querySelector('[data-hive-review-heading]');
          if (heading) heading.textContent = 'Confirmed on Hive';
          if (button) button.hidden = true;
          if (cancelButton) cancelButton.textContent = 'Close';
        } else {
          this.status('Keychain approved the broadcast, but HiVenues has not observed the post on-chain yet. Do not submit it again.', 'warning');
        }
      } catch (error) {
        const message = humanError(error);
        if (/missing or expired/i.test(message)) {
          this.preflight = null;
          const review = this.root.querySelector('[data-hive-review]');
          if (review) review.hidden = true;
          this.status('This Hive review expired before the wallet opened. Review the post again; nothing was broadcast.', 'warning');
        } else {
          this.status(message, 'error');
        }
        if (button) button.disabled = false;
      } finally {
        this.broadcasting = false;
      }
    }
  }

  global.HiVenuesHive = Object.freeze({ HiveIntegrationController, humanError });
  document.querySelectorAll('[data-hive-integration]').forEach((root) => new HiveIntegrationController(root).install());
})(window);

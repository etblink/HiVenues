'use strict';

(function attachHiVenuesSupport(global) {
  const ROOT_SELECTOR = '[data-hivenues-support]';
  const OBSERVATION_ATTEMPTS = 5;
  const OBSERVATION_DELAY_MS = 1_500;

  function wait(ms) {
    return new Promise((resolve) => global.setTimeout(resolve, ms));
  }

  async function jsonRequest(fetchImpl, url, {
    method = 'GET',
    csrfToken = '',
    body,
  } = {}) {
    const headers = { accept: 'application/json' };
    if (csrfToken) headers['x-csrf-token'] = csrfToken;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const response = await fetchImpl(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.error?.message || 'This direct support transfer could not be completed.');
      error.code = payload?.error?.code || 'SUPPORT_REQUEST_FAILED';
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function setState(root, state, message) {
    root.dataset.supportState = state;
    const status = root.querySelector('[data-support-status]');
    if (status) status.textContent = message || '';
  }

  function controls(root) {
    return {
      form: root.querySelector('[data-support-form]'),
      amount: root.querySelector('[data-support-amount]'),
      asset: root.querySelector('[data-support-asset]'),
      submit: root.querySelector('[data-support-submit]'),
    };
  }

  function setBusy(root, busy, { lock = false } = {}) {
    root.setAttribute('aria-busy', busy ? 'true' : 'false');
    const { amount, asset, submit } = controls(root);
    if (amount) amount.disabled = Boolean(busy || lock);
    if (asset) asset.disabled = Boolean(busy || lock);
    if (submit) submit.disabled = Boolean(busy || lock);
  }

  function errorState(error, { broadcastAccepted = false } = {}) {
    if (broadcastAccepted) {
      return {
        state: 'uncertain',
        lock: true,
        message: 'Your wallet accepted this transfer, but HiVenues could not confirm the exact Hive transaction. Do not repeat it yet.',
      };
    }

    const code = String(error?.code || '');
    if (code === 'KEYCHAIN_CANCELLED') {
      return {
        state: 'cancelled',
        lock: false,
        message: 'Wallet approval was cancelled. No transfer was accepted as confirmed.',
      };
    }
    if (
      [
        'KEYCHAIN_UNAVAILABLE',
        'KEYCHAIN_LOCKED',
        'KEYCHAIN_TIMEOUT',
        'SUPPORT_PROVIDER_UNAVAILABLE',
        'SUPPORT_ACCOUNT_STATE_UNAVAILABLE',
        'PARTICIPATION_PROVIDER_UNAVAILABLE',
      ].includes(code)
    ) {
      return {
        state: 'provider-unavailable',
        lock: false,
        message: error?.message || 'Your wallet or Hive support service is temporarily unavailable.',
      };
    }
    if (code === 'KEYCHAIN_ACCOUNT_MISMATCH') {
      return {
        state: 'identity-mismatch',
        lock: false,
        message: 'The wallet response did not match your verified Hive identity.',
      };
    }
    if (code === 'SUPPORT_NOT_CONFIGURED') {
      return {
        state: 'stale',
        lock: true,
        message: 'This host no longer has a released support recipient. Reload before trying again.',
      };
    }
    if (code === 'SUPPORT_BALANCE_INSUFFICIENT') {
      return {
        state: 'balance-changed',
        lock: false,
        message: error?.message || 'Your current liquid balance is lower than this support amount.',
      };
    }
    if (code === 'DUPLICATE_OPERATION') {
      return {
        state: 'pending',
        lock: true,
        message: 'An identical transfer is already prepared or awaiting confirmation. Do not repeat it yet.',
      };
    }
    if (['IDENTITY_SESSION_REQUIRED', 'IDENTITY_SESSION_MISMATCH'].includes(code)) {
      return {
        state: 'identity-required',
        lock: false,
        message: 'Your verified Hive identity session is no longer available. Verify again before sending support.',
      };
    }
    return {
      state: 'failed',
      lock: false,
      message: error?.message || 'This direct support transfer could not be completed.',
    };
  }

  function reviewDialog(root, preflight) {
    const dialog = root.querySelector('[data-support-review]');
    const summary = preflight?.summary || {};
    if (!dialog || typeof dialog.showModal !== 'function') {
      return Promise.resolve(global.confirm(
        (summary.consequence || 'Review this direct Hive transfer.')
        + '\n\nFrom: @' + summary.sender
        + '\nTo: @' + summary.recipient
        + '\nAmount: ' + summary.amount
        + '\nCurrent liquid balance: ' + summary.availableBalance
        + '\nAuthority: ' + preflight.authority
        + '\nMemo: ' + summary.memo
        + '\n\nThis is direct support, not checkout. A confirmed transfer is normally irreversible.'
        + '\n\nContinue to your wallet?',
      ));
    }

    dialog.querySelector('[data-support-review-consequence]').textContent =
      summary.consequence || 'Review this exact direct-support transfer.';
    dialog.querySelector('[data-support-review-sender]').textContent = '@' + summary.sender;
    dialog.querySelector('[data-support-review-recipient]').textContent = '@' + summary.recipient;
    dialog.querySelector('[data-support-review-amount]').textContent = summary.amount;
    dialog.querySelector('[data-support-review-balance]').textContent = summary.availableBalance;
    dialog.querySelector('[data-support-review-authority]').textContent = preflight.authority;
    dialog.querySelector('[data-support-review-memo]').textContent = summary.memo;
    dialog.querySelector('[data-support-review-fingerprint]').textContent = preflight.fingerprint;
    dialog.querySelector('[data-support-review-operations]').textContent =
      JSON.stringify(preflight.operations, null, 2);

    const confirmButton = dialog.querySelector('[data-support-confirm]');
    const cancelButton = dialog.querySelector('[data-support-cancel]');
    dialog.showModal();

    return new Promise((resolve) => {
      const finish = (value) => {
        confirmButton.removeEventListener('click', confirm);
        cancelButton.removeEventListener('click', cancel);
        dialog.removeEventListener('cancel', escape);
        dialog.close();
        resolve(value);
      };
      const confirm = () => finish(true);
      const cancel = () => finish(false);
      const escape = (event) => {
        event.preventDefault();
        finish(false);
      };
      confirmButton.addEventListener('click', confirm);
      cancelButton.addEventListener('click', cancel);
      dialog.addEventListener('cancel', escape);
    });
  }

  class SupportController {
    constructor({
      fetchImpl = global.fetch ? global.fetch.bind(global) : null,
      KeychainAdapter = global.HiVenuesKeychain?.KeychainAdapter || null,
      review = null,
      waitImpl = wait,
      reload = () => global.location.reload(),
      observationAttempts = OBSERVATION_ATTEMPTS,
      observationDelayMs = OBSERVATION_DELAY_MS,
    } = {}) {
      this.fetch = fetchImpl;
      this.KeychainAdapter = KeychainAdapter;
      this.review = review || reviewDialog;
      this.wait = waitImpl;
      this.reload = reload;
      this.observationAttempts = observationAttempts;
      this.observationDelayMs = observationDelayMs;
    }

    request(url, options = {}) {
      return jsonRequest(this.fetch, url, options);
    }

    async cancel(preflightId, csrfToken) {
      return this.request('/participation/preflight/' + encodeURIComponent(preflightId) + '/cancel', {
        method: 'POST',
        csrfToken,
      });
    }

    async run(root) {
      if (!root || root.dataset.supportRunning === 'true') return;
      root.dataset.supportRunning = 'true';
      let session = null;
      let preflight = null;
      let broadcastAccepted = false;
      let keepLocked = false;
      setBusy(root, true);

      try {
        const { amount, asset } = controls(root);
        const requestedAmount = String(amount?.value || '').trim();
        const requestedAsset = String(asset?.value || '').trim().toUpperCase();
        if (!/^(0|[1-9][0-9]*)\.[0-9]{3}$/.test(requestedAmount)) {
          const error = new Error('Enter a positive support amount with exactly three decimals, such as 1.000.');
          error.code = 'SUPPORT_AMOUNT_INVALID';
          throw error;
        }
        if (!['HIVE', 'HBD'].includes(requestedAsset)) {
          const error = new Error('Choose HIVE or HBD.');
          error.code = 'SUPPORT_ASSET_INVALID';
          throw error;
        }

        session = await this.request('/identity/session');
        if (!session?.authenticated || !session.csrfToken) {
          const error = new Error('A verified Hive identity session is required.');
          error.code = 'IDENTITY_SESSION_REQUIRED';
          throw error;
        }

        const actor = String(root.dataset.supportActor || '');
        if (!actor || actor !== session.account) {
          const error = new Error('This page was prepared for a different verified Hive identity.');
          error.code = 'IDENTITY_SESSION_MISMATCH';
          throw error;
        }

        setState(root, 'preparing', 'Checking the released recipient and your exact current liquid balance…');
        preflight = await this.request(root.dataset.supportUrl, {
          method: 'POST',
          csrfToken: session.csrfToken,
          body: { amount: requestedAmount, asset: requestedAsset },
        });

        const expectedRecipient = String(root.dataset.supportRecipient || '');
        if (!expectedRecipient || preflight?.summary?.recipient !== expectedRecipient) {
          const error = new Error('The released support recipient changed before review. Reload this page.');
          error.code = 'SUPPORT_RECIPIENT_CHANGED';
          throw error;
        }

        setState(root, 'review', 'Review the exact amount, recipient and Active-authority transfer before your wallet opens.');
        const approved = await this.review(root, preflight);
        if (!approved) {
          await this.cancel(preflight.id, session.csrfToken);
          preflight = null;
          setState(root, 'cancelled', 'Cancelled during review. No support transfer was sent to Hive.');
          return;
        }

        if (typeof this.KeychainAdapter !== 'function') {
          const error = new Error('A compatible human-owned Hive wallet was not found in this browser.');
          error.code = 'KEYCHAIN_UNAVAILABLE';
          throw error;
        }

        setState(
          root,
          'awaiting-wallet',
          'Approve this exact Active-authority transfer in your wallet as @' + preflight.signer + '.',
        );
        const wallet = new this.KeychainAdapter();
        const result = await wallet.broadcast({
          account: preflight.signer,
          operations: preflight.operations,
          authority: preflight.authority,
        });
        broadcastAccepted = Boolean(result?.accepted);
        if (!broadcastAccepted) {
          const error = new Error('The wallet did not report acceptance.');
          error.code = 'KEYCHAIN_REQUEST_FAILED';
          throw error;
        }

        const accepted = await this.request(
          '/participation/preflight/' + encodeURIComponent(preflight.id) + '/accepted',
          {
            method: 'POST',
            csrfToken: session.csrfToken,
            body: { transactionId: result?.transactionId || null },
          },
        );
        setState(root, 'pending', accepted.message);

        for (let attempt = 0; attempt < this.observationAttempts; attempt += 1) {
          if (attempt > 0) await this.wait(this.observationDelayMs);
          const observation = await this.request(
            '/participation/preflight/' + encodeURIComponent(preflight.id) + '/observe',
            {
              method: 'POST',
              csrfToken: session.csrfToken,
            },
          );
          if (observation.state === 'observed') {
            keepLocked = true;
            setState(
              root,
              'confirmed',
              'Confirmed on Hive. ' + preflight.summary.amount
                + ' was sent to @' + preflight.summary.recipient + '.',
            );
            setBusy(root, false, { lock: true });
            return;
          }
          setState(root, 'pending', observation.message);
        }

        keepLocked = true;
        setState(
          root,
          'uncertain',
          'Your wallet accepted this support transfer, but exact Hive confirmation is still pending. Do not repeat it yet.',
        );
      } catch (error) {
        if (preflight && !broadcastAccepted && session?.csrfToken) {
          await this.cancel(preflight.id, session.csrfToken).catch(() => {});
        }
        const mapped = errorState(error, { broadcastAccepted });
        keepLocked = mapped.lock;
        setState(root, mapped.state, mapped.message);
      } finally {
        root.dataset.supportRunning = 'false';
        setBusy(root, false, { lock: keepLocked });
      }
    }
  }

  function initializeSupportRoot(root, options = {}) {
    if (!root || root.dataset.supportBound === 'true') return root;
    root.dataset.supportBound = 'true';
    const controller = options.controller || new SupportController(options);
    const form = root.querySelector('[data-support-form]');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        controller.run(root);
      });
    }
    return root;
  }

  function initializeAll(options = {}) {
    return Array.from(global.document.querySelectorAll(ROOT_SELECTOR))
      .map((root) => initializeSupportRoot(root, options));
  }

  global.HiVenuesSupport = Object.freeze({
    OBSERVATION_ATTEMPTS,
    OBSERVATION_DELAY_MS,
    ROOT_SELECTOR,
    SupportController,
    errorState,
    initializeAll,
    initializeSupportRoot,
    jsonRequest,
    reviewDialog,
    setState,
  });

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', () => initializeAll(), { once: true });
  } else {
    initializeAll();
  }
})(window);

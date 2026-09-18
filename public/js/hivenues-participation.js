'use strict';

(function attachHiVenuesParticipation(global) {
  const ROOT_SELECTOR = '[data-hivenues-participation]';
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
      const error = new Error(payload?.error?.message || 'This Hive action could not be completed.');
      error.code = payload?.error?.code || 'PARTICIPATION_REQUEST_FAILED';
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function setState(root, state, message) {
    root.dataset.participationState = state;
    const status = root.querySelector('[data-participation-status]');
    if (status) status.textContent = message || '';
  }

  function setBusy(root, busy, { lock = false } = {}) {
    root.setAttribute('aria-busy', busy ? 'true' : 'false');
    const button = root.querySelector('[data-participation-submit]');
    if (button) button.disabled = Boolean(busy || lock);
  }

  function errorState(error, { broadcastAccepted = false } = {}) {
    if (broadcastAccepted) {
      return {
        state: 'uncertain',
        lock: true,
        message: 'Your wallet accepted this action, but HiVenues could not confirm the resulting Hive state. Do not repeat it yet; check again after Hive catches up.',
      };
    }

    const code = String(error?.code || '');
    if (code === 'KEYCHAIN_CANCELLED') {
      return {
        state: 'cancelled',
        lock: false,
        message: 'Wallet approval was cancelled. Nothing was broadcast.',
      };
    }
    if (['KEYCHAIN_UNAVAILABLE', 'KEYCHAIN_LOCKED', 'KEYCHAIN_TIMEOUT', 'PARTICIPATION_PROVIDER_UNAVAILABLE'].includes(code)) {
      return {
        state: 'provider-unavailable',
        lock: false,
        message: error?.message || 'Your wallet or Hive participation service is temporarily unavailable.',
      };
    }
    if (code === 'KEYCHAIN_ACCOUNT_MISMATCH') {
      return {
        state: 'identity-mismatch',
        lock: false,
        message: 'The wallet response did not match your verified Hive identity. Nothing was accepted as confirmed.',
      };
    }
    if (code === 'RELATIONSHIP_ALREADY_CONFIRMED') {
      return {
        state: 'stale',
        lock: true,
        message: 'Hive already reports this relationship in the requested state. Reload before taking another action.',
      };
    }
    if (code === 'DUPLICATE_OPERATION') {
      return {
        state: 'pending',
        lock: true,
        message: 'An identical relationship change is already prepared or awaiting confirmation. Do not repeat it yet.',
      };
    }
    if (code === 'IDENTITY_SESSION_REQUIRED') {
      return {
        state: 'identity-required',
        lock: false,
        message: 'Your verified identity session is no longer available. Prove your identity again before participating.',
      };
    }
    return {
      state: 'failed',
      lock: false,
      message: error?.message || 'This Hive relationship action could not be completed.',
    };
  }

  function reviewDialog(root, preflight) {
    const dialog = root.querySelector('[data-participation-review]');
    if (!dialog || typeof dialog.showModal !== 'function') {
      const consequence = preflight?.summary?.consequence || ('Hive action: ' + preflight?.action);
      return Promise.resolve(global.confirm(
        consequence
        + '\n\nVerified account: @' + preflight.account
        + '\nHive mechanic: ' + preflight.action
        + '\n\nContinue to your wallet?',
      ));
    }

    dialog.querySelector('[data-participation-consequence]').textContent =
      preflight.summary?.consequence || 'Review this Hive relationship change.';
    dialog.querySelector('[data-participation-review-account]').textContent = '@' + preflight.account;
    dialog.querySelector('[data-participation-review-action]').textContent = preflight.action;
    const target = preflight.summary?.following || preflight.summary?.community || '';
    dialog.querySelector('[data-participation-review-target]').textContent =
      preflight.summary?.following ? '@' + target : target;
    dialog.querySelector('[data-participation-review-fingerprint]').textContent = preflight.fingerprint;
    dialog.querySelector('[data-participation-review-operations]').textContent =
      JSON.stringify(preflight.operations, null, 2);

    const confirmButton = dialog.querySelector('[data-participation-confirm]');
    const cancelButton = dialog.querySelector('[data-participation-cancel]');
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

  class ParticipationController {
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
      if (!root || root.dataset.participationRunning === 'true') return;
      root.dataset.participationRunning = 'true';
      let session = null;
      let preflight = null;
      let broadcastAccepted = false;
      let keepLocked = false;
      setBusy(root, true);
      try {
        session = await this.request('/identity/session');
        if (!session?.authenticated || !session.csrfToken) {
          const error = new Error('A verified Hive identity session is required.');
          error.code = 'IDENTITY_SESSION_REQUIRED';
          throw error;
        }

        const actor = String(root.dataset.participationActor || '');
        if (!actor || actor !== session.account) {
          const error = new Error('This page was prepared for a different verified Hive identity.');
          error.code = 'IDENTITY_SESSION_MISMATCH';
          throw error;
        }

        setState(root, 'preparing', 'Checking the current Hive relationship before review…');
        preflight = await this.request(root.dataset.participationUrl, {
          method: 'POST',
          csrfToken: session.csrfToken,
          body: {},
        });

        setState(root, 'review', 'Review the exact Hive consequence before opening your wallet.');
        const approved = await this.review(root, preflight);
        if (!approved) {
          await this.cancel(preflight.id, session.csrfToken);
          preflight = null;
          setState(root, 'cancelled', 'Cancelled during review. Nothing was sent to Hive.');
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
          'Approve this exact relationship change in your wallet as @' + preflight.signer + '.',
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
          setState(root, observation.state === 'observed' ? 'confirmed' : 'pending', observation.message);
          if (observation.state === 'observed') {
            keepLocked = true;
            setBusy(root, false, { lock: true });
            await this.wait(350);
            this.reload();
            return;
          }
        }

        keepLocked = true;
        setState(
          root,
          'uncertain',
          'Your wallet accepted this action, but Hive confirmation is still pending. Do not repeat it yet.',
        );
      } catch (error) {
        if (preflight && !broadcastAccepted && session?.csrfToken) {
          await this.cancel(preflight.id, session.csrfToken).catch(() => {});
        }
        const mapped = errorState(error, { broadcastAccepted });
        keepLocked = mapped.lock;
        setState(root, mapped.state, mapped.message);
      } finally {
        root.dataset.participationRunning = 'false';
        setBusy(root, false, { lock: keepLocked });
      }
    }
  }

  function initializeParticipationRoot(root, options = {}) {
    if (!root || root.dataset.participationBound === 'true') return root;
    root.dataset.participationBound = 'true';
    const controller = options.controller || new ParticipationController(options);
    const button = root.querySelector('[data-participation-submit]');
    if (button) button.addEventListener('click', () => controller.run(root));
    return root;
  }

  function initializeAll(options = {}) {
    return Array.from(global.document.querySelectorAll(ROOT_SELECTOR))
      .map((root) => initializeParticipationRoot(root, options));
  }

  global.HiVenuesParticipation = Object.freeze({
    OBSERVATION_ATTEMPTS,
    OBSERVATION_DELAY_MS,
    ParticipationController,
    ROOT_SELECTOR,
    errorState,
    initializeAll,
    initializeParticipationRoot,
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

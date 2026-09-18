'use strict';

(function attachHiVenuesRewardClaim(global) {
  const ROOT_SELECTOR = '[data-hivenues-reward-claim]';
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
      const error = new Error(payload?.error?.message || 'This Hive reward claim could not be completed.');
      error.code = payload?.error?.code || 'REWARD_CLAIM_REQUEST_FAILED';
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function setState(root, state, message) {
    root.dataset.rewardState = state;
    const status = root.querySelector('[data-reward-status]');
    if (status) status.textContent = message || '';
  }

  function setBusy(root, busy, { lock = false } = {}) {
    root.setAttribute('aria-busy', busy ? 'true' : 'false');
    const button = root.querySelector('[data-reward-submit]');
    if (button) button.disabled = Boolean(busy || lock);
  }

  function errorState(error, { broadcastAccepted = false } = {}) {
    if (broadcastAccepted) {
      return {
        state: 'uncertain',
        lock: true,
        message: 'Your wallet accepted this reward claim, but HiVenues could not confirm the exact Hive transaction. Do not repeat it yet.',
      };
    }

    const code = String(error?.code || '');
    if (code === 'KEYCHAIN_CANCELLED') {
      return {
        state: 'cancelled',
        lock: false,
        message: 'Wallet approval was cancelled. No reward claim was accepted as confirmed.',
      };
    }
    if (
      [
        'KEYCHAIN_UNAVAILABLE',
        'KEYCHAIN_LOCKED',
        'KEYCHAIN_TIMEOUT',
        'REWARD_CLAIM_PROVIDER_UNAVAILABLE',
        'PARTICIPATION_PROVIDER_UNAVAILABLE',
      ].includes(code)
    ) {
      return {
        state: 'provider-unavailable',
        lock: false,
        message: error?.message || 'Your wallet or Hive reward service is temporarily unavailable.',
      };
    }
    if (code === 'KEYCHAIN_ACCOUNT_MISMATCH') {
      return {
        state: 'identity-mismatch',
        lock: false,
        message: 'The wallet response did not match your verified Hive identity.',
      };
    }
    if (code === 'NO_CLAIMABLE_REWARDS') {
      return {
        state: 'stale',
        lock: true,
        message: 'Hive no longer reports any pending rewards to claim. Reload this page for the current state.',
      };
    }
    if (code === 'DUPLICATE_OPERATION') {
      return {
        state: 'pending',
        lock: true,
        message: 'An identical reward claim is already prepared or awaiting confirmation. Do not repeat it yet.',
      };
    }
    if (['IDENTITY_SESSION_REQUIRED', 'IDENTITY_SESSION_MISMATCH'].includes(code)) {
      return {
        state: 'identity-required',
        lock: false,
        message: 'Your verified Hive identity session is no longer available. Prove your identity again before claiming rewards.',
      };
    }
    return {
      state: 'failed',
      lock: false,
      message: error?.message || 'This Hive reward claim could not be completed.',
    };
  }

  function reviewDialog(root, preflight) {
    const dialog = root.querySelector('[data-reward-review]');
    const summary = preflight?.summary || {};
    if (!dialog || typeof dialog.showModal !== 'function') {
      return Promise.resolve(global.confirm(
        (summary.consequence || 'Review this Hive reward claim.')
        + '\n\nVerified account: @' + preflight.account
        + '\nPending HIVE: ' + summary.rewardHive
        + '\nPending HBD: ' + summary.rewardHbd
        + '\nPending vesting reward: ' + summary.rewardVests
        + '\nAuthority: ' + preflight.authority
        + '\n\nContinue to your wallet?',
      ));
    }

    dialog.querySelector('[data-reward-review-consequence]').textContent =
      summary.consequence || 'Review this exact Hive reward claim.';
    dialog.querySelector('[data-reward-review-account]').textContent = '@' + preflight.account;
    dialog.querySelector('[data-reward-review-hive]').textContent = summary.rewardHive;
    dialog.querySelector('[data-reward-review-hbd]').textContent = summary.rewardHbd;
    dialog.querySelector('[data-reward-review-vests]').textContent = summary.rewardVests;
    dialog.querySelector('[data-reward-review-authority]').textContent = preflight.authority;
    dialog.querySelector('[data-reward-review-fingerprint]').textContent = preflight.fingerprint;
    dialog.querySelector('[data-reward-review-operations]').textContent =
      JSON.stringify(preflight.operations, null, 2);

    const confirmButton = dialog.querySelector('[data-reward-confirm]');
    const cancelButton = dialog.querySelector('[data-reward-cancel]');
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

  class RewardClaimController {
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
      if (!root || root.dataset.rewardRunning === 'true') return;
      root.dataset.rewardRunning = 'true';
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

        const actor = String(root.dataset.rewardActor || '');
        if (!actor || actor !== session.account) {
          const error = new Error('This page was prepared for a different verified Hive identity.');
          error.code = 'IDENTITY_SESSION_MISMATCH';
          throw error;
        }

        setState(root, 'preparing', 'Checking your exact current Hive rewards before review…');
        preflight = await this.request(root.dataset.rewardUrl, {
          method: 'POST',
          csrfToken: session.csrfToken,
          body: {},
        });

        setState(root, 'review', 'Review the exact current Hive rewards before opening your wallet.');
        const approved = await this.review(root, preflight);
        if (!approved) {
          await this.cancel(preflight.id, session.csrfToken);
          preflight = null;
          setState(root, 'cancelled', 'Cancelled during review. No reward claim was sent to Hive.');
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
          'Approve this exact reward claim in your wallet as @' + preflight.signer + '.',
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
          'Your wallet accepted this reward claim, but exact Hive confirmation is still pending. Do not repeat it yet.',
        );
      } catch (error) {
        if (preflight && !broadcastAccepted && session?.csrfToken) {
          await this.cancel(preflight.id, session.csrfToken).catch(() => {});
        }
        const mapped = errorState(error, { broadcastAccepted });
        keepLocked = mapped.lock;
        setState(root, mapped.state, mapped.message);
      } finally {
        root.dataset.rewardRunning = 'false';
        setBusy(root, false, { lock: keepLocked });
      }
    }
  }

  function initializeRewardRoot(root, options = {}) {
    if (!root || root.dataset.rewardBound === 'true') return root;
    root.dataset.rewardBound = 'true';
    const controller = options.controller || new RewardClaimController(options);
    const button = root.querySelector('[data-reward-submit]');
    if (button) button.addEventListener('click', () => controller.run(root));
    return root;
  }

  function initializeAll(options = {}) {
    return Array.from(global.document.querySelectorAll(ROOT_SELECTOR))
      .map((root) => initializeRewardRoot(root, options));
  }

  global.HiVenuesRewardClaim = Object.freeze({
    OBSERVATION_ATTEMPTS,
    OBSERVATION_DELAY_MS,
    ROOT_SELECTOR,
    RewardClaimController,
    errorState,
    initializeAll,
    initializeRewardRoot,
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

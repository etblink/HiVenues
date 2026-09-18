'use strict';

(function attachHiVenuesVote(global) {
  const ROOT_SELECTOR = '[data-hivenues-vote]';
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
      const error = new Error(payload?.error?.message || 'This Hive vote could not be completed.');
      error.code = payload?.error?.code || 'VOTE_REQUEST_FAILED';
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function setState(root, state, message) {
    root.dataset.voteState = state;
    const status = root.querySelector('[data-vote-status]');
    if (status) status.textContent = message || '';
  }

  function setBusy(root, busy, { lock = false } = {}) {
    root.setAttribute('aria-busy', busy ? 'true' : 'false');
    for (const button of root.querySelectorAll('[data-vote-direction]')) {
      button.disabled = Boolean(busy || lock);
    }
    const percent = root.querySelector('[data-vote-percent]');
    if (percent) percent.disabled = Boolean(busy || lock);
  }

  function updatePercentOutput(root) {
    const input = root.querySelector('[data-vote-percent]');
    const output = root.querySelector('[data-vote-percent-output]');
    if (input && output) output.textContent = String(input.value) + '%';
  }

  function errorState(error, { broadcastAccepted = false } = {}) {
    if (broadcastAccepted) {
      return {
        state: 'uncertain',
        lock: true,
        message: 'Your wallet accepted this vote, but HiVenues could not confirm the exact Hive vote weight. Do not repeat it yet.',
      };
    }

    const code = String(error?.code || '');
    if (code === 'KEYCHAIN_CANCELLED') {
      return {
        state: 'cancelled',
        lock: false,
        message: 'Wallet approval was cancelled. No vote was accepted as confirmed.',
      };
    }
    if (['KEYCHAIN_UNAVAILABLE', 'KEYCHAIN_LOCKED', 'KEYCHAIN_TIMEOUT', 'VOTE_PROVIDER_UNAVAILABLE', 'PARTICIPATION_PROVIDER_UNAVAILABLE'].includes(code)) {
      return {
        state: 'provider-unavailable',
        lock: false,
        message: error?.message || 'Your wallet or Hive vote service is temporarily unavailable.',
      };
    }
    if (code === 'KEYCHAIN_ACCOUNT_MISMATCH') {
      return {
        state: 'identity-mismatch',
        lock: false,
        message: 'The wallet response did not match your verified Hive identity.',
      };
    }
    if (code === 'VOTE_ALREADY_CONFIRMED') {
      return {
        state: 'stale',
        lock: true,
        message: 'Hive already reports this exact vote weight. Reload before changing it again.',
      };
    }
    if (code === 'NEGATIVE_VOTE_ACTION_HIDDEN') {
      return {
        state: 'stale',
        lock: true,
        message: error?.message || 'This HiVenue no longer presents a negative-vote action. Reload before voting.',
      };
    }
    if (code === 'DUPLICATE_OPERATION') {
      return {
        state: 'pending',
        lock: true,
        message: 'An identical vote is already prepared or awaiting confirmation. Do not repeat it yet.',
      };
    }
    if (['IDENTITY_SESSION_REQUIRED', 'IDENTITY_SESSION_MISMATCH'].includes(code)) {
      return {
        state: 'identity-required',
        lock: false,
        message: 'Your verified Hive identity session is no longer available. Prove your identity again before voting.',
      };
    }
    return {
      state: 'failed',
      lock: false,
      message: error?.message || 'This Hive vote could not be completed.',
    };
  }

  function reviewDialog(root, preflight) {
    const dialog = root.querySelector('[data-vote-review]');
    if (!dialog || typeof dialog.showModal !== 'function') {
      return Promise.resolve(global.confirm(
        (preflight.summary?.consequence || 'Review this Hive vote.')
        + '\n\nVerified account: @' + preflight.account
        + '\nTarget: @' + preflight.summary?.author + '/' + preflight.summary?.permlink
        + '\nDirection: ' + preflight.summary?.direction
        + '\nStrength: ' + preflight.summary?.percent + '%'
        + '\nSigned Hive weight: ' + preflight.summary?.weight
        + '\n\nContinue to your wallet?',
      ));
    }

    dialog.querySelector('[data-vote-review-consequence]').textContent =
      preflight.summary?.consequence || 'Review this Hive vote.';
    dialog.querySelector('[data-vote-review-account]').textContent = '@' + preflight.account;
    dialog.querySelector('[data-vote-review-target]').textContent =
      '@' + preflight.summary.author + '/' + preflight.summary.permlink;
    dialog.querySelector('[data-vote-review-direction]').textContent = preflight.summary.direction;
    dialog.querySelector('[data-vote-review-percent]').textContent = preflight.summary.percent + '%';
    dialog.querySelector('[data-vote-review-weight]').textContent = String(preflight.summary.weight);
    dialog.querySelector('[data-vote-review-authority]').textContent = preflight.authority;
    dialog.querySelector('[data-vote-review-fingerprint]').textContent = preflight.fingerprint;
    dialog.querySelector('[data-vote-review-operations]').textContent =
      JSON.stringify(preflight.operations, null, 2);

    const confirmButton = dialog.querySelector('[data-vote-confirm]');
    const cancelButton = dialog.querySelector('[data-vote-cancel]');
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

  class VoteController {
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

    async run(root, direction) {
      if (!root || root.dataset.voteRunning === 'true') return;
      root.dataset.voteRunning = 'true';
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

        const actor = String(root.dataset.voteActor || '');
        if (!actor || actor !== session.account) {
          const error = new Error('This page was prepared for a different verified Hive identity.');
          error.code = 'IDENTITY_SESSION_MISMATCH';
          throw error;
        }

        const percentInput = root.querySelector('[data-vote-percent]');
        const percent = Number(percentInput?.value);
        setState(root, 'preparing', 'Checking the current canonical Hive vote before review…');
        preflight = await this.request(root.dataset.voteUrl, {
          method: 'POST',
          csrfToken: session.csrfToken,
          body: { direction, percent },
        });

        setState(root, 'review', 'Review the exact Hive vote before opening your wallet.');
        const approved = await this.review(root, preflight);
        if (!approved) {
          await this.cancel(preflight.id, session.csrfToken);
          preflight = null;
          setState(root, 'cancelled', 'Cancelled during review. No vote was sent to Hive.');
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
          'Approve this exact Hive vote in your wallet as @' + preflight.signer + '.',
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
          'Your wallet accepted this vote, but exact Hive confirmation is still pending. Do not repeat it yet.',
        );
      } catch (error) {
        if (preflight && !broadcastAccepted && session?.csrfToken) {
          await this.cancel(preflight.id, session.csrfToken).catch(() => {});
        }
        const mapped = errorState(error, { broadcastAccepted });
        keepLocked = mapped.lock;
        setState(root, mapped.state, mapped.message);
      } finally {
        root.dataset.voteRunning = 'false';
        setBusy(root, false, { lock: keepLocked });
      }
    }
  }

  function initializeVoteRoot(root, options = {}) {
    if (!root || root.dataset.voteBound === 'true') return root;
    root.dataset.voteBound = 'true';
    const controller = options.controller || new VoteController(options);
    const percent = root.querySelector('[data-vote-percent]');
    if (percent) {
      percent.addEventListener('input', () => updatePercentOutput(root));
      updatePercentOutput(root);
    }
    for (const button of root.querySelectorAll('[data-vote-direction]')) {
      button.addEventListener('click', () => controller.run(root, button.dataset.voteDirection));
    }
    return root;
  }

  function initializeAll(options = {}) {
    return Array.from(global.document.querySelectorAll(ROOT_SELECTOR))
      .map((root) => initializeVoteRoot(root, options));
  }

  global.HiVenuesVote = Object.freeze({
    OBSERVATION_ATTEMPTS,
    OBSERVATION_DELAY_MS,
    ROOT_SELECTOR,
    VoteController,
    errorState,
    initializeAll,
    initializeVoteRoot,
    jsonRequest,
    reviewDialog,
    setState,
    updatePercentOutput,
  });

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', () => initializeAll(), { once: true });
  } else {
    initializeAll();
  }
})(window);

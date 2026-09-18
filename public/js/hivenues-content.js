'use strict';

(function attachHiVenuesContent(global) {
  const ROOT_SELECTOR = '[data-hivenues-content]';
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
      const error = new Error(payload?.error?.message || 'This Hive content action could not be completed.');
      error.code = payload?.error?.code || 'CONTENT_REQUEST_FAILED';
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function contentPayload(root) {
    const form = root.querySelector('[data-content-form]');
    const payload = {};
    if (!form) return payload;
    const title = form.querySelector('[data-content-title]');
    const body = form.querySelector('[data-content-body]');
    if (title) payload.title = title.value;
    if (body) payload.body = body.value;
    return payload;
  }

  function setState(root, state, message) {
    root.dataset.contentState = state;
    const status = root.querySelector('[data-content-status]');
    if (status) status.textContent = message || '';
  }

  function setBusy(root, busy, { lock = false } = {}) {
    root.setAttribute('aria-busy', busy ? 'true' : 'false');
    const button = root.querySelector('[data-content-submit]');
    if (button) button.disabled = Boolean(busy || lock);
  }

  function updatePreview(root) {
    const title = root.querySelector('[data-content-title]');
    const body = root.querySelector('[data-content-body]');
    const previewTitle = root.querySelector('[data-content-preview-title]');
    const previewBody = root.querySelector('[data-content-preview-body]');
    if (previewTitle) {
      previewTitle.textContent = title?.value.trim() || previewTitle.dataset.empty || 'Untitled';
    }
    if (previewBody) {
      previewBody.textContent = body?.value || previewBody.dataset.empty || 'Your public content will appear here.';
    }
  }

  function errorState(error, { broadcastAccepted = false } = {}) {
    if (broadcastAccepted) {
      return {
        state: 'uncertain',
        lock: true,
        message: 'Your wallet accepted this public content operation, but HiVenues could not confirm the exact canonical content yet. Do not repeat it.',
      };
    }

    const code = String(error?.code || '');
    if (code === 'KEYCHAIN_CANCELLED') {
      return {
        state: 'cancelled',
        lock: false,
        message: 'Wallet approval was cancelled. Nothing was published.',
      };
    }
    if (['KEYCHAIN_UNAVAILABLE', 'KEYCHAIN_LOCKED', 'KEYCHAIN_TIMEOUT', 'CONTENT_PROVIDER_UNAVAILABLE', 'PARTICIPATION_PROVIDER_UNAVAILABLE'].includes(code)) {
      return {
        state: 'provider-unavailable',
        lock: false,
        message: error?.message || 'Your wallet or Hive content service is temporarily unavailable.',
      };
    }
    if (['KEYCHAIN_ACCOUNT_MISMATCH', 'IDENTITY_SESSION_MISMATCH', 'CONTENT_AUTHOR_MISMATCH'].includes(code)) {
      return {
        state: 'identity-mismatch',
        lock: false,
        message: error?.message || 'The verified Hive identity does not match this content action.',
      };
    }
    if (code === 'DUPLICATE_OPERATION') {
      return {
        state: 'pending',
        lock: true,
        message: 'An identical public content operation is already prepared or awaiting confirmation. Do not repeat it yet.',
      };
    }
    if (code === 'IDENTITY_SESSION_REQUIRED') {
      return {
        state: 'identity-required',
        lock: false,
        message: 'Your verified Hive identity session is no longer available. Prove your identity again before publishing.',
      };
    }
    if (code === 'NOT_FOUND') {
      return {
        state: 'stale',
        lock: true,
        message: error?.message || 'The canonical content target changed or disappeared. Reload before trying again.',
      };
    }
    return {
      state: 'failed',
      lock: false,
      message: error?.message || 'This Hive content action could not be completed.',
    };
  }

  function reviewTarget(preflight) {
    if (preflight.summary?.parentAuthor) {
      return '@' + preflight.summary.parentAuthor + '/' + preflight.summary.parentPermlink;
    }
    if (preflight.summary?.community) return preflight.summary.community;
    if (preflight.summary?.author && preflight.summary?.permlink) {
      return '@' + preflight.summary.author + '/' + preflight.summary.permlink;
    }
    return '';
  }

  function reviewDialog(root, preflight) {
    const dialog = root.querySelector('[data-content-review]');
    const operation = preflight?.operations?.find((item) => Array.isArray(item) && item[0] === 'comment');
    const value = operation?.[1] || {};
    if (!dialog || typeof dialog.showModal !== 'function') {
      return Promise.resolve(global.confirm(
        (preflight.summary?.consequence || 'Review this public Hive content operation.')
        + '\n\nVerified author: @' + preflight.account
        + '\nHive mechanic: ' + preflight.action
        + '\nTarget: ' + reviewTarget(preflight)
        + '\nPermlink: ' + (value.permlink || '')
        + '\n\nContinue to your wallet?',
      ));
    }

    dialog.querySelector('[data-content-review-consequence]').textContent =
      preflight.summary?.consequence || 'Review this public Hive content operation.';
    dialog.querySelector('[data-content-review-account]').textContent = '@' + preflight.account;
    dialog.querySelector('[data-content-review-action]').textContent = preflight.action;
    dialog.querySelector('[data-content-review-target]').textContent = reviewTarget(preflight);
    dialog.querySelector('[data-content-review-permlink]').textContent = value.permlink || '';
    const title = dialog.querySelector('[data-content-review-title-text]');
    if (title) title.textContent = value.title || '';
    const body = dialog.querySelector('[data-content-review-body-text]');
    if (body) body.textContent = value.body || '';
    dialog.querySelector('[data-content-review-fingerprint]').textContent = preflight.fingerprint;
    dialog.querySelector('[data-content-review-operations]').textContent =
      JSON.stringify(preflight.operations, null, 2);

    const confirmButton = dialog.querySelector('[data-content-confirm]');
    const cancelButton = dialog.querySelector('[data-content-cancel]');
    dialog.showModal();

    return new Promise((resolve) => {
      const finish = (valueResult) => {
        confirmButton.removeEventListener('click', confirm);
        cancelButton.removeEventListener('click', cancel);
        dialog.removeEventListener('cancel', escape);
        dialog.close();
        resolve(valueResult);
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

  class ContentController {
    constructor({
      fetchImpl = global.fetch ? global.fetch.bind(global) : null,
      KeychainAdapter = global.HiVenuesKeychain?.KeychainAdapter || null,
      review = null,
      waitImpl = wait,
      navigate = (href) => global.location.assign(href),
      reload = () => global.location.reload(),
      observationAttempts = OBSERVATION_ATTEMPTS,
      observationDelayMs = OBSERVATION_DELAY_MS,
    } = {}) {
      this.fetch = fetchImpl;
      this.KeychainAdapter = KeychainAdapter;
      this.review = review || reviewDialog;
      this.wait = waitImpl;
      this.navigate = navigate;
      this.reload = reload;
      this.observationAttempts = observationAttempts;
      this.observationDelayMs = observationDelayMs;
    }

    request(url, options = {}) {
      return jsonRequest(this.fetch, url, options);
    }

    cancel(preflightId, csrfToken) {
      return this.request('/participation/preflight/' + encodeURIComponent(preflightId) + '/cancel', {
        method: 'POST',
        csrfToken,
      });
    }

    async run(root) {
      if (!root || root.dataset.contentRunning === 'true') return;
      root.dataset.contentRunning = 'true';
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

        const actor = String(root.dataset.contentActor || '');
        if (!actor || actor !== session.account) {
          const error = new Error('This composer was prepared for a different verified Hive identity.');
          error.code = 'IDENTITY_SESSION_MISMATCH';
          throw error;
        }

        setState(root, 'preparing', 'Revalidating canonical Hive content context…');
        preflight = await this.request(root.dataset.contentUrl, {
          method: 'POST',
          csrfToken: session.csrfToken,
          body: contentPayload(root),
        });

        setState(root, 'review', 'Review the exact public content before opening your wallet.');
        const approved = await this.review(root, preflight);
        if (!approved) {
          await this.cancel(preflight.id, session.csrfToken);
          preflight = null;
          setState(root, 'cancelled', 'Cancelled during review. Nothing was published.');
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
          'Approve this exact public content operation in your wallet as @' + preflight.signer + '.',
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
            const href = observation.summary?.discussionHref || preflight.summary?.discussionHref;
            if (href && root.dataset.contentMode === 'post') this.navigate(href);
            else this.reload();
            return;
          }
        }

        keepLocked = true;
        setState(
          root,
          'uncertain',
          'Your wallet accepted this public content operation, but exact Hive confirmation is still pending. Do not repeat it yet.',
        );
      } catch (error) {
        if (preflight && !broadcastAccepted && session?.csrfToken) {
          await this.cancel(preflight.id, session.csrfToken).catch(() => {});
        }
        const mapped = errorState(error, { broadcastAccepted });
        keepLocked = mapped.lock;
        setState(root, mapped.state, mapped.message);
      } finally {
        root.dataset.contentRunning = 'false';
        setBusy(root, false, { lock: keepLocked });
      }
    }
  }

  function initializeContentRoot(root, options = {}) {
    if (!root || root.dataset.contentBound === 'true') return root;
    root.dataset.contentBound = 'true';
    const controller = options.controller || new ContentController(options);
    const form = root.querySelector('[data-content-form]');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        controller.run(root);
      });
      form.addEventListener('input', () => updatePreview(root));
    }
    updatePreview(root);
    return root;
  }

  function initializeAll(options = {}) {
    return Array.from(global.document.querySelectorAll(ROOT_SELECTOR))
      .map((root) => initializeContentRoot(root, options));
  }

  global.HiVenuesContent = Object.freeze({
    ContentController,
    OBSERVATION_ATTEMPTS,
    OBSERVATION_DELAY_MS,
    ROOT_SELECTOR,
    contentPayload,
    errorState,
    initializeAll,
    initializeContentRoot,
    jsonRequest,
    reviewDialog,
    setState,
    updatePreview,
  });

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', () => initializeAll(), { once: true });
  } else {
    initializeAll();
  }
})(window);

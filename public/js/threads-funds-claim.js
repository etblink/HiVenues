'use strict';

(function attachThreadsFundsClaim(global) {
  const OBSERVATION_ATTEMPTS = 5;
  const OBSERVATION_DELAY_MS = 1_500;

  async function parseResponse(response) {
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.error?.message || 'The Threads funds claim could not be completed.');
      error.code = payload?.error?.code || 'REQUEST_FAILED';
      throw error;
    }
    return payload;
  }

  function wait(ms) {
    return new Promise((resolve) => global.setTimeout(resolve, ms));
  }

  function setStatus(form, message, isError = false) {
    const status = form.querySelector('[data-threads-funds-status]');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('text-red-300', isError);
    status.classList.toggle('text-gray-300', !isError);
  }

  function reviewDialog(preflight) {
    const dialog = document.querySelector('[data-social-confirm]');
    if (!dialog || typeof dialog.showModal !== 'function') {
      return Promise.resolve(global.confirm(
        `Claim Threads funds from @${preflight.account} to the venue account?\n\n` +
        `Signing in Keychain as authorized merchant @${preflight.signer}.\n` +
        `Keychain authority: ${preflight.authority}\n` +
        `Fingerprint: ${preflight.fingerprint}\n\n` +
        JSON.stringify(preflight.operations, null, 2),
      ));
    }
    dialog.querySelector('[data-social-summary]').textContent = Object.entries(preflight.summary)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join('\n');
    dialog.querySelector('[data-social-operations]').textContent = JSON.stringify(preflight.operations, null, 2);
    dialog.querySelector('[data-social-account]').textContent = `@${preflight.account}`;
    const signer = dialog.querySelector('[data-social-signer]');
    if (signer) signer.textContent = `@${preflight.signer || preflight.account}`;
    dialog.querySelector('[data-social-authority]').textContent = preflight.authority;
    dialog.querySelector('[data-social-fingerprint]').textContent = preflight.fingerprint;
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
      const escape = (event) => {
        event.preventDefault();
        finish(false);
      };
      confirmButton.addEventListener('click', confirm);
      cancelButton.addEventListener('click', cancel);
      dialog.addEventListener('cancel', escape);
    });
  }

  class ThreadsFundsClaimController {
    constructor({
      fetchImpl = global.fetch ? global.fetch.bind(global) : null,
      keychainFactory = () => new global.HiveBarKeychain.KeychainAdapter(),
      review = reviewDialog,
      waitImpl = wait,
      reload = () => global.location.reload(),
    } = {}) {
      this.fetch = fetchImpl;
      this.keychainFactory = keychainFactory;
      this.review = review;
      this.wait = waitImpl;
      this.reload = reload;
    }

    async request(url, { method = 'GET', csrfToken, body } = {}) {
      const headers = { accept: 'application/json' };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;
      if (body !== undefined) headers['content-type'] = 'application/json';
      return parseResponse(await this.fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      }));
    }

    async run(form) {
      const button = form.querySelector('button[type="submit"]');
      let session;
      let preflight;
      let broadcastAccepted = false;
      if (button) button.disabled = true;

      try {
        session = await this.request('/auth/session');
        if (!session?.authenticated) throw new Error('Sign in as the venue merchant before claiming Threads funds.');
        preflight = await this.request('/api/threads-operator/funds/preflight', {
          method: 'POST',
          csrfToken: session.csrfToken,
          body: {},
        });
        setStatus(form, `Review the one-time claim from @${preflight.account}, signed by @${preflight.signer}.`);

        if (!(await this.review(preflight))) {
          await this.request(`/api/threads-operator/funds/preflight/${preflight.id}/cancel`, {
            method: 'POST',
            csrfToken: session.csrfToken,
          });
          preflight = null;
          setStatus(form, 'Cancelled. No transfer was sent to Hive.');
          return;
        }

        const signer = preflight.signer;
        if (!signer) throw new Error('The merchant signer is unavailable.');
        setStatus(form, `Approve the one-time Active transfer in Hive Keychain as @${signer}.`);
        const result = await this.keychainFactory().broadcast({
          account: signer,
          operations: preflight.operations,
          authority: preflight.authority,
        });
        broadcastAccepted = Boolean(result?.accepted);
        const accepted = await this.request(
          `/api/threads-operator/funds/preflight/${preflight.id}/accepted`,
          {
            method: 'POST',
            csrfToken: session.csrfToken,
            body: { transactionId: result?.transactionId || null },
          },
        );
        setStatus(form, accepted.message);

        for (let attempt = 0; attempt < OBSERVATION_ATTEMPTS; attempt += 1) {
          if (attempt > 0) await this.wait(OBSERVATION_DELAY_MS);
          const observed = await this.request(
            `/api/threads-operator/funds/preflight/${preflight.id}/observe`,
            { method: 'POST', csrfToken: session.csrfToken },
          );
          setStatus(form, observed.message);
          if (observed.state === 'observed') {
            this.reload();
            return;
          }
        }
      } catch (error) {
        if (preflight && !broadcastAccepted && session?.csrfToken) {
          await this.request(`/api/threads-operator/funds/preflight/${preflight.id}/cancel`, {
            method: 'POST',
            csrfToken: session.csrfToken,
          }).catch(() => {});
        }
        const prefix = broadcastAccepted
          ? 'Keychain approved the transfer, but Hive confirmation is still pending. Do not try again yet. '
          : '';
        setStatus(form, `${prefix}${error.message || 'The Threads funds claim failed.'}`, true);
      } finally {
        if (button) button.disabled = false;
      }
    }
  }

  global.HiveVenuesThreadsFunds = Object.freeze({ ThreadsFundsClaimController });
  const controller = new ThreadsFundsClaimController();
  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-threads-funds-claim]');
    if (!form) return;
    event.preventDefault();
    controller.run(form);
  });
})(window);

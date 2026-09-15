'use strict';

(function candidateCHive(global) {
  const root = document.querySelector('[data-hive-integration]');
  if (!root) return;

  const slug = root.dataset.slug;
  const base = `/candidate-c/studio/${encodeURIComponent(slug)}/hive`;
  const status = root.querySelector('[data-hive-status]');
  const connectForm = root.querySelector('[data-hive-connect-form]');
  const disconnectButton = root.querySelector('[data-hive-disconnect]');
  const postForm = root.querySelector('[data-hive-post-form]');
  const review = root.querySelector('[data-hive-review]');
  const broadcastButton = root.querySelector('[data-hive-broadcast]');
  const cancelReviewButton = root.querySelector('[data-hive-cancel-review]');
  const adapter = global.HiveBarKeychain ? new global.HiveBarKeychain.KeychainAdapter() : null;
  let activePreflight = null;
  let broadcasting = false;

  function message(text, tone = '') {
    if (!status) return;
    status.textContent = text;
    status.dataset.tone = tone;
  }

  async function request(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', ...(options.headers || {}) },
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

  function humanError(error) {
    if (error?.code === 'KEYCHAIN_CANCELLED') return 'Keychain was cancelled. Nothing was broadcast.';
    if (error?.code === 'KEYCHAIN_UNAVAILABLE') return 'Hive Keychain is not available in this browser.';
    if (error?.code === 'KEYCHAIN_LOCKED') return 'Unlock Hive Keychain and try again.';
    if (error?.code === 'KEYCHAIN_TIMEOUT') return 'Keychain did not respond in time. Nothing was retried automatically.';
    return error?.message || 'Hive integration could not complete this step.';
  }

  if (connectForm) {
    connectForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!adapter) {
        message('Hive Keychain support did not load in this browser.', 'error');
        return;
      }
      const account = String(new FormData(connectForm).get('account') || '').trim().toLowerCase().replace(/^@/, '');
      if (!account) return;
      const button = connectForm.querySelector('button[type="submit"]');
      button.disabled = true;
      message(`Checking @${account} on Hive…`);
      try {
        const challenge = await request(`${base}/challenge`, {
          method: 'POST',
          body: JSON.stringify({ account }),
        });
        message('Account found. Check Keychain to verify control of it.');
        const signed = await adapter.signBuffer({
          account,
          message: challenge.message,
          title: 'Connect Hive to HiVenues',
        });
        await request(`${base}/verify`, {
          method: 'POST',
          body: JSON.stringify({
            challengeId: challenge.id,
            account,
            publicKey: signed.publicKey,
            signature: signed.signature,
          }),
        });
        message(`Verified @${account}. Reloading the integration…`, 'success');
        global.location.reload();
      } catch (error) {
        message(humanError(error), 'error');
        button.disabled = false;
      }
    });
  }

  if (disconnectButton) {
    disconnectButton.addEventListener('click', async () => {
      disconnectButton.disabled = true;
      try {
        await request(`${base}/disconnect`, { method: 'POST', body: '{}' });
        global.location.reload();
      } catch (error) {
        message(humanError(error), 'error');
        disconnectButton.disabled = false;
      }
    });
  }

  function showPreflight(preflight) {
    activePreflight = preflight;
    review.querySelector('[data-hive-review-account]').textContent = `@${preflight.account}`;
    review.querySelector('[data-hive-review-authority]').textContent = preflight.authority;
    review.querySelector('[data-hive-review-consequence]').textContent = preflight.summary.consequence;
    review.querySelector('[data-hive-review-fingerprint]').textContent = preflight.fingerprint;
    review.hidden = false;
    review.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (postForm) {
    postForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = postForm.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const data = new FormData(postForm);
        const preflight = await request(`${base}/preflight/profile-post`, {
          method: 'POST',
          body: JSON.stringify({ title: data.get('title'), body: data.get('body') }),
        });
        showPreflight(preflight);
        message('Review prepared. Nothing has been broadcast.', 'success');
      } catch (error) {
        message(humanError(error), 'error');
      } finally {
        button.disabled = false;
      }
    });
  }

  if (cancelReviewButton) {
    cancelReviewButton.addEventListener('click', () => {
      activePreflight = null;
      review.hidden = true;
      message('Review cancelled. Nothing was broadcast.');
    });
  }

  async function observeUntilVisible(preflightId) {
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const observed = await request(`${base}/preflight/${encodeURIComponent(preflightId)}/observe`, {
        method: 'POST',
        body: '{}',
      });
      if (observed.observed) return observed;
      message(`Keychain approved the broadcast. Waiting for Hive confirmation (${attempt}/8)…`);
      await new Promise((resolve) => global.setTimeout(resolve, 1500));
    }
    return null;
  }

  if (broadcastButton) {
    broadcastButton.addEventListener('click', async () => {
      if (!activePreflight || broadcasting) return;
      if (!adapter) {
        message('Hive Keychain is not available in this browser.', 'error');
        return;
      }
      broadcasting = true;
      broadcastButton.disabled = true;
      message('Opening Keychain. Review the operation there before approving it.');
      try {
        const wallet = await adapter.broadcast({
          account: activePreflight.account,
          operations: activePreflight.operations,
          authority: activePreflight.authority,
        });
        await request(`${base}/preflight/${encodeURIComponent(activePreflight.id)}/accepted`, {
          method: 'POST',
          body: JSON.stringify({ transactionId: wallet.transactionId || '' }),
        });
        const observed = await observeUntilVisible(activePreflight.id);
        if (observed) {
          message(`Confirmed on Hive${observed.transactionId ? ` · ${observed.transactionId}` : ''}.`, 'success');
          review.querySelector('[data-hive-review-heading]').textContent = 'Confirmed on Hive';
          broadcastButton.hidden = true;
          cancelReviewButton.textContent = 'Close';
        } else {
          message('Keychain approved the broadcast, but HiVenues has not observed the post on-chain yet. Do not submit it again.', 'warning');
        }
      } catch (error) {
        message(humanError(error), 'error');
        broadcastButton.disabled = false;
      } finally {
        broadcasting = false;
      }
    });
  }
})(window);

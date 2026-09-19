'use strict';

(function attachHiVenuesIdentity(global) {
  const ROOT_SELECTOR = '[data-hivenues-identity]';
  const CREATION_INTENT_KEY = 'hivenues:hive-account-creation:v1';
  const CREATION_INTENT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

  function normalizedAccount(value) {
    return String(value || '').trim().toLowerCase().replace(/^@+/, '');
  }

  function errorState(error) {
    const code = String(error?.code || '');
    if (code === 'KEYCHAIN_CANCELLED') {
      return {
        state: 'cancelled',
        message: 'Identity proof was cancelled. No Hive transaction or participation action occurred.',
      };
    }
    if (['KEYCHAIN_UNAVAILABLE', 'KEYCHAIN_LOCKED', 'KEYCHAIN_TIMEOUT', 'IDENTITY_PROVIDER_UNAVAILABLE', 'HIVE_RPC_UNAVAILABLE'].includes(code)) {
      return {
        state: 'provider-unavailable',
        message: error?.message || 'Identity proof is temporarily unavailable. Public browsing still works.',
      };
    }
    if (code === 'AUTH_CHALLENGE_EXPIRED') {
      return {
        state: 'expired',
        message: 'That identity challenge expired before it could be verified. Start again for a fresh proof.',
      };
    }
    if (code === 'IDENTITY_RATE_LIMITED') {
      return {
        state: 'rate-limited',
        message: 'Too many identity attempts were made in a short period. Public browsing still works; try again shortly.',
      };
    }
    if (
      code.startsWith('AUTH_')
      || code === 'AUTHORITY_MISMATCH'
      || code === 'KEYCHAIN_ACCOUNT_MISMATCH'
      || code === 'KEYCHAIN_MESSAGE_MISMATCH'
      || code === 'KEYCHAIN_INVALID_RESPONSE'
    ) {
      return {
        state: 'invalid',
        message: error?.message || 'That proof did not verify for the selected Hive account. No Hive transaction occurred.',
      };
    }
    return {
      state: 'failed',
      message: error?.message || 'Identity proof could not be completed. No Hive transaction occurred.',
    };
  }

  async function jsonRequest(fetchImpl, url, options = {}) {
    const response = await fetchImpl(url, {
      ...options,
      headers: {
        accept: 'application/json',
        ...(options.headers || {}),
      },
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.error?.message || 'The request could not be completed.');
      error.code = payload?.error?.code || 'REQUEST_FAILED';
      throw error;
    }
    return payload;
  }

  function setState(root, state, message) {
    root.dataset.identityState = state;
    const status = root.querySelector('[data-identity-status]');
    if (status) status.textContent = message || '';
  }

  function controls(root) {
    return {
      form: root.querySelector('[data-identity-form]'),
      input: root.querySelector('[data-identity-account]'),
      submit: root.querySelector('[data-identity-submit]'),
      review: root.querySelector('[data-identity-account-review]'),
      reviewAccount: root.querySelector('[data-identity-review-account]'),
      reviewName: root.querySelector('[data-identity-review-name]'),
      reviewAvatarSlot: root.querySelector('[data-identity-review-avatar-slot]'),
      verify: root.querySelector('[data-identity-verify]'),
      createAccount: root.querySelector('[data-identity-create-account]'),
      creationResume: root.querySelector('[data-identity-creation-resume]'),
      creationPending: root.querySelector('[data-identity-creation-pending]'),
      createdAccountReady: root.querySelector('[data-identity-created-account-ready]'),
      disconnect: root.querySelector('[data-identity-disconnect]'),
      reprove: root.querySelector('[data-identity-reprove]'),
    };
  }

  function readCreationIntent(storage, {
    pathname = global.location?.pathname || '',
    now = Date.now,
  } = {}) {
    if (!storage) return null;
    try {
      const raw = storage.getItem(CREATION_INTENT_KEY);
      if (!raw) return null;
      const intent = JSON.parse(raw);
      const startedAtMs = Date.parse(intent?.startedAt || '');
      const valid = intent?.version === 1
        && typeof intent?.returnPath === 'string'
        && intent.returnPath === pathname
        && Number.isFinite(startedAtMs)
        && now() - startedAtMs >= 0
        && now() - startedAtMs <= CREATION_INTENT_MAX_AGE_MS;
      if (!valid) {
        storage.removeItem(CREATION_INTENT_KEY);
        return null;
      }
      return intent;
    } catch (_) {
      return null;
    }
  }

  function writeCreationIntent(storage, {
    pathname = global.location?.pathname || '',
    now = Date.now,
  } = {}) {
    const intent = Object.freeze({
      version: 1,
      returnPath: pathname,
      startedAt: new Date(now()).toISOString(),
    });
    try {
      storage?.setItem(CREATION_INTENT_KEY, JSON.stringify(intent));
    } catch (_) {}
    return intent;
  }

  function clearCreationIntent(storage) {
    try {
      storage?.removeItem(CREATION_INTENT_KEY);
    } catch (_) {}
  }

  function showCreationResume(root) {
    const { creationResume } = controls(root);
    root.dataset.identityCreationIntent = 'pending';
    if (creationResume) creationResume.hidden = false;
  }

  function hideCreationResume(root) {
    const { creationResume } = controls(root);
    root.dataset.identityCreationIntent = '';
    if (creationResume) creationResume.hidden = true;
  }

  function resetAccountReview(root) {
    const { review, reviewAccount, reviewName, reviewAvatarSlot } = controls(root);
    root.dataset.identityReviewedAccount = '';
    if (review) review.hidden = true;
    if (reviewAccount) reviewAccount.textContent = '';
    if (reviewName) reviewName.textContent = '';
    if (reviewAvatarSlot) {
      reviewAvatarSlot.hidden = true;
      reviewAvatarSlot.replaceChildren();
    }
  }

  function renderAccountReview(root, preview) {
    const { review, reviewAccount, reviewName, reviewAvatarSlot } = controls(root);
    root.dataset.identityReviewedAccount = normalizedAccount(preview?.account);
    if (reviewAccount) reviewAccount.textContent = root.dataset.identityReviewedAccount;
    if (reviewName) reviewName.textContent = String(preview?.displayName || preview?.account || '');
    if (reviewAvatarSlot && preview?.profileImage) {
      const image = root.ownerDocument.createElement('img');
      image.setAttribute('data-identity-review-avatar', '');
      image.alt = '';
      image.src = String(preview.profileImage);
      reviewAvatarSlot.replaceChildren(image);
      reviewAvatarSlot.hidden = false;
    }
    if (review) review.hidden = false;
  }

  function setBusy(root, busy) {
    const { input, submit, verify, disconnect } = controls(root);
    if (input) input.disabled = busy;
    if (submit) submit.disabled = busy || !normalizedAccount(input?.value);
    if (verify) verify.disabled = busy;
    if (disconnect) disconnect.disabled = busy;
    root.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function armUnverifiedForm(root) {
    const { input, submit } = controls(root);
    if (!input || !submit) return;
    submit.disabled = !normalizedAccount(input.value);
    input.addEventListener('input', () => {
      submit.disabled = !normalizedAccount(input.value);
      if (root.dataset.identityReviewedAccount) {
        resetAccountReview(root);
        setState(root, 'not-identified', '');
      }
    });
  }

  function watchExpiry(root, { now = Date.now, setTimeoutImpl = global.setTimeout.bind(global) } = {}) {
    if (root.dataset.identityState !== 'verified') return null;
    const expiresAtMs = Date.parse(root.dataset.identityExpiresAt || '');
    if (!Number.isFinite(expiresAtMs)) return null;

    const expire = () => {
      setState(
        root,
        'expired',
        'This verified HiVenues identity session has expired. Prove your identity again before participating.',
      );
      const { disconnect, reprove } = controls(root);
      if (disconnect) disconnect.hidden = true;
      if (reprove) reprove.hidden = false;
    };

    const remaining = expiresAtMs - now();
    if (remaining <= 0) {
      expire();
      return null;
    }
    return setTimeoutImpl(expire, remaining);
  }

  function initializeIdentityRoot(root, {
    fetchImpl = global.fetch.bind(global),
    KeychainAdapter = global.HiVenuesKeychain?.KeychainAdapter,
    reload = () => global.location.reload(),
    now = Date.now,
    setTimeoutImpl = global.setTimeout.bind(global),
    sessionStorageImpl = global.sessionStorage,
  } = {}) {
    if (!root || root.dataset.identityBound === 'true') return root;
    root.dataset.identityBound = 'true';

    const {
      form,
      verify,
      createAccount,
      createdAccountReady,
      disconnect,
      reprove,
    } = controls(root);
    armUnverifiedForm(root);
    watchExpiry(root, { now, setTimeoutImpl });

    if (readCreationIntent(sessionStorageImpl, { now })) {
      showCreationResume(root);
    }

    if (createAccount) {
      createAccount.addEventListener('click', () => {
        writeCreationIntent(sessionStorageImpl, { now });
        showCreationResume(root);
      });
    }

    if (createdAccountReady) {
      createdAccountReady.addEventListener('click', () => {
        clearCreationIntent(sessionStorageImpl);
        hideCreationResume(root);
        resetAccountReview(root);
        setState(root, 'not-identified', '');
        const { input } = controls(root);
        if (input) input.focus();
      });
    }

    if (reprove) {
      reprove.addEventListener('click', () => reload());
    }

    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const account = normalizedAccount(controls(root).input?.value);
        if (!account) {
          setState(root, 'invalid', 'Enter the Hive account you want to review.');
          return;
        }

        resetAccountReview(root);
        setBusy(root, true);
        setState(root, 'reviewing', `Reading public Hive account @${account}.`);

        try {
          const preview = await jsonRequest(
            fetchImpl,
            '/identity/account/' + encodeURIComponent(account),
          );
          if (normalizedAccount(preview?.account) !== account) {
            const mismatch = new Error('The public Hive account response did not match the selected account.');
            mismatch.code = 'AUTH_ACCOUNT_MISMATCH';
            throw mismatch;
          }
          renderAccountReview(root, preview);
          setState(root, 'reviewed', '');
          setBusy(root, false);
        } catch (error) {
          const mapped = errorState(error);
          setState(root, mapped.state, mapped.message);
          setBusy(root, false);
        }
      });
    }

    if (verify) {
      verify.addEventListener('click', async () => {
        const account = normalizedAccount(controls(root).input?.value);
        const reviewedAccount = normalizedAccount(root.dataset.identityReviewedAccount);
        if (!account || account !== reviewedAccount) {
          resetAccountReview(root);
          setState(root, 'invalid', 'Review the selected Hive account again before wallet verification.');
          return;
        }

        setBusy(root, true);
        setState(root, 'claimed', `Preparing identity proof for @${account}.`);

        try {
          const challenge = await jsonRequest(fetchImpl, '/identity/challenge', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ account }),
          });

          if (typeof KeychainAdapter !== 'function') {
            const unavailable = new Error('A compatible human-owned Hive wallet was not found in this browser.');
            unavailable.code = 'KEYCHAIN_UNAVAILABLE';
            throw unavailable;
          }

          setState(
            root,
            'awaiting-wallet',
            `Approve the identity message for @${account} in your wallet. This does not broadcast a Hive transaction.`,
          );
          const adapter = new KeychainAdapter();
          const signed = await adapter.signBuffer({
            account,
            message: challenge.message,
            title: `HiVenues identity proof for @${account}`,
          });

          await jsonRequest(fetchImpl, '/identity/verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              account,
              challengeId: challenge.id,
              publicKey: signed.publicKey,
              signature: signed.signature,
            }),
          });

          setState(root, 'verified', `Identity verified as @${account}. Reloading this host view…`);
          reload();
        } catch (error) {
          const mapped = errorState(error);
          setState(root, mapped.state, mapped.message);
          setBusy(root, false);
        }
      });
    }

    if (disconnect) {
      disconnect.addEventListener('click', async () => {
        setBusy(root, true);
        setState(root, 'disconnecting', 'Ending this HiVenues identity session…');
        try {
          const session = await jsonRequest(fetchImpl, '/identity/session');
          if (!session?.authenticated || !session.csrfToken) {
            setState(root, 'expired', 'This identity session has already ended.');
            controls(root).reprove && (controls(root).reprove.hidden = false);
            return;
          }
          await jsonRequest(fetchImpl, '/identity/disconnect', {
            method: 'POST',
            headers: { 'x-csrf-token': session.csrfToken },
          });
          setState(root, 'disconnected', 'Identity disconnected. No Hive transaction or participation action occurred.');
          reload();
        } catch (error) {
          const mapped = errorState(error);
          setState(root, mapped.state, mapped.message);
          setBusy(root, false);
        }
      });
    }

    return root;
  }

  function initializeAll(options = {}) {
    return Array.from(global.document.querySelectorAll(ROOT_SELECTOR))
      .map((root) => initializeIdentityRoot(root, options));
  }

  const api = Object.freeze({
    ROOT_SELECTOR,
    CREATION_INTENT_KEY,
    clearCreationIntent,
    errorState,
    initializeAll,
    initializeIdentityRoot,
    normalizedAccount,
    readCreationIntent,
    renderAccountReview,
    resetAccountReview,
    setState,
    writeCreationIntent,
    watchExpiry,
  });
  global.HiVenuesIdentity = api;

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', () => initializeAll(), { once: true });
  } else {
    initializeAll();
  }
})(window);

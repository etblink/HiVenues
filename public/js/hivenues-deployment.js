'use strict';

(function deploymentPublicKeyCopy(global) {
  async function copyPublicKey(button) {
    const root = button.closest('[data-deployment-authority-public]');
    const source = root?.querySelector('[data-deployment-public-key]');
    const status = root?.querySelector('[data-copy-deployment-public-key-status]');
    const value = String(source?.value || '').trim();
    if (!value) return false;

    let copied = false;
    try {
      if (global.navigator?.clipboard?.writeText) {
        await global.navigator.clipboard.writeText(value);
        copied = true;
      } else if (source?.select && global.document?.execCommand) {
        source.select();
        copied = Boolean(global.document.execCommand('copy'));
        source.setSelectionRange?.(0, 0);
        source.blur?.();
      }
    } catch {
      copied = false;
    }

    if (status) {
      status.dataset.copyState = copied ? 'copied' : 'unavailable';
      status.textContent = copied
        ? 'Public key copied.'
        : 'Copy is unavailable here; select the public key manually.';
    }
    return copied;
  }

  function initialize(root = global.document) {
    for (const button of root.querySelectorAll?.('[data-copy-deployment-public-key]') || []) {
      button.addEventListener('click', () => {
        copyPublicKey(button);
      });
    }
  }

  const api = Object.freeze({ copyPublicKey, initialize });
  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', () => initialize());
    } else {
      initialize();
    }
  }
  global.HiVenuesDeployment = api;
})(typeof window !== 'undefined' ? window : globalThis);

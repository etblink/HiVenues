'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const client = fs.readFileSync(path.join(ROOT, 'public/js/hivenues-identity.js'), 'utf8');

function response(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
  };
}

function unverifiedMarkup() {
  return '<!doctype html><body>'
    + '<section data-hivenues-identity data-identity-state="not-identified">'
    + '<form data-identity-form>'
    + '<input data-identity-account>'
    + '<button type="submit" data-identity-submit disabled>Prove identity</button>'
    + '<p data-identity-status role="status"></p>'
    + '</form>'
    + '</section>'
    + '</body>';
}

function verifiedMarkup(expiresAt = '2026-09-18T08:00:00.000Z') {
  return '<!doctype html><body>'
    + '<section data-hivenues-identity data-identity-state="verified" data-identity-expires-at="' + expiresAt + '">'
    + '<p data-identity-status role="status">Verified.</p>'
    + '<button type="button" data-identity-disconnect>Disconnect</button>'
    + '<button type="button" data-identity-reprove hidden>Prove again</button>'
    + '</section>'
    + '</body>';
}

function createDom(markup) {
  const dom = new JSDOM(markup, {
    runScripts: 'outside-only',
    url: 'http://hivenues.test/candidate-c/northline-hall/community/updates',
  });
  dom.window.fetch = async () => { throw new Error('unexpected fetch'); };
  dom.window.eval(client);
  return dom;
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

test('identity controller signs only the server challenge and reloads after server verification', async () => {
  const dom = createDom(unverifiedMarkup());
  const root = dom.window.document.querySelector('[data-hivenues-identity]');
  const calls = [];
  const signed = [];
  let reloads = 0;

  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', body: options.body || '' });
    if (url === '/identity/challenge') {
      return response({
        id: 'challenge-1',
        account: 'etblink',
        message: 'HiVenues identity proof | Account: @etblink | Nonce: one',
      }, { status: 201 });
    }
    if (url === '/identity/verify') {
      return response({ authenticated: true, account: 'etblink' }, { status: 201 });
    }
    throw new Error('unexpected URL ' + url);
  };

  class FakeKeychain {
    async signBuffer(args) {
      signed.push(args);
      return { publicKey: 'STM_DIRECT_POSTING_KEY', signature: 'SIG_TEST' };
    }
  }

  dom.window.HiVenuesIdentity.initializeIdentityRoot(root, {
    fetchImpl,
    KeychainAdapter: FakeKeychain,
    reload: () => { reloads += 1; },
  });

  const input = root.querySelector('[data-identity-account]');
  input.value = '@EtBlink';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(root.querySelector('[data-identity-submit]').disabled, false);

  root.querySelector('form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true }),
  );
  await settle();

  assert.deepEqual(signed, [{
    account: 'etblink',
    message: 'HiVenues identity proof | Account: @etblink | Nonce: one',
    title: 'HiVenues identity proof for @etblink',
  }]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, '/identity/challenge');
  assert.deepEqual(JSON.parse(calls[0].body), { account: 'etblink' });
  assert.equal(calls[1].url, '/identity/verify');
  assert.deepEqual(JSON.parse(calls[1].body), {
    account: 'etblink',
    challengeId: 'challenge-1',
    publicKey: 'STM_DIRECT_POSTING_KEY',
    signature: 'SIG_TEST',
  });
  assert.equal(reloads, 1);
  assert.equal(root.dataset.identityState, 'verified');
  assert.doesNotMatch(calls.map((call) => call.url).join(' '), /broadcast|follow|vote|post|reply|payment/i);
  dom.window.close();
});

test('wallet cancellation becomes an explicit non-consequence state and never reaches verify', async () => {
  const dom = createDom(unverifiedMarkup());
  const root = dom.window.document.querySelector('[data-hivenues-identity]');
  const calls = [];

  class CancelledKeychain {
    async signBuffer() {
      const error = new Error('cancelled');
      error.code = 'KEYCHAIN_CANCELLED';
      throw error;
    }
  }

  dom.window.HiVenuesIdentity.initializeIdentityRoot(root, {
    fetchImpl: async (url) => {
      calls.push(url);
      assert.equal(url, '/identity/challenge');
      return response({ id: 'challenge-2', message: 'proof' }, { status: 201 });
    },
    KeychainAdapter: CancelledKeychain,
    reload: () => assert.fail('cancelled proof must not reload'),
  });

  const input = root.querySelector('[data-identity-account]');
  input.value = 'etblink';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  root.querySelector('form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true }),
  );
  await settle();

  assert.deepEqual(calls, ['/identity/challenge']);
  assert.equal(root.dataset.identityState, 'cancelled');
  assert.match(root.querySelector('[data-identity-status]').textContent, /No Hive transaction or participation action occurred/);
  assert.equal(root.getAttribute('aria-busy'), 'false');
  dom.window.close();
});

test('missing wallet is explicit after challenge issuance and preserves public browsing state', async () => {
  const dom = createDom(unverifiedMarkup());
  const root = dom.window.document.querySelector('[data-hivenues-identity]');

  dom.window.HiVenuesIdentity.initializeIdentityRoot(root, {
    fetchImpl: async () => response({ id: 'challenge-3', message: 'proof' }, { status: 201 }),
    KeychainAdapter: null,
    reload: () => assert.fail('unavailable wallet must not reload'),
  });

  const input = root.querySelector('[data-identity-account]');
  input.value = 'etblink';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  root.querySelector('form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true }),
  );
  await settle();

  assert.equal(root.dataset.identityState, 'provider-unavailable');
  assert.match(root.querySelector('[data-identity-status]').textContent, /human-owned Hive wallet was not found/);
  dom.window.close();
});

test('verified-session disconnect reads CSRF from server, ends only the session, then reloads', async () => {
  const dom = createDom(verifiedMarkup());
  const root = dom.window.document.querySelector('[data-hivenues-identity]');
  const calls = [];
  let reloads = 0;

  dom.window.HiVenuesIdentity.initializeIdentityRoot(root, {
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, method: options.method || 'GET', headers: options.headers || {} });
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      }
      if (url === '/identity/disconnect') return response(null, { status: 204 });
      throw new Error('unexpected URL ' + url);
    },
    reload: () => { reloads += 1; },
    now: () => Date.parse('2026-09-18T01:00:00.000Z'),
    setTimeoutImpl: () => 1,
  });

  root.querySelector('[data-identity-disconnect]').click();
  await settle();

  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, '/identity/disconnect');
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].headers['x-csrf-token'], 'csrf-1');
  assert.equal(reloads, 1);
  assert.equal(root.dataset.identityState, 'disconnected');
  dom.window.close();
});

test('expired verified session is represented locally without creating any external action', () => {
  const dom = createDom(verifiedMarkup('2026-09-18T00:00:00.000Z'));
  const root = dom.window.document.querySelector('[data-hivenues-identity]');

  dom.window.HiVenuesIdentity.initializeIdentityRoot(root, {
    now: () => Date.parse('2026-09-18T01:00:00.000Z'),
    setTimeoutImpl: () => assert.fail('already expired session must not arm a timer'),
  });

  assert.equal(root.dataset.identityState, 'expired');
  assert.match(root.querySelector('[data-identity-status]').textContent, /expired/);
  assert.equal(root.querySelector('[data-identity-disconnect]').hidden, true);
  assert.equal(root.querySelector('[data-identity-reprove]').hidden, false);
  dom.window.close();
});

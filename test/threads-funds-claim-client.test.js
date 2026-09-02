'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'threads-funds-claim.js'),
  'utf8',
);

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function loadController() {
  const listeners = [];
  const window = {
    fetch: null,
    setTimeout: (callback) => { callback(); return 1; },
    location: { reload() {} },
    confirm: () => true,
  };
  const document = {
    addEventListener(type, listener) { listeners.push([type, listener]); },
    querySelector() { return null; },
  };
  const context = vm.createContext({ window, document, console, Promise, JSON, Error });
  vm.runInContext(source, context, { filename: 'threads-funds-claim.js' });
  return { Controller: window.HiveVenuesThreadsFunds.ThreadsFundsClaimController, listeners };
}

function fakeForm() {
  const state = { message: '', disabled: false };
  const status = {
    set textContent(value) { state.message = value; },
    get textContent() { return state.message; },
    classList: { toggle() {} },
  };
  const button = {
    set disabled(value) { state.disabled = value; },
    get disabled() { return state.disabled; },
  };
  return {
    state,
    querySelector(selector) {
      if (selector === 'button[type="submit"]') return button;
      if (selector === '[data-threads-funds-status]') return status;
      return null;
    },
  };
}

test('manual Claim funds broadcasts as merchant signer while operations remain from Threads account', async () => {
  const { Controller } = loadController();
  const form = fakeForm();
  const calls = [];
  let broadcast;
  let reloads = 0;
  const preflight = {
    id: 'threads-claim-1',
    account: 'fourthst.threads',
    signer: 'fourthstreetbar',
    action: 'threads-funds-claim',
    authority: 'Active',
    operations: [[
      'transfer',
      {
        from: 'fourthst.threads',
        to: 'fourthstreetbar',
        amount: '1.000 HIVE',
        memo: 'Hive-Venues manual Threads funds claim',
      },
    ]],
    fingerprint: 'f'.repeat(64),
    summary: { kind: 'Manual Threads funds claim' },
  };
  const controller = new Controller({
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      if (url === '/auth/session') {
        return response({ authenticated: true, account: 'fourthstreetbar', csrfToken: 'csrf-1' });
      }
      if (url === '/api/threads-operator/funds/preflight') return response(preflight, 201);
      if (url.endsWith('/accepted')) {
        return response({ ...preflight, state: 'broadcast_accepted', message: 'Awaiting exact observation.' });
      }
      if (url.endsWith('/observe')) {
        return response({ ...preflight, state: 'observed', message: 'Threads funds were claimed to the venue account.' });
      }
      throw new Error(`Unexpected URL ${url}`);
    },
    review: async () => true,
    keychainFactory: () => ({
      async broadcast(value) {
        broadcast = value;
        return { accepted: true, transactionId: 'a'.repeat(40) };
      },
    }),
    waitImpl: async () => {},
    reload: () => { reloads += 1; },
  });

  await controller.run(form);

  assert.deepEqual(JSON.parse(JSON.stringify(broadcast)), {
    account: 'fourthstreetbar',
    operations: preflight.operations,
    authority: 'Active',
  });
  assert.equal(preflight.operations[0][1].from, 'fourthst.threads');
  assert.equal(reloads, 1);
  assert.equal(form.state.disabled, false);
  assert.match(form.state.message, /claimed to the venue account/);
  const accepted = calls.find(([url]) => url.endsWith('/accepted'));
  assert.deepEqual(JSON.parse(accepted[1].body), { transactionId: 'a'.repeat(40) });
});

test('manual Claim funds cancellation never opens Keychain and cancels prepared state', async () => {
  const { Controller } = loadController();
  const form = fakeForm();
  const urls = [];
  let broadcasts = 0;
  const preflight = {
    id: 'threads-claim-2',
    account: 'fourthst.threads',
    signer: 'fourthstreetbar',
    authority: 'Active',
    operations: [['transfer', {
      from: 'fourthst.threads', to: 'fourthstreetbar', amount: '1.000 HBD', memo: 'claim',
    }]],
    fingerprint: 'e'.repeat(64),
    summary: { kind: 'Manual Threads funds claim' },
  };
  const controller = new Controller({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/auth/session') {
        return response({ authenticated: true, account: 'fourthstreetbar', csrfToken: 'csrf-1' });
      }
      if (url === '/api/threads-operator/funds/preflight') return response(preflight, 201);
      if (url.endsWith('/cancel')) return response(null, 204);
      throw new Error(`Unexpected URL ${url}`);
    },
    review: async () => false,
    keychainFactory: () => ({ async broadcast() { broadcasts += 1; } }),
  });

  await controller.run(form);
  assert.equal(broadcasts, 0);
  assert.equal(urls.at(-1), '/api/threads-operator/funds/preflight/threads-claim-2/cancel');
  assert.match(form.state.message, /No transfer was sent to Hive/);
});

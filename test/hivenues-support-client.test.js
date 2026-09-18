'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'hivenues-support.js'),
  'utf8',
);

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
  };
}

function markup() {
  return '<!doctype html><body>'
    + '<section data-hivenues-support'
    + ' data-support-url="/participation/northline-hall/support"'
    + ' data-support-actor="paper-sparrow"'
    + ' data-support-recipient="northline-pay"'
    + ' data-support-state="ready">'
    + '<form data-support-form>'
    + '<input data-support-amount value="1.250">'
    + '<select data-support-asset><option value="HIVE" selected>HIVE</option><option value="HBD">HBD</option></select>'
    + '<button data-support-submit type="submit">Support the room</button>'
    + '<p data-support-status></p>'
    + '</form>'
    + '</section>'
    + '</body>';
}

function createDom() {
  const dom = new JSDOM(markup(), {
    runScripts: 'outside-only',
    url: 'http://hivenues.test/candidate-c/northline-hall/support',
  });
  dom.window.eval(source);
  return dom;
}

function preflight() {
  return Object.freeze({
    id: 'support-preflight-1',
    account: 'paper-sparrow',
    signer: 'paper-sparrow',
    action: 'support-host',
    authority: 'Active',
    operations: [[
      'transfer',
      {
        from: 'paper-sparrow',
        to: 'northline-pay',
        amount: '1.250 HIVE',
        memo: 'hivenues-support:v1',
      },
    ]],
    fingerprint: 'f'.repeat(64),
    summary: {
      kind: 'Direct host support',
      sender: 'paper-sparrow',
      recipient: 'northline-pay',
      amount: '1.250 HIVE',
      asset: 'HIVE',
      availableBalance: '12.345 HIVE',
      memo: 'hivenues-support:v1',
      consequence: '@paper-sparrow will send 1.250 HIVE directly to @northline-pay as support for Northline Hall.',
      irreversible: 'HiVenues cannot reverse a confirmed Hive transfer.',
      purchaseTruth: 'This is direct support, not proof of a purchase, order, donation deduction, or fulfillment.',
    },
    state: 'prepared',
  });
}

test('support controller reviews exact consequence, uses Active wallet and waits for canonical observation', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-support]');
  const broadcasts = [];
  const calls = [];
  let observations = 0;
  let reloads = 0;

  class FakeKeychain {
    async broadcast(args) {
      broadcasts.push(args);
      return { accepted: true, transactionId: 'b'.repeat(40) };
    }
  }

  const controller = new dom.window.HiVenuesSupport.SupportController({
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.supportUrl) return response(preflight(), 201);
      if (url.endsWith('/accepted')) {
        return response({ ...preflight(), state: 'broadcast_accepted', message: 'Pending.' });
      }
      if (url.endsWith('/observe')) {
        observations += 1;
        return response({
          ...preflight(),
          state: observations === 2 ? 'observed' : 'broadcast_accepted',
          message: observations === 2 ? 'Confirmed on Hive.' : 'Pending.',
        });
      }
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: FakeKeychain,
    review: async (_root, value) => {
      assert.equal(value.action, 'support-host');
      assert.equal(value.authority, 'Active');
      assert.equal(value.summary.sender, 'paper-sparrow');
      assert.equal(value.summary.recipient, 'northline-pay');
      assert.equal(value.summary.amount, '1.250 HIVE');
      assert.equal(value.summary.availableBalance, '12.345 HIVE');
      assert.match(value.summary.purchaseTruth, /not proof of a purchase/i);
      return true;
    },
    waitImpl: async () => {},
    reload: () => { reloads += 1; },
  });

  try {
    await controller.run(root);

    assert.deepEqual(
      JSON.parse(JSON.stringify(broadcasts)),
      [{
        account: 'paper-sparrow',
        operations: preflight().operations,
        authority: 'Active',
      }],
    );
    assert.equal(observations, 2);
    assert.equal(reloads, 0);
    assert.equal(root.dataset.supportState, 'confirmed');
    assert.equal(root.querySelector('[data-support-submit]').disabled, true);
    assert.match(
      root.querySelector('[data-support-status]').textContent,
      /Confirmed on Hive\. 1\.250 HIVE was sent to @northline-pay\./,
    );

    const prepared = calls.find((call) => call.url === root.dataset.supportUrl);
    assert.equal(prepared.options.headers['x-csrf-token'], 'csrf-1');
    assert.deepEqual(JSON.parse(prepared.options.body), {
      amount: '1.250',
      asset: 'HIVE',
    });
  } finally {
    dom.window.close();
  }
});

test('support review cancellation deletes prepared transfer before wallet approval', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-support]');
  const urls = [];
  let broadcasts = 0;

  class FakeKeychain {
    async broadcast() {
      broadcasts += 1;
      return { accepted: true };
    }
  }

  const controller = new dom.window.HiVenuesSupport.SupportController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.supportUrl) return response(preflight(), 201);
      if (url.endsWith('/cancel')) return response(null, 204);
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: FakeKeychain,
    review: async () => false,
  });

  try {
    await controller.run(root);
    assert.equal(broadcasts, 0);
    assert.deepEqual(urls, [
      '/identity/session',
      root.dataset.supportUrl,
      '/participation/preflight/support-preflight-1/cancel',
    ]);
    assert.equal(root.dataset.supportState, 'cancelled');
  } finally {
    dom.window.close();
  }
});

test('wallet acceptance without exact support transaction observation becomes uncertain and locks repeat', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-support]');
  let observations = 0;

  class FakeKeychain {
    async broadcast() {
      return { accepted: true, transactionId: null };
    }
  }

  const controller = new dom.window.HiVenuesSupport.SupportController({
    fetchImpl: async (url) => {
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.supportUrl) return response(preflight(), 201);
      if (url.endsWith('/accepted')) {
        return response({ ...preflight(), state: 'broadcast_accepted', message: 'Pending.' });
      }
      if (url.endsWith('/observe')) {
        observations += 1;
        return response({ ...preflight(), state: 'broadcast_accepted', message: 'Still pending.' });
      }
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: FakeKeychain,
    review: async () => true,
    waitImpl: async () => {},
    observationAttempts: 3,
  });

  try {
    await controller.run(root);
    assert.equal(observations, 3);
    assert.equal(root.dataset.supportState, 'uncertain');
    assert.equal(root.querySelector('[data-support-submit]').disabled, true);
    assert.match(root.querySelector('[data-support-status]').textContent, /Do not repeat it yet/i);
  } finally {
    dom.window.close();
  }
});

test('recipient drift cancels prepared transfer before wallet approval', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-support]');
  const urls = [];
  let reviews = 0;

  const changed = {
    ...preflight(),
    summary: {
      ...preflight().summary,
      recipient: 'other-pay',
    },
  };

  const controller = new dom.window.HiVenuesSupport.SupportController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.supportUrl) return response(changed, 201);
      if (url.endsWith('/cancel')) return response(null, 204);
      throw new Error('Unexpected URL ' + url);
    },
    review: async () => { reviews += 1; return true; },
  });

  try {
    await controller.run(root);
    assert.equal(reviews, 0);
    assert.equal(urls.at(-1), '/participation/preflight/support-preflight-1/cancel');
    assert.equal(root.dataset.supportState, 'failed');
    assert.match(root.querySelector('[data-support-status]').textContent, /recipient changed/i);
  } finally {
    dom.window.close();
  }
});

test('missing wallet cancels prepared transfer and identity mismatch stops before preflight', async () => {
  {
    const dom = createDom();
    const root = dom.window.document.querySelector('[data-hivenues-support]');
    const urls = [];
    const controller = new dom.window.HiVenuesSupport.SupportController({
      fetchImpl: async (url) => {
        urls.push(url);
        if (url === '/identity/session') {
          return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
        }
        if (url === root.dataset.supportUrl) return response(preflight(), 201);
        if (url.endsWith('/cancel')) return response(null, 204);
        throw new Error('Unexpected URL ' + url);
      },
      KeychainAdapter: null,
      review: async () => true,
    });

    try {
      await controller.run(root);
      assert.equal(urls.at(-1), '/participation/preflight/support-preflight-1/cancel');
      assert.equal(root.dataset.supportState, 'provider-unavailable');
    } finally {
      dom.window.close();
    }
  }

  {
    const dom = createDom();
    const root = dom.window.document.querySelector('[data-hivenues-support]');
    const urls = [];
    const controller = new dom.window.HiVenuesSupport.SupportController({
      fetchImpl: async (url) => {
        urls.push(url);
        if (url === '/identity/session') {
          return response({ authenticated: true, account: 'someone-else', csrfToken: 'csrf-1' });
        }
        throw new Error('Support preflight must not be reached');
      },
      review: async () => assert.fail('identity mismatch must not reach review'),
    });

    try {
      await controller.run(root);
      assert.deepEqual(urls, ['/identity/session']);
      assert.equal(root.dataset.supportState, 'identity-required');
    } finally {
      dom.window.close();
    }
  }
});

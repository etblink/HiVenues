'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'hivenues-participation.js'),
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
    + '<div data-hivenues-participation'
    + ' data-participation-url="/participation/northline-hall/people/juniper-lane/follow"'
    + ' data-participation-action="follow"'
    + ' data-participation-actor="etblink"'
    + ' data-participation-target="juniper-lane"'
    + ' data-participation-state="ready">'
    + '<button type="button" data-participation-submit>Follow on Hive</button>'
    + '<p data-participation-status></p>'
    + '</div>'
    + '</body>';
}

function createDom() {
  const dom = new JSDOM(markup(), {
    runScripts: 'outside-only',
    url: 'http://hivenues.test/candidate-c/northline-hall/community/people/juniper-lane',
  });
  dom.window.eval(source);
  return dom;
}

const operation = [
  'custom_json',
  {
    required_auths: [],
    required_posting_auths: ['etblink'],
    id: 'follow',
    json: '["follow",{"follower":"etblink","following":"juniper-lane","what":["blog"]}]',
  },
];

const preflight = Object.freeze({
  id: 'preflight-1',
  account: 'etblink',
  signer: 'etblink',
  action: 'follow',
  authority: 'Posting',
  operations: [operation],
  fingerprint: 'f'.repeat(64),
  summary: {
    following: 'juniper-lane',
    consequence: '@etblink will follow @juniper-lane on Hive.',
  },
  state: 'prepared',
});

test('relationship controller reviews, broadcasts through the human wallet, then waits for canonical observation', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-participation]');
  const calls = [];
  const broadcasts = [];
  let observations = 0;
  let reloads = 0;

  class FakeKeychain {
    async broadcast(args) {
      broadcasts.push(args);
      return { accepted: true, transactionId: 'a'.repeat(40) };
    }
  }

  const controller = new dom.window.HiVenuesParticipation.ParticipationController({
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.participationUrl) return response(preflight, 201);
      if (url.endsWith('/accepted')) {
        return response({
          ...preflight,
          state: 'broadcast_accepted',
          message: 'Your wallet accepted this action. HiVenues is still waiting for canonical Hive confirmation.',
        });
      }
      if (url.endsWith('/observe')) {
        observations += 1;
        return response({
          ...preflight,
          state: observations === 2 ? 'observed' : 'broadcast_accepted',
          message: observations === 2
            ? 'Confirmed on Hive.'
            : 'Your wallet accepted this action. HiVenues is still waiting for canonical Hive confirmation.',
        });
      }
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: FakeKeychain,
    review: async (_root, value) => {
      assert.equal(value.fingerprint, 'f'.repeat(64));
      assert.equal(value.summary.consequence, '@etblink will follow @juniper-lane on Hive.');
      return true;
    },
    waitImpl: async () => {},
    reload: () => { reloads += 1; },
  });

  try {
    await controller.run(root);

    assert.equal(broadcasts.length, 1);
    assert.equal(broadcasts[0].account, 'etblink');
    assert.equal(broadcasts[0].authority, 'Posting');
    assert.deepEqual(JSON.parse(JSON.stringify(broadcasts[0].operations)), [operation]);
    assert.equal(observations, 2);
    assert.equal(reloads, 1);
    assert.equal(root.dataset.participationState, 'confirmed');
    assert.equal(root.querySelector('[data-participation-submit]').disabled, true);

    const preflightCall = calls.find((call) => call.url === root.dataset.participationUrl);
    assert.equal(preflightCall.options.headers['x-csrf-token'], 'csrf-1');
    const accepted = calls.find((call) => call.url.endsWith('/accepted'));
    assert.deepEqual(JSON.parse(accepted.options.body), { transactionId: 'a'.repeat(40) });
    assert.equal(
      calls.some((call) => /post|reply|vote|payment/i.test(call.url)),
      false,
    );
  } finally {
    dom.window.close();
  }
});

test('review cancellation deletes the prepared intent and never opens a wallet', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-participation]');
  const urls = [];
  let broadcasts = 0;

  class FakeKeychain {
    async broadcast() {
      broadcasts += 1;
      return { accepted: true };
    }
  }

  const controller = new dom.window.HiVenuesParticipation.ParticipationController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.participationUrl) return response(preflight, 201);
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
      root.dataset.participationUrl,
      '/participation/preflight/preflight-1/cancel',
    ]);
    assert.equal(root.dataset.participationState, 'cancelled');
    assert.match(root.querySelector('[data-participation-status]').textContent, /Nothing was sent to Hive/);
    assert.equal(root.querySelector('[data-participation-submit]').disabled, false);
  } finally {
    dom.window.close();
  }
});

test('wallet cancellation clears prepared state and does not report pending or confirmed', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-participation]');
  const urls = [];

  class CancelledKeychain {
    async broadcast() {
      const error = new Error('cancelled');
      error.code = 'KEYCHAIN_CANCELLED';
      throw error;
    }
  }

  const controller = new dom.window.HiVenuesParticipation.ParticipationController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.participationUrl) return response(preflight, 201);
      if (url.endsWith('/cancel')) return response(null, 204);
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: CancelledKeychain,
    review: async () => true,
  });

  try {
    await controller.run(root);
    assert.equal(urls.at(-1), '/participation/preflight/preflight-1/cancel');
    assert.equal(root.dataset.participationState, 'cancelled');
    assert.match(root.querySelector('[data-participation-status]').textContent, /Nothing was broadcast/);
    assert.doesNotMatch(root.querySelector('[data-participation-status]').textContent, /confirmed/i);
  } finally {
    dom.window.close();
  }
});

test('wallet acceptance without canonical observation locks the control in an uncertain state', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-participation]');
  let observations = 0;
  let reloads = 0;

  class AcceptedKeychain {
    async broadcast() {
      return { accepted: true, transactionId: null };
    }
  }

  const controller = new dom.window.HiVenuesParticipation.ParticipationController({
    fetchImpl: async (url) => {
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.participationUrl) return response(preflight, 201);
      if (url.endsWith('/accepted')) {
        return response({
          ...preflight,
          state: 'broadcast_accepted',
          message: 'Your wallet accepted this action. HiVenues is still waiting for canonical Hive confirmation.',
        });
      }
      if (url.endsWith('/observe')) {
        observations += 1;
        return response({
          ...preflight,
          state: 'broadcast_accepted',
          message: 'Your wallet accepted this action. HiVenues is still waiting for canonical Hive confirmation.',
        });
      }
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: AcceptedKeychain,
    review: async () => true,
    waitImpl: async () => {},
    observationAttempts: 3,
    reload: () => { reloads += 1; },
  });

  try {
    await controller.run(root);
    assert.equal(observations, 3);
    assert.equal(reloads, 0);
    assert.equal(root.dataset.participationState, 'uncertain');
    assert.equal(root.querySelector('[data-participation-submit]').disabled, true);
    assert.match(root.querySelector('[data-participation-status]').textContent, /Do not repeat it yet/);
  } finally {
    dom.window.close();
  }
});

test('page identity mismatch stops before a preflight is prepared', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-participation]');
  const urls = [];

  const controller = new dom.window.HiVenuesParticipation.ParticipationController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'someone-else', csrfToken: 'csrf-1' });
      }
      throw new Error('No participation route should be reached');
    },
    review: async () => assert.fail('identity mismatch must not reach review'),
  });

  try {
    await controller.run(root);
    assert.deepEqual(urls, ['/identity/session']);
    assert.equal(root.dataset.participationState, 'failed');
    assert.match(root.querySelector('[data-participation-status]').textContent, /different verified Hive identity/);
  } finally {
    dom.window.close();
  }
});

test('provider absence cancels the prepared intent rather than leaving a phantom pending action', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-participation]');
  const urls = [];

  const controller = new dom.window.HiVenuesParticipation.ParticipationController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.participationUrl) return response(preflight, 201);
      if (url.endsWith('/cancel')) return response(null, 204);
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: null,
    review: async () => true,
  });

  try {
    await controller.run(root);
    assert.equal(urls.at(-1), '/participation/preflight/preflight-1/cancel');
    assert.equal(root.dataset.participationState, 'provider-unavailable');
    assert.match(root.querySelector('[data-participation-status]').textContent, /human-owned Hive wallet/);
  } finally {
    dom.window.close();
  }
});

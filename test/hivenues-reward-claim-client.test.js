'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'hivenues-reward-claim.js'),
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
    + '<div data-hivenues-reward-claim'
    + ' data-reward-url="/participation/northline-hall/rewards/claim"'
    + ' data-reward-actor="paper-sparrow"'
    + ' data-reward-state="ready">'
    + '<button type="button" data-reward-submit>Collect rewards</button>'
    + '<p data-reward-status></p>'
    + '</div>'
    + '</body>';
}

function createDom() {
  const dom = new JSDOM(markup(), {
    runScripts: 'outside-only',
    url: 'http://hivenues.test/candidate-c/northline-hall/community/people/paper-sparrow',
  });
  dom.window.eval(source);
  return dom;
}

function preflight() {
  return Object.freeze({
    id: 'reward-preflight-1',
    account: 'paper-sparrow',
    signer: 'paper-sparrow',
    action: 'claim-rewards',
    authority: 'Posting',
    operations: [[
      'claim_reward_balance',
      {
        account: 'paper-sparrow',
        reward_hive: '1.000 HIVE',
        reward_hbd: '0.500 HBD',
        reward_vests: '1000.000000 VESTS',
      },
    ]],
    fingerprint: 'e'.repeat(64),
    summary: {
      kind: 'Claim current Hive rewards',
      account: 'paper-sparrow',
      rewardHive: '1.000 HIVE',
      rewardHbd: '0.500 HBD',
      rewardVests: '1000.000000 VESTS',
      consequence: '@paper-sparrow will claim the exact current Hive rewards into the same Hive account.',
    },
    state: 'prepared',
  });
}

test('reward claim controller reviews exact current rewards, uses Posting wallet and waits for canonical transaction observation', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-reward-claim]');
  const calls = [];
  const broadcasts = [];
  let observations = 0;
  let reloads = 0;

  class FakeKeychain {
    async broadcast(args) {
      broadcasts.push(args);
      return { accepted: true, transactionId: 'c'.repeat(40) };
    }
  }

  const controller = new dom.window.HiVenuesRewardClaim.RewardClaimController({
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.rewardUrl) return response(preflight(), 201);
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
      assert.equal(value.action, 'claim-rewards');
      assert.equal(value.authority, 'Posting');
      assert.equal(value.summary.rewardHive, '1.000 HIVE');
      assert.equal(value.summary.rewardHbd, '0.500 HBD');
      assert.equal(value.summary.rewardVests, '1000.000000 VESTS');
      assert.deepEqual(value.operations, preflight().operations);
      return true;
    },
    waitImpl: async () => {},
    reload: () => { reloads += 1; },
  });

  try {
    await controller.run(root);

    assert.deepEqual(broadcasts, [{
      account: 'paper-sparrow',
      operations: preflight().operations,
      authority: 'Posting',
    }]);
    assert.equal(observations, 2);
    assert.equal(reloads, 1);
    assert.equal(root.dataset.rewardState, 'confirmed');

    const prepared = calls.find((call) => call.url === root.dataset.rewardUrl);
    assert.equal(prepared.options.headers['x-csrf-token'], 'csrf-1');
    assert.deepEqual(JSON.parse(prepared.options.body), {});
  } finally {
    dom.window.close();
  }
});

test('review cancellation deletes the prepared reward claim before wallet approval', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-reward-claim]');
  const urls = [];
  let broadcasts = 0;

  class FakeKeychain {
    async broadcast() {
      broadcasts += 1;
      return { accepted: true };
    }
  }

  const controller = new dom.window.HiVenuesRewardClaim.RewardClaimController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.rewardUrl) return response(preflight(), 201);
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
      root.dataset.rewardUrl,
      '/participation/preflight/reward-preflight-1/cancel',
    ]);
    assert.equal(root.dataset.rewardState, 'cancelled');
  } finally {
    dom.window.close();
  }
});

test('wallet acceptance without exact transaction observation becomes uncertain and locks repeat claim', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-reward-claim]');
  let observations = 0;

  class FakeKeychain {
    async broadcast() {
      return { accepted: true, transactionId: null };
    }
  }

  const controller = new dom.window.HiVenuesRewardClaim.RewardClaimController({
    fetchImpl: async (url) => {
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.rewardUrl) return response(preflight(), 201);
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
    assert.equal(root.dataset.rewardState, 'uncertain');
    assert.equal(root.querySelector('[data-reward-submit]').disabled, true);
    assert.match(root.querySelector('[data-reward-status]').textContent, /Do not repeat it yet/i);
  } finally {
    dom.window.close();
  }
});

test('fresh no-rewards response becomes stale without opening the wallet', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-reward-claim]');
  let reviews = 0;

  const controller = new dom.window.HiVenuesRewardClaim.RewardClaimController({
    fetchImpl: async (url) => {
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.rewardUrl) {
        return response({
          error: {
            code: 'NO_CLAIMABLE_REWARDS',
            message: 'There are no current Hive rewards to claim',
          },
        }, 409);
      }
      throw new Error('Unexpected URL ' + url);
    },
    review: async () => { reviews += 1; return true; },
  });

  try {
    await controller.run(root);
    assert.equal(reviews, 0);
    assert.equal(root.dataset.rewardState, 'stale');
    assert.match(root.querySelector('[data-reward-status]').textContent, /no longer reports any pending rewards/i);
  } finally {
    dom.window.close();
  }
});

test('missing wallet cancels prepared reward claim instead of leaving phantom pending state', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-reward-claim]');
  const urls = [];

  const controller = new dom.window.HiVenuesRewardClaim.RewardClaimController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.rewardUrl) return response(preflight(), 201);
      if (url.endsWith('/cancel')) return response(null, 204);
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: null,
    review: async () => true,
  });

  try {
    await controller.run(root);
    assert.equal(urls.at(-1), '/participation/preflight/reward-preflight-1/cancel');
    assert.equal(root.dataset.rewardState, 'provider-unavailable');
    assert.match(root.querySelector('[data-reward-status]').textContent, /human-owned Hive wallet/i);
  } finally {
    dom.window.close();
  }
});

test('page identity mismatch stops before reward preflight is created', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-reward-claim]');
  const urls = [];

  const controller = new dom.window.HiVenuesRewardClaim.RewardClaimController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'someone-else', csrfToken: 'csrf-1' });
      }
      throw new Error('Reward preflight must not be reached');
    },
    review: async () => assert.fail('identity mismatch must not reach review'),
  });

  try {
    await controller.run(root);
    assert.deepEqual(urls, ['/identity/session']);
    assert.equal(root.dataset.rewardState, 'identity-required');
  } finally {
    dom.window.close();
  }
});

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'hivenues-vote.js'),
  'utf8',
);

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
  };
}

function markup({ negative = true } = {}) {
  return '<!doctype html><body>'
    + '<div data-hivenues-vote'
    + ' data-vote-url="/participation/northline-hall/votes/etblink/room-note/etblink/room-note"'
    + ' data-vote-actor="paper-sparrow"'
    + ' data-vote-current-weight="0"'
    + ' data-vote-state="ready">'
    + '<button type="button" data-vote-direction="upvote">Raise a glass</button>'
    + (negative ? '<button type="button" data-vote-direction="downvote">Not for this room</button>' : '')
    + '<input data-vote-percent type="range" min="1" max="100" value="42">'
    + '<output data-vote-percent-output></output>'
    + '<p data-vote-status></p>'
    + '</div>'
    + '</body>';
}

function createDom(options) {
  const dom = new JSDOM(markup(options), {
    runScripts: 'outside-only',
    url: 'http://hivenues.test/candidate-c/northline-hall/community/posts/etblink/room-note',
  });
  dom.window.eval(source);
  return dom;
}

function preflight(direction = 'upvote', percent = 42) {
  const weight = percent * 100 * (direction === 'downvote' ? -1 : 1);
  return Object.freeze({
    id: 'vote-preflight-1',
    account: 'paper-sparrow',
    signer: 'paper-sparrow',
    action: 'vote',
    authority: 'Posting',
    operations: [[
      'vote',
      {
        voter: 'paper-sparrow',
        author: 'etblink',
        permlink: 'room-note',
        weight,
      },
    ]],
    fingerprint: 'd'.repeat(64),
    summary: {
      kind: 'Hive vote',
      voter: 'paper-sparrow',
      author: 'etblink',
      permlink: 'room-note',
      direction,
      percent,
      weight,
      consequence: '@paper-sparrow will cast this exact Hive vote.',
    },
    state: 'prepared',
  });
}

test('vote controller prepares exact direction and strength, uses the human wallet, then waits for canonical readback', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-vote]');
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

  const controller = new dom.window.HiVenuesVote.VoteController({
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.voteUrl) return response(preflight('upvote', 42), 201);
      if (url.endsWith('/accepted')) {
        return response({ ...preflight('upvote', 42), state: 'broadcast_accepted', message: 'Pending.' });
      }
      if (url.endsWith('/observe')) {
        observations += 1;
        return response({
          ...preflight('upvote', 42),
          state: observations === 2 ? 'observed' : 'broadcast_accepted',
          message: observations === 2 ? 'Confirmed on Hive.' : 'Pending.',
        });
      }
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: FakeKeychain,
    review: async (_root, value) => {
      assert.equal(value.summary.kind, 'Hive vote');
      assert.equal(value.summary.direction, 'upvote');
      assert.equal(value.summary.percent, 42);
      assert.equal(value.summary.weight, 4200);
      assert.equal(value.authority, 'Posting');
      assert.deepEqual(value.operations[0], [
        'vote',
        { voter: 'paper-sparrow', author: 'etblink', permlink: 'room-note', weight: 4200 },
      ]);
      return true;
    },
    waitImpl: async () => {},
    reload: () => { reloads += 1; },
  });

  try {
    await controller.run(root, 'upvote');

    assert.equal(broadcasts.length, 1);
    assert.equal(broadcasts[0].account, 'paper-sparrow');
    assert.equal(broadcasts[0].authority, 'Posting');
    assert.deepEqual(
      JSON.parse(JSON.stringify(broadcasts[0].operations)),
      preflight('upvote', 42).operations,
    );
    assert.equal(observations, 2);
    assert.equal(reloads, 1);
    assert.equal(root.dataset.voteState, 'confirmed');

    const prepared = calls.find((call) => call.url === root.dataset.voteUrl);
    assert.equal(prepared.options.headers['x-csrf-token'], 'csrf-1');
    assert.deepEqual(JSON.parse(prepared.options.body), { direction: 'upvote', percent: 42 });
  } finally {
    dom.window.close();
  }
});

test('downvote direction remains explicit and sends a positive magnitude rather than a hidden negative percentage', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-vote]');
  let preparedBody = null;
  let broadcasts = 0;

  class CancelKeychain {
    async broadcast() {
      broadcasts += 1;
      const error = new Error('cancelled');
      error.code = 'KEYCHAIN_CANCELLED';
      throw error;
    }
  }

  const controller = new dom.window.HiVenuesVote.VoteController({
    fetchImpl: async (url, options = {}) => {
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.voteUrl) {
        preparedBody = JSON.parse(options.body);
        return response(preflight('downvote', 42), 201);
      }
      if (url.endsWith('/cancel')) return response(null, 204);
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: CancelKeychain,
    review: async (_root, value) => {
      assert.equal(value.summary.direction, 'downvote');
      assert.equal(value.summary.percent, 42);
      assert.equal(value.summary.weight, -4200);
      return true;
    },
  });

  try {
    await controller.run(root, 'downvote');
    assert.deepEqual(preparedBody, { direction: 'downvote', percent: 42 });
    assert.equal(broadcasts, 1);
    assert.equal(root.dataset.voteState, 'cancelled');
  } finally {
    dom.window.close();
  }
});

test('review cancellation clears the prepared vote without opening the wallet', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-vote]');
  const urls = [];
  let broadcasts = 0;

  class FakeKeychain {
    async broadcast() {
      broadcasts += 1;
      return { accepted: true };
    }
  }

  const controller = new dom.window.HiVenuesVote.VoteController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.voteUrl) return response(preflight(), 201);
      if (url.endsWith('/cancel')) return response(null, 204);
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: FakeKeychain,
    review: async () => false,
  });

  try {
    await controller.run(root, 'upvote');
    assert.equal(broadcasts, 0);
    assert.deepEqual(urls, [
      '/identity/session',
      root.dataset.voteUrl,
      '/participation/preflight/vote-preflight-1/cancel',
    ]);
    assert.equal(root.dataset.voteState, 'cancelled');
    assert.match(root.querySelector('[data-vote-status]').textContent, /No vote was sent to Hive/);
  } finally {
    dom.window.close();
  }
});

test('wallet acceptance without exact vote readback becomes uncertain and locks repeat voting', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-vote]');
  let observations = 0;

  class FakeKeychain {
    async broadcast() {
      return { accepted: true, transactionId: null };
    }
  }

  const controller = new dom.window.HiVenuesVote.VoteController({
    fetchImpl: async (url) => {
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.voteUrl) return response(preflight(), 201);
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
    await controller.run(root, 'upvote');
    assert.equal(observations, 3);
    assert.equal(root.dataset.voteState, 'uncertain');
    assert.equal(root.querySelector('[data-vote-direction]').disabled, true);
    assert.match(root.querySelector('[data-vote-status]').textContent, /exact Hive confirmation is still pending/i);
  } finally {
    dom.window.close();
  }
});

test('missing wallet cancels the prepared vote rather than leaving phantom pending state', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-vote]');
  const urls = [];

  const controller = new dom.window.HiVenuesVote.VoteController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.voteUrl) return response(preflight(), 201);
      if (url.endsWith('/cancel')) return response(null, 204);
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: null,
    review: async () => true,
  });

  try {
    await controller.run(root, 'upvote');
    assert.equal(urls.at(-1), '/participation/preflight/vote-preflight-1/cancel');
    assert.equal(root.dataset.voteState, 'provider-unavailable');
    assert.match(root.querySelector('[data-vote-status]').textContent, /human-owned Hive wallet/i);
  } finally {
    dom.window.close();
  }
});

test('server policy change that hides downvotes is surfaced as HiVenues policy, not a protocol claim', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-vote]');
  let reviewCalls = 0;

  const controller = new dom.window.HiVenuesVote.VoteController({
    fetchImpl: async (url) => {
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'paper-sparrow', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.voteUrl) {
        return response({
          error: {
            code: 'NEGATIVE_VOTE_ACTION_HIDDEN',
            message: 'This HiVenue does not offer a downvote action. Hive itself may still accept downvotes through another compatible client.',
          },
        }, 403);
      }
      throw new Error('Unexpected URL ' + url);
    },
    review: async () => { reviewCalls += 1; return true; },
  });

  try {
    await controller.run(root, 'downvote');
    assert.equal(reviewCalls, 0);
    assert.equal(root.dataset.voteState, 'stale');
    assert.match(root.querySelector('[data-vote-status]').textContent, /another compatible client/i);
  } finally {
    dom.window.close();
  }
});

test('page identity mismatch stops before any vote preflight is created', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-vote]');
  const urls = [];

  const controller = new dom.window.HiVenuesVote.VoteController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'someone-else', csrfToken: 'csrf-1' });
      }
      throw new Error('Vote preflight must not be reached');
    },
    review: async () => assert.fail('identity mismatch must not reach review'),
  });

  try {
    await controller.run(root, 'upvote');
    assert.deepEqual(urls, ['/identity/session']);
    assert.equal(root.dataset.voteState, 'identity-required');
  } finally {
    dom.window.close();
  }
});

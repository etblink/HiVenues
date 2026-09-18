'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'hivenues-content.js'),
  'utf8',
);

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
  };
}

function markup(mode = 'post') {
  const title = mode === 'reply'
    ? ''
    : '<input data-content-title value="A room note">';
  return '<!doctype html><body>'
    + '<section data-hivenues-content'
    + ' data-content-mode="' + mode + '"'
    + ' data-content-url="/participation/northline-hall/content/posts"'
    + ' data-content-actor="etblink"'
    + ' data-content-state="ready">'
    + '<form data-content-form>'
    + title
    + '<textarea data-content-body>Exact public body.</textarea>'
    + '<button type="submit" data-content-submit>Review</button>'
    + '<p data-content-status></p>'
    + '</form>'
    + '</section>'
    + '</body>';
}

function createDom(mode = 'post') {
  const dom = new JSDOM(markup(mode), {
    runScripts: 'outside-only',
    url: 'http://hivenues.test/hivenues/northline-hall/community/updates',
  });
  dom.window.eval(source);
  return dom;
}

const operation = [
  'comment',
  {
    parent_author: '',
    parent_permlink: 'hive-199299',
    author: 'etblink',
    permlink: 'a-room-note-fixed',
    title: 'A room note',
    body: 'Exact public body.',
    json_metadata: '{"tags":["hive-199299"],"app":"hivenues/1.0.0","format":"markdown"}',
  },
];

const preflight = Object.freeze({
  id: 'content-preflight-1',
  account: 'etblink',
  signer: 'etblink',
  action: 'post',
  authority: 'Posting',
  operations: [operation],
  fingerprint: 'c'.repeat(64),
  summary: {
    community: 'hive-199299',
    permlink: 'a-room-note-fixed',
    discussionHref: '/hivenues/northline-hall/community/posts/etblink/a-room-note-fixed',
    consequence: '@etblink will publish a new public Hive post in hive-199299.',
  },
  state: 'prepared',
});

test('content controller reviews exact content, uses the human wallet, then waits for canonical readback', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-content]');
  const calls = [];
  const broadcasts = [];
  let observations = 0;
  const navigations = [];

  class FakeKeychain {
    async broadcast(args) {
      broadcasts.push(args);
      return { accepted: true, transactionId: 'a'.repeat(40) };
    }
  }

  const controller = new dom.window.HiVenuesContent.ContentController({
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.contentUrl) return response(preflight, 201);
      if (url.endsWith('/accepted')) {
        return response({
          ...preflight,
          state: 'broadcast_accepted',
          message: 'Wallet accepted; canonical confirmation is pending.',
        });
      }
      if (url.endsWith('/observe')) {
        observations += 1;
        return response({
          ...preflight,
          state: observations === 2 ? 'observed' : 'broadcast_accepted',
          message: observations === 2 ? 'Confirmed on Hive.' : 'Still pending.',
        });
      }
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: FakeKeychain,
    review: async (_root, value) => {
      assert.equal(value.fingerprint, 'c'.repeat(64));
      assert.equal(value.operations[0][0], 'comment');
      assert.equal(value.operations[0][1].title, 'A room note');
      assert.equal(value.operations[0][1].body, 'Exact public body.');
      assert.equal(value.operations[0][1].parent_permlink, 'hive-199299');
      return true;
    },
    waitImpl: async () => {},
    navigate: (href) => navigations.push(href),
    reload: () => assert.fail('root post confirmation should navigate to its discussion'),
  });

  try {
    await controller.run(root);

    assert.equal(broadcasts.length, 1);
    assert.equal(broadcasts[0].account, 'etblink');
    assert.equal(broadcasts[0].authority, 'Posting');
    assert.deepEqual(JSON.parse(JSON.stringify(broadcasts[0].operations)), [operation]);
    assert.equal(observations, 2);
    assert.deepEqual(navigations, [preflight.summary.discussionHref]);
    assert.equal(root.dataset.contentState, 'confirmed');
    assert.equal(root.querySelector('[data-content-submit]').disabled, true);

    const preflightCall = calls.find((call) => call.url === root.dataset.contentUrl);
    assert.equal(preflightCall.options.headers['x-csrf-token'], 'csrf-1');
    assert.deepEqual(JSON.parse(preflightCall.options.body), {
      title: 'A room note',
      body: 'Exact public body.',
    });
    const accepted = calls.find((call) => call.url.endsWith('/accepted'));
    assert.deepEqual(JSON.parse(accepted.options.body), { transactionId: 'a'.repeat(40) });
  } finally {
    dom.window.close();
  }
});

test('review cancellation deletes the prepared content intent and never opens the wallet', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-content]');
  const urls = [];
  let broadcasts = 0;

  class FakeKeychain {
    async broadcast() {
      broadcasts += 1;
      return { accepted: true };
    }
  }

  const controller = new dom.window.HiVenuesContent.ContentController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.contentUrl) return response(preflight, 201);
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
      root.dataset.contentUrl,
      '/participation/preflight/content-preflight-1/cancel',
    ]);
    assert.equal(root.dataset.contentState, 'cancelled');
    assert.match(root.querySelector('[data-content-status]').textContent, /Nothing was published/);
    assert.equal(root.querySelector('[data-content-submit]').disabled, false);
  } finally {
    dom.window.close();
  }
});

test('wallet cancellation clears prepared content state and never reports pending or confirmed', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-content]');
  const urls = [];

  class CancelledKeychain {
    async broadcast() {
      const error = new Error('cancelled');
      error.code = 'KEYCHAIN_CANCELLED';
      throw error;
    }
  }

  const controller = new dom.window.HiVenuesContent.ContentController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.contentUrl) return response(preflight, 201);
      if (url.endsWith('/cancel')) return response(null, 204);
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: CancelledKeychain,
    review: async () => true,
  });

  try {
    await controller.run(root);
    assert.equal(urls.at(-1), '/participation/preflight/content-preflight-1/cancel');
    assert.equal(root.dataset.contentState, 'cancelled');
    assert.match(root.querySelector('[data-content-status]').textContent, /Nothing was published/);
    assert.doesNotMatch(root.querySelector('[data-content-status]').textContent, /confirmed/i);
  } finally {
    dom.window.close();
  }
});

test('wallet acceptance without exact canonical content readback locks the composer as uncertain', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-content]');
  let observations = 0;
  let navigations = 0;

  class AcceptedKeychain {
    async broadcast() {
      return { accepted: true, transactionId: null };
    }
  }

  const controller = new dom.window.HiVenuesContent.ContentController({
    fetchImpl: async (url) => {
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.contentUrl) return response(preflight, 201);
      if (url.endsWith('/accepted')) {
        return response({ ...preflight, state: 'broadcast_accepted', message: 'Pending.' });
      }
      if (url.endsWith('/observe')) {
        observations += 1;
        return response({ ...preflight, state: 'broadcast_accepted', message: 'Still pending.' });
      }
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: AcceptedKeychain,
    review: async () => true,
    waitImpl: async () => {},
    observationAttempts: 3,
    navigate: () => { navigations += 1; },
  });

  try {
    await controller.run(root);
    assert.equal(observations, 3);
    assert.equal(navigations, 0);
    assert.equal(root.dataset.contentState, 'uncertain');
    assert.equal(root.querySelector('[data-content-submit]').disabled, true);
    assert.match(root.querySelector('[data-content-status]').textContent, /exact Hive confirmation is still pending/i);
    assert.match(root.querySelector('[data-content-status]').textContent, /Do not repeat it yet/i);
  } finally {
    dom.window.close();
  }
});

test('page identity mismatch stops before any content preflight is created', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-content]');
  const urls = [];

  const controller = new dom.window.HiVenuesContent.ContentController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'someone-else', csrfToken: 'csrf-1' });
      }
      throw new Error('No content route should be reached');
    },
    review: async () => assert.fail('identity mismatch must not reach review'),
  });

  try {
    await controller.run(root);
    assert.deepEqual(urls, ['/identity/session']);
    assert.equal(root.dataset.contentState, 'identity-mismatch');
    assert.match(root.querySelector('[data-content-status]').textContent, /different verified Hive identity/);
  } finally {
    dom.window.close();
  }
});

test('provider absence cancels prepared content rather than leaving a phantom pending write', async () => {
  const dom = createDom();
  const root = dom.window.document.querySelector('[data-hivenues-content]');
  const urls = [];

  const controller = new dom.window.HiVenuesContent.ContentController({
    fetchImpl: async (url) => {
      urls.push(url);
      if (url === '/identity/session') {
        return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      }
      if (url === root.dataset.contentUrl) return response(preflight, 201);
      if (url.endsWith('/cancel')) return response(null, 204);
      throw new Error('Unexpected URL ' + url);
    },
    KeychainAdapter: null,
    review: async () => true,
  });

  try {
    await controller.run(root);
    assert.equal(urls.at(-1), '/participation/preflight/content-preflight-1/cancel');
    assert.equal(root.dataset.contentState, 'provider-unavailable');
    assert.match(root.querySelector('[data-content-status]').textContent, /human-owned Hive wallet/i);
    assert.equal(root.querySelector('[data-content-submit]').disabled, false);
  } finally {
    dom.window.close();
  }
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createDogfoodApp } = require('../src/product/dogfood-app');
const {
  CommunityDiscussionReader,
  SyntheticBridgeDiscussionProvider,
} = require('../src/product/social-discussion');
const { HiVenuesStore } = require('../src/product/store');

const ROOT = Object.freeze({
  author: 'hivebar-gate',
  permlink: 'what-a-neighborhood-place-can-be',
});

const HOSTS = Object.freeze([
  Object.freeze({
    slug: 'northline-hall',
    directionClass: 'cc-community--poster',
    heading: 'On the community board',
    navigationLabel: 'Community',
  }),
  Object.freeze({
    slug: 'nova-ashby',
    directionClass: 'cc-community--editorial',
    heading: 'Correspondence',
    navigationLabel: 'Correspondence',
  }),
  Object.freeze({
    slug: 'harbor-and-hearth',
    directionClass: 'cc-community--hospitality',
    heading: 'Around the table',
    navigationLabel: 'Table talk',
  }),
]);

function realisticDiscussionWire() {
  return {
    'hivebar-gate/what-a-neighborhood-place-can-be': {
      author: 'hivebar-gate',
      permlink: 'what-a-neighborhood-place-can-be',
      parent_author: '',
      parent_permlink: 'hive-199299',
      title: 'What a neighborhood place can be',
      body: 'A room becomes a place when **people return**.',
      created: '2026-03-26T19:00:00',
      updated: '2026-03-26T19:00:00',
      children: 2,
      depth: 0,
      active_votes: [],
      pending_payout_value: '0.000 HBD',
      total_payout_value: '0.000 HBD',
      curator_payout_value: '0.000 HBD',
      json_metadata: JSON.stringify({ tags: ['community'] }),
    },
    'juniper-lane/re-first': {
      author: 'juniper-lane',
      permlink: 're-first',
      parent_author: 'hivebar-gate',
      parent_permlink: 'what-a-neighborhood-place-can-be',
      title: 'Re: What a neighborhood place can be',
      body: 'The quiet part is the regulars remembering each other.',
      created: '2026-03-26T19:05:00',
      updated: '2026-03-26T19:05:00',
      children: 1,
      depth: 1,
      active_votes: [],
      pending_payout_value: '0.000 HBD',
      total_payout_value: '0.000 HBD',
      curator_payout_value: '0.000 HBD',
      json_metadata: '{}',
    },
    'paper-sparrow/re-second': {
      author: 'paper-sparrow',
      permlink: 're-second',
      parent_author: 'juniper-lane',
      parent_permlink: 're-first',
      title: 'Re: What a neighborhood place can be',
      body: 'That is why the room feels different from a feed.',
      created: '2026-03-26T19:08:00',
      updated: '2026-03-26T19:08:00',
      children: 0,
      depth: 2,
      active_votes: [],
      pending_payout_value: '0.000 HBD',
      total_payout_value: '0.000 HBD',
      curator_payout_value: '0.000 HBD',
      json_metadata: '{}',
    },
  };
}

function bindingsForAllHosts() {
  return Object.fromEntries(HOSTS.map(({ slug }) => [slug, ROOT]));
}

function readyReader() {
  return new CommunityDiscussionReader(new SyntheticBridgeDiscussionProvider({
    discussions: {
      'hivebar-gate/what-a-neighborhood-place-can-be': realisticDiscussionWire(),
    },
  }));
}

function appWith({
  store = new HiVenuesStore(),
  discussionReader = readyReader(),
  discussionBindings = bindingsForAllHosts(),
} = {}) {
  return {
    store,
    app: createDogfoodApp({
      store,
      discussionReader,
      discussionBindings,
    }),
  };
}

test('public host pages discover the community surface without leaking it into draft preview', async () => {
  const { app } = appWith({
    discussionReader: null,
    discussionBindings: {},
  });

  for (const host of HOSTS) {
    const publicPage = await request(app).get(`/hivenues/${host.slug}`).expect(200);
    assert.match(publicPage.text, new RegExp(`/hivenues/${host.slug}/community`));
    assert.match(publicPage.text, new RegExp(host.navigationLabel));

    const previewPage = await request(app).get(`/hivenues/studio/${host.slug}/preview`).expect(200);
    assert.doesNotMatch(previewPage.text, /\/community/);
  }
});

test('unconfigured community stays explicit, read-only, and free of external effects', async () => {
  const store = new HiVenuesStore();
  const before = store.diagnostics();
  const app = createDogfoodApp({ store });

  const response = await request(app)
    .get('/hivenues/northline-hall/community')
    .expect(200);

  assert.match(response.headers['cache-control'], /no-store/);
  assert.match(response.text, /Community conversation is not connected for this place yet\./);
  assert.match(response.text, /cc-community--poster/);
  assert.doesNotMatch(response.text, /<form\b/i);
  assert.deepEqual(store.diagnostics(), before);
  assert.equal(store.publicSnapshot('northline-hall').draft.community, undefined);
  assert.equal(store.publicSnapshot('northline-hall').draft.discussion, undefined);
});

test('the same normalized discussion becomes three host-native Direction compositions', async () => {
  const { app, store } = appWith();
  const before = store.diagnostics();

  for (const host of HOSTS) {
    const response = await request(app)
      .get(`/hivenues/${host.slug}/community`)
      .expect(200);

    assert.match(response.headers['cache-control'], /no-store/);
    assert.match(response.text, new RegExp(host.directionClass));
    assert.match(response.text, new RegExp(host.heading));
    assert.match(response.text, /What a neighborhood place can be/);
    assert.match(response.text, /@hivebar-gate/);
    assert.match(response.text, /@juniper-lane/);
    assert.match(response.text, /@paper-sparrow/);
    assert.match(response.text, /<strong>people return<\/strong>/);
    assert.doesNotMatch(response.text, /<form\b/i);
    assert.doesNotMatch(response.text, /Hive dashboard/i);
  }

  assert.deepEqual(store.diagnostics(), before);
});

test('community projection reads Live state and does not leak an unreleased Working Direction', async () => {
  const store = new HiVenuesStore();
  const snapshot = store.snapshot('northline-hall');
  const changed = store.completeSetup('northline-hall', {
    purpose: snapshot.draft.intent.purpose,
    presenceMaterial: snapshot.draft.intent.presenceMaterial,
    participation: snapshot.draft.intent.participation,
    direction: 'editorial',
  }, snapshot.revision, snapshot.draftDigest);

  assert.equal(changed.ok, true);
  assert.equal(store.snapshot('northline-hall').draft.presentation.compositionFamily, 'editorial');
  assert.equal(store.publicSnapshot('northline-hall').draft.presentation.compositionFamily, 'poster');

  const app = createDogfoodApp({
    store,
    discussionReader: readyReader(),
    discussionBindings: bindingsForAllHosts(),
  });

  const response = await request(app)
    .get('/hivenues/northline-hall/community')
    .expect(200);

  assert.match(response.text, /cc-community--poster/);
  assert.doesNotMatch(response.text, /cc-community--editorial/);
});

test('empty and partial discussions remain truthful instead of fabricating a successful feed', async () => {
  const emptyProvider = new SyntheticBridgeDiscussionProvider({
    discussions: { 'hivebar-gate/what-a-neighborhood-place-can-be': {} },
  });
  const emptyApp = createDogfoodApp({
    store: new HiVenuesStore(),
    discussionReader: new CommunityDiscussionReader(emptyProvider),
    discussionBindings: bindingsForAllHosts(),
  });
  const empty = await request(emptyApp)
    .get('/hivenues/northline-hall/community')
    .expect(200);
  assert.match(empty.text, /No community notes are here yet\./);
  assert.doesNotMatch(empty.text, /What a neighborhood place can be/);

  const full = realisticDiscussionWire();
  const partialWire = {
    'juniper-lane/re-first': full['juniper-lane/re-first'],
    'paper-sparrow/re-second': full['paper-sparrow/re-second'],
  };
  const partialProvider = new SyntheticBridgeDiscussionProvider({
    discussions: { 'hivebar-gate/what-a-neighborhood-place-can-be': partialWire },
  });
  const partialApp = createDogfoodApp({
    store: new HiVenuesStore(),
    discussionReader: new CommunityDiscussionReader(partialProvider),
    discussionBindings: bindingsForAllHosts(),
  });
  const partial = await request(partialApp)
    .get('/hivenues/nova-ashby/community')
    .expect(200);

  assert.match(partial.text, /The opening note is temporarily unavailable\./);
  assert.match(partial.text, /@juniper-lane/);
  assert.match(partial.text, /@paper-sparrow/);
});

test('provider failure and invalid wire render explicit unavailable and degraded states', async () => {
  const unavailableReader = new CommunityDiscussionReader({
    async getDiscussion() {
      throw new Error('offline');
    },
  });
  const unavailableApp = createDogfoodApp({
    store: new HiVenuesStore(),
    discussionReader: unavailableReader,
    discussionBindings: bindingsForAllHosts(),
  });
  const unavailable = await request(unavailableApp)
    .get('/hivenues/harbor-and-hearth/community')
    .expect(200);

  assert.match(unavailable.text, /Community conversation is temporarily unavailable\./);
  assert.doesNotMatch(unavailable.text, /What a neighborhood place can be/);

  const degradedReader = new CommunityDiscussionReader({
    async getDiscussion() {
      return [];
    },
  });
  const degradedApp = createDogfoodApp({
    store: new HiVenuesStore(),
    discussionReader: degradedReader,
    discussionBindings: bindingsForAllHosts(),
  });
  const degraded = await request(degradedApp)
    .get('/hivenues/harbor-and-hearth/community')
    .expect(200);

  assert.match(degraded.text, /This conversation cannot be shown safely right now\./);
  assert.match(degraded.text, /did not guess or substitute content/);
});

test('unknown hosts still return 404 at the community route', async () => {
  const { app } = appWith();
  await request(app).get('/hivenues/not-a-host/community').expect(404);
});

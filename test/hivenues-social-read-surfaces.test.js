'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createDogfoodApp } = require('../src/product/dogfood-app');
const { HiVenuesStore } = require('../src/product/store');
const { HiveReadService } = require('../src/hive/read-service');

const COMMUNITY = 'hive-199299';
const THREADS_ACCOUNT = 'room-notes';
const SOCIAL_BINDING = Object.freeze({ community: COMMUNITY, threadsAccount: THREADS_ACCOUNT });
const HOSTS = Object.freeze([
  Object.freeze({ slug: 'northline-hall', directionClass: 'cc-social--poster', heading: 'Fresh on the wall' }),
  Object.freeze({ slug: 'nova-ashby', directionClass: 'cc-social--editorial', heading: 'Dispatches & contributors' }),
  Object.freeze({ slug: 'harbor-and-hearth', directionClass: 'cc-social--hospitality', heading: 'Notes from the table' }),
]);

function content(author, permlink, title, body, created, extra = {}) {
  return {
    author,
    permlink,
    parent_author: extra.parent_author ?? '',
    parent_permlink: extra.parent_permlink ?? COMMUNITY,
    title,
    body,
    created,
    updated: created,
    children: extra.children ?? 0,
    depth: extra.depth ?? 0,
    active_votes: [],
    pending_payout_value: '0.000 HBD',
    total_payout_value: '0.000 HBD',
    curator_payout_value: '0.000 HBD',
    json_metadata: '{}',
  };
}

function profile(name, displayName, about, followers, following, posts) {
  return {
    name,
    metadata: {
      profile: {
        name: displayName,
        about,
        profile_image: `https://images.hive.blog/u/${name}/avatar`,
      },
    },
    stats: { followers, following, post_count: posts },
    post_count: posts,
    reputation_ui: '63.1',
  };
}

class RealShapedSocialRpc {
  constructor({ fail = [] } = {}) {
    this.fail = new Set(fail);
    this.calls = [];
    this.profiles = {
      'juniper-lane': profile('juniper-lane', 'Juniper Lane', 'Printmaker, listener, and regular.', 42, 17, 12),
      'paper-sparrow': profile('paper-sparrow', 'Paper Sparrow', 'Writes about places people return to.', 31, 22, 9),
      'north-star': profile('north-star', 'North Star', 'Makes small gatherings feel intentional.', 18, 11, 5),
      'blue-cup': profile('blue-cup', 'Blue Cup', 'Here for the long table.', 7, 9, 2),
      'room-notes': profile('room-notes', 'Room Notes', 'Public short-note container.', 4, 0, 1),
    };
    this.communityPosts = [
      content('juniper-lane', 'why-we-return', 'Why we return', 'The best rooms keep a little memory between visits.', '2026-09-12T18:00:00'),
      content('north-star', 'making-space', 'Making space', 'A useful gathering leaves room for somebody new.', '2026-09-11T20:00:00'),
    ];
    this.container = content(
      THREADS_ACCOUNT,
      'public-room-notes',
      'Public room notes',
      'Short public notes for this place.',
      '2026-09-13T17:00:00',
      { parent_permlink: 'hive' },
    );
    this.threadOne = content(
      'paper-sparrow',
      're-public-room-notes-1',
      'Re: Public room notes',
      'Someone left a tiny zine by the door. It found a reader before sunset.',
      '2026-09-13T18:00:00',
      { parent_author: THREADS_ACCOUNT, parent_permlink: 'public-room-notes', depth: 1 },
    );
    this.threadTwo = content(
      'juniper-lane',
      're-public-room-notes-2',
      'Re: Public room notes',
      'The late table is forming again on Thursday.',
      '2026-09-13T19:00:00',
      { parent_author: THREADS_ACCOUNT, parent_permlink: 'public-room-notes', depth: 1 },
    );
  }

  async call(api, method, params) {
    const key = `${api}.${method}`;
    this.calls.push({ api, method, params });
    if (this.fail.has('*') || this.fail.has(key)) throw new Error(`simulated ${key} outage`);

    if (key === 'bridge.get_community') {
      return {
        name: COMMUNITY,
        title: 'Rooms & Regulars',
        about: 'A public community for **places people return to**.',
        subscribers: 4,
        sum_pending: '0.000 HBD',
        context: params?.observer ? { subscribed: ['juniper-lane', 'paper-sparrow'].includes(params.observer) } : undefined,
      };
    }
    if (key === 'bridge.get_ranked_posts') return this.communityPosts;
    if (key === 'bridge.get_profiles') return (params?.accounts || []).map((name) => this.profiles[name]).filter(Boolean);
    if (key === 'bridge.get_profile') return this.profiles[params?.account] || null;
    if (key === 'bridge.list_subscribers') {
      return [
        ['juniper-lane', 'member', '', '2026-08-01T00:00:00'],
        ['paper-sparrow', 'member', '', '2026-08-02T00:00:00'],
        ['north-star', 'guest', '', '2026-08-03T00:00:00'],
        ['blue-cup', 'guest', '', '2026-08-04T00:00:00'],
      ];
    }
    if (key === 'bridge.get_account_posts') {
      if (params?.account === THREADS_ACCOUNT) return [this.container];
      if (params?.account === 'juniper-lane') return [this.communityPosts[0]];
      if (params?.account === 'north-star') return [this.communityPosts[1]];
      return [];
    }
    if (key === 'bridge.get_discussion') {
      return {
        [`${THREADS_ACCOUNT}/public-room-notes`]: this.container,
        'paper-sparrow/re-public-room-notes-1': this.threadOne,
        'juniper-lane/re-public-room-notes-2': this.threadTwo,
      };
    }
    if (key === 'condenser_api.get_followers') {
      const account = params?.[0];
      if (account === 'juniper-lane') {
        return [
          { follower: 'paper-sparrow', following: account },
          { follower: 'blue-cup', following: account },
        ];
      }
      return [];
    }
    if (key === 'condenser_api.get_following') {
      const account = params?.[0];
      if (account === 'juniper-lane') {
        return [
          { follower: account, following: 'north-star' },
          { follower: account, following: 'paper-sparrow' },
        ];
      }
      return [];
    }
    throw new Error(`Unexpected RPC call ${key}`);
  }
}

function socialBindings() {
  return Object.fromEntries(HOSTS.map(({ slug }) => [slug, SOCIAL_BINDING]));
}

function appWith({ rpc = new RealShapedSocialRpc(), store = new HiVenuesStore(), bindings = socialBindings() } = {}) {
  const hiveReadService = new HiveReadService(rpc, { pageSize: 10 });
  return {
    rpc,
    store,
    app: createDogfoodApp({
      store,
      hiveReadService,
      socialBindings: bindings,
    }),
  };
}

test('one real-Hive-shaped read service becomes three host-native social hubs', async () => {
  const { app, store, rpc } = appWith();
  const before = store.diagnostics();

  for (const host of HOSTS) {
    const response = await request(app)
      .get(`/hivenues/${host.slug}/community/updates`)
      .expect(200);

    assert.match(response.headers['cache-control'], /no-store/);
    assert.match(response.text, new RegExp(host.directionClass));
    assert.match(response.text, new RegExp(host.heading.replace(/[&]/g, '&amp;|&')));
    assert.match(response.text, /Why we return/);
    assert.match(response.text, /tiny zine by the door/);
    assert.match(response.text, /Juniper Lane/);
    assert.match(response.text, /Paper Sparrow/);
    assert.match(response.text, /People connected/);
    assert.match(response.text, /data-hivenues-identity/);
    assert.match(response.text, /data-identity-form/);
    assert.match(response.text, /fresh identity message only/);
    assert.match(response.text, /never receives your private key/);
    assert.doesNotMatch(
      response.text,
      />\s*(Follow|Unfollow|Subscribe|Unsubscribe|Vote|Upvote|Downvote|Post|Publish|Reply|Comment|Pay|Send)\s*</i,
    );
    assert.doesNotMatch(response.text, /Hive dashboard/i);
  }

  const rpcMethods = new Set(rpc.calls.map((call) => `${call.api}.${call.method}`));
  assert.equal(rpcMethods.has('bridge.get_community'), true);
  assert.equal(rpcMethods.has('bridge.get_ranked_posts'), true);
  assert.equal(rpcMethods.has('bridge.get_account_posts'), true);
  assert.equal(rpcMethods.has('bridge.get_discussion'), true);
  assert.equal(rpcMethods.has('bridge.list_subscribers'), true);
  assert.equal([...rpcMethods].some((method) => /broadcast|comment_options|custom_json|vote/.test(method)), false);
  assert.deepEqual(store.diagnostics(), before);
  assert.equal(store.publicSnapshot('northline-hall').draft.social, undefined);
  assert.equal(store.publicSnapshot('northline-hall').draft.profile, undefined);
});

test('member profile shows public connection and subscription context without write affordances', async () => {
  const { app, rpc } = appWith();
  const response = await request(app)
    .get('/hivenues/northline-hall/community/people/juniper-lane')
    .expect(200);

  assert.match(response.text, /Juniper Lane/);
  assert.match(response.text, /Printmaker, listener, and regular\./);
  assert.match(response.text, /Connected to this community on Hive\./);
  assert.match(response.text, /Why we return/);
  assert.match(response.text, /Paper Sparrow/);
  assert.match(response.text, /North Star/);
  assert.match(response.text, /These are public Hive connections shown as context only\. This page does not change them\./);
  assert.doesNotMatch(response.text, /<form\b/i);
  assert.doesNotMatch(response.text, /<button\b/i);
  assert.doesNotMatch(response.text, />\s*Follow\s*</i);
  assert.doesNotMatch(response.text, />\s*Subscribe\s*</i);

  const rpcMethods = new Set(rpc.calls.map((call) => `${call.api}.${call.method}`));
  assert.equal(rpcMethods.has('bridge.get_profile'), true);
  assert.equal(rpcMethods.has('condenser_api.get_followers'), true);
  assert.equal(rpcMethods.has('condenser_api.get_following'), true);
});

test('partial, unavailable, disconnected, and degraded social states stay explicit', async () => {
  const partial = appWith({ rpc: new RealShapedSocialRpc({ fail: ['bridge.get_discussion'] }) });
  const partialResponse = await request(partial.app)
    .get('/hivenues/nova-ashby/community/updates')
    .expect(200);
  assert.match(partialResponse.text, /Some community signals are temporarily missing\./);
  assert.match(partialResponse.text, /Why we return/);
  assert.doesNotMatch(partialResponse.text, /tiny zine by the door/);

  const unavailable = appWith({ rpc: new RealShapedSocialRpc({ fail: ['*'] }) });
  const unavailableResponse = await request(unavailable.app)
    .get('/hivenues/harbor-and-hearth/community/updates')
    .expect(200);
  assert.match(unavailableResponse.text, /Community updates are temporarily unavailable\./);
  assert.doesNotMatch(unavailableResponse.text, /Why we return/);

  const disconnectedApp = createDogfoodApp({ store: new HiVenuesStore() });
  const disconnected = await request(disconnectedApp)
    .get('/hivenues/northline-hall/community/updates')
    .expect(200);
  assert.match(disconnected.text, /Community updates are not connected for this place yet\./);

  const degraded = appWith({ bindings: { 'northline-hall': { community: 'not-hive', threadsAccount: 'Bad Account' } } });
  const degradedResponse = await request(degraded.app)
    .get('/hivenues/northline-hall/community/updates')
    .expect(200);
  assert.match(degradedResponse.text, /This community view cannot be shown safely right now\./);
});

test('social hub and member profile use Live host Direction rather than unreleased Working state', async () => {
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

  const { app } = appWith({ store });
  const hub = await request(app).get('/hivenues/northline-hall/community/updates').expect(200);
  const member = await request(app).get('/hivenues/northline-hall/community/people/juniper-lane').expect(200);
  assert.match(hub.text, /cc-social--poster/);
  assert.match(member.text, /cc-social--poster/);
  assert.doesNotMatch(hub.text, /cc-social--editorial/);
  assert.doesNotMatch(member.text, /cc-social--editorial/);
});

test('accepted discussion surface discovers the read-only updates and people layer', async () => {
  const { app } = appWith();
  for (const host of HOSTS) {
    const response = await request(app).get(`/hivenues/${host.slug}/community`).expect(200);
    assert.match(response.text, new RegExp(`/hivenues/${host.slug}/community/updates`));
  }
});

test('unknown hosts and unknown member profiles remain ordinary 404s', async () => {
  const { app } = appWith();
  await request(app).get('/hivenues/not-a-host/community/updates').expect(404);
  await request(app).get('/hivenues/northline-hall/community/people/not-found').expect(404);
  await request(app).get('/hivenues/northline-hall/community/people/INVALID%20NAME').expect(404);
});

'use strict';
/* global document, window, getComputedStyle */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const {
  createHiVenuesApp,
  startHiVenuesServer,
} = require('../src/product/app');
const {
  IDENTITY_COOKIE_NAME,
  createHiVenuesIdentityServices,
} = require('../src/product/identity');
const { CandidateCStore } = require('../src/candidate-c/store');

const OUTPUT_ROOT = process.env.HIVENUES_PRODUCT_BROWSER_ROOT
  || path.join('artifacts', 'product-browser', 'participation');
const EXACT_SHA = process.env.HIVENUES_PRODUCT_BROWSER_EXACT_SHA || 'LOCAL_UNBOUND';
const EXACT_TREE = process.env.HIVENUES_PRODUCT_BROWSER_EXACT_TREE || 'LOCAL_UNBOUND';
const COMMUNITY = 'hive-199299';
const THREADS_ACCOUNT = 'room-notes';
const SOCIAL_BINDING = Object.freeze({ community: COMMUNITY, threadsAccount: THREADS_ACCOUNT });
const DESKTOP = Object.freeze({ width: 1440, height: 1000 });
const MOBILE = Object.freeze({ width: 390, height: 844 });
const HOSTS = Object.freeze([
  Object.freeze({
    slug: 'northline-hall',
    family: 'poster',
    heading: 'Put your name to the wall',
  }),
  Object.freeze({
    slug: 'nova-ashby',
    family: 'editorial',
    heading: 'Sign the register',
  }),
  Object.freeze({
    slug: 'harbor-and-hearth',
    family: 'hospitality',
    heading: 'Introduce yourself',
  }),
]);

async function signingKey(seed = 'hivenues-era4-browser-identity') {
  const { PrivateKey } = await import('hive-tx');
  return PrivateKey.fromSeed(seed);
}

function signMessage(key, message) {
  const digest = crypto.createHash('sha256').update(message, 'utf8').digest();
  return key.sign(digest).customToString();
}

function socialBindings() {
  return Object.fromEntries(HOSTS.map((host) => [host.slug, SOCIAL_BINDING]));
}

function contentKey(author, permlink) {
  return String(author) + '/' + String(permlink);
}

function browserContentRecord({
  author,
  permlink,
  parentAuthor = '',
  parentPermlink,
  title = '',
  body,
  jsonMetadata,
  created = '2026-09-18T01:00:00',
}) {
  return {
    author,
    permlink,
    parentAuthor,
    parentPermlink,
    title,
    body,
    jsonMetadata,
    created,
  };
}

function normalizeBrowserContent(raw, replyCount = 0) {
  return {
    author: raw.author,
    permlink: raw.permlink,
    parentAuthor: raw.parentAuthor,
    parentPermlink: raw.parentPermlink,
    title: raw.title || 'Untitled',
    body: raw.body,
    bodyHtml: '<p>' + String(raw.body || '') + '</p>',
    excerpt: String(raw.body || ''),
    primaryImage: '',
    created: raw.created || '2026-09-18T01:00:00',
    updated: '',
    positiveVotes: 0,
    negativeVotes: 0,
    replyCount,
    payout: 0,
    depth: raw.parentAuthor ? 1 : 0,
  };
}

function productReadService(publicKey) {
  const rpcCalls = [];
  const followState = new Set();
  const communityState = new Set();
  const contentRecords = new Map();
  const followKey = (follower, following) => follower + '->' + following;
  const communityKey = (account, community) => account + '->' + community;

  const seedRoot = browserContentRecord({
    author: 'etblink',
    permlink: 'room-note',
    parentPermlink: COMMUNITY,
    title: 'A note from the room',
    body: 'This is the exact public body.',
    jsonMetadata: '{"tags":["hive-199299"],"app":"hivenues/1.0.0","format":"markdown"}',
  });
  const seedReply = browserContentRecord({
    author: 'juniper-lane',
    permlink: 're-room-note',
    parentAuthor: 'etblink',
    parentPermlink: 'room-note',
    body: 'I am here too.',
    jsonMetadata: '{"app":"hivenues/1.0.0","format":"markdown"}',
    created: '2026-09-18T01:05:00',
  });
  contentRecords.set(contentKey(seedRoot.author, seedRoot.permlink), seedRoot);
  contentRecords.set(contentKey(seedReply.author, seedReply.permlink), seedReply);

  function roots() {
    return Array.from(contentRecords.values())
      .filter((item) => item.parentAuthor === '' && item.parentPermlink === COMMUNITY);
  }

  function commentsFor(root) {
    const rootId = contentKey(root.author, root.permlink);
    const belongs = (item) => {
      let cursor = item;
      const seen = new Set();
      while (cursor?.parentAuthor) {
        const parentId = contentKey(cursor.parentAuthor, cursor.parentPermlink);
        if (parentId === rootId) return true;
        if (seen.has(parentId)) return false;
        seen.add(parentId);
        cursor = contentRecords.get(parentId);
      }
      return false;
    };
    return Array.from(contentRecords.values()).filter(
      (item) => item.parentAuthor && belongs(item),
    );
  }

  const service = {
    rpcPool: {
      calls: rpcCalls,
      async call(api, method, params) {
        rpcCalls.push({ api, method, params: structuredClone(params) });
        assert.equal(api + '.' + method, 'condenser_api.get_accounts');
        return (params?.[0] || []).map((name) => ({
          name,
          posting: {
            weight_threshold: 1,
            account_auths: [],
            key_auths: [[publicKey, 1]],
          },
        }));
      },
    },
    async getCommunity(name) {
      return {
        name,
        title: 'Rooms & Regulars',
        aboutHtml: '<p>A public community around this place.</p>',
        subscriberCount: 3,
      };
    },
    async getCommunityPosts() {
      const items = roots().map((item) => normalizeBrowserContent(
        item,
        commentsFor(item).length,
      ));
      return {
        items,
        profiles: {
          etblink: {
            name: 'etblink',
            displayName: 'Evan',
            profileImage: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E',
          },
        },
        nextCursor: null,
      };
    },
    async getLatestThreads() {
      return { container: null, threads: [], profiles: {} };
    },
    async listCommunitySubscribers() {
      return [];
    },
    async getProfiles(accounts = []) {
      return Object.fromEntries(accounts.map((name) => [name, {
        name,
        displayName: name,
        about: '',
        profileImage: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E',
      }]));
    },
    async getProfile(account) {
      return {
        name: account,
        displayName: account,
        about: '',
        profileImage: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E',
        followerCount: 0,
        followingCount: 0,
        postCount: roots().filter((item) => item.author === account).length,
      };
    },
    async getAccountPosts({ account } = {}) {
      return {
        items: roots()
          .filter((item) => !account || item.author === account)
          .map((item) => normalizeBrowserContent(item, commentsFor(item).length)),
        profiles: {},
        nextCursor: null,
      };
    },
    async getFollowers() {
      return { items: [], nextCursor: null };
    },
    async getFollowing() {
      return { items: [], nextCursor: null };
    },
    async getFollowStatus(follower, following) {
      return followState.has(followKey(follower, following));
    },
    async isCommunityMember(account, community) {
      return communityState.has(communityKey(account, community));
    },
    setFollowState(follower, following, value) {
      const key = followKey(follower, following);
      if (value) followState.add(key);
      else followState.delete(key);
    },
    setCommunityState(account, community, value) {
      const key = communityKey(account, community);
      if (value) communityState.add(key);
      else communityState.delete(key);
    },
    async observeSocialOperation(record) {
      const operation = record?.operations?.[0];
      const [type, value] = Array.isArray(operation) ? operation : [];
      if (type === 'custom_json' && value?.id === 'follow') {
        const [, payload] = JSON.parse(value.json);
        const following = Array.isArray(payload?.what) && payload.what.includes('blog');
        return followState.has(followKey(payload.follower, payload.following)) === following;
      }
      if (type === 'custom_json' && value?.id === 'community') {
        const [action, payload] = JSON.parse(value.json);
        const subscribed = action === 'subscribe';
        return communityState.has(communityKey(record.account, payload.community)) === subscribed;
      }
      return false;
    },
    async getContentRecord(author, permlink) {
      const value = contentRecords.get(contentKey(author, permlink));
      return value ? structuredClone(value) : null;
    },
    async getPostWithComments(author, permlink) {
      const root = contentRecords.get(contentKey(author, permlink));
      if (!root || root.parentAuthor !== '' || root.parentPermlink !== COMMUNITY) {
        const error = new Error('Post not found');
        error.statusCode = 404;
        error.expose = true;
        error.code = 'NOT_FOUND';
        throw error;
      }
      const comments = commentsFor(root);
      return {
        post: normalizeBrowserContent(root, comments.length),
        comments: comments.map((item) => normalizeBrowserContent(item, 0)),
        profiles: Object.fromEntries(
          Array.from(new Set([root.author, ...comments.map((item) => item.author)]))
            .map((name) => [name, { name, displayName: name }]),
        ),
      };
    },
    async observeContentOperation(record) {
      const [type, value] = record?.operations?.[0] || [];
      if (type !== 'comment' || !value) return false;
      const observed = contentRecords.get(contentKey(value.author, value.permlink));
      if (!observed) return false;
      return observed.author === value.author
        && observed.permlink === value.permlink
        && observed.parentAuthor === value.parent_author
        && observed.parentPermlink === value.parent_permlink
        && observed.title === value.title
        && observed.body === value.body
        && observed.jsonMetadata === value.json_metadata;
    },
    applyContentOperation(value) {
      const key = contentKey(value.author, value.permlink);
      const existing = contentRecords.get(key);
      contentRecords.set(key, browserContentRecord({
        author: value.author,
        permlink: value.permlink,
        parentAuthor: value.parent_author,
        parentPermlink: value.parent_permlink,
        title: value.title,
        body: value.body,
        jsonMetadata: value.json_metadata,
        created: existing?.created || '2026-09-18T02:00:00',
      }));
    },
    contentSnapshot() {
      return Array.from(contentRecords.values()).map((item) => structuredClone(item));
    },
  };

  return service;
}

function applyAuthorizedRelationshipOperation(hiveReadService, account, operations, counters) {
  assert.equal(Array.isArray(operations), true);
  assert.equal(operations.length, 1);
  const [type, value] = operations[0];
  assert.equal(type, 'custom_json');
  assert.deepEqual(value.required_auths, []);
  assert.deepEqual(value.required_posting_auths, [account]);

  if (value.id === 'follow') {
    const [action, payload] = JSON.parse(value.json);
    assert.equal(action, 'follow');
    assert.equal(payload.follower, account);
    assert.equal(typeof payload.following, 'string');
    const following = Array.isArray(payload.what) && payload.what.includes('blog');
    hiveReadService.setFollowState(account, payload.following, following);
  } else if (value.id === 'community') {
    const [action, payload] = JSON.parse(value.json);
    assert.ok(['subscribe', 'unsubscribe'].includes(action));
    assert.equal(payload.community, COMMUNITY);
    hiveReadService.setCommunityState(account, payload.community, action === 'subscribe');
  } else {
    assert.fail('unauthorized wallet operation id: ' + String(value.id));
  }

  counters.walletBroadcasts.push({
    account,
    operations: structuredClone(operations),
  });
  return crypto.createHash('sha1')
    .update(JSON.stringify([account, operations, counters.walletBroadcasts.length]))
    .digest('hex');
}


function applyAuthorizedContentOperation(hiveReadService, account, operations, counters) {
  assert.equal(Array.isArray(operations), true);
  assert.equal(operations.length, 1);
  const [type, value] = operations[0];
  assert.equal(type, 'comment');
  assert.equal(value.author, account);
  assert.equal(typeof value.permlink, 'string');
  assert.equal(typeof value.body, 'string');
  assert.equal(typeof value.json_metadata, 'string');
  hiveReadService.applyContentOperation(value);
  counters.contentBroadcasts.push({
    account,
    operations: structuredClone(operations),
  });
  return crypto.createHash('sha1')
    .update(JSON.stringify([account, operations, counters.contentBroadcasts.length]))
    .digest('hex');
}

async function createAuthenticatedContext(
  browser,
  counters,
  origin,
  identityServices,
  account = 'etblink',
  viewport = DESKTOP,
) {
  const context = await createTrackedContext(browser, counters, viewport);
  const { token } = identityServices.sessionStore.create(account);
  await context.addCookies([{
    name: IDENTITY_COOKIE_NAME,
    value: token,
    url: origin,
    httpOnly: true,
    sameSite: 'Strict',
  }]);
  return context;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isLocalRequest(url) {
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return true;
  try {
    return ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function stopServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    const forceTimer = setTimeout(() => server.closeAllConnections?.(), 1000);
    forceTimer.unref?.();
    server.close((error) => {
      clearTimeout(forceTimer);
      if (error) reject(error);
      else resolve();
    });
  });
}

async function pageAudit(page, axeSource, label) {
  await page.addScriptTag({ content: axeSource });
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    incompleteImages: Array.from(document.images)
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .length,
  }));
  const controls = await page.evaluate(() => {
    const held = /\b(vote|upvote|downvote|pay|send|tip|transfer|claim|reward)\b/i;
    const unauthorized = Array.from(document.querySelectorAll('a, button, input[type="submit"], [role="button"]'))
      .map((node) => ({
        text: (node.textContent || node.value || '').trim(),
        tag: node.tagName,
      }))
      .filter((item) => held.test(item.text));
    const relationship = Array.from(document.querySelectorAll('[data-hivenues-participation]'))
      .map((root) => ({
        action: root.dataset.participationAction || '',
        target: root.dataset.participationTarget || '',
        button: root.querySelector('[data-participation-submit]')?.textContent?.trim() || '',
      }));
    const invalidRelationship = relationship.filter(
      (item) => !['follow', 'unfollow', 'subscribe', 'unsubscribe'].includes(item.action),
    );
    const content = Array.from(document.querySelectorAll('[data-hivenues-content]'))
      .map((root) => ({
        mode: root.dataset.contentMode || '',
        actor: root.dataset.contentActor || '',
        target: root.dataset.contentTarget || '',
      }));
    const invalidContent = content.filter(
      (item) => !['post', 'update', 'reply'].includes(item.mode),
    );
    return { unauthorized, relationship, invalidRelationship, content, invalidContent };
  });
  const accessibility = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    const blocking = result.violations.filter((item) => ['serious', 'critical'].includes(item.impact));
    return {
      violationCount: result.violations.length,
      blockingCount: blocking.length,
      blocking: blocking.map((item) => ({
        id: item.id,
        impact: item.impact,
        nodes: item.nodes.slice(0, 5).map((node) => node.target),
      })),
    };
  });

  assert.equal(geometry.overflow, false, label + ': horizontal overflow');
  assert.equal(geometry.incompleteImages, 0, label + ': incomplete images');
  assert.deepEqual(controls.unauthorized, [], label + ': unauthorized held-write controls');
  assert.deepEqual(controls.invalidRelationship, [], label + ': invalid relationship controls');
  assert.deepEqual(controls.invalidContent, [], label + ': invalid content controls');
  assert.equal(
    accessibility.blockingCount,
    0,
    label + ': blocking accessibility ' + JSON.stringify(accessibility.blocking),
  );

  return { label, geometry, controls, accessibility };
}

async function capture(page, axeSource, manifest, label) {
  const audit = await pageAudit(page, axeSource, label);
  const file = label + '.png';
  const filePath = path.join(OUTPUT_ROOT, file);
  await page.screenshot({ path: filePath, fullPage: true, animations: 'disabled' });
  const fingerprint = await page.evaluate(() => ({
    bodyClass: document.body.className,
    identityState: document.querySelector('[data-hivenues-identity]')?.dataset.identityState || '',
    identityHeading: document.querySelector('.cc-identity h2')?.textContent?.trim() || '',
    background: getComputedStyle(document.body).backgroundColor,
  }));
  const record = {
    file,
    label,
    viewport: await page.viewportSize(),
    sha256: sha256File(filePath),
    fingerprint,
  };
  manifest.audits.push(audit);
  manifest.screenshots.push(record);
  return record;
}

async function createTrackedContext(browser, counters, viewport = DESKTOP) {
  const context = await browser.newContext({ viewport });
  context.on('request', (request) => {
    const url = request.url();
    counters.requests.push(url);
    if (!isLocalRequest(url)) counters.externalRequests.push(url);
  });
  return context;
}

async function runDirectionEvidence(browser, axeSource, origin, manifest, counters) {
  const context = await createTrackedContext(browser, counters);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    for (const host of HOSTS) {
      for (const [viewportName, viewport] of [['desktop', DESKTOP], ['mobile390', MOBILE]]) {
        await page.setViewportSize(viewport);
        await page.goto(
          origin + '/candidate-c/' + host.slug + '/community/updates',
          { waitUntil: 'networkidle' },
        );
        await page.locator('[data-identity-state="not-identified"]').waitFor();
        const text = await page.locator('.cc-identity').textContent();
        assert.ok(text.includes(host.heading), host.slug + ': Direction identity heading missing');
        assert.ok(text.includes('private key'), host.slug + ': key-custody truth missing');
        assert.ok(text.includes('does not post'), host.slug + ': consequence truth missing');
        const record = await capture(
          page,
          axeSource,
          manifest,
          host.family + '-' + viewportName + '-not-identified',
        );
        assert.ok(
          record.fingerprint.bodyClass.includes('cc-social--' + host.family),
          host.family + ': Direction body class missing',
        );
      }
    }
    const desktop = manifest.screenshots.filter((item) => item.label.endsWith('-desktop-not-identified'));
    assert.equal(desktop.length, 3);
    assert.equal(new Set(desktop.map((item) => item.sha256)).size, 3);
    assert.equal(new Set(desktop.map((item) => item.fingerprint.background)).size, 3);
  } finally {
    await context.close();
  }
}

async function installApprovalWallet(context, key, publicKey) {
  await context.exposeFunction('hivenuesSignIdentity', async (_account, message) => ({
    signature: signMessage(key, message),
    publicKey,
  }));
  await context.addInitScript(() => {
    let keychainApi = null;
    Object.defineProperty(window, 'HiVenuesKeychain', {
      configurable: true,
      get() {
        return keychainApi;
      },
      set(api) {
        class SyntheticRelationshipWallet extends api.KeychainAdapter {
          async broadcast(args) {
            window.__relationshipApproval = args;
            return new Promise((resolve, reject) => {
              window.__resolveRelationshipApproval = resolve;
              window.__rejectRelationshipApproval = reject;
            });
          }
        }
        keychainApi = Object.freeze({
          ...api,
          KeychainAdapter: SyntheticRelationshipWallet,
        });
      },
    });

    window.hive_keychain = {
      requestHandshake(callback) {
        callback({ success: true });
      },
      requestSignBuffer(account, message, authority, callback, _memo, title) {
        window.__identityApproval = { account, message, authority, callback, title };
      },
    };
    window.__approveIdentity = async () => {
      const pending = window.__identityApproval;
      if (!pending) throw new Error('No identity approval is pending.');
      const signed = await window.hivenuesSignIdentity(pending.account, pending.message);
      pending.callback({
        success: true,
        result: signed.signature,
        publicKey: signed.publicKey,
        data: {
          username: pending.account,
          message: pending.message,
        },
      });
    };
  });
}

async function inspectPendingRelationship(page) {
  return page.evaluate(() => ({
    account: window.__relationshipApproval?.account || '',
    authority: window.__relationshipApproval?.authority || '',
    operations: window.__relationshipApproval?.operations || [],
  }));
}

async function approvePendingRelationship(page, hiveReadService, counters) {
  const pending = await inspectPendingRelationship(page);
  assert.equal(pending.account, 'etblink');
  assert.equal(pending.authority, 'Posting');
  const transactionId = applyAuthorizedRelationshipOperation(
    hiveReadService,
    pending.account,
    pending.operations,
    counters,
  );
  await page.evaluate((tx) => {
    window.__resolveRelationshipApproval({
      accepted: true,
      transactionId: tx,
    });
  }, transactionId);
  return { ...pending, transactionId };
}

async function rejectPendingRelationship(page, code = 'KEYCHAIN_CANCELLED') {
  await page.evaluate((value) => {
    const error = new Error('Synthetic wallet rejection');
    error.code = value;
    window.__rejectRelationshipApproval(error);
  }, code);
}

async function runApprovalEvidence(browser, axeSource, origin, manifest, counters, key, publicKey) {
  const context = await createTrackedContext(browser, counters);
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(origin + '/candidate-c/northline-hall/community/updates', { waitUntil: 'networkidle' });
    await page.locator('[data-identity-account]').fill('etblink');
    await page.locator('[data-identity-submit]').click();
    await page.locator('[data-identity-state="awaiting-wallet"]').waitFor();
    await capture(page, axeSource, manifest, 'poster-desktop-awaiting-wallet');

    const walletState = await page.evaluate(() => ({
      account: window.__identityApproval?.account,
      authority: window.__identityApproval?.authority,
      title: window.__identityApproval?.title,
      message: window.__identityApproval?.message,
    }));
    assert.equal(walletState.account, 'etblink');
    assert.equal(walletState.authority, 'Posting');
    assert.match(walletState.title, /HiVenues identity proof/);
    assert.match(walletState.message, /no Hive transaction or value action is authorized/);

    await page.evaluate(() => window.__approveIdentity());
    await page.locator('[data-identity-state="verified"]').waitFor({ timeout: 15000 });
    const verified = await capture(page, axeSource, manifest, 'poster-desktop-verified');
    assert.equal(verified.fingerprint.identityState, 'verified');
    assert.match(await page.locator('.cc-identity').textContent(), /@etblink/);
    assert.match(
      await page.locator('.cc-identity').textContent(),
      /does not authorize a post, vote, follow, payment, or other Hive transaction/,
    );

    await page.locator('[data-identity-disconnect]').click();
    await page.locator('[data-identity-state="not-identified"]').waitFor({ timeout: 15000 });
    assert.match(
      await page.locator('.cc-identity').textContent(),
      /Public browsing stays open whether or not you identify yourself/,
    );
  } finally {
    await context.close();
  }
}

async function runRelationshipDirectionEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    for (const host of HOSTS) {
      for (const [viewportName, viewport] of [['desktop', DESKTOP], ['mobile390', MOBILE]]) {
        await page.setViewportSize(viewport);
        await page.goto(
          origin + '/candidate-c/' + host.slug + '/community/updates',
          { waitUntil: 'networkidle' },
        );
        const control = page.locator('[data-hivenues-participation]');
        await control.waitFor();
        assert.equal(await control.getAttribute('data-participation-action'), 'subscribe');
        assert.equal(await control.getAttribute('data-participation-target'), COMMUNITY);
        const composer = page.locator('[data-hivenues-content][data-content-mode="post"]');
        await composer.waitFor();
        assert.equal(await composer.getAttribute('data-content-actor'), 'etblink');
        assert.match(await composer.textContent(), /Review|public|wallet/i);
        await capture(
          page,
          axeSource,
          manifest,
          host.family + '-' + viewportName + '-community-ready',
        );
      }

      await page.setViewportSize(DESKTOP);
      await page.goto(
        origin + '/candidate-c/' + host.slug + '/community/people/juniper-lane',
        { waitUntil: 'networkidle' },
      );
      const follow = page.locator('[data-hivenues-participation]');
      await follow.waitFor();
      assert.equal(await follow.getAttribute('data-participation-action'), 'follow');
      assert.equal(await follow.getAttribute('data-participation-target'), 'juniper-lane');
      await capture(
        page,
        axeSource,
        manifest,
        host.family + '-desktop-follow-ready',
      );
    }
  } finally {
    await context.close();
  }
}

async function runRelationshipJourneys(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  hiveReadService,
  key,
  publicKey,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
  );
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  async function reviewAndApprove(expectedAction, expectedId, labelPrefix) {
    const root = page.locator('[data-hivenues-participation]');
    assert.equal(await root.getAttribute('data-participation-action'), expectedAction);
    await root.locator('[data-participation-submit]').click();
    await page.locator('[data-participation-review][open]').waitFor();
    assert.equal(await root.getAttribute('data-participation-state'), 'review');
    const reviewText = await page.locator('[data-participation-review]').textContent();
    assert.match(reviewText, /Verified account/);
    assert.match(reviewText, new RegExp(expectedAction));
    assert.match(reviewText, /Posting|Technical operation details/i);
    await capture(page, axeSource, manifest, labelPrefix + '-review');

    await page.locator('[data-participation-confirm]').click();
    await page.locator('[data-participation-state="awaiting-wallet"]').waitFor();
    await capture(page, axeSource, manifest, labelPrefix + '-awaiting-wallet');

    const pending = await inspectPendingRelationship(page);
    assert.equal(pending.account, 'etblink');
    assert.equal(pending.authority, 'Posting');
    assert.equal(pending.operations.length, 1);
    assert.equal(pending.operations[0][0], 'custom_json');
    assert.equal(pending.operations[0][1].id, expectedId);
    return approvePendingRelationship(page, hiveReadService, counters);
  }

  try {
    await page.goto(origin + '/candidate-c/northline-hall/community/updates', {
      waitUntil: 'networkidle',
    });
    await reviewAndApprove('subscribe', 'community', 'poster-community-subscribe');
    await page.waitForFunction(() => (
      document.querySelector('[data-hivenues-participation]')?.dataset.participationAction === 'unsubscribe'
    ));
    assert.equal(await hiveReadService.isCommunityMember('etblink', COMMUNITY), true);
    await capture(page, axeSource, manifest, 'poster-community-subscribed');

    await reviewAndApprove('unsubscribe', 'community', 'poster-community-unsubscribe');
    await page.waitForFunction(() => (
      document.querySelector('[data-hivenues-participation]')?.dataset.participationAction === 'subscribe'
    ));
    assert.equal(await hiveReadService.isCommunityMember('etblink', COMMUNITY), false);
    await capture(page, axeSource, manifest, 'poster-community-unsubscribed');

    await page.goto(
      origin + '/candidate-c/northline-hall/community/people/juniper-lane',
      { waitUntil: 'networkidle' },
    );
    await reviewAndApprove('follow', 'follow', 'poster-follow');
    await page.waitForFunction(() => (
      document.querySelector('[data-hivenues-participation]')?.dataset.participationAction === 'unfollow'
    ));
    assert.equal(await hiveReadService.getFollowStatus('etblink', 'juniper-lane'), true);
    await capture(page, axeSource, manifest, 'poster-follow-confirmed');

    await reviewAndApprove('unfollow', 'follow', 'poster-unfollow');
    await page.waitForFunction(() => (
      document.querySelector('[data-hivenues-participation]')?.dataset.participationAction === 'follow'
    ));
    assert.equal(await hiveReadService.getFollowStatus('etblink', 'juniper-lane'), false);
    await capture(page, axeSource, manifest, 'poster-unfollow-confirmed');
  } finally {
    await context.close();
  }
}

async function runRelationshipCancellationEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  hiveReadService,
  key,
  publicKey,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
    'paper-sparrow',
  );
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(origin + '/candidate-c/nova-ashby/community/updates', {
      waitUntil: 'networkidle',
    });
    const root = page.locator('[data-hivenues-participation]');
    await root.locator('[data-participation-submit]').click();
    await page.locator('[data-participation-review][open]').waitFor();
    await page.locator('[data-participation-confirm]').click();
    await page.locator('[data-participation-state="awaiting-wallet"]').waitFor();
    await rejectPendingRelationship(page);
    await page.locator('[data-participation-state="cancelled"]').waitFor();
    assert.equal(await hiveReadService.isCommunityMember('paper-sparrow', COMMUNITY), false);
    assert.match(
      await root.locator('[data-participation-status]').textContent(),
      /Nothing was broadcast/,
    );
    await capture(page, axeSource, manifest, 'editorial-community-wallet-cancelled');
  } finally {
    await context.close();
  }
}

async function runRelationshipProviderUnavailableEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  hiveReadService,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
    'blue-cup',
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(
      origin + '/candidate-c/harbor-and-hearth/community/people/juniper-lane',
      { waitUntil: 'networkidle' },
    );
    const root = page.locator('[data-hivenues-participation]');
    await root.locator('[data-participation-submit]').click();
    await page.locator('[data-participation-review][open]').waitFor();
    await page.locator('[data-participation-confirm]').click();
    await page.locator('[data-participation-state="provider-unavailable"]').waitFor();
    assert.equal(await hiveReadService.getFollowStatus('blue-cup', 'juniper-lane'), false);
    assert.match(
      await root.locator('[data-participation-status]').textContent(),
      /(Hive Keychain was not found|human-owned Hive wallet)/i,
    );
    await capture(page, axeSource, manifest, 'hospitality-follow-wallet-unavailable');
  } finally {
    await context.close();
  }
}

async function approvePendingContent(page, hiveReadService, counters) {
  const pending = await inspectPendingRelationship(page);
  assert.equal(pending.account, 'etblink');
  assert.equal(pending.authority, 'Posting');
  assert.equal(pending.operations.length, 1);
  assert.equal(pending.operations[0][0], 'comment');
  const transactionId = applyAuthorizedContentOperation(
    hiveReadService,
    pending.account,
    pending.operations,
    counters,
  );
  await page.evaluate((tx) => {
    window.__resolveRelationshipApproval({
      accepted: true,
      transactionId: tx,
    });
  }, transactionId);
  return { ...pending, transactionId };
}

async function runContentJourneys(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  hiveReadService,
  key,
  publicKey,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
  );
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  async function reviewAndApprove(root, expectedAction, labelPrefix) {
    await root.locator('[data-content-submit]').click();
    const dialog = root.locator('[data-content-review][open]');
    await dialog.waitFor();
    assert.equal(await root.getAttribute('data-content-state'), 'review');
    assert.equal(await dialog.locator('[data-content-review-action]').textContent(), expectedAction);
    assert.equal(await dialog.locator('[data-content-review-account]').textContent(), '@etblink');
    assert.match(await dialog.locator('[data-content-review-operations]').textContent(), /"comment"/);
    await capture(page, axeSource, manifest, labelPrefix + '-review');

    await dialog.locator('[data-content-confirm]').click();
    await page.locator('[data-content-state="awaiting-wallet"]').waitFor();
    await capture(page, axeSource, manifest, labelPrefix + '-awaiting-wallet');
    return approvePendingContent(page, hiveReadService, counters);
  }

  try {
    await page.goto(origin + '/candidate-c/northline-hall/community/updates', {
      waitUntil: 'networkidle',
    });
    const post = page.locator('[data-hivenues-content][data-content-mode="post"]');
    await post.locator('[data-content-title]').fill('Browser-qualified room note');
    await post.locator('[data-content-body]').fill('Published through the exact Stage 3 human-wallet path.');
    await reviewAndApprove(post, 'post', 'poster-content-post');
    await page.waitForURL(/\/candidate-c\/northline-hall\/community\/posts\/etblink\//, {
      timeout: 15000,
    });
    await page.getByText('Browser-qualified room note', { exact: true }).first().waitFor();
    await capture(page, axeSource, manifest, 'poster-content-post-confirmed');

    await page.locator('.cc-content-task--update > summary').click();
    const update = page.locator('[data-hivenues-content][data-content-mode="update"]');
    await update.locator('[data-content-title]').fill('Browser-qualified room note — revised');
    await update.locator('[data-content-body]').fill('The same public post, revised through my own wallet.');
    await update.locator('[data-content-submit]').click();
    const updateDialog = update.locator('[data-content-review][open]');
    await updateDialog.waitFor();
    assert.match(await updateDialog.textContent(), /Currently public/);
    assert.match(await updateDialog.textContent(), /After this update/);
    assert.match(await updateDialog.textContent(), /Browser-qualified room note/);
    assert.match(await updateDialog.textContent(), /Browser-qualified room note — revised/);
    await capture(page, axeSource, manifest, 'poster-content-update-review');
    await updateDialog.locator('[data-content-confirm]').click();
    await page.locator('[data-content-state="awaiting-wallet"]').waitFor();
    await capture(page, axeSource, manifest, 'poster-content-update-awaiting-wallet');
    await approvePendingContent(page, hiveReadService, counters);
    await page.waitForLoadState('networkidle');
    await page.getByText('Browser-qualified room note — revised', { exact: true }).first().waitFor({
      timeout: 15000,
    });
    await capture(page, axeSource, manifest, 'poster-content-update-confirmed');

    const reply = page.locator('[data-hivenues-content][data-content-mode="reply"]').first();
    await reply.locator('[data-content-body]').fill('A browser-qualified public response.');
    await reviewAndApprove(reply, 'reply', 'poster-content-reply');
    await page.waitForLoadState('networkidle');
    await page.getByText('A browser-qualified public response.', { exact: true }).first().waitFor({
      timeout: 15000,
    });
    await capture(page, axeSource, manifest, 'poster-content-reply-confirmed');
  } finally {
    await context.close();
  }
}

async function runContentCancellationEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  key,
  publicKey,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
    'paper-sparrow',
  );
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(origin + '/candidate-c/nova-ashby/community/updates', {
      waitUntil: 'networkidle',
    });
    const root = page.locator('[data-hivenues-content][data-content-mode="post"]');
    await root.locator('[data-content-title]').fill('Cancelled dispatch');
    await root.locator('[data-content-body]').fill('This must never become canonical content.');
    await root.locator('[data-content-submit]').click();
    await root.locator('[data-content-review][open]').waitFor();
    await root.locator('[data-content-confirm]').click();
    await page.locator('[data-content-state="awaiting-wallet"]').waitFor();
    await rejectPendingRelationship(page);
    await page.locator('[data-content-state="cancelled"]').waitFor();
    assert.match(
      await root.locator('[data-content-status]').textContent(),
      /Nothing was published/,
    );
    await capture(page, axeSource, manifest, 'editorial-content-wallet-cancelled');
  } finally {
    await context.close();
  }
}

async function runContentProviderUnavailableEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
    'blue-cup',
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(origin + '/candidate-c/harbor-and-hearth/community/updates', {
      waitUntil: 'networkidle',
    });
    const root = page.locator('[data-hivenues-content][data-content-mode="post"]');
    await root.locator('[data-content-title]').fill('Unavailable note');
    await root.locator('[data-content-body]').fill('This stays a draft because no human wallet is available.');
    await root.locator('[data-content-submit]').click();
    await root.locator('[data-content-review][open]').waitFor();
    await root.locator('[data-content-confirm]').click();
    await page.locator('[data-content-state="provider-unavailable"]').waitFor();
    assert.match(
      await root.locator('[data-content-status]').textContent(),
      /human-owned Hive wallet/i,
    );
    await capture(page, axeSource, manifest, 'hospitality-content-wallet-unavailable');
  } finally {
    await context.close();
  }
}

async function runCancellationEvidence(browser, axeSource, origin, manifest, counters) {
  const context = await createTrackedContext(browser, counters);
  await context.addInitScript(() => {
    window.hive_keychain = {
      requestHandshake(callback) {
        callback({ success: true });
      },
      requestSignBuffer(_account, _message, _authority, callback) {
        callback({ success: false, error: 'User cancelled the request.' });
      },
    };
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(origin + '/candidate-c/nova-ashby/community/updates', { waitUntil: 'networkidle' });
    await page.locator('[data-identity-account]').fill('etblink');
    await page.locator('[data-identity-submit]').click();
    await page.locator('[data-identity-state="cancelled"]').waitFor();
    const text = await page.locator('.cc-identity').textContent();
    assert.match(text, /No Hive transaction or participation action occurred/);
    await capture(page, axeSource, manifest, 'editorial-desktop-cancelled');
  } finally {
    await context.close();
  }
}

async function runUnavailableEvidence(browser, axeSource, publicKey, manifest) {
  const store = new CandidateCStore();
  const before = store.diagnostics();
  const hiveReadService = productReadService(publicKey);
  const app = createHiVenuesApp({
    store,
    hiveReadService,
    socialBindings: socialBindings(),
    identityServices: false,
  });
  const server = await startHiVenuesServer(app, { port: 0 });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const counters = { requests: [], externalRequests: [], consoleErrors: [] };
  const context = await createTrackedContext(browser, counters);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(origin + '/candidate-c/harbor-and-hearth/community/updates', { waitUntil: 'networkidle' });
    await page.locator('[data-identity-state="provider-unavailable"]').waitFor();
    assert.match(
      await page.locator('.cc-identity').textContent(),
      /keep browsing this public community without signing in/,
    );
    await capture(page, axeSource, manifest, 'hospitality-desktop-provider-unavailable');
    assert.deepEqual(store.diagnostics(), before);
    assert.deepEqual(counters.externalRequests, []);
    assert.deepEqual(counters.consoleErrors, []);
  } finally {
    await context.close();
    await stopServer(server);
  }
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });

  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const key = await signingKey();
  const publicKey = key.createPublic().toString();
  const store = new CandidateCStore();
  const before = store.diagnostics();
  const beforePublicSnapshots = Object.fromEntries(
    HOSTS.map(({ slug }) => [slug, JSON.stringify(store.publicSnapshot(slug))]),
  );
  const hiveReadService = productReadService(publicKey);
  const identityServices = createHiVenuesIdentityServices({
    hiveReadService,
    sessionSecret: 'product-browser-identity-session-secret-0001',
  });
  const app = createHiVenuesApp({
    store,
    hiveReadService,
    identityServices,
    socialBindings: socialBindings(),
  });
  const server = await startHiVenuesServer(app, { port: 0 });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const counters = {
    requests: [],
    externalRequests: [],
    consoleErrors: [],
    walletBroadcasts: [],
    contentBroadcasts: [],
  };
  const manifest = {
    qualification: 'hivenues-product-browser-participation',
    candidate: EXACT_SHA,
    tree: EXACT_TREE,
    synthetic: true,
    liveHiveRequired: false,
    screenshots: [],
    audits: [],
    scenarios: [
      'three-direction-not-identified',
      'awaiting-wallet',
      'verified',
      'disconnect',
      'wallet-cancelled',
      'provider-unavailable',
      'three-direction-community-controls',
      'three-direction-follow-controls',
      'community-subscribe',
      'community-unsubscribe',
      'follow',
      'unfollow',
      'relationship-wallet-cancelled',
      'relationship-wallet-unavailable',
      'three-direction-content-composers',
      'root-post',
      'own-post-update',
      'reply',
      'content-wallet-cancelled',
      'content-wallet-unavailable',
    ],
  };

  try {
    await runDirectionEvidence(browser, axeSource, origin, manifest, counters);
    await runApprovalEvidence(browser, axeSource, origin, manifest, counters, key, publicKey);
    await runCancellationEvidence(browser, axeSource, origin, manifest, counters);
    await runUnavailableEvidence(browser, axeSource, publicKey, manifest);
    await runRelationshipDirectionEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
    );
    await runRelationshipJourneys(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      hiveReadService,
      key,
      publicKey,
    );
    await runRelationshipCancellationEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      hiveReadService,
      key,
      publicKey,
    );
    await runRelationshipProviderUnavailableEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      hiveReadService,
    );
    await runContentJourneys(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      hiveReadService,
      key,
      publicKey,
    );
    await runContentCancellationEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      key,
      publicKey,
    );
    await runContentProviderUnavailableEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
    );
  } finally {
    await browser.close();
    await stopServer(server);
  }

  assert.deepEqual(store.diagnostics(), before, 'identity browser journey mutated HostGraph diagnostics');
  for (const { slug } of HOSTS) {
    assert.equal(
      JSON.stringify(store.publicSnapshot(slug)),
      beforePublicSnapshots[slug],
      slug + ': identity browser journey mutated the public Host snapshot',
    );
  }
  assert.deepEqual(counters.externalRequests, [], 'unexpected external browser requests');
  assert.deepEqual(counters.consoleErrors, [], 'unexpected console/page errors');

  const observedPaths = counters.requests
    .filter((url) => isLocalRequest(url))
    .map((url) => {
      try { return new URL(url).pathname; } catch { return ''; }
    });
  const mutatingIdentityPaths = new Set(
    observedPaths.filter((value) => ['/identity/challenge', '/identity/verify', '/identity/disconnect'].includes(value)),
  );
  assert.equal(mutatingIdentityPaths.has('/identity/challenge'), true);
  assert.equal(mutatingIdentityPaths.has('/identity/verify'), true);
  assert.equal(mutatingIdentityPaths.has('/identity/disconnect'), true);
  assert.equal(
    observedPaths.some((value) => /\/(vote|payment|pay|send|transfer|broadcast|reward|claim)\b/i.test(value)),
    false,
    'browser invoked a held mutation path',
  );
  assert.equal(
    observedPaths.some((value) => /\/participation\/[^/]+\/community\/(subscribe|unsubscribe)$/.test(value)),
    true,
    'browser never exercised community participation',
  );
  assert.equal(
    observedPaths.some((value) => /\/participation\/[^/]+\/people\/[^/]+\/(follow|unfollow)$/.test(value)),
    true,
    'browser never exercised follow participation',
  );
  assert.equal(counters.walletBroadcasts.length, 4);
  assert.deepEqual(
    counters.walletBroadcasts.map((entry) => {
      const operation = entry.operations[0][1];
      return operation.id === 'community'
        ? JSON.parse(operation.json)[0]
        : (JSON.parse(operation.json)[1].what.length ? 'follow' : 'unfollow');
    }),
    ['subscribe', 'unsubscribe', 'follow', 'unfollow'],
  );
  assert.equal(counters.contentBroadcasts.length, 3);
  assert.deepEqual(
    counters.contentBroadcasts.map((entry) => entry.operations[0][0]),
    ['comment', 'comment', 'comment'],
  );
  assert.deepEqual(
    counters.contentBroadcasts.map((entry) => {
      const value = entry.operations[0][1];
      if (value.parent_author) return 'reply';
      return value.permlink.includes('browser-qualified-room-note')
        && value.title.includes('revised')
        ? 'update'
        : 'post';
    }),
    ['post', 'update', 'reply'],
  );
  assert.equal(
    hiveReadService.rpcPool.calls.some((call) => /broadcast|custom_json|vote|comment/.test(call.method)),
    false,
    'identity browser journey reached a write RPC method',
  );

  manifest.summary = {
    directionCount: HOSTS.length,
    screenshotCount: manifest.screenshots.length,
    auditCount: manifest.audits.length,
    blockingAccessibilityFindings: manifest.audits.reduce(
      (sum, item) => sum + item.accessibility.blockingCount,
      0,
    ),
    horizontalOverflowFindings: manifest.audits.filter((item) => item.geometry.overflow).length,
    incompleteImageFindings: manifest.audits.filter((item) => item.geometry.incompleteImages > 0).length,
    unauthorizedWriteLikeControls: manifest.audits.reduce(
      (sum, item) => sum
        + item.controls.unauthorized.length
        + item.controls.invalidRelationship.length
        + item.controls.invalidContent.length,
      0,
    ),
    externalRequests: counters.externalRequests.length,
    unexpectedConsoleErrors: counters.consoleErrors.length,
    authorityRpcCalls: hiveReadService.rpcPool.calls.length,
    authorizedRelationshipBroadcasts: counters.walletBroadcasts.length,
    authorizedContentBroadcasts: counters.contentBroadcasts.length,
  };

  assert.equal(manifest.summary.directionCount, 3);
  assert.equal(manifest.summary.screenshotCount, 44);
  assert.equal(manifest.summary.blockingAccessibilityFindings, 0);
  assert.equal(manifest.summary.horizontalOverflowFindings, 0);
  assert.equal(manifest.summary.incompleteImageFindings, 0);
  assert.equal(manifest.summary.unauthorizedWriteLikeControls, 0);
  assert.equal(manifest.summary.externalRequests, 0);
  assert.equal(manifest.summary.unexpectedConsoleErrors, 0);
  assert.equal(manifest.summary.authorizedRelationshipBroadcasts, 4);
  assert.equal(manifest.summary.authorizedContentBroadcasts, 3);

  fs.writeFileSync(
    path.join(OUTPUT_ROOT, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  process.stdout.write(JSON.stringify(manifest.summary) + '\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

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
  || path.join('artifacts', 'product-browser', 'identity');
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

function productReadService(publicKey) {
  const rpcCalls = [];
  const followState = new Set();
  const communityState = new Set();
  const followKey = (follower, following) => follower + '->' + following;
  const communityKey = (account, community) => account + '->' + community;

  return {
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
      return { items: [], profiles: {}, nextCursor: null };
    },
    async getLatestThreads() {
      return { container: null, threads: [], profiles: {} };
    },
    async listCommunitySubscribers() {
      return [];
    },
    async getProfiles() {
      return {};
    },
    async getProfile(account) {
      return {
        name: account,
        displayName: account,
        about: '',
        profileImage: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
      };
    },
    async getAccountPosts() {
      return { items: [], profiles: {}, nextCursor: null };
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
  };
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
    const held = /\b(vote|upvote|downvote|post|publish|reply|comment|pay|send|tip|transfer)\b/i;
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
    return { unauthorized, relationship, invalidRelationship };
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
            return new Promise((resolve) => {
              window.__resolveRelationshipApproval = resolve;
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
  const counters = { requests: [], externalRequests: [], consoleErrors: [] };
  const manifest = {
    qualification: 'hivenues-product-browser-identity',
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
    ],
  };

  try {
    await runDirectionEvidence(browser, axeSource, origin, manifest, counters);
    await runApprovalEvidence(browser, axeSource, origin, manifest, counters, key, publicKey);
    await runCancellationEvidence(browser, axeSource, origin, manifest, counters);
    await runUnavailableEvidence(browser, axeSource, publicKey, manifest);
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
    observedPaths.some((value) => /\/(follow|subscribe|vote|post|reply|payment|broadcast)\b/i.test(value)),
    false,
    'browser invoked an unauthorized mutation path',
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
      (sum, item) => sum + item.controls.unauthorized.length + item.controls.invalidRelationship.length,
      0,
    ),
    externalRequests: counters.externalRequests.length,
    unexpectedConsoleErrors: counters.consoleErrors.length,
    authorityRpcCalls: hiveReadService.rpcPool.calls.length,
  };

  assert.equal(manifest.summary.directionCount, 3);
  assert.equal(manifest.summary.screenshotCount, 10);
  assert.equal(manifest.summary.blockingAccessibilityFindings, 0);
  assert.equal(manifest.summary.horizontalOverflowFindings, 0);
  assert.equal(manifest.summary.incompleteImageFindings, 0);
  assert.equal(manifest.summary.unauthorizedWriteLikeControls, 0);
  assert.equal(manifest.summary.externalRequests, 0);
  assert.equal(manifest.summary.unexpectedConsoleErrors, 0);

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

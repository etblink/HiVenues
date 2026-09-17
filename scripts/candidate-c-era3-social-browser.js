'use strict';
/* global document, window */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createDogfoodApp, startDogfoodServer } = require('../src/candidate-c/dogfood-app');
const { CandidateCStore } = require('../src/candidate-c/store');
const { HiveReadService } = require('../src/hive/read-service');

const OUTPUT_ROOT = process.env.CANDIDATE_C_ERA3_SOCIAL_ROOT || path.join('artifacts', 'candidate-c-era3-social');
const EXACT_SHA = process.env.CANDIDATE_C_ERA3_SOCIAL_EXACT_SHA || 'LOCAL_UNBOUND';
const EXACT_TREE = process.env.CANDIDATE_C_ERA3_SOCIAL_EXACT_TREE || 'LOCAL_UNBOUND';
const COMMUNITY = 'hive-199299';
const THREADS_ACCOUNT = 'room-notes';
const SOCIAL_BINDING = Object.freeze({ community: COMMUNITY, threadsAccount: THREADS_ACCOUNT });
const DESKTOP = Object.freeze({ width: 1440, height: 1000 });
const MOBILE = Object.freeze({ width: 390, height: 844 });
const HOSTS = Object.freeze([
  Object.freeze({
    slug: 'northline-hall',
    family: 'poster',
    hubHeading: 'Fresh on the wall',
    sectionOrder: ['threads', 'posts', 'people'],
  }),
  Object.freeze({
    slug: 'nova-ashby',
    family: 'editorial',
    hubHeading: 'Dispatches & contributors',
    sectionOrder: ['posts', 'threads', 'people'],
  }),
  Object.freeze({
    slug: 'harbor-and-hearth',
    family: 'hospitality',
    hubHeading: 'Notes from the table',
    sectionOrder: ['people', 'threads', 'posts'],
  }),
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

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isLocalRequest(url) {
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return true;
  try {
    return ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
  } catch (_) {
    return false;
  }
}

function isDeterministicAvatarRequest(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'images.hive.blog';
  } catch (_) {
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
      if (error) reject(error); else resolve();
    });
  });
}

async function waitForImages(page) {
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    for (const image of images) image.loading = 'eager';
    await Promise.all(images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  });
}

async function pageAudit(page, axeSource, label) {
  await waitForImages(page);
  await page.addScriptTag({ content: axeSource });
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    incompleteImages: Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0).length,
  }));
  const writeBoundary = await page.evaluate(() => {
    const directWriteControls = Array.from(document.querySelectorAll('form, button, input, textarea, select, [contenteditable="true"]'));
    const writeLabel = /\b(follow|unfollow|subscribe|unsubscribe|vote|upvote|downvote|reply|post|publish|comment|send)\b/i;
    const suspiciousInteractive = Array.from(document.querySelectorAll('a, button, [role="button"]'))
      .filter((node) => writeLabel.test(node.textContent || ''))
      .map((node) => ({ tag: node.tagName, text: (node.textContent || '').trim(), href: node.getAttribute('href') || '' }));
    return {
      directWriteControlCount: directWriteControls.length,
      suspiciousInteractive,
    };
  });
  const accessibility = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
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

  assert.equal(geometry.overflow, false, `${label}: horizontal overflow ${geometry.scrollWidth}/${geometry.clientWidth}`);
  assert.equal(geometry.incompleteImages, 0, `${label}: incomplete images`);
  assert.equal(accessibility.blockingCount, 0, `${label}: blocking accessibility ${JSON.stringify(accessibility.blocking)}`);
  assert.equal(writeBoundary.directWriteControlCount, 0, `${label}: direct write controls are present`);
  assert.deepEqual(writeBoundary.suspiciousInteractive, [], `${label}: write-like interactive labels are present`);
  return { label, geometry, accessibility, writeBoundary };
}

async function hubFingerprint(page) {
  return page.evaluate(() => ({
    bodyClass: document.body.className,
    heading: document.querySelector('.cc-social-mast h1')?.textContent?.trim() || '',
    sectionOrder: Array.from(document.querySelectorAll('.cc-social-section')).map((section) => {
      if (section.classList.contains('cc-social-section--threads')) return 'threads';
      if (section.classList.contains('cc-social-section--posts')) return 'posts';
      if (section.classList.contains('cc-social-section--people')) return 'people';
      return 'unknown';
    }),
    background: getComputedStyle(document.body).backgroundColor,
    shellClass: document.querySelector('main')?.className || '',
  }));
}

async function memberFingerprint(page) {
  return page.evaluate(() => ({
    bodyClass: document.body.className,
    heading: document.querySelector('.cc-member-identity h1')?.textContent?.trim() || '',
    background: getComputedStyle(document.body).backgroundColor,
    shellClass: document.querySelector('main')?.className || '',
    membership: document.querySelector('.cc-member-membership')?.textContent?.trim() || '',
  }));
}

async function capturePage({ page, axeSource, outputRoot, label, screenshots, audits, fingerprint }) {
  const audit = await pageAudit(page, axeSource, label);
  audits.push(audit);
  const file = `${label}.png`;
  const filePath = path.join(outputRoot, file);
  await page.screenshot({ path: filePath, fullPage: true, animations: 'disabled' });
  const record = {
    file,
    label,
    viewport: await page.viewportSize(),
    sha256: sha256File(filePath),
    fingerprint: await fingerprint(page),
  };
  screenshots.push(record);
  return record;
}

async function createContext(browser, counters) {
  const context = await browser.newContext({ viewport: DESKTOP });
  await context.route('https://images.hive.blog/**', async (route) => {
    counters.interceptedAvatarRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#d8d1c7"/><circle cx="48" cy="38" r="18" fill="#6b6258"/><path d="M20 88c3-20 15-31 28-31s25 11 28 31" fill="#6b6258"/></svg>',
    });
  });
  context.on('request', (request) => {
    const url = request.url();
    if (!isLocalRequest(url) && !isDeterministicAvatarRequest(url)) counters.externalRequests.push(url);
  });
  return context;
}

async function runPrimaryEvidence(browser, axeSource, manifest) {
  const rpc = new RealShapedSocialRpc();
  const store = new CandidateCStore();
  const before = store.diagnostics();
  const hiveReadService = new HiveReadService(rpc, { pageSize: 10 });
  const app = createDogfoodApp({ store, hiveReadService, socialBindings: socialBindings() });
  const server = await startDogfoodServer(app, { port: 0 });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const counters = { externalRequests: [], consoleErrors: [], interceptedAvatarRequests: 0 };
  const context = await createContext(browser, counters);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
  page.on('pageerror', (error) => counters.consoleErrors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push({ type: 'console', text: message.text() });
  });

  try {
    for (const host of HOSTS) {
      for (const [viewportName, viewport] of [['desktop', DESKTOP], ['mobile390', MOBILE]]) {
        await page.setViewportSize(viewport);
        await page.goto(`${origin}/candidate-c/${host.slug}/community/updates`, { waitUntil: 'networkidle' });
        const bodyText = await page.locator('body').textContent();
        assert.ok(bodyText.includes(host.hubHeading), `${host.slug}/${viewportName}: host-native heading missing`);
        assert.ok(bodyText.includes('Why we return'), `${host.slug}/${viewportName}: longer social material missing`);
        assert.ok(bodyText.includes('tiny zine by the door'), `${host.slug}/${viewportName}: short social material missing`);
        const hub = await capturePage({
          page,
          axeSource,
          outputRoot: OUTPUT_ROOT,
          label: `${host.family}-${viewportName}-hub`,
          screenshots: manifest.screenshots,
          audits: manifest.audits,
          fingerprint: hubFingerprint,
        });
        assert.ok(hub.fingerprint.bodyClass.includes(`cc-social--${host.family}`), `${host.family}: body family marker missing`);
        assert.deepEqual(hub.fingerprint.sectionOrder, host.sectionOrder, `${host.family}: social section order collapsed`);

        await page.goto(`${origin}/candidate-c/${host.slug}/community/people/juniper-lane`, { waitUntil: 'networkidle' });
        const memberText = await page.locator('body').textContent();
        assert.ok(memberText.includes('Juniper Lane'), `${host.slug}/${viewportName}: member name missing`);
        assert.ok(memberText.includes('Public connections'), `${host.slug}/${viewportName}: public connection context missing`);
        const member = await capturePage({
          page,
          axeSource,
          outputRoot: OUTPUT_ROOT,
          label: `${host.family}-${viewportName}-member`,
          screenshots: manifest.screenshots,
          audits: manifest.audits,
          fingerprint: memberFingerprint,
        });
        assert.ok(member.fingerprint.bodyClass.includes(`cc-social--${host.family}`), `${host.family}: member family marker missing`);
        assert.equal(member.fingerprint.heading, 'Juniper Lane', `${host.family}: member identity changed`);
      }
    }

    const hubDesktop = manifest.screenshots.filter((item) => item.label.endsWith('-desktop-hub'));
    const memberDesktop = manifest.screenshots.filter((item) => item.label.endsWith('-desktop-member'));
    assert.equal(hubDesktop.length, 3, 'desktop hub evidence incomplete');
    assert.equal(memberDesktop.length, 3, 'desktop member evidence incomplete');
    assert.equal(new Set(hubDesktop.map((item) => item.sha256)).size, 3, 'Direction hub screenshots collapsed to one rendering');
    assert.equal(new Set(memberDesktop.map((item) => item.sha256)).size, 3, 'Direction member screenshots collapsed to one rendering');
    assert.equal(new Set(hubDesktop.map((item) => item.fingerprint.background)).size, 3, 'Direction hub backgrounds are not materially distinct');

    const methods = new Set(rpc.calls.map((call) => `${call.api}.${call.method}`));
    assert.equal([...methods].some((method) => /broadcast|comment_options|custom_json|vote/.test(method)), false, 'write RPC method observed');
    assert.deepEqual(store.diagnostics(), before, 'read-only browser traversal mutated store diagnostics');
    assert.deepEqual(counters.externalRequests, [], `unexpected external requests ${JSON.stringify(counters.externalRequests)}`);
    assert.deepEqual(counters.consoleErrors, [], `unexpected console/page errors ${JSON.stringify(counters.consoleErrors)}`);

    manifest.primary = {
      hosts: HOSTS,
      rpcMethods: [...methods].sort(),
      rpcCallCount: rpc.calls.length,
      storeDiagnostics: store.diagnostics(),
      interceptedAvatarRequests: counters.interceptedAvatarRequests,
      externalRequests: counters.externalRequests,
      consoleErrors: counters.consoleErrors,
    };
  } finally {
    await context.close();
    await stopServer(server);
  }
}

async function runStateEvidence(browser, axeSource, manifest) {
  const scenarios = [
    {
      id: 'disconnected',
      slug: 'northline-hall',
      expected: 'Community updates are not connected for this place yet.',
      build: () => {
        const store = new CandidateCStore();
        return { store, app: createDogfoodApp({ store }) };
      },
    },
    {
      id: 'unavailable',
      slug: 'harbor-and-hearth',
      expected: 'Community updates are temporarily unavailable.',
      build: () => {
        const store = new CandidateCStore();
        const rpc = new RealShapedSocialRpc({ fail: ['*'] });
        const hiveReadService = new HiveReadService(rpc, { pageSize: 10 });
        return { store, rpc, app: createDogfoodApp({ store, hiveReadService, socialBindings: socialBindings() }) };
      },
    },
    {
      id: 'degraded',
      slug: 'nova-ashby',
      expected: 'This community view cannot be shown safely right now.',
      build: () => {
        const store = new CandidateCStore();
        const rpc = new RealShapedSocialRpc();
        const hiveReadService = new HiveReadService(rpc, { pageSize: 10 });
        return {
          store,
          rpc,
          app: createDogfoodApp({
            store,
            hiveReadService,
            socialBindings: { 'nova-ashby': { community: 'not-hive', threadsAccount: 'Bad Account' } },
          }),
        };
      },
    },
  ];

  for (const scenario of scenarios) {
    const built = scenario.build();
    const before = built.store.diagnostics();
    const server = await startDogfoodServer(built.app, { port: 0 });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const counters = { externalRequests: [], consoleErrors: [], interceptedAvatarRequests: 0 };
    const context = await createContext(browser, counters);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(20000);
    page.on('pageerror', (error) => counters.consoleErrors.push({ type: 'pageerror', text: error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error') counters.consoleErrors.push({ type: 'console', text: message.text() });
    });

    try {
      await page.setViewportSize(DESKTOP);
      await page.goto(`${origin}/candidate-c/${scenario.slug}/community/updates`, { waitUntil: 'networkidle' });
      const bodyText = await page.locator('body').textContent();
      assert.ok(bodyText.includes(scenario.expected), `${scenario.id}: explicit state copy missing`);
      const record = await capturePage({
        page,
        axeSource,
        outputRoot: OUTPUT_ROOT,
        label: `state-${scenario.id}-desktop`,
        screenshots: manifest.screenshots,
        audits: manifest.audits,
        fingerprint: hubFingerprint,
      });
      manifest.states.push({ id: scenario.id, expected: scenario.expected, screenshot: record.file });
      assert.deepEqual(built.store.diagnostics(), before, `${scenario.id}: state evidence mutated store diagnostics`);
      assert.deepEqual(counters.externalRequests, [], `${scenario.id}: unexpected external requests`);
      assert.deepEqual(counters.consoleErrors, [], `${scenario.id}: console/page errors`);
      if (built.rpc) {
        const methods = built.rpc.calls.map((call) => `${call.api}.${call.method}`);
        assert.equal(methods.some((method) => /broadcast|comment_options|custom_json|vote/.test(method)), false, `${scenario.id}: write RPC method observed`);
      }
    } finally {
      await context.close();
      await stopServer(server);
    }
  }
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const browser = await chromium.launch({ headless: true });
  const manifest = {
    qualification: 'candidate-c-era3-social-read-only',
    candidate: EXACT_SHA,
    tree: EXACT_TREE,
    synthetic: true,
    liveHiveRequired: false,
    screenshots: [],
    audits: [],
    states: [],
    primary: null,
  };

  try {
    await runPrimaryEvidence(browser, axeSource, manifest);
    await runStateEvidence(browser, axeSource, manifest);
  } finally {
    await browser.close();
  }

  manifest.summary = {
    directionCount: HOSTS.length,
    screenshotCount: manifest.screenshots.length,
    auditCount: manifest.audits.length,
    explicitStateCount: manifest.states.length,
    blockingAccessibilityFindings: manifest.audits.reduce((sum, item) => sum + item.accessibility.blockingCount, 0),
    horizontalOverflowFindings: manifest.audits.filter((item) => item.geometry.overflow).length,
    incompleteImageFindings: manifest.audits.filter((item) => item.geometry.incompleteImages > 0).length,
    directWriteControls: manifest.audits.reduce((sum, item) => sum + item.writeBoundary.directWriteControlCount, 0),
    writeLikeInteractiveLabels: manifest.audits.reduce((sum, item) => sum + item.writeBoundary.suspiciousInteractive.length, 0),
    externalRequests: manifest.primary.externalRequests.length,
    unexpectedConsoleErrors: manifest.primary.consoleErrors.length,
    interceptedDeterministicAvatarRequests: manifest.primary.interceptedAvatarRequests,
  };

  assert.equal(manifest.summary.directionCount, 3);
  assert.equal(manifest.summary.screenshotCount, 15);
  assert.equal(manifest.summary.explicitStateCount, 3);
  assert.equal(manifest.summary.blockingAccessibilityFindings, 0);
  assert.equal(manifest.summary.horizontalOverflowFindings, 0);
  assert.equal(manifest.summary.incompleteImageFindings, 0);
  assert.equal(manifest.summary.directWriteControls, 0);
  assert.equal(manifest.summary.writeLikeInteractiveLabels, 0);
  assert.equal(manifest.summary.externalRequests, 0);
  assert.equal(manifest.summary.unexpectedConsoleErrors, 0);

  fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(manifest.summary)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

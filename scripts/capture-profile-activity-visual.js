'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const playwrightPackage = require('playwright/package.json');
const { SESSION_COOKIE_NAME } = require('../src/auth/session-store');
const {
  FIXTURE_ACCOUNT,
  FIXTURE_NOW_MS,
  createProfileActivityVisualFixture,
} = require('../test/support/profile-activity-visual-fixture');
const {
  closeServer,
  createGitReader,
  listenLoopback,
  sha256,
} = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const git = createGitReader(ROOT);
const OUTPUT = path.resolve(
  ROOT,
  process.env.PROFILE_ACTIVITY_VISUAL_OUTPUT || 'artifacts/profile-activity-visual',
);
const SHOTS = path.join(OUTPUT, 'screenshots');
const WIDTHS = Object.freeze([390, 1440]);
const STATUSES = Object.freeze(['ready', 'empty', 'unavailable']);
const KEYCHAIN_STUB = `'use strict';
Object.defineProperty(window, '__PROFILE_ACTIVITY_KEYCHAIN_DISABLED__', { value: true });
window.HiveBarKeychain = Object.freeze({
  KeychainAdapter: class {
    async broadcast() { throw new Error('Profile activity visual qualification forbids signing'); }
    async signBuffer() { throw new Error('Profile activity visual qualification forbids signing'); }
  }
});`;

function viewportHeight(width) {
  return width < 600 ? 844 : 1000;
}

function relative(filename) {
  return path.relative(OUTPUT, filename).split(path.sep).join('/');
}

async function installNetworkGuard(context, baseUrl) {
  const expectedOrigin = new URL(baseUrl).origin;
  const violations = [];
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== expectedOrigin) {
      violations.push({ reason: 'outbound-origin', method: request.method(), url: request.url() });
      await route.abort('blockedbyclient');
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method())) {
      violations.push({ reason: 'mutation-method', method: request.method(), url: request.url() });
      await route.abort('blockedbyclient');
      return;
    }
    if (url.pathname === '/js/keychain-adapter.js') {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: KEYCHAIN_STUB,
      });
      return;
    }
    await route.continue();
  });
  return violations;
}

async function settle(page) {
  await page.addStyleTag({
    content: '*{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}',
  });
  await page.evaluate(async () => {
    await globalThis.document.fonts.ready;
    await Promise.all(Array.from(globalThis.document.images, (image) => {
      if (image.complete) return Promise.resolve();
      return image.decode();
    }));
    await new Promise((resolve) => globalThis.requestAnimationFrame(resolve));
    await new Promise((resolve) => globalThis.requestAnimationFrame(resolve));
  });
}

async function pageEvidence(page, expectedStatus) {
  return page.evaluate((status) => {
    const root = globalThis.document.documentElement;
    const panel = globalThis.document.querySelector('[data-profile-activity-state]');
    const links = Array.from(panel?.querySelectorAll('a[href]') || []);
    const current = globalThis.document.querySelector('.profile-tabs [aria-current="page"]');
    const states = Array.from(panel?.querySelectorAll('.profile-activity__state') || []);
    const cards = Array.from(panel?.querySelectorAll('.profile-activity-card') || []);
    return {
      expectedStatus: status,
      actualStatus: panel?.dataset.profileActivityState || null,
      h1Count: globalThis.document.querySelectorAll('main h1').length,
      h1Text: globalThis.document.querySelector('main h1')?.textContent.trim() || '',
      h2Text: panel?.querySelector('h2')?.textContent.trim() || '',
      currentHref: current?.getAttribute('href') || null,
      cardCount: cards.length,
      stateCount: states.length,
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      openLinks: links.map((link) => {
        const rect = link.getBoundingClientRect();
        return {
          href: link.getAttribute('href'),
          text: link.textContent.trim(),
          width: rect.width,
          height: rect.height,
        };
      }),
      hasUnreadBadge: Boolean(panel?.querySelector('[data-unread],.notification-unread,.unread-badge')),
      scopeText: panel?.querySelector('.profile-activity__scope-note')?.textContent.trim() || '',
      keychainDisabled: globalThis.__PROFILE_ACTIVITY_KEYCHAIN_DISABLED__ === true,
      nativeKeychainPresent: Boolean(globalThis.hive_keychain),
    };
  }, expectedStatus);
}

function assertEvidence(evidence) {
  assert.equal(evidence.actualStatus, evidence.expectedStatus);
  assert.equal(evidence.h1Count, 1);
  assert.equal(evidence.h1Text, 'Evan');
  assert.equal(evidence.h2Text, 'Recent activity');
  assert.equal(evidence.currentHref, `/profile/${FIXTURE_ACCOUNT}/activity`);
  assert.ok(evidence.horizontalOverflow <= 1, JSON.stringify(evidence));
  assert.equal(evidence.hasUnreadBadge, false);
  assert.match(evidence.scopeText, /not an unread inbox/i);
  assert.equal(evidence.keychainDisabled, true);
  assert.equal(evidence.nativeKeychainPresent, false);
  assert.ok(evidence.openLinks.every((link) => link.height >= 44), JSON.stringify(evidence.openLinks));

  if (evidence.expectedStatus === 'ready') {
    assert.equal(evidence.cardCount, 5);
    assert.equal(evidence.stateCount, 0);
    assert.ok(evidence.openLinks.length >= 4);
  } else {
    assert.equal(evidence.cardCount, 0);
    assert.equal(evidence.stateCount, 1);
  }
}

async function axeEvidence(page) {
  const result = await page.evaluate(async () => globalThis.axe.run(globalThis.document, {
    resultTypes: ['violations'],
  }));
  const blocking = result.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact),
  );
  assert.deepEqual(blocking, [], JSON.stringify(blocking, null, 2));
  return result.violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    nodes: nodes.length,
  }));
}

async function capture(browser, status, width) {
  const fixture = createProfileActivityVisualFixture(status);
  let server;
  let context;
  try {
    server = await listenLoopback(fixture.app);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    context = await browser.newContext({
      viewport: { width, height: viewportHeight(width) },
      deviceScaleFactor: 1,
    });
    await context.addInitScript({ content: axe.source });
    await context.addCookies([{
      name: SESSION_COOKIE_NAME,
      value: fixture.token,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Strict',
    }]);
    const violations = await installNetworkGuard(context, baseUrl);
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const response = await page.goto(`${baseUrl}/profile/${FIXTURE_ACCOUNT}/activity`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    assert.ok(response);
    assert.equal(response.status(), 200);
    await settle(page);
    const evidence = await pageEvidence(page, status);
    assertEvidence(evidence);
    const axeViolations = await axeEvidence(page);

    const filename = path.join(SHOTS, `${width}-${status}.png`);
    const screenshot = await page.screenshot({
      path: filename,
      fullPage: true,
      animations: 'disabled',
    });

    assert.deepEqual(violations, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(fixture.mutationAttempts, []);
    assert.deepEqual(fixture.hiveReadService.calls, [{ method: 'getProfile', account: FIXTURE_ACCOUNT }]);
    assert.equal(fixture.rpcPool.calls.length, 1);
    assert.deepEqual(fixture.rpcPool.calls[0], {
      api: 'bridge',
      method: 'account_notifications',
      params: { account: FIXTURE_ACCOUNT, limit: 40 },
    });

    return {
      status,
      width,
      height: viewportHeight(width),
      evidence,
      axeViolations,
      screenshot: relative(filename),
      screenshotSha256: sha256(screenshot),
      rpcCalls: fixture.rpcPool.calls,
    };
  } finally {
    if (context) await context.close();
    await closeServer(server);
  }
}

async function main() {
  const outputRelative = path.relative(ROOT, OUTPUT);
  assert.ok(outputRelative && !outputRelative.startsWith('..') && !path.isAbsolute(outputRelative));
  await fs.rm(OUTPUT, { recursive: true, force: true });
  await fs.mkdir(SHOTS, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    result: 'running',
    fixture: {
      account: FIXTURE_ACCOUNT,
      clock: new Date(FIXTURE_NOW_MS).toISOString(),
      authentication: 'deterministic in-memory owner session; no real user session',
    },
    git: {
      branch: git('branch', '--show-current'),
      commit: git('rev-parse', 'HEAD'),
      parent: git('rev-parse', 'HEAD^'),
      tree: git('rev-parse', 'HEAD^{tree}'),
      workingTreeStatus: git('status', '--porcelain'),
    },
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      playwright: playwrightPackage.version,
      browser: null,
    },
    scope: {
      widths: WIDTHS,
      statuses: STATUSES,
      unreadPersistence: false,
      writeAuthority: false,
    },
    captures: [],
  };

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    manifest.runtime.browser = browser.version();
    for (const width of WIDTHS) {
      for (const status of STATUSES) {
        manifest.captures.push(await capture(browser, status, width));
      }
    }
    assert.equal(manifest.captures.length, WIDTHS.length * STATUSES.length);
    manifest.result = 'passed';
  } catch (error) {
    manifest.result = 'failed';
    manifest.failure = { name: error.name, message: error.message, stack: error.stack };
    throw error;
  } finally {
    if (browser) await browser.close();
    await fs.writeFile(
      path.join(OUTPUT, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
  }

  console.log(JSON.stringify({
    result: manifest.result,
    captures: manifest.captures.length,
    widths: WIDTHS,
    statuses: STATUSES,
    browser: manifest.runtime.browser,
    output: outputRelative,
  }));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
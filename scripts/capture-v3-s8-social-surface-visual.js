#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const {
  createV3PreviewFixture,
  nativeCreatorSource,
} = require('../test/support/v3-reference-fixtures');
const {
  closeServer,
  listenLoopback,
  sha256,
} = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(ROOT, process.env.V3_S4_REVIEW_ROOT || 'artifacts/v3-s4-cross-host-review');
const EVIDENCE = path.join(OUTPUT, 's8-social-surface');
const SCREENSHOTS = path.join(EVIDENCE, 'screenshots');
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);
const ROOT_AUTHOR = 'creatorhost';
const ROOT_PERMLINK = 'live-session-one-discussion';
const VIEWPORTS = Object.freeze([
  { id: 'desktop', width: 1440, height: 1000 },
  { id: 'narrow', width: 390, height: 844 },
]);
const VARIANTS = Object.freeze([
  { id: 'community-disabled', communityState: 'disabled' },
  { id: 'community-configured', communityState: 'configured' },
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function socializedCreatorSource(variant) {
  const source = clone(nativeCreatorSource());
  source.activityBindings.hiveSocial = [{
    version: 1,
    id: 'live-session-social-root',
    activityId: 'live-session-one',
    roles: ['ANNOUNCEMENT', 'PRIMARY_DISCUSSION'],
    primary: true,
    state: 'BOUND',
    operationId: 'publish:live-session-one',
    hiveRef: {
      author: ROOT_AUTHOR,
      permlink: ROOT_PERMLINK,
    },
  }];
  if (variant.communityState === 'configured') {
    source.capabilities.community = {
      state: 'configured',
      binding: {
        communityId: 'hive-654321',
        officialAccount: 'signalroom',
        threadsContainerAccount: 'signal.threads',
      },
    };
  }
  return source;
}

function screenshotRecord(filename) {
  const bytes = fs.readFileSync(filename);
  return {
    file: path.relative(OUTPUT, filename).replaceAll(path.sep, '/'),
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

async function accessibility(page, label) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => globalThis.axe.run(globalThis.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    resultTypes: ['violations'],
  }));
  const violations = result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
    targets: violation.nodes.map((node) => node.target),
  }));
  const blocking = violations.filter((finding) => BLOCKING_IMPACTS.has(finding.impact));
  assert.deepEqual(blocking, [], `${label}: blocking accessibility findings\n${JSON.stringify(blocking, null, 2)}`);
  return { violations, blocking };
}

async function geometry(page, label) {
  const result = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const actionTargets = [...globalThis.document.querySelectorAll('.v3-primary-nav a,.v3-action')]
      .map((element) => element.getBoundingClientRect().height)
      .filter((height) => height > 0);
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      mainCount: globalThis.document.querySelectorAll('main').length,
      iframeCount: globalThis.document.querySelectorAll('iframe').length,
      executableScriptCount: globalThis.document.querySelectorAll('script:not([type="application/ld+json"])').length,
      jsonLdCount: globalThis.document.querySelectorAll('script[type="application/ld+json"]').length,
      minimumActionTargetHeight: actionTargets.length ? Math.min(...actionTargets) : null,
    };
  });
  assert.ok(result.scrollWidth - result.clientWidth <= 1, `${label}: horizontal overflow ${JSON.stringify(result)}`);
  assert.equal(result.mainCount, 1, `${label}: expected one public main landmark`);
  assert.equal(result.iframeCount, 0, `${label}: Activity evidence must not contain Studio iframe`);
  assert.equal(result.executableScriptCount, 0, `${label}: generated Activity page must remain executable-script-free`);
  assert.ok(result.jsonLdCount >= 1, `${label}: generated Activity page should expose structured metadata`);
  assert.ok(
    result.minimumActionTargetHeight === null || result.minimumActionTargetHeight >= 43.5,
    `${label}: public action below 44px convention ${JSON.stringify(result)}`,
  );
  return result;
}

async function socialContract(page, fixture, variant, label) {
  const result = await page.evaluate(() => {
    const section = globalThis.document.querySelector('.v3-activity-discussion');
    const link = globalThis.document.querySelector('[data-social-role="PRIMARY_DISCUSSION"]');
    const navLabels = [...globalThis.document.querySelectorAll('.v3-primary-nav a')]
      .map((element) => element.textContent.trim());
    return {
      wordmark: globalThis.document.querySelector('.v3-wordmark')?.textContent?.trim() || null,
      activityId: globalThis.document.querySelector('main')?.dataset?.activityId || null,
      discussionCount: globalThis.document.querySelectorAll('.v3-activity-discussion').length,
      discussionState: section?.dataset?.socialState || null,
      discussionHref: link?.getAttribute('href') || null,
      discussionLabel: link?.textContent?.trim() || null,
      communityNavCount: navLabels.filter((labelText) => labelText === 'Community').length,
    };
  });

  assert.equal(result.wordmark, fixture.source.venue.displayName, `${label}: venue-first identity`);
  assert.equal(result.activityId, 'live-session-one', `${label}: Activity identity`);
  assert.equal(result.discussionCount, 1, `${label}: one Activity-local Discussion section`);
  assert.equal(result.discussionState, 'SOCIAL_ROOT_BOUND', `${label}: only bound root is presented`);
  assert.equal(result.discussionHref, `/post/${ROOT_AUTHOR}/${ROOT_PERMLINK}`, `${label}: local durable discussion route`);
  assert.equal(result.discussionLabel, 'Join discussion', `${label}: visitor-facing social action`);
  assert.equal(result.communityNavCount, 0, `${label}: Community capability must not become mandatory top-level IA`);
  assert.equal(fixture.source.capabilities.community.state, variant.communityState, `${label}: requested capability state`);
  return result;
}

async function runVariant(browser, variant) {
  const fixture = createV3PreviewFixture(socializedCreatorSource(variant));
  const activity = fixture.source.resources.activities.find((candidate) => candidate.id === 'live-session-one');
  assert.ok(activity, `${variant.id}: representative Activity`);
  const server = await listenLoopback(fixture.app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const views = [];
  let externalRequests = 0;

  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await page.route('**/*', async (route) => {
        const requestUrl = new URL(route.request().url());
        if (requestUrl.origin !== new URL(baseUrl).origin) {
          externalRequests += 1;
          await route.abort();
          return;
        }
        await route.continue();
      });
      try {
        const label = `${variant.id}/${viewport.id}`;
        const response = await page.goto(`${baseUrl}/activities/${encodeURIComponent(activity.slug)}`, { waitUntil: 'networkidle' });
        assert.ok(response?.ok(), `${label}: Activity route must resolve`);
        const contract = await socialContract(page, fixture, variant, label);
        const pageGeometry = await geometry(page, label);
        const pageAccessibility = await accessibility(page, label);
        const filename = path.join(SCREENSHOTS, `${variant.id}-${viewport.id}.png`);
        await page.screenshot({ path: filename, fullPage: true });
        views.push({
          viewport,
          contract,
          geometry: pageGeometry,
          accessibility: pageAccessibility,
          screenshot: screenshotRecord(filename),
        });
      } finally {
        await page.close();
      }
    }

    assert.equal(fixture.diagnostics.hiveRpcAttempts, 0, `${variant.id}: Hive RPC attempts`);
    assert.equal(fixture.diagnostics.hiveWrites, 0, `${variant.id}: Hive writes`);
    assert.equal(fixture.diagnostics.providerWrites, 0, `${variant.id}: provider writes`);
    assert.equal(externalRequests, 0, `${variant.id}: external browser requests`);

    return {
      id: variant.id,
      communityState: fixture.source.capabilities.community.state,
      activityId: activity.id,
      root: { author: ROOT_AUTHOR, permlink: ROOT_PERMLINK },
      views,
      diagnostics: fixture.diagnostics,
      externalRequests,
    };
  } finally {
    await closeServer(server);
  }
}

async function main() {
  fs.rmSync(EVIDENCE, { recursive: true, force: true });
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  const browser = await chromium.launch();
  const variants = [];
  try {
    for (const variant of VARIANTS) variants.push(await runVariant(browser, variant));
  } finally {
    await browser.close();
  }

  const allViews = variants.flatMap((variant) => variant.views);
  const summary = {
    variantCount: variants.length,
    configuredCapabilityCount: variants.filter((variant) => variant.communityState === 'configured').length,
    disabledCapabilityCount: variants.filter((variant) => variant.communityState === 'disabled').length,
    screenshotCount: allViews.length,
    desktopScreenshotCount: allViews.filter((view) => view.viewport.id === 'desktop').length,
    narrowScreenshotCount: allViews.filter((view) => view.viewport.id === 'narrow').length,
    blockingAccessibilityFindings: allViews.reduce((sum, view) => sum + view.accessibility.blocking.length, 0),
    horizontalOverflowFindings: allViews.filter((view) => view.geometry.scrollWidth - view.geometry.clientWidth > 1).length,
    externalRequests: variants.reduce((sum, variant) => sum + variant.externalRequests, 0),
    hiveRpcAttempts: variants.reduce((sum, variant) => sum + variant.diagnostics.hiveRpcAttempts, 0),
    hiveWrites: variants.reduce((sum, variant) => sum + variant.diagnostics.hiveWrites, 0),
    providerWrites: variants.reduce((sum, variant) => sum + variant.diagnostics.providerWrites, 0),
  };

  assert.deepEqual(
    variants.map((variant) => variant.communityState),
    ['disabled', 'configured'],
  );
  assert.equal(summary.variantCount, 2);
  assert.equal(summary.configuredCapabilityCount, 1);
  assert.equal(summary.disabledCapabilityCount, 1);
  assert.equal(summary.screenshotCount, 4);
  assert.equal(summary.desktopScreenshotCount, 2);
  assert.equal(summary.narrowScreenshotCount, 2);
  assert.equal(summary.blockingAccessibilityFindings, 0);
  assert.equal(summary.horizontalOverflowFindings, 0);
  assert.equal(summary.externalRequests, 0);
  assert.equal(summary.hiveRpcAttempts, 0);
  assert.equal(summary.hiveWrites, 0);
  assert.equal(summary.providerWrites, 0);

  const manifest = {
    kind: 'hivenues-v3-s8-social-surface-visual-evidence',
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary,
    variants,
  };
  fs.writeFileSync(path.join(EVIDENCE, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('V3_S8_SOCIAL_SURFACE_EVIDENCE', JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

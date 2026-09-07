#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { URLSearchParams } = require('node:url');
const axe = require('axe-core');
const { chromium } = require('playwright');
const {
  REFERENCE_FACTORIES,
} = require('../test/support/v2-renderer-fixture');
const {
  createReferenceV2ReadOnlyStudioFixture,
} = require('../test/support/v2-studio-fixture');
const {
  closeServer,
  listenLoopback,
  sha256,
} = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(
  ROOT,
  process.env.V2_STUDIO_REVIEW_ROOT || 'artifacts/v2-studio-review',
);
const SCREENSHOTS = path.join(OUTPUT, 'screenshots');
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);
const SHELL_VIEWPORTS = Object.freeze({
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
});

async function runAxeInFrame(frame) {
  await frame.addScriptTag({ content: axe.source });
  const result = await frame.evaluate(async () => globalThis.axe.run(globalThis.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    resultTypes: ['violations'],
  }));
  return result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
    targets: violation.nodes.map((node) => node.target),
    failureSummaries: violation.nodes.map((node) => node.failureSummary).filter(Boolean),
  }));
}

async function accessibility(page, label) {
  const outer = await runAxeInFrame(page.mainFrame());
  const iframe = page.frames().find((frame) => frame !== page.mainFrame());
  const preview = iframe ? await runAxeInFrame(iframe) : [];
  const blocking = [...outer, ...preview].filter((finding) => BLOCKING_IMPACTS.has(finding.impact));
  assert.deepEqual(blocking, [], `${label}: blocking accessibility findings\n${JSON.stringify(blocking, null, 2)}`);
  return { outer, preview };
}

async function geometry(page, label) {
  const metrics = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const targetHeights = [...globalThis.document.querySelectorAll(
      '.studio-tree__link,.canvas-card,.inspector-field,.viewport-option,.skip,summary',
    )]
      .map((element) => element.getBoundingClientRect().height)
      .filter((height) => height > 0);
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      h1Count: globalThis.document.querySelectorAll('h1').length,
      mainCount: globalThis.document.querySelectorAll('main').length,
      iframeCount: globalThis.document.querySelectorAll('iframe').length,
      formCount: globalThis.document.querySelectorAll('form').length,
      inputCount: globalThis.document.querySelectorAll('input,textarea,select').length,
      buttonCount: globalThis.document.querySelectorAll('button').length,
      minimumStudioTargetHeight: targetHeights.length ? Math.min(...targetHeights) : null,
    };
  });

  assert.ok(
    metrics.scrollWidth - metrics.clientWidth <= 1,
    `${label}: horizontal overflow ${JSON.stringify(metrics)}`,
  );
  assert.equal(metrics.h1Count, 1, `${label}: expected one Studio h1`);
  assert.equal(metrics.mainCount, 1, `${label}: expected one main landmark`);
  assert.equal(metrics.iframeCount, 1, `${label}: expected one real-renderer iframe`);
  assert.equal(metrics.formCount, 0, `${label}: read-only Studio unexpectedly contains a form`);
  assert.equal(metrics.inputCount, 0, `${label}: read-only Studio unexpectedly contains editable controls`);
  assert.equal(metrics.buttonCount, 0, `${label}: read-only Studio unexpectedly contains buttons`);
  assert.ok(
    metrics.minimumStudioTargetHeight === null || metrics.minimumStudioTargetHeight >= 43.5,
    `${label}: Studio target below 44px convention ${JSON.stringify(metrics)}`,
  );
  return metrics;
}

async function previewHealth(page, label) {
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  assert.ok(frame, `${label}: real renderer iframe missing`);
  await frame.waitForLoadState('networkidle');
  const data = await frame.evaluate(() => ({
    h1Count: globalThis.document.querySelectorAll('h1').length,
    mainCount: globalThis.document.querySelectorAll('main').length,
    venueWordmark: globalThis.document.querySelector('.v2-wordmark')?.textContent?.trim() || null,
    failedImages: [...globalThis.document.images]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')),
  }));
  assert.equal(data.mainCount, 1, `${label}: renderer preview main landmark mismatch`);
  assert.equal(data.h1Count, 1, `${label}: renderer preview heading mismatch`);
  assert.deepEqual(data.failedImages, [], `${label}: renderer preview image failure`);
  return data;
}

function screenshotRecord(filename) {
  const bytes = fs.readFileSync(filename);
  return {
    file: path.relative(OUTPUT, filename).replaceAll(path.sep, '/'),
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

async function capture(page, {
  origin,
  referenceId,
  stateId,
  shellViewport,
  query,
}) {
  await page.setViewportSize(shellViewport);
  const params = new URLSearchParams(query);
  const pathname = `/studio?${params.toString()}`;
  const response = await page.goto(new URL(pathname, origin).toString(), { waitUntil: 'networkidle' });
  assert.ok(response && response.ok(), `${referenceId}/${stateId}: HTTP ${response && response.status()}`);

  const label = `${referenceId}/${stateId}`;
  const authority = await page.locator('main.studio').evaluate((element) => ({
    sourceDigest: element.dataset.sourceDigest,
    derived: element.dataset.studioDerived,
    persistent: element.dataset.studioPersistent,
    mutations: element.dataset.studioMutations,
  }));
  assert.match(authority.sourceDigest, /^[0-9a-f]{64}$/);
  assert.equal(authority.derived, 'true');
  assert.equal(authority.persistent, 'false');
  assert.equal(authority.mutations, 'false');

  const geometryMetrics = await geometry(page, label);
  const preview = await previewHealth(page, label);
  const accessibilityFindings = await accessibility(page, label);

  const filename = path.join(SCREENSHOTS, `${referenceId}-${stateId}.png`);
  await page.screenshot({ path: filename, fullPage: false });
  return {
    referenceId,
    stateId,
    pathname,
    shellViewport,
    authority,
    geometry: geometryMetrics,
    preview,
    accessibility: accessibilityFindings,
    screenshot: screenshotRecord(filename),
  };
}

async function main() {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(SCREENSHOTS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const manifest = {
    schemaVersion: 1,
    issue: 173,
    role: 'HiVenues v2 read-only Studio consumption evidence',
    reviewMode: 'viewport-only',
    references: {},
    captures: [],
  };

  try {
    for (const referenceId of Object.keys(REFERENCE_FACTORIES)) {
      const fixture = createReferenceV2ReadOnlyStudioFixture(referenceId);
      const server = await listenLoopback(fixture.app);
      const address = server.address();
      const origin = `http://127.0.0.1:${address.port}`;
      const context = await browser.newContext({
        viewport: SHELL_VIEWPORTS.desktop,
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();

      try {
        const source = fixture.source;
        manifest.references[referenceId] = {
          venueId: source.venue.id,
          displayName: source.venue.displayName,
          communityState: source.capabilities.community.state,
          transactionState: source.capabilities.transaction.state,
        };

        manifest.captures.push(await capture(page, {
          origin,
          referenceId,
          stateId: 'desktop-home',
          shellViewport: SHELL_VIEWPORTS.desktop,
          query: { viewport: 'desktop' },
        }));
        manifest.captures.push(await capture(page, {
          origin,
          referenceId,
          stateId: 'mobile-home',
          shellViewport: SHELL_VIEWPORTS.mobile,
          query: { viewport: 'mobile' },
        }));

        if (referenceId === 'restaurant') {
          manifest.captures.push(await capture(page, {
            origin,
            referenceId,
            stateId: 'tablet-hero-field',
            shellViewport: SHELL_VIEWPORTS.tablet,
            query: {
              nodeId: 'component:home-hero',
              fieldId: 'heading',
              viewport: 'tablet',
            },
          }));
        }

        if (referenceId === 'live-music') {
          manifest.captures.push(await capture(page, {
            origin,
            referenceId,
            stateId: 'desktop-event-resource',
            shellViewport: SHELL_VIEWPORTS.desktop,
            query: {
              nodeId: 'component:home-shows/resource:events:fixture-show-one',
              viewport: 'desktop',
            },
          }));
        }

        if (['restaurant', 'live-music'].includes(referenceId)) {
          const text = await page.locator('body').innerText();
          assert.doesNotMatch(text, /Community|Threads|Hive Keychain|HBD|Pay with|Sign in/i);
        }

        const diagnostics = fixture.diagnostics();
        assert.equal(diagnostics.hiveRpcAttempts, 0);
        assert.equal(diagnostics.writes, 0);
        assert.equal(diagnostics.mutationRequests, 0);
        manifest.references[referenceId].diagnostics = diagnostics;
      } finally {
        await context.close();
        await closeServer(server);
      }
    }

    assert.equal(manifest.captures.length, 10);
    const digestsByReference = {};
    for (const capture of manifest.captures) {
      (digestsByReference[capture.referenceId] ||= new Set()).add(capture.authority.sourceDigest);
    }
    for (const [referenceId, digests] of Object.entries(digestsByReference)) {
      assert.equal(digests.size, 1, `${referenceId}: selection/viewport changed source digest`);
      manifest.references[referenceId].sourceDigest = [...digests][0];
    }

    manifest.summary = {
      referenceCount: Object.keys(manifest.references).length,
      screenshotCount: manifest.captures.length,
      screenshotBytes: manifest.captures.reduce((sum, item) => sum + item.screenshot.bytes, 0),
      blockingAccessibilityFindings: manifest.captures
        .flatMap((item) => [...item.accessibility.outer, ...item.accessibility.preview])
        .filter((finding) => BLOCKING_IMPACTS.has(finding.impact)).length,
      horizontalOverflowFindings: manifest.captures
        .filter((item) => item.geometry.scrollWidth - item.geometry.clientWidth > 1).length,
      mutationSurfaceFindings: manifest.captures
        .filter((item) => item.geometry.formCount || item.geometry.inputCount || item.geometry.buttonCount).length,
      sourceNeutralReferences: Object.values(digestsByReference)
        .filter((digests) => digests.size === 1).length,
    };

    fs.writeFileSync(
      path.join(OUTPUT, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    process.stdout.write(`V2_STUDIO_READ_ONLY_VISUAL_REVIEW=PASS\n${JSON.stringify(manifest.summary)}\n`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main };

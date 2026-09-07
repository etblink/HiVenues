#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const {
  deriveV2DeploymentAgnosticVenueSourceDigest,
} = require('../src/venue/v2/source');
const {
  REFERENCE_FACTORIES,
  createV2RendererPreviewFixture,
} = require('../test/support/v2-renderer-fixture');
const {
  closeServer,
  listenLoopback,
  sha256,
} = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(
  ROOT,
  process.env.V2_RENDERER_REVIEW_ROOT || 'artifacts/v2-renderer-review',
);
const SCREENSHOTS = path.join(OUTPUT, 'screenshots');
const VIEWPORTS = Object.freeze([
  { id: 'mobile', width: 390, height: 844 },
  { id: 'tablet', width: 834, height: 1112 },
  { id: 'desktop', width: 1440, height: 1000 },
]);
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

async function runAxe(page) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => globalThis.axe.run(globalThis.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    resultTypes: ['violations'],
  }));
  const violations = result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
  }));
  const blocking = violations.filter((violation) => BLOCKING_IMPACTS.has(violation.impact));
  assert.deepEqual(blocking, [], JSON.stringify(blocking, null, 2));
  return violations;
}

async function geometry(page, label) {
  const metrics = await page.evaluate(() => ({
    clientWidth: globalThis.document.documentElement.clientWidth,
    scrollWidth: globalThis.document.documentElement.scrollWidth,
    h1Count: globalThis.document.querySelectorAll('h1').length,
    emptyLinks: [...globalThis.document.querySelectorAll('a')].filter((link) => !link.textContent.trim()).length,
    minimumPrimaryTargetHeight: Math.min(
      ...[...globalThis.document.querySelectorAll('.v2-nav__link,.v2-action,.v2-back-link')]
        .map((element) => element.getBoundingClientRect().height)
        .filter((height) => height > 0),
    ),
  }));
  assert.ok(metrics.scrollWidth - metrics.clientWidth <= 1, `${label}: horizontal overflow ${JSON.stringify(metrics)}`);
  assert.equal(metrics.h1Count, 1, `${label}: expected exactly one h1`);
  assert.equal(metrics.emptyLinks, 0, `${label}: empty link found`);
  assert.ok(
    !Number.isFinite(metrics.minimumPrimaryTargetHeight) || metrics.minimumPrimaryTargetHeight >= 43.5,
    `${label}: primary target below 44px convention ${JSON.stringify(metrics)}`,
  );
  return metrics;
}

async function assertImagesLoaded(page, label) {
  const images = await page.evaluate(() => [...globalThis.document.images].map((image) => ({
    src: image.getAttribute('src'),
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
  })));
  for (const image of images) {
    assert.equal(image.complete, true, `${label}: image did not complete: ${image.src}`);
    assert.ok(image.naturalWidth > 0 && image.naturalHeight > 0, `${label}: image failed: ${JSON.stringify(image)}`);
  }
  return images;
}

function screenshotRecord(filePath) {
  const bytes = fs.readFileSync(filePath);
  return {
    file: path.relative(OUTPUT, filePath).replaceAll(path.sep, '/'),
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

async function captureState(page, {
  origin,
  referenceId,
  stateId,
  pathname,
  viewport,
}) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const url = new URL(pathname, origin).toString();
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  assert.ok(response && response.ok(), `${referenceId}/${stateId}/${viewport.id}: HTTP ${response && response.status()}`);
  const label = `${referenceId}/${stateId}/${viewport.id}`;
  const imageMetrics = await assertImagesLoaded(page, label);
  const geometryMetrics = await geometry(page, label);
  const accessibilityViolations = await runAxe(page);
  const output = path.join(SCREENSHOTS, `${referenceId}-${stateId}-${viewport.id}.png`);
  await page.screenshot({ path: output, fullPage: false });
  return {
    referenceId,
    stateId,
    pathname,
    viewport,
    screenshot: screenshotRecord(output),
    geometry: geometryMetrics,
    imageCount: imageMetrics.length,
    accessibilityViolations,
  };
}

async function main() {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const manifest = {
    schemaVersion: 1,
    issue: 171,
    role: 'HiVenues v2 read-only public renderer reference evidence',
    reviewMode: 'viewport-only',
    viewports: VIEWPORTS,
    references: {},
    captures: [],
  };

  try {
    for (const [referenceId, sourceFactory] of Object.entries(REFERENCE_FACTORIES)) {
      const fixture = createV2RendererPreviewFixture(sourceFactory());
      const server = await listenLoopback(fixture.app);
      const address = server.address();
      const origin = `http://127.0.0.1:${address.port}`;
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1,
        bypassCSP: true,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();

      try {
        const source = fixture.source;
        const homeRecipe = source.site.pages
          .find((candidate) => candidate.id === source.site.homePageId)
          .components.find((component) => component.kind === 'venue-hero')?.recipeId || null;
        manifest.references[referenceId] = {
          venueId: source.venue.id,
          displayName: source.venue.displayName,
          sourceDigest: deriveV2DeploymentAgnosticVenueSourceDigest(source),
          communityState: source.capabilities.community.state,
          transactionState: source.capabilities.transaction.state,
          typographyRecipeId: source.site.brand.design.typographyRecipeId,
          densityRecipeId: source.site.brand.design.densityRecipeId,
          heroRecipeId: homeRecipe,
        };

        for (const viewport of VIEWPORTS) {
          manifest.captures.push(await captureState(page, {
            origin,
            referenceId,
            stateId: 'home',
            pathname: '/',
            viewport,
          }));
        }

        if (referenceId === 'restaurant') {
          for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
            manifest.captures.push(await captureState(page, {
              origin,
              referenceId,
              stateId: 'menu',
              pathname: '/menu',
              viewport,
            }));
          }
        }

        if (referenceId === 'live-music') {
          for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
            manifest.captures.push(await captureState(page, {
              origin,
              referenceId,
              stateId: 'shows',
              pathname: '/shows',
              viewport,
            }));
            manifest.captures.push(await captureState(page, {
              origin,
              referenceId,
              stateId: 'event-detail',
              pathname: '/events/fixture-show-one',
              viewport,
            }));
          }
          const structured = await page.locator('script[type="application/ld+json"]').textContent();
          const eventJson = JSON.parse(structured);
          assert.equal(eventJson['@type'], 'Event');
          assert.equal(eventJson.name, 'The Static Lights');
        }

        if (['restaurant', 'live-music'].includes(referenceId)) {
          const publicText = await page.locator('body').innerText();
          assert.doesNotMatch(publicText, /Threads|Sign in|Hive Keychain|Pay with HBD/i);
        }

        const diagnostics = fixture.diagnostics();
        assert.equal(diagnostics.hiveRpcAttempts, 0);
        assert.equal(diagnostics.writes, 0);
        manifest.references[referenceId].diagnostics = diagnostics;
      } finally {
        await context.close();
        await closeServer(server);
      }
    }

    const heroRecipes = new Set(
      Object.values(manifest.references).map((reference) => reference.heroRecipeId),
    );
    const typographyRecipes = new Set(
      Object.values(manifest.references).map((reference) => reference.typographyRecipeId),
    );
    assert.ok(heroRecipes.size >= 3, `Expected at least three materially different hero recipes; got ${[...heroRecipes]}`);
    assert.ok(typographyRecipes.size >= 3, `Expected at least three typography recipes; got ${[...typographyRecipes]}`);
    assert.equal(manifest.captures.length, 18);

    manifest.summary = {
      referenceCount: Object.keys(manifest.references).length,
      screenshotCount: manifest.captures.length,
      screenshotBytes: manifest.captures.reduce((sum, capture) => sum + capture.screenshot.bytes, 0),
      heroRecipeCount: heroRecipes.size,
      typographyRecipeCount: typographyRecipes.size,
      blockingAccessibilityFindings: manifest.captures
        .flatMap((capture) => capture.accessibilityViolations)
        .filter((violation) => BLOCKING_IMPACTS.has(violation.impact)).length,
      horizontalOverflowFindings: manifest.captures
        .filter((capture) => capture.geometry.scrollWidth - capture.geometry.clientWidth > 1).length,
    };

    fs.writeFileSync(
      path.join(OUTPUT, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    process.stdout.write(`V2_RENDERER_VISUAL_REVIEW=PASS\n${JSON.stringify(manifest.summary)}\n`);
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

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
  const metrics = await page.evaluate(() => {
    const nav = globalThis.document.querySelector('.v2-nav');
    return {
      clientWidth: globalThis.document.documentElement.clientWidth,
      scrollWidth: globalThis.document.documentElement.scrollWidth,
      h1Count: globalThis.document.querySelectorAll('h1').length,
      emptyLinks: [...globalThis.document.querySelectorAll('a')].filter((link) => !link.textContent.trim()).length,
      minimumPrimaryTargetHeight: Math.min(
        ...[...globalThis.document.querySelectorAll('.v2-nav__link,.v2-action,.v2-back-link')]
          .map((element) => element.getBoundingClientRect().height)
          .filter((height) => height > 0),
      ),
      nav: nav ? {
        clientWidth: nav.clientWidth,
        scrollWidth: nav.scrollWidth,
        links: [...nav.querySelectorAll('.v2-nav__link')].map((link) => {
          const rect = link.getBoundingClientRect();
          return { label: link.textContent.trim(), left: rect.left, right: rect.right, width: rect.width, height: rect.height };
        }),
      } : null,
    };
  });
  assert.ok(metrics.scrollWidth - metrics.clientWidth <= 1, `${label}: horizontal overflow ${JSON.stringify(metrics)}`);
  assert.equal(metrics.h1Count, 1, `${label}: expected exactly one h1`);
  assert.equal(metrics.emptyLinks, 0, `${label}: empty link found`);
  assert.ok(
    !Number.isFinite(metrics.minimumPrimaryTargetHeight) || metrics.minimumPrimaryTargetHeight >= 43.5,
    `${label}: primary target below 44px convention ${JSON.stringify(metrics)}`,
  );
  if (metrics.nav) {
    assert.ok(metrics.nav.scrollWidth - metrics.nav.clientWidth <= 1, `${label}: navigation requires horizontal scrolling ${JSON.stringify(metrics.nav)}`);
    for (const link of metrics.nav.links) {
      assert.ok(link.left >= -1 && link.right <= metrics.clientWidth + 1, `${label}: navigation link is clipped ${JSON.stringify(link)}`);
    }
  }
  return metrics;
}

async function assertImagesLoaded(page, label) {
  await page.evaluate(async () => {
    const delay = (milliseconds) => new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
    const step = Math.max(320, Math.floor(globalThis.innerHeight * 0.75));
    for (let y = 0; y < globalThis.document.documentElement.scrollHeight; y += step) {
      globalThis.scrollTo(0, y);
      await delay(18);
    }
    globalThis.scrollTo(0, 0);
    await delay(30);
  });
  await page.waitForFunction(
    () => [...globalThis.document.images].every((image) => image.complete),
    { timeout: 5000 },
  );
  const images = await page.evaluate(() => [...globalThis.document.images].map((image) => ({
    src: image.getAttribute('src'),
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    declaredWidth: Number(image.getAttribute('width')) || null,
    declaredHeight: Number(image.getAttribute('height')) || null,
  })));
  for (const image of images) {
    assert.equal(image.complete, true, `${label}: image did not complete: ${image.src}`);
    assert.ok(image.naturalWidth > 0 && image.naturalHeight > 0, `${label}: image failed: ${JSON.stringify(image)}`);
    if (image.declaredWidth) {
      assert.equal(image.naturalWidth, image.declaredWidth, `${label}: intrinsic width does not match source metadata: ${JSON.stringify(image)}`);
    }
    if (image.declaredHeight) {
      assert.equal(image.naturalHeight, image.declaredHeight, `${label}: intrinsic height does not match source metadata: ${JSON.stringify(image)}`);
    }
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

async function assertPosterRows(page, label) {
  const rows = await page.locator('.v2-event-card--poster').evaluateAll((cards) => cards.map((card) => {
    const rect = (element) => {
      if (!element) return null;
      const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    const artwork = card.querySelector('.v2-event-card__artwork');
    const copy = card.querySelector('.v2-event-card__copy');
    const image = artwork?.querySelector('img');
    return {
      id: card.dataset.resourceId,
      card: rect(card), artwork: rect(artwork), copy: rect(copy),
      actions: rect(card.querySelector('.v2-actions')),
      decoded: !image || (image.complete && image.naturalWidth > 0),
      fit: image ? globalThis.getComputedStyle(image).objectFit : null,
      title: card.querySelector('h3').textContent,
      overflow: card.scrollWidth - card.clientWidth,
      textOnly: card.classList.contains('v2-event-card--text-only'),
    };
  }));
  for (const row of rows) {
    assert.ok(row.decoded, `${label}: poster did not decode`);
    assert.ok(row.overflow <= 1, `${label}: row overflow`);
    assert.ok(row.copy.width >= 140, `${label}: unreadably narrow event copy`);
    assert.ok(row.actions.right <= row.card.right + 1, `${label}: actions escape row`);
    if (row.artwork) {
      assert.equal(row.fit, 'contain', `${label}: artwork is cropped`);
      assert.ok(row.artwork.right <= row.copy.x + 1, `${label}: artwork overlaps copy`);
    } else {
      assert.ok(row.textOnly, `${label}: missing-art row must not reserve a poster column`);
    }
    if (page.viewportSize().width <= 760) {
      assert.ok(row.actions.y >= Math.max(row.artwork?.bottom || 0, row.copy.bottom) - 1, `${label}: mobile actions overlap content`);
    }
  }
  return rows;
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
  const posterRows = await assertPosterRows(page, label);
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
    posterRows,
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
    issue: 198,
    role: 'HiVenues PM4 generated-reference composition and media evidence',
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

        if (referenceId === 'fourth-street') {
          for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
            manifest.captures.push(await captureState(page, {
              origin,
              referenceId,
              stateId: 'gallery',
              pathname: '/gallery',
              viewport,
            }));
          }
        }

        if (referenceId === 'juniper') {
          for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
            manifest.captures.push(await captureState(page, {
              origin,
              referenceId,
              stateId: 'equipment',
              pathname: '/equipment',
              viewport,
            }));
            manifest.captures.push(await captureState(page, {
              origin,
              referenceId,
              stateId: 'projects',
              pathname: '/projects',
              viewport,
            }));
          }
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
            manifest.captures.push(await captureState(page, {
              origin,
              referenceId,
              stateId: 'gallery',
              pathname: '/gallery',
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

          // Existing home captures activate poster rows at all three breakpoints.
          for (const viewport of VIEWPORTS) {
            const home = manifest.captures.find((capture) => capture.referenceId === referenceId
              && capture.stateId === 'home' && capture.viewport.id === viewport.id);
            assert.deepEqual(home.posterRows.map((row) => row.id), ['fixture-show-one', 'fixture-show-two']);
            assert.ok(home.posterRows.every((row) => row.artwork && row.decoded));
          }
        }

        if (['restaurant', 'live-music'].includes(referenceId)) {
          const publicText = await page.locator('body').innerText();
          assert.doesNotMatch(publicText, /Threads|Sign in|Hive Keychain|Pay with HBD/i);
          assert.doesNotMatch(publicText, /fixture-only|event renderer|same semantic renderer|Synthetic HiVenues reference artwork/i);
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

    // No-artwork and long-copy states use the same source/renderer, not a DOM mock.
    const stressSource = JSON.parse(JSON.stringify(REFERENCE_FACTORIES['live-music']()));
    stressSource.resources.events[0].mediaAssetId = null;
    stressSource.resources.events[0].externalAction = null;
    stressSource.resources.events[0].title = 'An evening of music, stories, and unexpected collaborations';
    stressSource.resources.events[1].title = 'UnbrokenArtistName'.repeat(7);
    const stressFixture = createV2RendererPreviewFixture(stressSource);
    const stressServer = await listenLoopback(stressFixture.app);
    const stressContext = await browser.newContext({ deviceScaleFactor: 1, bypassCSP: true, reducedMotion: 'reduce' });
    try {
      const page = await stressContext.newPage();
      const origin = `http://127.0.0.1:${stressServer.address().port}`;
      for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
        const capture = await captureState(page, { origin, referenceId: 'live-music', stateId: 'poster-stress', pathname: '/shows', viewport });
        assert.equal(capture.posterRows.length, 2);
        assert.equal(capture.posterRows[0].artwork, null);
        assert.ok(capture.posterRows[1].artwork);
        manifest.captures.push(capture);
      }
    } finally {
      await stressContext.close();
      await closeServer(stressServer);
    }

    const heroRecipes = new Set(
      Object.values(manifest.references).map((reference) => reference.heroRecipeId),
    );
    const typographyRecipes = new Set(
      Object.values(manifest.references).map((reference) => reference.typographyRecipeId),
    );
    assert.equal(heroRecipes.size, 4, `Expected four materially different hero recipes; got ${[...heroRecipes]}`);
    assert.ok(typographyRecipes.size >= 3, `Expected at least three typography recipes; got ${[...typographyRecipes]}`);
    assert.equal(manifest.captures.length, 28);

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

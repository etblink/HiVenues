#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const {
  createReferenceV3AuthoringStudioFixture,
} = require('../test/support/v3-authoring-studio-fixture');
const {
  closeServer,
  listenLoopback,
  sha256,
} = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(ROOT, process.env.V3_S4_REVIEW_ROOT || 'artifacts/v3-s4-cross-host-review');
const EVIDENCE = path.join(OUTPUT, 's7-generated-experience');
const SCREENSHOTS = path.join(EVIDENCE, 'screenshots');
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);
const REFERENCES = Object.freeze(['migratedPhysical', 'nativeCreator', 'nativeRelease']);
const VIEWPORTS = Object.freeze([
  { id: 'desktop', width: 1440, height: 1000 },
  { id: 'narrow', width: 390, height: 844 },
]);

function selectedActivity(fixture) {
  if (fixture.referenceId === 'migratedPhysical') {
    return fixture.source.resources.activities.find((activity) => activity.publicActions.length > 0)
      || fixture.source.resources.activities[0];
  }
  return fixture.source.resources.activities[0];
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
    const images = [...globalThis.document.images].map((image) => {
      const rect = image.getBoundingClientRect();
      return {
        src: image.getAttribute('src'),
        left: rect.left,
        right: rect.right,
        width: rect.width,
        complete: image.complete,
      };
    });
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      mainCount: globalThis.document.querySelectorAll('main').length,
      iframeCount: globalThis.document.querySelectorAll('iframe').length,
      executableScriptCount: globalThis.document.querySelectorAll('script:not([type="application/ld+json"])').length,
      jsonLdBlockCount: globalThis.document.querySelectorAll('script[type="application/ld+json"]').length,
      minimumActionTargetHeight: actionTargets.length ? Math.min(...actionTargets) : null,
      imageCount: images.length,
      imageOverflowCount: images.filter((image) => image.left < -1 || image.right > root.clientWidth + 1).length,
      incompleteImageCount: images.filter((image) => !image.complete).length,
    };
  });
  assert.ok(result.scrollWidth - result.clientWidth <= 1, `${label}: generated experience horizontal overflow ${JSON.stringify(result)}`);
  assert.equal(result.mainCount, 1, `${label}: expected one generated main landmark`);
  assert.equal(result.iframeCount, 0, `${label}: visitor-only evidence must not contain Studio iframe`);
  assert.equal(result.executableScriptCount, 0, `${label}: generated visitor page must remain executable-script-free`);
  assert.equal(result.jsonLdBlockCount, 1, `${label}: generated visitor page must carry one structured-data block`);
  assert.ok(result.minimumActionTargetHeight === null || result.minimumActionTargetHeight >= 43.5, `${label}: public action below 44px convention ${JSON.stringify(result)}`);
  assert.equal(result.imageOverflowCount, 0, `${label}: media overflows viewport`);
  assert.equal(result.incompleteImageCount, 0, `${label}: incomplete generated media`);
  return result;
}

async function visitorContract(page, fixture, activity, routeKind, label) {
  const result = await page.evaluate(() => {
    const wordmark = globalThis.document.querySelector('.v3-wordmark');
    const main = globalThis.document.querySelector('main');
    const heading = globalThis.document.querySelector('h1');
    const temporalLabel = globalThis.document.querySelector('.v3-activity-time span');
    const presenceHeading = globalThis.document.querySelector('.v3-activity-presence h2');
    return {
      title: globalThis.document.title,
      wordmark: wordmark?.textContent?.trim() || null,
      mainClass: main?.className || null,
      mainActivityId: main?.dataset?.activityId || null,
      heading: heading?.textContent?.trim() || null,
      headingFontFamily: heading ? globalThis.getComputedStyle(heading).fontFamily : null,
      studioMarkerCount: globalThis.document.querySelectorAll('.v3-studio').length,
      bodyMentionsStudio: globalThis.document.body.innerText.includes('HiVenues Studio'),
      temporalLabel: temporalLabel?.textContent?.trim() || null,
      presenceHeading: presenceHeading?.textContent?.trim() || null,
      addressCount: globalThis.document.querySelectorAll('address').length,
      actionRoles: [...globalThis.document.querySelectorAll('[data-action-role]')].map((element) => element.dataset.actionRole),
      actionCount: globalThis.document.querySelectorAll('.v3-action').length,
      mediaCount: globalThis.document.querySelectorAll('.v3-media img,.v3-activity-media img').length,
    };
  });

  assert.equal(result.wordmark, fixture.source.venue.displayName, `${label}: venue-first wordmark`);
  assert.equal(result.studioMarkerCount, 0, `${label}: Studio marker must not leak into generated experience`);
  assert.equal(result.bodyMentionsStudio, false, `${label}: Studio product identity must not compete with venue identity`);
  assert.match(result.headingFontFamily || '', /ui-serif|Georgia|Cambria|Times New Roman/i, `${label}: editorial display type`);

  if (routeKind === 'home') {
    assert.match(result.mainClass || '', /v3-page/, `${label}: public page main`);
    assert.equal(result.mainActivityId, null, `${label}: home page must not impersonate activity detail`);
  } else {
    assert.match(result.mainClass || '', /v3-activity-detail/, `${label}: activity detail main`);
    assert.equal(result.mainActivityId, activity.id, `${label}: activity identity`);
    assert.equal(result.heading, activity.title, `${label}: activity title`);
    const expectedTemporalLabel = activity.temporal.kind === 'RELEASE'
      ? 'Available'
      : activity.temporal.kind === 'WINDOW' ? 'Available window' : 'When';
    assert.equal(result.temporalLabel, expectedTemporalLabel, `${label}: temporal presentation`);

    if (activity.presence.kind === 'NONE') {
      assert.equal(result.presenceHeading, null, `${label}: no fake presence section`);
    } else if (activity.presence.kind === 'PHYSICAL_HOST_DEFAULT') {
      assert.equal(result.presenceHeading, 'Location', `${label}: physical presence heading`);
      assert.ok(result.addressCount >= 1, `${label}: physical address remains available`);
    } else if (activity.presence.kind === 'ONLINE') {
      assert.equal(result.presenceHeading, 'Join online', `${label}: online presence heading`);
      assert.equal(result.addressCount, 0, `${label}: online activity must not fabricate address`);
    } else if (activity.presence.kind === 'HYBRID') {
      assert.equal(result.presenceHeading, 'Join in person or online', `${label}: hybrid presence heading`);
    }

    const canonicalRoles = activity.publicActions.map((action) => action.role);
    assert.deepEqual(result.actionRoles, canonicalRoles, `${label}: public action order and roles`);
  }
  return result;
}

async function captureRoute(page, fixture, activity, baseUrl, viewport, routeKind, pathname) {
  const label = `${fixture.referenceId}/${viewport.id}/${routeKind}`;
  await page.goto(`${baseUrl}/v3-preview${pathname}`, { waitUntil: 'networkidle' });
  const contract = await visitorContract(page, fixture, activity, routeKind, label);
  const routeGeometry = await geometry(page, label);
  const routeAccessibility = await accessibility(page, label);
  const filename = path.join(SCREENSHOTS, `${fixture.referenceId}-${viewport.id}-${routeKind}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  return {
    routeKind,
    pathname,
    contract,
    geometry: routeGeometry,
    accessibility: routeAccessibility,
    screenshot: screenshotRecord(filename),
  };
}

function assertZeroExternal(diagnostics) {
  for (const key of [
    'hiveRpcAttempts', 'hiveWrites', 'providerWrites', 'payments', 'signingAttempts',
    'mediaUploads', 'reservationMutations', 'ticketPurchases', 'deployments',
  ]) assert.equal(diagnostics[key], 0, key);
}

async function runReference(browser, referenceId) {
  const fixture = createReferenceV3AuthoringStudioFixture(referenceId);
  const activity = selectedActivity(fixture);
  assert.ok(activity, `${referenceId}: expected representative activity`);
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
        const home = await captureRoute(page, fixture, activity, baseUrl, viewport, 'home', '/');
        const detail = await captureRoute(
          page,
          fixture,
          activity,
          baseUrl,
          viewport,
          'activity',
          `/activities/${encodeURIComponent(activity.slug)}`,
        );
        views.push({ viewport, routes: [home, detail] });
      } finally {
        await page.close();
      }
    }

    const diagnostics = fixture.diagnostics();
    assertZeroExternal(diagnostics);
    assert.equal(externalRequests, 0, `${referenceId}: generated pages made external browser requests`);

    return {
      referenceId,
      venueDisplayName: fixture.source.venue.displayName,
      hasPhysicalBusinessFacts: fixture.source.venue.business !== null,
      representativeActivity: {
        id: activity.id,
        slug: activity.slug,
        temporalKind: activity.temporal.kind,
        presenceKind: activity.presence.kind,
        publicActionRoles: activity.publicActions.map((action) => action.role),
        managedMediaCount: activity.managedMedia.length,
      },
      views,
      diagnostics,
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
  const references = [];
  try {
    for (const referenceId of REFERENCES) references.push(await runReference(browser, referenceId));
  } finally {
    await browser.close();
  }

  const allRoutes = references.flatMap((reference) => reference.views.flatMap((view) => view.routes));
  const summary = {
    referenceCount: references.length,
    viewportCount: references.reduce((sum, reference) => sum + reference.views.length, 0),
    visitorPageCount: allRoutes.length,
    screenshotCount: allRoutes.length,
    desktopScreenshotCount: references.reduce((sum, reference) => sum + reference.views.filter((view) => view.viewport.id === 'desktop').reduce((inner, view) => inner + view.routes.length, 0), 0),
    narrowScreenshotCount: references.reduce((sum, reference) => sum + reference.views.filter((view) => view.viewport.id === 'narrow').reduce((inner, view) => inner + view.routes.length, 0), 0),
    blockingAccessibilityFindings: allRoutes.reduce((sum, route) => sum + route.accessibility.blocking.length, 0),
    horizontalOverflowFindings: allRoutes.filter((route) => route.geometry.scrollWidth - route.geometry.clientWidth > 1).length,
    imageOverflowFindings: allRoutes.filter((route) => route.geometry.imageOverflowCount > 0).length,
    externalRequests: references.reduce((sum, reference) => sum + reference.externalRequests, 0),
    hiveWrites: references.reduce((sum, reference) => sum + reference.diagnostics.hiveWrites, 0),
    providerWrites: references.reduce((sum, reference) => sum + reference.diagnostics.providerWrites, 0),
    payments: references.reduce((sum, reference) => sum + reference.diagnostics.payments, 0),
    signingAttempts: references.reduce((sum, reference) => sum + reference.diagnostics.signingAttempts, 0),
    deployments: references.reduce((sum, reference) => sum + reference.diagnostics.deployments, 0),
  };

  assert.equal(summary.referenceCount, 3);
  assert.equal(summary.viewportCount, 6);
  assert.equal(summary.visitorPageCount, 12);
  assert.equal(summary.screenshotCount, 12);
  assert.equal(summary.desktopScreenshotCount, 6);
  assert.equal(summary.narrowScreenshotCount, 6);
  assert.equal(summary.blockingAccessibilityFindings, 0);
  assert.equal(summary.horizontalOverflowFindings, 0);
  assert.equal(summary.imageOverflowFindings, 0);
  assert.equal(summary.externalRequests, 0);
  assert.equal(summary.hiveWrites, 0);
  assert.equal(summary.providerWrites, 0);
  assert.equal(summary.payments, 0);
  assert.equal(summary.signingAttempts, 0);
  assert.equal(summary.deployments, 0);

  const manifest = {
    kind: 'hivenues-v3-s7-generated-experience-visual-evidence',
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary,
    references,
  };
  fs.writeFileSync(path.join(EVIDENCE, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('V3_S7_GENERATED_EXPERIENCE_EVIDENCE', JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
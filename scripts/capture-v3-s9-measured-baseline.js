#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const {
  startV3S9ReviewTarget,
} = require('./support/v3-s9-review-target');
const {
  sha256,
} = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(ROOT, process.env.V3_S4_REVIEW_ROOT || 'artifacts/v3-s4-cross-host-review');
const EVIDENCE = path.join(OUTPUT, 's9-measured-baseline');
const SCREENSHOTS = path.join(EVIDENCE, 'screenshots');
const HOME_VIEWPORTS = Object.freeze([
  { id: 'mobile', width: 390, height: 844 },
  { id: 'tablet', width: 834, height: 1112 },
  { id: 'desktop', width: 1440, height: 1000 },
]);
const DETAIL_VIEWPORTS = Object.freeze([
  { id: 'mobile', width: 390, height: 844 },
  { id: 'desktop', width: 1440, height: 1000 },
]);
const EXTERNAL_EFFECT_KEYS = Object.freeze([
  'hiveRpcAttempts',
  'hiveWrites',
  'providerWrites',
  'payments',
  'signingAttempts',
  'mediaUploads',
  'reservationMutations',
  'ticketPurchases',
  'deployments',
]);

function screenshotRecord(filename) {
  const bytes = fs.readFileSync(filename);
  return {
    file: path.relative(OUTPUT, filename).replaceAll(path.sep, '/'),
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

async function installPerformanceObservers(page) {
  await page.addInitScript(() => {
    globalThis.__hivenuesS9Performance = {
      cls: 0,
      lcp: null,
      layoutShiftEntries: 0,
      observerErrors: [],
    };
    try {
      if (globalThis.PerformanceObserver?.supportedEntryTypes?.includes('layout-shift')) {
        const observer = new globalThis.PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              globalThis.__hivenuesS9Performance.cls += entry.value;
              globalThis.__hivenuesS9Performance.layoutShiftEntries += 1;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
      }
    } catch (error) {
      globalThis.__hivenuesS9Performance.observerErrors.push(`layout-shift: ${error.message}`);
    }
    try {
      if (globalThis.PerformanceObserver?.supportedEntryTypes?.includes('largest-contentful-paint')) {
        const observer = new globalThis.PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) globalThis.__hivenuesS9Performance.lcp = last.startTime;
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      }
    } catch (error) {
      globalThis.__hivenuesS9Performance.observerErrors.push(`largest-contentful-paint: ${error.message}`);
    }
  });
}

async function collectAccessibility(page) {
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
  return {
    violations,
    seriousOrCritical: violations.filter((finding) => ['serious', 'critical'].includes(finding.impact)),
  };
}

async function collectGeometry(page) {
  return page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const actionTargets = [...globalThis.document.querySelectorAll('.v3-primary-nav a,.v3-action')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: element.textContent?.trim() || '',
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((target) => target.height > 0);
    const images = [...globalThis.document.images].map((image) => {
      const rect = image.getBoundingClientRect();
      return {
        src: image.getAttribute('src'),
        loading: image.getAttribute('loading'),
        alt: image.getAttribute('alt'),
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        declaredWidth: image.getAttribute('width'),
        declaredHeight: image.getAttribute('height'),
        renderedWidth: rect.width,
        renderedHeight: rect.height,
        left: rect.left,
        right: rect.right,
      };
    });
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
      mainCount: globalThis.document.querySelectorAll('main').length,
      scriptElementCount: globalThis.document.querySelectorAll('script').length,
      iframeCount: globalThis.document.querySelectorAll('iframe').length,
      headingOrder: [...globalThis.document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((heading) => ({
        level: Number(heading.tagName.slice(1)),
        text: heading.textContent?.trim() || '',
      })),
      actionTargets,
      minimumActionTargetHeight: actionTargets.length
        ? Math.min(...actionTargets.map((target) => target.height))
        : null,
      images,
      imageOverflowCount: images.filter((image) => image.left < -1 || image.right > root.clientWidth + 1).length,
      incompleteImageCount: images.filter((image) => !image.complete).length,
    };
  });
}

async function collectMetadata(page) {
  return page.evaluate(() => {
    const meta = (selector) => globalThis.document.querySelector(selector)?.getAttribute('content') || null;
    const link = (selector) => globalThis.document.querySelector(selector)?.getAttribute('href') || null;
    const jsonLd = [...globalThis.document.querySelectorAll('script[type="application/ld+json"]')].map((node) => {
      const raw = node.textContent || '';
      try {
        const parsed = JSON.parse(raw);
        const values = Array.isArray(parsed) ? parsed : [parsed];
        return {
          validJson: true,
          types: values.flatMap((value) => {
            const type = value && typeof value === 'object' ? value['@type'] : null;
            return Array.isArray(type) ? type : type ? [type] : [];
          }),
        };
      } catch (error) {
        return { validJson: false, error: error.message, types: [] };
      }
    });
    return {
      title: globalThis.document.title || null,
      description: meta('meta[name="description"]'),
      canonical: link('link[rel="canonical"]'),
      robots: meta('meta[name="robots"]'),
      openGraph: {
        title: meta('meta[property="og:title"]'),
        description: meta('meta[property="og:description"]'),
        url: meta('meta[property="og:url"]'),
        image: meta('meta[property="og:image"]'),
      },
      jsonLd,
    };
  });
}

async function collectPerformance(page) {
  await page.waitForTimeout(150);
  return page.evaluate(() => {
    const navigation = globalThis.performance.getEntriesByType('navigation')[0];
    const resources = globalThis.performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      transferSize: entry.transferSize || 0,
      encodedBodySize: entry.encodedBodySize || 0,
      decodedBodySize: entry.decodedBodySize || 0,
      duration: entry.duration,
    }));
    const byInitiator = {};
    for (const resource of resources) {
      const key = resource.initiatorType || 'other';
      if (!byInitiator[key]) byInitiator[key] = { count: 0, transferSize: 0, encodedBodySize: 0, decodedBodySize: 0 };
      byInitiator[key].count += 1;
      byInitiator[key].transferSize += resource.transferSize;
      byInitiator[key].encodedBodySize += resource.encodedBodySize;
      byInitiator[key].decodedBodySize += resource.decodedBodySize;
    }
    const observer = globalThis.__hivenuesS9Performance || {};
    return {
      navigation: navigation ? {
        duration: navigation.duration,
        domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
        loadEventEnd: navigation.loadEventEnd,
        transferSize: navigation.transferSize || 0,
        encodedBodySize: navigation.encodedBodySize || 0,
        decodedBodySize: navigation.decodedBodySize || 0,
      } : null,
      resources,
      byInitiator,
      cls: typeof observer.cls === 'number' ? observer.cls : null,
      lcp: typeof observer.lcp === 'number' ? observer.lcp : null,
      layoutShiftEntries: observer.layoutShiftEntries || 0,
      observerErrors: observer.observerErrors || [],
      supportedEntryTypes: globalThis.PerformanceObserver?.supportedEntryTypes || [],
    };
  });
}

async function endpointStatus(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl), { redirect: 'manual' });
  return {
    pathname,
    status: response.status,
    contentType: response.headers.get('content-type'),
  };
}

async function capturePage(browser, reference, spec) {
  const page = await browser.newPage({ viewport: { width: spec.viewport.width, height: spec.viewport.height } });
  let externalRequests = 0;
  const baseOrigin = new URL(reference.baseUrl).origin;
  await installPerformanceObservers(page);
  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin !== baseOrigin) {
      externalRequests += 1;
      await route.abort();
      return;
    }
    await route.continue();
  });

  try {
    const url = spec.routeKind === 'home' ? reference.urls.home : reference.urls.activity;
    await page.goto(url, { waitUntil: 'networkidle' });
    // Capture product-state measurements and the screenshot before injecting Axe,
    // so the measurement itself does not add a synthetic script element.
    const geometry = await collectGeometry(page);
    const metadata = await collectMetadata(page);
    const performance = await collectPerformance(page);
    const pathname = new URL(url).pathname;
    const filename = path.join(SCREENSHOTS, `${reference.referenceId}-${spec.viewport.id}-${spec.routeKind}.png`);
    await page.screenshot({ path: filename, fullPage: false });
    const accessibility = await collectAccessibility(page);
    return {
      routeKind: spec.routeKind,
      viewport: spec.viewport,
      url,
      pathname,
      reviewConsumer: spec.reviewConsumer,
      accessibility,
      geometry,
      metadata,
      performance,
      externalRequests,
      screenshot: screenshotRecord(filename),
    };
  } finally {
    await page.close();
  }
}

function assertZeroExternalDiagnostics(records) {
  for (const record of records) {
    for (const key of EXTERNAL_EFFECT_KEYS) {
      assert.equal(record.diagnostics[key], 0, `${record.referenceId}: ${key}`);
    }
  }
}

async function runReference(browser, reference) {
  const pages = [];
  for (const viewport of HOME_VIEWPORTS) {
    pages.push(await capturePage(browser, reference, {
      routeKind: 'home',
      viewport,
      reviewConsumer: 'S9 Track B home composition / responsive / credibility review',
    }));
  }
  for (const viewport of DETAIL_VIEWPORTS) {
    pages.push(await capturePage(browser, reference, {
      routeKind: 'activity',
      viewport,
      reviewConsumer: 'S9 Track B Activity detail / action / temporal / presence review',
    }));
  }
  return {
    referenceId: reference.referenceId,
    role: reference.role,
    venueDisplayName: reference.fixture.source.venue.displayName,
    hasPhysicalBusinessFacts: reference.fixture.source.venue.business !== null,
    representativeActivity: {
      id: reference.activity.id,
      slug: reference.activity.slug,
      title: reference.activity.title,
      temporalKind: reference.activity.temporal.kind,
      presenceKind: reference.activity.presence.kind,
      publicActionRoles: reference.activity.publicActions.map((action) => action.role),
      managedMediaCount: reference.activity.managedMedia.length,
    },
    endpointInventory: [
      await endpointStatus(reference.baseUrl, '/robots.txt'),
      await endpointStatus(reference.baseUrl, '/sitemap.xml'),
    ],
    pages,
  };
}

async function main() {
  fs.rmSync(EVIDENCE, { recursive: true, force: true });
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  const target = await startV3S9ReviewTarget({ buildIdentity: process.env.GITHUB_SHA || null });
  const references = [];

  try {
    const browser = await chromium.launch();
    try {
      for (const reference of target.references) references.push(await runReference(browser, reference));
    } finally {
      await browser.close();
    }

    const diagnostics = target.diagnostics();
    assertZeroExternalDiagnostics(diagnostics);
    const allPages = references.flatMap((reference) => reference.pages);
    assert.equal(references.length, 3, 'S9 deep reference count');
    assert.equal(allPages.length, 15, 'S9 viewport-only visitor screenshot count');
    assert.equal(allPages.filter((page) => page.routeKind === 'home').length, 9, 'S9 home screenshot count');
    assert.equal(allPages.filter((page) => page.routeKind === 'activity').length, 6, 'S9 Activity screenshot count');
    assert.equal(allPages.reduce((sum, page) => sum + page.externalRequests, 0), 0, 'S9 external browser requests');

    const summary = {
      referenceCount: references.length,
      screenshotCount: allPages.length,
      viewportOnlyScreenshotCount: allPages.length,
      homeScreenshotCount: allPages.filter((page) => page.routeKind === 'home').length,
      activityScreenshotCount: allPages.filter((page) => page.routeKind === 'activity').length,
      mobileScreenshotCount: allPages.filter((page) => page.viewport.id === 'mobile').length,
      tabletScreenshotCount: allPages.filter((page) => page.viewport.id === 'tablet').length,
      desktopScreenshotCount: allPages.filter((page) => page.viewport.id === 'desktop').length,
      accessibilityViolationCount: allPages.reduce((sum, page) => sum + page.accessibility.violations.length, 0),
      seriousOrCriticalAccessibilityCount: allPages.reduce((sum, page) => sum + page.accessibility.seriousOrCritical.length, 0),
      horizontalOverflowCount: allPages.filter((page) => page.geometry.scrollWidth - page.geometry.clientWidth > 1).length,
      imageOverflowCount: allPages.filter((page) => page.geometry.imageOverflowCount > 0).length,
      incompleteImageCount: allPages.filter((page) => page.geometry.incompleteImageCount > 0).length,
      below44pxActionTargetPageCount: allPages.filter((page) => page.geometry.minimumActionTargetHeight !== null && page.geometry.minimumActionTargetHeight < 43.5).length,
      missingDescriptionCount: allPages.filter((page) => !page.metadata.description).length,
      missingCanonicalCount: allPages.filter((page) => !page.metadata.canonical).length,
      missingOpenGraphTitleCount: allPages.filter((page) => !page.metadata.openGraph.title).length,
      jsonLdBlockCount: allPages.reduce((sum, page) => sum + page.metadata.jsonLd.length, 0),
      externalRequests: allPages.reduce((sum, page) => sum + page.externalRequests, 0),
      screenshotBytes: allPages.reduce((sum, page) => sum + page.screenshot.bytes, 0),
      diagnostics,
    };

    const manifest = {
      kind: 'hivenues-v3-s9-untouched-measured-baseline',
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      measurementOnly: true,
      productRemediationPerformed: false,
      astraCreditsSpent: 0,
      buildIdentity: target.manifest.buildIdentity,
      reviewTarget: target.manifest,
      summary,
      references,
    };
    fs.writeFileSync(path.join(EVIDENCE, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log('V3_S9_MEASURED_BASELINE', JSON.stringify(summary));
  } finally {
    const closeDiagnostics = await target.close();
    assertZeroExternalDiagnostics(closeDiagnostics);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

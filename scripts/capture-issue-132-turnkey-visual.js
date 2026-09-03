#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { createTurnkeyWorkspace } = require('../src/venue/turnkey-workspace');
const { loadDeploymentAgnosticVenueSourceFile } = require('../src/venue/source-file');
const { startTurnkeyStudio } = require('../src/venue/turnkey-studio');
const { qualifyTurnkeyWorkspace } = require('../src/venue/turnkey-readiness');

const TEST_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGMUqTjxn4GBgYGJAQoAIrQCV9IemH0AAAAASUVORK5CYII=', 'base64');
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

async function accessibilityViolations(page) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const result = await page.evaluate(async () => globalThis.axe.run(globalThis.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  }));
  return result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
  }));
}

function blockingViolations(violations) {
  return violations.filter((violation) => BLOCKING_IMPACTS.has(violation.impact));
}

async function submitStudioForm(page, { buttonName, postUrl, returnUrl }) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.request().method() === 'POST' && candidate.url() === postUrl),
    page.getByRole('button', { name: buttonName, exact: true }).click(),
  ]);
  if (response.status() !== 303) {
    const requestHeaders = await response.request().allHeaders();
    const responseBody = await response.text().catch(() => '<unavailable>');
    const diagnostics = {
      origin: requestHeaders.origin ?? null,
      secFetchSite: requestHeaders['sec-fetch-site'] ?? null,
      referer: requestHeaders.referer ?? null,
      host: requestHeaders.host ?? null,
      responseBody,
    };
    throw new Error(`${buttonName} returned HTTP ${response.status()} instead of 303; ${JSON.stringify(diagnostics)}`);
  }
  await page.waitForURL(returnUrl);
  await page.waitForLoadState('networkidle');
}

async function main() {
  const outputRoot = path.resolve(process.env.ISSUE_132_TURNKEY_REVIEW_ROOT || 'artifacts/issue-132-turnkey-review');
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-issue132-visual-'));
  const workspaceDirectory = path.join(tempRoot, 'juniper-workspace');
  createTurnkeyWorkspace({
    workspaceDirectory,
    answers: {
      displayName: 'Juniper Workshop',
      id: 'juniper-workshop',
      address: '100 Example Avenue, Testville, NV 89000',
      phone: '(555) 010-2026',
      hours: 'Mon–Fri, 9:00 a.m.–6:00 p.m.',
      websiteUrl: 'https://juniper-workshop.example/',
      mapUrl: 'https://juniper-workshop.example/map',
      communityId: 'hive-654321',
      officialAccount: 'juniperwork',
      threadsContainerAccount: 'juniper.threads',
      paymentMerchantAccount: 'juniperwork',
    },
  });

  let runtime;
  let browser;
  try {
    runtime = await startTurnkeyStudio({ workspaceDirectory });
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(runtime.url, { waitUntil: 'networkidle' });
    await page.locator('[data-turnkey-media-form] select[name="pointer"]').selectOption('/venuePackage/home/hero/image/src');
    await page.locator('[data-turnkey-media-form] input[type="file"]').setInputFiles({
      name: 'juniper-hero.png', mimeType: 'image/png', buffer: TEST_PNG,
    });
    await Promise.all([
      page.waitForURL(runtime.url),
      page.getByRole('button', { name: 'Import into preview' }).click(),
    ]);
    await submitStudioForm(page, {
      buttonName: 'Keep changes in draft',
      postUrl: `${runtime.origin}${runtime.editorPath}/apply`,
      returnUrl: runtime.url,
    });
    await submitStudioForm(page, {
      buttonName: 'Save to workspace',
      postUrl: `${runtime.origin}${runtime.editorPath}/save-workspace`,
      returnUrl: runtime.url,
    });

    const studioDesktopViolations = await accessibilityViolations(page);
    await page.screenshot({ path: path.join(outputRoot, 'track-a-studio-desktop.png') });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(runtime.url, { waitUntil: 'networkidle' });
    const studioMobileViolations = await accessibilityViolations(page);
    await page.screenshot({ path: path.join(outputRoot, 'track-a-studio-mobile.png') });

    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`${runtime.origin}${runtime.editorPath}/preview`, { waitUntil: 'networkidle' });
    const outputViolations = await accessibilityViolations(page);
    await page.screenshot({ path: path.join(outputRoot, 'track-b-real-renderer-output.png') });

    const source = loadDeploymentAgnosticVenueSourceFile(path.join(workspaceDirectory, 'venue-source.json'));
    const readiness = qualifyTurnkeyWorkspace({ workspaceDirectory });
    const diagnostics = runtime.diagnostics();
    const tracks = {
      A: {
        role: 'HiVenues Venue Studio authoring experience',
        screenshots: ['track-a-studio-desktop.png', 'track-a-studio-mobile.png'],
        accessibilityViolations: [...studioDesktopViolations, ...studioMobileViolations],
      },
      B: {
        role: 'Generated venue website output from the real renderer',
        screenshots: ['track-b-real-renderer-output.png'],
        accessibilityViolations: outputViolations,
      },
    };
    const blocking = {
      A: blockingViolations(tracks.A.accessibilityViolations),
      B: blockingViolations(tracks.B.accessibilityViolations),
    };
    const manifest = {
      schemaVersion: 1,
      issue: 132,
      product: 'HiVenues',
      tracks,
      blockingAccessibilityFindings: blocking,
      importedHeroSource: source.venuePackage.home.hero.image.src,
      readiness: {
        ready: readiness.ready,
        sourceSha256: readiness.sourceSha256,
        rehearsalWorkspaceId: readiness.rehearsalWorkspaceId,
      },
      offlineBoundary: diagnostics,
    };
    fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    if (blocking.A.length || blocking.B.length) {
      throw new Error(`Serious/critical accessibility gate failed: Track A=${blocking.A.length}, Track B=${blocking.B.length}`);
    }
    if (diagnostics.rpcAttempts !== 0) {
      throw new Error(`Offline boundary failed: ${diagnostics.rpcAttempts} Hive RPC attempt(s)`);
    }
    process.stdout.write(`ISSUE_132_TURNKEY_VISUAL_REVIEW=PASS\n${JSON.stringify(manifest)}\n`);
  } finally {
    if (browser) await browser.close();
    if (runtime) await runtime.close();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

if (require.main === module) main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
module.exports = { accessibilityViolations, blockingViolations, main, submitStudioForm };

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const playwrightPackage = require('playwright/package.json');
const { createHv6NativeEditorFixture } = require('../test/support/hv6-native-editor-fixture');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('../test/support/hv7-juniper-venue');
const {
  closeServer: close,
  listenLoopback: listen,
  sha256,
} = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(ROOT, process.env.HV7_JUNIPER_VISUAL_OUTPUT || 'artifacts/hv7-juniper-visual');
const SHOTS = path.join(OUTPUT, 'screenshots');

async function runAxe(target) {
  await target.addScriptTag({ content: axe.source });
  const result = await target.evaluate(async () => globalThis.axe.run(globalThis.document, {
    resultTypes: ['violations'],
  }));
  const blocking = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
  assert.deepEqual(blocking, [], JSON.stringify(blocking, null, 2));
  return result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
  }));
}

async function assertNoHorizontalOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    clientWidth: globalThis.document.documentElement.clientWidth,
    scrollWidth: globalThis.document.documentElement.scrollWidth,
  }));
  assert.ok(geometry.scrollWidth - geometry.clientWidth <= 1, `${label}: ${JSON.stringify(geometry)}`);
  return geometry;
}

async function getPreviewFrame(page) {
  const iframe = page.locator('iframe[title="Real Hive-Venues home-page preview"]');
  await iframe.waitFor({ state: 'attached' });
  const handle = await iframe.elementHandle();
  assert.ok(handle, 'Juniper preview iframe is missing');
  const frame = await handle.contentFrame();
  assert.ok(frame, 'Juniper preview frame is missing');
  await frame.waitForLoadState('domcontentloaded');
  return frame;
}

async function submitAndWait(page, submitter) {
  const navigation = page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame());
  await submitter();
  await navigation;
  await page.waitForLoadState('networkidle');
}

async function exerciseCollectionAuthoring(page, fixture) {
  const acceptedBefore = fixture.session.canonicalAccepted();
  const programCard = page.locator('[data-collection-pointer="/venuePackage/home/programs/items"]');
  await programCard.locator('summary').click();
  const form = programCard.locator('.collection-add__form');
  await form.locator('[name="id"]').fill('repair-cafe');
  await form.locator('[name="title"]').fill('Repair café');
  await form.locator('[name="startAt"]').fill('2026-09-18T18:00:00-07:00');
  await form.locator('[name="endAt"]').fill('2026-09-18T20:00:00-07:00');
  await form.locator('[name="description"]').fill('A synthetic community repair session used to exercise structured venue authoring.');
  await form.locator('[name="accessNote"]').fill('Visitors welcome; individual tool eligibility still applies.');
  await form.locator('[name="state"]').selectOption('scheduled');
  await submitAndWait(page, () => form.locator('button[type="submit"]').click());

  assert.equal(fixture.session.status().dirty, true);
  assert.equal(fixture.session.canonicalAccepted(), acceptedBefore);
  let preview = await getPreviewFrame(page);
  await preview.locator('[data-program-id="repair-cafe"]').waitFor({ state: 'visible' });
  assert.match(await preview.locator('[data-program-id="repair-cafe"]').textContent(), /Repair café/);

  const accentForm = page.locator('form[data-field-pointer="/venuePackage/brand/theme/accent"]');
  await accentForm.locator('[name="value"]').fill('#8a5000');
  await submitAndWait(page, () => accentForm.locator('button[type="submit"]').click());
  preview = await getPreviewFrame(page);
  assert.equal(
    (await preview.locator('html').evaluate((node) => globalThis.getComputedStyle(node).getPropertyValue('--venue-accent'))).trim(),
    '#8a5000',
  );

  await submitAndWait(page, () => page.locator('[data-action="apply"]').click());
  assert.equal(fixture.session.status().dirty, false);
  assert.equal(fixture.session.acceptedDocument.venuePackage.home.programs.items.some((item) => item.id === 'repair-cafe'), true);
  assert.equal(fixture.session.acceptedDocument.venuePackage.brand.theme.accent, '#8a5000');

  return {
    acceptedCanonicalSha256: sha256(fixture.session.canonicalAccepted()),
    addedProgramId: 'repair-cafe',
    appliedAccent: '#8a5000',
  };
}

async function inspectPublicHome(page) {
  await page.locator('#home-heading').waitFor({ state: 'visible' });
  const text = await page.locator('body').innerText();
  assert.match(text, /Juniper Works Cooperative/);
  assert.match(text, /Upcoming at the workshop/i);
  assert.match(text, /New member orientation/);
  assert.match(text, /Equipment status/i);
  assert.match(text, /Laser cutter/);
  assert.match(text, /Maintenance/);
  assert.match(text, /Available/);
  assert.match(text, /Limited/);
  assert.match(text, /Hive-Venues/);
  assert.doesNotMatch(text, /Hive-Bar|Fourth Street|\bbeer\b|\bbartender\b|\bpatron\b/i);
  assert.equal(await page.locator('a[href="/pay"]').count(), 0);
  assert.equal(await page.locator('[data-program-state="full"]').textContent(), 'Full');
  assert.equal(await page.locator('[data-equipment-state="maintenance"]').textContent(), 'Maintenance');
  assert.equal(await page.locator('img[src="/fixtures/juniper-works/workshop.svg"]').count(), 1);
  assert.equal(await page.locator('img[src^="/fixtures/juniper-works/project-"]').count(), 3);
  return {
    accent: (await page.locator('html').evaluate((node) => globalThis.getComputedStyle(node).getPropertyValue('--venue-accent'))).trim(),
    programCount: await page.locator('[data-program-id]').count(),
    equipmentCount: await page.locator('[data-equipment-id]').count(),
  };
}

async function run() {
  await fs.rm(OUTPUT, { recursive: true, force: true });
  await fs.mkdir(SHOTS, { recursive: true });

  const fixture = createHv6NativeEditorFixture(JUNIPER_WORKS_AUTHORING_INPUT);
  const server = await listen(fixture.app);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const evidence = {
    playwright: playwrightPackage.version,
    venue: 'Juniper Works Cooperative',
    evidenceTier: 'TIER_A_PRODUCT_AND_ARCHITECTURE',
    externalNetwork: 'BLOCKED',
    scenarios: {},
  };

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1') return route.continue();
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto(`${origin}${fixture.previewPath}`, { waitUntil: 'networkidle' });
    evidence.scenarios.publicDesktop = {
      ...(await inspectPublicHome(page)),
      geometry: await assertNoHorizontalOverflow(page, 'public desktop'),
      axe: await runAxe(page),
    };
    await page.screenshot({ path: path.join(SHOTS, 'juniper-public-desktop.png'), fullPage: true });

    await page.goto(`${origin}${fixture.editorPath}`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-collection-pointer="/venuePackage/home/programs/items"]').count(), 1);
    assert.equal(await page.locator('[data-collection-pointer="/venuePackage/home/equipmentStatus/items"]').count(), 1);
    assert.equal(await page.locator('input[type="color"]').count(), 7);
    const authoring = await exerciseCollectionAuthoring(page, fixture);
    const preview = await getPreviewFrame(page);
    evidence.scenarios.authoringDesktop = {
      ...authoring,
      geometry: await assertNoHorizontalOverflow(page, 'authoring desktop'),
      axeEditor: await runAxe(page),
      axePreview: await runAxe(preview),
    };
    await page.screenshot({ path: path.join(SHOTS, 'juniper-authoring-desktop.png'), fullPage: true });
    assert.deepEqual(consoleErrors, [], JSON.stringify(consoleErrors, null, 2));
    await context.close();

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await mobileContext.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1') return route.continue();
      return route.abort('blockedbyclient');
    });
    const mobile = await mobileContext.newPage();
    await mobile.goto(`${origin}${fixture.previewPath}`, { waitUntil: 'networkidle' });
    evidence.scenarios.publicMobile = {
      ...(await inspectPublicHome(mobile)),
      geometry: await assertNoHorizontalOverflow(mobile, 'public mobile'),
      axe: await runAxe(mobile),
    };
    await mobile.screenshot({ path: path.join(SHOTS, 'juniper-public-mobile.png'), fullPage: true });

    await mobile.goto(`${origin}${fixture.editorPath}`, { waitUntil: 'networkidle' });
    const editorGeometry = await assertNoHorizontalOverflow(mobile, 'authoring mobile');
    const positions = await mobile.evaluate(() => ({
      previewTop: globalThis.document.querySelector('.preview').getBoundingClientRect().top,
      inspectorTop: globalThis.document.querySelector('.inspector').getBoundingClientRect().top,
      undersized: Array.from(globalThis.document.querySelectorAll('button,input:not([type="hidden"]),textarea,select,summary'))
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.height < 44;
        })
        .map((node) => ({ tag: node.tagName, height: node.getBoundingClientRect().height })),
    }));
    assert.ok(positions.previewTop < positions.inspectorTop, JSON.stringify(positions));
    assert.deepEqual(positions.undersized, [], JSON.stringify(positions));
    evidence.scenarios.authoringMobile = {
      geometry: editorGeometry,
      layout: positions,
      axe: await runAxe(mobile),
    };
    await mobile.screenshot({ path: path.join(SHOTS, 'juniper-authoring-mobile.png'), fullPage: true });
    await mobileContext.close();

    const files = await fs.readdir(SHOTS);
    evidence.screenshots = {};
    for (const filename of files.sort()) {
      const bytes = await fs.readFile(path.join(SHOTS, filename));
      evidence.screenshots[filename] = { sha256: sha256(bytes), bytes: bytes.length };
    }
    await fs.writeFile(path.join(OUTPUT, 'manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  } finally {
    await browser.close();
    await close(server);
    fixture.previewApplication.locals.services.receiptStore?.close?.();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const playwrightPackage = require('playwright/package.json');
const { extractDeploymentAgnosticVenueSource } = require('../src/venue/source');
const {
  FOURTH_STREET_AUTHORING_INPUT,
} = require('../test/support/hv5-authoring-fixtures');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('../test/support/hv7-juniper-venue');
const { createSourceAuthoringFixture } = require('../test/support/source-authoring-fixture');
const {
  closeServer: close,
  listenLoopback: listen,
  sha256,
} = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(ROOT, process.env.SOURCE_AUTHORING_VISUAL_OUTPUT || 'artifacts/source-authoring-visual');
const SHOTS = path.join(OUTPUT, 'screenshots');
const SCENARIOS = Object.freeze([
  { id: 'fourth-street-desktop', width: 1440, height: 1000, input: FOURTH_STREET_AUTHORING_INPUT },
  { id: 'fourth-street-mobile', width: 390, height: 844, input: FOURTH_STREET_AUTHORING_INPUT },
  { id: 'juniper-desktop', width: 1440, height: 1000, input: JUNIPER_WORKS_AUTHORING_INPUT },
  { id: 'juniper-mobile', width: 390, height: 844, input: JUNIPER_WORKS_AUTHORING_INPUT },
]);

function sourceOf(authoring) {
  return extractDeploymentAgnosticVenueSource(authoring);
}

async function getPreviewFrame(page) {
  const iframe = page.locator('iframe[title="Venue preview"]');
  await iframe.waitFor({ state: 'attached' });
  const handle = await iframe.elementHandle();
  assert.ok(handle, 'source-authoring preview iframe is missing');
  const frame = await handle.contentFrame();
  assert.ok(frame, 'source-authoring preview frame is missing');
  await frame.waitForLoadState('domcontentloaded');
  return frame;
}

async function runAxe(target) {
  const result = await target.evaluate(async () => globalThis.axe.run(globalThis.document, {
    resultTypes: ['violations'],
  }));
  const blocking = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
  assert.deepEqual(blocking, [], JSON.stringify(blocking, null, 2));
  return result.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length }));
}

function stageForSection(label) {
  if (['Basics', 'Brand', 'Colors', 'Welcome', 'Gallery'].includes(label)) return 'brand';
  if (['Updates', 'Programs', 'Equipment', 'Getting started', 'Visit', 'Community'].includes(label)) return 'page';
  return 'details';
}

async function chooseSection(page, label) {
  const stageId = stageForSection(label);
  const stage = page.locator(`[data-studio-stage="${stageId}"]`);
  if (await stage.count()) await stage.click();
  const link = page.getByRole('link', { name: label, exact: true });
  await link.waitFor({ state: 'visible' });
  await link.click();
  const active = page.locator('.section[data-qol-active="true"]');
  await active.waitFor({ state: 'visible' });
  assert.equal((await active.locator('h2').textContent()).trim(), label);
  assert.equal(await link.getAttribute('aria-current'), 'page');
}

async function inspectSimpleEditor(page, scenario) {
  const text = await page.locator('body').innerText();
  assert.match(text, /Customize your venue/);
  assert.match(text, /Hosting comes later/);
  assert.match(text, /four simple steps/i);
  assert.match(text, /Keep changes/);
  assert.match(text, /Undo preview changes/);
  assert.match(text, /Venue Studio/);
  assert.doesNotMatch(text, /deploymentRef|Stable item ID|Operator-owned|ISO date\/time|Local image path|raw JSON/i);
  assert.equal(await page.locator('form[data-field-pointer$="/src"]').count(), 0);
  const geometry = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const fieldForms = Array.from(globalThis.document.querySelectorAll('form[data-field-pointer]'));
    const visibleControls = Array.from(globalThis.document.querySelectorAll('button,input:not([type="hidden"]),textarea,select,summary,a'))
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((node) => ({ tag: node.tagName, height: node.getBoundingClientRect().height }));
    const visibleFieldCount = fieldForms.filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).length;
    return {
      progressiveMode: root.dataset.qolProgressive,
      studioStageCount: globalThis.document.querySelectorAll('[data-studio-stage]').length,
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      undersized: visibleControls.filter((control) => control.height < 44),
      sectionCount: globalThis.document.querySelectorAll('.section').length,
      activeSectionCount: globalThis.document.querySelectorAll('.section[data-qol-active="true"]').length,
      currentSectionLinkCount: globalThis.document.querySelectorAll('.nav a[aria-current="page"]').length,
      fieldCount: fieldForms.length,
      visibleFieldCount,
      previewTop: globalThis.document.querySelector('.preview').getBoundingClientRect().top,
      editorTop: globalThis.document.querySelector('.editor').getBoundingClientRect().top,
    };
  });
  assert.equal(geometry.progressiveMode, 'section-picker', `${scenario.id}: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.studioStageCount, 4, `${scenario.id}: ${JSON.stringify(geometry)}`);
  assert.ok(geometry.horizontalOverflow <= 1, `${scenario.id}: ${JSON.stringify(geometry)}`);
  assert.deepEqual(geometry.undersized, [], `${scenario.id}: ${JSON.stringify(geometry)}`);
  assert.ok(geometry.sectionCount >= 8, `${scenario.id}: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.activeSectionCount, 1, `${scenario.id}: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.currentSectionLinkCount, 1, `${scenario.id}: ${JSON.stringify(geometry)}`);
  assert.ok(geometry.fieldCount >= 20, `${scenario.id}: ${JSON.stringify(geometry)}`);
  assert.ok(geometry.visibleFieldCount > 0, `${scenario.id}: ${JSON.stringify(geometry)}`);
  assert.ok(geometry.visibleFieldCount < geometry.fieldCount, `${scenario.id}: ${JSON.stringify(geometry)}`);
  return geometry;
}

async function submitAndWait(page, submitter) {
  const navigation = page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame());
  await submitter();
  await navigation;
  await page.waitForLoadState('networkidle');
}

async function exerciseFourthStreet(page, fixture) {
  const originalName = fixture.session.previewProjection().siteName;
  const originalLede = fixture.session.previewProjection().venuePackage.home.hero.lede;
  const editedLede = 'Source-authoring preview qualification only.';
  await chooseSection(page, 'Welcome');
  const form = page.locator('form[data-field-pointer="/venuePackage/home/hero/lede"]');
  await form.locator('[name="value"]').fill(editedLede);
  await submitAndWait(page, () => page.locator('.section[data-qol-active="true"] .studio-preview-stage').click());
  assert.equal(fixture.session.status().dirty, true);
  assert.equal(await page.locator('.nav a[aria-current="page"]').textContent(), 'Welcome');
  let preview = await getPreviewFrame(page);
  assert.equal((await preview.locator('#home-heading').textContent()).trim(), originalName);
  assert.equal((await preview.locator('.home-hero__lede').textContent()).trim(), editedLede);

  await submitAndWait(page, () => page.getByRole('button', { name: 'Undo preview changes', exact: true }).click());
  assert.equal(fixture.session.status().dirty, false);
  assert.equal(await page.locator('.nav a[aria-current="page"]').textContent(), 'Welcome');
  preview = await getPreviewFrame(page);
  assert.equal((await preview.locator('#home-heading').textContent()).trim(), originalName);
  assert.equal((await preview.locator('.home-hero__lede').textContent()).trim(), originalLede);
  return {
    preservedVenueName: originalName,
    editedPointer: '/venuePackage/home/hero/lede',
    previewedNonIdentityChange: true,
    discardedBeforeEvidenceCapture: true,
  };
}

async function exerciseJuniper(page, fixture) {
  await chooseSection(page, 'Programs');
  const card = page.locator('[data-collection-pointer="/venuePackage/home/programs/items"]');
  assert.equal(await card.count(), 1);
  await card.locator('summary').click();
  const form = card.locator('.add-form');
  assert.equal(await form.locator('[name="id"]').count(), 0);
  await form.locator('[name="title"]').fill('Repair café');
  await form.locator('[name="startAt"]').fill('2026-09-18 18:00 -07:00');
  await form.locator('[name="endAt"]').fill('2026-09-18 20:00 -07:00');
  await form.locator('[name="description"]').fill('A community repair session.');
  await form.locator('[name="accessNote"]').fill('Visitors welcome; normal tool eligibility still applies.');
  await form.locator('[name="state"]').selectOption('scheduled');
  await submitAndWait(page, () => form.locator('button[type="submit"]').click());
  assert.equal(await page.locator('.nav a[aria-current="page"]').textContent(), 'Programs');
  const added = fixture.session.previewProjection().venuePackage.home.programs.items.find((item) => item.title === 'Repair café');
  assert.ok(added);
  assert.equal(added.id, 'repair-cafe');
  const preview = await getPreviewFrame(page);
  await preview.locator('[data-program-id="repair-cafe"]').waitFor({ state: 'visible' });
  return { generatedProgramId: added.id };
}

async function inspectStructuredPostInteraction(page, scenario) {
  const result = await page.evaluate(() => {
    const active = globalThis.document.querySelector('.section[data-qol-active="true"]');
    const groups = Array.from(active?.querySelectorAll('details.item-edit-group') || []);
    const indexedForms = Array.from(active?.querySelectorAll('form[data-field-pointer*="/items/"]') || []);
    const visibleIndexed = indexedForms.filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    return {
      activeHeading: active?.querySelector('h2')?.textContent.trim() || null,
      structuredMode: active?.dataset.qolStructured || null,
      groupCount: groups.length,
      openCount: groups.filter((group) => group.open).length,
      summaries: groups.map((group) => group.querySelector('summary')?.textContent.trim() || ''),
      indexedFieldCount: indexedForms.length,
      visibleIndexedFieldCount: visibleIndexed.length,
    };
  });
  assert.equal(result.activeHeading, 'Programs', `${scenario.id}: ${JSON.stringify(result)}`);
  assert.equal(result.structuredMode, 'item-disclosure', `${scenario.id}: ${JSON.stringify(result)}`);
  assert.ok(result.groupCount >= 2, `${scenario.id}: ${JSON.stringify(result)}`);
  assert.equal(result.openCount, 0, `${scenario.id}: ${JSON.stringify(result)}`);
  assert.ok(result.indexedFieldCount >= result.groupCount, `${scenario.id}: ${JSON.stringify(result)}`);
  assert.equal(result.visibleIndexedFieldCount, 0, `${scenario.id}: ${JSON.stringify(result)}`);
  assert.ok(result.summaries.every((summary) => /^Edit\s+\S/.test(summary)), `${scenario.id}: ${JSON.stringify(result)}`);
  assert.ok(result.summaries.some((summary) => /Repair café/i.test(summary)), `${scenario.id}: ${JSON.stringify(result)}`);

  const repairGroup = page.locator('details.item-edit-group', { hasText: 'Repair café' });
  assert.equal(await repairGroup.count(), 1);
  await repairGroup.locator('summary').click();
  const openedVisibleFields = await repairGroup.locator('form[data-field-pointer]').evaluateAll((nodes) => nodes.filter((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }).length);
  assert.ok(openedVisibleFields > 0 && openedVisibleFields <= 7, `${scenario.id}: opened ${openedVisibleFields}`);
  await repairGroup.locator('summary').click();
  assert.equal(await repairGroup.getAttribute('open'), null);
  return { ...result, openedVisibleFields };
}

async function inspectPreviewPostInteraction(preview, scenario) {
  if (!scenario.id.startsWith('fourth-street')) return null;
  const hero = await preview.evaluate(() => {
    const caption = globalThis.document.querySelector('.home-hero__caption')?.getBoundingClientRect();
    const location = globalThis.document.querySelector('.home-hero__location')?.getBoundingClientRect();
    if (!caption || !location) return null;
    const overlap = !(
      caption.right <= location.left
      || caption.left >= location.right
      || caption.bottom <= location.top
      || caption.top >= location.bottom
    );
    return {
      caption: { top: caption.top, right: caption.right, bottom: caption.bottom, left: caption.left },
      location: { top: location.top, right: location.right, bottom: location.bottom, left: location.left },
      verticalGap: location.top - caption.bottom,
      overlap,
    };
  });
  assert.ok(hero, `${scenario.id}: hero geometry unavailable`);
  assert.equal(hero.overlap, false, `${scenario.id}: ${JSON.stringify(hero)}`);
  if (scenario.width <= 519) assert.ok(hero.verticalGap >= 8, `${scenario.id}: ${JSON.stringify(hero)}`);
  return hero;
}

async function inspectPostInteraction(page, preview, scenario) {
  const editor = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const visibleControls = Array.from(globalThis.document.querySelectorAll('button,input:not([type="hidden"]),textarea,select,summary,a'))
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((node) => ({ tag: node.tagName, height: node.getBoundingClientRect().height }));
    return {
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      undersized: visibleControls.filter((control) => control.height < 44),
      activeSectionCount: globalThis.document.querySelectorAll('.section[data-qol-active="true"]').length,
      currentSectionLinkCount: globalThis.document.querySelectorAll('.nav a[aria-current="page"]').length,
    };
  });
  assert.ok(editor.horizontalOverflow <= 1, `${scenario.id}: ${JSON.stringify(editor)}`);
  assert.deepEqual(editor.undersized, [], `${scenario.id}: ${JSON.stringify(editor)}`);
  assert.equal(editor.activeSectionCount, 1, `${scenario.id}: ${JSON.stringify(editor)}`);
  assert.equal(editor.currentSectionLinkCount, 1, `${scenario.id}: ${JSON.stringify(editor)}`);

  return {
    editor,
    structured: scenario.id.startsWith('juniper') ? await inspectStructuredPostInteraction(page, scenario) : null,
    previewHero: await inspectPreviewPostInteraction(preview, scenario),
  };
}

async function runScenario(browser, scenario) {
  const fixture = createSourceAuthoringFixture(sourceOf(scenario.input));
  const server = await listen(fixture.app);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height } });
  await context.addInitScript({ content: axe.source });
  const externalRequests = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    externalRequests.push(route.request().url());
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  try {
    await page.goto(`${origin}${fixture.editorPath}`, { waitUntil: 'networkidle' });
    const geometry = await inspectSimpleEditor(page, scenario);
    const exercise = scenario.id.startsWith('juniper')
      ? await exerciseJuniper(page, fixture)
      : await exerciseFourthStreet(page, fixture);
    const preview = await getPreviewFrame(page);
    const postInteraction = await inspectPostInteraction(page, preview, scenario);
    const axeEditor = await runAxe(page);
    const axePreview = await runAxe(preview);
    assert.deepEqual(externalRequests, [], JSON.stringify(externalRequests, null, 2));
    assert.deepEqual(fixture.rpcPool.calls, [], JSON.stringify(fixture.rpcPool.calls, null, 2));
    assert.deepEqual(consoleErrors, [], JSON.stringify(consoleErrors, null, 2));
    await page.screenshot({ path: path.join(SHOTS, `${scenario.id}.png`), fullPage: true });
    return {
      width: scenario.width,
      height: scenario.height,
      geometry,
      exercise,
      postInteraction,
      axeEditor,
      axePreview,
      externalNetworkRequests: externalRequests.length,
      hiveRpcCalls: fixture.rpcPool.calls.length,
    };
  } finally {
    await context.close();
    await close(server);
    fixture.previewApplication.locals.services.receiptStore?.close?.();
  }
}

async function run() {
  await fs.rm(OUTPUT, { recursive: true, force: true });
  await fs.mkdir(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const evidence = {
    playwright: playwrightPackage.version,
    evidence: 'DEPLOYMENT_AGNOSTIC_SOURCE_OPERATOR_AUTHORING',
    operatorSkillAssumption: 'BASIC_COMPUTER_SKILLS',
    externalNetwork: 'BLOCKED',
    scenarios: {},
  };
  try {
    for (const scenario of SCENARIOS) evidence.scenarios[scenario.id] = await runScenario(browser, scenario);
    const files = await fs.readdir(SHOTS);
    evidence.screenshots = {};
    for (const filename of files.sort()) {
      const bytes = await fs.readFile(path.join(SHOTS, filename));
      evidence.screenshots[filename] = { sha256: sha256(bytes), bytes: bytes.length };
    }
    await fs.writeFile(path.join(OUTPUT, 'manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

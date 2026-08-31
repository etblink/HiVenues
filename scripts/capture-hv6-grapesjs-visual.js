'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const playwrightPackage = require('playwright/package.json');
const grapesPackage = require('../test/support/hv6-grapesjs-eval-package/node_modules/grapesjs/package.json');
const { FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT } = require('../test/support/hv5-authoring-fixtures');
const { createHv6GrapesJsEditorFixture } = require('../test/support/hv6-grapesjs-editor-fixture');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(ROOT, process.env.HV6_GRAPESJS_VISUAL_OUTPUT || 'artifacts/hv6-grapesjs-visual');
const SHOTS = path.join(OUTPUT, 'screenshots');
const LANTERN_ASSETS = new Set([
  '/fixtures/lantern-room/logo.svg', '/fixtures/lantern-room/reading-room.jpg',
  '/fixtures/lantern-room/bookshelf.jpg', '/fixtures/lantern-room/reading-table.jpg',
  '/fixtures/lantern-room/front-desk.jpg',
]);
const SCENARIOS = [
  { id: 'fourth-street-desktop', width: 1440, height: 1000, input: FOURTH_STREET_AUTHORING_INPUT, edit: true },
  { id: 'lantern-room-tablet', width: 768, height: 1024, input: LANTERN_ROOM_AUTHORING_INPUT, edit: true },
  { id: 'fourth-street-mobile', width: 390, height: 844, input: FOURTH_STREET_AUTHORING_INPUT, edit: false },
];

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const getAt = (document, pointer) => pointer.slice(1).split('/').reduce((value, segment) => value[segment], document);
const listen = (app) => new Promise((resolve, reject) => { const server = app.listen(0, '127.0.0.1'); server.once('error', reject); server.once('listening', () => resolve(server)); });
const close = (server) => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

function svg(pathname) {
  const label = path.basename(pathname, path.extname(pathname)).replaceAll('-', ' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#18181b"/><circle cx="600" cy="330" r="150" fill="#f5f5f4"/><text x="600" y="700" text-anchor="middle" font-family="system-ui" font-size="50" fill="#f5f5f4">Lantern Room · ${label}</text></svg>`;
}

function edits(scenario) {
  const fourth = scenario.input.venueContext.id === FOURTH_STREET_AUTHORING_INPUT.venueContext.id;
  return [
    ['/venueContext/displayName', fourth ? 'Fourth Street Canvas' : 'Lantern Room Canvas'],
    ['/venueContext/business/phone', fourth ? '(775) 555-0166' : '(555) 010-6161'],
    ['/venuePackage/home/hero/lede', fourth ? 'A GrapesJS-evaluated neighborhood venue proposal.' : 'A GrapesJS-evaluated fictional reading room proposal.'],
    ['/venuePackage/home/hero/image/src', fourth ? '/images/fourth-street-bar-logo.jpg' : '/fixtures/lantern-room/logo.svg'],
    ['/venuePackage/home/hero/image/alt', fourth ? 'Fourth Street Canvas venue mark' : 'Lantern Room Canvas venue mark'],
    ['/venuePackage/home/hero/image/caption', fourth ? 'Fourth Street Canvas · bounded evaluation' : 'Lantern Room Canvas · bounded evaluation'],
    ['/venuePackage/home/gallery/items/0/caption', fourth ? 'Fixed-slot pool table · Grapes evaluation' : 'Fixed-slot bookshelf · Grapes evaluation'],
    ['/venuePackage/onboarding/operatorNoun', fourth ? 'neighborhood bar' : 'reading salon'],
    ['/venuePackage/onboarding/staffRole', fourth ? 'host' : 'curator'],
  ];
}

async function frameFor(locator) {
  await locator.waitFor({ state: 'attached' });
  const handle = await locator.elementHandle();
  assert.ok(handle);
  const frame = await handle.contentFrame();
  assert.ok(frame);
  return frame;
}

async function axeCheck(target) {
  await target.addScriptTag({ content: axe.source });
  const result = await target.evaluate(async () => globalThis.axe.run(globalThis.document, { resultTypes: ['violations'] }));
  const blocking = result.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  assert.deepEqual(blocking, [], JSON.stringify(blocking, null, 2));
  return result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
}

async function submit(page) {
  const navigation = page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame());
  await page.keyboard.press('Enter');
  await navigation;
  await page.waitForLoadState('networkidle');
  await page.locator('body[data-grapes-ready="true"]').waitFor();
}

async function keyboardEdit(page, pointer, value, expected = value) {
  const form = page.locator(`form[data-field-pointer="${pointer}"]`);
  const control = form.locator('[name="value"]');
  await control.focus(); await page.keyboard.press('Control+A'); await page.keyboard.type(value); await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => globalThis.document.activeElement?.tagName), 'BUTTON');
  await submit(page);
  assert.equal(await page.locator(`form[data-field-pointer="${pointer}"] [name="value"]`).inputValue(), expected);
}

async function action(page, name) {
  await page.locator(`[data-action="${name}"]`).focus();
  await submit(page);
}

async function restrictions(page) {
  return page.evaluate(() => {
    const { editor, policy } = globalThis.__HV6_GRAPESJS_EVAL__;
    let scriptComponents = 0;
    let mutableSections = 0;
    let selectableSections = 0;
    const walk = (component) => {
      if (component.get('script')) scriptComponents += 1;
      const attrs = component.getAttributes();
      if (attrs['data-hv6-section']) {
        const locked = ['draggable','droppable','removable','copyable','stylable','editable'].every((key) => component.get(key) === false);
        if (!locked || (component.get('toolbar') || []).length) mutableSections += 1;
        if (component.get('selectable') !== false) selectableSections += 1;
      }
      component.components().forEach(walk);
    };
    walk(editor.getWrapper());
    const protectedControls = globalThis.document.querySelectorAll([
      'form[data-field-pointer="/venueContext/id"]',
      'form[data-field-pointer="/venueContext/hive/communityId"]',
      'form[data-field-pointer="/deploymentRef/id"]',
      'form[data-field-pointer="/venuePackage/home/gallery/items"]',
    ].join(',')).length;
    return {
      policy, blocks: editor.BlockManager.getAll().length, panels: editor.Panels.getPanels().length,
      styleSectors: editor.StyleManager.getSectors().length, scriptComponents, mutableSections, selectableSections,
      localStorageEntries: globalThis.localStorage.length, protectedControls,
      visibleRawPointers: Array.from(globalThis.document.querySelectorAll('body *')).filter((n) => n.children.length === 0 && /\/(venueContext|venuePackage|deploymentRef)\//.test(n.textContent || '')).length,
    };
  });
}

async function proveReadOnlyProjection(page, canvas) {
  const inspectorSections = await page.locator('[data-semantic-section]').evaluateAll((nodes) => nodes.map((node) => node.dataset.semanticSection));
  const canvasSections = await canvas.locator('[data-hv6-section]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-hv6-section')));
  assert.ok(inspectorSections.length >= 8, JSON.stringify(inspectorSections));
  assert.deepEqual(canvasSections, inspectorSections);
  return canvasSections;
}

async function authoring(page, fixture, scenario) {
  const hostile = '<script>globalThis.__HV6_GJS_EXECUTED__=true</script>';
  await keyboardEdit(page, '/venuePackage/home/hero/lede', hostile);
  let review = await frameFor(page.locator('iframe[title="Real Hive-Venues review preview"]'));
  assert.equal((await review.locator('.home-hero__lede').textContent()).trim(), hostile);
  assert.equal(await review.evaluate(() => globalThis.__HV6_GJS_EXECUTED__), undefined);
  await action(page, 'discard');
  assert.equal(fixture.session.canonicalAccepted(), fixture.session.canonicalProposal());

  const matrix = edits(scenario);
  for (const [pointer, value] of matrix) await keyboardEdit(page, pointer, value);
  for (const [pointer, value] of matrix) assert.equal(getAt(fixture.session.proposalDraft, pointer), value, pointer);
  review = await frameFor(page.locator('iframe[title="Real Hive-Venues review preview"]'));
  assert.equal((await review.locator('#home-heading').textContent()).trim(), getAt(fixture.session.proposalDraft, '/venueContext/displayName'));

  await action(page, 'apply');
  const acceptedCanonical = fixture.session.canonicalAccepted();
  for (const [pointer, value] of matrix) assert.equal(getAt(fixture.session.acceptedDocument, pointer), value, pointer);
  await page.evaluate(() => { globalThis.__HV6_GRAPESJS_EVAL__.editor.destroy(); delete globalThis.__HV6_GRAPESJS_EVAL__; });
  await page.reload({ waitUntil: 'networkidle' }); await page.locator('body[data-grapes-ready="true"]').waitFor();
  assert.equal(fixture.session.canonicalAccepted(), acceptedCanonical);
  assert.equal(fixture.session.canonicalProposal(), acceptedCanonical);
  review = await frameFor(page.locator('iframe[title="Real Hive-Venues review preview"]'));
  assert.equal((await review.locator('#home-heading').textContent()).trim(), getAt(fixture.session.acceptedDocument, '/venueContext/displayName'));

  const currentImage = fixture.session.acceptedDocument.venuePackage.home.hero.image.src;
  await keyboardEdit(page, '/venuePackage/home/hero/image/src', 'https://evil.example/hero.jpg', currentImage);
  assert.equal(fixture.session.canonicalAccepted(), acceptedCanonical);
  assert.match((await page.locator('[role="status"]').textContent()).trim(), /absolute same-origin path/);
  return { acceptedCanonicalSha256: sha256(acceptedCanonical), representativeEdits: matrix.map(([pointer]) => pointer) };
}

async function runScenario(browser, scenario) {
  const fixture = createHv6GrapesJsEditorFixture(scenario.input); const server = await listen(fixture.app);
  const origin = `http://127.0.0.1:${server.address().port}`; const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height } }); const page = await context.newPage();
  const consoleErrors = []; const pageErrors = []; const lanternRequests = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); }); page.on('pageerror', (e) => pageErrors.push(e.message));
  await context.route('**/*', async (route) => { const url = new URL(route.request().url()); if (url.hostname === '127.0.0.1' && LANTERN_ASSETS.has(url.pathname)) { lanternRequests.push(url.pathname); return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg(url.pathname) }); } if (url.hostname === '127.0.0.1') return route.continue(); return route.abort('blockedbyclient'); });
  try {
    const base = fixture.session.canonicalAccepted(); await page.goto(origin + fixture.editorPath, { waitUntil: 'networkidle' }); await page.locator('body[data-grapes-ready="true"]').waitFor();
    assert.equal(fixture.session.canonicalAccepted(), base); assert.equal(fixture.session.canonicalProposal(), base);
    await page.keyboard.press('Tab'); assert.match(await page.evaluate(() => globalThis.document.activeElement?.textContent || ''), /Skip to editable fields/);
    const editorAxe = await axeCheck(page); const canvas = await frameFor(page.locator('#gjs iframe').first()); const canvasAxe = await axeCheck(canvas); const review = await frameFor(page.locator('iframe[title="Real Hive-Venues review preview"]')); const reviewAxe = await axeCheck(review);
    const lock = await restrictions(page); assert.deepEqual(lock.policy, { storageManager:false, autosaveAuthority:false, projectPersistence:false, blocks:false, styleAuthority:false, scriptAuthority:false, componentSelection:false, realRendererIsReviewTruth:true }); assert.equal(lock.blocks,0); assert.equal(lock.panels,0); assert.equal(lock.styleSectors,0); assert.equal(lock.scriptComponents,0); assert.equal(lock.mutableSections,0); assert.equal(lock.selectableSections,0); assert.equal(lock.localStorageEntries,0); assert.equal(lock.protectedControls,0); assert.equal(lock.visibleRawPointers,0);
    const canvasSections = await proveReadOnlyProjection(page, canvas); await page.screenshot({ path: path.join(SHOTS, `${scenario.id}-initial.png`), fullPage: true });
    let proof = { acceptedCanonicalSha256: sha256(base), representativeEdits: [] }; if (scenario.edit) proof = await authoring(page, fixture, scenario);
    await page.screenshot({ path: path.join(SHOTS, `${scenario.id}-final.png`), fullPage: true });
    assert.equal(fixture.rpcPool.calls.length,0); assert.deepEqual(consoleErrors,[],JSON.stringify(consoleErrors)); assert.deepEqual(pageErrors,[],JSON.stringify(pageErrors));
    if (scenario.input.venueContext.id === LANTERN_ROOM_AUTHORING_INPUT.venueContext.id) for (const asset of LANTERN_ASSETS) assert.ok(lanternRequests.includes(asset), asset);
    return { id:scenario.id, viewport:{width:scenario.width,height:scenario.height}, exerciseAuthoring:scenario.edit, canvasSections, editorAxeViolations:editorAxe, canvasAxeViolations:canvasAxe, reviewAxeViolations:reviewAxe, restrictions:lock, rpcCalls:0, consoleErrors, pageErrors, lanternAssetRequestCount:lanternRequests.length, ...proof };
  } finally { await context.close(); await close(server); }
}

async function main() {
  assert.equal(grapesPackage.version, '0.23.6'); assert.equal(grapesPackage.license, 'BSD-3-Clause');
  await fs.rm(OUTPUT,{recursive:true,force:true}); await fs.mkdir(SHOTS,{recursive:true}); const browser=await chromium.launch({headless:true});
  try { const scenarios=[]; for (const scenario of SCENARIOS) scenarios.push(await runScenario(browser,scenario)); const evidence={candidate:'HV6_GRAPESJS_CORE_READ_ONLY_CONTEXT_ADAPTER',grapesJsVersion:grapesPackage.version,grapesJsLicense:grapesPackage.license,playwrightVersion:playwrightPackage.version,browserVersion:browser.version(),scenarios}; await fs.writeFile(path.join(OUTPUT,'evidence.json'),JSON.stringify(evidence,null,2)+'\n','utf8'); process.stdout.write(JSON.stringify(evidence)+'\n'); } finally { await browser.close(); }
}
main().catch((error)=>{console.error(error);process.exitCode=1});

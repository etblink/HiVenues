'use strict';
/* global document, window */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { chromium } = require('playwright');
const { createDogfoodApp, startDogfoodServer } = require('../src/candidate-c/dogfood-app');
const { MAX_MULTIPART_BYTES } = require('../src/candidate-c/local-media');
const { ProvisioningFileCandidateCStore } = require('../src/candidate-c/provisioning-file-store');
const {
  advanceToDirection,
  advanceToParticipation,
  advanceToPresence,
  chooseDirection,
  dismissFirstDraftReveal,
  fillGuidedCreator,
  fillParticipation,
  fillPresence,
  fillPurpose,
  submitFirstDraft,
} = require('./candidate-c-guided-creator-operator');

const ROOT = path.join(__dirname, '..');
const OUTPUT_ROOT = process.env.CANDIDATE_C_ASTRA_BETA_REMEDIATION_ROOT || path.join(ROOT, 'artifacts', 'candidate-c-astra-beta-remediation');
const EXACT_SHA = process.env.CANDIDATE_C_ASTRA_BETA_REMEDIATION_EXACT_SHA || 'LOCAL_UNBOUND';
const EXACT_TREE = process.env.CANDIDATE_C_ASTRA_BETA_REMEDIATION_EXACT_TREE || 'LOCAL_UNBOUND';
const SLUG = 'astra-remediation-lab';
const SECONDARY_SLUG = 'astra-secondary-lab';
const ACTIVITY = 'Synthetic Evening Lab';
const INVITATION = 'INVITATION-PARITY-272 — join the synthetic lab and follow the public update.';
const OFFER_CATEGORY = 'Synthetic membership';
const OFFER_DETAIL = '$29 beta detail';
const UNPUBLISHED = 'UNPUBLISHED-BEFORE-URGENT — must remain Studio-only.';

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuffer, data]);
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(body), 8 + data.length);
  return output;
}

function syntheticPng(extraBytes = 0) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanline = Buffer.from([0, 0x64, 0x88, 0xcc, 0xff]);
  const chunks = [pngChunk('IHDR', ihdr)];
  if (extraBytes > 0) chunks.push(pngChunk('tEXt', Buffer.concat([Buffer.from('note\0'), Buffer.alloc(extraBytes, 0x41)])));
  chunks.push(pngChunk('IDAT', zlib.deflateSync(scanline)), pngChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat([signature, ...chunks]);
}

async function stopServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => server.closeAllConnections?.(), 1000);
    timer.unref?.();
    server.close((error) => { clearTimeout(timer); if (error) reject(error); else resolve(); });
  });
}

function observeContext(context, evidence) {
  context.on('request', (request) => {
    try {
      const url = new URL(request.url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) evidence.externalRequests.push(request.url());
    } catch (_) {}
  });
}

function observePage(page, evidence) {
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    const expectedResource = /^Failed to load resource: the server responded with a status of (400|409|413) \(/.exec(text);
    if (expectedResource) {
      evidence.adversarialResourceConsoleErrors.push({ status: Number(expectedResource[1]), text });
      return;
    }
    evidence.consoleErrors.push(text);
  });
  page.on('pageerror', (error) => evidence.pageErrors.push(error.message));
}

async function auditPage(page, label, records) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const axe = await page.evaluate(async () => window.axe.run(document, { resultTypes: ['violations'] }));
  const blocking = axe.violations.filter((item) => ['serious', 'critical'].includes(item.impact));
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    incompleteImages: Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0).length,
  }));
  records.push({
    label,
    violations: axe.violations.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })),
    blocking: blocking.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.slice(0, 4).map((node) => node.target) })),
    geometry,
  });
  assert.equal(blocking.length, 0, `${label}: blocking accessibility ${JSON.stringify(records.at(-1).blocking)}`);
  assert.equal(geometry.scrollWidth > geometry.clientWidth + 1, false, `${label}: horizontal overflow ${geometry.scrollWidth}/${geometry.clientWidth}`);
  assert.equal(geometry.incompleteImages, 0, `${label}: incomplete images`);
}

async function capture(page, filename, label, evidence) {
  await auditPage(page, label, evidence.audits);
  await page.screenshot({ path: path.join(OUTPUT_ROOT, filename), fullPage: true });
  evidence.screenshots.push(filename);
}

function zeroEffects(store) {
  const external = store.diagnostics().external;
  assert.deepEqual(external, { hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0 });
  return external;
}

async function openStudioMenu(page, label) {
  await page.locator('.cc-studio-commandbar summary').filter({ hasText: label }).click();
}

async function openStudioButton(page, menu, name) {
  await openStudioMenu(page, menu);
  await page.getByRole('button', { name, exact: true }).click();
}

async function openStudioLink(page, menu, name) {
  await openStudioMenu(page, menu);
  await page.getByRole('link', { name, exact: true }).click();
}

async function publishCurrent(page, origin, slug) {
  await page.goto(`${origin}/candidate-c/studio/${slug}/release`, { waitUntil: 'networkidle' });
  const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${slug}/release`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Publish website release' }).click();
  assert.equal((await responsePromise).status(), 303);
  await page.waitForURL((url) => url.pathname === `/candidate-c/studio/${slug}` && Boolean(url.searchParams.get('released')));
}

async function applyDirection(page, origin, slug, label) {
  await page.goto(`${origin}/candidate-c/studio/${slug}/direction`, { waitUntil: 'networkidle' });
  const card = page.locator('.cc-review-card').filter({ has: page.getByRole('heading', { name: label, exact: true }) });
  if (await card.getByText('In use', { exact: true }).count()) return;
  await card.getByRole('button', { name: 'Review this direction' }).click();
  await page.waitForURL((url) => url.pathname.startsWith(`/candidate-c/studio/${slug}/direction/`));
  await page.getByRole('button', { name: 'Apply direction to draft' }).click();
  await page.waitForURL((url) => url.pathname === `/candidate-c/studio/${slug}`);
}

async function createSecondary(page, origin) {
  await page.goto(`${origin}/candidate-c/new`, { waitUntil: 'networkidle' });
  await fillGuidedCreator(page, {
    displayName: 'Astra Secondary Lab',
    archetype: 'synthetic online host',
    tagline: 'A second synthetic workspace for restart qualification.',
    purpose: 'Prove two independently durable host workspaces.',
    presenceMode: 'online',
    presenceLabel: 'Online-only synthetic qualification space',
    address: '',
    contact: 'secondary qualification contact',
    timezone: 'America/Los_Angeles',
    summary: 'This second host exists only to prove durable multi-host runtime state.',
    presenceMaterial: 'Synthetic online-only material.',
    direction: 'editorial',
    participation: 'Read the synthetic update.',
  });
  await Promise.all([
    page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SECONDARY_SLUG}`),
    submitFirstDraft(page),
  ]);
  await dismissFirstDraftReveal(page);
  await openStudioButton(page, 'Page', 'First impression');
  await page.locator('#cc-tagline').fill('SECONDARY-WORKSPACE-DURABLE');
  const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SECONDARY_SLUG}/tagline`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save headline' }).click();
  assert.equal((await responsePromise).status(), 200);
  await publishCurrent(page, origin, SECONDARY_SLUG);
}

async function setActivityStatus(page, origin, slug, title, lifecycle, note = '') {
  await page.goto(`${origin}/candidate-c/studio/${slug}`, { waitUntil: 'networkidle' });
  await openStudioButton(page, 'Activities', title);
  await page.locator('#cc-activity-lifecycle').selectOption(lifecycle);
  const noteField = page.locator('#cc-activity-note');
  if (await noteField.count()) await noteField.fill(note);
  const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${slug}/activity-status`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save status' }).click();
  assert.equal((await responsePromise).status(), 200);
}

async function quickContact(page, origin, slug, value) {
  await page.goto(`${origin}/candidate-c/studio/${slug}`, { waitUntil: 'networkidle' });
  await openStudioButton(page, 'Site', 'Participation');
  assert.equal(await page.locator('#cc-contact').getAttribute('type'), 'text');
  await page.locator('#cc-contact').fill(value);
  const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${slug}/connect`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save contact' }).click();
  assert.equal((await responsePromise).status(), 200);
}

async function deepContact(page, origin, slug, value) {
  await page.goto(`${origin}/candidate-c/studio/${slug}/content`, { waitUntil: 'networkidle' });
  await page.locator('#cc-content-contact').fill(value);
  const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${slug}/content`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save public content to draft' }).click();
  assert.equal((await responsePromise).status(), 303);
  await page.waitForLoadState('networkidle');
}

async function capturePublicFamily(page, mobile, origin, slug, family, evidence) {
  await page.goto(`${origin}/candidate-c/${slug}`, { waitUntil: 'networkidle' });
  const body = await page.locator('body').textContent();
  assert.match(body, new RegExp(INVITATION));
  assert.match(body, new RegExp(OFFER_CATEGORY));
  assert.match(body, /\$29 beta detail/);
  await capture(page, `public-${family}-desktop.png`, `public-${family}-desktop`, evidence);
  await mobile.goto(`${origin}/candidate-c/${slug}`, { waitUntil: 'networkidle' });
  await capture(mobile, `public-${family}-390.png`, `public-${family}-390`, evidence);
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const statePath = path.join(OUTPUT_ROOT, 'state.json');
  const mediaRoot = path.join(OUTPUT_ROOT, 'local-media');
  const validPath = path.join(OUTPUT_ROOT, 'synthetic-valid.png');
  const oversizedPath = path.join(OUTPUT_ROOT, 'synthetic-oversized-valid.png');
  const malformedPath = path.join(OUTPUT_ROOT, 'not-an-image.jpg');
  fs.writeFileSync(validPath, syntheticPng());
  fs.writeFileSync(oversizedPath, syntheticPng(MAX_MULTIPART_BYTES + 2048));
  fs.writeFileSync(malformedPath, 'synthetic invalid image bytes\n', 'utf8');
  assert(fs.statSync(oversizedPath).size > MAX_MULTIPART_BYTES);

  let store = new ProvisioningFileCandidateCStore({ statePath, mediaRoot });
  let server = await startDogfoodServer(createDogfoodApp({ store, provenance: { commit: EXACT_SHA, tree: EXACT_TREE } }), { port: 0 });
  let origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const evidence = {
    candidate: EXACT_SHA,
    tree: EXACT_TREE,
    fixture: { synthetic: true, slug: SLUG, secondarySlug: SECONDARY_SLUG, purpose: 'Issues #269/#272 synthetic remediation + visual-convergence qualification.' },
    screenshots: [], audits: [], externalRequests: [], consoleErrors: [], adversarialResourceConsoleErrors: [], pageErrors: [],
  };
  observeContext(context, evidence);
  observeContext(mobileContext, evidence);
  let page = await context.newPage();
  const mobile = await mobileContext.newPage();
  for (const current of [page, mobile]) {
    current.setDefaultTimeout(15000);
    current.setDefaultNavigationTimeout(25000);
    observePage(current, evidence);
  }

  try {
    const build = await page.request.get(`${origin}/__dogfood/build`);
    assert.equal(build.status(), 200);
    const buildText = await build.text();
    assert.match(buildText, new RegExp(`HEAD ${EXACT_SHA}`));
    assert.match(buildText, new RegExp(`TREE ${EXACT_TREE}`));

    await page.goto(`${origin}/candidate-c/new`, { waitUntil: 'networkidle' });
    await fillPurpose(page, {
      displayName: 'Astra Remediation Lab',
      archetype: 'synthetic community venue',
      tagline: 'A synthetic place for product regression.',
      purpose: 'Exercise the complete remediation without real customer facts.',
    });
    await advanceToPresence(page);
    await fillPresence(page, {
      presenceMode: 'physical',
      presenceLabel: 'Synthetic Test City · evenings',
      address: '100 Fictional Way, Test City, NV 00000',
      contact: '(702) 555-0147',
      timezone: 'Not/A_Real_Zone',
      summary: 'A synthetic fixture used only to qualify HiVenues before its first real customer.',
      presenceMaterial: 'Synthetic atmosphere, deliberate copy and local-only test assets.',
    });
    await advanceToDirection(page);
    await chooseDirection(page, 'poster');
    await advanceToParticipation(page);
    await fillParticipation(page, {
      participation: INVITATION,
      activity: {
        title: ACTIVITY,
        description: 'A synthetic scheduled activity for reschedule, Release and lifecycle qualification.',
        startsLocal: '2026-10-30T18:00',
        endsLocal: '2026-10-30T17:00',
      },
    });
    const invalidResponsePromise = page.waitForResponse((response) => response.url().endsWith('/candidate-c/new') && response.request().method() === 'POST');
    await submitFirstDraft(page);
    assert.equal((await invalidResponsePromise).status(), 400);
    assert.equal(await page.locator('[name="contact"]').inputValue(), '(702) 555-0147');
    assert.doesNotMatch(await page.locator('body').textContent(), /activityEndsLocal:|timezone:/);
    await capture(page, '01-guided-validation-preserves-input.png', 'guided-validation-preserves-input', evidence);

    await page.locator('[name="timezone"]').fill('America/Los_Angeles');
    await advanceToDirection(page);
    await chooseDirection(page, 'poster');
    await advanceToParticipation(page);
    await fillParticipation(page, {
      participation: INVITATION,
      activity: {
        title: ACTIVITY,
        description: 'A synthetic scheduled activity for reschedule, Release and lifecycle qualification.',
        startsLocal: '2026-10-30T18:00',
        endsLocal: '2026-10-30T20:00',
      },
    });
    await Promise.all([
      page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}`),
      submitFirstDraft(page),
    ]);
    await capture(page, '02-first-draft-reveal.png', 'first-draft-reveal', evidence);
    await dismissFirstDraftReveal(page);
    const originalActivity = store.snapshot(SLUG).draft.activities[0];
    assert(originalActivity);
    await capture(page, '03-studio-desktop-normal.png', 'studio-desktop-normal', evidence);

    await openStudioLink(page, 'Offers', '+ Add offer');
    await page.locator('#cc-new-offer-title').fill('Synthetic Lab Pass');
    await page.locator('#cc-new-offer-summary').fill('A synthetic offer used only for beta remediation qualification.');
    await page.locator('#cc-new-offer-category').fill(OFFER_CATEGORY);
    await page.locator('#cc-new-offer-price').fill(OFFER_DETAIL);
    await Promise.all([
      page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}`),
      page.getByRole('button', { name: 'Add offering to draft' }).click(),
    ]);

    const liveBeforeSchedule = store.publicSnapshot(SLUG).draft.activities[0].startsAt;
    await openStudioButton(page, 'Activities', ACTIVITY);
    await page.getByRole('link', { name: 'Edit start & end time' }).click();
    await page.locator('#cc-schedule-start').fill('2026-10-30T19:00');
    await page.locator('#cc-schedule-end').fill('2026-10-30T21:30');
    await Promise.all([
      page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}`),
      page.getByRole('button', { name: 'Save schedule to working version' }).click(),
    ]);
    const rescheduled = store.snapshot(SLUG).draft.activities[0];
    assert.equal(rescheduled.id, originalActivity.id);
    assert.equal(rescheduled.slug, originalActivity.slug);
    assert.equal(rescheduled.mediaId, originalActivity.mediaId);
    assert.notEqual(rescheduled.startsAt, liveBeforeSchedule);
    assert.equal(store.publicSnapshot(SLUG).draft.activities[0].startsAt, liveBeforeSchedule);
    await publishCurrent(page, origin, SLUG);
    const scheduledIcs = await page.request.get(`${origin}/candidate-c/${SLUG}/activities/${rescheduled.slug}/calendar.ics`);
    assert.equal(scheduledIcs.status(), 200);
    const scheduledIcsText = await scheduledIcs.text();
    assert.match(scheduledIcsText, /STATUS:CONFIRMED/);
    assert.match(scheduledIcsText, /SUMMARY:Synthetic Evening Lab/);
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'released-scheduled-activity.ics.txt'), scheduledIcsText, 'utf8');

    await capturePublicFamily(page, mobile, origin, SLUG, 'poster', evidence);
    await applyDirection(page, origin, SLUG, 'Editorial field notes');
    await publishCurrent(page, origin, SLUG);
    await capturePublicFamily(page, mobile, origin, SLUG, 'editorial', evidence);
    await applyDirection(page, origin, SLUG, 'Hospitality table');
    await publishCurrent(page, origin, SLUG);
    await capturePublicFamily(page, mobile, origin, SLUG, 'hospitality', evidence);

    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await openStudioButton(page, 'Site', 'Look');
    await capture(page, '10-studio-desktop-contextual.png', 'studio-desktop-contextual', evidence);
    await page.locator('#cc-look-accent').selectOption('#f4a460');
    const lookResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/look`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save look' }).click();
    assert.equal((await lookResponse).status(), 200);
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/brand`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('input[name="accent"][value="#f4a460"]').isChecked(), true);

    const contactCases = [
      ['operator@example.test', 'email'],
      ['(702) 555-0199', 'phone'],
      ['https://astra-remediation.example.test/', 'web'],
      ['Ask at the front desk', 'text'],
    ];
    for (const [value] of contactCases) {
      await quickContact(page, origin, SLUG, value);
      assert.equal(store.snapshot(SLUG).draft.facts.contact, value);
    }
    for (const [value] of contactCases) {
      await deepContact(page, origin, SLUG, value);
      assert.equal(store.snapshot(SLUG).draft.facts.contact, value);
    }
    for (const [value, kind] of contactCases) {
      await deepContact(page, origin, SLUG, value);
      await publishCurrent(page, origin, SLUG);
      await page.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
      if (kind === 'email') assert((await page.locator(`a[href="mailto:${value}"]`).count()) > 0);
      if (kind === 'phone') assert((await page.locator('a[href="tel:7025550199"]').count()) > 0);
      if (kind === 'web') assert((await page.locator(`a[href="${value}"]`).count()) > 0);
      if (kind === 'text') {
        assert.match(await page.locator('body').textContent(), /Ask at the front desk/);
        assert.equal(await page.getByRole('link', { name: value, exact: true }).count(), 0);
      }
    }

    await setActivityStatus(page, origin, SLUG, ACTIVITY, 'completed', 'Synthetic completed-state proof.');
    await publishCurrent(page, origin, SLUG);
    await page.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    const completedBody = await page.locator('body').textContent();
    assert.match(completedBody, /PAST/);
    assert.match(completedBody, /Already happened/);
    assert.doesNotMatch(completedBody, /\bNEXT\b/);

    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await openStudioButton(page, 'Page', 'First impression');
    await page.locator('#cc-tagline').fill('RESTORE-REVIEW-UNPUBLISHED synthetic headline');
    const headlineResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/tagline`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save headline' }).click();
    assert.equal((await headlineResponse).status(), 200);
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/release`, { waitUntil: 'networkidle' });
    assert.match(await page.locator('body').textContent(), /Release impact/);
    assert.match(await page.locator('body').textContent(), /Headline changed/);
    await capture(page, '11-release-review-desktop.png', 'release-review-desktop', evidence);
    await publishCurrent(page, origin, SLUG);
    const liveBeforeRestore = store.publicSnapshot(SLUG).draftDigest;
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/release`, { waitUntil: 'networkidle' });
    const restoreLinks = page.getByRole('link', { name: 'Review restore', exact: true });
    assert((await restoreLinks.count()) >= 2);
    await restoreLinks.nth(1).click();
    await page.waitForURL((url) => /\/releases\/[^/]+\/restore$/.test(url.pathname));
    assert.match(await page.locator('body').textContent(), /does not roll the live website back/i);
    await page.getByRole('button', { name: 'Use this as working version' }).click();
    await page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}`);
    assert.equal(store.publicSnapshot(SLUG).draftDigest, liveBeforeRestore);

    const staleRelease = await context.newPage();
    observePage(staleRelease, evidence);
    staleRelease.setDefaultTimeout(15000);
    await staleRelease.goto(`${origin}/candidate-c/studio/${SLUG}/release`, { waitUntil: 'networkidle' });
    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await openStudioButton(page, 'Page', 'First impression');
    await page.locator('#cc-tagline').fill('NEWER-DRAFT-BEATS-STALE-RELEASE');
    const newerResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/tagline`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save headline' }).click();
    assert.equal((await newerResponse).status(), 200);
    const staleReleaseResponse = staleRelease.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/release`) && response.request().method() === 'POST');
    await staleRelease.getByRole('button', { name: 'Publish website release' }).click();
    assert.equal((await staleReleaseResponse).status(), 409);
    assert.match(await staleRelease.locator('body').textContent(), /newer version exists/i);
    await staleRelease.close();

    await page.goto(`${origin}/candidate-c/studio/${SLUG}/media-library`, { waitUntil: 'networkidle' });
    await page.locator('#cc-hero-file').setInputFiles(validPath);
    await page.locator('#cc-hero-alt').fill('Synthetic blue qualification pixel');
    await page.locator('#cc-hero-caption').fill('Synthetic local-only qualification media');
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get('imported') === 'hero'),
      page.getByRole('button', { name: /Replace placeholder with real image|Replace primary image/ }).click(),
    ]);
    await page.locator('#cc-logo-file').setInputFiles(validPath);
    await page.locator('#cc-logo-alt').fill('Synthetic qualification logo');
    await page.locator('#cc-logo-caption').fill('Synthetic local-only qualification mark');
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get('imported') === 'logo'),
      page.getByRole('button', { name: /Import official logo|Replace official logo/ }).click(),
    ]);
    await page.getByRole('link', { name: 'Back to Studio', exact: true }).click();
    await openStudioButton(page, 'Site', 'Hero media');
    await page.locator('#cc-focal-x').evaluate((element) => { element.value = '73'; element.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.locator('#cc-focal-y').evaluate((element) => { element.value = '31'; element.dispatchEvent(new Event('input', { bubbles: true })); });
    const focalResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/media`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save focal point' }).click();
    assert.equal((await focalResponse).status(), 200);
    const importedHero = store.snapshot(SLUG).draft.media.find((item) => item.id !== `media-${SLUG}-logo`);
    const importedLogo = store.snapshot(SLUG).draft.media.find((item) => item.id === `media-${SLUG}-logo`);
    assert(importedHero.asset && importedLogo.asset);
    assert.deepEqual(importedHero.focal, { x: 73, y: 31 });
    await capture(page, '12-studio-desktop-real-media.png', 'studio-desktop-real-media', evidence);
    await publishCurrent(page, origin, SLUG);
    await page.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    await capture(page, '13-real-media-public-desktop.png', 'real-media-public-desktop', evidence);
    await mobile.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    await capture(mobile, '14-real-media-public-390.png', 'real-media-public-390', evidence);

    await page.goto(`${origin}/candidate-c/studio/${SLUG}/media-library`, { waitUntil: 'networkidle' });
    const beforeRejectedMedia = store.snapshot(SLUG);
    await page.locator('#cc-hero-file').setInputFiles(oversizedPath);
    await page.locator('#cc-hero-alt').fill('Synthetic oversized valid PNG');
    const oversizedResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/media-import`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: /Replace placeholder with real image|Replace primary image/ }).click();
    assert.equal((await oversizedResponse).status(), 413);
    assert.match(await page.locator('body').textContent(), /larger than the 8 MiB limit/i);
    assert.equal(store.snapshot(SLUG).revision, beforeRejectedMedia.revision);
    await page.getByRole('link', { name: 'Choose another image', exact: true }).click();
    await page.locator('#cc-hero-file').setInputFiles(malformedPath);
    await page.locator('#cc-hero-alt').fill('Synthetic invalid media');
    const malformedResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/media-import`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: /Replace placeholder with real image|Replace primary image/ }).click();
    assert.equal((await malformedResponse).status(), 400);
    assert.match(await page.locator('body').textContent(), /Use a JPEG or PNG image/i);

    await applyDirection(page, origin, SLUG, 'Hospitality table');
    await setActivityStatus(page, origin, SLUG, ACTIVITY, 'scheduled', '');
    await publishCurrent(page, origin, SLUG);
    await page.goto(`${origin}/candidate-c/${SLUG}/activities/${originalActivity.slug}`, { waitUntil: 'networkidle' });
    await page.locator('#cc-rsvp-name').fill('Synthetic Guest');
    const rsvpResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/${SLUG}/activities/${originalActivity.slug}/rsvp`) && response.request().method() === 'POST');
    await page.locator('.cc-rsvp button[type="submit"]').click();
    assert.equal((await rsvpResponse).status(), 200);
    assert.equal(store.diagnostics().local.rsvps, 1);

    await page.goto(`${origin}/candidate-c/studio/${SLUG}/urgent?activity=${originalActivity.id}`, { waitUntil: 'networkidle' });
    await page.locator('input[name="lifecycle"][value="cancelled"]').check();
    await page.locator('#cc-urgent-note').fill('STALE urgent cancellation must not publish.');
    await page.getByRole('button', { name: 'Review the change' }).click();
    await page.waitForURL((url) => url.pathname.startsWith(`/candidate-c/studio/${SLUG}/urgent/`));
    const staleUrgent = page;
    const advance = await context.newPage();
    advance.setDefaultTimeout(15000);
    observePage(advance, evidence);
    await advance.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await openStudioButton(advance, 'Page', 'First impression');
    await advance.locator('#cc-tagline').fill('LIVE-ADVANCE-FOR-STALE-URGENT');
    const advanceSave = advance.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/tagline`) && response.request().method() === 'POST');
    await advance.getByRole('button', { name: 'Save headline' }).click();
    assert.equal((await advanceSave).status(), 200);
    await publishCurrent(advance, origin, SLUG);
    const liveAfterAdvance = store.publicSnapshot(SLUG).liveReleaseId;
    const staleUrgentResponse = staleUrgent.waitForResponse((response) => response.url().includes(`/candidate-c/studio/${SLUG}/urgent/`) && response.url().endsWith('/publish') && response.request().method() === 'POST');
    await staleUrgent.getByRole('button', { name: 'Publish urgent update' }).click();
    assert.equal((await staleUrgentResponse).status(), 409);
    assert.equal(store.publicSnapshot(SLUG).liveReleaseId, liveAfterAdvance);
    await staleUrgent.close();
    page = advance;

    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await openStudioButton(page, 'Page', 'First impression');
    await page.locator('#cc-tagline').fill(UNPUBLISHED);
    const unpublishedSave = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/tagline`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save headline' }).click();
    assert.equal((await unpublishedSave).status(), 200);
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/urgent?activity=${originalActivity.id}`, { waitUntil: 'networkidle' });
    await page.locator('input[name="lifecycle"][value="cancelled"]').check();
    await page.locator('#cc-urgent-note').fill('Synthetic cancellation is live; unrelated Studio work stays draft-only.');
    await page.getByRole('button', { name: 'Review the change' }).click();
    await page.waitForURL((url) => url.pathname.startsWith(`/candidate-c/studio/${SLUG}/urgent/`));
    const urgentResponse = page.waitForResponse((response) => response.url().includes(`/candidate-c/studio/${SLUG}/urgent/`) && response.url().endsWith('/publish') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Publish urgent update' }).click();
    assert.equal((await urgentResponse).status(), 303);
    await page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}` && url.searchParams.get('urgent') === '1');
    const afterUrgent = store.publicSnapshot(SLUG);
    const workingAfterUrgent = store.snapshot(SLUG);
    assert.equal(afterUrgent.draft.activities.find((item) => item.id === originalActivity.id).lifecycle, 'cancelled');
    assert.equal(workingAfterUrgent.draft.facts.tagline, UNPUBLISHED);
    assert.notEqual(afterUrgent.draft.facts.tagline, UNPUBLISHED);
    const urgentRelease = workingAfterUrgent.releases.find((item) => item.id === afterUrgent.liveReleaseId);
    assert.equal(urgentRelease.kind, 'urgent');
    await page.goto(`${origin}/candidate-c/${SLUG}/activities/${originalActivity.slug}`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-rsvp-closed]').count(), 1);
    const cancelledIcs = await page.request.get(`${origin}/candidate-c/${SLUG}/activities/${originalActivity.slug}/calendar.ics`);
    const cancelledIcsText = await cancelledIcs.text();
    assert.match(cancelledIcsText, /STATUS:CANCELLED/);
    assert.match(cancelledIcsText, /SUMMARY:Cancelled: Synthetic Evening Lab/);
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'released-cancelled-activity.ics.txt'), cancelledIcsText, 'utf8');

    await createSecondary(page, origin);
    const secondaryBeforeRestart = store.snapshot(SECONDARY_SLUG);
    const primaryBeforeRestart = store.snapshot(SLUG);
    const primaryLiveBeforeRestart = store.publicSnapshot(SLUG);
    const heroBeforeRestart = primaryBeforeRestart.draft.media.find((item) => item.id !== `media-${SLUG}-logo`);
    const logoBeforeRestart = primaryBeforeRestart.draft.media.find((item) => item.id === `media-${SLUG}-logo`);
    assert.equal(store.workspace(SLUG).rsvps.size, 1);
    assert(heroBeforeRestart.asset && logoBeforeRestart.asset);

    await page.close();
    await stopServer(server);
    store = new ProvisioningFileCandidateCStore({ statePath, mediaRoot });
    server = await startDogfoodServer(createDogfoodApp({ store, provenance: { commit: EXACT_SHA, tree: EXACT_TREE } }), { port: 0 });
    origin = `http://127.0.0.1:${server.address().port}`;
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(25000);
    observePage(page, evidence);
    const primaryAfterRestart = store.snapshot(SLUG);
    const primaryLiveAfterRestart = store.publicSnapshot(SLUG);
    const secondaryAfterRestart = store.snapshot(SECONDARY_SLUG);
    assert.equal(primaryAfterRestart.liveReleaseId, primaryBeforeRestart.liveReleaseId);
    assert.equal(primaryLiveAfterRestart.liveReleaseId, primaryLiveBeforeRestart.liveReleaseId);
    assert.equal(primaryAfterRestart.draft.facts.tagline, UNPUBLISHED);
    assert.notEqual(primaryLiveAfterRestart.draft.facts.tagline, UNPUBLISHED);
    assert.deepEqual(primaryAfterRestart.draft.media.find((item) => item.id !== `media-${SLUG}-logo`).focal, { x: 73, y: 31 });
    assert.equal(store.workspace(SLUG).rsvps.size, 1);
    assert.equal(secondaryAfterRestart.draft.facts.tagline, 'SECONDARY-WORKSPACE-DURABLE');
    assert.equal(secondaryAfterRestart.liveReleaseId, secondaryBeforeRestart.liveReleaseId);

    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await capture(page, '15-restart-studio-desktop.png', 'restart-studio-desktop', evidence);
    await mobile.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await capture(mobile, '16-studio-390-normal.png', 'studio-390-normal', evidence);
    await openStudioButton(mobile, 'Page', 'First impression');
    await capture(mobile, '17-studio-390-contextual.png', 'studio-390-contextual', evidence);
    await mobile.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    await capture(mobile, '18-native-390-public-final.png', 'native-390-public-final', evidence);

    const external = zeroEffects(store);
    assert.equal(evidence.externalRequests.length, 0, `external requests: ${JSON.stringify(evidence.externalRequests)}`);
    const expectedAdversarialStatuses = evidence.adversarialResourceConsoleErrors.map((entry) => entry.status).sort((a, b) => a - b);
    assert.deepEqual(expectedAdversarialStatuses, [400, 400, 409, 409, 413]);
    assert.equal(evidence.consoleErrors.length, 0, `unexpected console errors: ${JSON.stringify(evidence.consoleErrors)}`);
    assert.equal(evidence.pageErrors.length, 0, `page errors: ${JSON.stringify(evidence.pageErrors)}`);

    evidence.proof = {
      buildIdentity: { head: EXACT_SHA, tree: EXACT_TREE },
      reschedule: {
        activityIdPreserved: primaryAfterRestart.draft.activities.find((item) => item.id === originalActivity.id).id === originalActivity.id,
        releasedStartsAt: rescheduled.startsAt,
        scheduledIcsCaptured: true,
        cancelledIcsCaptured: true,
      },
      parity: { families: ['poster', 'editorial', 'hospitality'], invitation: INVITATION, category: OFFER_CATEGORY, detail: OFFER_DETAIL },
      safeOversizedValidPng: true,
      safeMalformedMedia: true,
      contactClassesThroughQuickAndDeep: contactCases.map(([value, kind]) => ({ value, kind })),
      quickDeepLookBarGold: true,
      completedAndCancelledLifecycle: true,
      restoreDidNotChangeLive: true,
      staleReleaseRejected: true,
      staleUrgentRejected: true,
      urgentPreservedUnpublishedDraft: true,
      expectedAdversarialResourceStatuses: expectedAdversarialStatuses,
      restart: {
        persisted: true,
        multiHost: true,
        hosts: [SLUG, SECONDARY_SLUG],
        releases: primaryAfterRestart.releases.length,
        liveReleaseId: primaryAfterRestart.liveReleaseId,
        heroSha256: heroBeforeRestart.asset.sha256,
        logoSha256: logoBeforeRestart.asset.sha256,
        focal: primaryAfterRestart.draft.media.find((item) => item.id !== `media-${SLUG}-logo`).focal,
        rsvps: store.workspace(SLUG).rsvps.size,
        urgentReleaseId: urgentRelease.id,
        restoredWorkingStatePreservedThroughLaterWork: true,
      },
      native390PublicAndStudio: true,
      external,
    };
    evidence.summary = {
      screenshotCount: evidence.screenshots.length,
      blockingAccessibilityFindings: evidence.audits.reduce((sum, item) => sum + item.blocking.length, 0),
      horizontalOverflowFindings: evidence.audits.filter((item) => item.geometry.scrollWidth > item.geometry.clientWidth + 1).length,
      incompleteImageFindings: evidence.audits.reduce((sum, item) => sum + item.geometry.incompleteImages, 0),
      externalRequests: evidence.externalRequests.length,
      expectedAdversarialResourceConsoleErrors: evidence.adversarialResourceConsoleErrors.length,
      unexpectedConsoleErrors: evidence.consoleErrors.length + evidence.pageErrors.length,
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  } finally {
    await mobileContext.close();
    await browser.close();
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

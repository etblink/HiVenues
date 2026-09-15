'use strict';
/* global document, window */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createDogfoodApp, startDogfoodServer } = require('../src/candidate-c/dogfood-app');
const { MAX_MULTIPART_BYTES } = require('../src/candidate-c/local-media');
const { ProvisioningFileCandidateCStore } = require('../src/candidate-c/provisioning-file-store');

const ROOT = path.join(__dirname, '..');
const OUTPUT_ROOT = process.env.CANDIDATE_C_ASTRA_BETA_REMEDIATION_ROOT || path.join(ROOT, 'artifacts', 'candidate-c-astra-beta-remediation');
const EXACT_SHA = process.env.CANDIDATE_C_ASTRA_BETA_REMEDIATION_EXACT_SHA || 'LOCAL_UNBOUND';
const EXACT_TREE = process.env.CANDIDATE_C_ASTRA_BETA_REMEDIATION_EXACT_TREE || 'LOCAL_UNBOUND';
const SLUG = 'astra-remediation-lab';
const ACTIVITY = 'Synthetic Evening Lab';
const INVITATION = 'INVITATION-PARITY-269 — join the synthetic lab and follow the public update.';
const OFFER_CATEGORY = 'Synthetic membership';
const OFFER_DETAIL = '$29 beta detail';

async function stopServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => server.closeAllConnections?.(), 1000);
    timer.unref?.();
    server.close((error) => {
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    });
  });
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
    blocking: blocking.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })),
    geometry,
  });
  assert.equal(blocking.length, 0, `${label}: blocking accessibility findings`);
  assert.equal(geometry.scrollWidth > geometry.clientWidth + 1, false, `${label}: horizontal overflow`);
  assert.equal(geometry.incompleteImages, 0, `${label}: incomplete images`);
}

async function capture(page, filename, label, evidence) {
  await auditPage(page, label, evidence.audits);
  await page.screenshot({ path: path.join(OUTPUT_ROOT, filename), fullPage: true });
  evidence.screenshots.push(filename);
}

function observe(context, page, evidence) {
  context.on('request', (request) => {
    try {
      const url = new URL(request.url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) evidence.externalRequests.push(request.url());
    } catch (_) {}
  });
  page.on('console', (message) => {
    if (message.type() === 'error') evidence.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => evidence.pageErrors.push(error.message));
}

function zeroEffects(store) {
  const external = store.diagnostics().external;
  assert.deepEqual(external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
  return external;
}

async function publishCurrent(page, slug) {
  await page.goto(`${page.url().split('/candidate-c')[0]}/candidate-c/studio/${slug}/release`, { waitUntil: 'networkidle' });
  const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${slug}/release`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Publish website release' }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 303);
  await page.waitForURL((url) => url.pathname === `/candidate-c/studio/${slug}` && Boolean(url.searchParams.get('released')));
}

async function applyDirection(page, origin, slug, label) {
  await page.goto(`${origin}/candidate-c/studio/${slug}/direction`, { waitUntil: 'networkidle' });
  const card = page.locator('.cc-review-card').filter({ has: page.getByRole('heading', { name: label, exact: true }) });
  await card.getByRole('button', { name: 'Review this direction' }).click();
  await page.waitForURL((url) => url.pathname.startsWith(`/candidate-c/studio/${slug}/direction/`));
  await page.getByRole('button', { name: 'Apply direction to draft' }).click();
  await page.waitForURL((url) => url.pathname === `/candidate-c/studio/${slug}`);
}

async function assertPublicParity(page, origin, slug, family, evidence) {
  await page.goto(`${origin}/candidate-c/${slug}`, { waitUntil: 'networkidle' });
  const body = await page.locator('body').textContent();
  assert.match(body, new RegExp(INVITATION));
  assert.match(body, new RegExp(OFFER_CATEGORY));
  assert.match(body, /\$29 beta detail/);
  await capture(page, `public-${family}.png`, `public-${family}`, evidence);
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const statePath = path.join(OUTPUT_ROOT, 'state.json');
  const mediaRoot = path.join(OUTPUT_ROOT, 'local-media');
  const oversizedPath = path.join(OUTPUT_ROOT, 'oversized.png');
  const malformedPath = path.join(OUTPUT_ROOT, 'not-an-image.jpg');
  fs.writeFileSync(oversizedPath, Buffer.alloc(MAX_MULTIPART_BYTES + 2048, 0x41));
  fs.writeFileSync(malformedPath, 'synthetic invalid image bytes\n', 'utf8');

  let store = new ProvisioningFileCandidateCStore({ statePath, mediaRoot });
  let server = await startDogfoodServer(createDogfoodApp({
    store,
    provenance: { commit: EXACT_SHA, tree: EXACT_TREE },
  }), { port: 0 });
  let origin = `http://127.0.0.1:${server.address().port}`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  let page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(25000);

  const evidence = {
    candidate: EXACT_SHA,
    tree: EXACT_TREE,
    fixture: { synthetic: true, slug: SLUG, purpose: 'Issue #269 Astra Studio beta remediation qualification.' },
    screenshots: [], audits: [], externalRequests: [], consoleErrors: [], pageErrors: [],
  };
  observe(context, page, evidence);

  try {
    const build = await page.request.get(`${origin}/__dogfood/build`);
    assert.equal(build.status(), 200);
    const buildText = await build.text();
    assert.match(buildText, new RegExp(`HEAD ${EXACT_SHA}`));
    assert.match(buildText, new RegExp(`TREE ${EXACT_TREE}`));

    // Validation recovery: bad setup must preserve Contact and use human error text.
    await page.goto(`${origin}/candidate-c/new`, { waitUntil: 'networkidle' });
    const baseFields = {
      displayName: 'Astra Remediation Lab',
      archetype: 'synthetic community venue',
      timezone: 'America/Los_Angeles',
      presenceLabel: 'Synthetic Test City · evenings',
      address: '100 Fictional Way, Test City, NV 00000',
      tagline: 'A synthetic place for product regression.',
      summary: 'A synthetic fixture used only to qualify HiVenues before its first real customer.',
      contact: '(702) 555-0147',
      purpose: 'Exercise the complete remediation without real customer facts.',
      presenceMaterial: 'Synthetic atmosphere, deliberate copy and local-only test assets.',
      participation: INVITATION,
      activityTitle: ACTIVITY,
      activityDescription: 'A synthetic scheduled activity for reschedule, Release and lifecycle qualification.',
      activityStartsLocal: '2026-10-30T18:00',
      activityEndsLocal: '2026-10-30T17:00',
    };
    for (const [name, value] of Object.entries(baseFields)) await page.locator(`[name="${name}"]`).fill(value);
    await page.locator('[name="presenceMode"][value="physical"]').check();
    await page.locator('[name="direction"][value="poster"]').check();
    await page.locator('[name="timezone"]').fill('Not/A_Real_Zone');
    const invalidResponsePromise = page.waitForResponse((response) => response.url().endsWith('/candidate-c/new') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Create this place' }).click();
    assert.equal((await invalidResponsePromise).status(), 400);
    assert.equal(await page.locator('[name="contact"]').inputValue(), '(702) 555-0147');
    assert.doesNotMatch(await page.locator('body').textContent(), /activityEndsLocal:|timezone:/);
    await capture(page, '01-validation-preserves-input.png', 'validation-preserves-input', evidence);

    // Correct and create the fresh synthetic host through ordinary UI.
    await page.locator('[name="timezone"]').fill('America/Los_Angeles');
    await page.locator('[name="activityEndsLocal"]').fill('2026-10-30T20:00');
    await Promise.all([
      page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}`),
      page.getByRole('button', { name: 'Create this place' }).click(),
    ]);
    const originalActivity = store.snapshot(SLUG).draft.activities[0];
    assert(originalActivity);
    await capture(page, '02-created-studio.png', 'created-studio', evidence);

    // Add a populated Offer so cross-Direction parity is falsifiable.
    await page.getByRole('link', { name: '+ Add offering', exact: true }).click();
    await page.locator('#cc-new-offer-title').fill('Synthetic Lab Pass');
    await page.locator('#cc-new-offer-summary').fill('A synthetic offer used only for beta remediation qualification.');
    await page.locator('#cc-new-offer-category').fill(OFFER_CATEGORY);
    await page.locator('#cc-new-offer-price').fill(OFFER_DETAIL);
    await Promise.all([
      page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}`),
      page.getByRole('button', { name: 'Add offering to draft' }).click(),
    ]);

    // P0 Activity reschedule: identity remains stable and live schedule stays unchanged pre-Release.
    const liveBeforeSchedule = store.publicSnapshot(SLUG).draft.activities[0].startsAt;
    await page.getByRole('button', { name: ACTIVITY, exact: true }).click();
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

    await publishCurrent(page, SLUG);
    assert.equal(store.publicSnapshot(SLUG).draft.activities[0].startsAt, rescheduled.startsAt);
    const ics = await page.request.get(`${origin}/candidate-c/${SLUG}/activities/${rescheduled.slug}/calendar.ics`);
    assert.equal(ics.status(), 200);
    const icsText = await ics.text();
    assert.match(icsText, /BEGIN:VCALENDAR/);
    assert.match(icsText, /SUMMARY:Synthetic Evening Lab/);
    assert.match(icsText, /DTSTART:/);
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'released-activity.ics.txt'), icsText, 'utf8');

    // All three Directions must preserve authored invitation + Offer category/detail publicly.
    await assertPublicParity(page, origin, SLUG, 'poster', evidence);
    await applyDirection(page, origin, SLUG, 'Editorial field notes');
    await publishCurrent(page, SLUG);
    await assertPublicParity(page, origin, SLUG, 'editorial', evidence);
    await applyDirection(page, origin, SLUG, 'Hospitality table');
    await publishCurrent(page, SLUG);
    await assertPublicParity(page, origin, SLUG, 'hospitality', evidence);

    // Quick/deep Look parity includes Bar Gold.
    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Look', exact: true }).click();
    await page.locator('#cc-look-accent').selectOption('#f4a460');
    const lookResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/look`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save look' }).click();
    assert.equal((await lookResponse).status(), 200);
    await page.getByRole('link', { name: 'Look settings' }).click();
    assert.equal(await page.locator('input[name="accent"][value="#f4a460"]').isChecked(), true);

    // Contact model is consistent across Quick Connect and deep maintenance.
    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    assert.equal(await page.locator('#cc-contact').getAttribute('type'), 'text');
    await page.locator('#cc-contact').fill('(702) 555-0199');
    const connectResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/connect`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save contact' }).click();
    assert.equal((await connectResponse).status(), 200);
    await page.getByRole('link', { name: 'Content & visit' }).click();
    assert.equal(await page.locator('#cc-content-contact').inputValue(), '(702) 555-0199');
    await page.locator('#cc-content-contact').fill('https://astra-remediation.example.test/');
    await Promise.all([
      page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}/content` && url.searchParams.get('saved') === '1'),
      page.getByRole('button', { name: 'Save public content to draft' }).click(),
    ]);

    // Oversized and malformed inputs must be recoverable product errors, never raw stacks.
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/media-library`, { waitUntil: 'networkidle' });
    await page.locator('#cc-hero-file').setInputFiles(oversizedPath);
    await page.locator('#cc-hero-alt').fill('Synthetic oversized media');
    const oversizedResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/media-import`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: /Replace placeholder with real image|Replace primary image/ }).click();
    assert.equal((await oversizedResponse).status(), 413);
    const oversizedBody = await page.locator('body').textContent();
    assert.match(oversizedBody, /larger than the 8 MiB limit/i);
    assert.doesNotMatch(oversizedBody, /PayloadTooLargeError|node_modules|dogfood-app\.js|raw-body/i);
    await capture(page, '06-oversized-media-safe-error.png', 'oversized-media-safe-error', evidence);

    await page.getByRole('link', { name: 'Choose another image' }).click();
    await page.locator('#cc-hero-file').setInputFiles(malformedPath);
    await page.locator('#cc-hero-alt').fill('Synthetic invalid media');
    const malformedResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/media-import`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: /Replace placeholder with real image|Replace primary image/ }).click();
    assert.equal((await malformedResponse).status(), 400);
    assert.match(await page.locator('body').textContent(), /Use a JPEG or PNG image/i);

    // Lifecycle wording: completed is PAST, not NEXT.
    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: ACTIVITY, exact: true }).click();
    await page.locator('#cc-activity-lifecycle').selectOption('completed');
    const statusResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/activity-status`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save status' }).click();
    assert.equal((await statusResponse).status(), 200);
    await publishCurrent(page, SLUG);
    await page.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    const completedBody = await page.locator('body').textContent();
    assert.match(completedBody, /PAST/);
    assert.match(completedBody, /Already happened/);
    assert.doesNotMatch(completedBody, /\bNEXT\b/);
    await capture(page, '07-completed-lifecycle-public.png', 'completed-lifecycle-public', evidence);

    // Release review explains impact and History restore requires review before draft replacement.
    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'First impression', exact: true }).click();
    await page.locator('#cc-tagline').fill('RESTORE-REVIEW-UNPUBLISHED synthetic headline');
    const headlineResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/tagline`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save headline' }).click();
    assert.equal((await headlineResponse).status(), 200);
    await page.getByRole('link', { name: 'Review release' }).click();
    assert.match(await page.locator('body').textContent(), /Release impact/);
    assert.match(await page.locator('body').textContent(), /Headline changed/);
    await capture(page, '08-release-impact-review.png', 'release-impact-review', evidence);
    await publishCurrent(page, SLUG);
    const liveBeforeRestore = store.publicSnapshot(SLUG).draftDigest;

    await page.goto(`${origin}/candidate-c/studio/${SLUG}/release`, { waitUntil: 'networkidle' });
    const restoreLinks = page.getByRole('link', { name: 'Review restore' });
    assert((await restoreLinks.count()) >= 2);
    await restoreLinks.last().click();
    await page.waitForURL((url) => /\/releases\/[^/]+\/restore$/.test(url.pathname));
    const restoreText = await page.locator('body').textContent();
    assert.match(restoreText, /does not roll the live website back/i);
    assert.match(restoreText, /Publishing is always a separate decision/i);
    await capture(page, '09-restore-review.png', 'restore-review', evidence);
    await page.getByRole('button', { name: 'Use this as working version' }).click();
    await page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}`);
    assert.equal(store.publicSnapshot(SLUG).draftDigest, liveBeforeRestore, 'restore changed live without Release');

    // Stale ordinary Release must fail closed.
    const staleRelease = await context.newPage();
    staleRelease.setDefaultTimeout(15000);
    observe(context, staleRelease, evidence);
    await staleRelease.goto(`${origin}/candidate-c/studio/${SLUG}/release`, { waitUntil: 'networkidle' });
    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'First impression', exact: true }).click();
    await page.locator('#cc-tagline').fill('NEWER-DRAFT-BEATS-STALE-RELEASE');
    const newerResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/tagline`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save headline' }).click();
    assert.equal((await newerResponse).status(), 200);
    const staleReleaseResponse = staleRelease.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/release`) && response.request().method() === 'POST');
    await staleRelease.getByRole('button', { name: 'Publish website release' }).click();
    assert.equal((await staleReleaseResponse).status(), 409);
    assert.match(await staleRelease.locator('body').textContent(), /newer version exists/i);
    await staleRelease.close();

    // Restart the exact same durable state and verify the meaningful product state persists.
    await page.close();
    await stopServer(server);
    store = new ProvisioningFileCandidateCStore({ statePath, mediaRoot });
    server = await startDogfoodServer(createDogfoodApp({ store, provenance: { commit: EXACT_SHA, tree: EXACT_TREE } }), { port: 0 });
    origin = `http://127.0.0.1:${server.address().port}`;
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(25000);
    observe(context, page, evidence);
    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    assert.equal(store.snapshot(SLUG).draft.facts.tagline, 'NEWER-DRAFT-BEATS-STALE-RELEASE');
    assert.equal(store.publicSnapshot(SLUG).draftDigest, liveBeforeRestore);
    assert.equal(store.snapshot(SLUG).draft.activities[0].id, originalActivity.id);
    assert.equal(store.snapshot(SLUG).draft.activities[0].startsAt, rescheduled.startsAt);
    await capture(page, '10-restart-studio.png', 'restart-studio', evidence);

    // A real 390px browser viewport supplements the built-in iframe review.
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobile = await mobileContext.newPage();
    mobile.setDefaultTimeout(15000);
    mobile.setDefaultNavigationTimeout(25000);
    observe(mobileContext, mobile, evidence);
    await mobile.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    await capture(mobile, '11-native-390-public.png', 'native-390-public', evidence);
    await mobile.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await capture(mobile, '12-native-390-studio.png', 'native-390-studio', evidence);
    await mobileContext.close();

    const external = zeroEffects(store);
    assert.equal(evidence.externalRequests.length, 0, `external requests: ${JSON.stringify(evidence.externalRequests)}`);
    assert.equal(evidence.consoleErrors.length, 0, `console errors: ${JSON.stringify(evidence.consoleErrors)}`);
    assert.equal(evidence.pageErrors.length, 0, `page errors: ${JSON.stringify(evidence.pageErrors)}`);

    evidence.proof = {
      buildIdentity: { head: EXACT_SHA, tree: EXACT_TREE },
      reschedule: {
        activityIdPreserved: store.snapshot(SLUG).draft.activities[0].id === originalActivity.id,
        releasedStartsAt: rescheduled.startsAt,
        icsCaptured: true,
      },
      parity: { families: ['poster', 'editorial', 'hospitality'], invitation: INVITATION, category: OFFER_CATEGORY, detail: OFFER_DETAIL },
      safeOversizedMedia: true,
      quickDeepContact: true,
      quickDeepLookBarGold: true,
      restoreDidNotChangeLive: true,
      staleReleaseRejected: true,
      restartPersisted: true,
      native390PublicAndStudio: true,
      external,
    };
    evidence.summary = {
      screenshotCount: evidence.screenshots.length,
      blockingAccessibilityFindings: evidence.audits.reduce((sum, item) => sum + item.blocking.length, 0),
      horizontalOverflowFindings: evidence.audits.filter((item) => item.geometry.scrollWidth > item.geometry.clientWidth + 1).length,
      incompleteImageFindings: evidence.audits.reduce((sum, item) => sum + item.geometry.incompleteImages, 0),
      externalRequests: evidence.externalRequests.length,
      unexpectedConsoleErrors: evidence.consoleErrors.length + evidence.pageErrors.length,
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  } finally {
    await browser.close();
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

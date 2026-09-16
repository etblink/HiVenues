'use strict';
/* global document, window */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { createDogfoodApp, startDogfoodServer } = require('../src/candidate-c/dogfood-app');
const { FileCandidateCStore } = require('../src/candidate-c/file-store');

const OUTPUT_ROOT = process.env.CANDIDATE_C_ERA2_CLOSURE_ROOT || path.join('artifacts', 'candidate-c-era2-closure');
const EXACT_SHA = process.env.CANDIDATE_C_ERA2_CLOSURE_EXACT_SHA || 'LOCAL_UNBOUND';
const EXACT_TREE = process.env.CANDIDATE_C_ERA2_CLOSURE_EXACT_TREE || 'LOCAL_UNBOUND';
const DESKTOP = Object.freeze({ width: 1440, height: 1000 });
const MOBILE = Object.freeze({ width: 390, height: 844 });
const SLUG = 'lantern-relay';

function sha256File(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
function isLocalRequest(url) {
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return true;
  try { return ['127.0.0.1', 'localhost'].includes(new URL(url).hostname); } catch (_) { return false; }
}
async function stopServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
async function auditPage(page, axeSource, label) {
  await page.addScriptTag({ content: axeSource });
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    incompleteImages: Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0).length,
  }));
  const accessibility = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
    const blocking = result.violations.filter((item) => ['serious', 'critical'].includes(item.impact));
    return { violationCount: result.violations.length, blockingCount: blocking.length, blocking: blocking.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.slice(0, 6).map((node) => node.target) })) };
  });
  assert.equal(geometry.overflow, false, `${label}: horizontal overflow ${geometry.scrollWidth}/${geometry.clientWidth}`);
  assert.equal(geometry.incompleteImages, 0, `${label}: incomplete images`);
  assert.equal(accessibility.blockingCount, 0, `${label}: blocking accessibility ${JSON.stringify(accessibility.blocking)}`);
  return { label, geometry, accessibility };
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era2-closure-'));
  const statePath = path.join(tempRoot, 'candidate-c-state.json');
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(25000);
  const screenshots = [];
  const audits = [];
  const externalRequests = [];
  const consoleErrors = [];
  context.on('request', (request) => { if (!isLocalRequest(request.url())) externalRequests.push(request.url()); });
  page.on('pageerror', (error) => consoleErrors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push({ type: 'console', text: message.text() }); });

  async function capture(name, label, fullPage = true) {
    audits.push(await auditPage(page, axeSource, label));
    const file = `${name}.png`;
    const filePath = path.join(OUTPUT_ROOT, file);
    await page.screenshot({ path: filePath, fullPage, animations: 'disabled' });
    screenshots.push({ file, label, viewport: await page.viewportSize(), sha256: sha256File(filePath) });
  }
  async function openMenu(label) {
    await page.locator('.cc-studio-commandbar summary').filter({ hasText: label }).click();
  }
  async function goStudio(origin) {
    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
  }
  async function addActivity(origin, title, description, start, end) {
    await goStudio(origin); await openMenu('Activities');
    await page.getByRole('link', { name: '+ Add activity' }).click();
    await page.locator('#cc-new-activity-title').fill(title);
    await page.locator('#cc-new-activity-description').fill(description);
    await page.locator('#cc-new-activity-start').fill(start);
    await page.locator('#cc-new-activity-end').fill(end);
    await page.getByRole('button', { name: 'Add activity to draft' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}`);
  }
  async function addOffer(origin, title, summary, category, price) {
    await goStudio(origin); await openMenu('Offers');
    await page.getByRole('link', { name: '+ Add offer' }).click();
    await page.locator('#cc-new-offer-title').fill(title);
    await page.locator('#cc-new-offer-summary').fill(summary);
    await page.locator('#cc-new-offer-category').fill(category);
    await page.locator('#cc-new-offer-price').fill(price);
    await page.getByRole('button', { name: 'Add offering to draft' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}`);
  }
  async function editActivityStatus(origin, activityTitle, lifecycle, note) {
    await goStudio(origin); await openMenu('Activities');
    await page.getByRole('button', { name: activityTitle }).click();
    await page.locator('#candidate-inspector[data-open="true"]').waitFor();
    await page.locator('#cc-activity-lifecycle').selectOption(lifecycle);
    await page.locator('#cc-activity-status-note').fill(note);
    await page.getByRole('button', { name: 'Save status' }).click();
    await page.locator('#cc-save-state').filter({ hasText: 'Saved' }).waitFor();
  }
  async function addProfile(origin, name, role, bio) {
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/territory-content`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Add person' }).click();
    await page.locator('#cc-profile-name').fill(name);
    await page.locator('#cc-profile-role').fill(role);
    await page.locator('#cc-profile-bio').fill(bio);
    await page.getByRole('button', { name: 'Add person to Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?saved=1`);
  }
  async function addStory(origin, kind, title, dek, body, authorId) {
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/territory-content`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Add story' }).click();
    await page.locator('#cc-story-kind').selectOption(kind);
    await page.locator('#cc-story-title').fill(title);
    await page.locator('#cc-story-dek').fill(dek);
    await page.locator('#cc-story-body').fill(body);
    if (authorId) await page.locator(`input[name="authorProfileIds"][value="${authorId}"]`).check();
    const media = page.locator('input[name="mediaIds"]'); if (await media.count()) await media.first().check();
    await page.getByRole('button', { name: 'Add story to Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?saved=1`);
  }

  let store = new FileCandidateCStore({ statePath, now: () => Date.parse('2026-09-16T19:00:00Z') });
  let server = await startDogfoodServer(createDogfoodApp({ store }), { port: 0 });
  let origin = `http://127.0.0.1:${server.address().port}`;
  try {
    await page.goto(`${origin}/candidate-c/new`, { waitUntil: 'networkidle' });
    await page.locator('#cc-display-name').fill('Lantern Relay');
    await page.locator('#cc-archetype').fill('Neighborhood arts house and listening room');
    await page.locator('#cc-tagline').fill('Small rooms. Close listening. Work that travels.');
    await page.locator('#cc-purpose').fill('Lantern Relay gives artists and neighbors a close-range place for listening, making and returning.');
    await page.getByRole('button', { name: 'Show the next consequence' }).click();
    await page.locator('input[name="presenceMode"][value="physical"]').check();
    await page.locator('#cc-presence-label').fill('Arts District · evenings and selected afternoons');
    await page.locator('#cc-address').fill('100 Fictional Relay Way, Las Vegas, NV');
    await page.locator('#cc-contact').fill('hello@lantern-relay.example');
    await page.locator('#cc-timezone').fill('America/Los_Angeles');
    await page.locator('#cc-summary').fill('A fictional neighborhood arts house for listening rooms, print tables and shared meals.');
    await page.locator('#cc-material').fill('Low light, paper, warm wood and close conversation define the host world.');
    await page.getByRole('button', { name: 'See directions' }).click();
    await page.locator('input[name="direction"][value="hospitality"]').check();
    await page.getByRole('button', { name: 'Shape participation' }).click();
    await page.locator('#cc-participation').fill('Hold a place, keep the date, send a signal and stay close to the room.');
    await page.locator('details.cc-creator-optional summary').click();
    await page.locator('#cc-activity-title').fill('After Dark Listening Room');
    await page.locator('#cc-activity-description').fill('A close-room listening session built around one guest record and conversation.');
    await page.locator('#cc-activity-start').fill('2026-10-03T19:30');
    await page.locator('#cc-activity-end').fill('2026-10-03T22:00');
    await capture('01-creator-final-step', 'creator-final-step');
    await page.getByRole('button', { name: 'Create my first draft' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}?created=1`);
    await page.getByRole('heading', { name: 'Here is your place.' }).waitFor();
    assert.equal((await page.request.get(`${origin}/candidate-c/${SLUG}`)).status(), 404, 'new host was live before Release');
    await capture('02-first-draft-reveal', 'first-draft-reveal');
    await page.getByRole('button', { name: 'Open Studio' }).click();

    await addActivity(origin, 'Night Shift Print Club', 'A hands-on evening for printing small editions together.', '2026-09-12T18:00', '2026-09-12T21:00');
    await addActivity(origin, 'Courtyard Supper No. 7', 'A fictional shared-table supper with a rotating neighborhood menu.', '2026-09-20T18:30', '2026-09-20T21:30');
    let graph = store.snapshot(SLUG).draft;
    assert.equal(graph.activities.length, 3);
    await editActivityStatus(origin, 'Night Shift Print Club', 'completed', 'This gathering has already happened.');
    await editActivityStatus(origin, 'Courtyard Supper No. 7', 'cancelled', 'This supper will be rescheduled.');
    await addOffer(origin, 'Listening Room Pass', 'Entry for one close-listening session.', 'Room', '$18');
    await addOffer(origin, 'Print Table Seat', 'A place at the shared print table with materials included.', 'Workshop', '$24');
    await addOffer(origin, 'Neighbor Supper', 'A seat at the rotating shared-table supper.', 'Table', '$32');
    graph = store.snapshot(SLUG).draft;
    assert.equal(graph.offers.length, 3);

    await goStudio(origin); await openMenu('Page');
    await page.getByRole('link', { name: 'Story & visit details' }).click();
    await page.getByLabel('Public summary').fill('A fictional arts house where listening, making and neighborhood gathering stay close enough to feel personal.');
    await page.getByRole('button', { name: /Save/ }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/content?saved=1`);

    await goStudio(origin); await openMenu('Site');
    await page.getByRole('link', { name: 'Direction', exact: true }).click();
    const posterCard = page.locator('section.cc-review-card').filter({ hasText: 'Poster' }).first();
    await posterCard.getByRole('button', { name: 'Review this direction' }).click();
    await page.getByRole('button', { name: 'Apply direction to draft' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}`);
    assert.equal(store.snapshot(SLUG).draft.presentation.compositionFamily, 'poster');

    await openMenu('Site');
    await page.getByRole('button', { name: 'Look', exact: true }).click();
    await page.locator('#cc-look-accent').selectOption('#6e59c8');
    await page.getByRole('button', { name: 'Save look' }).click();
    await page.locator('#cc-save-state').filter({ hasText: 'Saved' }).waitFor();

    await openMenu('Site');
    await page.getByRole('button', { name: 'Voice', exact: true }).click();
    const firstVoiceRow = page.locator('#candidate-inspector .cc-release-row').first();
    await firstVoiceRow.getByRole('button', { name: 'Edit' }).click();
    const mechanicId = await page.locator('#candidate-inspector input[name="mechanicId"]').inputValue();
    await page.locator('#cc-voice-term').fill('Hold a place');
    await page.getByRole('button', { name: 'Save wording' }).click();
    await page.locator('#cc-save-state').filter({ hasText: 'Saved' }).waitFor();
    assert.equal(store.snapshot(SLUG).draft.voice.terms[mechanicId], 'Hold a place');

    await openMenu('Site');
    await page.getByRole('button', { name: 'Hero media' }).click();
    await page.locator('#cc-focal-x').fill('35');
    await page.locator('#cc-focal-y').fill('65');
    await page.getByRole('button', { name: 'Save focal point' }).click();
    await page.locator('#cc-save-state').filter({ hasText: 'Saved' }).waitFor();
    graph = store.snapshot(SLUG).draft;
    const hero = graph.media.find((item) => item.id !== `media-${SLUG}-logo`) || graph.media[0];
    assert.deepEqual(hero.focal, { x: 35, y: 65 });
    await capture('03-shaped-studio', 'shaped-studio');

    await openMenu('Page');
    await page.getByRole('link', { name: 'Stories, people & gallery' }).click();
    await page.getByRole('button', { name: 'Enable territory content in Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?upgraded=1`);
    await addProfile(origin, 'Mara Vale', 'Program curator', 'Fictional curator for the Lantern Relay closure proof.');
    await addProfile(origin, 'Ivo Stone', 'Print steward', 'Fictional print steward for the Lantern Relay closure proof.');
    await addProfile(origin, 'Nia Holloway', 'Table host', 'Fictional table host for the Lantern Relay closure proof.');
    graph = store.snapshot(SLUG).draft;
    assert.equal(graph.people.length, 3);
    const [mara, ivo, nia] = graph.people;

    await page.goto(`${origin}/candidate-c/studio/${SLUG}/territory-content`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Write an Update' }).click();
    await page.locator('#cc-update-body').fill('Tonight’s listening room opens at 7:30. The floor is quiet by eight.');
    await page.locator('#cc-update-title').fill('Tonight at the Relay');
    await page.locator('#cc-update-author').selectOption(mara.id);
    await page.getByRole('button', { name: 'Add Update to Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?saved=1`);
    await addStory(origin, 'dispatch', 'Notes from the print table', 'A short field dispatch from a shared edition night.', 'Ink dries slowly when everyone is still talking. This fictional dispatch records the ordinary texture of the print table.', ivo.id);
    await addStory(origin, 'essay', 'Why the room stays small', 'A longer note on closeness as part of the host.', 'Lantern Relay keeps the room small on purpose. The fictional host treats attention, proximity and repeated return as part of the experience rather than scarcity theater.', nia.id);
    graph = store.snapshot(SLUG).draft;
    assert.equal(graph.stories.length, 3);

    await page.goto(`${origin}/candidate-c/studio/${SLUG}/territory-content/gallery`, { waitUntil: 'networkidle' });
    await page.locator('#cc-gallery-title').fill('Relay studies');
    await page.locator('#cc-gallery-summary').fill('A fictional visual notebook curated from media already admitted to this host.');
    const includes = page.locator('input[type="checkbox"][name^="include_"]');
    assert.ok(await includes.count()); await includes.first().check();
    await page.locator('input[type="number"][name^="order_"]').first().fill('1');
    await page.getByRole('button', { name: 'Save gallery to Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?saved=1`);

    await page.getByRole('link', { name: 'Edit navigation' }).click();
    const labels = { home: 'Front room', activities: 'Nights', stories: 'Dispatches', offers: 'At the table', gallery: 'Studies', people: 'People', 'about-visit': 'Visit' };
    const order = { home: 1, activities: 2, stories: 3, gallery: 4, offers: 5, people: 6, 'about-visit': 7 };
    for (const [role, label] of Object.entries(labels)) {
      await page.locator(`#cc-nav-label-${role}`).fill(label);
      await page.locator(`#cc-nav-order-${role}`).fill(String(order[role]));
    }
    await page.getByRole('button', { name: 'Save navigation to Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?saved=1`);
    await capture('04-rich-territory-hub', 'rich-territory-hub');

    assert.equal(store.publicSnapshot(SLUG), null);
    const working = store.snapshot(SLUG);
    assert.equal(working.draft.schemaVersion, 2);
    assert.equal(working.draft.activities.length, 3);
    assert.equal(working.draft.activities.filter((item) => item.lifecycle === 'scheduled').length, 1);
    assert.equal(working.draft.activities.filter((item) => item.lifecycle === 'completed').length, 1);
    assert.equal(working.draft.activities.filter((item) => item.lifecycle === 'cancelled').length, 1);
    assert.equal(working.draft.offers.length, 3);
    assert.equal(working.draft.people.length, 3);
    assert.equal(working.draft.stories.length, 3);
    assert.equal(working.draft.gallery.mediaIds.length, 1);
    assert.equal(working.draft.presentation.compositionFamily, 'poster');
    assert.equal(working.draft.navigation.labels.stories, 'Dispatches');

    await page.goto(`${origin}/candidate-c/studio/${SLUG}/preview/stories`, { waitUntil: 'networkidle' });
    assert.match(await page.locator('body').textContent(), /Tonight at the Relay/);
    await capture('05-working-preview-stories', 'working-preview-stories');
    assert.equal((await page.request.get(`${origin}/candidate-c/${SLUG}`)).status(), 404);

    await page.setViewportSize(MOBILE);
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/territory-content`, { waitUntil: 'networkidle' });
    await capture('06-native390-rich-authoring', 'native390-rich-authoring');

    await page.setViewportSize(DESKTOP);
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/release`, { waitUntil: 'networkidle' });
    const releaseText = await page.locator('body').textContent();
    assert.match(releaseText, /This will be the first live website version\./);
    assert.match(releaseText, /3 Activity · 3 Offer · 1 Media asset/);
    assert.match(releaseText, /3 Story \/ Update · 3 Profile · 1 Gallery item/);
    await capture('07-release-review', 'release-review');
    await page.getByRole('button', { name: 'Publish website release' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}?released=*`);

    const liveBeforeRestart = store.publicSnapshot(SLUG);
    assert.ok(liveBeforeRestart);
    const liveDigest = liveBeforeRestart.draftDigest;
    const workingDigest = store.snapshot(SLUG).draftDigest;
    assert.equal(liveDigest, workingDigest);

    await stopServer(server);
    store = new FileCandidateCStore({ statePath, now: () => Date.parse('2026-09-16T20:00:00Z') });
    server = await startDogfoodServer(createDogfoodApp({ store }), { port: 0 });
    origin = `http://127.0.0.1:${server.address().port}`;
    assert.equal(store.publicSnapshot(SLUG).draftDigest, liveDigest);
    assert.equal(store.snapshot(SLUG).draftDigest, workingDigest);

    const routeChecks = [
      ['', 'Lantern Relay'], ['/activities', 'After Dark Listening Room'], ['/offers', 'Listening Room Pass'], ['/stories', 'Tonight at the Relay'], ['/gallery', 'Relay studies'], ['/people', 'Mara Vale'], ['/about', 'Arts District'],
    ];
    for (const [suffix, needle] of routeChecks) {
      const response = await page.request.get(`${origin}/candidate-c/${SLUG}${suffix}`);
      assert.equal(response.status(), 200, `public route failed ${suffix}`);
      assert.match(await response.text(), new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    await page.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    await capture('08-public-desktop-after-restart', 'public-desktop-after-restart');
    await page.setViewportSize(MOBILE);
    await page.goto(`${origin}/candidate-c/${SLUG}/stories`, { waitUntil: 'networkidle' });
    await capture('09-public-native390-stories', 'public-native390-stories');

    const diagnostics = store.diagnostics();
    assert.deepEqual(diagnostics.external, { hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0 });
    assert.equal(externalRequests.length, 0, `unexpected external requests: ${externalRequests.join(', ')}`);
    assert.equal(consoleErrors.length, 0, `unexpected console errors: ${JSON.stringify(consoleErrors)}`);

    const finalGraph = store.snapshot(SLUG).draft;
    const manifest = {
      candidate: EXACT_SHA,
      tree: EXACT_TREE,
      host: { slug: SLUG, hostId: finalGraph.identity.hostId, schemaVersion: finalGraph.schemaVersion },
      reconstruction: {
        createdThroughGuidedWizard: true,
        fixtureHostUsed: false,
        activities: finalGraph.activities.map((item) => ({ id: item.id, slug: item.slug, lifecycle: item.lifecycle })),
        offers: finalGraph.offers.map((item) => ({ id: item.id, title: item.title })),
        stories: finalGraph.stories.map((item) => ({ id: item.id, slug: item.slug, kind: item.kind })),
        people: finalGraph.people.map((item) => ({ id: item.id, slug: item.slug })),
        galleryItems: finalGraph.gallery.mediaIds.length,
        direction: finalGraph.presentation.compositionFamily,
        accent: finalGraph.presentation.accent,
        navigation: finalGraph.navigation,
        releaseDigest: liveDigest,
      },
      summary: {
        screenshotCount: screenshots.length,
        auditCount: audits.length,
        blockingAccessibilityFindings: audits.reduce((sum, item) => sum + item.accessibility.blockingCount, 0),
        horizontalOverflowFindings: audits.filter((item) => item.geometry.overflow).length,
        incompleteImageFindings: audits.reduce((sum, item) => sum + item.geometry.incompleteImages, 0),
        externalRequests: externalRequests.length,
        unexpectedConsoleErrors: consoleErrors.length,
        releaseRestartPreserved: store.publicSnapshot(SLUG).draftDigest === liveDigest,
      },
      effects: diagnostics.external,
      screenshots,
      audits,
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  } finally {
    await stopServer(server).catch(() => {});
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

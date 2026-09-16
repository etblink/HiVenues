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

const OUTPUT_ROOT = process.env.CANDIDATE_C_TERRITORY_AUTHORING_ROOT || path.join('artifacts', 'candidate-c-territory-authoring');
const EXACT_SHA = process.env.CANDIDATE_C_TERRITORY_AUTHORING_EXACT_SHA || 'LOCAL_UNBOUND';
const EXACT_TREE = process.env.CANDIDATE_C_TERRITORY_AUTHORING_EXACT_TREE || 'LOCAL_UNBOUND';
const DESKTOP = Object.freeze({ width: 1440, height: 1000 });
const NATIVE_NARROW = Object.freeze({ width: 390, height: 844 });
const SLUG = 'northline-hall';

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isLocalRequest(url) {
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return true;
  try {
    return ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
  } catch (_) {
    return false;
  }
}

async function stopServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => server.closeAllConnections?.(), 1000);
    timer.unref?.();
    server.close((error) => {
      clearTimeout(timer);
      if (error) reject(error); else resolve();
    });
  });
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
    return {
      violationCount: result.violations.length,
      blockingCount: blocking.length,
      blocking: blocking.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.slice(0, 5).map((node) => node.target) })),
    };
  });
  assert.equal(geometry.overflow, false, `${label}: horizontal overflow ${geometry.scrollWidth}/${geometry.clientWidth}`);
  assert.equal(geometry.incompleteImages, 0, `${label}: incomplete images`);
  assert.equal(accessibility.blockingCount, 0, `${label}: blocking accessibility ${JSON.stringify(accessibility.blocking)}`);
  return { label, geometry, accessibility };
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-territory-authoring-browser-'));
  const statePath = path.join(tempRoot, 'candidate-c-state.json');
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);

  const screenshots = [];
  const audits = [];
  const externalRequests = [];
  const consoleErrors = [];
  context.on('request', (request) => {
    if (!isLocalRequest(request.url())) externalRequests.push(request.url());
  });
  page.on('pageerror', (error) => consoleErrors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push({ type: 'console', text: message.text() });
  });

  async function capture(name, label, { fullPage = true } = {}) {
    const audit = await auditPage(page, axeSource, label);
    audits.push(audit);
    const file = `${name}.png`;
    const filePath = path.join(OUTPUT_ROOT, file);
    await page.screenshot({ path: filePath, fullPage, animations: 'disabled' });
    const record = { file, label, viewport: await page.viewportSize(), sha256: sha256File(filePath) };
    screenshots.push(record);
    return record;
  }

  let store = new FileCandidateCStore({ statePath, now: () => Date.parse('2026-09-16T17:30:00Z') });
  let server = await startDogfoodServer(createDogfoodApp({ store }), { port: 0 });
  let origin = `http://127.0.0.1:${server.address().port}`;
  const originalLiveDigest = store.publicSnapshot(SLUG).draftDigest;
  const originalLiveVersion = store.publicSnapshot(SLUG).draft.schemaVersion;

  try {
    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await capture('01-desktop-studio-entry', 'desktop-studio-entry');

    await page.locator('.cc-studio-commandbar summary').filter({ hasText: 'Page' }).click();
    const territoryEntry = page.locator(`a[href="/candidate-c/studio/${SLUG}/territory-content"]`).first();
    await territoryEntry.click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content`);
    await capture('02-desktop-territory-before-enable', 'desktop-territory-before-enable');

    await page.getByRole('button', { name: 'Enable territory content in Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?upgraded=1`);
    assert.equal(store.snapshot(SLUG).draft.schemaVersion, 2);
    assert.equal(store.publicSnapshot(SLUG).draft.schemaVersion, originalLiveVersion);

    await page.getByRole('link', { name: 'Add person' }).click();
    await page.locator('#cc-profile-name').fill('Rowan Field');
    await page.locator('#cc-profile-role').fill('Program host');
    await page.locator('#cc-profile-bio').fill('A fictional public-facing program host created through ordinary Studio territory authoring.');
    const profileMedia = page.locator('#cc-profile-media');
    const profileOptions = await profileMedia.locator('option').count();
    if (profileOptions > 1) await profileMedia.selectOption({ index: 1 });
    await page.locator('#cc-profile-link-label-0').fill('Reference');
    await page.locator('#cc-profile-link-url-0').fill('https://example.com/rowan-field');
    await capture('03-desktop-profile-form', 'desktop-profile-form');
    await page.getByRole('button', { name: 'Add person to Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?saved=1`);
    const profile = store.snapshot(SLUG).draft.people.find((item) => item.displayName === 'Rowan Field');
    assert.ok(profile?.id, 'profile was not authored through Studio');

    await page.getByRole('link', { name: 'Write an Update' }).click();
    await page.locator('#cc-update-body').fill('Doors are open. The Studio-authored restart proof is underway.');
    await page.locator('#cc-update-title').fill('Doors are open');
    await page.locator('#cc-update-author').selectOption(profile.id);
    const updateMedia = page.locator('input[name="mediaIds"]');
    if (await updateMedia.count()) await updateMedia.first().check();
    await capture('04-desktop-update-form', 'desktop-update-form');
    await page.getByRole('button', { name: 'Add Update to Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?saved=1`);
    const update = store.snapshot(SLUG).draft.stories.find((item) => item.kind === 'update' && item.title === 'Doors are open');
    assert.ok(update?.id, 'Update was not authored through Studio');

    await page.getByRole('link', { name: 'Add story' }).click();
    await page.locator('#cc-story-kind').selectOption('essay');
    await page.locator('#cc-story-title').fill('After the room restarts');
    await page.locator('#cc-story-dek').fill('A browser-authored durability proof.');
    await page.locator('#cc-story-body').fill('This essay was created through ordinary HiVenues Studio controls and must remain Working-only until an explicit Release.');
    const storyAuthor = page.locator(`input[name="authorProfileIds"][value="${profile.id}"]`);
    await storyAuthor.check();
    const storyMedia = page.locator('input[name="mediaIds"]');
    if (await storyMedia.count()) await storyMedia.first().check();
    await capture('05-desktop-story-form', 'desktop-story-form');
    await page.getByRole('button', { name: 'Add story to Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?saved=1`);
    const story = store.snapshot(SLUG).draft.stories.find((item) => item.kind === 'essay' && item.title === 'After the room restarts');
    assert.ok(story?.id, 'Story was not authored through Studio');

    await page.getByRole('link', { name: 'Edit gallery' }).click();
    await page.locator('#cc-gallery-title').fill('Northline room studies');
    await page.locator('#cc-gallery-summary').fill('A bounded selection curated from media already admitted to this host.');
    const galleryIncludes = page.locator('input[type="checkbox"][name^="include_"]');
    assert.ok(await galleryIncludes.count(), 'gallery has no host media to curate');
    await galleryIncludes.first().check();
    await page.locator('input[type="number"][name^="order_"]').first().fill('1');
    await capture('06-desktop-gallery-form', 'desktop-gallery-form');
    await page.getByRole('button', { name: 'Save gallery to Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?saved=1`);

    await page.getByRole('link', { name: 'Edit navigation' }).click();
    const labels = {
      home: 'Front room', activities: 'Nights', stories: 'Dispatches', offers: 'Offers', gallery: 'Views', people: 'People', 'about-visit': 'Visit',
    };
    const order = { stories: 1, home: 2, activities: 3, offers: 4, gallery: 5, people: 6, 'about-visit': 7 };
    for (const [role, label] of Object.entries(labels)) {
      await page.locator(`#cc-nav-label-${role}`).fill(label);
      await page.locator(`#cc-nav-order-${role}`).fill(String(order[role]));
    }
    await capture('07-desktop-navigation-form', 'desktop-navigation-form');
    await page.getByRole('button', { name: 'Save navigation to Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?saved=1`);
    await capture('08-desktop-territory-complete', 'desktop-territory-complete');

    const authored = store.snapshot(SLUG);
    const beforeRestart = {
      revision: authored.revision,
      draftDigest: authored.draftDigest,
      profileId: profile.id,
      profileSlug: profile.slug,
      updateId: update.id,
      updateSlug: update.slug,
      storyId: story.id,
      storySlug: story.slug,
    };
    assert.equal(store.publicSnapshot(SLUG).draftDigest, originalLiveDigest, 'Working territory leaked to Live before Release');

    await page.goto(`${origin}/candidate-c/studio/${SLUG}/preview/stories`, { waitUntil: 'networkidle' });
    const previewText = await page.locator('body').textContent();
    assert.ok(previewText.includes('Doors are open'), 'Working Update missing from Preview');
    assert.ok(previewText.includes('After the room restarts'), 'Working Story missing from Preview');
    await capture('09-desktop-working-preview', 'desktop-working-preview');
    const preReleaseUpdate = await page.request.get(`${origin}/candidate-c/${SLUG}/stories/${update.slug}`);
    const preReleaseStory = await page.request.get(`${origin}/candidate-c/${SLUG}/stories/${story.slug}`);
    assert.equal(preReleaseUpdate.status(), 404, 'Update leaked to public before Release');
    assert.equal(preReleaseStory.status(), 404, 'Story leaked to public before Release');

    await stopServer(server);
    store = new FileCandidateCStore({ statePath, now: () => Date.parse('2026-09-16T18:00:00Z') });
    server = await startDogfoodServer(createDogfoodApp({ store }), { port: 0 });
    origin = `http://127.0.0.1:${server.address().port}`;
    const restarted = store.snapshot(SLUG);
    assert.equal(restarted.revision, beforeRestart.revision, 'restart changed Working revision');
    assert.equal(restarted.draftDigest, beforeRestart.draftDigest, 'restart changed Working digest');
    assert.equal(restarted.draft.people.find((item) => item.id === beforeRestart.profileId)?.slug, beforeRestart.profileSlug);
    assert.equal(restarted.draft.stories.find((item) => item.id === beforeRestart.updateId)?.slug, beforeRestart.updateSlug);
    assert.equal(restarted.draft.stories.find((item) => item.id === beforeRestart.storyId)?.slug, beforeRestart.storySlug);
    assert.equal(store.publicSnapshot(SLUG).draftDigest, originalLiveDigest, 'restart leaked Working to Live');

    await page.setViewportSize(DESKTOP);
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/territory-content`, { waitUntil: 'networkidle' });
    await capture('10-desktop-post-restart-hub', 'desktop-post-restart-hub');

    await page.setViewportSize(NATIVE_NARROW);
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/territory-content`, { waitUntil: 'networkidle' });
    await capture('11-native390-territory-hub', 'native390-territory-hub');

    await page.getByRole('link', { name: 'Doors are open' }).click();
    await capture('12-native390-update-edit', 'native390-update-edit');
    await page.locator('#cc-update-body').fill('Doors are open. The native mobile authoring pass is clean.');
    await page.getByRole('button', { name: 'Save Update to Working' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}/territory-content?saved=1`);
    const mobileEdited = store.snapshot(SLUG).draft.stories.find((item) => item.id === beforeRestart.updateId);
    assert.equal(mobileEdited.body, 'Doors are open. The native mobile authoring pass is clean.');

    await page.getByRole('link', { name: 'Rowan Field' }).click();
    await capture('13-native390-profile-edit', 'native390-profile-edit');
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/territory-content/gallery`, { waitUntil: 'networkidle' });
    await capture('14-native390-gallery', 'native390-gallery');
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/territory-content/navigation`, { waitUntil: 'networkidle' });
    await capture('15-native390-navigation', 'native390-navigation');

    await page.setViewportSize(DESKTOP);
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/release`, { waitUntil: 'networkidle' });
    await capture('16-desktop-release-review', 'desktop-release-review');
    await page.getByRole('button', { name: 'Publish website release' }).click();
    await page.waitForURL(`**/candidate-c/studio/${SLUG}?released=*`);
    const live = store.publicSnapshot(SLUG);
    assert.equal(live.draft.schemaVersion, 2);
    assert.equal(live.draft.people.find((item) => item.id === beforeRestart.profileId)?.slug, beforeRestart.profileSlug);
    assert.equal(live.draft.stories.find((item) => item.id === beforeRestart.updateId)?.body, 'Doors are open. The native mobile authoring pass is clean.');
    assert.equal(live.draft.stories.find((item) => item.id === beforeRestart.storyId)?.slug, beforeRestart.storySlug);
    assert.equal(live.draft.navigation.labels.stories, 'Dispatches');

    await page.goto(`${origin}/candidate-c/${SLUG}/stories`, { waitUntil: 'networkidle' });
    const publicText = await page.locator('body').textContent();
    assert.ok(publicText.includes('Doors are open'));
    assert.ok(publicText.includes('After the room restarts'));
    await capture('17-desktop-public-after-release', 'desktop-public-after-release');

    const releasedDigest = live.draftDigest;
    await stopServer(server);
    store = new FileCandidateCStore({ statePath, now: () => Date.parse('2026-09-16T18:30:00Z') });
    server = await startDogfoodServer(createDogfoodApp({ store }), { port: 0 });
    origin = `http://127.0.0.1:${server.address().port}`;
    assert.equal(store.publicSnapshot(SLUG).draftDigest, releasedDigest, 'released territory did not survive restart');
    await page.setViewportSize(NATIVE_NARROW);
    await page.goto(`${origin}/candidate-c/${SLUG}/stories`, { waitUntil: 'networkidle' });
    await capture('18-native390-public-after-restart', 'native390-public-after-restart');

    const effects = store.diagnostics().external;
    assert.deepEqual(effects, {
      hiveRpcAttempts: 0,
      hiveWrites: 0,
      providerWrites: 0,
      payments: 0,
      signingAttempts: 0,
      deployments: 0,
    }, 'territory authoring caused external effects');
    assert.deepEqual(externalRequests, [], `external network requests: ${JSON.stringify(externalRequests)}`);
    assert.deepEqual(consoleErrors, [], `console/page errors: ${JSON.stringify(consoleErrors)}`);

    const manifest = {
      qualification: 'candidate-c-territory-authoring',
      candidate: EXACT_SHA,
      tree: EXACT_TREE,
      host: { slug: SLUG, ordinarySeedHost: true },
      state: {
        originalLiveDigest,
        authoredWorkingRevision: beforeRestart.revision,
        authoredWorkingDigest: beforeRestart.draftDigest,
        releasedDigest,
        stableResources: {
          profile: { id: beforeRestart.profileId, slug: beforeRestart.profileSlug },
          update: { id: beforeRestart.updateId, slug: beforeRestart.updateSlug },
          story: { id: beforeRestart.storyId, slug: beforeRestart.storySlug },
        },
      },
      screenshots,
      audits,
      externalRequests,
      consoleErrors,
      effects,
      summary: {
        screenshotCount: screenshots.length,
        auditCount: audits.length,
        blockingAccessibilityFindings: audits.reduce((sum, item) => sum + item.accessibility.blockingCount, 0),
        horizontalOverflowFindings: audits.filter((item) => item.geometry.overflow).length,
        incompleteImageFindings: audits.filter((item) => item.geometry.incompleteImages > 0).length,
        externalRequests: externalRequests.length,
        unexpectedConsoleErrors: consoleErrors.length,
        restartWorkingPreserved: true,
        releaseRestartPreserved: true,
      },
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  } finally {
    await stopServer(server).catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

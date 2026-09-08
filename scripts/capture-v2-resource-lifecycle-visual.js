#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { URLSearchParams } = require('node:url');
const { chromium } = require('playwright');
const axe = require('axe-core');
const { createReferenceV2AuthoringStudioFixture, createV2AuthoringStudioFixture } = require('../test/support/v2-authoring-studio-fixture');
const { closeServer, listenLoopback, sha256 } = require('./support/visual-harness');

const OUTPUT = path.resolve(__dirname, '..', process.env.V2_RESOURCE_LIFECYCLE_REVIEW_ROOT || 'artifacts/v2-resource-lifecycle-review');
const specs = [
  { reference: 'juniper', kind: 'equipment', component: 'home-equipment-status', noun: 'equipment item', viewport: 'mobile',
    values: { name: 'Portable workbench', note: 'Awaiting inspection', accessNote: 'Ask workshop staff', lastUpdated: '2026-09-08T10:00' } },
  { reference: 'juniper', kind: 'programs', component: 'home-programs', noun: 'program', viewport: 'tablet',
    values: { title: 'Open studio evening', description: 'Guided work and shared learning.', accessNote: 'Orientation required', startAt: '2026-09-18T18:00', endAt: '2026-09-18T20:00' } },
  { reference: 'live-music', kind: 'events', component: 'home-shows', noun: 'show', viewport: 'desktop',
    values: { title: 'Late summer session', description: 'An evening of live music.', startAt: '2026-09-18T18:00', endAt: '2026-09-18T20:00' } },
];

async function click(page, name) {
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name, exact: true }).click();
  await navigation;
}

async function capture(page, name, records, resourceId = null) {
  // Frame the evidence being reviewed, rather than an unrelated page hero.
  const selected = new URL(page.url()).searchParams.get('nodeId');
  const componentId = selected.split('/')[0].slice('component:'.length);
  const preview = page.frames().find((frame) => frame !== page.mainFrame());
  const component = preview.locator(`[data-component-id="${componentId}"]`);
  const subject = resourceId ? component.locator(`[data-resource-id="${resourceId}"]`)
    : component.locator('.v2-resource-list');
  await subject.evaluate((element) => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const visibleSubject = await subject.locator('h3, .v2-empty-state strong').first().evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { text: element.textContent.trim(), top: rect.top, bottom: rect.bottom, height: globalThis.innerHeight };
  });
  assert.ok(visibleSubject.top >= 0 && visibleSubject.bottom <= visibleSubject.height, `${name}: review subject outside preview viewport`);
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.locator('.inspector-panel').evaluate((panel) => {
    const card = panel.querySelector('.resource-lifecycle-editor');
    panel.scrollTop += card.getBoundingClientRect().top - panel.getBoundingClientRect().top;
  });
  if (await page.locator('.resource-lifecycle-editor .preview-state').count()) {
    assert.equal(await page.getByRole('button', { name: 'Preview position', exact: true }).count(), 0);
    for (const name of ['Undo', 'Redo']) assert.equal(await page.getByRole('button', { name, exact: true }).isDisabled(), true);
    for (const name of ['Apply to draft', 'Discard preview']) assert.equal(await page.getByRole('button', { name, exact: true }).isEnabled(), true);
  }
  const geometry = await page.evaluate(() => ({ width: globalThis.document.documentElement.clientWidth, scroll: globalThis.document.documentElement.scrollWidth }));
  assert.ok(geometry.scroll <= geometry.width + 1, `${name}: outer overflow`);
  const findings = [];
  for (const frame of page.frames()) {
    await frame.addScriptTag({ content: axe.source });
    const violations = await frame.evaluate(async () => (await globalThis.axe.run(globalThis.document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, resultTypes: ['violations'],
    })).violations);
    findings.push(...violations.filter((v) => ['serious', 'critical'].includes(v.impact)));
    const box = await frame.evaluate(() => ({ width: globalThis.document.documentElement.clientWidth, scroll: globalThis.document.documentElement.scrollWidth }));
    assert.ok(box.scroll <= box.width + 1, `${name}: frame overflow`);
  }
  assert.deepEqual(findings, [], `${name}: accessibility`);
  const file = `screenshots/${name}.png`;
  await page.screenshot({ path: path.join(OUTPUT, file), fullPage: false, animations: 'disabled' });
  const bytes = fs.readFileSync(path.join(OUTPUT, file));
  records.push({ name, file, sha256: sha256(bytes), bytes: bytes.length, geometry, visibleSubject, blockingAccessibilityFindings: 0 });
}

async function journey(browser, spec) {
  const fixture = createReferenceV2AuthoringStudioFixture(spec.reference);
  const server = await listenLoopback(fixture.app);
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const nodeId = `component:${spec.component}`;
  const records = [];
  const visit = async (node = nodeId) => page.goto(`${base}/studio-authoring?${new URLSearchParams({ nodeId: node, viewport: spec.viewport })}`, { waitUntil: 'networkidle' });
  const occurrence = (id) => `${nodeId}/resource:${spec.kind}:${id}`;
  try {
    await visit();
    const before = fixture.session().draftDigest;
    const fill = async () => {
      for (const [name, value] of Object.entries(spec.values)) await page.locator(`#new-resource-${name}`).fill(value);
      await page.locator('#new-resource-offset').selectOption('-07:00');
    };
    await fill();
    if (spec.kind === 'programs') {
      await capture(page, 'programs-creation-controls', records);
    }
    const create = page.getByRole('button', { name: `Preview new ${spec.noun}`, exact: true });
    await create.focus();
    const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
    await create.press('Enter'); await navigation;
    assert.equal(fixture.session().draftDigest, before);
    const added = fixture.proposal();
    const id = added.resolvedTarget.resourceId;
    const label = spec.values.title || spec.values.name;
    const frame = page.frames().find((f) => f !== page.mainFrame());
    assert.ok((await frame.locator('body').textContent()).includes(label));
    if (spec.kind === 'events') {
      const slug = added.previewSource.resources.events.find((r) => r.id === id).slug;
      const response = await fetch(`${base}/studio-authoring-preview/site/events/${slug}`);
      assert.ok(response.ok); assert.ok((await response.text()).includes(label));
    }
    await capture(page, `${spec.kind}-add-preview`, records, id);
    await click(page, 'Discard preview'); assert.equal(fixture.session().draftDigest, before);
    await fill(); await click(page, `Preview new ${spec.noun}`); await click(page, 'Apply to draft');
    assert.equal(fixture.session().draftDigest, added.afterDigest);
    await click(page, 'Undo'); assert.equal(fixture.session().draftDigest, before);
    await click(page, 'Redo'); assert.equal(fixture.session().draftDigest, added.afterDigest);
    await visit(occurrence(id));
    const firstId = fixture.session().draftSource.site.pages.flatMap((p) => p.components).find((c) => c.id === spec.component).content.resourceIds[0];
    await page.locator('#resource-destination').selectOption(firstId);
    await click(page, 'Preview order');
    assert.equal(fixture.session().draftDigest, added.afterDigest);
    if (spec.kind === 'programs') await capture(page, 'programs-order-preview', records);
    await click(page, 'Apply to draft');
    const moved = fixture.session().draftDigest;
    await click(page, 'Undo'); assert.equal(fixture.session().draftDigest, added.afterDigest);
    await click(page, 'Redo'); assert.equal(fixture.session().draftDigest, moved);
    // Remove an original shared resource, not only the newly inserted occurrence.
    await visit(occurrence(firstId));
    await page.locator('.resource-lifecycle-editor summary').click();
    const resource = fixture.session().draftSource.resources[spec.kind].find((r) => r.id === firstId);
    await page.locator('#resource-confirmation').fill(resource.title || resource.name);
    await click(page, 'Preview removal');
    assert.ok(fixture.proposal().resolvedTarget.affectedLists.length >= 2);
    const removed = fixture.proposal().afterDigest;
    if (spec.kind === 'events') await capture(page, 'events-shared-removal-preview', records);
    await click(page, 'Apply to draft'); assert.equal(fixture.session().draftDigest, removed);
    await click(page, 'Undo'); assert.equal(fixture.session().draftDigest, moved);
    await click(page, 'Redo'); assert.equal(fixture.session().draftDigest, removed);
    if (spec.kind === 'equipment') {
      for (;;) {
        const component = fixture.session().draftSource.site.pages.flatMap((p) => p.components).find((c) => c.id === spec.component);
        if (!component.content.resourceIds.length) break;
        const itemId = component.content.resourceIds[0];
        const item = fixture.session().draftSource.resources.equipment.find((r) => r.id === itemId);
        await visit(occurrence(itemId)); await page.locator('.resource-lifecycle-editor summary').click();
        await page.locator('#resource-confirmation').fill(item.name);
        await click(page, 'Preview removal'); await click(page, 'Apply to draft');
      }
      assert.ok((await page.locator('.resource-lifecycle-editor').textContent()).includes('This list is empty'));
      await capture(page, 'equipment-empty-list', records);
    }
    // Exercise the same new controls at a narrow Studio viewport as well.
    await page.setViewportSize({ width: 390, height: 844 }); await visit();
    const narrow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth + 1);
    assert.equal(narrow, true);
    const diagnostics = fixture.diagnostics();
    for (const key of ['persistentWrites', 'hiveRpcAttempts', 'hiveWrites']) assert.equal(diagnostics[key], 0);
    return { reference: spec.reference, kind: spec.kind, records, diagnostics, exactHistory: true, sharedRemoval: true, narrowGeometry: true };
  } finally { await page.close(); await closeServer(server); }
}

async function main() {
  fs.mkdirSync(path.join(OUTPUT, 'screenshots'), { recursive: true });
  const browser = await chromium.launch();
  const journeys = [];
  const capacityRecords = [];
  try {
    for (const spec of specs) journeys.push(await journey(browser, spec));
    const seed = createReferenceV2AuthoringStudioFixture('juniper').session().draftSource;
    const source = JSON.parse(JSON.stringify(seed));
    const item = source.resources.equipment[0];
    source.resources.equipment = Array.from({ length: 200 }, (_, i) => ({ ...item, id: `capacity-${i}` }));
    for (const p of source.site.pages) for (const c of p.components) {
      if (c.kind === 'equipment-status') c.content.resourceIds = ['capacity-0'];
    }
    const fixture = createV2AuthoringStudioFixture(source);
    const server = await listenLoopback(fixture.app);
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}/studio-authoring?nodeId=component:home-equipment-status`, { waitUntil: 'networkidle' });
      assert.equal(await page.getByRole('heading', { name: 'List capacity reached' }).count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Preview new equipment item' }).count(), 0);
      await capture(page, 'equipment-capacity-reached', capacityRecords);
    } finally { await page.close(); await closeServer(server); }
  }
  finally { await browser.close(); }
  const summary = { journeys: journeys.length, screenshots: journeys.reduce((n, j) => n + j.records.length, capacityRecords.length),
    exactHistory: journeys.filter((j) => j.exactHistory).length, sharedRemoval: journeys.filter((j) => j.sharedRemoval).length };
  assert.deepEqual(summary, { journeys: 3, screenshots: 8, exactHistory: 3, sharedRemoval: 3 });
  fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), JSON.stringify({ kind: 'hivenues-resource-lifecycle-review', schemaVersion: 1, commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), summary, journeys, capacityRecords }, null, 2) + '\n');
  console.log('V2_RESOURCE_LIFECYCLE_VISUAL_EVIDENCE', JSON.stringify(summary));
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });

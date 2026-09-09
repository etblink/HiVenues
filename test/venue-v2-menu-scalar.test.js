'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { URLSearchParams } = require('node:url');
const request = require('supertest');
const { JSDOM } = require('jsdom');
const a = require('../src/venue/v2/authoring-transaction');
const { serializeV2DeploymentAgnosticVenueSource: serialize } = require('../src/venue/v2/source');
const { renderV2Page } = require('../src/venue/v2/renderer');
const { renderV2AuthoringStudioSurface } = require('../src/venue/v2/studio-authoring');
const { REFERENCE_FACTORIES } = require('./support/v2-renderer-fixture');
const { createV2AuthoringStudioFixture, createV2AuthoringStudioWorkspaceFixture } = require('./support/v2-authoring-studio-fixture');
const { V2_PERSISTED_SOURCE_ABSENT } = require('../src/venue/v2/source-file');

const occurrence = 'component:home-menu/resource:menus:dinner';
const clone = (x) => JSON.parse(JSON.stringify(x));
function sharedSource() {
  const source = clone(REFERENCE_FACTORIES.restaurant());
  assert.equal(source.site.pages.find((p) => p.id === 'menu').components.some((c) => c.kind === 'menu'), true);
  return source;
}
function command(session, fieldId, value, sectionId = 'starters', itemId = 'oysters') {
  return { schemaVersion: 1, type: a.SET_MENU_FIELD,
    target: { nodeId: 'resource:menus:dinner', sectionId, itemId, fieldId },
    payload: { value }, expectedDraftDigest: session.draftDigest };
}
function assertConsumers(source, value) {
  for (const pageId of ['home', 'menu']) {
    const html = renderV2Page(source, { pageId });
    assert.ok(new JSDOM(html).window.document.body.textContent.includes(value), `${pageId} must show changed shared text`);
  }
}

for (const [fieldId, value, sectionId, itemId] of [
  ['title', 'Seasonal dinner', null, null], ['title', 'Small plates', 'starters', null],
  ['name', 'Coastal oysters', 'starters', 'oysters'], ['description', 'Lemon and fresh herbs', 'starters', 'oysters'],
  ['priceLabel', '$21 / half dozen', 'starters', 'oysters'],
]) test(`menu ${sectionId || 'root'}/${itemId || 'section'}/${fieldId}: shared output and exact inverse`, () => {
  let session = a.createV2AuthoringSession(sharedSource());
  const original = serialize(session.draftSource);
  const proposal = a.proposeV2AuthoringCommand(session, command(session, fieldId, value, sectionId, itemId));
  assert.equal(serialize(session.draftSource), original);
  assert.deepEqual(a.discardV2AuthoringProposal(session, proposal), session);
  assertConsumers(proposal.previewSource, value);
  // Only the resolved scalar may differ; identities, lists, assets and venue facts survive.
  const expected = clone(session.draftSource); let entity = expected.resources.menus[0];
  if (sectionId) entity = entity.sections.find((s) => s.id === sectionId);
  if (itemId) entity = entity.items.find((i) => i.id === itemId);
  entity[fieldId] = value;
  assert.equal(serialize(proposal.previewSource), serialize(expected));
  session = a.applyV2AuthoringProposal(session, proposal);
  assert.equal(serialize(a.undoV2AuthoringSession(session).draftSource), original);
  assert.equal(a.redoV2AuthoringSession(a.undoV2AuthoringSession(session)).draftDigest, session.draftDigest);
  const forged = clone(session); forged.history[0].inverseCommand.payload.value = 'wrong';
  assert.throws(() => a.undoV2AuthoringSession(forged), /inverse command binding/);
});

test('optional menu description and price support clear/add and exact multi-step null history', () => {
  let session = a.createV2AuthoringSession(sharedSource()); const original = serialize(session.draftSource);
  for (const fieldId of ['description', 'priceLabel']) {
    session = a.applyV2AuthoringProposal(session, a.proposeV2AuthoringCommand(session, command(session, fieldId, null)));
  }
  for (const pageId of ['home', 'menu']) {
    const item = new JSDOM(renderV2Page(session.draftSource, { pageId })).window.document.querySelector('[data-menu-item-id="oysters"]');
    assert.equal(item.querySelector('p'), null); assert.equal(item.querySelector('span'), null);
  }
  const cleared = session.draftDigest;
  session = a.applyV2AuthoringProposal(session, a.proposeV2AuthoringCommand(session, command(session, 'priceLabel', '  Market price  ')));
  assert.equal(session.draftSource.resources.menus[0].sections[0].items[0].priceLabel, 'Market price');
  session = a.undoV2AuthoringSession(session); assert.equal(session.draftDigest, cleared);
  session = a.undoV2AuthoringSession(a.undoV2AuthoringSession(session)); assert.equal(serialize(session.draftSource), original);
  session = a.redoV2AuthoringSession(a.redoV2AuthoringSession(session)); assert.equal(session.draftDigest, cleared);
});

test('menu commands reject stale, missing/cross-section identities, structure and wrong nullability', () => {
  const session = a.createV2AuthoringSession(sharedSource()); const good = command(session, 'name', 'New name');
  const invalid = [
    { ...good, expectedDraftDigest: '0'.repeat(64) }, { ...good, sourcePointer: '/resources/menus/0' },
    { ...good, payload: { value: 'New name', raw: {} } }, { ...good, payload: { value: {} } },
    ...[null, '', '   ', 'x'.repeat(241), 'x\0y', 'Oysters'].map((value) => ({ ...good, payload: { value } })),
    ...[{ nodeId: 'resource:events:dinner' }, { sectionId: 'mains' }, { sectionId: null }, { itemId: 'missing' },
      { fieldId: 'id' }, { fieldId: 'items' }, { index: 0 }].map((target) => ({ ...good, target: { ...good.target, ...target } })),
    command(session, 'priceLabel', 'x'.repeat(81)), command(session, 'description', null, null, null),
  ];
  const before = serialize(session.draftSource);
  for (const c of invalid) assert.throws(() => a.proposeV2AuthoringCommand(session, c));
  assert.equal(serialize(session.draftSource), before);
});

test('Studio menu picker, strict forms, proposal lock and nested selection survive history', async () => {
  const fixture = createV2AuthoringStudioFixture(sharedSource());
  const query = new URLSearchParams({ nodeId: occurrence, menuEntry: 'item:starters:oysters', viewport: 'tablet' });
  const form = { nodeId: occurrence, resourceNodeId: 'resource:menus:dinner', sectionId: 'starters', itemId: 'oysters',
    fieldId: 'priceLabel', viewport: 'tablet', expectedDraftDigest: fixture.session().draftDigest, value: '$23' };
  const view = await request(fixture.app).get(`/studio-authoring?${query}`).expect(200);
  let doc = new JSDOM(view.text).window.document;
  assert.equal(doc.querySelector('#menu-entry').value, 'item:starters:oysters');
  assert.equal(doc.querySelectorAll('.menu-field-form').length, 3);
  assert.equal(doc.querySelector('#menu-priceLabel').required, false);
  for (const bad of [{ ...form, nodeId: 'component:home-menu' }, { ...form, resourceNodeId: 'resource:menus:wrong' },
    { ...form, sectionId: 'mains' }, { ...form, raw: '{}' }, { ...form, value: ['one', 'two'] }]) {
    await request(fixture.app).post('/studio-authoring/menu-field').type('form').send(bad).expect(400);
  }
  await request(fixture.app).get(`/studio-authoring?${query}&extra=1`).expect(400);
  await request(fixture.app).get(`/studio-authoring?nodeId=${encodeURIComponent(occurrence)}&menuEntry=item:mains:oysters`).expect(400);
  assert.equal(fixture.proposal(), null);
  const before = fixture.session().draftDigest;
  const preview = await request(fixture.app).post('/studio-authoring/menu-field').type('form').send(form).expect(303);
  doc = new JSDOM((await request(fixture.app).get(preview.headers.location).expect(200)).text).window.document;
  assert.equal(doc.querySelectorAll('.menu-field-form').length, 0);
  for (const action of ['undo', 'redo']) assert.equal(doc.querySelector(`form[action="/studio-authoring/${action}"] button`).disabled, true);
  assert.equal(doc.querySelector('form[action="/studio-authoring/apply"] [name="menuEntry"]').value, 'item:starters:oysters');
  await request(fixture.app).post('/studio-authoring/menu-field').type('form').send(form).expect(400);
  assert.equal(fixture.session().draftDigest, before);
  const selection = { nodeId: occurrence, viewport: 'tablet', menuEntry: 'item:starters:oysters' };
  for (const action of ['apply', 'undo', 'redo']) {
    const response = await request(fixture.app).post(`/studio-authoring/${action}`).type('form').send(selection).expect(303);
    const next = new JSDOM((await request(fixture.app).get(response.headers.location).expect(200)).text).window.document;
    assert.equal(next.querySelector('#menu-entry').value, selection.menuEntry);
    if (action === 'undo') assert.equal(fixture.session().draftDigest, before);
  }
  assert.equal(fixture.diagnostics().persistentWrites, 0); assert.equal(fixture.diagnostics().hiveWrites, 0);
});

test('menu navigation preserves strict plain-data query authority', () => {
  const session = a.createV2AuthoringSession(sharedSource());
  const getter = {}; Object.defineProperty(getter, 'menuEntry', { enumerable: true, get() { throw new Error('getter executed'); } });
  for (const query of [[], 42, Object.create({ nodeId: occurrence }), getter, { extra: 'unknown' }]) {
    assert.throws(() => renderV2AuthoringStudioSurface({ session, query, previewPathForPage: () => '/preview' }), /query/);
  }
});

test('ordinary menu edit saves explicitly and reopens exact source in a fresh process', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-menu-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'venue-assets'));
  const fixture = createV2AuthoringStudioFixture(sharedSource(), { workspaceDirectory: root });
  const selection = { nodeId: occurrence, viewport: 'mobile', menuEntry: 'item:starters:oysters' };
  await request(fixture.app).post('/studio-authoring/menu-field').type('form').send({ nodeId: occurrence, viewport: 'mobile', resourceNodeId: 'resource:menus:dinner',
    sectionId: 'starters', itemId: 'oysters', fieldId: 'description', value: '', expectedDraftDigest: fixture.session().draftDigest }).expect(303);
  await request(fixture.app).post('/studio-authoring/apply').type('form').send(selection).expect(303);
  assert.equal(fs.existsSync(path.join(root, 'venue-source-v2.json')), false);
  const accepted = serialize(fixture.session().draftSource);
  await request(fixture.app).post('/studio-authoring/save-workspace').type('form').send({ ...selection,
    expectedDraftDigest: fixture.session().draftDigest, expectedPersistedDigest: V2_PERSISTED_SOURCE_ABSENT }).expect(303);
  const reopened = execFileSync(process.execPath, ['-e', "const {createV2AuthoringStudioWorkspaceApp}=require('./src/venue/v2/studio-app');const {serializeV2DeploymentAgnosticVenueSource:s}=require('./src/venue/v2/source');process.stdout.write(s(createV2AuthoringStudioWorkspaceApp({workspaceDirectory:process.argv[1]}).session().draftSource));", root], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  assert.equal(reopened, accepted);
  const fresh = createV2AuthoringStudioWorkspaceFixture({ workspaceDirectory: root });
  await request(fresh.app).get(`/studio-authoring?${new URLSearchParams(selection)}`).expect(200).expect(/Menu, section or item/);
  assert.equal(fresh.session().history.length, 0);
});

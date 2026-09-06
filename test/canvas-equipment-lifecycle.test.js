'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { URLSearchParams } = require('node:url');
const request = require('supertest');
const { JSDOM } = require('jsdom');
const { createSourceAuthoringSession } = require('../src/venue/source-authoring-session');
const { extractDeploymentAgnosticVenueSource } = require('../src/venue/source');
const { previewCanvasSourceCommandWithInverse } = require('../src/venue/canvas-source-preview');
const { createInsertItemCommand, createRemoveItemCommand, createSetFieldCommand } = require('../src/venue/semantic-venue-canvas-contract');
const { createSourceAuthoringFixture } = require('./support/source-authoring-fixture');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('./support/hv7-juniper-venue');
const { FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT } = require('./support/hv5-authoring-fixtures');
const parent = 'home.equipment-status';
const source = () => extractDeploymentAgnosticVenueSource(JUNIPER_WORKS_AUTHORING_INPUT);
const values = { name: 'Bench drill', state: 'limited', note: 'Awaiting inspection.', accessNote: 'Ask a steward.', lastUpdated: '2026-09-06T12:00:00Z', group: '' };
const snap = s => [s.canonicalAccepted(), s.canonicalProposal(), s.proposalRevision(), s.status(), s.canvasHistoryStatus()];
const dom = html => new JSDOM(html).window.document;
function form(html, selector) {
  const node = dom(html).querySelector(selector);
  return Object.fromEntries([...(node.tagName === 'FORM' ? node : node.closest('form')).querySelectorAll('[name]')].map(x => [x.name, x.value]));
}
function post(f, suffix, data, origin = 'http://127.0.0.1') {
  return request(f.app).post(f.editorPath + '/canvas-editor' + suffix).set('Host', '127.0.0.1').set('Origin', origin).type('form').send(data);
}
function fixture(t, input = source()) {
  const f = createSourceAuthoringFixture(input);
  t.after(() => f.previewApplication.locals.services.receiptStore?.close?.());
  return f;
}

test('Equipment add/edit/move/remove and complete Undo/Redo restore exact source and stable identity', () => {
  const s = createSourceAuthoringSession(source());
  const frames = [s.canonicalProposal()];
  const added = s.previewCanvasAddEquipment(parent, values, s.proposalRevision());
  const id = added.blockId;
  assert.match(id, /^home\.equipment-status\.item\.equipment-[a-f0-9]{24}$/);
  assert.equal(s.proposalDraft.venuePackage.home.equipmentStatus.items.at(-1).group, null);
  frames.push(s.canonicalProposal());
  s.previewCanvasField(createSetFieldCommand({ blockId: id, fieldId: 'name', value: 'Renamed drill' }), s.proposalRevision());
  frames.push(s.canonicalProposal());
  s.previewCanvasMoveTo(id, parent + '.item.wood-shop', s.proposalRevision());
  frames.push(s.canonicalProposal());
  s.previewCanvasRemoveEquipment(id, s.proposalRevision());
  frames.push(s.canonicalProposal());
  assert.equal(s.canvasHistoryStatus().undoCount, 4);
  for (let i = frames.length - 2; i >= 0; i--) {
    s.undoCanvasPreview(s.proposalRevision());
    assert.equal(s.canonicalProposal(), frames[i]);
  }
  for (const expected of frames.slice(1)) {
    s.redoCanvasPreview(s.proposalRevision());
    assert.equal(s.canonicalProposal(), expected);
  }
  assert.equal(s.canonicalAccepted(), frames[0]);
});

test('Removal from first, middle, last and singleton restores item contents and placement', () => {
  for (const ids of [['laser-cutter', 'wood-shop', 'electronics-bench'], ['wood-shop']]) {
    for (const id of ids) {
      const input = JSON.parse(JSON.stringify(source())); input.venuePackage.home.equipmentStatus.items = input.venuePackage.home.equipmentStatus.items.filter(i => ids.includes(i.id));
      const s = createSourceAuthoringSession(input); const before = s.canonicalProposal();
      s.previewCanvasRemoveEquipment(parent + '.item.' + id, s.proposalRevision());
      s.undoCanvasPreview(s.proposalRevision()); assert.equal(s.canonicalProposal(), before);
    }
  }
});

test('Equipment boundaries reject invalid fields, protected IDs, absent sections, duplicates and overflow atomically', () => {
  const s = createSourceAuthoringSession(source());
  for (const bad of [null, [], {}, { ...values, id: 'forged' }, { ...values, name: '' }, { ...values, name: 'x'.repeat(241) }, { ...values, state: 'scheduled' }, { ...values, lastUpdated: '2026-09-06T12:00:00' }, { ...values, note: { x: 'bad' } }]) {
    const before = snap(s); assert.throws(() => s.previewCanvasAddEquipment(parent, bad, s.proposalRevision())); assert.deepEqual(snap(s), before);
  }
  const input = source(); const item = input.venuePackage.home.equipmentStatus.items[0];
  for (const cmd of [createInsertItemCommand({ blockId: parent, item }), createRemoveItemCommand({ blockId: 'home.programs.item.open-build-night' }), createInsertItemCommand({ blockId: 'home.programs', item }), createRemoveItemCommand({ blockId: parent }), createRemoveItemCommand({ blockId: parent + '.item.missing' })]) {
    assert.throws(() => previewCanvasSourceCommandWithInverse(input, cmd));
  }
  while (s.proposalDraft.venuePackage.home.equipmentStatus.items.length < 20) s.previewCanvasAddEquipment(parent, values, s.proposalRevision());
  const before = snap(s); assert.throws(() => s.previewCanvasAddEquipment(parent, values, s.proposalRevision())); assert.deepEqual(snap(s), before);
  for (const venue of [FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT]) {
    const absent = createSourceAuthoringSession(extractDeploymentAgnosticVenueSource(venue));
    if (!absent.proposalDraft.venuePackage.home.equipmentStatus) assert.throws(() => absent.previewCanvasAddEquipment(parent, values, absent.proposalRevision()));
  }
});

test('Equipment stale/ABA requests fail without changing history; unrelated edits invalidate; limit stays 50', () => {
  const s = createSourceAuthoringSession(source()); const stale = s.proposalRevision();
  const added = s.previewCanvasAddEquipment(parent, values, stale);
  s.undoCanvasPreview(s.proposalRevision());
  const before = snap(s);
  assert.throws(() => s.previewCanvasAddEquipment(parent, values, stale), { code: 'STALE_CANVAS_PROPOSAL' });
  assert.throws(() => s.previewCanvasRemoveEquipment(added.blockId, stale), { code: 'STALE_CANVAS_PROPOSAL' });
  assert.deepEqual(snap(s), before);
  s.previewCanvasAddEquipment(parent, { ...values, name: 'New branch' }, s.proposalRevision());
  assert.equal(s.canvasHistoryStatus().redoCount, 0);
  s.edit('/venuePackage/home/hero/lede', 'Unrelated edit.'); assert.equal(s.canvasHistoryStatus().undoCount, 0);
  for (let i = 0; i < 26; i++) {
    const x = s.previewCanvasAddEquipment(parent, values, s.proposalRevision());
    s.previewCanvasRemoveEquipment(x.blockId, s.proposalRevision());
  }
  assert.equal(s.canvasHistoryStatus().undoCount, 50);
  for (let i = 0; i < 50; i++) s.undoCanvasPreview(s.proposalRevision());
  assert.equal(s.canvasHistoryStatus().undoCount, 0);
});

test('HTTP lifecycle selects added item and removed parent; Undo/Redo and cancellation stay valid', async t => {
  const f = fixture(t); const path = f.editorPath + '/canvas-editor';
  const get = block => request(f.app).get(path + '?blockId=' + block).expect(200);
  let page = await get(parent);
  page = await post(f, '/equipment/add', { ...form(page.text, '[data-canvas-equipment-add-form]'), ...values }).expect(200);
  const id = dom(page.text).querySelector('#selection-summary').dataset.selectionBlockId;
  assert.match(id, /\.item\.equipment-/); const afterAdd = f.session.canonicalProposal();
  const cancel = dom(page.text).querySelector('[data-canvas-equipment-cancel]').getAttribute('href');
  await request(f.app).get(cancel).expect(200); assert.equal(f.session.canonicalProposal(), afterAdd);
  const remove = form(page.text, '[data-canvas-equipment-remove-form]');
  const before = snap(f.session);
  await post(f, '/equipment/remove', { ...remove, confirmation: 'wrong' }).expect(400); assert.deepEqual(snap(f.session), before);
  page = await post(f, '/equipment/remove', remove).expect(200);
  assert.equal(dom(page.text).querySelector('#selection-summary').dataset.selectionBlockId, parent);
  for (const [action, selected] of [['undo', id], ['undo', parent], ['redo', id], ['redo', parent]]) {
    page = await post(f, '/history', form(page.text, `[data-canvas-history-action="${action}"]`)).expect(200);
    assert.equal(dom(page.text).querySelector('#selection-summary').dataset.selectionBlockId, selected);
  }
});

test('HTTP invalid, stale, forged, cross-collection and duplicate forms reject without proposal/history mutation', async t => {
  const f = fixture(t); const page = await request(f.app).get(f.editorPath + '/canvas-editor?blockId=' + parent).expect(200);
  const base = { ...form(page.text, '[data-canvas-equipment-add-form]'), ...values };
  for (const bad of [{ ...base, state: 'bad' }, { ...base, token: 'x' }, { ...base, blockId: 'home.programs' }, { ...base, name: '' }]) {
    const before = snap(f.session); await post(f, '/equipment/add', bad).expect(400); assert.deepEqual(snap(f.session), before);
  }
  const invalid = await post(f, '/equipment/add', { ...base, lastUpdated: 'yesterday' }).expect(400);
  assert.equal(dom(invalid.text).querySelector('#equipment-name').value, values.name);
  assert.equal(dom(invalid.text).querySelector('#equipment-lastUpdated').value, 'yesterday');
  const before = snap(f.session);
  await post(f, '/equipment/add', base, 'https://foreign.example').expect(400);
  await post(f, '/equipment/add', { ...base, extra: 'x' }).expect(413);
  await post(f, '/equipment/add', new URLSearchParams(base).toString() + '&name=duplicate').expect(413);
  await post(f, '/equipment/add', { ...base, name: 'x'.repeat(40000) }).expect(413);
  assert.deepEqual(snap(f.session), before);
  await post(f, '/equipment/add', base).expect(200);
  const after = snap(f.session); await post(f, '/equipment/add', base).expect(409); assert.deepEqual(snap(f.session), after);
  await request(f.app).get(f.editorPath + '/canvas-editor/equipment/add').expect(404);
  await request(f.app).post(f.editorPath + '/canvas').send(base).expect(404);
});

test('Forged history/move field selections are rejected before any mutation', async t => {
  const f = fixture(t); f.session.previewCanvasAddEquipment(parent, values, f.session.proposalRevision());
  const page = await request(f.app).get(f.editorPath + '/canvas-editor?blockId=' + parent + '.item.wood-shop').expect(200);
  for (const [suffix, selector] of [['/history', '[data-canvas-history-form]'], ['/move', '[data-canvas-move-form]'], ['/move-to', '[data-canvas-move-to-form]']]) {
    const data = form(page.text, selector); data.fieldId = 'missing';
    if (suffix === '/move-to') data.destination = '__collection_end__';
    const before = snap(f.session); await post(f, suffix, data).expect(400); assert.deepEqual(snap(f.session), before);
  }
});

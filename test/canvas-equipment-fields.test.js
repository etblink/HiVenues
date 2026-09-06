'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { JSDOM } = require('jsdom');
const { createSourceAuthoringSession } = require('../src/venue/source-authoring-session');
const { extractDeploymentAgnosticVenueSource } = require('../src/venue/source');
const { canvasEditableField } = require('../src/venue/canvas-source-preview');
const { createSetFieldCommand } = require('../src/venue/semantic-venue-canvas-contract');
const { createSourceAuthoringFixture } = require('./support/source-authoring-fixture');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('./support/hv7-juniper-venue');

const blockId = 'home.equipment-status.item.wood-shop';
const source = () => extractDeploymentAgnosticVenueSource(JUNIPER_WORKS_AUTHORING_INPUT);
const command = (fieldId, value, id = blockId) => createSetFieldCommand({ blockId: id, fieldId, value });
const snapshot = s => [s.canonicalAccepted(), s.canonicalProposal(), s.proposalRevision(), s.canvasHistoryStatus(), s.status()];
const dom = html => new JSDOM(html).window.document;
const fields = root => Object.fromEntries([...root.querySelectorAll('[data-canvas-edit-form] [name]')].map(x => [x.name, x.value]));
function fixture(t) {
  const f = createSourceAuthoringFixture(source());
  t.after(() => f.previewApplication.locals.services.receiptStore?.close?.());
  return { ...f, canvas: f.editorPath + '/canvas-editor' };
}
async function page(f, fieldId) {
  return dom((await request(f.app).get(f.canvas + '?blockId=' + blockId + '&fieldId=' + fieldId).expect(200)).text);
}
function post(f, data) {
  return request(f.app).post(f.canvas).set('Host', '127.0.0.1').set('Origin', 'http://127.0.0.1').type('form').send(data);
}

test('Equipment typed fields accept every status and offset timestamps with exact inverse history and stable source', () => {
  const s = createSourceAuthoringSession(source());
  const original = s.canonicalAccepted();
  const expected = structuredClone(s.proposalDraft);
  const frames = [s.canonicalProposal()];
  assert.deepEqual(canvasEditableField(source(), blockId, 'state').options, ['available', 'limited', 'maintenance', 'offline']);
  for (const [fieldId, value] of [
    ['state', 'limited'], ['state', 'maintenance'], ['state', 'offline'], ['state', 'available'],
    ['lastUpdated', '2026-09-06T12:00:00Z'], ['lastUpdated', '2026-09-06T05:15:00-07:00'],
    ['lastUpdated', '2028-02-29T12:00Z'], ['lastUpdated', '2000-02-29T12:00:00.123Z'],
  ]) {
    s.previewCanvasField(command(fieldId, value), s.proposalRevision());
    expected.venuePackage.home.equipmentStatus.items.find(x => x.id === 'wood-shop')[fieldId] = value;
    assert.deepEqual(s.proposalDraft, expected);
    frames.push(s.canonicalProposal());
  }
  assert.equal(s.canonicalAccepted(), original);
  for (const expectedBytes of frames.slice(0, -1).reverse()) {
    s.undoCanvasPreview(s.proposalRevision());
    assert.equal(s.canonicalProposal(), expectedBytes);
  }
  for (const expectedBytes of frames.slice(1)) {
    s.redoCanvasPreview(s.proposalRevision());
    assert.equal(s.canonicalProposal(), expectedBytes);
  }
  // An identical value follows existing field-command semantics without changing source bytes.
  const same = s.canonicalProposal();
  s.previewCanvasField(command('state', 'available'), s.proposalRevision());
  assert.equal(s.canonicalProposal(), same);
  s.undoCanvasPreview(s.proposalRevision());
  assert.equal(s.canonicalProposal(), same);
});

test('Equipment typed fields reject malformed values and other field authority atomically', () => {
  const s = createSourceAuthoringSession(source());
  for (const c of [
    ...['', 'scheduled', '<script>', 'AVAILABLE', null, 1, {}, []].map(x => command('state', x)),
    ...['', 'yesterday', '2026-09-06T12:00:00', '2026-02-30T12:00:00Z', '2026-02-29T12:00:00Z', '2100-02-29T12:00:00Z', '2026-04-31T12:00:00Z', '2026-00-01T12:00:00Z', '2026-01-00T12:00:00Z', '2026-01-01T25:00:00Z', '2026-01-01T12:00:00+25:00', 'September 6, 2026Z', 'x'.repeat(41), null, {}, []].map(x => command('lastUpdated', x)),
    command('state', 'full', 'home.programs.item.open-build-night'),
    command('startAt', '2026-09-06T12:00:00Z', 'home.programs.item.open-build-night'),
    command('id', 'forged'), command('state', 'offline', 'home.equipment-status.item.missing'),
    command('image.src', '/forged.png', 'home.hero'), command('displayName', 'forged', 'venue.settings'),
  ]) {
    const before = snapshot(s);
    assert.throws(() => s.previewCanvasField(c, s.proposalRevision()), JSON.stringify(c));
    assert.deepEqual(snapshot(s), before);
  }
});

test('Equipment typed field revisions reject ABA, removal and other editor changes without rebasing history', () => {
  for (const change of [
    s => { s.previewCanvasField(command('state', 'offline'), s.proposalRevision()); s.undoCanvasPreview(s.proposalRevision()); },
    s => s.removeCollectionItem('/venuePackage/home/equipmentStatus/items', 'wood-shop'),
    s => s.edit('/venuePackage/home/hero/lede', 'Intervening draft.'),
  ]) {
    const s = createSourceAuthoringSession(source());
    const stale = s.proposalRevision();
    change(s);
    const before = snapshot(s);
    assert.throws(() => s.previewCanvasField(command('lastUpdated', '2026-09-06T12:00:00Z'), stale), { code: 'STALE_CANVAS_PROPOSAL' });
    assert.deepEqual(snapshot(s), before);
  }
});

test('Equipment status HTTP controls derive exact choices, preserve invalid attempts and show fresh conflict values', async t => {
  const f = fixture(t);
  let root = await page(f, 'state');
  const select = root.querySelector('#canvas-field-value');
  assert.equal(select.tagName, 'SELECT');
  assert.deepEqual([...select.options].map(x => x.value), ['available', 'limited', 'maintenance', 'offline']);
  assert.equal(select.value, 'available');
  const stale = fields(root);
  for (const value of ['', '</option><script>bad()</script>']) {
    const before = snapshot(f.session);
    root = dom((await post(f, { ...fields(await page(f, 'state')), value }).expect(400)).text);
    assert.equal(root.querySelector('#canvas-field-value').value, value);
    assert.equal(root.querySelector('#canvas-field-value').getAttribute('aria-invalid'), 'true');
    assert.equal(root.querySelectorAll('script').length, 0);
    assert.equal(root.querySelector('#canvas-edit-status').getAttribute('role'), 'alert');
    assert.match(root.querySelector('#canvas-edit-status').textContent, /Choose one of the listed equipment statuses/);
    assert.deepEqual(snapshot(f.session), before);
  }
  root = dom((await post(f, { ...fields(await page(f, 'state')), value: 'maintenance' }).expect(200)).text);
  assert.equal(root.querySelector('#canvas-field-value').value, 'maintenance');
  const before = snapshot(f.session);
  root = dom((await post(f, { ...stale, value: 'offline' }).expect(409)).text);
  assert.equal(root.querySelector('#canvas-field-value').value, 'maintenance');
  assert.deepEqual(snapshot(f.session), before);
  const rendered = dom((await request(f.app).get(f.previewPath).expect(200)).text);
  assert.equal(rendered.querySelector('[data-equipment-id="wood-shop"] [data-equipment-state]').dataset.equipmentState, 'maintenance');
  assert.deepEqual(f.rpcPool.calls, []);
});

test('Equipment check-time HTTP input explains offsets, rejects local times and renders accepted timestamps', async t => {
  const f = fixture(t);
  const initial = await page(f, 'lastUpdated');
  assert.equal(initial.querySelector('#canvas-field-value').type, 'text');
  assert.match(initial.querySelector('#canvas-field-value').getAttribute('aria-describedby'), /canvas-field-help/);
  assert.match(initial.querySelector('#canvas-field-help').textContent, /timezone.*UTC.*-07:00/);
  const before = snapshot(f.session);
  let root = dom((await post(f, { ...fields(initial), value: '2026-09-06T12:00:00' }).expect(400)).text);
  assert.equal(root.querySelector('#canvas-field-value').value, '2026-09-06T12:00:00');
  assert.match(root.querySelector('#canvas-edit-status').textContent, /real calendar date and time with a timezone/);
  assert.deepEqual(snapshot(f.session), before);
  const value = '2026-09-06T05:15:00-07:00';
  root = dom((await post(f, { ...fields(root), value }).expect(200)).text);
  assert.equal(root.querySelector('#canvas-field-value').value, value);
  assert.equal(root.querySelector('#selection-summary').dataset.selectionFieldId, 'lastUpdated');
  const rendered = dom((await request(f.app).get(f.previewPath).expect(200)).text);
  assert.equal(rendered.querySelector('[data-equipment-id="wood-shop"] time').getAttribute('datetime'), value);
  assert.deepEqual(f.rpcPool.calls, []);
});

'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { URLSearchParams } = require('node:url');
const request = require('supertest');
const { JSDOM } = require('jsdom');
const { extractDeploymentAgnosticVenueSource } = require('../src/venue/source');
const { createSourceAuthoringFixture } = require('./support/source-authoring-fixture');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('./support/hv7-juniper-venue');
const { FOURTH_STREET_AUTHORING_INPUT } = require('./support/hv5-authoring-fixtures');
const { projectStudioSource } = require('../src/venue/read-only-venue-canvas-surface');
const { venueSourceDownloadPath } = require('../src/venue/source-authoring-surface');
const doc = html => new JSDOM(html).window.document;
const snapshot = s => [s.canonicalAccepted(), s.canonicalProposal(), s.status(), s.proposalRevision()];
function fixture(t, input = JUNIPER_WORKS_AUTHORING_INPUT) {
  const f = createSourceAuthoringFixture(extractDeploymentAgnosticVenueSource(input));
  t.after(() => f.previewApplication.locals.services.receiptStore?.close?.());
  return { ...f, canvas: f.editorPath + '/canvas-editor' };
}
async function form(f, selection = 'blockId=home.hero&fieldId=lede') {
  const r = await request(f.app).get(f.canvas + '?' + selection).expect(200);
  return Object.fromEntries([...doc(r.text).querySelectorAll('[data-canvas-edit-form] [name]')].map(x => [x.name, x.value]));
}
function post(f, data, origin = 'http://127.0.0.1') {
  const req = request(f.app).post(f.canvas).set('Host', '127.0.0.1').type('form');
  if (origin !== null) req.set('Origin', origin);
  return req.send(data);
}

test('Separate editor reads both venues; original Canvas remains GET-only and source-neutral', async t => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, JUNIPER_WORKS_AUTHORING_INPUT]) {
    const f = fixture(t, input);
    const before = snapshot(f.session);
    const data = await form(f);
    assert.match(data.token, /^[a-f0-9]{64}$/);
    assert.match(data.revision, /^[a-f0-9]{64}$/);
    const old = await request(f.app).get(f.editorPath + '/canvas?blockId=home.hero&fieldId=lede').expect(200);
    assert.equal(doc(old.text).querySelectorAll('form,input,textarea,button').length, 0);
    await request(f.app).post(f.editorPath + '/canvas').send(data).expect(404);
    assert.deepEqual(snapshot(f.session), before);
  }
});

test('Every existing home field derives its control and eligibility from the authoritative descriptors', async t => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, JUNIPER_WORKS_AUTHORING_INPUT]) {
    const f = fixture(t, input);
    const before = snapshot(f.session);
    const descriptors = f.session.listEditableFields();
    const projection = projectStudioSource(f.session.proposalDraft);
    for (const selection of projection.navigation.targets.filter(x => x.fieldId)) {
      const p = projectStudioSource(f.session.proposalDraft, selection);
      const field = p.inspector.fields.find(x => x.fieldId === selection.fieldId);
      const descriptor = descriptors.find(x => x.pointer === field.sourcePointer);
      const eligible = Boolean(descriptor && ['text', 'multiline-text'].includes(descriptor.controlKind)
        && (typeof descriptor.value === 'string' || (descriptor.value === null && !descriptor.required)));
      const result = doc((await request(f.app).get(f.canvas + '?' + new URLSearchParams({ blockId: selection.blockId, fieldId: selection.fieldId })).expect(200)).text);
      assert.equal(Boolean(result.querySelector('[data-canvas-edit-form]')), eligible, JSON.stringify({ selection, field, descriptor }));
      if (eligible) {
        assert.equal(result.querySelector('[name=value]').value, descriptor.value ?? '');
        assert.equal(result.querySelector('[name=value]').tagName, descriptor.controlKind === 'multiline-text' ? 'TEXTAREA' : 'INPUT');
      }
    }
    assert.deepEqual(snapshot(f.session), before);
  }
});

test('Preview is explicit, accepted bytes stay unchanged, real renderer and existing keep/save/undo share the proposal', async t => {
  const f = fixture(t);
  const accepted = f.session.canonicalAccepted();
  const data = await form(f);
  const changed = 'Learn together in our open workshop.';
  const response = await post(f, { ...data, value: changed }).expect(200);
  const html = doc(response.text);
  assert.equal(html.querySelector('[data-edit-outcome]').dataset.editOutcome, 'success');
  assert.equal(html.querySelector('[name=value]').value, changed);
  assert.equal(html.querySelector('#selection-summary').getAttribute('autofocus'), '');
  assert.equal(f.session.canonicalAccepted(), accepted);
  assert.equal(f.session.proposalDraft.venuePackage.home.hero.lede, changed);
  assert.ok((await request(f.app).get(f.previewPath).expect(200)).text.includes(changed));
  const editor = doc((await request(f.app).get(f.editorPath).expect(200)).text);
  assert.equal(editor.querySelector('.source-save').getAttribute('aria-disabled'), 'true');
  // The download endpoint itself must enforce the pending-preview boundary.
  await request(f.app).get(venueSourceDownloadPath(f.editorPath)).expect(409);
  await request(f.app).post(f.editorPath + '/discard').expect(303);
  assert.equal(f.session.canonicalProposal(), accepted);
  await post(f, { ...await form(f), value: changed }).expect(200);
  await request(f.app).post(f.editorPath + '/apply').expect(303);
  assert.equal(f.session.acceptedSource.venuePackage.home.hero.lede, changed);
  const savedEditor = doc((await request(f.app).get(f.editorPath).expect(200)).text);
  const saved = await request(f.app).get(savedEditor.querySelector('.source-save').getAttribute('href')).expect(200);
  assert.equal(JSON.parse(saved.text).venuePackage.home.hero.lede, changed);
  assert.equal(Object.hasOwn(JSON.parse(saved.text), 'deploymentRef'), false);
  assert.deepEqual(f.rpcPool.calls, []);
});

test('Stale tab returns current selected data without rebasing; stale removal safely resets selection', async t => {
  const f = fixture(t);
  const stale = await form(f);
  await request(f.app).post(f.editorPath + '/studio-proposal').type('form').send({ pointer: '/venuePackage/home/hero/lede', value: 'Current form editor text.' }).expect(303);
  let before = snapshot(f.session);
  const conflict = doc((await post(f, { ...stale, value: 'Stale overwrite.' }).expect(409)).text);
  assert.equal(conflict.querySelector('[data-edit-outcome]').dataset.editOutcome, 'conflict');
  assert.equal(conflict.querySelector('[name=value]').value, 'Current form editor text.');
  assert.equal(conflict.querySelector('#canvas-edit-status').getAttribute('role'), 'alert');
  assert.deepEqual(snapshot(f.session), before);
  const removed = await form(f, 'blockId=home.equipment-status.item.wood-shop&fieldId=name');
  f.session.removeCollectionItem('/venuePackage/home/equipmentStatus/items', 'wood-shop');
  before = snapshot(f.session);
  const result = doc((await post(f, { ...removed, value: 'Missing item' }).expect(409)).text);
  assert.equal(result.querySelector('[data-edit-outcome]').dataset.editOutcome, 'conflict');
  assert.equal(result.querySelector('[data-canvas-edit-form]'), null);
  assert.deepEqual(snapshot(f.session), before);
});

test('Invalid value preserves draft, labels feedback and escapes attempted source text', async t => {
  const f = fixture(t);
  const data = await form(f);
  const before = snapshot(f.session);
  const result = doc((await post(f, { ...data, value: '' }).expect(400)).text);
  assert.equal(result.querySelector('[name=value]').getAttribute('aria-invalid'), 'true');
  assert.equal(result.querySelector('#canvas-edit-status').getAttribute('role'), 'alert');
  assert.equal(result.querySelector('[data-edit-outcome]').dataset.editOutcome, 'invalid');
  assert.deepEqual(snapshot(f.session), before);
  const text = '</textarea><script>alert(1)</script>';
  const escaped = doc((await post(f, { ...data, value: text }).expect(200)).text);
  assert.equal(escaped.querySelectorAll('script').length, 0);
  assert.equal(escaped.querySelector('[name=value]').value, text);
});

test('HTTP stale item forms reject reorder, keep and undo, and fresh selection resolves current index', async t => {
  for (const action of ['reorder', 'keep', 'undo']) {
    const f = fixture(t);
    const stale = await form(f, 'blockId=home.equipment-status.item.wood-shop&fieldId=name');
    if (action === 'reorder') f.session.moveCollectionItem('/venuePackage/home/equipmentStatus/items', 'wood-shop', 'up');
    else {
      f.session.edit('/venuePackage/home/hero/lede', 'Intervening text.');
      await request(f.app).post(f.editorPath + (action === 'keep' ? '/apply' : '/discard')).expect(303);
    }
    const before = snapshot(f.session);
    await post(f, { ...stale, value: 'Stale name' }).expect(409);
    assert.deepEqual(snapshot(f.session), before);
    const fresh = await form(f, 'blockId=home.equipment-status.item.wood-shop&fieldId=name');
    await post(f, { ...fresh, value: 'Current wood shop' }).expect(200);
    assert.equal(f.session.proposalDraft.venuePackage.home.equipmentStatus.items.find(x => x.id === 'wood-shop').name, 'Current wood shop');
  }
});

test('Strict HTTP boundary rejects foreign tokens/origins, malformed, duplicate, extra, oversized and unsupported requests before mutation', async t => {
  const f = fixture(t);
  const data = await form(f);
  const foreign = await form(fixture(t));
  const before = snapshot(f.session);
  const cases = [
    [{ ...data, token: foreign.token }], [{ ...data, token: 'x' }],
    [data, null], [data, 'null'], [data, 'https://evil.invalid'], [data, 'http://127.0.0.1/'],
    [{ ...data, extra: 'x' }], [{ ...data, value: ['x', 'y'] }], [{ ...data, fieldId: 'image.src' }],
    [{ ...data, blockId: 'venue.settings' }], [{ ...data, revision: '' }],
    [new URLSearchParams(data).toString() + '&value=duplicate'],
  ];
  for (const args of cases) {
    const r = await post(f, ...args);
    assert.ok([400, 409].includes(r.status), r.status + ': ' + r.text);
    assert.deepEqual(snapshot(f.session), before);
  }
  await post(f, { ...data, value: 'x'.repeat(40000) }).expect(413);
  await request(f.app).post(f.canvas).set('Host', '127.0.0.1').set('Origin', 'http://127.0.0.1').send(data).expect(400);
  await request(f.app).get(f.canvas + '?blockId=venue.settings').expect(400);
  assert.deepEqual(snapshot(f.session), before);
  const unsupported = await request(f.app).get(f.canvas + '?blockId=home.hero&fieldId=image.src').expect(200);
  assert.equal(doc(unsupported.text).querySelector('[data-canvas-edit-form]'), null);
});

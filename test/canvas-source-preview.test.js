'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { canvasTextField, previewCanvasSourceField } = require('../src/venue/canvas-source-preview');
const { createSourceAuthoringSession } = require('../src/venue/source-authoring-session');
const { extractDeploymentAgnosticVenueSource } = require('../src/venue/source');
const { createSetFieldCommand } = require('../src/venue/semantic-venue-canvas-contract');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('./support/hv7-juniper-venue');
const source = () => extractDeploymentAgnosticVenueSource(JUNIPER_WORKS_AUTHORING_INPUT);
const command = (value, blockId = 'home.hero', fieldId = 'lede') => createSetFieldCommand({ blockId, fieldId, value });
const snapshot = (s) => [s.canonicalAccepted(), s.canonicalProposal(), s.status(), s.proposalRevision()];

test('Canvas text adapter produces only the selected source change without deployment or input mutation', () => {
  const input = source();
  const before = JSON.stringify(input);
  const next = previewCanvasSourceField(input, command('A new workshop preview.'));
  const expected = structuredClone(input);
  expected.venuePackage.home.hero.lede = 'A new workshop preview.';
  assert.deepEqual(next, expected);
  assert.equal(JSON.stringify(input), before);
  assert.equal(Object.hasOwn(next, 'deploymentRef'), false);
  assert.equal(canvasTextField(input, 'home.hero', 'lede').editable, true);
  const nullable = previewCanvasSourceField(input, command('', 'home.equipment-status.item.wood-shop', 'group'));
  assert.equal(nullable.venuePackage.home.equipmentStatus.items.find(x => x.id === 'wood-shop').group, null);
});

test('Canvas rejects malformed, non-text, protected, unknown and non-home commands atomically', () => {
  const s = createSourceAuthoringSession(source());
  const base = command('Allowed');
  const cases = [null, [], {}, { ...base, extra: true }, { ...base, version: 99 },
    { ...base, type: 'remove-item' }, { ...base, value: 42 }, { ...base, value: {} },
    { ...base, value: null }, { ...base, value: '' },
    command('x', 'venue.settings', 'displayName'), command('x', 'page.home', 'title'),
    command('x', 'home.hero', 'image.src'), command('x', 'home.hero', 'missing'),
    command('x', 'home.equipment-status.item.wood-shop', 'status'),
    command('x', 'home.equipment-status.item.wood-shop', 'id'),
    command('x', 'home.equipment-status.item.removed', 'name')];
  for (const invalid of cases) {
    const before = snapshot(s);
    assert.throws(() => s.previewCanvasField(invalid, s.proposalRevision()), JSON.stringify(invalid));
    assert.deepEqual(snapshot(s), before);
  }
});

test('Revision binding rejects form edits, reorder, removal, keep, discard and ABA changes', () => {
  const transitions = [
    s => s.edit('/venuePackage/home/hero/lede', 'Other editor text.'),
    s => s.moveCollectionItem('/venuePackage/home/equipmentStatus/items', 'wood-shop', 'up'),
    s => s.removeCollectionItem('/venuePackage/home/equipmentStatus/items', 'wood-shop'),
    s => s.apply(), s => s.discard(),
    s => { s.edit('/venuePackage/home/hero/lede', 'Temporary.'); s.discard(); },
  ];
  for (const transition of transitions) {
    const s = createSourceAuthoringSession(source());
    const revision = s.proposalRevision();
    transition(s);
    const before = snapshot(s);
    assert.throws(() => s.previewCanvasField(command('Old form.'), revision), { code: 'STALE_CANVAS_PROPOSAL' });
    assert.deepEqual(snapshot(s), before);
  }
});

test('Fresh stable item selection follows reorder and shares keep and undo semantics', () => {
  const s = createSourceAuthoringSession(source());
  const accepted = s.canonicalAccepted();
  s.moveCollectionItem('/venuePackage/home/equipmentStatus/items', 'wood-shop', 'up');
  s.previewCanvasField(command('Woodworking studio', 'home.equipment-status.item.wood-shop', 'name'), s.proposalRevision());
  assert.equal(s.proposalDraft.venuePackage.home.equipmentStatus.items[0].name, 'Woodworking studio');
  assert.equal(s.canonicalAccepted(), accepted);
  s.discard();
  assert.equal(s.canonicalProposal(), accepted);
  s.previewCanvasField(command('Kept workshop text.'), s.proposalRevision());
  s.apply();
  assert.equal(s.acceptedSource.venuePackage.home.hero.lede, 'Kept workshop text.');
  assert.equal(s.status().dirty, false);
});

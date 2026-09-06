'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { canvasMoveItem, canvasTextField, previewCanvasSourceField, previewCanvasSourceFieldWithInverse } = require('../src/venue/canvas-source-preview');
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

test('Canvas adapter exposes exact semantic inverses and session history round-trips multiple previews', () => {
  const input = source();
  const first = previewCanvasSourceFieldWithInverse(input, command('First preview.'));
  assert.equal(first.forwardCommand.value, 'First preview.');
  assert.equal(first.inverseCommand.value, input.venuePackage.home.hero.lede);
  assert.deepEqual(
    previewCanvasSourceFieldWithInverse(first.source, first.inverseCommand).source,
    input,
  );

  const s = createSourceAuthoringSession(input);
  const accepted = s.canonicalAccepted();
  s.previewCanvasField(command('First preview.'), s.proposalRevision());
  s.previewCanvasField(command('Second preview.'), s.proposalRevision());
  assert.deepEqual(s.canvasHistoryStatus(), {
    limit: 50, undoCount: 2, redoCount: 0, canUndo: true, canRedo: false,
    undo: { type: 'set-field', blockId: 'home.hero', fieldId: 'lede', generation: 2 }, redo: null,
  });
  const afterSecond = s.canonicalProposal();
  s.undoCanvasPreview(s.proposalRevision());
  assert.equal(s.proposalDraft.venuePackage.home.hero.lede, 'First preview.');
  assert.equal(s.canvasHistoryStatus().redoCount, 1);
  s.undoCanvasPreview(s.proposalRevision());
  assert.equal(s.canonicalProposal(), accepted);
  s.redoCanvasPreview(s.proposalRevision());
  s.redoCanvasPreview(s.proposalRevision());
  assert.equal(s.canonicalProposal(), afterSecond);
  assert.equal(s.canonicalAccepted(), accepted);
});

test('Canvas history is bounded, clears on unrelated authority transitions, and stale history forms fail atomically', () => {
  const s = createSourceAuthoringSession(source());
  for (let i = 0; i < 55; i += 1) {
    s.previewCanvasField(command(`Preview ${i}.`), s.proposalRevision());
  }
  assert.equal(s.canvasHistoryStatus().undoCount, 50);
  s.undoCanvasPreview(s.proposalRevision());
  const stale = s.proposalRevision();
  s.edit('/venuePackage/home/hero/lede', 'Other editor text.');
  assert.deepEqual(s.canvasHistoryStatus(), {
    limit: 50, undoCount: 0, redoCount: 0, canUndo: false, canRedo: false, undo: null, redo: null,
  });
  const before = snapshot(s);
  assert.throws(() => s.redoCanvasPreview(stale), { code: 'STALE_CANVAS_PROPOSAL' });
  assert.deepEqual(snapshot(s), before);

  const transitions = [
    x => x.moveCollectionItem('/venuePackage/home/equipmentStatus/items', 'wood-shop', 'up'),
    x => x.removeCollectionItem('/venuePackage/home/equipmentStatus/items', 'wood-shop'),
    x => x.apply(),
    x => x.discard(),
  ];
  for (const transition of transitions) {
    const x = createSourceAuthoringSession(source());
    x.previewCanvasField(command('History entry.'), x.proposalRevision());
    transition(x);
    assert.equal(x.canvasHistoryStatus().undoCount, 0);
    assert.equal(x.canvasHistoryStatus().redoCount, 0);
  }
});

test('Canvas stable-item moves are one-step, exact-inverse, bounded to equipment status, and mix with text history', () => {
  const input = source();
  const middle = canvasMoveItem(input, 'home.equipment-status.item.wood-shop');
  assert.deepEqual(
    { editable: middle.editable, itemId: middle.itemId, index: middle.index, count: middle.count, canMoveUp: middle.canMoveUp, canMoveDown: middle.canMoveDown },
    { editable: true, itemId: 'wood-shop', index: 1, count: 3, canMoveUp: true, canMoveDown: true },
  );
  assert.equal(canvasMoveItem(input, 'home.programs.item.open-build-night')?.editable ?? false, false);

  const s = createSourceAuthoringSession(input);
  const accepted = s.canonicalAccepted();
  s.previewCanvasMove('home.equipment-status.item.wood-shop', 'up', s.proposalRevision());
  assert.deepEqual(s.proposalDraft.venuePackage.home.equipmentStatus.items.map(x => x.id),
    ['wood-shop', 'laser-cutter', 'electronics-bench']);
  assert.deepEqual(s.canvasHistoryStatus().undo, {
    type: 'move-item', blockId: 'home.equipment-status.item.wood-shop', fieldId: null, generation: 1,
  });
  const moved = s.canonicalProposal();
  s.previewCanvasField(command('Woodworking studio', 'home.equipment-status.item.wood-shop', 'name'), s.proposalRevision());
  const mixed = s.canonicalProposal();
  s.undoCanvasPreview(s.proposalRevision());
  assert.equal(s.canonicalProposal(), moved);
  s.undoCanvasPreview(s.proposalRevision());
  assert.equal(s.canonicalProposal(), accepted);
  s.redoCanvasPreview(s.proposalRevision());
  s.redoCanvasPreview(s.proposalRevision());
  assert.equal(s.canonicalProposal(), mixed);
  assert.equal(s.canonicalAccepted(), accepted);
});

test('Canvas reorder boundaries, unsupported collections and stale revisions fail atomically', () => {
  const s = createSourceAuthoringSession(source());
  const cases = [
    ['home.equipment-status.item.laser-cutter', 'up'],
    ['home.equipment-status.item.electronics-bench', 'down'],
    ['home.programs.item.open-build-night', 'up'],
  ];
  for (const [blockId, direction] of cases) {
    const before = snapshot(s);
    assert.throws(() => s.previewCanvasMove(blockId, direction, s.proposalRevision()));
    assert.deepEqual(snapshot(s), before);
  }
  const stale = s.proposalRevision();
  s.edit('/venuePackage/home/hero/lede', 'Intervening edit.');
  const before = snapshot(s);
  assert.throws(
    () => s.previewCanvasMove('home.equipment-status.item.wood-shop', 'up', stale),
    { code: 'STALE_CANVAS_PROPOSAL' },
  );
  assert.deepEqual(snapshot(s), before);
});

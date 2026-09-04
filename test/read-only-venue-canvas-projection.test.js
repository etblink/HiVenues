'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { serializeVenueAuthoringReview } = require('../src/venue/authoring');
const {
  READ_ONLY_VENUE_CANVAS_PROJECTION_KIND,
  READ_ONLY_VENUE_CANVAS_PROJECTION_SCHEMA_VERSION,
  SCOPE_ROOT_BLOCK_ID,
  VENUE_CANVAS_SELECTION_KIND,
  VENUE_CANVAS_SELECTION_SCHEMA_VERSION,
  createReadOnlyVenueCanvasProjection,
  createVenueCanvasSelection,
  parseVenueCanvasSelection,
  serializeReadOnlyVenueCanvasProjection,
  serializeVenueCanvasSelection,
} = require('../src/venue/read-only-venue-canvas-projection');
const {
  applyVenueCanvasCommand,
  createMoveItemCommand,
} = require('../src/venue/semantic-venue-canvas-contract');
const {
  FOURTH_STREET_AUTHORING_INPUT,
  LANTERN_ROOM_AUTHORING_INPUT,
} = require('./support/hv5-authoring-fixtures');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('./support/hv7-juniper-venue');

function assertDeeplyFrozen(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeeplyFrozen(child, seen);
}

function canonical(input) {
  return serializeVenueAuthoringReview(input);
}

function selection(blockId, fieldId = null) {
  return createVenueCanvasSelection({ blockId, fieldId });
}

function assertSharedSelectionIdentity(projection) {
  assert.strictEqual(projection.canvas.selection, projection.selection);
  assert.strictEqual(projection.tree.selection, projection.selection);
  assert.strictEqual(projection.inspector.selection, projection.selection);
  assert.strictEqual(projection.focusTarget.selection, projection.selection);
  assert.strictEqual(projection.diagnostics.selection, projection.selection);
  assert.strictEqual(
    projection.navigation.targets[projection.navigation.currentIndex],
    projection.selection,
  );
}

test('read-only projections are deterministic, deeply immutable, and source-byte neutral', () => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT]) {
    const sourceBefore = canonical(input);
    const left = createReadOnlyVenueCanvasProjection(input);
    const right = createReadOnlyVenueCanvasProjection(input);

    assert.deepEqual(left, right);
    assert.equal(
      serializeReadOnlyVenueCanvasProjection(input),
      serializeReadOnlyVenueCanvasProjection(input),
    );
    assert.equal(canonical(input), sourceBefore);
    assertDeeplyFrozen(left);
    assert.equal(left.kind, READ_ONLY_VENUE_CANVAS_PROJECTION_KIND);
    assert.equal(left.schemaVersion, READ_ONLY_VENUE_CANVAS_PROJECTION_SCHEMA_VERSION);
    assert.deepEqual(left.selection, {
      kind: VENUE_CANVAS_SELECTION_KIND,
      schemaVersion: VENUE_CANVAS_SELECTION_SCHEMA_VERSION,
      blockId: SCOPE_ROOT_BLOCK_ID,
      fieldId: null,
    });
    assert.deepEqual(left.authority, {
      canonicalDocument: 'venue-authoring-document-v1',
      semanticContract: 'hivenues-semantic-venue-canvas-contract',
      scopeRootBlockId: SCOPE_ROOT_BLOCK_ID,
      allowedInteractions: ['select', 'navigate'],
      derived: true,
      persistent: false,
      mutable: false,
      runtimeWired: false,
    });
    assert.equal(left.canvas.cards[0].blockId, SCOPE_ROOT_BLOCK_ID);
    assert.equal(left.tree.rows[0].blockId, SCOPE_ROOT_BLOCK_ID);
    assert.deepEqual(
      left.canvas.cards.map((card) => card.blockId),
      left.tree.rows.map((row) => row.blockId),
    );
    assertSharedSelectionIdentity(left);
  }
});

test('selection envelopes are strict, versioned, immutable, and canonically serializable', () => {
  const built = selection('home.equipment-status.item.wood-shop', 'name');
  const parsed = parseVenueCanvasSelection(JSON.parse(JSON.stringify(built)));

  assert.deepEqual(parsed, built);
  assert.notStrictEqual(parsed, built);
  assertDeeplyFrozen(built);
  assert.equal(serializeVenueCanvasSelection(built), [
    '{',
    '  "blockId": "home.equipment-status.item.wood-shop",',
    '  "fieldId": "name",',
    '  "kind": "hivenues-semantic-venue-canvas-selection",',
    '  "schemaVersion": 1',
    '}',
    '',
  ].join('\n'));

  assert.throws(() => createVenueCanvasSelection(null), /plain object/i);
  assert.throws(() => createVenueCanvasSelection({}), /blockId/i);
  assert.throws(
    () => createVenueCanvasSelection({ blockId: 'home.hero', fieldId: undefined }),
    /fieldId/i,
  );
  assert.throws(
    () => createVenueCanvasSelection({ blockId: 'home.hero', extra: true }),
    /keys must be exactly/i,
  );
  const symbolSelection = { blockId: 'home.hero' };
  symbolSelection[Symbol('extra')] = true;
  assert.throws(
    () => createVenueCanvasSelection(symbolSelection),
    /keys must be strings/i,
  );
  const accessorSelection = {};
  Object.defineProperties(accessorSelection, {
    blockId: { enumerable: true, get: () => 'home.hero' },
  });
  assert.throws(
    () => createVenueCanvasSelection(accessorSelection),
    /enumerable JSON data properties/i,
  );
  assert.throws(
    () => parseVenueCanvasSelection({ ...built, schemaVersion: 2 }),
    /schema version/i,
  );
  assert.throws(
    () => parseVenueCanvasSelection({ ...built, kind: 'other-selection' }),
    /kind is unsupported/i,
  );
  assert.throws(
    () => parseVenueCanvasSelection({ ...built, extra: true }),
    /keys must be exactly/i,
  );
});

test('one field selection synchronizes canvas, tree, inspector, focus, and diagnostics', () => {
  const projection = createReadOnlyVenueCanvasProjection(
    JUNIPER_WORKS_AUTHORING_INPUT,
    selection('home.equipment-status.item.wood-shop', 'name'),
  );
  const selectedCards = projection.canvas.cards.filter((card) => card.selected);
  const selectedRows = projection.tree.rows.filter((row) => row.selected);
  const selectedFields = projection.inspector.fields.filter((field) => field.selected);

  assertSharedSelectionIdentity(projection);
  assert.equal(selectedCards.length, 1);
  assert.equal(selectedRows.length, 1);
  assert.equal(selectedFields.length, 1);
  assert.equal(selectedCards[0].blockId, projection.selection.blockId);
  assert.equal(selectedCards[0].selectedFieldId, 'name');
  assert.equal(selectedRows[0].blockId, projection.selection.blockId);
  assert.deepEqual(selectedRows[0].stableIdentity, selectedCards[0].stableIdentity);
  assert.equal(selectedRows[0].sourcePointer, selectedCards[0].sourcePointer);
  assert.equal(projection.inspector.block.blockId, projection.selection.blockId);
  assert.equal(selectedFields[0].fieldId, projection.selection.fieldId);
  assert.equal(selectedFields[0].readOnly, true);
  assert.equal(projection.focusTarget.surface, 'inspector-field');
  assert.deepEqual(projection.diagnostics.stableIdentity, {
    source: 'operator-collection-id',
    value: 'wood-shop',
  });
  assert.equal(
    projection.diagnostics.blockSourcePointer,
    '/venuePackage/home/equipmentStatus/items/1',
  );
  assert.equal(
    projection.diagnostics.fieldSourcePointer,
    '/venuePackage/home/equipmentStatus/items/1/name',
  );
});

test('semantic navigation is complete, deterministic, non-wrapping, and reusable', () => {
  const initial = createReadOnlyVenueCanvasProjection(JUNIPER_WORKS_AUTHORING_INPUT);
  const { targets } = initial.navigation;
  const targetKeys = targets.map((target) => target.blockId + '#' + (target.fieldId || ''));

  assert.equal(new Set(targetKeys).size, targets.length);
  assert.equal(initial.navigation.currentIndex, 0);
  assert.equal(initial.navigation.position, 1);
  assert.equal(initial.navigation.previous, null);
  assert.equal(initial.navigation.parentBlock, null);
  assert.deepEqual(initial.navigation.firstChild, selection('home.hero'));
  assert.deepEqual(initial.navigation.next, selection('home.hero'));

  for (const [index, target] of targets.entries()) {
    const projected = createReadOnlyVenueCanvasProjection(
      JUNIPER_WORKS_AUTHORING_INPUT,
      target,
    );
    assert.deepEqual(projected.selection, target);
    assert.equal(projected.navigation.currentIndex, index);
    assert.equal(projected.navigation.position, index + 1);
    assert.equal(projected.navigation.targetCount, targets.length);
    assert.deepEqual(projected.navigation.previous, targets[index - 1] || null);
    assert.deepEqual(projected.navigation.next, targets[index + 1] || null);
    assertSharedSelectionIdentity(projected);
  }

  const hero = createReadOnlyVenueCanvasProjection(
    JUNIPER_WORKS_AUTHORING_INPUT,
    selection('home.hero'),
  );
  assert.deepEqual(hero.navigation.parentBlock, selection('page.home'));
  assert.equal(hero.navigation.containingBlock, null);
  assert.equal(hero.navigation.firstChild, null);
  assert.equal(hero.navigation.firstField.blockId, 'home.hero');
  assert.notEqual(hero.navigation.firstField.fieldId, null);

  const heroField = createReadOnlyVenueCanvasProjection(
    JUNIPER_WORKS_AUTHORING_INPUT,
    hero.navigation.firstField,
  );
  assert.deepEqual(heroField.navigation.containingBlock, selection('home.hero'));
  assert.deepEqual(heroField.navigation.previous, selection('home.hero'));
});

test('invalid, stale, mismatched, and out-of-scope selections fail closed', () => {
  const sourceBefore = canonical(JUNIPER_WORKS_AUTHORING_INPUT);

  assert.throws(
    () => createReadOnlyVenueCanvasProjection(
      JUNIPER_WORKS_AUTHORING_INPUT,
      selection('venue.settings'),
    ),
    /outside the page\.home scope/i,
  );
  assert.throws(
    () => createReadOnlyVenueCanvasProjection(
      JUNIPER_WORKS_AUTHORING_INPUT,
      selection('home.unknown'),
    ),
    /outside the page\.home scope/i,
  );
  assert.throws(
    () => createReadOnlyVenueCanvasProjection(
      JUNIPER_WORKS_AUTHORING_INPUT,
      selection('home.hero', 'not-a-field'),
    ),
    /unknown fieldId not-a-field for blockId home\.hero/i,
  );
  assert.throws(
    () => createReadOnlyVenueCanvasProjection(
      JUNIPER_WORKS_AUTHORING_INPUT,
      selection('home.equipment-status.item.removed-item'),
    ),
    /outside the page\.home scope/i,
  );
  assert.equal(canonical(JUNIPER_WORKS_AUTHORING_INPUT), sourceBefore);
});

test('stable semantic selection survives operator-defined collection reordering', () => {
  const selected = selection('home.equipment-status.item.wood-shop', 'name');
  const before = createReadOnlyVenueCanvasProjection(
    JUNIPER_WORKS_AUTHORING_INPUT,
    selected,
  );
  const reordered = applyVenueCanvasCommand(
    JUNIPER_WORKS_AUTHORING_INPUT,
    createMoveItemCommand({
      blockId: 'home.equipment-status.item.wood-shop',
      beforeBlockId: 'home.equipment-status.item.laser-cutter',
    }),
  );
  const after = createReadOnlyVenueCanvasProjection(reordered.document, selected);

  assert.deepEqual(after.selection, before.selection);
  assert.equal(before.diagnostics.blockSourcePointer.endsWith('/items/1'), true);
  assert.equal(after.diagnostics.blockSourcePointer.endsWith('/items/0'), true);
  assert.equal(before.diagnostics.fieldSourcePointer.endsWith('/items/1/name'), true);
  assert.equal(after.diagnostics.fieldSourcePointer.endsWith('/items/0/name'), true);
  assert.notEqual(after.diagnostics.navigationIndex, before.diagnostics.navigationIndex);
  assert.equal(after.canvas.cards.find((card) => card.selected).blockId, selected.blockId);
  assert.equal(after.tree.rows.find((row) => row.selected).blockId, selected.blockId);
  assert.equal(after.inspector.fields.find((field) => field.selected).fieldId, 'name');
  assertSharedSelectionIdentity(after);
});

test('the read-only projection leaks no semantic mutation capability', () => {
  const projection = createReadOnlyVenueCanvasProjection(JUNIPER_WORKS_AUTHORING_INPUT);
  const serialized = JSON.stringify(projection);

  assert.deepEqual(projection.authority.allowedInteractions, ['select', 'navigate']);
  assert.equal(projection.authority.mutable, false);
  for (const forbidden of ['set-field', 'insert-item', 'remove-item', 'move-item']) {
    assert.equal(serialized.includes('"' + forbidden + '"'), false);
  }
  for (const card of projection.canvas.cards) {
    assert.equal(Object.prototype.hasOwnProperty.call(card, 'capabilities'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(card, 'childPolicy'), false);
  }
  for (const row of projection.tree.rows) {
    assert.equal(Object.prototype.hasOwnProperty.call(row, 'capabilities'), false);
  }
});

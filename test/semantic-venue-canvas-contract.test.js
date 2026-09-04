'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createVenueAuthoringDocument,
  serializeVenueAuthoringReview,
} = require('../src/venue/authoring');
const {
  CAPABILITY,
  COMMAND_TYPE,
  ORDER_POLICY,
  VENUE_CANVAS_COMMAND_KIND,
  VENUE_CANVAS_COMMAND_SCHEMA_VERSION,
  VENUE_CANVAS_CONTRACT_KIND,
  VENUE_CANVAS_CONTRACT_SCHEMA_VERSION,
  applyVenueCanvasCommand,
  createInsertItemCommand,
  createMoveItemCommand,
  createRemoveItemCommand,
  createSemanticVenueCanvasContract,
  createSetFieldCommand,
  findVenueCanvasBlock,
  listVenueCanvasBlocks,
  parseVenueCanvasCommand,
  serializeSemanticVenueCanvasContract,
} = require('../src/venue/semantic-venue-canvas-contract');
const {
  FOURTH_STREET_AUTHORING_INPUT,
  LANTERN_ROOM_AUTHORING_INPUT,
} = require('./support/hv5-authoring-fixtures');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('./support/hv7-juniper-venue');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeeplyFrozen(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeeplyFrozen(child, seen);
}

function canonical(input) {
  return serializeVenueAuthoringReview(input);
}

function applyAndReverse(baseInput, command) {
  const original = canonical(baseInput);
  const forward = applyVenueCanvasCommand(baseInput, command);
  const reversed = applyVenueCanvasCommand(forward.document, forward.inverseCommand);
  assert.equal(reversed.canonicalDocument, original);
  return { forward, reversed };
}

function program(overrides = {}) {
  return {
    id: 'safety-clinic',
    title: 'Shared-shop safety clinic',
    startAt: '2026-09-11T18:00:00-07:00',
    endAt: '2026-09-11T19:00:00-07:00',
    description: 'A fixture clinic for validating typed semantic program commands.',
    accessNote: 'Fixture only; attendance grants no equipment authority.',
    state: 'scheduled',
    link: null,
    ...overrides,
  };
}

function equipment(overrides = {}) {
  return {
    id: 'print-bench',
    name: 'Print bench',
    state: 'available',
    note: 'Available for synthetic contract testing.',
    accessNote: 'Fixture only; follow the fictional steward guidance.',
    lastUpdated: '2026-09-09T17:00:00-07:00',
    group: 'Printmaking',
    ...overrides,
  };
}

test('semantic canvas contracts are deterministic, deeply immutable, and source-byte neutral', () => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT]) {
    const sourceBefore = canonical(input);
    const left = createSemanticVenueCanvasContract(input);
    const right = createSemanticVenueCanvasContract(input);

    assert.deepEqual(left, right);
    assert.equal(serializeSemanticVenueCanvasContract(input), serializeSemanticVenueCanvasContract(input));
    assert.equal(canonical(input), sourceBefore);
    assertDeeplyFrozen(left);
    assert.equal(left.kind, VENUE_CANVAS_CONTRACT_KIND);
    assert.equal(left.schemaVersion, VENUE_CANVAS_CONTRACT_SCHEMA_VERSION);
    assert.equal(left.source.schemaVersion, 1);
    assert.equal(left.authority.canonicalDocument, 'venue-authoring-document-v1');
    assert.equal(left.authority.derived, true);
    assert.equal(left.authority.persistent, false);
    assert.equal(left.authority.runtimeWired, false);
    assert.deepEqual(left.root.children.map((block) => block.id), ['venue.settings', 'page.home']);
  }
});

test('the tree exposes explicit fixed, canonical, and operator-defined placement policy', () => {
  const contract = createSemanticVenueCanvasContract(JUNIPER_WORKS_AUTHORING_INPUT);
  const home = findVenueCanvasBlock(contract, 'page.home');
  assert.deepEqual(home.children.map((block) => block.id), [
    'home.hero',
    'home.updates',
    'home.programs',
    'home.equipment-status',
    'home.pathways',
    'home.visit',
    'home.community',
    'home.gallery',
  ]);
  assert.equal(home.childPolicy.orderPolicy, ORDER_POLICY.FIXED);
  assert.deepEqual(home.childPolicy.fixedSlots.map((slot) => slot.blockId), [
    'home.hero',
    'home.updates',
    'home.programs',
    'home.equipment-status',
    'home.pathways',
    'home.visit',
    'home.community',
    'home.gallery',
  ]);

  const programs = findVenueCanvasBlock(contract, 'home.programs');
  assert.equal(programs.childPolicy.orderPolicy, ORDER_POLICY.CANONICAL);
  assert.deepEqual(programs.childPolicy.cardinality, { minimum: 0, maximum: 12 });
  assert.equal(programs.capabilities.includes(CAPABILITY.INSERT_ITEM), true);
  assert.equal(programs.capabilities.includes(CAPABILITY.MOVE_ITEM), false);
  assert.deepEqual(programs.children.map((block) => block.stableIdentity.value), [
    'orientation-101',
    'open-build-night',
  ]);
  assert.equal(programs.children.every((block) => !block.capabilities.includes(CAPABILITY.MOVE_ITEM)), true);

  const equipmentStatus = findVenueCanvasBlock(contract, 'home.equipment-status');
  assert.equal(equipmentStatus.childPolicy.orderPolicy, ORDER_POLICY.OPERATOR_DEFINED);
  assert.deepEqual(equipmentStatus.childPolicy.cardinality, { minimum: 0, maximum: 20 });
  assert.equal(
    equipmentStatus.children.every((block) => block.capabilities.includes(CAPABILITY.MOVE_ITEM)),
    true,
  );

  const gallery = findVenueCanvasBlock(contract, 'home.gallery');
  assert.equal(gallery.kind, 'venue-gallery-fixed-topology');
  assert.deepEqual(gallery.children, []);
  assert.equal(gallery.fields.some((field) => field.id === 'items.0.caption'), true);
  assert.equal(gallery.capabilities.includes(CAPABILITY.INSERT_ITEM), false);
  assert.equal(gallery.capabilities.includes(CAPABILITY.REMOVE_ITEM), false);
  assert.equal(gallery.capabilities.includes(CAPABILITY.MOVE_ITEM), false);
});

test('stable item and field identity follows the item id across operator reordering', () => {
  const contract = createSemanticVenueCanvasContract(JUNIPER_WORKS_AUTHORING_INPUT);
  const before = findVenueCanvasBlock(contract, 'home.equipment-status.item.wood-shop');
  assert.equal(before.sourcePointer, '/venuePackage/home/equipmentStatus/items/1');
  assert.deepEqual(before.fields.map((field) => field.id), [
    'accessNote',
    'group',
    'lastUpdated',
    'name',
    'note',
    'state',
  ]);

  const { forward } = applyAndReverse(
    JUNIPER_WORKS_AUTHORING_INPUT,
    createMoveItemCommand({
      blockId: 'home.equipment-status.item.wood-shop',
      beforeBlockId: 'home.equipment-status.item.laser-cutter',
    }),
  );
  const after = findVenueCanvasBlock(
    forward.contract,
    'home.equipment-status.item.wood-shop',
  );
  assert.equal(after.sourcePointer, '/venuePackage/home/equipmentStatus/items/0');
  assert.deepEqual(after.fields.map((field) => field.id), before.fields.map((field) => field.id));
  assert.deepEqual(
    findVenueCanvasBlock(forward.contract, 'home.equipment-status').children
      .map((block) => block.stableIdentity.value),
    ['wood-shop', 'laser-cutter', 'electronics-bench'],
  );

  const edited = applyAndReverse(
    forward.document,
    createSetFieldCommand({
      blockId: 'home.equipment-status.item.wood-shop',
      fieldId: 'name',
      value: 'Wood shop after reorder',
    }),
  ).forward;
  assert.deepEqual(edited.document.venuePackage.home.equipmentStatus.items[0], {
    ...forward.document.venuePackage.home.equipmentStatus.items[0],
    name: 'Wood shop after reorder',
  });
});

test('set-field commands and returned inverses restore exact v1 source bytes', () => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT]) {
    const original = canonical(input);
    const { forward } = applyAndReverse(
      input,
      createSetFieldCommand({
        blockId: 'home.hero',
        fieldId: 'lede',
        value: input === FOURTH_STREET_AUTHORING_INPUT
          ? 'A direct semantic canvas edit for the reference venue.'
          : 'A direct semantic canvas edit for the independent fixture.',
      }),
    );
    assert.notEqual(forward.canonicalDocument, original);
    assert.equal(forward.document.schemaVersion, 1);
    assert.equal(Object.prototype.hasOwnProperty.call(forward.document, 'canvasContract'), false);
    assert.equal(forward.inverseCommand.type, COMMAND_TYPE.SET_FIELD);
    assertDeeplyFrozen(forward);
  }
});

test('canonical program insertion and its inverse preserve time/id ordering and exact bytes', () => {
  const command = createInsertItemCommand({
    blockId: 'home.programs',
    item: program(),
  });
  const { forward } = applyAndReverse(JUNIPER_WORKS_AUTHORING_INPUT, command);

  assert.deepEqual(
    forward.document.venuePackage.home.programs.items.map((item) => item.id),
    ['orientation-101', 'safety-clinic', 'open-build-night'],
  );
  assert.equal(forward.inverseCommand.type, COMMAND_TYPE.REMOVE_ITEM);
  assert.equal(forward.inverseCommand.blockId, 'home.programs.item.safety-clinic');

  assert.throws(
    () => applyVenueCanvasCommand(
      JUNIPER_WORKS_AUTHORING_INPUT,
      createInsertItemCommand({
        blockId: 'home.programs',
        item: program({ id: 'manual-position-program' }),
        beforeBlockId: 'home.programs.item.open-build-night',
      }),
    ),
    /canonical ordering/i,
  );
});

test('operator-defined equipment insertion uses stable sibling placement and reverses exactly', () => {
  const { forward } = applyAndReverse(
    JUNIPER_WORKS_AUTHORING_INPUT,
    createInsertItemCommand({
      blockId: 'home.equipment-status',
      item: equipment(),
      beforeBlockId: 'home.equipment-status.item.wood-shop',
    }),
  );
  assert.deepEqual(
    forward.document.venuePackage.home.equipmentStatus.items.map((item) => item.id),
    ['laser-cutter', 'print-bench', 'wood-shop', 'electronics-bench'],
  );
  assert.equal(forward.inverseCommand.blockId, 'home.equipment-status.item.print-bench');
});

test('remove-item inverses restore canonical and operator-defined collection positions', () => {
  const removedProgram = applyAndReverse(
    JUNIPER_WORKS_AUTHORING_INPUT,
    createRemoveItemCommand({ blockId: 'home.programs.item.orientation-101' }),
  ).forward;
  assert.deepEqual(
    removedProgram.document.venuePackage.home.programs.items.map((item) => item.id),
    ['open-build-night'],
  );
  assert.equal(removedProgram.inverseCommand.beforeBlockId, null);

  const removedEquipment = applyAndReverse(
    JUNIPER_WORKS_AUTHORING_INPUT,
    createRemoveItemCommand({ blockId: 'home.equipment-status.item.wood-shop' }),
  ).forward;
  assert.deepEqual(
    removedEquipment.document.venuePackage.home.equipmentStatus.items.map((item) => item.id),
    ['laser-cutter', 'electronics-bench'],
  );
  assert.equal(
    removedEquipment.inverseCommand.beforeBlockId,
    'home.equipment-status.item.electronics-bench',
  );
});

test('manual movement is denied for canonical programs and fixed sections without source mutation', () => {
  const before = canonical(JUNIPER_WORKS_AUTHORING_INPUT);
  const denied = [
    createMoveItemCommand({
      blockId: 'home.programs.item.orientation-101',
      beforeBlockId: 'home.programs.item.open-build-night',
    }),
    createMoveItemCommand({
      blockId: 'home.hero',
      beforeBlockId: 'home.updates',
    }),
  ];

  for (const command of denied) {
    assert.throws(
      () => applyVenueCanvasCommand(JUNIPER_WORKS_AUTHORING_INPUT, command),
      /move-item is denied/i,
    );
    assert.equal(canonical(JUNIPER_WORKS_AUTHORING_INPUT), before);
  }
});

test('malformed, unknown, protected, and invalid set-field commands fail closed', () => {
  const before = canonical(JUNIPER_WORKS_AUTHORING_INPUT);
  const valid = createSetFieldCommand({
    blockId: 'home.hero',
    fieldId: 'lede',
    value: 'A valid fixture-only edit.',
  });
  const denied = [
    { ...valid, extraAuthority: true },
    { ...valid, kind: 'generic-page-builder-command' },
    { ...valid, schemaVersion: 2 },
    { ...valid, type: 'replace-document' },
    { ...valid, blockId: 'venue' },
    { ...valid, blockId: 'unknown.block' },
    { ...valid, fieldId: 'unknownField' },
    createSetFieldCommand({
      blockId: 'settings.identity',
      fieldId: 'hive.communityId',
      value: 'unauthorized-hive-write',
    }),
    createSetFieldCommand({
      blockId: 'home.hero',
      fieldId: 'image.src',
      value: 'https://evil.example/unauthorized-image.jpg',
    }),
  ];

  for (const command of denied) {
    assert.throws(() => applyVenueCanvasCommand(JUNIPER_WORKS_AUTHORING_INPUT, command));
    assert.equal(canonical(JUNIPER_WORKS_AUTHORING_INPUT), before);
  }
});

test('duplicate identities and invalid sibling placements fail closed', () => {
  const before = canonical(JUNIPER_WORKS_AUTHORING_INPUT);
  const denied = [
    createInsertItemCommand({
      blockId: 'home.programs',
      item: program({ id: 'orientation-101' }),
    }),
    createInsertItemCommand({
      blockId: 'home.programs',
      item: program({ endAt: '2026-09-11T17:00:00-07:00' }),
    }),
    createInsertItemCommand({
      blockId: 'home.equipment-status',
      item: equipment(),
      beforeBlockId: 'home.equipment-status.item.unknown-tool',
    }),
    createMoveItemCommand({
      blockId: 'home.equipment-status.item.wood-shop',
      beforeBlockId: 'home.equipment-status.item.wood-shop',
    }),
    createMoveItemCommand({
      blockId: 'home.equipment-status.item.laser-cutter',
      beforeBlockId: 'home.equipment-status.item.wood-shop',
    }),
  ];

  for (const command of denied) {
    assert.throws(() => applyVenueCanvasCommand(JUNIPER_WORKS_AUTHORING_INPUT, command));
    assert.equal(canonical(JUNIPER_WORKS_AUTHORING_INPUT), before);
  }
});

test('collection cardinality overflow is rejected without changing the base document', () => {
  const input = clone(JUNIPER_WORKS_AUTHORING_INPUT);
  const items = input.venuePackage.home.equipmentStatus.items;
  for (let index = items.length; index < 20; index += 1) {
    items.push(equipment({
      id: `fixture-tool-${String(index).padStart(2, '0')}`,
      name: `Fixture tool ${index}`,
    }));
  }
  const fullDocument = createVenueAuthoringDocument(input);
  const before = canonical(fullDocument);

  assert.equal(fullDocument.venuePackage.home.equipmentStatus.items.length, 20);
  assert.throws(
    () => applyVenueCanvasCommand(
      fullDocument,
      createInsertItemCommand({
        blockId: 'home.equipment-status',
        item: equipment({ id: 'overflow-tool', name: 'Overflow tool' }),
      }),
    ),
  );
  assert.equal(canonical(fullDocument), before);
});

test('command builders produce strict, versioned, deeply frozen JSON commands', () => {
  const commands = [
    createSetFieldCommand({ blockId: 'home.hero', fieldId: 'lede', value: 'Fixture lede.' }),
    createInsertItemCommand({ blockId: 'home.programs', item: program() }),
    createRemoveItemCommand({ blockId: 'home.programs.item.orientation-101' }),
    createMoveItemCommand({
      blockId: 'home.equipment-status.item.wood-shop',
      beforeBlockId: null,
    }),
  ];

  for (const command of commands) {
    assert.equal(command.kind, VENUE_CANVAS_COMMAND_KIND);
    assert.equal(command.schemaVersion, VENUE_CANVAS_COMMAND_SCHEMA_VERSION);
    assert.deepEqual(parseVenueCanvasCommand(command), command);
    assertDeeplyFrozen(command);
  }

  assert.throws(() => parseVenueCanvasCommand(null), /plain object/i);
  assert.throws(
    () => parseVenueCanvasCommand({
      kind: VENUE_CANVAS_COMMAND_KIND,
      schemaVersion: VENUE_CANVAS_COMMAND_SCHEMA_VERSION,
      type: COMMAND_TYPE.INSERT_ITEM,
      blockId: 'home.programs',
      item: program(),
    }),
    /keys must be exactly/i,
  );
  assert.throws(
    () => createInsertItemCommand({
      blockId: 'home.programs',
      item: program({ id: ' bad ' }),
    }),
    /canonical stable id/i,
  );
  assert.throws(
    () => createInsertItemCommand({
      blockId: 'home.programs',
      item: program({ id: 'a'.repeat(81) }),
    }),
    /canonical stable id/i,
  );
  assert.throws(
    () => createSetFieldCommand({ blockId: 'home.hero', fieldId: 'lede', value: undefined }),
    /JSON serializable/i,
  );
  assert.throws(
    () => createSetFieldCommand({ blockId: 'home.hero', fieldId: 'lede', value: Number.NaN }),
    /JSON serializable/i,
  );
  assert.throws(
    () => createSetFieldCommand({ blockId: 'home.hero', fieldId: 'lede', value: new Date() }),
    /JSON serializable/i,
  );
  assert.throws(
    () => createInsertItemCommand({
      blockId: 'home.programs',
      item: program({ description: undefined }),
    }),
    /JSON serializable/i,
  );
  assert.throws(
    () => createMoveItemCommand({
      blockId: 'home.equipment-status.item.wood-shop',
      beforeBlockId: '',
    }),
    /beforeBlockId/i,
  );
});

test('the contract grants only the bounded semantic capabilities and has unique block ids', () => {
  const contract = createSemanticVenueCanvasContract(JUNIPER_WORKS_AUTHORING_INPUT);
  const blocks = listVenueCanvasBlocks(contract);
  const blockIds = blocks.map((block) => block.id);
  const capabilities = [...new Set(blocks.flatMap((block) => block.capabilities))].sort();

  assert.equal(new Set(blockIds).size, blockIds.length);
  for (const block of blocks) {
    const fieldIds = block.fields.map((field) => field.id);
    assert.equal(new Set(fieldIds).size, fieldIds.length);
  }
  assert.deepEqual(capabilities, Object.values(CAPABILITY).sort());
  assert.equal(contract.authority.derived, true);
  assert.equal(contract.authority.persistent, false);
  assert.equal(contract.authority.runtimeWired, false);
  for (const forbidden of [
    'raw-html',
    'script',
    'raw-css',
    'publish',
    'deploy',
    'hive-write',
    'key-access',
    'payment',
    'replace-document',
    'arbitrary-topology',
  ]) {
    assert.equal(capabilities.includes(forbidden), false);
  }
});

test('optional collections and theme blocks are omitted while their fixed slots remain explicit', () => {
  const fourth = createSemanticVenueCanvasContract(FOURTH_STREET_AUTHORING_INPUT);
  const lantern = createSemanticVenueCanvasContract(LANTERN_ROOM_AUTHORING_INPUT);
  const fourthIds = new Set(listVenueCanvasBlocks(fourth).map((block) => block.id));
  const lanternIds = new Set(listVenueCanvasBlocks(lantern).map((block) => block.id));

  assert.equal(fourthIds.has('home.programs'), false);
  assert.equal(fourthIds.has('home.equipment-status'), false);
  assert.equal(lanternIds.has('settings.theme'), false);
  assert.equal(findVenueCanvasBlock(fourth, 'settings.theme').id, 'settings.theme');

  const homePolicy = findVenueCanvasBlock(fourth, 'page.home').childPolicy.fixedSlots;
  assert.equal(homePolicy.some((slot) => slot.blockId === 'home.programs'), true);
  assert.equal(homePolicy.some((slot) => slot.blockId === 'home.equipment-status'), true);
  const settingsPolicy = findVenueCanvasBlock(lantern, 'venue.settings').childPolicy.fixedSlots;
  assert.equal(settingsPolicy.some((slot) => slot.blockId === 'settings.theme'), true);
});

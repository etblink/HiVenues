'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ADD_COMPONENT,
  BEFORE_COMPONENT,
  END_OF_PAGE,
  IMPORT_LOCAL_HERO_MEDIA,
  MOVE_COMPONENT,
  REMOVE_COMPONENT,
  SET_MEDIA_USAGE_ASSET,
  SET_THEME_RECIPE,
  V2_COMPONENT_CATALOG,
  V2_GLOBAL_THEME_TARGET,
  V2_HERO_MEDIA_SLOT,
  V2_THEME_RECIPE_DIMENSIONS,
  applyV2AuthoringProposal,
  createV2AuthoringSession,
  discardV2AuthoringProposal,
  listV2MediaUsageOptions,
  listV2ThemeRecipeOptions,
  proposeV2AddComponent,
  proposeV2ImportLocalHeroMedia,
  proposeV2MoveComponent,
  proposeV2RemoveComponent,
  proposeV2SetField,
  proposeV2SetMediaUsageAsset,
  proposeV2SetThemeRecipe,
  redoV2AuthoringSession,
  undoV2AuthoringSession,
  V2AuthoringTransactionError,
} = require('../src/venue/v2/authoring-transaction');
const {
  serializeV2DeploymentAgnosticVenueSource,
} = require('../src/venue/v2/source');
const {
  renderV2Page,
} = require('../src/venue/v2/renderer');
const {
  REFERENCE_FACTORIES,
} = require('./support/v2-renderer-fixture');

function command(session, nodeId, fieldId, value, overrides = {}) {
  return {
    schemaVersion: 1,
    type: 'SET_FIELD',
    target: { nodeId, fieldId },
    payload: { value },
    expectedDraftDigest: overrides.expectedDraftDigest || session.draftDigest,
    ...overrides.extra,
  };
}

function moveCommand(session, nodeId, destination, overrides = {}) {
  return {
    schemaVersion: 1,
    type: MOVE_COMPONENT,
    target: { nodeId },
    destination,
    expectedDraftDigest: overrides.expectedDraftDigest || session.draftDigest,
    ...overrides.extra,
  };
}

function addCommand(session, pageNodeId, catalogItemId, destination, overrides = {}) {
  return {
    schemaVersion: 1,
    type: ADD_COMPONENT,
    target: { nodeId: pageNodeId },
    catalogItemId,
    destination,
    expectedDraftDigest: overrides.expectedDraftDigest || session.draftDigest,
    ...overrides.extra,
  };
}

function removeCommand(session, componentNodeId, overrides = {}) {
  return {
    schemaVersion: 1,
    type: REMOVE_COMPONENT,
    target: { nodeId: componentNodeId },
    expectedDraftDigest: overrides.expectedDraftDigest || session.draftDigest,
    ...overrides.extra,
  };
}

function themeCommand(session, dimension, recipeId, overrides = {}) {
  return {
    schemaVersion: 1,
    type: SET_THEME_RECIPE,
    target: { nodeId: V2_GLOBAL_THEME_TARGET },
    dimension,
    recipeId,
    expectedDraftDigest: overrides.expectedDraftDigest || session.draftDigest,
    ...overrides.extra,
  };
}

function componentOrder(source, pageId = 'home') {
  const page = source.site.pages.find((candidate) => candidate.id === pageId);
  assert.ok(page, `page ${pageId} must exist`);
  return page.components.map((component) => component.id);
}

function sourceIgnoringComponentOrder(source) {
  const copy = JSON.parse(JSON.stringify(source));
  for (const page of copy.site.pages) {
    page.components.sort((left, right) => left.id.localeCompare(right.id));
  }
  return copy;
}

const FOUR_REFERENCE_CASES = Object.freeze([
  {
    referenceId: 'fourth-street',
    nodeId: 'page:home',
    fieldId: 'title',
    value: 'Home and neighborhood updates',
  },
  {
    referenceId: 'juniper',
    nodeId: 'component:home-equipment-status',
    fieldId: 'heading',
    value: 'Equipment availability today',
  },
  {
    referenceId: 'restaurant',
    nodeId: 'component:home-gallery',
    fieldId: 'heading',
    value: 'An evening by the water',
  },
  {
    referenceId: 'live-music',
    nodeId: 'component:home-shows',
    fieldId: 'heading',
    value: 'This week at Northline',
  },
]);

test('one SET_FIELD engine proves proposal, apply, exact undo, and exact redo across four references', () => {
  for (const spec of FOUR_REFERENCE_CASES) {
    const source = REFERENCE_FACTORIES[spec.referenceId]();
    const session = createV2AuthoringSession(source);
    const baselineSerialization = serializeV2DeploymentAgnosticVenueSource(session.draftSource);

    const proposal = proposeV2SetField(
      session,
      command(session, spec.nodeId, spec.fieldId, spec.value),
    );

    assert.equal(proposal.status, 'PREVIEW_NOT_APPLIED', spec.referenceId);
    assert.equal(proposal.beforeDigest, session.draftDigest, spec.referenceId);
    assert.notEqual(proposal.afterDigest, session.draftDigest, spec.referenceId);
    assert.equal(session.draftDigest, session.baselineDigest, spec.referenceId);
    assert.equal(proposal.authority.acceptedDraftChanged, false, spec.referenceId);
    assert.equal(proposal.authority.persistent, false, spec.referenceId);
    assert.equal(proposal.authority.externalEffects, false, spec.referenceId);
    assert.equal(proposal.resolvedTarget.ownership, 'OPERATOR_AUTHORED', spec.referenceId);

    const applied = applyV2AuthoringProposal(session, proposal);
    assert.equal(applied.draftDigest, proposal.afterDigest, spec.referenceId);
    assert.equal(applied.history.length, 1, spec.referenceId);
    assert.equal(applied.historyIndex, 1, spec.referenceId);
    assert.equal(applied.canUndo, true, spec.referenceId);
    assert.equal(applied.authority.persistent, false, spec.referenceId);
    assert.equal(applied.authority.externalEffects, false, spec.referenceId);

    const undone = undoV2AuthoringSession(applied);
    assert.equal(undone.draftDigest, session.draftDigest, spec.referenceId);
    assert.equal(
      serializeV2DeploymentAgnosticVenueSource(undone.draftSource),
      baselineSerialization,
      spec.referenceId,
    );
    assert.equal(undone.canRedo, true, spec.referenceId);

    const redone = redoV2AuthoringSession(undone);
    assert.equal(redone.draftDigest, applied.draftDigest, spec.referenceId);
    assert.equal(
      serializeV2DeploymentAgnosticVenueSource(redone.draftSource),
      serializeV2DeploymentAgnosticVenueSource(applied.draftSource),
      spec.referenceId,
    );

    if (spec.referenceId === 'restaurant' || spec.referenceId === 'live-music') {
      assert.equal(redone.draftSource.capabilities.community.state, 'disabled');
      assert.equal(redone.draftSource.capabilities.transaction.state, 'disabled');
    }
  }
});

test('discard validates the proposal but leaves the accepted draft byte/digest exact', () => {
  const session = createV2AuthoringSession(REFERENCE_FACTORIES.restaurant());
  const before = serializeV2DeploymentAgnosticVenueSource(session.draftSource);
  const proposal = proposeV2SetField(
    session,
    command(session, 'component:home-gallery', 'heading', 'Preview only'),
  );

  const discarded = discardV2AuthoringProposal(session, proposal);

  assert.equal(discarded.draftDigest, session.draftDigest);
  assert.equal(
    serializeV2DeploymentAgnosticVenueSource(discarded.draftSource),
    before,
  );
  assert.equal(discarded.history.length, 0);
  assert.equal(discarded.historyIndex, 0);
});

test('stale digests, browser-selected paths, unknown fields, and non-scalar targets fail closed', () => {
  const session = createV2AuthoringSession(REFERENCE_FACTORIES.restaurant());

  assert.throws(
    () => proposeV2SetField(
      session,
      command(
        session,
        'component:home-gallery',
        'heading',
        'Stale',
        { expectedDraftDigest: '0'.repeat(64) },
      ),
    ),
    /stale expected draft digest/,
  );

  assert.throws(
    () => proposeV2SetField(session, {
      ...command(session, 'component:home-gallery', 'heading', 'No paths'),
      sourcePointer: '/site/pages/0/components/0/content/heading',
    }),
    /unsupported keys/,
  );

  assert.throws(
    () => proposeV2SetField(
      session,
      command(session, 'page:home', 'slug', 'renamed-route'),
    ),
    /allows only page title/,
  );

  assert.throws(
    () => proposeV2SetField(
      session,
      command(session, 'component:home-gallery', 'items', 'not-an-array'),
    ),
    /existing scalar string fields/,
  );

  assert.throws(
    () => proposeV2SetField(
      session,
      command(session, 'component:missing', 'heading', 'Missing'),
    ),
    /stable target does not exist/,
  );
});

test('unknown/prototype-pollution command keys fail before target resolution', () => {
  const session = createV2AuthoringSession(REFERENCE_FACTORIES.restaurant());
  const pollutedTarget = JSON.parse('{"nodeId":"component:home-gallery","fieldId":"heading","__proto__":"blocked"}');

  assert.throws(
    () => proposeV2SetField(session, {
      schemaVersion: 1,
      type: 'SET_FIELD',
      target: pollutedTarget,
      payload: { value: 'Blocked' },
      expectedDraftDigest: session.draftDigest,
    }),
    /unsupported keys/,
  );

  const constructorPayload = JSON.parse('{"value":"Blocked","constructor":"blocked"}');
  assert.throws(
    () => proposeV2SetField(session, {
      schemaVersion: 1,
      type: 'SET_FIELD',
      target: { nodeId: 'component:home-gallery', fieldId: 'heading' },
      payload: constructorPayload,
      expectedDraftDigest: session.draftDigest,
    }),
    /unsupported keys/,
  );
});

test('canonical v2 schema remains the value validator and raw markup text stays inert in the real renderer', () => {
  const session = createV2AuthoringSession(REFERENCE_FACTORIES['live-music']());

  assert.throws(
    () => proposeV2SetField(
      session,
      command(session, 'component:home-shows', 'heading', 'x'.repeat(241)),
    ),
    /HiVenues v2 source invalid/,
  );

  const proposal = proposeV2SetField(
    session,
    command(
      session,
      'component:home-shows',
      'heading',
      '<script>alert(1)</script> Shows',
    ),
  );
  const html = renderV2Page(proposal.previewSource, { pageId: 'home' });

  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; Shows/);
});

test('proposal source/digest tampering is rejected before apply', () => {
  const session = createV2AuthoringSession(REFERENCE_FACTORIES.restaurant());
  const proposal = proposeV2SetField(
    session,
    command(session, 'component:home-gallery', 'heading', 'Bound proposal'),
  );
  const forged = JSON.parse(JSON.stringify(proposal));
  forged.afterDigest = 'f'.repeat(64);

  assert.throws(
    () => applyV2AuthoringProposal(session, forged),
    /proposal source\/digest binding is invalid/,
  );
});

test('new apply after undo truncates stale redo history exactly', () => {
  const firstSession = createV2AuthoringSession(REFERENCE_FACTORIES.restaurant());
  const firstProposal = proposeV2SetField(
    firstSession,
    command(firstSession, 'component:home-gallery', 'heading', 'First accepted heading'),
  );
  const firstApplied = applyV2AuthoringProposal(firstSession, firstProposal);

  const secondProposal = proposeV2SetField(
    firstApplied,
    command(firstApplied, 'component:home-gallery', 'heading', 'Second accepted heading'),
  );
  const secondApplied = applyV2AuthoringProposal(firstApplied, secondProposal);
  const undone = undoV2AuthoringSession(secondApplied);

  assert.equal(undone.history.length, 2);
  assert.equal(undone.historyIndex, 1);
  assert.equal(undone.canRedo, true);

  const replacementProposal = proposeV2SetField(
    undone,
    command(undone, 'component:home-gallery', 'heading', 'Replacement heading'),
  );
  const replacementApplied = applyV2AuthoringProposal(undone, replacementProposal);

  assert.equal(replacementApplied.history.length, 2);
  assert.equal(replacementApplied.historyIndex, 2);
  assert.equal(replacementApplied.canRedo, false);
  assert.equal(replacementApplied.history[1].command.payload.value, 'Replacement heading');
  assert.throws(
    () => redoV2AuthoringSession(replacementApplied),
    V2AuthoringTransactionError,
  );
});


test('forged session history and history-position drift fail closed before undo/redo', () => {
  const opening = createV2AuthoringSession(REFERENCE_FACTORIES.restaurant());
  const proposal = proposeV2SetField(
    opening,
    command(opening, 'component:home-gallery', 'heading', 'Accepted heading'),
  );
  const applied = applyV2AuthoringProposal(opening, proposal);

  const forgedHistory = JSON.parse(JSON.stringify(applied));
  forgedHistory.history[0].afterSource.site.pages[0].components
    .find((component) => component.id === 'home-gallery')
    .content.heading = 'Tampered after source';
  assert.throws(
    () => undoV2AuthoringSession(forgedHistory),
    /history entry source\/digest binding is invalid/,
  );

  const forgedPosition = JSON.parse(JSON.stringify(applied));
  forgedPosition.historyIndex = 0;
  forgedPosition.canUndo = false;
  forgedPosition.canRedo = true;
  assert.throws(
    () => redoV2AuthoringSession(forgedPosition),
    /accepted draft is not bound to history position/,
  );
});


const MOVE_REFERENCE_CASES = Object.freeze([
  {
    referenceId: 'fourth-street',
    nodeId: 'component:home-pathways',
    destination: { kind: BEFORE_COMPONENT, beforeComponentId: 'home-hero' },
  },
  {
    referenceId: 'juniper',
    nodeId: 'component:home-equipment-status',
    destination: { kind: END_OF_PAGE },
  },
  {
    referenceId: 'restaurant',
    nodeId: 'component:home-gallery',
    destination: { kind: BEFORE_COMPONENT, beforeComponentId: 'home-hero' },
  },
  {
    referenceId: 'live-music',
    nodeId: 'component:home-shows',
    destination: { kind: BEFORE_COMPONENT, beforeComponentId: 'home-hero' },
  },
]);

test('one MOVE_COMPONENT engine proves stable same-page reorder, exact inverse, apply, undo, and redo across four references', () => {
  for (const spec of MOVE_REFERENCE_CASES) {
    const source = REFERENCE_FACTORIES[spec.referenceId]();
    const session = createV2AuthoringSession(source);
    const beforeOrder = componentOrder(session.draftSource);
    const beforeIgnoringOrder = sourceIgnoringComponentOrder(session.draftSource);

    const proposal = proposeV2MoveComponent(
      session,
      moveCommand(session, spec.nodeId, spec.destination),
    );

    const previewOrder = componentOrder(proposal.previewSource);
    assert.notDeepEqual(previewOrder, beforeOrder, spec.referenceId);
    assert.equal(proposal.status, 'PREVIEW_NOT_APPLIED', spec.referenceId);
    assert.equal(proposal.beforeDigest, session.draftDigest, spec.referenceId);
    assert.notEqual(proposal.afterDigest, session.draftDigest, spec.referenceId);
    assert.equal(session.draftDigest, session.baselineDigest, spec.referenceId);
    assert.equal(proposal.resolvedTarget.ownership, 'OPERATOR_AUTHORED_COLLECTION', spec.referenceId);
    assert.equal(proposal.command.type, MOVE_COMPONENT, spec.referenceId);
    assert.equal(proposal.inverseCommand.type, MOVE_COMPONENT, spec.referenceId);
    assert.deepEqual(
      sourceIgnoringComponentOrder(proposal.previewSource),
      beforeIgnoringOrder,
      spec.referenceId,
    );

    const applied = applyV2AuthoringProposal(session, proposal);
    assert.deepEqual(componentOrder(applied.draftSource), previewOrder, spec.referenceId);
    assert.equal(applied.draftDigest, proposal.afterDigest, spec.referenceId);
    assert.equal(applied.history.length, 1, spec.referenceId);
    assert.deepEqual(applied.history[0].inverseCommand, proposal.inverseCommand, spec.referenceId);

    const undone = undoV2AuthoringSession(applied);
    assert.deepEqual(componentOrder(undone.draftSource), beforeOrder, spec.referenceId);
    assert.equal(undone.draftDigest, session.draftDigest, spec.referenceId);

    const redone = redoV2AuthoringSession(undone);
    assert.deepEqual(componentOrder(redone.draftSource), previewOrder, spec.referenceId);
    assert.equal(redone.draftDigest, applied.draftDigest, spec.referenceId);

    if (spec.referenceId === 'restaurant' || spec.referenceId === 'live-music') {
      assert.equal(redone.draftSource.capabilities.community.state, 'disabled');
      assert.equal(redone.draftSource.capabilities.transaction.state, 'disabled');
    }
  }
});

test('MOVE_COMPONENT rejects self, no-op, unknown, cross-page, stale, and browser-selected source authority', () => {
  const session = createV2AuthoringSession(REFERENCE_FACTORIES.restaurant());

  assert.throws(
    () => proposeV2MoveComponent(
      session,
      moveCommand(
        session,
        'component:home-gallery',
        { kind: BEFORE_COMPONENT, beforeComponentId: 'home-gallery' },
      ),
    ),
    /cannot move before itself/,
  );

  assert.throws(
    () => proposeV2MoveComponent(
      session,
      moveCommand(
        session,
        'component:home-hero',
        { kind: BEFORE_COMPONENT, beforeComponentId: 'home-menu' },
      ),
    ),
    /component move is a no-op/,
  );

  assert.throws(
    () => proposeV2MoveComponent(
      session,
      moveCommand(
        session,
        'component:home-gallery',
        { kind: BEFORE_COMPONENT, beforeComponentId: 'missing-component' },
      ),
    ),
    /stable destination component does not exist/,
  );

  assert.throws(
    () => proposeV2MoveComponent(
      session,
      moveCommand(
        session,
        'component:home-gallery',
        { kind: BEFORE_COMPONENT, beforeComponentId: 'menu-main' },
      ),
    ),
    /cross-page component movement is not authorized/,
  );

  assert.throws(
    () => proposeV2MoveComponent(
      session,
      moveCommand(
        session,
        'component:home-gallery',
        { kind: END_OF_PAGE },
        { expectedDraftDigest: '0'.repeat(64) },
      ),
    ),
    /stale expected draft digest/,
  );

  assert.throws(
    () => proposeV2MoveComponent(session, {
      ...moveCommand(
        session,
        'component:home-gallery',
        { kind: END_OF_PAGE },
      ),
      sourcePointer: '/site/pages/0/components',
    }),
    /unsupported keys/,
  );

  assert.throws(
    () => proposeV2MoveComponent(session, {
      schemaVersion: 1,
      type: MOVE_COMPONENT,
      target: { nodeId: 'component:home-gallery', pageId: 'home' },
      destination: { kind: END_OF_PAGE },
      expectedDraftDigest: session.draftDigest,
    }),
    /unsupported keys/,
  );
});

test('MOVE_COMPONENT discard is exact and divergent structural apply truncates redo', () => {
  const opening = createV2AuthoringSession(REFERENCE_FACTORIES['live-music']());
  const beforeOrder = componentOrder(opening.draftSource);

  const previewOnly = proposeV2MoveComponent(
    opening,
    moveCommand(
      opening,
      'component:home-shows',
      { kind: BEFORE_COMPONENT, beforeComponentId: 'home-hero' },
    ),
  );
  const discarded = discardV2AuthoringProposal(opening, previewOnly);
  assert.equal(discarded.draftDigest, opening.draftDigest);
  assert.deepEqual(componentOrder(discarded.draftSource), beforeOrder);

  const firstApplied = applyV2AuthoringProposal(opening, previewOnly);
  const undone = undoV2AuthoringSession(firstApplied);
  assert.equal(undone.canRedo, true);

  const replacement = proposeV2MoveComponent(
    undone,
    moveCommand(
      undone,
      'component:home-hero',
      { kind: END_OF_PAGE },
    ),
  );
  const replacementApplied = applyV2AuthoringProposal(undone, replacement);
  assert.equal(replacementApplied.canRedo, false);
  assert.equal(replacementApplied.history.length, 1);
  assert.equal(replacementApplied.history[0].command.type, MOVE_COMPONENT);
});


const ADD_REFERENCE_CASES = Object.freeze([
  {
    referenceId: 'fourth-street',
    catalogItemId: 'story-intro',
    destination: { kind: BEFORE_COMPONENT, beforeComponentId: 'home-hero' },
  },
  {
    referenceId: 'juniper',
    catalogItemId: 'hours-location',
    destination: { kind: END_OF_PAGE },
  },
  {
    referenceId: 'restaurant',
    catalogItemId: 'contact-visit',
    destination: { kind: BEFORE_COMPONENT, beforeComponentId: 'home-gallery' },
  },
  {
    referenceId: 'live-music',
    catalogItemId: 'story-intro',
    destination: { kind: END_OF_PAGE },
  },
]);

test('ADD_COMPONENT catalog authority is server-owned and exact across four references', () => {
  assert.deepEqual(Object.keys(V2_COMPONENT_CATALOG).sort(), [
    'contact-visit',
    'hours-location',
    'story-intro',
  ]);

  for (const spec of ADD_REFERENCE_CASES) {
    const opening = createV2AuthoringSession(REFERENCE_FACTORIES[spec.referenceId]());
    const beforeSerialization = serializeV2DeploymentAgnosticVenueSource(opening.draftSource);
    const beforeCount = componentOrder(opening.draftSource).length;

    const proposal = proposeV2AddComponent(
      opening,
      addCommand(opening, 'page:home', spec.catalogItemId, spec.destination),
    );

    assert.equal(opening.draftDigest, opening.baselineDigest, spec.referenceId);
    assert.equal(proposal.command.type, ADD_COMPONENT, spec.referenceId);
    assert.equal(proposal.command.catalogItemId, spec.catalogItemId, spec.referenceId);
    assert.equal(proposal.resolvedTarget.ownership, 'OPERATOR_AUTHORED_COLLECTION', spec.referenceId);
    assert.equal(proposal.resolvedTarget.catalogItemId, spec.catalogItemId, spec.referenceId);
    assert.equal(proposal.previewSource.site.pages.find((page) => page.id === 'home').components.length, beforeCount + 1);
    assert.equal(proposal.inverseCommand.type, REMOVE_COMPONENT, spec.referenceId);

    const createdId = proposal.resolvedTarget.componentId;
    assert.equal(proposal.inverseCommand.target.nodeId, `component:${createdId}`, spec.referenceId);
    const created = proposal.previewSource.site.pages
      .find((page) => page.id === 'home')
      .components.find((component) => component.id === createdId);
    const catalog = V2_COMPONENT_CATALOG[spec.catalogItemId];
    assert.equal(created.kind, catalog.kind, spec.referenceId);
    assert.equal(created.recipeId, catalog.recipeId, spec.referenceId);
    assert.deepEqual(created.content, catalog.content, spec.referenceId);
    assert.deepEqual(created.responsive, catalog.responsive, spec.referenceId);

    const discarded = discardV2AuthoringProposal(opening, proposal);
    assert.equal(
      serializeV2DeploymentAgnosticVenueSource(discarded.draftSource),
      beforeSerialization,
      spec.referenceId,
    );

    const applied = applyV2AuthoringProposal(opening, proposal);
    assert.equal(applied.draftDigest, proposal.afterDigest, spec.referenceId);
    const undone = undoV2AuthoringSession(applied);
    assert.equal(
      serializeV2DeploymentAgnosticVenueSource(undone.draftSource),
      beforeSerialization,
      spec.referenceId,
    );
    assert.equal(undone.draftDigest, opening.draftDigest, spec.referenceId);
    const redone = redoV2AuthoringSession(undone);
    assert.equal(
      serializeV2DeploymentAgnosticVenueSource(redone.draftSource),
      serializeV2DeploymentAgnosticVenueSource(applied.draftSource),
      spec.referenceId,
    );
    assert.equal(redone.draftDigest, applied.draftDigest, spec.referenceId);

    if (spec.referenceId === 'restaurant' || spec.referenceId === 'live-music') {
      assert.equal(redone.draftSource.capabilities.community.state, 'disabled');
      assert.equal(redone.draftSource.capabilities.transaction.state, 'disabled');
    }
  }
});

test('ADD_COMPONENT derives deterministic collision-safe identities without browser ID authority', () => {
  const opening = createV2AuthoringSession(REFERENCE_FACTORIES.restaurant());
  const first = proposeV2AddComponent(
    opening,
    addCommand(opening, 'page:home', 'story-intro', { kind: END_OF_PAGE }),
  );
  assert.equal(first.resolvedTarget.componentId, 'story-intro');
  const firstApplied = applyV2AuthoringProposal(opening, first);

  const second = proposeV2AddComponent(
    firstApplied,
    addCommand(firstApplied, 'page:home', 'story-intro', { kind: END_OF_PAGE }),
  );
  assert.equal(second.resolvedTarget.componentId, 'story-intro-2');
  const secondApplied = applyV2AuthoringProposal(firstApplied, second);

  const ids = componentOrder(secondApplied.draftSource);
  assert.equal(ids.filter((id) => id === 'story-intro').length, 1);
  assert.equal(ids.filter((id) => id === 'story-intro-2').length, 1);

  const undone = undoV2AuthoringSession(secondApplied);
  assert.equal(componentOrder(undone.draftSource).includes('story-intro-2'), false);
  const redone = redoV2AuthoringSession(undone);
  assert.equal(componentOrder(redone.draftSource).at(-1), 'story-intro-2');
});

test('REMOVE_COMPONENT restores exact eligible existing component snapshot and order', () => {
  for (const referenceId of ['fourth-street', 'juniper', 'restaurant', 'live-music']) {
    const opening = createV2AuthoringSession(REFERENCE_FACTORIES[referenceId]());
    const page = opening.draftSource.site.pages.find((candidate) => candidate.id === 'home');
    const visit = page.components.find(
      (component) => component.kind === 'contact-visit' && component.recipeId === 'visit-legacy-v1',
    );
    assert.ok(visit, `${referenceId}: expected eligible contact/visit component`);

    const beforeSerialization = serializeV2DeploymentAgnosticVenueSource(opening.draftSource);
    const beforeOrder = componentOrder(opening.draftSource);
    const exactSnapshot = JSON.parse(JSON.stringify(visit));

    const proposal = proposeV2RemoveComponent(
      opening,
      removeCommand(opening, `component:${visit.id}`),
    );

    assert.equal(proposal.command.type, REMOVE_COMPONENT, referenceId);
    assert.equal(proposal.inverseCommand.type, 'RESTORE_COMPONENT', referenceId);
    assert.deepEqual(proposal.inverseCommand.componentSnapshot, exactSnapshot, referenceId);
    assert.equal(componentOrder(opening.draftSource).length, beforeOrder.length, referenceId);
    assert.equal(componentOrder(proposal.previewSource).includes(visit.id), false, referenceId);

    const applied = applyV2AuthoringProposal(opening, proposal);
    assert.equal(componentOrder(applied.draftSource).includes(visit.id), false, referenceId);

    const undone = undoV2AuthoringSession(applied);
    assert.equal(
      serializeV2DeploymentAgnosticVenueSource(undone.draftSource),
      beforeSerialization,
      referenceId,
    );
    assert.deepEqual(componentOrder(undone.draftSource), beforeOrder, referenceId);
    const restored = undone.draftSource.site.pages
      .find((candidate) => candidate.id === 'home')
      .components.find((component) => component.id === visit.id);
    assert.deepEqual(restored, exactSnapshot, referenceId);

    const redone = redoV2AuthoringSession(undone);
    assert.equal(redone.draftDigest, applied.draftDigest, referenceId);
    assert.equal(componentOrder(redone.draftSource).includes(visit.id), false, referenceId);
  }
});

test('ADD/REMOVE public commands reject unknown, stale, cross-page, raw object, ID, path and internal restore authority', () => {
  const opening = createV2AuthoringSession(REFERENCE_FACTORIES.restaurant());

  assert.throws(
    () => proposeV2AddComponent(
      opening,
      addCommand(opening, 'page:home', 'not-a-catalog-item', { kind: END_OF_PAGE }),
    ),
    /unknown component catalog item/,
  );
  assert.throws(
    () => proposeV2AddComponent(
      opening,
      addCommand(
        opening,
        'page:home',
        'story-intro',
        { kind: BEFORE_COMPONENT, beforeComponentId: 'menu-main' },
      ),
    ),
    /cross-page component destination is not authorized/,
  );
  assert.throws(
    () => proposeV2AddComponent(
      opening,
      addCommand(
        opening,
        'page:home',
        'story-intro',
        { kind: END_OF_PAGE },
        { expectedDraftDigest: '0'.repeat(64) },
      ),
    ),
    /stale expected draft digest/,
  );

  for (const extra of [
    { componentId: 'browser-id' },
    { kind: 'editorial-intro' },
    { recipeId: 'intro-legacy-v1' },
    { content: { heading: 'Browser object' } },
    { responsive: { mobile: {} } },
    { pageIndex: 0 },
    { sourcePointer: '/site/pages/0/components' },
  ]) {
    assert.throws(
      () => proposeV2AddComponent(opening, {
        ...addCommand(opening, 'page:home', 'story-intro', { kind: END_OF_PAGE }),
        ...extra,
      }),
      /unsupported keys/,
    );
  }

  assert.throws(
    () => proposeV2RemoveComponent(
      opening,
      removeCommand(opening, 'component:home-hero'),
    ),
    /not removable in this bounded catalog slice/,
  );
  assert.throws(
    () => proposeV2RemoveComponent(
      opening,
      removeCommand(opening, 'component:home-gallery'),
    ),
    /not removable in this bounded catalog slice/,
  );

  assert.throws(
    () => proposeV2AddComponent(opening, {
      schemaVersion: 1,
      type: 'RESTORE_COMPONENT',
      target: { nodeId: 'page:home' },
      componentSnapshot: {
        id: 'forged',
        kind: 'editorial-intro',
        recipeId: 'intro-legacy-v1',
        content: { kicker: null, heading: 'Forged', body: 'Forged', note: null },
        responsive: { tablet: {}, mobile: {} },
      },
      destination: { kind: END_OF_PAGE },
      expectedDraftDigest: opening.draftDigest,
    }),
    /unsupported command type/,
  );
});

test('forged REMOVE internal restore history fails closed before Undo/Redo', () => {
  const opening = createV2AuthoringSession(REFERENCE_FACTORIES.restaurant());
  const page = opening.draftSource.site.pages.find((candidate) => candidate.id === 'home');
  const visit = page.components.find((component) => component.kind === 'contact-visit');
  assert.ok(visit);

  const proposal = proposeV2RemoveComponent(
    opening,
    removeCommand(opening, `component:${visit.id}`),
  );
  const applied = applyV2AuthoringProposal(opening, proposal);
  const forged = JSON.parse(JSON.stringify(applied));
  forged.history[0].inverseCommand.componentSnapshot.content.heading = 'Forged restore';

  assert.throws(
    () => undoV2AuthoringSession(forged),
    /history inverse command binding is invalid/,
  );
});

test('cardinality history composes with reorder and divergent Apply still truncates redo', () => {
  const opening = createV2AuthoringSession(REFERENCE_FACTORIES['live-music']());
  const add = proposeV2AddComponent(
    opening,
    addCommand(opening, 'page:home', 'story-intro', { kind: END_OF_PAGE }),
  );
  const added = applyV2AuthoringProposal(opening, add);

  const move = proposeV2MoveComponent(
    added,
    moveCommand(
      added,
      'component:story-intro',
      { kind: BEFORE_COMPONENT, beforeComponentId: 'home-hero' },
    ),
  );
  const moved = applyV2AuthoringProposal(added, move);
  assert.equal(componentOrder(moved.draftSource)[0], 'story-intro');

  const remove = proposeV2RemoveComponent(
    moved,
    removeCommand(moved, 'component:story-intro'),
  );
  const removed = applyV2AuthoringProposal(moved, remove);
  assert.equal(componentOrder(removed.draftSource).includes('story-intro'), false);

  const undoRemove = undoV2AuthoringSession(removed);
  assert.equal(componentOrder(undoRemove.draftSource)[0], 'story-intro');
  const undoMove = undoV2AuthoringSession(undoRemove);
  assert.equal(componentOrder(undoMove.draftSource).at(-1), 'story-intro');
  const redoMove = redoV2AuthoringSession(undoMove);
  assert.equal(componentOrder(redoMove.draftSource)[0], 'story-intro');

  const divergent = proposeV2RemoveComponent(
    redoMove,
    removeCommand(redoMove, 'component:story-intro'),
  );
  const divergentApplied = applyV2AuthoringProposal(redoMove, divergent);
  assert.equal(divergentApplied.canRedo, false);
  assert.equal(divergentApplied.history.length, 3);
});


test('global theme recipe options expose only the four server-owned semantic dimensions', () => {
  for (const [referenceId, factory] of Object.entries(REFERENCE_FACTORIES)) {
    const source = factory();
    const context = listV2ThemeRecipeOptions(source);
    assert.deepEqual(context.target, { nodeId: V2_GLOBAL_THEME_TARGET }, referenceId);
    assert.equal(context.ownership, 'OPERATOR_AUTHORED', referenceId);
    assert.deepEqual(
      context.dimensions.map((dimension) => dimension.id),
      ['typographyRecipeId', 'densityRecipeId', 'shapeRecipeId', 'surfaceRecipeId'],
      referenceId,
    );
    for (const dimension of context.dimensions) {
      assert.equal(
        dimension.value,
        source.site.brand.design[dimension.id],
        `${referenceId}/${dimension.id}`,
      );
      assert.deepEqual(
        dimension.values,
        V2_THEME_RECIPE_DIMENSIONS[dimension.id].values,
        `${referenceId}/${dimension.id}`,
      );
    }
  }
});

test('one SET_THEME_RECIPE engine previews applies and restores exact source across four references', () => {
  const dimensions = [
    'typographyRecipeId',
    'densityRecipeId',
    'shapeRecipeId',
    'surfaceRecipeId',
  ];
  const referenceIds = ['fourth-street', 'juniper', 'restaurant', 'live-music'];

  referenceIds.forEach((referenceId, index) => {
    const source = REFERENCE_FACTORIES[referenceId]();
    const session = createV2AuthoringSession(source);
    const baselineSerialization = serializeV2DeploymentAgnosticVenueSource(session.draftSource);
    const baselineHtml = renderV2Page(session.draftSource, { pageId: 'home', viewport: 'desktop' });
    const dimension = dimensions[index];
    const allowed = V2_THEME_RECIPE_DIMENSIONS[dimension].values;
    const current = session.draftSource.site.brand.design[dimension];
    const recipeId = allowed.find((value) => value !== current);
    assert.ok(recipeId, `${referenceId}/${dimension}`);

    const proposal = proposeV2SetThemeRecipe(
      session,
      themeCommand(session, dimension, recipeId),
    );

    assert.equal(proposal.command.type, SET_THEME_RECIPE, referenceId);
    assert.equal(proposal.command.target.nodeId, V2_GLOBAL_THEME_TARGET, referenceId);
    assert.equal(proposal.command.dimension, dimension, referenceId);
    assert.equal(proposal.command.recipeId, recipeId, referenceId);
    assert.equal(proposal.beforeDigest, session.draftDigest, referenceId);
    assert.notEqual(proposal.afterDigest, session.draftDigest, referenceId);
    assert.equal(session.draftDigest, session.baselineDigest, referenceId);
    assert.equal(proposal.authority.acceptedDraftChanged, false, referenceId);
    assert.equal(proposal.resolvedTarget.sourcePointer, `/site/brand/design/${dimension}`, referenceId);
    assert.equal(proposal.resolvedTarget.ownership, 'OPERATOR_AUTHORED', referenceId);
    assert.equal(
      proposal.previewSource.site.brand.design[dimension],
      recipeId,
      referenceId,
    );
    assert.notEqual(
      renderV2Page(proposal.previewSource, { pageId: 'home', viewport: 'desktop' }),
      baselineHtml,
      referenceId,
    );

    const applied = applyV2AuthoringProposal(session, proposal);
    assert.equal(applied.draftDigest, proposal.afterDigest, referenceId);
    assert.equal(applied.draftSource.site.brand.design[dimension], recipeId, referenceId);
    assert.equal(applied.history.length, 1, referenceId);
    assert.equal(applied.history[0].inverseCommand.type, SET_THEME_RECIPE, referenceId);
    assert.equal(applied.history[0].inverseCommand.dimension, dimension, referenceId);
    assert.equal(applied.history[0].inverseCommand.recipeId, current, referenceId);

    const undone = undoV2AuthoringSession(applied);
    assert.equal(undone.draftDigest, session.draftDigest, referenceId);
    assert.equal(
      serializeV2DeploymentAgnosticVenueSource(undone.draftSource),
      baselineSerialization,
      referenceId,
    );

    const redone = redoV2AuthoringSession(undone);
    assert.equal(redone.draftDigest, applied.draftDigest, referenceId);
    assert.equal(redone.draftSource.site.brand.design[dimension], recipeId, referenceId);
  });
});

test('SET_THEME_RECIPE fails closed on stale no-op unknown target dimension value and browser path authority', () => {
  const session = createV2AuthoringSession(REFERENCE_FACTORIES.restaurant());
  const current = session.draftSource.site.brand.design.typographyRecipeId;
  const alternative = V2_THEME_RECIPE_DIMENSIONS.typographyRecipeId.values
    .find((value) => value !== current);
  assert.ok(alternative);

  const rejected = [
    themeCommand(session, 'typographyRecipeId', alternative, {
      expectedDraftDigest: '0'.repeat(64),
    }),
    themeCommand(session, 'typographyRecipeId', current),
    {
      ...themeCommand(session, 'typographyRecipeId', alternative),
      target: { nodeId: 'theme:other' },
    },
    themeCommand(session, 'unknownRecipeId', alternative),
    themeCommand(session, 'typographyRecipeId', 'type-browser-owned'),
    themeCommand(session, 'typographyRecipeId', alternative, {
      extra: { sourcePointer: '/site/brand/design/typographyRecipeId' },
    }),
    themeCommand(session, 'typographyRecipeId', alternative, {
      extra: { css: ':root{--anything:red}' },
    }),
    themeCommand(session, 'typographyRecipeId', alternative, {
      extra: { payload: { typographyRecipeId: alternative } },
    }),
  ];

  for (const candidate of rejected) {
    assert.throws(
      () => proposeV2SetThemeRecipe(session, candidate),
      V2AuthoringTransactionError,
    );
    assert.equal(session.draftDigest, session.baselineDigest);
  }
});

test('theme history rejects forged inverse recipe semantics', () => {
  const session = createV2AuthoringSession(REFERENCE_FACTORIES['fourth-street']());
  const current = session.draftSource.site.brand.design.surfaceRecipeId;
  const recipeId = V2_THEME_RECIPE_DIMENSIONS.surfaceRecipeId.values
    .find((value) => value !== current);
  const proposal = proposeV2SetThemeRecipe(
    session,
    themeCommand(session, 'surfaceRecipeId', recipeId),
  );
  const applied = applyV2AuthoringProposal(session, proposal);
  const forged = JSON.parse(JSON.stringify(applied));
  forged.history[0].inverseCommand.recipeId = recipeId;

  assert.throws(
    () => undoV2AuthoringSession(forged),
    /history inverse command binding is invalid|history inverse command\/source binding is invalid/,
  );
});


test('SET_MEDIA_USAGE_ASSET replaces an existing hero asset with exact Undo Redo restoration', () => {
  for (const referenceId of ['restaurant', 'live-music']) {
    const source = REFERENCE_FACTORIES[referenceId]();
    const session = createV2AuthoringSession(source);
    const page = source.site.pages.find((candidate) =>
      candidate.components.some((component) => component.kind === 'venue-hero' && component.content.media)
    );
    const hero = page.components.find((component) => component.kind === 'venue-hero' && component.content.media);
    const asset = source.media.assets.find((candidate) => candidate.id !== hero.content.media.assetId);
    assert.ok(asset, referenceId);
    const nodeId = 'component:' + hero.id;
    const baseline = serializeV2DeploymentAgnosticVenueSource(source);
    const treatment = JSON.stringify(hero.content.media.treatment);
    const options = listV2MediaUsageOptions(source, { nodeId });

    assert.equal(options.slot, V2_HERO_MEDIA_SLOT, referenceId);
    assert.equal(Object.hasOwn(options.assets[0], 'src'), false, referenceId);
    assert.ok(options.assets.some((candidate) => candidate.id === asset.id), referenceId);

    const proposal = proposeV2SetMediaUsageAsset(session, {
      schemaVersion: 1,
      type: SET_MEDIA_USAGE_ASSET,
      target: { nodeId },
      slot: V2_HERO_MEDIA_SLOT,
      assetId: asset.id,
      alt: referenceId + ' replacement hero image',
      decorative: false,
      expectedDraftDigest: session.draftDigest,
    });

    assert.equal(session.draftDigest, session.baselineDigest, referenceId);
    assert.equal(proposal.resolvedTarget.ownership, 'OPERATOR_AUTHORED', referenceId);
    assert.match(proposal.resolvedTarget.sourcePointer, /\/content\/media$/, referenceId);
    const previewPage = proposal.previewSource.site.pages.find((candidate) => candidate.id === page.id);
    const previewHero = previewPage.components.find((component) => component.id === hero.id);
    assert.equal(previewHero.content.media.assetId, asset.id, referenceId);
    assert.equal(previewHero.content.media.alt, referenceId + ' replacement hero image', referenceId);
    assert.equal(JSON.stringify(previewHero.content.media.treatment), treatment, referenceId);
    const html = renderV2Page(proposal.previewSource, { pageId: page.id, viewport: 'desktop' });
    assert.equal(html.includes(asset.src), true, referenceId);
    assert.equal(html.includes(referenceId + ' replacement hero image'), true, referenceId);

    const applied = applyV2AuthoringProposal(session, proposal);
    assert.equal(applied.history[0].inverseCommand.type, SET_MEDIA_USAGE_ASSET, referenceId);
    assert.equal(applied.history[0].inverseCommand.assetId, hero.content.media.assetId, referenceId);
    const undone = undoV2AuthoringSession(applied);
    assert.equal(serializeV2DeploymentAgnosticVenueSource(undone.draftSource), baseline, referenceId);
    const redone = redoV2AuthoringSession(undone);
    assert.equal(redone.draftDigest, applied.draftDigest, referenceId);
  }
});

test('SET_MEDIA_USAGE_ASSET rejects stale unknown no-op accessibility and browser-owned media structure', () => {
  const source = REFERENCE_FACTORIES.restaurant();
  const session = createV2AuthoringSession(source);
  const page = source.site.pages.find((candidate) =>
    candidate.components.some((component) => component.kind === 'venue-hero' && component.content.media)
  );
  const hero = page.components.find((component) => component.kind === 'venue-hero' && component.content.media);
  const asset = source.media.assets.find((candidate) => candidate.id !== hero.content.media.assetId);
  const nodeId = 'component:' + hero.id;
  const valid = {
    schemaVersion: 1,
    type: SET_MEDIA_USAGE_ASSET,
    target: { nodeId },
    slot: V2_HERO_MEDIA_SLOT,
    assetId: asset.id,
    alt: 'Dining room at sunset',
    decorative: false,
    expectedDraftDigest: session.draftDigest,
  };
  const rejected = [
    { ...valid, expectedDraftDigest: '0'.repeat(64) },
    { ...valid, assetId: 'unknown-asset' },
    { ...valid, assetId: hero.content.media.assetId, alt: hero.content.media.alt, decorative: hero.content.media.decorative },
    { ...valid, target: { nodeId: 'component:home-gallery' } },
    { ...valid, slot: 'gallery-item' },
    { ...valid, decorative: true, alt: 'must be null' },
    { ...valid, decorative: false, alt: '' },
    { ...valid, sourcePointer: '/site/pages/0/components/0/content/media' },
    { ...valid, src: '/browser-owned.svg' },
    { ...valid, width: 1 },
    { ...valid, treatment: { fit: 'contain' } },
  ];
  for (const command of rejected) {
    assert.throws(() => proposeV2SetMediaUsageAsset(session, command));
    assert.equal(session.draftDigest, session.baselineDigest);
  }
});


const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlOAAAAAASUVORK5CYII=';

function importMediaCommand(session, nodeId, alt, overrides = {}) {
  return {
    schemaVersion: 1,
    type: IMPORT_LOCAL_HERO_MEDIA,
    target: { nodeId },
    slot: V2_HERO_MEDIA_SLOT,
    bytesBase64: ONE_PIXEL_PNG_BASE64,
    alt,
    decorative: false,
    expectedDraftDigest: overrides.expectedDraftDigest || session.draftDigest,
    ...overrides.extra,
  };
}

test('local hero media import derives one in-memory asset and exact compound history', () => {
  for (const referenceId of ['restaurant', 'live-music']) {
    const source = REFERENCE_FACTORIES[referenceId]();
    const session = createV2AuthoringSession(source);
    const page = source.site.pages.find((candidate) =>
      candidate.components.some((component) => component.kind === 'venue-hero' && component.content.media)
    );
    const hero = page.components.find((component) => component.kind === 'venue-hero' && component.content.media);
    const nodeId = 'component:' + hero.id;
    const baseline = serializeV2DeploymentAgnosticVenueSource(source);
    const treatment = JSON.stringify(hero.content.media.treatment);

    const proposal = proposeV2ImportLocalHeroMedia(
      session,
      importMediaCommand(session, nodeId, referenceId + ' imported local hero'),
    );

    assert.equal(session.draftDigest, session.baselineDigest, referenceId);
    assert.equal(proposal.command.type, IMPORT_LOCAL_HERO_MEDIA, referenceId);
    assert.equal(proposal.resolvedTarget.assetWasAdded, true, referenceId);
    assert.equal(proposal.resolvedTarget.mediaType, 'image/png', referenceId);
    assert.equal(proposal.resolvedTarget.width, 1, referenceId);
    assert.equal(proposal.resolvedTarget.height, 1, referenceId);
    assert.match(proposal.resolvedTarget.digestSha256, /^[0-9a-f]{64}$/, referenceId);
    assert.equal(
      proposal.resolvedTarget.assetId,
      'local-image-' + proposal.resolvedTarget.digestSha256,
      referenceId,
    );
    assert.equal(
      proposal.resolvedTarget.assetSrc,
      '/venue-assets/media-' + proposal.resolvedTarget.digestSha256.slice(0, 20) + '.png',
      referenceId,
    );

    const previewAsset = proposal.previewSource.media.assets.find(
      (asset) => asset.id === proposal.resolvedTarget.assetId,
    );
    assert.deepEqual(previewAsset, {
      id: proposal.resolvedTarget.assetId,
      src: proposal.resolvedTarget.assetSrc,
      width: 1,
      height: 1,
    }, referenceId);
    assert.equal(proposal.previewSource.media.assets.length, source.media.assets.length + 1, referenceId);

    const previewHero = proposal.previewSource.site.pages
      .find((candidate) => candidate.id === page.id).components
      .find((component) => component.id === hero.id);
    assert.equal(previewHero.content.media.assetId, previewAsset.id, referenceId);
    assert.equal(previewHero.content.media.alt, referenceId + ' imported local hero', referenceId);
    assert.equal(previewHero.content.media.decorative, false, referenceId);
    assert.equal(JSON.stringify(previewHero.content.media.treatment), treatment, referenceId);

    const applied = applyV2AuthoringProposal(session, proposal);
    assert.equal(applied.history[0].inverseCommand.removeImportedAsset, true, referenceId);
    assert.equal(applied.history[0].inverseCommand.restoreAssetId, hero.content.media.assetId, referenceId);
    const undone = undoV2AuthoringSession(applied);
    assert.equal(serializeV2DeploymentAgnosticVenueSource(undone.draftSource), baseline, referenceId);
    assert.equal(
      undone.draftSource.media.assets.some((asset) => asset.id === previewAsset.id),
      false,
      referenceId,
    );
    const redone = redoV2AuthoringSession(undone);
    assert.equal(redone.draftDigest, applied.draftDigest, referenceId);
    assert.equal(
      redone.draftSource.media.assets.filter((asset) => asset.id === previewAsset.id).length,
      1,
      referenceId,
    );
  }
});

test('repeated identical local bytes reuse the derived asset and preserve exact two-step undo redo', () => {
  const source = REFERENCE_FACTORIES.restaurant();
  const firstSession = createV2AuthoringSession(source);
  const page = source.site.pages.find((candidate) =>
    candidate.components.some((component) => component.kind === 'venue-hero' && component.content.media)
  );
  const hero = page.components.find((component) => component.kind === 'venue-hero' && component.content.media);
  const nodeId = 'component:' + hero.id;

  const firstProposal = proposeV2ImportLocalHeroMedia(
    firstSession,
    importMediaCommand(firstSession, nodeId, 'First imported description'),
  );
  const firstApplied = applyV2AuthoringProposal(firstSession, firstProposal);
  const importedId = firstProposal.resolvedTarget.assetId;

  const secondProposal = proposeV2ImportLocalHeroMedia(
    firstApplied,
    importMediaCommand(firstApplied, nodeId, 'Second imported description'),
  );
  assert.equal(secondProposal.resolvedTarget.assetId, importedId);
  assert.equal(secondProposal.resolvedTarget.assetWasAdded, false);
  assert.equal(
    secondProposal.previewSource.media.assets.filter((asset) => asset.id === importedId).length,
    1,
  );

  const secondApplied = applyV2AuthoringProposal(firstApplied, secondProposal);
  assert.equal(secondApplied.history[1].inverseCommand.removeImportedAsset, false);
  const undoSecond = undoV2AuthoringSession(secondApplied);
  assert.equal(
    undoSecond.draftSource.media.assets.filter((asset) => asset.id === importedId).length,
    1,
  );
  assert.equal(
    undoSecond.draftSource.site.pages.find((candidate) => candidate.id === page.id)
      .components.find((component) => component.id === hero.id).content.media.alt,
    'First imported description',
  );

  const undoFirst = undoV2AuthoringSession(undoSecond);
  assert.equal(
    serializeV2DeploymentAgnosticVenueSource(undoFirst.draftSource),
    serializeV2DeploymentAgnosticVenueSource(source),
  );
  assert.equal(undoFirst.draftSource.media.assets.some((asset) => asset.id === importedId), false);

  const redoFirst = redoV2AuthoringSession(undoFirst);
  const redoSecond = redoV2AuthoringSession(redoFirst);
  assert.equal(redoSecond.draftDigest, secondApplied.draftDigest);
  assert.equal(
    redoSecond.draftSource.media.assets.filter((asset) => asset.id === importedId).length,
    1,
  );
});

test('local hero media import rejects forged derived authority malformed bytes stale state and accessibility misuse', () => {
  const source = REFERENCE_FACTORIES.restaurant();
  const session = createV2AuthoringSession(source);
  const page = source.site.pages.find((candidate) =>
    candidate.components.some((component) => component.kind === 'venue-hero' && component.content.media)
  );
  const hero = page.components.find((component) => component.kind === 'venue-hero' && component.content.media);
  const nodeId = 'component:' + hero.id;
  const valid = importMediaCommand(session, nodeId, 'Imported dining room');

  const rejected = [
    { ...valid, expectedDraftDigest: '0'.repeat(64) },
    { ...valid, bytesBase64: Buffer.from('not an image').toString('base64') },
    { ...valid, bytesBase64: valid.bytesBase64.replace(/=$/, '') },
    { ...valid, target: { nodeId: 'component:home-gallery' } },
    { ...valid, slot: 'gallery-item' },
    { ...valid, decorative: true, alt: 'must be null' },
    { ...valid, decorative: false, alt: '' },
    { ...valid, assetId: 'browser-owned-id' },
    { ...valid, src: '/browser-owned.png' },
    { ...valid, width: 100 },
    { ...valid, height: 100 },
    { ...valid, mediaType: 'image/png' },
    { ...valid, digestSha256: '0'.repeat(64) },
    { ...valid, treatment: { fit: 'contain' } },
  ];
  for (const command of rejected) {
    assert.throws(
      () => proposeV2ImportLocalHeroMedia(session, command),
      V2AuthoringTransactionError,
    );
    assert.equal(session.draftDigest, session.baselineDigest);
  }

  const decorative = proposeV2ImportLocalHeroMedia(session, {
    ...valid,
    alt: null,
    decorative: true,
  });
  const decoratedHero = decorative.previewSource.site.pages
    .find((candidate) => candidate.id === page.id).components
    .find((component) => component.id === hero.id);
  assert.equal(decoratedHero.content.media.alt, null);
  assert.equal(decoratedHero.content.media.decorative, true);
});

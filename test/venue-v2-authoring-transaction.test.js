'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applyV2AuthoringProposal,
  createV2AuthoringSession,
  discardV2AuthoringProposal,
  proposeV2SetField,
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
    /proposal digest binding is invalid/,
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

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  ADD_ACTIVITY,
  BEFORE_ACTIVITY_REFERENCE,
  END_OF_ACTIVITY_LIST,
  MOVE_ACTIVITY_REFERENCE,
  REMOVE_ACTIVITY,
  SET_ACTIVITY_ACCESS,
  SET_ACTIVITY_LIFECYCLE,
  SET_ACTIVITY_PRESENCE,
  SET_ACTIVITY_TEMPORAL,
  SET_ACTIVITY_TEXT,
  applyV3ActivityAuthoringProposal,
  createV3ActivityAuthoringSession,
  proposeV3ActivityAuthoringCommand,
  redoV3ActivityAuthoringSession,
  undoV3ActivityAuthoringSession,
} = require('../src/venue/v3/authoring-transaction');
const {
  deriveV3DeploymentAgnosticVenueSourceDigest,
  serializeV3DeploymentAgnosticVenueSource,
} = require('../src/venue/v3/source');
const {
  renderV3Route,
} = require('../src/venue/v3/renderer');
const {
  V3_PERSISTED_SOURCE_ABSENT,
  atomicSaveV3DeploymentAgnosticVenueSourceFile,
  loadV3DeploymentAgnosticVenueSourceFile,
} = require('../src/venue/v3/source-file');
const {
  migratedPhysicalReference,
  nativeCreatorSource,
  nativeReleaseSource,
} = require('./support/v3-reference-fixtures');

function firstList(source) {
  for (const page of source.site.pages) {
    const component = page.components.find((candidate) => candidate.kind === 'activity-list');
    if (component) return component;
  }
  throw new Error('fixture has no activity-list');
}

function command(session, type, fields = {}) {
  return {
    schemaVersion: 1,
    type,
    expectedDraftDigest: session.draftDigest,
    ...fields,
  };
}

function preview(session, type, fields = {}) {
  return proposeV3ActivityAuthoringCommand(session, command(session, type, fields));
}

function apply(session, type, fields = {}) {
  return applyV3ActivityAuthoringProposal(session, preview(session, type, fields));
}

function activityTarget(activityId) {
  return { activityId };
}

function canonical(source) {
  return serializeV3DeploymentAgnosticVenueSource(source);
}

function saveAndReopenExact(source, label) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `hivenues-v3-${label}-`));
  const filename = path.join(workspace, 'venue-source-v3.json');
  try {
    const saved = atomicSaveV3DeploymentAgnosticVenueSourceFile(filename, source, {
      expectedDigest: V3_PERSISTED_SOURCE_ABSENT,
    });
    const reopened = loadV3DeploymentAgnosticVenueSourceFile(filename);
    assert.equal(canonical(reopened), canonical(source), label);
    assert.equal(
      deriveV3DeploymentAgnosticVenueSourceDigest(reopened),
      saved.persistedDigest,
      label,
    );
    return saved.persistedDigest;
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

test('S2 R1 physical-host journey creates, edits, reorders, undo/redoes and save/reopens one exact v3 draft', () => {
  const { source, legacyEventRoutes } = migratedPhysicalReference();
  const list = firstList(source);
  const anchorId = list.content.resourceIds[0];
  let session = createV3ActivityAuthoringSession(source);

  const addProposal = preview(session, ADD_ACTIVITY, {
    target: { componentId: list.id },
    title: 'Physical S2 Qualification Activity',
    description: 'Initial physical-host S2 qualification activity.',
    lifecycle: 'DRAFT',
    temporal: {
      kind: 'OCCURRENCE',
      startAt: '2026-12-12T18:00:00-08:00',
      endAt: '2026-12-12T20:00:00-08:00',
    },
    presence: { kind: 'PHYSICAL_HOST_DEFAULT' },
    access: { note: null, capacity: 'AVAILABLE' },
    destination: { kind: END_OF_ACTIVITY_LIST },
  });
  const createdId = addProposal.resolvedTarget.activityId;
  const createdSlug = addProposal.resolvedTarget.slug;
  session = applyV3ActivityAuthoringProposal(session, addProposal);

  let created = session.draftSource.resources.activities.find((activity) => activity.id === createdId);
  assert.equal(created.presence.kind, 'PHYSICAL_HOST_DEFAULT');
  assert.equal(created.id, createdSlug);

  session = apply(session, SET_ACTIVITY_TEXT, {
    target: activityTarget(createdId),
    field: 'description',
    value: 'Edited physical-host S2 qualification activity.',
  });
  session = apply(session, SET_ACTIVITY_LIFECYCLE, {
    target: activityTarget(createdId),
    lifecycle: 'LIVE',
  });
  session = apply(session, SET_ACTIVITY_ACCESS, {
    target: activityTarget(createdId),
    access: { note: 'Limited capacity at the host.', capacity: 'FULL' },
  });

  const beforeMove = session;
  session = apply(session, MOVE_ACTIVITY_REFERENCE, {
    target: { componentId: list.id },
    activityId: createdId,
    destination: { kind: BEFORE_ACTIVITY_REFERENCE, beforeActivityId: anchorId },
  });
  assert.equal(firstList(session.draftSource).content.resourceIds[0], createdId);

  created = session.draftSource.resources.activities.find((activity) => activity.id === createdId);
  assert.equal(created.id, createdId);
  assert.equal(created.slug, createdSlug);
  assert.equal(created.lifecycle, 'LIVE');
  assert.deepEqual(created.access, { note: 'Limited capacity at the host.', capacity: 'FULL' });

  const undone = undoV3ActivityAuthoringSession(session);
  assert.equal(canonical(undone.draftSource), canonical(beforeMove.draftSource));
  const redone = redoV3ActivityAuthoringSession(undone);
  assert.equal(canonical(redone.draftSource), canonical(session.draftSource));

  const detail = renderV3Route(redone.draftSource, `/activities/${createdSlug}`, { legacyEventRoutes });
  assert.match(detail, /Edited physical-host S2 qualification activity/);
  assert.match(detail, /Live now/);
  assert.match(detail, /Limited capacity at the host/);

  const legacyPath = Object.keys(legacyEventRoutes)[0];
  assert.ok(legacyPath);
  assert.doesNotThrow(() => renderV3Route(redone.draftSource, legacyPath, { legacyEventRoutes }));
  saveAndReopenExact(redone.draftSource, 'r1-physical');
});

test('S2 R2 locationless creator journey edits typed destinations and temporal form without physical fabrication, then undo/redoes and save/reopens', () => {
  const source = nativeCreatorSource();
  const id = source.resources.activities[0].id;
  let session = createV3ActivityAuthoringSession(source);

  session = apply(session, SET_ACTIVITY_PRESENCE, {
    target: activityTarget(id),
    presence: {
      kind: 'ONLINE',
      destinations: [{
        id: 'watch-live',
        label: 'Watch the updated stream',
        href: 'https://stream.example/live-session-one-updated',
      }],
    },
  });
  const beforeTemporal = session;
  session = apply(session, SET_ACTIVITY_TEMPORAL, {
    target: activityTarget(id),
    temporal: { kind: 'RELEASE', releaseAt: '2026-10-06T09:00:00-07:00' },
  });

  const activity = session.draftSource.resources.activities[0];
  assert.equal(session.draftSource.venue.business, null);
  assert.equal(activity.presence.kind, 'ONLINE');
  assert.deepEqual(activity.presence.destinations, [{
    id: 'watch-live',
    label: 'Watch the updated stream',
    href: 'https://stream.example/live-session-one-updated',
  }]);
  assert.deepEqual(activity.temporal, {
    kind: 'RELEASE',
    releaseAt: '2026-10-06T09:00:00-07:00',
  });
  assert.equal(Object.hasOwn(activity.temporal, 'startAt'), false);
  assert.equal(Object.hasOwn(activity.temporal, 'endAt'), false);

  const undone = undoV3ActivityAuthoringSession(session);
  assert.equal(canonical(undone.draftSource), canonical(beforeTemporal.draftSource));
  const redone = redoV3ActivityAuthoringSession(undone);
  assert.equal(canonical(redone.draftSource), canonical(session.draftSource));
  saveAndReopenExact(redone.draftSource, 'r2-creator');
});

test('S2 R3 release journey transitions RELEASE to WINDOW while preserving NONE presence, then undo/redoes and save/reopens', () => {
  const source = nativeReleaseSource();
  const id = source.resources.activities[0].id;
  let session = createV3ActivityAuthoringSession(source);

  session = apply(session, SET_ACTIVITY_TEMPORAL, {
    target: activityTarget(id),
    temporal: {
      kind: 'WINDOW',
      startAt: '2026-11-14T09:00:00-08:00',
      endAt: '2026-11-14T18:00:00-08:00',
    },
  });
  const afterWindow = session;
  const activity = session.draftSource.resources.activities[0];
  assert.deepEqual(activity.temporal, {
    kind: 'WINDOW',
    startAt: '2026-11-14T09:00:00-08:00',
    endAt: '2026-11-14T18:00:00-08:00',
  });
  assert.equal(activity.presence.kind, 'NONE');
  assert.equal(Object.hasOwn(activity.temporal, 'releaseAt'), false);

  const undone = undoV3ActivityAuthoringSession(session);
  assert.deepEqual(undone.draftSource.resources.activities[0].temporal, {
    kind: 'RELEASE',
    releaseAt: '2026-11-14T09:00:00-08:00',
  });
  assert.equal(undone.draftSource.resources.activities[0].presence.kind, 'NONE');
  const redone = redoV3ActivityAuthoringSession(undone);
  assert.equal(canonical(redone.draftSource), canonical(afterWindow.draftSource));
  saveAndReopenExact(redone.draftSource, 'r3-release');
});

test('S2 renderer proof observes explicit list move and removal, preserves unrelated detail route, and removes the deleted route', () => {
  const source = nativeCreatorSource();
  const list = firstList(source);
  const existing = source.resources.activities[0];
  let session = createV3ActivityAuthoringSession(source);

  const added = preview(session, ADD_ACTIVITY, {
    target: { componentId: list.id },
    title: 'Rendered Qualification Activity',
    description: 'Renderer-order qualification activity.',
    lifecycle: 'SCHEDULED',
    temporal: {
      kind: 'OCCURRENCE',
      startAt: '2026-12-20T18:00:00-08:00',
      endAt: null,
    },
    presence: {
      kind: 'ONLINE',
      destinations: [{ id: 'watch-rendered', label: 'Watch', href: 'https://stream.example/rendered' }],
    },
    access: { note: null, capacity: 'AVAILABLE' },
    destination: { kind: END_OF_ACTIVITY_LIST },
  });
  const addedId = added.resolvedTarget.activityId;
  const addedSlug = added.resolvedTarget.slug;
  session = applyV3ActivityAuthoringProposal(session, added);

  const beforeMoveHtml = renderV3Route(session.draftSource, '/');
  assert.ok(beforeMoveHtml.indexOf(existing.title) < beforeMoveHtml.indexOf('Rendered Qualification Activity'));

  session = apply(session, MOVE_ACTIVITY_REFERENCE, {
    target: { componentId: list.id },
    activityId: addedId,
    destination: { kind: BEFORE_ACTIVITY_REFERENCE, beforeActivityId: existing.id },
  });
  const afterMoveHtml = renderV3Route(session.draftSource, '/');
  assert.ok(afterMoveHtml.indexOf('Rendered Qualification Activity') < afterMoveHtml.indexOf(existing.title));
  assert.doesNotThrow(() => renderV3Route(session.draftSource, `/activities/${addedSlug}`));

  session = apply(session, REMOVE_ACTIVITY, { target: activityTarget(addedId) });
  const afterRemoveHtml = renderV3Route(session.draftSource, '/');
  assert.doesNotMatch(afterRemoveHtml, /Rendered Qualification Activity/);
  assert.doesNotThrow(() => renderV3Route(session.draftSource, `/activities/${existing.slug}`));
  assert.throws(
    () => renderV3Route(session.draftSource, `/activities/${addedSlug}`),
    /activity does not exist or is ambiguous/,
  );
});

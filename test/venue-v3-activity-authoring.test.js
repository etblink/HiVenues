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
  discardV3ActivityAuthoringProposal,
  parseV3ActivityAuthoringCommand,
  proposeV3ActivityAuthoringCommand,
  redoV3ActivityAuthoringSession,
  undoV3ActivityAuthoringSession,
} = require('../src/venue/v3/authoring-transaction');
const {
  deriveV3DeploymentAgnosticVenueSourceDigest,
  serializeV3DeploymentAgnosticVenueSource,
  createV3DeploymentAgnosticVenueSource,
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
  REFERENCE_FACTORIES,
  migratedPhysicalReference,
  nativeCreatorSource,
  nativeReleaseSource,
} = require('./support/v3-reference-fixtures');

const ROOT = path.join(__dirname, '..');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function addPayload(session, source, overrides = {}) {
  const list = firstList(source);
  return command(session, ADD_ACTIVITY, {
    target: { componentId: list.id },
    title: 'Live Session One',
    description: 'A newly authored semantic activity.',
    lifecycle: 'DRAFT',
    temporal: {
      kind: 'OCCURRENCE',
      startAt: '2026-12-01T18:00:00-08:00',
      endAt: '2026-12-01T19:00:00-08:00',
    },
    presence: source.venue.business
      ? { kind: 'PHYSICAL_HOST_DEFAULT' }
      : {
        kind: 'ONLINE',
        destinations: [{ id: 'watch-new', label: 'Watch', href: 'https://stream.example/new' }],
      },
    access: { note: null, capacity: 'AVAILABLE' },
    destination: { kind: END_OF_ACTIVITY_LIST },
    ...overrides,
  });
}

function frozenActivityFacts(activity) {
  return {
    id: activity.id,
    slug: activity.slug,
    managedMedia: clone(activity.managedMedia),
    publicActions: clone(activity.publicActions),
    seriesRef: clone(activity.seriesRef),
  };
}

function bindingSnapshot(source) {
  return clone(source.activityBindings);
}

function canonical(source) {
  return serializeV3DeploymentAgnosticVenueSource(source);
}

test('one v3 authoring session/command engine serves migrated physical, native creator and native release sources', () => {
  for (const [name, factory] of Object.entries(REFERENCE_FACTORIES)) {
    const source = factory();
    let session = createV3ActivityAuthoringSession(source);
    assert.equal(session.kind, 'hivenues-v3-activity-authoring-session', name);
    const id = source.resources.activities[0].id;
    session = apply(session, SET_ACTIVITY_LIFECYCLE, {
      target: activityTarget(id),
      lifecycle: source.resources.activities[0].lifecycle === 'LIVE' ? 'SCHEDULED' : 'LIVE',
    });
    assert.equal(session.draftSource.resources.activities[0].lifecycle, 'LIVE', name);
    const undone = undoV3ActivityAuthoringSession(session);
    assert.equal(canonical(undone.draftSource), canonical(source), name);
    const redone = redoV3ActivityAuthoringSession(undone);
    assert.equal(canonical(redone.draftSource), canonical(session.draftSource), name);
  }
});

test('ADD_ACTIVITY derives collision-safe stable identity and inserts only into the selected explicit list', () => {
  const source = nativeCreatorSource();
  const session = createV3ActivityAuthoringSession(source);
  const list = firstList(source);
  const proposal = proposeV3ActivityAuthoringCommand(session, addPayload(session, source, {
    destination: { kind: BEFORE_ACTIVITY_REFERENCE, beforeActivityId: list.content.resourceIds[0] },
  }));
  assert.equal(proposal.resolvedTarget.activityId, 'live-session-one-2');
  assert.equal(proposal.resolvedTarget.slug, 'live-session-one-2');
  assert.deepEqual(firstList(source).content.resourceIds, ['live-session-one']);
  assert.deepEqual(firstList(proposal.previewSource).content.resourceIds, ['live-session-one-2', 'live-session-one']);
  const created = proposal.previewSource.resources.activities.find((activity) => activity.id === 'live-session-one-2');
  assert.deepEqual(created.managedMedia, []);
  assert.deepEqual(created.publicActions, []);
  assert.equal(created.seriesRef, null);
});

test('ordinary text/access/lifecycle edits preserve stable id/slug and frozen activity/provider facts', () => {
  const source = nativeCreatorSource();
  const id = source.resources.activities[0].id;
  const frozen = frozenActivityFacts(source.resources.activities[0]);
  const bindings = bindingSnapshot(source);
  let session = createV3ActivityAuthoringSession(source);
  session = apply(session, SET_ACTIVITY_TEXT, {
    target: activityTarget(id), field: 'title', value: 'Renamed Live Session',
  });
  session = apply(session, SET_ACTIVITY_TEXT, {
    target: activityTarget(id), field: 'description', value: null,
  });
  session = apply(session, SET_ACTIVITY_ACCESS, {
    target: activityTarget(id), access: { note: null, capacity: 'FULL' },
  });
  session = apply(session, SET_ACTIVITY_ACCESS, {
    target: activityTarget(id), access: { note: 'Doors reopen online.', capacity: 'AVAILABLE' },
  });
  session = apply(session, SET_ACTIVITY_TEXT, {
    target: activityTarget(id), field: 'description', value: 'A restored description.',
  });
  const activity = session.draftSource.resources.activities[0];
  assert.deepEqual(frozenActivityFacts(activity), frozen);
  assert.deepEqual(bindingSnapshot(session.draftSource), bindings);
  assert.equal(activity.description, 'A restored description.');
  assert.equal(activity.access.note, 'Doors reopen online.');
});

test('all frozen lifecycle/capacity values parse and invalid values fail closed', () => {
  const source = nativeCreatorSource();
  const session = createV3ActivityAuthoringSession(source);
  const target = activityTarget(source.resources.activities[0].id);
  for (const lifecycle of ['DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED']) {
    assert.equal(parseV3ActivityAuthoringCommand(command(session, SET_ACTIVITY_LIFECYCLE, {
      target, lifecycle,
    })).lifecycle, lifecycle);
  }
  for (const capacity of ['UNSPECIFIED', 'AVAILABLE', 'FULL']) {
    assert.equal(parseV3ActivityAuthoringCommand(command(session, SET_ACTIVITY_ACCESS, {
      target, access: { note: null, capacity },
    })).access.capacity, capacity);
  }
  assert.throws(() => parseV3ActivityAuthoringCommand(command(session, SET_ACTIVITY_LIFECYCLE, {
    target, lifecycle: 'AUTO',
  })), /unsupported lifecycle/);
  assert.throws(() => parseV3ActivityAuthoringCommand(command(session, SET_ACTIVITY_ACCESS, {
    target, access: { note: null, capacity: 'SOLD_OUT' },
  })), /unsupported access capacity/);
});

test('temporal-form transitions are atomic and remove incompatible fields without wall-clock inference', () => {
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
  assert.deepEqual(session.draftSource.resources.activities[0].temporal, {
    kind: 'WINDOW',
    startAt: '2026-11-14T09:00:00-08:00',
    endAt: '2026-11-14T18:00:00-08:00',
  });
  assert.equal(Object.hasOwn(session.draftSource.resources.activities[0].temporal, 'releaseAt'), false);
  session = apply(session, SET_ACTIVITY_TEMPORAL, {
    target: activityTarget(id),
    temporal: { kind: 'OCCURRENCE', startAt: '2026-11-15T20:00:00-08:00', endAt: null },
  });
  assert.deepEqual(session.draftSource.resources.activities[0].temporal, {
    kind: 'OCCURRENCE', startAt: '2026-11-15T20:00:00-08:00', endAt: null,
  });
  assert.equal(session.draftSource.resources.activities[0].presence.kind, 'NONE');
  assert.throws(() => proposeV3ActivityAuthoringCommand(session, command(session, SET_ACTIVITY_TEMPORAL, {
    target: activityTarget(id), temporal: { kind: 'RELEASE' },
  })));
  const implementation = fs.readFileSync(path.join(ROOT, 'src', 'venue', 'v3', 'authoring-transaction.js'), 'utf8');
  assert.doesNotMatch(implementation, /Date\.now|new Date\s*\(/);
});

test('locationless physical presence is rejected and ONLINE/HYBRID destinations remain strict stable-id HTTPS data', () => {
  const source = nativeCreatorSource();
  const id = source.resources.activities[0].id;
  const session = createV3ActivityAuthoringSession(source);
  assert.throws(() => preview(session, SET_ACTIVITY_PRESENCE, {
    target: activityTarget(id), presence: { kind: 'PHYSICAL_HOST_DEFAULT' },
  }), /physical host business facts/);
  const online = preview(session, SET_ACTIVITY_PRESENCE, {
    target: activityTarget(id),
    presence: {
      kind: 'HYBRID',
      destinations: [{ id: 'watch-live', label: 'Updated destination', href: 'https://stream.example/updated' }],
    },
  });
  assert.deepEqual(online.previewSource.resources.activities[0].presence.destinations, [{
    id: 'watch-live', label: 'Updated destination', href: 'https://stream.example/updated',
  }]);
  assert.throws(() => preview(session, SET_ACTIVITY_PRESENCE, {
    target: activityTarget(id),
    presence: { kind: 'ONLINE', destinations: [{ id: 'watch-live', label: 'Unsafe', href: 'http://example.test' }] },
  }));
  assert.throws(() => preview(session, SET_ACTIVITY_PRESENCE, {
    target: activityTarget(id),
    presence: { kind: 'ONLINE', destinations: [{ id: 'watch-live', label: 'One', href: 'https://example.test/a' }, { id: 'watch-live', label: 'Two', href: 'https://example.test/b' }] },
  }), /unique/);
});

test('MOVE_ACTIVITY_REFERENCE changes only explicit list order and rejects self/no-op/missing/cross-list/stale authority', () => {
  const base = clone(nativeCreatorSource());
  const second = clone(base.resources.activities[0]);
  second.id = 'second-session';
  second.slug = 'second-session';
  second.title = 'Second Session';
  base.resources.activities.push(second);
  const list = firstList(base);
  list.content.resourceIds.push(second.id);
  const source = createV3DeploymentAgnosticVenueSource(base);
  let session = createV3ActivityAuthoringSession(source);
  session = apply(session, MOVE_ACTIVITY_REFERENCE, {
    target: { componentId: list.id },
    activityId: second.id,
    destination: { kind: BEFORE_ACTIVITY_REFERENCE, beforeActivityId: source.resources.activities[0].id },
  });
  assert.deepEqual(firstList(session.draftSource).content.resourceIds, [second.id, source.resources.activities[0].id]);
  assert.throws(() => preview(session, MOVE_ACTIVITY_REFERENCE, {
    target: { componentId: list.id }, activityId: second.id,
    destination: { kind: BEFORE_ACTIVITY_REFERENCE, beforeActivityId: second.id },
  }));
  assert.throws(() => preview(session, MOVE_ACTIVITY_REFERENCE, {
    target: { componentId: list.id }, activityId: second.id,
    destination: { kind: BEFORE_ACTIVITY_REFERENCE, beforeActivityId: 'missing-activity' },
  }));
  assert.throws(() => proposeV3ActivityAuthoringCommand(session, {
    ...command(session, MOVE_ACTIVITY_REFERENCE, {
      target: { componentId: list.id }, activityId: second.id,
      destination: { kind: END_OF_ACTIVITY_LIST },
    }),
    expectedDraftDigest: deriveV3DeploymentAgnosticVenueSourceDigest(source),
  }), /stale/);
  assert.throws(() => preview(session, MOVE_ACTIVITY_REFERENCE, {
    target: { componentId: 'missing-list' }, activityId: second.id,
    destination: { kind: END_OF_ACTIVITY_LIST },
  }));
});

test('REMOVE_ACTIVITY removes every reference and exact Undo/Redo restores resource and former list positions', () => {
  const base = clone(nativeCreatorSource());
  const list = firstList(base);
  const secondList = clone(list);
  secondList.id = 'second-activity-list';
  base.site.pages[0].components.push(secondList);
  const source = createV3DeploymentAgnosticVenueSource(base);
  const id = source.resources.activities[0].id;
  let session = createV3ActivityAuthoringSession(source);
  session = apply(session, REMOVE_ACTIVITY, { target: activityTarget(id) });
  assert.equal(session.draftSource.resources.activities.some((activity) => activity.id === id), false);
  for (const page of session.draftSource.site.pages) {
    for (const component of page.components.filter((item) => item.kind === 'activity-list')) {
      assert.equal(component.content.resourceIds.includes(id), false);
    }
  }
  const undone = undoV3ActivityAuthoringSession(session);
  assert.equal(canonical(undone.draftSource), canonical(source));
  const redone = redoV3ActivityAuthoringSession(undone);
  assert.equal(canonical(redone.draftSource), canonical(session.draftSource));
});

test('public command boundary rejects internal restore authority, arbitrary paths, unknown keys and raw objects', () => {
  const source = nativeCreatorSource();
  const session = createV3ActivityAuthoringSession(source);
  assert.throws(() => parseV3ActivityAuthoringCommand(command(session, 'RESTORE_ACTIVITY', {
    resourceIndex: 0, activitySnapshot: {}, listSnapshots: [],
  })), /unsupported command type/);
  assert.throws(() => parseV3ActivityAuthoringCommand({
    ...command(session, SET_ACTIVITY_TEXT, {
      target: activityTarget(source.resources.activities[0].id), field: 'title', value: 'Fine',
    }),
    path: '/resources/activities/0/publicActions',
  }), /unsupported keys/);
  assert.throws(() => parseV3ActivityAuthoringCommand(command(session, SET_ACTIVITY_TEXT, {
    target: activityTarget(source.resources.activities[0].id), field: 'publicActions', value: 'forbidden',
  })), /unsupported activity text field/);
});

test('Preview, Apply and Discard bind exact accepted state; stale commands fail without mutation', () => {
  const source = nativeCreatorSource();
  const initial = createV3ActivityAuthoringSession(source);
  const id = source.resources.activities[0].id;
  const proposal = preview(initial, SET_ACTIVITY_TEXT, {
    target: activityTarget(id), field: 'title', value: 'Preview Only',
  });
  assert.equal(canonical(initial.draftSource), canonical(source));
  assert.equal(initial.history.length, 0);
  const discarded = discardV3ActivityAuthoringProposal(initial, proposal);
  assert.equal(canonical(discarded.draftSource), canonical(source));
  assert.equal(discarded.draftDigest, initial.draftDigest);
  const applied = applyV3ActivityAuthoringProposal(initial, proposal);
  assert.equal(applied.history.length, 1);
  assert.equal(applied.historyIndex, 1);
  assert.equal(applied.draftSource.resources.activities[0].title, 'Preview Only');
  assert.throws(() => proposeV3ActivityAuthoringCommand(applied, proposal.command), /stale/);
  assert.equal(applied.draftSource.resources.activities[0].title, 'Preview Only');
});

test('Undo/Redo are canonical-byte exact, forged history fails closed and Apply-after-Undo truncates redo', () => {
  const source = nativeCreatorSource();
  const id = source.resources.activities[0].id;
  let session = createV3ActivityAuthoringSession(source);
  session = apply(session, SET_ACTIVITY_TEXT, {
    target: activityTarget(id), field: 'title', value: 'First Edit',
  });
  const afterFirst = session;
  session = apply(session, SET_ACTIVITY_LIFECYCLE, {
    target: activityTarget(id), lifecycle: 'LIVE',
  });
  const afterSecond = session;
  const undone = undoV3ActivityAuthoringSession(afterSecond);
  assert.equal(canonical(undone.draftSource), canonical(afterFirst.draftSource));
  assert.equal(undone.draftDigest, afterFirst.draftDigest);
  const redone = redoV3ActivityAuthoringSession(undone);
  assert.equal(canonical(redone.draftSource), canonical(afterSecond.draftSource));

  const forged = clone(afterSecond);
  forged.history[0].afterDigest = '0'.repeat(64);
  assert.throws(() => undoV3ActivityAuthoringSession(forged), /binding|continuity/);

  const branched = apply(undone, SET_ACTIVITY_ACCESS, {
    target: activityTarget(id), access: { note: null, capacity: 'FULL' },
  });
  assert.equal(branched.history.length, 2);
  assert.equal(branched.historyIndex, 2);
  assert.equal(branched.canRedo, false);
  assert.equal(branched.history[1].command.type, SET_ACTIVITY_ACCESS);
});

test('valid previews and accepted drafts remain renderer-compatible; list order, routes and legacy mapping stay explicit', () => {
  const { source: physical, legacyEventRoutes } = migratedPhysicalReference();
  let physicalSession = createV3ActivityAuthoringSession(physical);
  const existing = physical.resources.activities[0];
  physicalSession = apply(physicalSession, SET_ACTIVITY_TEXT, {
    target: activityTarget(existing.id), field: 'title', value: 'Renderer Updated Title',
  });
  const detail = renderV3Route(physicalSession.draftSource, `/activities/${existing.slug}`, { legacyEventRoutes });
  assert.match(detail, /Renderer Updated Title/);
  const legacyPath = Object.keys(legacyEventRoutes).find((route) => legacyEventRoutes[route] === existing.id);
  assert.ok(legacyPath);
  assert.match(renderV3Route(physicalSession.draftSource, legacyPath, { legacyEventRoutes }), /Renderer Updated Title/);

  const creator = nativeCreatorSource();
  let creatorSession = createV3ActivityAuthoringSession(creator);
  const addProposal = proposeV3ActivityAuthoringCommand(creatorSession, addPayload(creatorSession, creator, {
    title: 'Brand New Native Activity',
  }));
  assert.match(renderV3Route(addProposal.previewSource, '/activities/brand-new-native-activity'), /Brand New Native Activity/);
  assert.throws(() => renderV3Route(addProposal.previewSource, '/events/brand-new-native-activity', { legacyEventRoutes: {} }), /not bound/);
  creatorSession = applyV3ActivityAuthoringProposal(creatorSession, addProposal);
  assert.match(renderV3Route(creatorSession.draftSource, '/activities/brand-new-native-activity'), /Brand New Native Activity/);
});

test('preview/discard perform no disk writes and core authoring executes with network access fail-fast', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-v3-authoring-'));
  const filename = path.join(workspace, 'venue-source-v3.json');
  const source = nativeCreatorSource();
  try {
    const saved = atomicSaveV3DeploymentAgnosticVenueSourceFile(filename, source, {
      expectedDigest: V3_PERSISTED_SOURCE_ABSENT,
    });
    const beforeBytes = fs.readFileSync(filename, 'utf8');
    const originalFetch = global.fetch;
    let fetchCalls = 0;
    global.fetch = () => { fetchCalls += 1; throw new Error('network forbidden'); };
    try {
      const session = createV3ActivityAuthoringSession(source);
      const proposal = preview(session, SET_ACTIVITY_TEXT, {
        target: activityTarget(source.resources.activities[0].id),
        field: 'title', value: 'No Disk Preview',
      });
      const discarded = discardV3ActivityAuthoringProposal(session, proposal);
      assert.equal(discarded.draftDigest, session.draftDigest);
      assert.equal(fs.readFileSync(filename, 'utf8'), beforeBytes);
      assert.equal(fetchCalls, 0);

      const applied = applyV3ActivityAuthoringProposal(session, proposal);
      const persisted = atomicSaveV3DeploymentAgnosticVenueSourceFile(filename, applied.draftSource, {
        expectedDigest: saved.persistedDigest,
      });
      const reopened = loadV3DeploymentAgnosticVenueSourceFile(filename);
      assert.equal(deriveV3DeploymentAgnosticVenueSourceDigest(reopened), persisted.persistedDigest);
      assert.equal(fetchCalls, 0);
    } finally {
      global.fetch = originalFetch;
    }
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  ADD_ACTIVITY_MANAGED_MEDIA,
  ADD_ACTIVITY_PUBLIC_ACTION,
  BEFORE_MANAGED_MEDIA,
  BEFORE_PUBLIC_ACTION,
  END_OF_MANAGED_MEDIA,
  END_OF_PUBLIC_ACTIONS,
  MOVE_ACTIVITY_MANAGED_MEDIA,
  MOVE_ACTIVITY_PUBLIC_ACTION,
  REMOVE_ACTIVITY_MANAGED_MEDIA,
  REMOVE_ACTIVITY_PUBLIC_ACTION,
  SET_ACTIVITY_PUBLIC_ACTION,
  applyV3ActivityAuthoringProposal,
  createV3ActivityAuthoringSession,
  discardV3ActivityAuthoringProposal,
  parseV3ActivityAuthoringCommand,
  proposeV3ActivityAuthoringCommand,
  redoV3ActivityAuthoringSession,
  undoV3ActivityAuthoringSession,
} = require('../src/venue/v3/authoring-transaction');
const {
  V3_ACTIVITY_PUBLIC_ACTION_ROLES,
  V3_NATIVE_ACTIVITY_PUBLIC_ACTION_ROLES,
  createV3DeploymentAgnosticVenueSource,
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
  REFERENCE_FACTORIES,
  migratedPhysicalReference,
  nativeCreatorSource,
  nativeReleaseSource,
} = require('./support/v3-reference-fixtures');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonical(source) {
  return serializeV3DeploymentAgnosticVenueSource(source);
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

function actionTarget(activityId, actionId) {
  return { activityId, actionId };
}

function mediaTarget(activityId, assetId, role = 'PROMO') {
  return { activityId, assetId, role };
}

function withManagedAssets(source, ids = ['promo-one', 'promo-two']) {
  const candidate = clone(source);
  for (const [index, id] of ids.entries()) {
    candidate.media.assets.push({
      id,
      src: `/media/${id}.jpg`,
      width: 1200 + index,
      height: 800 + index,
    });
  }
  return createV3DeploymentAgnosticVenueSource(candidate);
}

function bindingSnapshot(source) {
  return clone(source.activityBindings);
}

function firstActivity(source) {
  return source.resources.activities[0];
}

test('v3 source admits the frozen native semantic action roles plus explicit legacy provenance only', () => {
  assert.deepEqual(V3_NATIVE_ACTIVITY_PUBLIC_ACTION_ROLES, [
    'INFO', 'TICKETS', 'RSVP', 'RESERVE', 'WATCH', 'LISTEN', 'CALENDAR',
  ]);
  assert.deepEqual(V3_ACTIVITY_PUBLIC_ACTION_ROLES, [
    'LEGACY_EXTERNAL', 'INFO', 'TICKETS', 'RSVP', 'RESERVE', 'WATCH', 'LISTEN', 'CALENDAR',
  ]);

  for (const role of V3_ACTIVITY_PUBLIC_ACTION_ROLES) {
    const candidate = clone(nativeCreatorSource());
    candidate.resources.activities[0].publicActions = [{
      id: `action:live-session-one:${role.toLowerCase()}`,
      role,
      label: `Action ${role}`,
      href: 'https://example.test/action',
    }];
    assert.equal(createV3DeploymentAgnosticVenueSource(candidate).resources.activities[0].publicActions[0].role, role);
  }

  const invalid = clone(nativeCreatorSource());
  invalid.resources.activities[0].publicActions = [{
    id: 'action:live-session-one:pay', role: 'PAY', label: 'Pay', href: 'https://example.test/pay',
  }];
  assert.throws(() => createV3DeploymentAgnosticVenueSource(invalid), /Invalid option|publicActions|role/);
});

test('public command boundary cannot create LEGACY_EXTERNAL, payment semantics, or credential-bearing URLs', () => {
  const source = nativeCreatorSource();
  const session = createV3ActivityAuthoringSession(source);
  const target = activityTarget(firstActivity(source).id);

  assert.throws(() => parseV3ActivityAuthoringCommand(command(session, ADD_ACTIVITY_PUBLIC_ACTION, {
    target,
    role: 'LEGACY_EXTERNAL',
    label: 'Legacy',
    href: 'https://example.test/legacy',
    destination: { kind: END_OF_PUBLIC_ACTIONS },
  })), /native semantic role/);

  assert.throws(() => parseV3ActivityAuthoringCommand(command(session, ADD_ACTIVITY_PUBLIC_ACTION, {
    target,
    role: 'PAY',
    label: 'Pay',
    href: 'https://example.test/pay',
    destination: { kind: END_OF_PUBLIC_ACTIONS },
  })), /native semantic role/);

  assert.throws(() => preview(session, ADD_ACTIVITY_PUBLIC_ACTION, {
    target,
    role: 'WATCH',
    label: 'Watch',
    href: 'https://user:secret@example.test/watch',
    destination: { kind: END_OF_PUBLIC_ACTIONS },
  }), /credential-free HTTPS/);
});

test('native public actions derive collision-safe stable ids, edit without relabeling role, reorder in renderer and round-trip Undo/Redo', () => {
  const source = nativeCreatorSource();
  const activityId = firstActivity(source).id;
  const originalBindings = bindingSnapshot(source);
  let session = createV3ActivityAuthoringSession(source);

  session = apply(session, ADD_ACTIVITY_PUBLIC_ACTION, {
    target: activityTarget(activityId),
    role: 'WATCH', label: 'Watch live', href: 'https://watch.example/live',
    destination: { kind: END_OF_PUBLIC_ACTIONS },
  });
  session = apply(session, ADD_ACTIVITY_PUBLIC_ACTION, {
    target: activityTarget(activityId),
    role: 'WATCH', label: 'Watch replay', href: 'https://watch.example/replay',
    destination: { kind: END_OF_PUBLIC_ACTIONS },
  });
  let actions = firstActivity(session.draftSource).publicActions;
  assert.deepEqual(actions.map((entry) => entry.id), [
    'action:live-session-one:watch',
    'action:live-session-one:watch-2',
  ]);

  session = apply(session, SET_ACTIVITY_PUBLIC_ACTION, {
    target: actionTarget(activityId, 'action:live-session-one:watch'),
    label: 'Watch the live session',
    href: 'https://watch.example/live-updated',
  });
  actions = firstActivity(session.draftSource).publicActions;
  assert.equal(actions[0].id, 'action:live-session-one:watch');
  assert.equal(actions[0].role, 'WATCH');
  assert.equal(firstActivity(session.draftSource).id, activityId);
  assert.equal(firstActivity(session.draftSource).slug, firstActivity(source).slug);
  assert.deepEqual(bindingSnapshot(session.draftSource), originalBindings);

  session = apply(session, MOVE_ACTIVITY_PUBLIC_ACTION, {
    target: actionTarget(activityId, 'action:live-session-one:watch-2'),
    destination: { kind: BEFORE_PUBLIC_ACTION, beforeActionId: 'action:live-session-one:watch' },
  });
  actions = firstActivity(session.draftSource).publicActions;
  assert.deepEqual(actions.map((entry) => entry.id), [
    'action:live-session-one:watch-2',
    'action:live-session-one:watch',
  ]);
  const html = renderV3Route(session.draftSource, '/activities/live-session-one');
  assert.ok(html.indexOf('Watch replay') < html.indexOf('Watch the live session'));
  assert.match(html, /data-action-role="WATCH"/);

  const beforeRemove = canonical(session.draftSource);
  session = apply(session, REMOVE_ACTIVITY_PUBLIC_ACTION, {
    target: actionTarget(activityId, 'action:live-session-one:watch-2'),
  });
  assert.doesNotMatch(renderV3Route(session.draftSource, '/activities/live-session-one'), /Watch replay/);
  const undone = undoV3ActivityAuthoringSession(session);
  assert.equal(canonical(undone.draftSource), beforeRemove);
  const redone = redoV3ActivityAuthoringSession(undone);
  assert.equal(canonical(redone.draftSource), canonical(session.draftSource));
});

test('migrated physical legacy action stays LEGACY_EXTERNAL while typed native action is added beside it', () => {
  const { source, legacyEventRoutes } = migratedPhysicalReference();
  const activity = source.resources.activities.find((entry) => entry.publicActions.length > 0);
  assert.ok(activity, 'migrated physical fixture should include a legacy external action');
  assert.equal(activity.publicActions[0].role, 'LEGACY_EXTERNAL');
  const legacyId = activity.publicActions[0].id;
  let session = createV3ActivityAuthoringSession(source);

  session = apply(session, SET_ACTIVITY_PUBLIC_ACTION, {
    target: actionTarget(activity.id, legacyId),
    label: 'Updated legacy link', href: 'https://legacy.example/updated',
  });
  let current = session.draftSource.resources.activities.find((entry) => entry.id === activity.id);
  assert.equal(current.publicActions.find((entry) => entry.id === legacyId).role, 'LEGACY_EXTERNAL');

  session = apply(session, ADD_ACTIVITY_PUBLIC_ACTION, {
    target: activityTarget(activity.id),
    role: 'TICKETS', label: 'Tickets', href: 'https://tickets.example/show',
    destination: { kind: END_OF_PUBLIC_ACTIONS },
  });
  current = session.draftSource.resources.activities.find((entry) => entry.id === activity.id);
  assert.equal(current.publicActions.at(-1).role, 'TICKETS');
  const html = renderV3Route(session.draftSource, `/activities/${activity.slug}`, { legacyEventRoutes });
  assert.match(html, /Updated legacy link/);
  assert.match(html, /Tickets/);
  assert.match(html, /data-action-role="LEGACY_EXTERNAL"/);
  assert.match(html, /data-action-role="TICKETS"/);
});

test('public action movement rejects self, missing/cross-activity destinations and no-op order', () => {
  const source = nativeCreatorSource();
  const activityId = firstActivity(source).id;
  let session = createV3ActivityAuthoringSession(source);
  session = apply(session, ADD_ACTIVITY_PUBLIC_ACTION, {
    target: activityTarget(activityId), role: 'WATCH', label: 'Watch', href: 'https://example.test/watch',
    destination: { kind: END_OF_PUBLIC_ACTIONS },
  });
  session = apply(session, ADD_ACTIVITY_PUBLIC_ACTION, {
    target: activityTarget(activityId), role: 'INFO', label: 'Info', href: 'https://example.test/info',
    destination: { kind: END_OF_PUBLIC_ACTIONS },
  });
  const watch = 'action:live-session-one:watch';
  const info = 'action:live-session-one:info';
  assert.throws(() => preview(session, MOVE_ACTIVITY_PUBLIC_ACTION, {
    target: actionTarget(activityId, watch),
    destination: { kind: BEFORE_PUBLIC_ACTION, beforeActionId: watch },
  }), /cannot target itself/);
  assert.throws(() => preview(session, MOVE_ACTIVITY_PUBLIC_ACTION, {
    target: actionTarget(activityId, watch),
    destination: { kind: BEFORE_PUBLIC_ACTION, beforeActionId: 'action:elsewhere:info' },
  }), /destination public action does not exist/);
  assert.throws(() => preview(session, MOVE_ACTIVITY_PUBLIC_ACTION, {
    target: actionTarget(activityId, info), destination: { kind: END_OF_PUBLIC_ACTIONS },
  }), /no-op/);
});

test('managed PROMO media references existing assets, preserves explicit renderer order and restores exactly through removal', () => {
  const source = withManagedAssets(nativeCreatorSource());
  const activityId = firstActivity(source).id;
  const originalBindings = bindingSnapshot(source);
  let session = createV3ActivityAuthoringSession(source);

  session = apply(session, ADD_ACTIVITY_MANAGED_MEDIA, {
    target: activityTarget(activityId), assetId: 'promo-one', role: 'PROMO',
    destination: { kind: END_OF_MANAGED_MEDIA },
  });
  session = apply(session, ADD_ACTIVITY_MANAGED_MEDIA, {
    target: activityTarget(activityId), assetId: 'promo-two', role: 'PROMO',
    destination: { kind: BEFORE_MANAGED_MEDIA, beforeAssetId: 'promo-one', beforeRole: 'PROMO' },
  });
  let media = firstActivity(session.draftSource).managedMedia;
  assert.deepEqual(media, [
    { assetId: 'promo-two', role: 'PROMO' },
    { assetId: 'promo-one', role: 'PROMO' },
  ]);
  let html = renderV3Route(session.draftSource, '/activities/live-session-one');
  assert.ok(html.indexOf('/media/promo-two.jpg') < html.indexOf('/media/promo-one.jpg'));
  assert.deepEqual(bindingSnapshot(session.draftSource), originalBindings);

  session = apply(session, MOVE_ACTIVITY_MANAGED_MEDIA, {
    target: mediaTarget(activityId, 'promo-two'),
    destination: { kind: END_OF_MANAGED_MEDIA },
  });
  media = firstActivity(session.draftSource).managedMedia;
  assert.deepEqual(media.map((entry) => entry.assetId), ['promo-one', 'promo-two']);
  html = renderV3Route(session.draftSource, '/activities/live-session-one');
  assert.ok(html.indexOf('/media/promo-one.jpg') < html.indexOf('/media/promo-two.jpg'));

  const beforeRemove = canonical(session.draftSource);
  session = apply(session, REMOVE_ACTIVITY_MANAGED_MEDIA, {
    target: mediaTarget(activityId, 'promo-one'),
  });
  assert.doesNotMatch(renderV3Route(session.draftSource, '/activities/live-session-one'), /promo-one\.jpg/);
  const undone = undoV3ActivityAuthoringSession(session);
  assert.equal(canonical(undone.draftSource), beforeRemove);
  const redone = redoV3ActivityAuthoringSession(undone);
  assert.equal(canonical(redone.draftSource), canonical(session.draftSource));
});

test('managed-media boundary rejects compatibility creation, missing assets, duplicate composite usage, self and no-op moves', () => {
  const source = withManagedAssets(nativeCreatorSource());
  const activityId = firstActivity(source).id;
  let session = createV3ActivityAuthoringSession(source);

  assert.throws(() => parseV3ActivityAuthoringCommand(command(session, ADD_ACTIVITY_MANAGED_MEDIA, {
    target: activityTarget(activityId), assetId: 'promo-one', role: 'PRIMARY_VISUAL_COMPATIBILITY',
    destination: { kind: END_OF_MANAGED_MEDIA },
  })), /PROMO only/);

  assert.throws(() => preview(session, ADD_ACTIVITY_MANAGED_MEDIA, {
    target: activityTarget(activityId), assetId: 'missing-asset', role: 'PROMO',
    destination: { kind: END_OF_MANAGED_MEDIA },
  }), /references missing media/);

  session = apply(session, ADD_ACTIVITY_MANAGED_MEDIA, {
    target: activityTarget(activityId), assetId: 'promo-one', role: 'PROMO',
    destination: { kind: END_OF_MANAGED_MEDIA },
  });
  assert.throws(() => preview(session, ADD_ACTIVITY_MANAGED_MEDIA, {
    target: activityTarget(activityId), assetId: 'promo-one', role: 'PROMO',
    destination: { kind: END_OF_MANAGED_MEDIA },
  }), /duplicate managed media usage/);
  session = apply(session, ADD_ACTIVITY_MANAGED_MEDIA, {
    target: activityTarget(activityId), assetId: 'promo-two', role: 'PROMO',
    destination: { kind: END_OF_MANAGED_MEDIA },
  });
  assert.throws(() => preview(session, MOVE_ACTIVITY_MANAGED_MEDIA, {
    target: mediaTarget(activityId, 'promo-one'),
    destination: { kind: BEFORE_MANAGED_MEDIA, beforeAssetId: 'promo-one', beforeRole: 'PROMO' },
  }), /cannot target itself/);
  assert.throws(() => preview(session, MOVE_ACTIVITY_MANAGED_MEDIA, {
    target: mediaTarget(activityId, 'promo-two'), destination: { kind: END_OF_MANAGED_MEDIA },
  }), /no-op/);
});

test('R1/R2/R3 all use the same action/media session engine without host-specific schema forks', () => {
  for (const [name, factory] of Object.entries(REFERENCE_FACTORIES)) {
    let source = factory();
    if (source.media.assets.length === 0) source = withManagedAssets(source, [`${name.toLowerCase()}-promo`]);
    const activityId = firstActivity(source).id;
    const assetId = source.media.assets[0].id;
    let session = createV3ActivityAuthoringSession(source);
    const role = name === 'nativeRelease' ? 'LISTEN' : name === 'nativeCreator' ? 'WATCH' : 'INFO';
    session = apply(session, ADD_ACTIVITY_PUBLIC_ACTION, {
      target: activityTarget(activityId), role, label: `${role} action`, href: `https://example.test/${name}`,
      destination: { kind: END_OF_PUBLIC_ACTIONS },
    });
    const mediaRole = firstActivity(session.draftSource).managedMedia.some((entry) => entry.assetId === assetId && entry.role === 'PROMO')
      ? null
      : 'PROMO';
    if (mediaRole) {
      session = apply(session, ADD_ACTIVITY_MANAGED_MEDIA, {
        target: activityTarget(activityId), assetId, role: mediaRole,
        destination: { kind: END_OF_MANAGED_MEDIA },
      });
    }
    const html = renderV3Route(session.draftSource, `/activities/${firstActivity(source).slug}`);
    assert.match(html, new RegExp(`${role} action`), name);
    assert.match(html, /v3-activity-media/, name);
    const undone = undoV3ActivityAuthoringSession(session);
    const redone = redoV3ActivityAuthoringSession(undone);
    assert.equal(canonical(redone.draftSource), canonical(session.draftSource), name);
  }
});

test('release action/media authoring preserves RELEASE temporal semantics and NONE presence exactly', () => {
  const source = withManagedAssets(nativeReleaseSource(), ['release-promo']);
  const activityId = firstActivity(source).id;
  let session = createV3ActivityAuthoringSession(source);
  session = apply(session, ADD_ACTIVITY_PUBLIC_ACTION, {
    target: activityTarget(activityId), role: 'LISTEN', label: 'Listen', href: 'https://listen.example/release',
    destination: { kind: END_OF_PUBLIC_ACTIONS },
  });
  session = apply(session, ADD_ACTIVITY_PUBLIC_ACTION, {
    target: activityTarget(activityId), role: 'CALENDAR', label: 'Calendar', href: 'https://calendar.example/release',
    destination: { kind: END_OF_PUBLIC_ACTIONS },
  });
  session = apply(session, ADD_ACTIVITY_MANAGED_MEDIA, {
    target: activityTarget(activityId), assetId: 'release-promo', role: 'PROMO',
    destination: { kind: END_OF_MANAGED_MEDIA },
  });
  const activity = firstActivity(session.draftSource);
  assert.deepEqual(activity.temporal, firstActivity(source).temporal);
  assert.deepEqual(activity.presence, { kind: 'NONE' });
});

test('Preview and Discard have no disk/external effect; accepted S3 state saves and fresh-reopens at the exact digest', () => {
  const source = withManagedAssets(nativeCreatorSource(), ['creator-promo']);
  const activityId = firstActivity(source).id;
  let session = createV3ActivityAuthoringSession(source);
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-v3-s3-'));
  const filename = path.join(workspace, 'venue-source-v3.json');
  let networkAttempts = 0;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    networkAttempts += 1;
    throw new Error('network forbidden');
  };
  try {
    const proposal = preview(session, ADD_ACTIVITY_PUBLIC_ACTION, {
      target: activityTarget(activityId), role: 'WATCH', label: 'Watch', href: 'https://example.test/watch',
      destination: { kind: END_OF_PUBLIC_ACTIONS },
    });
    renderV3Route(proposal.previewSource, '/activities/live-session-one');
    assert.equal(fs.existsSync(filename), false);
    const discarded = discardV3ActivityAuthoringProposal(session, proposal);
    assert.equal(discarded.draftDigest, session.draftDigest);
    assert.equal(fs.existsSync(filename), false);

    session = applyV3ActivityAuthoringProposal(session, proposal);
    session = apply(session, ADD_ACTIVITY_MANAGED_MEDIA, {
      target: activityTarget(activityId), assetId: 'creator-promo', role: 'PROMO',
      destination: { kind: END_OF_MANAGED_MEDIA },
    });
    const saved = atomicSaveV3DeploymentAgnosticVenueSourceFile(filename, session.draftSource, {
      expectedPersistedDigest: V3_PERSISTED_SOURCE_ABSENT,
    });
    assert.equal(saved.digest, session.draftDigest);
    const reopened = loadV3DeploymentAgnosticVenueSourceFile(filename);
    assert.equal(deriveV3DeploymentAgnosticVenueSourceDigest(reopened), session.draftDigest);
    assert.equal(canonical(reopened), canonical(session.draftSource));
    assert.equal(networkAttempts, 0);
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('stale S3 expected digest fails without accepted-session mutation', () => {
  const source = nativeCreatorSource();
  const session = createV3ActivityAuthoringSession(source);
  const activityId = firstActivity(source).id;
  const stale = command(session, ADD_ACTIVITY_PUBLIC_ACTION, {
    target: activityTarget(activityId), role: 'INFO', label: 'Info', href: 'https://example.test/info',
    destination: { kind: END_OF_PUBLIC_ACTIONS },
  });
  stale.expectedDraftDigest = '0'.repeat(64);
  assert.throws(() => proposeV3ActivityAuthoringCommand(session, stale), /stale expected draft digest/);
  assert.equal(canonical(session.draftSource), canonical(source));
});

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const {
  IMPORT_LOCAL_HERO_MEDIA,
  applyV2AuthoringProposal,
  createV2AuthoringSession,
  proposeV2ImportLocalHeroMedia,
} = require('../src/venue/v2/authoring-transaction');
const {
  deriveManagedImage,
  storeManagedImage,
} = require('../src/venue/managed-assets');
const {
  deriveV2DeploymentAgnosticVenueSourceDigest,
  serializeV2DeploymentAgnosticVenueSource,
} = require('../src/venue/v2/source');
const {
  V2_PERSISTED_SOURCE_ABSENT,
  V2_VENUE_SOURCE_FILENAME,
  V2VenueSourceFileError,
  inspectV2DeploymentAgnosticVenueSourceFile,
  loadV2DeploymentAgnosticVenueSourceFile,
} = require('../src/venue/v2/source-file');
const {
  V2WorkspaceCheckpointError,
  inspectV2WorkspaceCheckpoint,
  resolveV2WorkspaceCheckpoint,
  saveV2WorkspaceCheckpoint,
} = require('../src/venue/v2/workspace-checkpoint');
const {
  createTurnkeyWorkspace,
} = require('../src/venue/turnkey-workspace');
const {
  createReferenceV2AuthoringStudioFixture,
  createV2AuthoringStudioWorkspaceFixture,
} = require('./support/v2-authoring-studio-fixture');
const {
  REFERENCE_FACTORIES,
} = require('./support/v2-renderer-fixture');

const LOCAL_IMPORT_PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlOAAAAAASUVORK5CYII=',
  'base64',
);

function answers() {
  return {
    displayName: 'Persistence Fixture',
    id: 'persistence-fixture',
    address: '100 Example Avenue, Testville, NV 89000',
    phone: '(555) 010-1920',
    hours: 'Daily, 10:00 a.m.–10:00 p.m.',
    websiteUrl: 'https://persistence.example/',
    mapUrl: 'https://persistence.example/map',
    communityId: 'hive-654321',
    officialAccount: 'persistvenue',
    threadsContainerAccount: 'persist.threads',
    paymentMerchantAccount: 'persistvenue',
  };
}

function temporaryWorkspace(t) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-v2-checkpoint-'));
  const workspaceDirectory = path.join(parent, 'venue-workspace');
  const created = createTurnkeyWorkspace({ workspaceDirectory, answers: answers() });
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  return created;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function localHeroImport(sourceInput, bytes = LOCAL_IMPORT_PNG_BYTES) {
  let session = createV2AuthoringSession(sourceInput);
  const page = session.draftSource.site.pages.find((candidate) =>
    candidate.components.some(
      (component) => component.kind === 'venue-hero' && component.content.media,
    )
  );
  const hero = page.components.find(
    (component) => component.kind === 'venue-hero' && component.content.media,
  );
  const proposal = proposeV2ImportLocalHeroMedia(session, {
    schemaVersion: 1,
    type: IMPORT_LOCAL_HERO_MEDIA,
    target: { nodeId: 'component:' + hero.id },
    slot: 'hero-media',
    bytesBase64: bytes.toString('base64'),
    alt: 'Persisted venue hero',
    decorative: false,
    expectedDraftDigest: session.draftDigest,
  });
  session = applyV2AuthoringProposal(session, proposal);
  const asset = session.draftSource.media.assets.find(
    (candidate) => candidate.id === proposal.resolvedTarget.assetId,
  );
  return { session, proposal, asset, page, hero, bytes };
}

function sourceRenameFailureFs() {
  const fsImpl = Object.create(fs);
  fsImpl.renameSync = (from, to) => {
    if (path.basename(to) === V2_VENUE_SOURCE_FILENAME) {
      const error = new Error('synthetic source replacement failure');
      error.code = 'EACCES';
      throw error;
    }
    return fs.renameSync(from, to);
  };
  return fsImpl;
}

test('first and subsequent v2 checkpoints coexist with untouched v1 source and require exact persisted baseline', (t) => {
  const workspace = temporaryWorkspace(t);
  const checkpoint = resolveV2WorkspaceCheckpoint(workspace.root);
  const v1Before = fs.readFileSync(workspace.sourceFile);

  const firstSource = REFERENCE_FACTORIES.restaurant();
  const firstDigest = deriveV2DeploymentAgnosticVenueSourceDigest(firstSource);
  const first = saveV2WorkspaceCheckpoint({
    workspaceDirectory: workspace.root,
    sourceInput: firstSource,
    expectedDraftDigest: firstDigest,
    expectedPersistedDigest: V2_PERSISTED_SOURCE_ABSENT,
    mediaBytes: new Map(),
  });

  assert.equal(first.sourceCreated, true);
  assert.equal(first.previousDigest, V2_PERSISTED_SOURCE_ABSENT);
  assert.equal(first.persistedDigest, firstDigest);
  assert.equal(path.basename(checkpoint.v2SourceFile), V2_VENUE_SOURCE_FILENAME);
  assert.deepEqual(fs.readFileSync(workspace.sourceFile), v1Before);
  assert.equal(
    fs.readFileSync(checkpoint.v2SourceFile, 'utf8'),
    serializeV2DeploymentAgnosticVenueSource(firstSource),
  );
  assert.equal(
    serializeV2DeploymentAgnosticVenueSource(
      loadV2DeploymentAgnosticVenueSourceFile(checkpoint.v2SourceFile),
    ),
    serializeV2DeploymentAgnosticVenueSource(firstSource),
  );

  const secondSource = clone(firstSource);
  secondSource.venue.displayName = 'Harbor & Hearth — Saved Revision';
  const secondDigest = deriveV2DeploymentAgnosticVenueSourceDigest(secondSource);
  const second = saveV2WorkspaceCheckpoint({
    workspaceDirectory: workspace.root,
    sourceInput: secondSource,
    expectedDraftDigest: secondDigest,
    expectedPersistedDigest: firstDigest,
    mediaBytes: new Map(),
  });
  assert.equal(second.sourceCreated, false);
  assert.equal(second.previousDigest, firstDigest);
  assert.equal(second.persistedDigest, secondDigest);

  const persistedBeforeStaleAttempt = fs.readFileSync(checkpoint.v2SourceFile);
  assert.throws(
    () => saveV2WorkspaceCheckpoint({
      workspaceDirectory: workspace.root,
      sourceInput: secondSource,
      expectedDraftDigest: secondDigest,
      expectedPersistedDigest: firstDigest,
      mediaBytes: new Map(),
    }),
    (error) =>
      error instanceof V2WorkspaceCheckpointError
      && /persisted v2 source changed/.test(error.message),
  );
  assert.deepEqual(fs.readFileSync(checkpoint.v2SourceFile), persistedBeforeStaleAttempt);
  assert.deepEqual(fs.readFileSync(workspace.sourceFile), v1Before);
});

test('v2 source/checkpoint boundaries reject symlink authority without relying on host symlink privileges', (t) => {
  const workspace = temporaryWorkspace(t);
  const checkpoint = resolveV2WorkspaceCheckpoint(workspace.root);

  const sourceSymlinkFs = Object.create(fs);
  sourceSymlinkFs.lstatSync = (filename) => {
    if (path.resolve(filename) === path.resolve(checkpoint.v2SourceFile)) {
      return {
        size: 0,
        isFile: () => true,
        isDirectory: () => false,
        isSymbolicLink: () => true,
      };
    }
    return fs.lstatSync(filename);
  };
  assert.throws(
    () => inspectV2DeploymentAgnosticVenueSourceFile(
      checkpoint.v2SourceFile,
      { fsImpl: sourceSymlinkFs },
    ),
    (error) => error instanceof V2VenueSourceFileError && /not a symlink/.test(error.message),
  );

  const rootSymlinkFs = Object.create(fs);
  rootSymlinkFs.lstatSync = (filename) => {
    if (path.resolve(filename) === path.resolve(workspace.root)) {
      return {
        isFile: () => false,
        isDirectory: () => true,
        isSymbolicLink: () => true,
      };
    }
    return fs.lstatSync(filename);
  };
  assert.throws(
    () => inspectV2WorkspaceCheckpoint({
      workspaceDirectory: workspace.root,
      fsImpl: rootSymlinkFs,
    }),
    (error) => error instanceof V2WorkspaceCheckpointError && /not a symlink/.test(error.message),
  );
});

test('accepted local hero bytes persist at the exact prederived managed path and identical existing media is reused', (t) => {
  const workspace = temporaryWorkspace(t);
  const imported = localHeroImport(REFERENCE_FACTORIES.restaurant());
  const derived = deriveManagedImage(imported.bytes);
  assert.equal(imported.asset.src, derived.sourcePath);
  assert.equal(imported.asset.id, 'local-image-' + derived.digestSha256);

  const mediaPath = path.join(workspace.assetDirectory, derived.filename);
  assert.equal(fs.existsSync(mediaPath), false);
  const canonicalBefore = serializeV2DeploymentAgnosticVenueSource(imported.session.draftSource);
  const saved = saveV2WorkspaceCheckpoint({
    workspaceDirectory: workspace.root,
    sourceInput: imported.session.draftSource,
    expectedDraftDigest: imported.session.draftDigest,
    expectedPersistedDigest: V2_PERSISTED_SOURCE_ABSENT,
    mediaBytes: new Map([[imported.asset.src, { bytes: imported.bytes }]]),
  });

  assert.deepEqual(saved.createdMediaPaths, [imported.asset.src]);
  assert.deepEqual(saved.reusedMediaPaths, []);
  assert.deepEqual(fs.readFileSync(mediaPath), imported.bytes);
  assert.equal(fs.readFileSync(saved.workspace.v2SourceFile, 'utf8'), canonicalBefore);

  const reused = saveV2WorkspaceCheckpoint({
    workspaceDirectory: workspace.root,
    sourceInput: imported.session.draftSource,
    expectedDraftDigest: imported.session.draftDigest,
    expectedPersistedDigest: imported.session.draftDigest,
    mediaBytes: new Map([[imported.asset.src, { bytes: imported.bytes }]]),
  });
  assert.deepEqual(reused.createdMediaPaths, []);
  assert.deepEqual(reused.reusedMediaPaths, [imported.asset.src]);
  assert.deepEqual(fs.readFileSync(mediaPath), imported.bytes);
  assert.equal(
    serializeV2DeploymentAgnosticVenueSource(imported.session.draftSource),
    canonicalBefore,
  );
});

test('source commit failure removes only media newly created by that Save and preserves pre-existing matching media', (t) => {
  const firstWorkspace = temporaryWorkspace(t);
  const imported = localHeroImport(REFERENCE_FACTORIES.restaurant());
  const derived = deriveManagedImage(imported.bytes);
  const newMediaPath = path.join(firstWorkspace.assetDirectory, derived.filename);
  const sourceBefore = serializeV2DeploymentAgnosticVenueSource(imported.session.draftSource);

  assert.throws(
    () => saveV2WorkspaceCheckpoint({
      workspaceDirectory: firstWorkspace.root,
      sourceInput: imported.session.draftSource,
      expectedDraftDigest: imported.session.draftDigest,
      expectedPersistedDigest: V2_PERSISTED_SOURCE_ABSENT,
      mediaBytes: new Map([[imported.asset.src, { bytes: imported.bytes }]]),
      fsImpl: sourceRenameFailureFs(),
    }),
    (error) => error instanceof V2WorkspaceCheckpointError && /could not save source file/.test(error.message),
  );
  assert.equal(fs.existsSync(newMediaPath), false);
  assert.equal(
    fs.existsSync(path.join(firstWorkspace.root, V2_VENUE_SOURCE_FILENAME)),
    false,
  );
  assert.equal(
    serializeV2DeploymentAgnosticVenueSource(imported.session.draftSource),
    sourceBefore,
  );

  const secondWorkspace = temporaryWorkspace(t);
  const preexisting = storeManagedImage({
    workspaceDirectory: secondWorkspace.root,
    bytes: imported.bytes,
  });
  assert.equal(preexisting.created, true);
  assert.deepEqual(fs.readFileSync(preexisting.filePath), imported.bytes);

  assert.throws(
    () => saveV2WorkspaceCheckpoint({
      workspaceDirectory: secondWorkspace.root,
      sourceInput: imported.session.draftSource,
      expectedDraftDigest: imported.session.draftDigest,
      expectedPersistedDigest: V2_PERSISTED_SOURCE_ABSENT,
      mediaBytes: new Map([[imported.asset.src, { bytes: imported.bytes }]]),
      fsImpl: sourceRenameFailureFs(),
    }),
    (error) => error instanceof V2WorkspaceCheckpointError && /could not save source file/.test(error.message),
  );
  assert.deepEqual(fs.readFileSync(preexisting.filePath), imported.bytes);
  assert.equal(
    fs.existsSync(path.join(secondWorkspace.root, V2_VENUE_SOURCE_FILENAME)),
    false,
  );
});

test('workspace-backed Studio keeps Preview/Discard nonpersistent then saves and reopens the exact accepted scalar draft', async (t) => {
  const workspace = temporaryWorkspace(t);
  const fixture = createReferenceV2AuthoringStudioFixture(
    'restaurant',
    { workspaceDirectory: workspace.root },
  );
  const openingAssetListing = fs.readdirSync(workspace.assetDirectory).sort();
  const source = fixture.session().draftSource;
  const page = source.site.pages.find((candidate) => candidate.id === source.site.homePageId);
  const hero = page.components.find((component) => component.kind === 'venue-hero');
  const nodeId = 'component:' + hero.id;
  const fieldId = 'body';

  let studio = await request(fixture.app)
    .get('/studio-authoring')
    .query({ nodeId, fieldId, viewport: 'desktop' })
    .expect(200);
  assert.match(studio.text, /data-studio-persistent="true"/);
  assert.match(studio.text, /data-studio-persisted="false"/);
  assert.match(studio.text, /No durable v2 checkpoint exists yet/);
  assert.match(studio.text, /Save workspace checkpoint/);

  await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      nodeId,
      fieldId,
      viewport: 'desktop',
      expectedDraftDigest: fixture.session().draftDigest,
      value: 'Preview-only persistence qualification.',
    })
    .expect(303);
  assert.equal(
    fs.existsSync(path.join(workspace.root, V2_VENUE_SOURCE_FILENAME)),
    false,
  );
  assert.deepEqual(fs.readdirSync(workspace.assetDirectory).sort(), openingAssetListing);

  await request(fixture.app)
    .post('/studio-authoring/discard')
    .type('form')
    .send({ nodeId, fieldId, viewport: 'desktop' })
    .expect(303);
  assert.equal(fixture.diagnostics().persistentWrites, 0);
  assert.equal(
    fs.existsSync(path.join(workspace.root, V2_VENUE_SOURCE_FILENAME)),
    false,
  );

  const acceptedDigest = fixture.session().draftDigest;
  await request(fixture.app)
    .post('/studio-authoring/save-workspace')
    .type('form')
    .send({
      nodeId,
      fieldId,
      viewport: 'desktop',
      expectedDraftDigest: acceptedDigest,
      expectedPersistedDigest: V2_PERSISTED_SOURCE_ABSENT,
    })
    .expect(303);
  assert.equal(fixture.persistence().persistedDigest, acceptedDigest);
  assert.equal(fixture.diagnostics().saveSuccesses, 1);
  assert.equal(fixture.diagnostics().persistentWrites, 1);

  studio = await request(fixture.app)
    .get('/studio-authoring')
    .query({ nodeId, fieldId, viewport: 'desktop' })
    .expect(200);
  assert.match(studio.text, /data-studio-persisted="true"/);
  assert.match(studio.text, /Saved workspace checkpoint/);
  assert.match(studio.text, /Workspace saved/);
  assert.match(studio.text, /Workspace checkpoint saved · not published · not deployed/);
  assert.doesNotMatch(studio.text, /Memory only · not saved · not published/);

  const reopened = createV2AuthoringStudioWorkspaceFixture({
    workspaceDirectory: workspace.root,
  });
  assert.equal(reopened.session().draftDigest, acceptedDigest);
  assert.equal(
    serializeV2DeploymentAgnosticVenueSource(reopened.session().draftSource),
    serializeV2DeploymentAgnosticVenueSource(fixture.session().draftSource),
  );
  const reopenedStudio = await request(reopened.app)
    .get('/studio-authoring')
    .query({ nodeId, fieldId, viewport: 'desktop' })
    .expect(200);
  assert.match(reopenedStudio.text, /data-studio-persisted="true"/);
  assert.match(reopenedStudio.text, /Workspace checkpoint saved · not published · not deployed/);
  assert.doesNotMatch(reopenedStudio.text, /Memory only · not saved · not published/);
  assert.equal(reopened.diagnostics().hiveRpcAttempts, 0);
  assert.equal(reopened.diagnostics().hiveWrites, 0);
});

test('workspace-backed Studio imports local hero without disk writes, saves bytes/source, releases ephemeral cache, and reopens renderable media', async (t) => {
  const workspace = temporaryWorkspace(t);
  const fixture = createReferenceV2AuthoringStudioFixture(
    'restaurant',
    { workspaceDirectory: workspace.root },
  );
  const source = fixture.session().draftSource;
  const page = source.site.pages.find((candidate) =>
    candidate.components.some(
      (component) => component.kind === 'venue-hero' && component.content.media,
    )
  );
  const hero = page.components.find(
    (component) => component.kind === 'venue-hero' && component.content.media,
  );
  const nodeId = 'component:' + hero.id;
  const openingListing = fs.readdirSync(workspace.assetDirectory).sort();

  await request(fixture.app)
    .post('/studio-authoring/media-import')
    .query({
      nodeId,
      mediaSlot: 'hero-media',
      decorative: 'false',
      alt: 'Durable imported hero',
      viewport: 'mobile',
      expectedDraftDigest: fixture.session().draftDigest,
    })
    .set('Content-Type', 'image/png')
    .send(LOCAL_IMPORT_PNG_BYTES)
    .expect(204);

  const asset = fixture.proposal().previewSource.media.assets.find(
    (candidate) => candidate.id === fixture.proposal().resolvedTarget.assetId,
  );
  const derived = deriveManagedImage(LOCAL_IMPORT_PNG_BYTES);
  assert.equal(asset.src, derived.sourcePath);
  assert.deepEqual(fs.readdirSync(workspace.assetDirectory).sort(), openingListing);
  assert.equal(fixture.diagnostics().persistentWrites, 0);

  await request(fixture.app)
    .post('/studio-authoring/apply')
    .type('form')
    .send({ nodeId, viewport: 'mobile' })
    .expect(303);
  assert.deepEqual(fs.readdirSync(workspace.assetDirectory).sort(), openingListing);
  assert.equal(fixture.diagnostics().ephemeralMediaEntries, 1);

  await request(fixture.app)
    .post('/studio-authoring/save-workspace')
    .type('form')
    .send({
      nodeId,
      viewport: 'mobile',
      expectedDraftDigest: fixture.session().draftDigest,
      expectedPersistedDigest: V2_PERSISTED_SOURCE_ABSENT,
    })
    .expect(303);

  const mediaPath = path.join(workspace.assetDirectory, derived.filename);
  assert.deepEqual(fs.readFileSync(mediaPath), LOCAL_IMPORT_PNG_BYTES);
  assert.equal(fixture.diagnostics().ephemeralMediaEntries, 0);
  assert.equal(fixture.diagnostics().persistentWrites, 2);
  const durableBytes = await request(fixture.app).get(asset.src).expect(200);
  assert.deepEqual(durableBytes.body, LOCAL_IMPORT_PNG_BYTES);

  const reopened = createV2AuthoringStudioWorkspaceFixture({
    workspaceDirectory: workspace.root,
  });
  assert.equal(reopened.session().draftDigest, fixture.session().draftDigest);
  const reopenedHero = reopened.session().draftSource.site.pages
    .find((candidate) => candidate.id === page.id).components
    .find((component) => component.id === hero.id);
  assert.equal(reopenedHero.content.media.assetId, asset.id);
  const preview = await request(reopened.app)
    .get('/studio-authoring-preview/page/' + page.id)
    .expect(200);
  assert.equal(preview.text.includes(asset.src), true);
  const reopenedBytes = await request(reopened.app).get(asset.src).expect(200);
  assert.deepEqual(reopenedBytes.body, LOCAL_IMPORT_PNG_BYTES);
  assert.equal(reopened.diagnostics().hiveRpcAttempts, 0);
  assert.equal(reopened.diagnostics().hiveWrites, 0);
});

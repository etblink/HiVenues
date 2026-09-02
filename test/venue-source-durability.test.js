'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const {
  bindDeploymentAgnosticVenueSource,
  extractDeploymentAgnosticVenueSource,
  serializeDeploymentAgnosticVenueSource,
} = require('../src/venue/source');
const {
  DEFAULT_VENUE_SOURCE_FILENAME,
  MAX_VENUE_SOURCE_FILE_BYTES,
  VenueSourceFileError,
  loadDeploymentAgnosticVenueSourceFile,
} = require('../src/venue/source-file');
const {
  createOfflineSourceAuthoringSurface,
  createOfflineSourceAuthoringSurfaceFromFile,
  SAFE_SOURCE_SAVE_PENDING,
  venueSourceDownloadPath,
} = require('../src/venue/source-authoring-surface');
const {
  WORKSPACE_FILENAMES,
  buildPortableVenueWorkspace,
} = require('../src/venue/workspace');
const {
  buildPortableVenueWorkspaceFromSource,
} = require('../src/venue/workspace-from-source');
const { HV4_SYNTHETIC_DEPLOYMENT_MANIFEST } = require('./support/hv4-synthetic-bootstrap');
const {
  FOURTH_STREET_AUTHORING_INPUT,
  LANTERN_ROOM_AUTHORING_INPUT,
} = require('./support/hv5-authoring-fixtures');

const root = path.join(__dirname, '..');

function sourceOf(authoring) {
  return extractDeploymentAgnosticVenueSource(authoring);
}

function simpleSurface(sourceInput) {
  const surface = createOfflineSourceAuthoringSurface({
    sourceInput,
    editorPath: '/durability-test',
    renderPreviewHtml: async (projection) =>
      `<!doctype html><html lang="en"><body><h1>${projection.siteName}</h1><p>${projection.venuePackage.home.hero.lede}</p></body></html>`,
  });
  const app = express();
  app.use(surface.router);
  return { app, surface };
}

test('source-file loader accepts canonical saved source and fails closed on invalid or oversized files', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-venues-source-file-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const source = sourceOf(LANTERN_ROOM_AUTHORING_INPUT);
  const canonical = serializeDeploymentAgnosticVenueSource(source);
  const validPath = path.join(dir, DEFAULT_VENUE_SOURCE_FILENAME);
  fs.writeFileSync(validPath, canonical, 'utf8');

  assert.equal(
    serializeDeploymentAgnosticVenueSource(loadDeploymentAgnosticVenueSourceFile(validPath)),
    canonical,
  );

  const invalidPath = path.join(dir, 'invalid.json');
  fs.writeFileSync(invalidPath, '{"deploymentRef":{"id":"should-not-be-here"}}', 'utf8');
  assert.throws(
    () => loadDeploymentAgnosticVenueSourceFile(invalidPath),
    (error) => error instanceof VenueSourceFileError && /source keys|deploymentRef/.test(error.message),
  );

  const oversizedPath = path.join(dir, 'oversized.json');
  fs.writeFileSync(oversizedPath, 'x'.repeat(MAX_VENUE_SOURCE_FILE_BYTES + 1), 'utf8');
  assert.throws(
    () => loadDeploymentAgnosticVenueSourceFile(oversizedPath),
    (error) => error instanceof VenueSourceFileError && /exceeds/.test(error.message),
  );
});

test('offline authoring saves only kept deployment-agnostic source and can reopen the exact saved bytes', async (t) => {
  const { app, surface } = simpleSurface(sourceOf(FOURTH_STREET_AUTHORING_INPUT));
  const editor = await request(app).get(surface.editorPath).expect(200);
  assert.match(editor.text, /Save venue file/);
  assert.match(editor.text, /Keep changes in draft/);
  assert.equal(surface.sourceFilePath, venueSourceDownloadPath(surface.editorPath));

  const acceptedName = surface.session.acceptedSource.venueContext.displayName;
  const editedLede = 'Durable source-file qualification only.';

  await request(app)
    .post(`${surface.editorPath}/proposal`)
    .type('form')
    .send({ pointer: '/venuePackage/home/hero/lede', value: editedLede })
    .expect(303);

  const dirtyEditor = await request(app).get(surface.editorPath).expect(200);
  assert.match(dirtyEditor.text, /Keep changes to save/);
  assert.doesNotMatch(dirtyEditor.text, /class="source-save" href=/);
  const beforeKeep = await request(app).get(surface.sourceFilePath).expect(409);
  assert.equal(beforeKeep.text, SAFE_SOURCE_SAVE_PENDING);

  await request(app).post(`${surface.editorPath}/apply`).expect(303);
  const cleanEditor = await request(app).get(surface.editorPath).expect(200);
  assert.match(cleanEditor.text, /class="source-save" href=/);
  const saved = await request(app).get(surface.sourceFilePath).expect(200);
  assert.match(saved.headers['content-disposition'], /attachment; filename="venue-source\.json"/);
  assert.equal(saved.text, surface.session.canonicalAccepted());
  assert.equal(JSON.parse(saved.text).venueContext.displayName, acceptedName);
  assert.equal(JSON.parse(saved.text).venuePackage.home.hero.lede, editedLede);
  assert.equal(Object.hasOwn(JSON.parse(saved.text), 'deploymentRef'), false);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-venues-source-reopen-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const savedPath = path.join(dir, DEFAULT_VENUE_SOURCE_FILENAME);
  fs.writeFileSync(savedPath, saved.text, 'utf8');

  const reopened = createOfflineSourceAuthoringSurfaceFromFile({
    sourceFilename: savedPath,
    editorPath: '/reopened',
    renderPreviewHtml: async (projection) =>
      `<!doctype html><html lang="en"><body><h1>${projection.siteName}</h1></body></html>`,
  });
  assert.equal(reopened.session.canonicalAccepted(), saved.text);
  assert.equal(reopened.session.acceptedSource.venueContext.displayName, acceptedName);
});

test('workspace bridge preserves upstream source bytes and delegates to the accepted target-bound workspace', () => {
  const venueSource = sourceOf(LANTERN_ROOM_AUTHORING_INPUT);
  const sourceBytesBefore = serializeDeploymentAgnosticVenueSource(venueSource);
  const bound = bindDeploymentAgnosticVenueSource(
    venueSource,
    HV4_SYNTHETIC_DEPLOYMENT_MANIFEST,
  );

  const expected = buildPortableVenueWorkspace({
    authoringDocument: bound,
    deploymentManifest: HV4_SYNTHETIC_DEPLOYMENT_MANIFEST,
  });
  const bridged = buildPortableVenueWorkspaceFromSource({
    venueSource,
    deploymentManifest: HV4_SYNTHETIC_DEPLOYMENT_MANIFEST,
  });

  assert.deepEqual(bridged, expected);
  assert.equal(serializeDeploymentAgnosticVenueSource(venueSource), sourceBytesBefore);
  assert.equal(Object.hasOwn(JSON.parse(sourceBytesBefore), 'deploymentRef'), false);
  assert.equal(
    JSON.parse(bridged.files[WORKSPACE_FILENAMES.authoring]).deploymentRef.id,
    HV4_SYNTHETIC_DEPLOYMENT_MANIFEST.deployment.id,
  );
});

test('source-to-workspace CLI materializes the same canonical workspace without rewriting the source file', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-venues-source-workspace-cli-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const source = sourceOf(LANTERN_ROOM_AUTHORING_INPUT);
  const sourceBytes = serializeDeploymentAgnosticVenueSource(source);
  const sourcePath = path.join(dir, DEFAULT_VENUE_SOURCE_FILENAME);
  const deploymentPath = path.join(dir, 'deployment.json');
  const outputPath = path.join(dir, 'workspace');
  fs.writeFileSync(sourcePath, sourceBytes, 'utf8');
  fs.writeFileSync(
    deploymentPath,
    `${JSON.stringify(HV4_SYNTHETIC_DEPLOYMENT_MANIFEST, null, 2)}\n`,
    'utf8',
  );

  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'scripts', 'build-venue-workspace-from-source.js'),
      sourcePath,
      deploymentPath,
      outputPath,
    ],
    { cwd: root, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(fs.readdirSync(outputPath).sort(), Object.values(WORKSPACE_FILENAMES).sort());
  assert.equal(
    result.stdout,
    fs.readFileSync(path.join(outputPath, WORKSPACE_FILENAMES.manifest), 'utf8'),
  );
  assert.equal(fs.readFileSync(sourcePath, 'utf8'), sourceBytes);
});

test('durability foundation remains outside ordinary production entrypoints', () => {
  for (const relativePath of ['src/app.js', 'src/server.js', 'index.js']) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(
      source,
      /source-file|workspace-from-source|build-venue-workspace-from-source|venue-source\.json/i,
      relativePath,
    );
  }
});

'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { composeVenueBootstrap } = require('../src/venue/bootstrap');
const {
  MAX_VENUE_BOOTSTRAP_BYTES,
  loadVenueRuntimeAdmission,
} = require('../src/venue/runtime-admission');
const {
  PortableVenueWorkspaceError,
  WORKSPACE_FILENAMES,
  buildPortableVenueWorkspace,
} = require('../src/venue/workspace');
const { HV4_SYNTHETIC_DEPLOYMENT_MANIFEST } = require('./support/hv4-synthetic-bootstrap');
const { LANTERN_ROOM_AUTHORING_INPUT } = require('./support/hv5-authoring-fixtures');

const root = path.join(__dirname, '..');

function mutable(value) {
  return JSON.parse(JSON.stringify(value));
}

function reorderObject(value) {
  if (Array.isArray(value)) return value.map(reorderObject);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .reverse()
    .reduce((result, key) => {
      result[key] = reorderObject(value[key]);
      return result;
    }, {});
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

test('portable workspace is deterministic across source object insertion order', () => {
  const normal = buildPortableVenueWorkspace({
    authoringDocument: LANTERN_ROOM_AUTHORING_INPUT,
    deploymentManifest: HV4_SYNTHETIC_DEPLOYMENT_MANIFEST,
  });
  const reordered = buildPortableVenueWorkspace({
    authoringDocument: reorderObject(mutable(LANTERN_ROOM_AUTHORING_INPUT)),
    deploymentManifest: reorderObject(mutable(HV4_SYNTHETIC_DEPLOYMENT_MANIFEST)),
  });

  assert.equal(normal.workspaceId, reordered.workspaceId);
  assert.equal(normal.sourceDigestSha256, reordered.sourceDigestSha256);
  assert.deepEqual(normal.files, reordered.files);
  assert.equal(Object.isFrozen(normal), true);
  assert.equal(Object.isFrozen(normal.manifest), true);
  assert.equal(normal.files[WORKSPACE_FILENAMES.manifest].includes('\r'), false);
});

test('workspace manifest binds every derived payload by exact UTF-8 bytes and SHA-256', () => {
  const workspace = buildPortableVenueWorkspace({
    authoringDocument: LANTERN_ROOM_AUTHORING_INPUT,
    deploymentManifest: HV4_SYNTHETIC_DEPLOYMENT_MANIFEST,
  });
  const manifest = JSON.parse(workspace.files[WORKSPACE_FILENAMES.manifest]);

  assert.equal(manifest.kind, 'hive-venues-portable-workspace');
  assert.equal(manifest.workspaceId, workspace.workspaceId);
  assert.equal(manifest.sourceDigestSha256, workspace.sourceDigestSha256);
  assert.equal(manifest.authority.workspaceManifestRole, 'DERIVED_INSPECTION_RECORD');
  assert.equal(manifest.files.length, 4);

  for (const record of manifest.files) {
    const content = workspace.files[record.path];
    assert.equal(typeof content, 'string', record.path);
    assert.equal(record.bytes, Buffer.byteLength(content, 'utf8'), record.path);
    assert.equal(record.sha256, sha256(content), record.path);
  }

  assert.equal(workspace.files[WORKSPACE_FILENAMES.manifest].includes(process.cwd()), false);
});

test('runtime bootstrap output is directly admissible through the accepted HV-4 and runtime paths', (t) => {
  const workspace = buildPortableVenueWorkspace({
    authoringDocument: LANTERN_ROOM_AUTHORING_INPUT,
    deploymentManifest: HV4_SYNTHETIC_DEPLOYMENT_MANIFEST,
  });
  const bootstrapInput = JSON.parse(workspace.files[WORKSPACE_FILENAMES.bootstrap]);
  const composition = composeVenueBootstrap(bootstrapInput);

  assert.deepEqual(composition.identity, {
    venueId: workspace.identity.venueId,
    packageId: workspace.identity.packageId,
    deploymentId: workspace.identity.deploymentId,
  });
  assert.equal(composition.bootstrapId, workspace.identity.bootstrapId);
  assert.equal(bootstrapInput.bindings.deploymentId, LANTERN_ROOM_AUTHORING_INPUT.deploymentRef.id);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-venues-workspace-admission-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const bootstrapPath = path.join(dir, WORKSPACE_FILENAMES.bootstrap);
  fs.writeFileSync(bootstrapPath, workspace.files[WORKSPACE_FILENAMES.bootstrap], 'utf8');

  const admission = loadVenueRuntimeAdmission(
    { HIVE_VENUE_BOOTSTRAP_PATH: bootstrapPath },
    { loadDotenv: false },
  );
  assert.deepEqual(admission.composition.identity, {
    venueId: workspace.identity.venueId,
    packageId: workspace.identity.packageId,
    deploymentId: workspace.identity.deploymentId,
  });
  assert.equal(admission.composition.bootstrapId, workspace.identity.bootstrapId);
});

test('workspace refuses deployment-reference drift and secret-bearing deployment input', () => {
  const mismatched = mutable(HV4_SYNTHETIC_DEPLOYMENT_MANIFEST);
  mismatched.deployment.id = 'different-deployment';
  assert.throws(
    () => buildPortableVenueWorkspace({
      authoringDocument: LANTERN_ROOM_AUTHORING_INPUT,
      deploymentManifest: mismatched,
    }),
    (error) => error instanceof PortableVenueWorkspaceError && /deployment reference expects/.test(error.message),
  );

  const secretValue = ['portable', 'workspace', 'secret'].join('-');
  const secretBearing = mutable(HV4_SYNTHETIC_DEPLOYMENT_MANIFEST);
  secretBearing.apiKey = secretValue;
  assert.throws(
    () => buildPortableVenueWorkspace({
      authoringDocument: LANTERN_ROOM_AUTHORING_INPUT,
      deploymentManifest: secretBearing,
    }),
    (error) =>
      error instanceof PortableVenueWorkspaceError &&
      /secret-bearing field/.test(error.message) &&
      !error.message.includes(secretValue),
  );
});


test('workspace refuses a runtime bootstrap above the accepted admission byte ceiling', () => {
  const oversized = mutable(HV4_SYNTHETIC_DEPLOYMENT_MANIFEST);
  oversized.region = 'x'.repeat(MAX_VENUE_BOOTSTRAP_BYTES);

  assert.throws(
    () => buildPortableVenueWorkspace({
      authoringDocument: LANTERN_ROOM_AUTHORING_INPUT,
      deploymentManifest: oversized,
    }),
    (error) =>
      error instanceof PortableVenueWorkspaceError &&
      new RegExp(`runtime bootstrap exceeds the ${MAX_VENUE_BOOTSTRAP_BYTES}-byte runtime admission limit`).test(error.message),
  );
});

test('workspace materializer reserves the destination with atomic no-replace mkdir', () => {
  const source = fs.readFileSync(path.join(root, 'scripts', 'build-venue-workspace.js'), 'utf8');
  assert.match(source, /mkdirSync\(outputPath, \{ mode: 0o700 \}\)/);
  assert.doesNotMatch(source, /existsSync\(outputPath\)/);
  assert.doesNotMatch(source, /renameSync\([^)]*outputPath/);
});

test('target-specific deployment changes produce a distinct reproducible workspace', () => {
  const first = buildPortableVenueWorkspace({
    authoringDocument: LANTERN_ROOM_AUTHORING_INPUT,
    deploymentManifest: HV4_SYNTHETIC_DEPLOYMENT_MANIFEST,
  });
  const changedTarget = mutable(HV4_SYNTHETIC_DEPLOYMENT_MANIFEST);
  changedTarget.region = 'Another Fixture Region';
  const second = buildPortableVenueWorkspace({
    authoringDocument: LANTERN_ROOM_AUTHORING_INPUT,
    deploymentManifest: changedTarget,
  });

  assert.notEqual(first.workspaceId, second.workspaceId);
  assert.notEqual(first.sourceDigestSha256, second.sourceDigestSha256);
  assert.notEqual(first.identity.bootstrapId, second.identity.bootstrapId);
  assert.equal(first.identity.venueId, second.identity.venueId);
  assert.equal(first.identity.packageId, second.identity.packageId);
  assert.equal(first.identity.deploymentId, second.identity.deploymentId);
});

test('workspace CLI materializes exactly the canonical files and refuses overwrite', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-venues-workspace-cli-'));
  try {
    const authoringPath = path.join(dir, 'authoring.json');
    const deploymentPath = path.join(dir, 'deployment.json');
    const outputPath = path.join(dir, 'portable-workspace');
    fs.writeFileSync(authoringPath, `${JSON.stringify(LANTERN_ROOM_AUTHORING_INPUT, null, 2)}\n`, 'utf8');
    fs.writeFileSync(deploymentPath, `${JSON.stringify(HV4_SYNTHETIC_DEPLOYMENT_MANIFEST, null, 2)}\n`, 'utf8');

    const first = spawnSync(
      process.execPath,
      [path.join(root, 'scripts', 'build-venue-workspace.js'), authoringPath, deploymentPath, outputPath],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.stderr, '');
    assert.deepEqual(fs.readdirSync(outputPath).sort(), Object.values(WORKSPACE_FILENAMES).sort());
    assert.equal(first.stdout, fs.readFileSync(path.join(outputPath, WORKSPACE_FILENAMES.manifest), 'utf8'));

    const second = spawnSync(
      process.execPath,
      [path.join(root, 'scripts', 'build-venue-workspace.js'), authoringPath, deploymentPath, outputPath],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(second.status, 1);
    assert.match(second.stderr, /output directory already exists/);
    assert.equal(second.stdout, '');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

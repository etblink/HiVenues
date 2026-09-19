'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const { buildDeploymentPackage } = require('../src/product/deployment-package');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');
const {
  createDeployedPublicApp,
  startDeployedPublicServer,
} = require('../src/deploy/public-runtime');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage3-runtime-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const store = new ProvisioningFileHiVenuesStore({
    statePath: path.join(root, 'workspace', 'state.json'),
    mediaRoot: path.join(root, 'media'),
  });
  const slug = 'harbor-and-hearth';
  const snapshot = store.snapshot(slug);
  const released = store.createRelease(slug, snapshot.revision, snapshot.draftDigest);
  assert.equal(released.ok, true);
  const release = released.release;

  const packageRecord = buildDeploymentPackage({
    store,
    hostSlug: slug,
    releaseId: release.id,
    mediaRoot: path.join(root, 'media'),
    publicRoot: path.join(PROJECT_ROOT, 'public'),
    packageRoot: path.join(root, 'packages'),
  });
  const provenancePath = path.join(root, 'runtime-provenance.json');
  fs.writeFileSync(provenancePath, JSON.stringify({
    version: 1,
    sourceSha: 'a'.repeat(40),
    sourceTree: 'b'.repeat(40),
    packageVersion: '1.0.0',
    nodeVersion: 'v24.19.0',
  }, null, 2) + '\n');

  return {
    root,
    store,
    slug,
    release,
    packageRecord,
    provenancePath,
    runtimeStatePath: path.join(root, 'runtime-state.json'),
  };
}

function fileSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

test('Era 7 Stage 3A: deployed public runtime serves only the exact immutable Release and read-back provenance', async (t) => {
  const f = fixture(t);
  const releasePath = path.join(f.packageRecord.packagePath, 'release.json');
  const manifestPath = path.join(f.packageRecord.packagePath, 'manifest.json');
  const releaseHashBefore = fileSha256(releasePath);
  const manifestHashBefore = fileSha256(manifestPath);

  const runtime = createDeployedPublicApp({
    packagePath: f.packageRecord.packagePath,
    runtimeStatePath: f.runtimeStatePath,
    provenancePath: f.provenancePath,
    now: () => Date.parse('2026-09-19T14:00:00.000Z'),
    idFactory: () => 'stage3-rsvp',
  });

  const health = await request(runtime.app)
    .get('/__hivenues/health')
    .expect(200);
  assert.deepEqual(health.body, {
    version: 1,
    status: 'healthy',
    runtime: {
      sourceSha: 'a'.repeat(40),
      sourceTree: 'b'.repeat(40),
      packageVersion: '1.0.0',
      nodeVersion: 'v24.19.0',
      platform: process.platform + '-' + process.arch,
    },
    deployment: {
      hostSlug: f.slug,
      releaseId: f.release.id,
      releaseDigest: f.release.digest,
      packageDigest: f.packageRecord.packageDigest,
    },
  });

  const publicPage = await request(runtime.app)
    .get('/hivenues/' + f.slug)
    .expect(200);
  assert.equal(publicPage.text.includes(f.release.snapshot.identity.displayName), true);
  assert.equal(publicPage.text.includes(f.release.snapshot.facts.tagline), true);

  await request(runtime.app)
    .get('/hivenues/studio/' + f.slug)
    .expect(404);

  const mediaRecord = f.packageRecord.media[0];
  const media = await request(runtime.app)
    .get(mediaRecord.publicPath)
    .expect(200);
  assert.equal(media.body.length, mediaRecord.bytes);
  assert.equal(
    crypto.createHash('sha256').update(media.body).digest('hex'),
    mediaRecord.sha256,
  );

  const activity = f.release.snapshot.activities.find((item) => item.lifecycle === 'scheduled');
  assert(activity);
  await request(runtime.app)
    .post('/hivenues/' + f.slug + '/activities/' + activity.slug + '/rsvp')
    .type('form')
    .send({ name: 'Stage Three Guest' })
    .expect(303);

  const runtimeState = JSON.parse(fs.readFileSync(f.runtimeStatePath, 'utf8'));
  assert.equal(runtimeState.rsvps.length, 1);
  assert.equal(runtimeState.rsvps[0].activityId, activity.id);
  assert.equal(runtimeState.rsvps[0].name, 'Stage Three Guest');

  assert.equal(fileSha256(releasePath), releaseHashBefore);
  assert.equal(fileSha256(manifestPath), manifestHashBefore);
  assert.equal(runtime.store.diagnostics().releaseId, f.release.id);
  assert.equal(runtime.store.diagnostics().rsvps, 1);
});

test('Era 7 Stage 3A: deployed runtime refuses tampered Release before serving', (t) => {
  const f = fixture(t);
  const releasePath = path.join(f.packageRecord.packagePath, 'release.json');
  const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
  release.facts.tagline = 'tampered';
  fs.writeFileSync(releasePath, JSON.stringify(release, null, 2) + '\n');

  assert.throws(
    () => createDeployedPublicApp({
      packagePath: f.packageRecord.packagePath,
      runtimeStatePath: f.runtimeStatePath,
      provenancePath: f.provenancePath,
    }),
    (error) => error.code === 'DEPLOYED_RELEASE_DIGEST_MISMATCH',
  );
});

test('Era 7 Stage 3A: deployed runtime refuses non-loopback bind', async (t) => {
  const f = fixture(t);
  const runtime = createDeployedPublicApp({
    packagePath: f.packageRecord.packagePath,
    runtimeStatePath: f.runtimeStatePath,
    provenancePath: f.provenancePath,
  });
  await assert.rejects(
    () => startDeployedPublicServer(runtime.app, {
      port: 4317,
      host: '0.0.0.0',
    }),
    (error) => error.code === 'DEPLOYED_RUNTIME_BIND_REJECTED',
  );
});

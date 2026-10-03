'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const { buildPublicRuntimeBundle } = require('../scripts/era7/build-public-runtime-bundle');
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
  const runtimeRoot = path.join(root, 'runtime-bundle');
  const runtimeBundle = buildPublicRuntimeBundle({
    outputRoot: runtimeRoot,
    sourceSha: 'a'.repeat(40),
    sourceTree: 'b'.repeat(40),
    nodeVersion: process.version,
  });

  return {
    root,
    store,
    slug,
    release,
    packageRecord,
    runtimeRoot,
    runtimeBundle,
    provenancePath: path.join(runtimeRoot, 'runtime-provenance.json'),
    manifestPath: path.join(runtimeRoot, 'runtime-manifest.json'),
    runtimeStatePath: path.join(root, 'runtime-state.json'),
  };
}

function fileSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
    manifestPath: f.manifestPath,
    root: f.runtimeRoot,
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
      nodeVersion: process.version,
      bundleDigest: f.runtimeBundle.bundleDigest,
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
    .get('/')
    .expect(200);
  assert.equal(publicPage.text.includes(escapeHtml(f.release.snapshot.identity.displayName)), true);
  assert.equal(publicPage.text.includes(escapeHtml(f.release.snapshot.facts.tagline)), true);
  assert.equal(publicPage.text.includes('/hivenues/' + f.slug), false);

  const legacyHome = await request(runtime.app)
    .get('/hivenues/' + f.slug)
    .expect(308);
  assert.equal(legacyHome.headers.location, '/');

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
  const rsvp = await request(runtime.app)
    .post('/activities/' + activity.slug + '/rsvp')
    .type('form')
    .send({ name: 'Stage Three Guest' })
    .expect(303);
  assert.equal(
    rsvp.headers.location,
    '/activities/' + activity.slug + '?rsvp=recorded',
  );

  const runtimeState = JSON.parse(fs.readFileSync(f.runtimeStatePath, 'utf8'));
  assert.equal(runtimeState.rsvps.length, 1);
  assert.equal(runtimeState.rsvps[0].activityId, activity.id);
  assert.equal(runtimeState.rsvps[0].name, 'Stage Three Guest');

  assert.equal(fileSha256(releasePath), releaseHashBefore);
  assert.equal(fileSha256(manifestPath), manifestHashBefore);
  assert.equal(runtime.store.diagnostics().releaseId, f.release.id);
  assert.equal(runtime.store.diagnostics().rsvps, 1);
});

test('Era 7 public routing: dedicated hostname owns canonical visitor paths and legacy host routes redirect safely', async (t) => {
  const f = fixture(t);
  const runtime = createDeployedPublicApp({
    packagePath: f.packageRecord.packagePath,
    runtimeStatePath: f.runtimeStatePath,
    provenancePath: f.provenancePath,
    manifestPath: f.manifestPath,
    root: f.runtimeRoot,
    now: () => Date.parse('2026-10-03T23:00:00.000Z'),
    idFactory: () => 'dedicated-routing-rsvp',
  });
  const activity = f.release.snapshot.activities.find((item) => item.lifecycle === 'scheduled');
  assert(activity);

  const home = await request(runtime.app).get('/').expect(200);
  assert.equal(home.text.includes('/hivenues/' + f.slug), false);
  assert.equal(home.text.includes('href="/activities/' + activity.slug + '"'), true);

  const detail = await request(runtime.app)
    .get('/activities/' + activity.slug)
    .expect(200);
  assert.equal(detail.text.includes('/hivenues/' + f.slug), false);
  assert.equal(detail.text.includes('action="/activities/' + activity.slug + '/rsvp"'), true);
  assert.equal(detail.text.includes('href="/activities/' + activity.slug + '/calendar.ics"'), true);

  const calendar = await request(runtime.app)
    .get('/activities/' + activity.slug + '/calendar.ics')
    .expect(200);
  assert.equal(calendar.text.includes('URL:/activities/' + activity.slug), true);
  assert.equal(calendar.text.includes('/hivenues/' + f.slug), false);

  const legacyDetail = await request(runtime.app)
    .get('/hivenues/' + f.slug + '/activities/' + activity.slug)
    .expect(308);
  assert.equal(legacyDetail.headers.location, '/activities/' + activity.slug);

  const legacyCalendar = await request(runtime.app)
    .get('/hivenues/' + f.slug + '/activities/' + activity.slug + '/calendar.ics')
    .expect(308);
  assert.equal(legacyCalendar.headers.location, '/activities/' + activity.slug + '/calendar.ics');

  const legacyRsvp = await request(runtime.app)
    .post('/hivenues/' + f.slug + '/activities/' + activity.slug + '/rsvp')
    .type('form')
    .send({ name: 'Legacy Guest' })
    .expect(308);
  assert.equal(legacyRsvp.headers.location, '/activities/' + activity.slug + '/rsvp');

  await request(runtime.app)
    .get('/hivenues/not-' + f.slug)
    .expect(404);

  const afterLegacy = JSON.parse(fs.readFileSync(f.runtimeStatePath, 'utf8'));
  assert.equal(afterLegacy.rsvps.length, 0);
});
test('Era 7 Stage 3A: public runtime bundle excludes Studio and carries only admitted production dependencies', (t) => {
  const f = fixture(t);
  const runtimePackage = JSON.parse(
    fs.readFileSync(path.join(f.runtimeRoot, 'package.json'), 'utf8'),
  );
  assert.deepEqual(Object.keys(runtimePackage.dependencies), [
    'ejs',
    'express',
    'htmx.org',
    'zod',
  ]);
  assert.equal(fs.existsSync(path.join(f.runtimeRoot, 'views', 'hivenues', 'studio.ejs')), false);
  assert.equal(fs.existsSync(path.join(f.runtimeRoot, 'src', 'product', 'app.js')), false);
  assert.equal(fs.existsSync(path.join(f.runtimeRoot, 'src', 'product', 'deployment-router.js')), false);
  assert.equal(fs.existsSync(path.join(f.runtimeRoot, 'src', 'product', 'ssh2-readonly-transport.js')), false);
  assert.equal(fs.existsSync(path.join(f.runtimeRoot, 'src', 'deploy', 'public-runtime.js')), true);
});

test('Era 7 Stage 3A: deployed runtime refuses tampered runtime bundle before serving', (t) => {
  const f = fixture(t);
  fs.appendFileSync(
    path.join(f.runtimeRoot, 'src', 'deploy', 'public-router.js'),
    '\n// tampered\n',
  );

  assert.throws(
    () => createDeployedPublicApp({
      packagePath: f.packageRecord.packagePath,
      runtimeStatePath: f.runtimeStatePath,
      provenancePath: f.provenancePath,
      manifestPath: f.manifestPath,
      root: f.runtimeRoot,
    }),
    (error) => error.code === 'DEPLOYED_RUNTIME_FILE_DIGEST_MISMATCH',
  );
});

test('Era 7 Stage 5A corrective: deployed runtime recomputes immutable package digest after manifest-compatible media tampering', (t) => {
  const f = fixture(t);
  const manifestPath = path.join(f.packageRecord.packagePath, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(manifest.media.length > 0);

  const media = manifest.media[0];
  const mediaPath = path.join(f.packageRecord.packagePath, media.packagePath);
  const original = fs.readFileSync(mediaPath);
  const tampered = Buffer.from(original);
  tampered[0] = tampered[0] ^ 0x01;
  fs.writeFileSync(mediaPath, tampered);

  media.sha256 = crypto.createHash('sha256').update(tampered).digest('hex');
  media.bytes = tampered.length;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  assert.throws(
    () => createDeployedPublicApp({
      packagePath: f.packageRecord.packagePath,
      runtimeStatePath: f.runtimeStatePath,
      provenancePath: f.provenancePath,
      manifestPath: f.manifestPath,
      root: f.runtimeRoot,
    }),
    (error) => error.code === 'DEPLOYED_RELEASE_PACKAGE_DIGEST_MISMATCH',
  );
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
    manifestPath: f.manifestPath,
    root: f.runtimeRoot,
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
    manifestPath: f.manifestPath,
    root: f.runtimeRoot,
  });
  assert.throws(
    () => startDeployedPublicServer(runtime.app, {
      port: 4317,
      host: '0.0.0.0',
    }),
    (error) => error.code === 'DEPLOYED_RUNTIME_BIND_REJECTED',
  );
});

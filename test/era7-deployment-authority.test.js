'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const { createHiVenuesApp } = require('../src/product/app');
const { createLocalDeploymentServices } = require('../src/product/deployment');
const {
  FileDeploymentAuthorityStore,
  createPlatformAuthorityProtector,
  createWindowsDpapiProtector,
  generateDeploymentSshKeyPair,
  rsaPublicKeyToOpenSsh,
} = require('../src/product/deployment-authority');
const { FileDeploymentStore } = require('../src/product/deployment-store');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');
const {
  ScriptedSshVerificationTransport,
  SshTargetVerificationService,
} = require('../src/product/deployment-target-verification');

function tempRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-authority-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function reversibleProtector() {
  return Object.freeze({
    kind: 'test-reversible-protector',
    protect(value) {
      return Buffer.from(value).subarray().reverse();
    },
    unprotect(value) {
      return Buffer.from(value).subarray().reverse();
    },
  });
}

function authorityStore(t, root, id = 'test-authority') {
  return new FileDeploymentAuthorityStore({
    root: path.join(root, 'authority'),
    protector: reversibleProtector(),
    now: () => Date.parse('2026-09-19T11:00:00.000Z'),
    idFactory: () => id,
  });
}

function deploymentStore(root, id = 'test-target') {
  return new FileDeploymentStore({
    statePath: path.join(root, 'deployment-state.json'),
    now: () => Date.parse('2026-09-19T11:00:00.000Z'),
    idFactory: () => id,
  });
}

function createSshTarget(store, authorityRef, idExpected = 'deployment-test-target') {
  const record = store.createDraft({
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: ['VERIFY_TARGET', 'COMPUTE', 'STORE', 'DEPLOY_RELEASE'],
  });
  assert.equal(record.id, idExpected);
  store.setTargetPublicFacts(record.id, {
    host: '203.0.113.10',
    port: 22,
    username: 'root',
  });
  store.setAuthorityRef(record.id, authorityRef);
  return store.transition(record.id, 'target-ready', {
    reason: 'provider-provisioned',
  });
}

test('Era 7 Stage 2A: generated deployment SSH key is valid and public identity is reproducible', () => {
  const pemHeader = ['-----BEGIN RSA', 'PRIVATE KEY-----'].join(' ');
  const pair = generateDeploymentSshKeyPair({ modulusLength: 2048 });
  assert.equal(pair.algorithm, 'rsa');
  assert.equal(pair.privateKeyPem.startsWith(pemHeader), true);
  assert.match(pair.publicKeyOpenSsh, /^ssh-rsa [A-Za-z0-9+/=]+ hivenues-deployment$/);
  assert.match(pair.publicKeyFingerprint, /^SHA256:[A-Za-z0-9+/]+$/);

  const privateKey = crypto.createPrivateKey(pair.privateKeyPem);
  const derivedPublic = crypto.createPublicKey(privateKey);
  assert.equal(
    rsaPublicKeyToOpenSsh(derivedPublic),
    pair.publicKeyOpenSsh,
  );
});

test('Era 7 Stage 2A: authority store persists protected private material separately and revokes cleanly', (t) => {
  const root = tempRoot(t);
  const store = authorityStore(t, root);
  const publicRecord = store.createSshAuthority({ label: 'Qualification target' });

  assert.equal(publicRecord.id, 'authority-test-authority');
  assert.equal(publicRecord.protector, 'test-reversible-protector');
  assert.match(publicRecord.publicKey, /^ssh-rsa /);
  assert.match(publicRecord.publicKeyFingerprint, /^SHA256:/);

  const filePath = path.join(root, 'authority', publicRecord.id + '.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  assert.equal(raw.includes(['BEGIN RSA', 'PRIVATE KEY'].join(' ')), false);
  assert.equal(raw.includes('protectedPrivateKey'), true);
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(filePath).mode & 0o777, 0o600);
  }

  let observed;
  store.withPrivateKey(publicRecord.id, (privateKey) => {
    observed = Buffer.from(privateKey);
    assert.equal(
      privateKey.toString('utf8').startsWith(['-----BEGIN RSA', 'PRIVATE KEY-----'].join(' ')),
      true,
    );
  });
  assert(observed);
  assert.doesNotThrow(() => crypto.createPrivateKey(observed));
  observed.fill(0);

  assert.equal(store.revoke(publicRecord.id), true);
  assert.equal(fs.existsSync(filePath), false);
  assert.throws(
    () => store.publicRecord(publicRecord.id),
    (error) => error.code === 'DEPLOYMENT_AUTHORITY_NOT_FOUND',
  );
});

test('Era 7 Stage 2A: decrypted key remains available through awaited transport work then is wiped', async (t) => {
  const root = tempRoot(t);
  const store = authorityStore(t, root, 'async-authority');
  const publicRecord = store.createSshAuthority();
  let borrowed;

  const result = await store.withPrivateKey(publicRecord.id, async (privateKey) => {
    borrowed = privateKey;
    assert.equal(
      privateKey.toString('utf8').startsWith(['-----BEGIN RSA', 'PRIVATE KEY-----'].join(' ')),
      true,
    );
    await Promise.resolve();
    assert.equal(
      privateKey.toString('utf8').startsWith(['-----BEGIN RSA', 'PRIVATE KEY-----'].join(' ')),
      true,
    );
    return 'transport-complete';
  });

  assert.equal(result, 'transport-complete');
  assert(borrowed);
  assert.equal(borrowed.every((byte) => byte === 0), true);
});

test('Era 7 Stage 2A: non-Windows production protector fails closed', () => {
  if (process.platform === 'win32') return;
  assert.throws(
    () => createPlatformAuthorityProtector({ platform: process.platform }),
    (error) => error.code === 'DEPLOYMENT_SECURE_STORAGE_UNAVAILABLE',
  );
});

test('Era 7 Stage 2A: Windows DPAPI protects deployment authority for the current user', {
  skip: process.platform !== 'win32',
}, () => {
  const protector = createWindowsDpapiProtector();
  const plaintext = Buffer.from('hivenues-dpapi-qualification-secret', 'utf8');
  const protectedValue = protector.protect(plaintext);
  assert.equal(Buffer.compare(protectedValue, plaintext) === 0, false);
  const roundTrip = protector.unprotect(protectedValue);
  assert.equal(roundTrip.toString('utf8'), plaintext.toString('utf8'));
  plaintext.fill(0);
  protectedValue.fill(0);
  roundTrip.fill(0);
});

test('Era 7 Stage 2A: first-seen host key blocks private-key use until explicit fingerprint acceptance', async (t) => {
  const root = tempRoot(t);
  const authorities = authorityStore(t, root);
  const authority = authorities.createSshAuthority();
  const deployments = deploymentStore(root);
  const target = createSshTarget(deployments, authority.id);
  const fingerprint = 'SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const transport = new ScriptedSshVerificationTransport({
    hostKeyFingerprint: fingerprint,
    inspection: {
      os: 'Debian GNU/Linux 13',
      architecture: 'x86_64',
      memoryMb: 1024,
      diskMb: 20480,
    },
  });
  const verifier = new SshTargetVerificationService({
    store: deployments,
    authorityStore: authorities,
    transport,
    now: () => Date.parse('2026-09-19T11:00:00.000Z'),
  });

  let result = await verifier.verify(target.id);
  assert.equal(result.state, 'host-key-review');
  assert.equal(result.targetPublicFacts.observedHostKeyFingerprint, fingerprint);
  assert.equal(result.targetPublicFacts.trustedHostKeyFingerprint, undefined);
  assert.deepEqual(transport.calls.map((item) => item.kind), ['observe-host-key']);

  assert.throws(
    () => verifier.acceptObservedHostKey(
      target.id,
      'SHA256:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    ),
    (error) => error.code === 'DEPLOYMENT_HOST_KEY_REVIEW_MISMATCH',
  );

  result = verifier.acceptObservedHostKey(target.id, fingerprint);
  assert.equal(result.state, 'target-ready');
  assert.equal(result.targetPublicFacts.trustedHostKeyFingerprint, fingerprint);

  result = await verifier.verify(target.id);
  assert.equal(result.state, 'bootstrap-ready');
  assert.equal(result.healthState, 'ready');
  assert.equal(result.targetPublicFacts.hostKeyTrustState, 'trusted');
  assert.equal(result.targetPublicFacts.verifiedOs, 'Debian GNU/Linux 13');
  assert.equal(result.targetPublicFacts.verifiedArchitecture, 'x86_64');
  assert.equal(result.targetPublicFacts.verifiedMemoryMb, 1024);
  assert.equal(result.targetPublicFacts.verifiedDiskMb, 20480);
  assert.deepEqual(transport.calls.map((item) => item.kind), [
    'observe-host-key',
    'observe-host-key',
    'inspect',
  ]);
});

test('Era 7 Stage 2A: changed host key returns to hard review before authentication', async (t) => {
  const root = tempRoot(t);
  const authorities = authorityStore(t, root);
  const authority = authorities.createSshAuthority();
  const deployments = deploymentStore(root);
  const target = createSshTarget(deployments, authority.id);
  const first = 'SHA256:CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
  const changed = 'SHA256:DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';
  const transport = new ScriptedSshVerificationTransport({
    hostKeyFingerprint: first,
  });
  const verifier = new SshTargetVerificationService({
    store: deployments,
    authorityStore: authorities,
    transport,
  });

  await verifier.verify(target.id);
  verifier.acceptObservedHostKey(target.id, first);
  transport.hostKeyFingerprint = changed;

  const result = await verifier.verify(target.id);
  assert.equal(result.state, 'host-key-review');
  assert.equal(result.stateReason, 'ssh-host-key-changed');
  assert.equal(result.targetPublicFacts.trustedHostKeyFingerprint, first);
  assert.equal(result.targetPublicFacts.observedHostKeyFingerprint, changed);
  assert.equal(result.targetPublicFacts.hostKeyTrustState, 'changed-review-required');
  assert.deepEqual(transport.calls.map((item) => item.kind), [
    'observe-host-key',
    'observe-host-key',
  ]);
});


test('Era 7 Stage 2A: protected server handoff UI persists only public target facts and revokes authority on disconnect', async (t) => {
  const root = tempRoot(t);
  const statePath = path.join(root, 'workspace', 'state.json');
  const mediaRoot = path.join(root, 'media');
  const store = new ProvisioningFileHiVenuesStore({ statePath, mediaRoot });
  const services = createLocalDeploymentServices({
    store,
    statePath: path.join(root, 'deployment', 'state.json'),
    packageRoot: path.join(root, 'deployment', 'packages'),
    mediaRoot,
    authorityRoot: path.join(root, 'deployment', 'authority'),
    authorityProtector: reversibleProtector(),
    idFactory: () => 'ssh-router-target',
    authorityIdFactory: () => 'ssh-router-authority',
    now: () => Date.parse('2026-09-19T12:00:00.000Z'),
  });
  const app = createHiVenuesApp({
    store,
    identityServices: false,
    participationServices: false,
    deploymentServices: services,
  });
  const slug = 'harbor-and-hearth';

  let page = await request(app)
    .get('/hivenues/studio/' + slug + '/deploy')
    .expect(200);
  assert.match(page.text, /data-deployment-stage2a/);
  assert.match(page.text, /data-deployment-authority-profile/);

  await request(app)
    .post('/hivenues/studio/' + slug + '/deploy/targets/reference-ssh')
    .expect(303);

  let deployment = services.deploymentStore.list(slug)[0];
  assert.equal(deployment.id, 'deployment-ssh-router-target');
  assert.equal(deployment.providerKind, 'ssh-server');
  assert.equal(deployment.providerProfile, 'privex-reference');
  assert.equal(deployment.state, 'awaiting-provider');
  assert.equal(deployment.authorityRef, 'authority-ssh-router-authority');

  const authorityPath = path.join(
    root,
    'deployment',
    'authority',
    'authority-ssh-router-authority.json',
  );
  const authorityRaw = fs.readFileSync(authorityPath, 'utf8');
  assert.equal(authorityRaw.includes(['BEGIN RSA', 'PRIVATE KEY'].join(' ')), false);
  assert.equal(authorityRaw.includes('protectedPrivateKey'), true);

  page = await request(app)
    .get('/hivenues/studio/' + slug + '/deploy')
    .expect(200);
  assert.match(page.text, /data-deployment-authority-public/);
  assert.match(page.text, /data-deployment-public-key/);
  assert.match(page.text, /data-deployment-public-key-fingerprint/);
  assert.match(page.text, /data-deployment-server-connection/);

  const rejected = await request(app)
    .post('/hivenues/studio/' + slug + '/deploy/' + deployment.id + '/connection')
    .type('form')
    .send({
      host: '203.0.113.10',
      port: '22',
      username: 'root',
      password: 'must-never-persist',
      apiToken: 'must-never-persist',
    })
    .expect(400);
  assert.match(rejected.text, /data-deployment-error/);

  deployment = services.deploymentStore.get(deployment.id);
  assert.equal(deployment.state, 'awaiting-provider');
  assert.deepEqual(deployment.targetPublicFacts, {});
  assert.equal(JSON.stringify(deployment).includes('must-never-persist'), false);

  await request(app)
    .post('/hivenues/studio/' + slug + '/deploy/' + deployment.id + '/connection')
    .type('form')
    .send({
      host: '203.0.113.10',
      port: '22',
      username: 'root',
    })
    .expect(303);

  deployment = services.deploymentStore.get(deployment.id);
  assert.equal(deployment.state, 'target-ready');
  assert.deepEqual(deployment.targetPublicFacts, {
    host: '203.0.113.10',
    port: 22,
    username: 'root',
  });

  page = await request(app)
    .get('/hivenues/studio/' + slug + '/deploy')
    .expect(200);
  assert.match(page.text, /data-deployment-server-facts/);
  assert.match(page.text, /data-deployment-ssh-verification-held/);
  assert.doesNotMatch(page.text, /data-verify-deployment-target/);

  await request(app)
    .post('/hivenues/studio/' + slug + '/deploy/' + deployment.id + '/disconnect')
    .expect(303);

  deployment = services.deploymentStore.get(deployment.id);
  assert.equal(deployment.state, 'disconnected');
  assert.equal(deployment.authorityRef, null);
  assert.equal(fs.existsSync(authorityPath), false);
  assert.deepEqual(store.diagnostics().external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
});

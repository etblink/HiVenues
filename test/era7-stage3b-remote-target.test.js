'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildPublicRuntimeBundle } = require('../scripts/era7/build-public-runtime-bundle');
const { createReferenceBootstrapPlan } = require('../src/deploy/bootstrap-plan');
const { buildDeploymentPackage } = require('../src/product/deployment-package');
const { generateDeploymentSshKeyPair } = require('../src/product/deployment-authority');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');
const {
  SshRemoteDeploymentTarget,
} = require('../src/deploy/ssh-remote-deployment-target');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function artifactFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage3b-target-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const slug = 'harbor-and-hearth';
  const store = new ProvisioningFileHiVenuesStore({
    statePath: path.join(root, 'workspace', 'state.json'),
    mediaRoot: path.join(root, 'media'),
  });
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
  const runtimeRoot = path.join(root, 'runtime');
  const runtimeRecord = buildPublicRuntimeBundle({
    outputRoot: runtimeRoot,
    sourceSha: '1'.repeat(40),
    sourceTree: '2'.repeat(40),
    nodeVersion: 'v24.19.0',
  });
  const runtimeProvenance = JSON.parse(
    fs.readFileSync(path.join(runtimeRoot, 'runtime-provenance.json'), 'utf8'),
  );
  const releaseManifest = JSON.parse(
    fs.readFileSync(path.join(packageRecord.packagePath, 'manifest.json'), 'utf8'),
  );

  return {
    root,
    slug,
    release,
    packageRecord,
    runtimeRoot,
    runtimeRecord,
    runtimeProvenance,
    releaseManifest,
  };
}

function fakeAuthority() {
  const pair = generateDeploymentSshKeyPair({ modulusLength: 2048 });
  return {
    pair,
    store: {
      publicRecord(id) {
        assert.equal(id, 'authority-stage3b');
        return {
          id,
          publicKey: pair.publicKeyOpenSsh,
          publicKeyFingerprint: pair.publicKeyFingerprint,
        };
      },
      withPrivateKey(id, action) {
        assert.equal(id, 'authority-stage3b');
        return action(Buffer.from(pair.privateKeyPem, 'utf8'));
      },
    },
  };
}

class ScriptedMutationTransport {
  constructor({ health }) {
    this.health = health;
    this.calls = [];
    this.authorityState = 'bootstrap-admin';
    this.active = false;
  }

  async withSession(input, action) {
    const username = input.target.username;
    this.calls.push({
      kind: 'session',
      username,
      fingerprint: input.expectedHostKeyFingerprint,
      privateKeyBytes: Buffer.byteLength(input.privateKey),
    });

    const session = {
      exec: async (command, options = {}) => {
        this.calls.push({
          kind: 'exec',
          username,
          command,
          stdin: options.stdin
            ? Buffer.from(options.stdin).toString('utf8')
            : '',
        });

        if (command.startsWith('if [ -d ')) {
          return { stdout: 'no', stderr: '', exitCode: 0 };
        }
        if (command.trim() === 'id -un') {
          return { stdout: username + '\n', stderr: '', exitCode: 0 };
        }
        if (command.includes("printf \"%s\\n\" 'restricted-login-pending'")) {
          this.authorityState = 'restricted-login-pending';
        }
        if (command.includes("printf \"%s\\n\" 'restricted-login-proven'")) {
          this.authorityState = 'restricted-login-proven';
        }
        if (command.includes("printf \"%s\\n\" 'restricted-deployment-user'")) {
          this.authorityState = 'restricted-deployment-user';
        }
        if (
          (
            command.includes('systemctl enable --now')
            && command.includes('hivenues-harbor-and-hearth.service')
          )
          || command.includes('sudo -n /usr/bin/systemctl restart')
        ) {
          this.active = true;
        }
        if (command.includes('health="$(curl -fsS')) {
          if (!this.active) return { stdout: '', stderr: '', exitCode: 0 };
          return {
            stdout: JSON.stringify(this.health) + '\n' + this.authorityState + '\n',
            stderr: '',
            exitCode: 0,
          };
        }
        return { stdout: '', stderr: '', exitCode: 0 };
      },
      uploadTree: async (localRoot, remoteRoot) => {
        this.calls.push({
          kind: 'upload',
          username,
          localRoot,
          remoteRoot,
        });
      },
    };

    return action(session);
  }
}

test('Era 7 Stage 3B: remote target stages artifacts, proves restricted login, and narrows bootstrap authority last', async (t) => {
  const f = artifactFixture(t);
  const authority = fakeAuthority();
  const plan = createReferenceBootstrapPlan({
    runtimeProvenance: f.runtimeProvenance,
    releaseManifest: f.releaseManifest,
    bootstrapUsername: 'root',
  });
  const health = {
    version: 1,
    status: 'healthy',
    runtime: {
      sourceSha: f.runtimeProvenance.sourceSha,
      sourceTree: f.runtimeProvenance.sourceTree,
      packageVersion: f.runtimeProvenance.packageVersion,
      nodeVersion: f.runtimeProvenance.nodeVersion,
      bundleDigest: f.runtimeProvenance.bundleDigest,
      platform: 'linux-x64',
    },
    deployment: {
      hostSlug: f.releaseManifest.hostSlug,
      releaseId: f.releaseManifest.releaseId,
      releaseDigest: f.releaseManifest.releaseDigest,
      packageDigest: f.releaseManifest.packageDigest,
    },
  };
  const transport = new ScriptedMutationTransport({ health });
  const target = new SshRemoteDeploymentTarget({
    authorityStore: authority.store,
    authorityId: 'authority-stage3b',
    target: {
      host: '203.0.113.44',
      port: 22,
      username: 'root',
    },
    expectedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
    hostSlug: f.slug,
    transport,
  });

  const runtime = await target.installRuntime(f.runtimeRoot);
  const release = await target.installRelease(f.packageRecord.packagePath);

  assert.equal(runtime.reused, false);
  assert.equal(runtime.path, plan.paths.runtimeRoot);
  assert.equal(runtime.stagingPath.startsWith('/var/tmp/hivenues-runtime-'), true);
  assert.equal(release.reused, false);
  assert.equal(release.path, plan.paths.releaseRoot);
  assert.equal(release.stagingPath.startsWith('/var/tmp/hivenues-release-'), true);

  const activation = await target.activate({ runtime, release, plan });
  assert.deepEqual(activation, {
    authorityState: 'restricted-login-proven',
    deploymentUser: 'hivenues-deploy',
  });
  assert.equal(target.connection.username, 'hivenues-deploy');
  assert.equal(target.narrowingPending, true);

  let readBack = await target.readBack();
  assert.equal(readBack.status, 'healthy');
  assert.equal(readBack.runtime.bundleDigest, f.runtimeProvenance.bundleDigest);
  assert.equal(readBack.deployment.releaseId, f.releaseManifest.releaseId);
  assert.equal(readBack.bootstrap.authorityState, 'restricted-login-proven');

  const rootExecBeforeFinalize = transport.calls.filter((item) => (
    item.kind === 'exec' && item.username === 'root'
  ));
  assert.equal(
    rootExecBeforeFinalize.some((item) => item.command.includes('apt-get update')),
    true,
  );
  assert.equal(
    rootExecBeforeFinalize.some((item) => item.command.includes(plan.nodeDistribution.url)),
    true,
  );
  assert.equal(
    rootExecBeforeFinalize.some((item) => item.command.includes(plan.nodeDistribution.sha256)),
    true,
  );

  const restrictedExec = transport.calls.filter((item) => (
    item.kind === 'exec' && item.username === 'hivenues-deploy'
  ));
  assert.equal(
    restrictedExec.some((item) => /apt-get|groupadd|useradd|nft -f|caddy validate/.test(item.command)),
    false,
  );
  assert.equal(
    restrictedExec.some((item) => item.command.includes('sudo -n /usr/bin/systemctl status')),
    true,
  );

  const configWrites = rootExecBeforeFinalize.filter((item) => item.stdin);
  assert.equal(configWrites.length >= 7, true);
  assert.equal(
    configWrites.some((item) => item.stdin.includes('auto_https off')),
    true,
  );
  assert.equal(
    configWrites.some((item) => item.stdin.includes('policy drop')),
    true,
  );
  assert.equal(
    configWrites.some((item) => item.stdin.includes('NOPASSWD: HIVENUES_SERVICE')),
    true,
  );

  const uploads = transport.calls.filter((item) => item.kind === 'upload');
  assert.equal(uploads.length, 2);
  assert.equal(uploads.every((item) => item.username === 'root'), true);
  assert.equal(
    uploads.some((item) => item.remoteRoot.startsWith('/var/tmp/hivenues-runtime-')),
    true,
  );
  assert.equal(
    uploads.some((item) => item.remoteRoot.startsWith('/var/tmp/hivenues-release-')),
    true,
  );

  assert.equal(await target.finalizeAuthorityNarrowing(plan), true);
  assert.equal(target.narrowingPending, false);

  readBack = await target.readBack();
  assert.equal(readBack.bootstrap.authorityState, 'restricted-deployment-user');

  const finalRootCommands = transport.calls.filter((item) => (
    item.kind === 'exec' && item.username === 'root'
  ));
  const removal = finalRootCommands.find((item) => (
    item.command.includes('.hivenues-authorized-keys')
    && item.command.includes('awk -v key=')
  ));
  assert(removal);
  assert.equal(removal.command.includes(authority.pair.publicKeyOpenSsh.split(' ').slice(0, 2).join(' ')), true);

  const lastSession = transport.calls.filter((item) => item.kind === 'session').at(-1);
  assert.equal(lastSession.username, 'hivenues-deploy');
});

test('Era 7 Stage 3B: remote target never exposes private authority through command or upload metadata', async (t) => {
  const f = artifactFixture(t);
  const authority = fakeAuthority();
  const plan = createReferenceBootstrapPlan({
    runtimeProvenance: f.runtimeProvenance,
    releaseManifest: f.releaseManifest,
    bootstrapUsername: 'root',
  });
  const transport = new ScriptedMutationTransport({
    health: {
      status: 'healthy',
      runtime: {
        sourceSha: f.runtimeProvenance.sourceSha,
        sourceTree: f.runtimeProvenance.sourceTree,
        packageVersion: f.runtimeProvenance.packageVersion,
        nodeVersion: f.runtimeProvenance.nodeVersion,
        bundleDigest: f.runtimeProvenance.bundleDigest,
      },
      deployment: {
        hostSlug: f.releaseManifest.hostSlug,
        releaseId: f.releaseManifest.releaseId,
        releaseDigest: f.releaseManifest.releaseDigest,
        packageDigest: f.releaseManifest.packageDigest,
      },
    },
  });
  const target = new SshRemoteDeploymentTarget({
    authorityStore: authority.store,
    authorityId: 'authority-stage3b',
    target: {
      host: '203.0.113.45',
      port: 22,
      username: 'root',
    },
    expectedHostKeyFingerprint: 'SHA256:' + 'Y'.repeat(43),
    hostSlug: f.slug,
    transport,
  });

  const runtime = await target.installRuntime(f.runtimeRoot);
  const release = await target.installRelease(f.packageRecord.packagePath);
  await target.activate({ runtime, release, plan });

  const transcript = JSON.stringify(transport.calls);
  assert.equal(transcript.includes('BEGIN RSA PRIVATE KEY'), false);
  assert.equal(transcript.includes(authority.pair.privateKeyPem), false);
  assert.equal(transcript.includes(authority.pair.publicKeyOpenSsh), true);
});

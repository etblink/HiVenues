'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  assessThreadsServiceActivationReadiness,
  requirePublicKey,
} = require('../src/social/threads-service-activation-readiness');
const { main } = require('../scripts/check-threads-service-activation');

const PUBLIC_KEY = 'STM73MTSWz2Nks4Eaf8G8F7Nr6jbHorZSM774HFmtrdEuahXqi1ff';
const OTHER_PUBLIC_KEY = 'STM5UXjwf1qXw1cAF6GLT4w5RjH48Rn8Y6xLPZwwVDWh3D3aap86N';

function snapshot(overrides = {}) {
  return {
    venue: {
      officialAccount: 'fourthstreetbar',
      threadsContainerAccount: 'fourthst.threads',
    },
    threadsAccount: {
      name: 'fourthst.threads',
      posting: {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[PUBLIC_KEY, 1]],
      },
      active: {
        weight_threshold: 1,
        account_auths: [['fourthstreetbar', 1]],
        key_auths: [],
      },
    },
    intendedPostingPublicKey: PUBLIC_KEY,
    serverCredentialClasses: ['posting'],
    configuredPostingPublicKey: PUBLIC_KEY,
    ...overrides,
  };
}

function memoryIo() {
  let stdout = '';
  let stderr = '';
  return {
    io: {
      stdout: { write(value) { stdout += value; } },
      stderr: { write(value) { stderr += value; } },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

test('fully prepared declared snapshot still cannot claim live activation while the canonical signer remains synthetic-only', () => {
  const report = assessThreadsServiceActivationReadiness(snapshot());
  assert.equal(report.activationReady, false);
  assert.equal(report.preparationReady, true);
  assert.equal(report.authorityReady, true);
  assert.equal(report.credentialBoundarySafe, true);
  assert.equal(report.credentialIdentityReady, true);
  assert.equal(
    report.nextStage,
    'IMPLEMENT_AND_QUALIFY_SEPARATELY_AUTHORIZED_RUNTIME_SIGNER_ACTIVATION',
  );
  assert.deepEqual(report.blockers, ['THREADS_RUNTIME_SIGNER_ACTIVATION_IMPLEMENTED']);
  assert.deepEqual(report.proposedAuthorityChanges, []);
  assert.equal(report.currentRepositoryBoundary, 'REAL_THREADS_SERVICE_SIGNER_REMAINS_SYNTHETIC_TEST_ONLY');
});

test('prepared authorities without a provisioned Posting credential stop at the separate provisioning boundary', () => {
  const report = assessThreadsServiceActivationReadiness(snapshot({
    serverCredentialClasses: [],
    configuredPostingPublicKey: null,
  }));
  assert.equal(report.activationReady, false);
  assert.equal(report.authorityReady, true);
  assert.equal(report.nextStage, 'SEPARATELY_AUTHORIZE_POSTING_KEY_PROVISIONING');
  assert.deepEqual(report.blockers, [
    'THREADS_POSTING_CREDENTIAL_CONFIGURED',
    'THREADS_RUNTIME_SIGNER_ACTIVATION_IMPLEMENTED',
  ]);
});

test('configured Posting credential must be bound to the intended authorized key', () => {
  const report = assessThreadsServiceActivationReadiness(snapshot({
    configuredPostingPublicKey: OTHER_PUBLIC_KEY,
  }));
  assert.equal(report.activationReady, false);
  assert.equal(report.authorityReady, true);
  assert.equal(report.credentialIdentityReady, false);
  assert.equal(report.nextStage, 'REPAIR_OR_REPROVISION_THREADS_POSTING_CREDENTIAL');
  assert.equal(
    report.blockers.includes('CONFIGURED_POSTING_CREDENTIAL_MATCHES_INTENDED_PUBLIC_KEY'),
    true,
  );
});

test('configured Posting public key is rejected when no Posting credential class is declared', () => {
  assert.throws(
    () => assessThreadsServiceActivationReadiness(snapshot({ serverCredentialClasses: [] })),
    /configuredPostingPublicKey may be supplied only when serverCredentialClasses includes posting/,
  );
});

test('missing direct Posting key and merchant Active account auth produce exact authority-change proposals', () => {
  const input = snapshot({ serverCredentialClasses: [], configuredPostingPublicKey: null });
  input.threadsAccount.posting.key_auths = [];
  input.threadsAccount.active.account_auths = [];
  const report = assessThreadsServiceActivationReadiness(input);
  assert.equal(report.activationReady, false);
  assert.equal(report.authorityReady, false);
  assert.equal(report.nextStage, 'SEPARATELY_AUTHORIZE_AND_APPLY_HIVE_AUTHORITY_CHANGE');
  assert.deepEqual(report.proposedAuthorityChanges, [
    {
      authority: 'posting',
      action: 'ADD_KEY_AUTH',
      publicKey: PUBLIC_KEY,
      minimumWeight: 1,
    },
    {
      authority: 'active',
      action: 'ADD_ACCOUNT_AUTH',
      account: 'fourthstreetbar',
      minimumWeight: 1,
    },
  ]);
});

test('direct Posting key must independently satisfy threshold even when account auths exist', () => {
  const input = snapshot();
  input.threadsAccount.posting = {
    weight_threshold: 2,
    key_auths: [[PUBLIC_KEY, 1]],
    account_auths: [['some-helper', 2]],
  };
  const report = assessThreadsServiceActivationReadiness(input);
  assert.equal(report.authorityReady, false);
  assert.equal(
    report.blockers.includes('THREADS_POSTING_PUBLIC_KEY_DIRECTLY_SATISFIES_THRESHOLD'),
    true,
  );
  assert.deepEqual(report.proposedAuthorityChanges[0], {
    authority: 'posting',
    action: 'RAISE_KEY_AUTH',
    publicKey: PUBLIC_KEY,
    minimumWeight: 2,
  });
});

test('Active, Owner, or Memo server credentials are always activation blockers', () => {
  for (const credentialClass of ['active', 'owner', 'memo']) {
    const report = assessThreadsServiceActivationReadiness(snapshot({
      serverCredentialClasses: ['posting', credentialClass],
    }));
    assert.equal(report.activationReady, false, credentialClass);
    assert.equal(report.credentialBoundarySafe, false, credentialClass);
    assert.equal(report.nextStage, 'REMOVE_PROHIBITED_SERVER_CREDENTIALS', credentialClass);
    assert.equal(report.blockers.includes('SERVER_CREDENTIAL_BOUNDARY_POSTING_ONLY'), true);
  }
});

test('Hive public key validation verifies Graphene checksum and secp256k1 point', () => {
  assert.equal(requirePublicKey(PUBLIC_KEY), PUBLIC_KEY);
  const corruptedChecksum = `${PUBLIC_KEY.slice(0, -1)}${PUBLIC_KEY.endsWith('1') ? '2' : '1'}`;
  assert.throws(() => requirePublicKey(corruptedChecksum), /checksum|secp256k1|decode/);
});

test('preflight refuses private-key-shaped fields and WIF material instead of sanitizing it', () => {
  assert.throws(
    () => assessThreadsServiceActivationReadiness({
      ...snapshot(),
      postingPrivateKey: `5K${'A'.repeat(49)}`,
    }),
    (error) => error.code === 'THREADS_ACTIVATION_PRIVATE_KEY_FIELD_FORBIDDEN',
  );
  const input = snapshot();
  input.intendedPostingPublicKey = `5K${'A'.repeat(49)}`;
  assert.throws(
    () => assessThreadsServiceActivationReadiness(input),
    (error) => error.code === 'THREADS_ACTIVATION_PRIVATE_KEY_MATERIAL_FORBIDDEN',
  );
});

test('wrong Threads account snapshot fails closed without proposing changes against the wrong account', () => {
  const input = snapshot();
  input.threadsAccount.name = 'other.threads';
  input.threadsAccount.posting.key_auths = [];
  input.threadsAccount.active.account_auths = [];
  const report = assessThreadsServiceActivationReadiness(input);
  assert.equal(report.activationReady, false);
  assert.equal(report.nextStage, 'REPAIR_IDENTITY_OR_AUTHORITY_INPUT');
  assert.deepEqual(report.proposedAuthorityChanges, []);
});

test('invalid authority threshold is a blocker and never invents a mutation weight', () => {
  const input = snapshot();
  input.threadsAccount.active.weight_threshold = 0;
  const report = assessThreadsServiceActivationReadiness(input);
  assert.equal(report.activationReady, false);
  assert.equal(report.blockers.includes('THREADS_ACTIVE_AUTHORITY_VALID'), true);
  assert.deepEqual(report.proposedAuthorityChanges, []);
});

test('CLI emits machine-readable report and uses distinct blocked exit status', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'threads-activation-'));
  const filename = path.join(dir, 'snapshot.json');
  fs.writeFileSync(filename, `${JSON.stringify(snapshot({
    serverCredentialClasses: [],
    configuredPostingPublicKey: null,
  }))}\n`);
  const memory = memoryIo();
  const status = main([filename], memory.io);
  assert.equal(status, 3);
  assert.equal(memory.stderr(), '');
  const report = JSON.parse(memory.stdout());
  assert.equal(report.nextStage, 'SEPARATELY_AUTHORIZE_POSTING_KEY_PROVISIONING');
  fs.rmSync(dir, { recursive: true, force: true });
});
